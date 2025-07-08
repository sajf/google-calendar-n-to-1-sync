/**
 * @file Main logic for N-to-1 Calendar Sync.
 * Contains the core orchestration and user-facing functions.
 */

// Import configuration variables
/* global SOURCE_CALENDAR_IDS, TARGET_CALENDAR_ID, SYNC_CONFIG */

// Constants for magic numbers
const QUOTA_WARNING_THRESHOLD = 0.8;  // 80% of quota
const QUOTA_CRITICAL_THRESHOLD = 0.9; // 90% of quota
const QUOTA_LOW_THRESHOLD = 0.1;      // 10% of quota
const MAX_BACKOFF_DELAY = 300000;     // 5 minutes in milliseconds
const LOCK_TIMEOUT = 15 * 60 * 1000;  // 15 minutes in milliseconds
const TRIGGER_INTERVAL_MINUTES = 15;  // Run sync every 15 minutes

/**
 * Custom error classes for better error handling
 */
class SyncError extends Error {
  /**
   * Creates a new SyncError instance
   * @param {string} message - Error message
   * @param {string} type - Type of error
   * @param {boolean} recoverable - Whether the error is recoverable
   * @param {boolean} retryable - Whether the operation can be retried
   */
  constructor(message, type = 'UNKNOWN', recoverable = false, retryable = false) {
    super(message);
    this.name = 'SyncError';
    this.type = type;
    this.recoverable = recoverable;
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error thrown when there are issues accessing a calendar
 */
class CalendarAccessError extends SyncError {
  /**
   * Creates a new CalendarAccessError instance
   * @param {string} message - Error message
   * @param {string} calendarId - ID of the calendar that couldn't be accessed
   */
  constructor(message, calendarId) {
    super(message, 'CALENDAR_ACCESS', false, true);
    this.name = 'CalendarAccessError';
    this.calendarId = calendarId;
  }
}

/**
 * Error thrown when API quota limits are exceeded
 */
class QuotaExceededError extends SyncError {
  /**
   * Creates a new QuotaExceededError instance
   * @param {string} message - Error message
   */
  constructor(message) {
    super(message, 'QUOTA_EXCEEDED', true, true);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Error thrown when there are issues synchronizing a specific event
 */
class EventSyncError extends SyncError {
  /**
   * Creates a new EventSyncError instance
   * @param {string} message - Error message
   * @param {string} eventId - ID of the event that failed to sync
   * @param {string} sourceCalendarId - ID of the source calendar
   * @param {string} targetCalendarId - ID of the target calendar
   */
  constructor(message, eventId, sourceCalendarId, targetCalendarId) {
    super(message, 'EVENT_SYNC', true, true);
    this.name = 'EventSyncError';
    this.eventId = eventId;
    this.sourceCalendarId = sourceCalendarId;
    this.targetCalendarId = targetCalendarId;
  }
}

/**
 * Error thrown when a potential infinite update loop is detected
 */
class LoopDetectionError extends SyncError {
  /**
   * Creates a new LoopDetectionError instance
   * @param {string} message - Error message
   * @param {string} sourceId - ID of the source calendar
   * @param {string} targetId - ID of the target calendar
   * @param {string} eventId - ID of the event causing the loop
   */
  constructor(message, sourceId, targetId, eventId) {
    super(message, 'LOOP_DETECTION', true, false);
    this.name = 'LoopDetectionError';
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.eventId = eventId;
  }
}

/**
 * Error recovery strategies
 */
class ErrorRecoveryManager {
  /**
   * Creates a new ErrorRecoveryManager instance
   */
  constructor() {
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.backoffMultiplier = 2;
    this.baseDelay = 1000; // 1 second
  }

  /**
   * Determines if an error should be retried
   * @param {Error} error - The error to check for retry
   * @param {string} operationKey - Unique key identifying the operation
   * @returns {boolean} True if the error should be retried, false otherwise
   */
  shouldRetry(error, operationKey) {
    if (!error.retryable) {
      return false;
    }

    const attempts = this.retryAttempts.get(operationKey) || 0;
    return attempts < this.maxRetries;
  }

  /**
   * Records a retry attempt
   * @param {string} operationKey - Unique key identifying the operation
   * @returns {void}
   */
  recordRetry(operationKey) {
    const attempts = this.retryAttempts.get(operationKey) || 0;
    this.retryAttempts.set(operationKey, attempts + 1);
  }

  /**
   * Calculates delay for exponential backoff
   * @param {string} operationKey - Unique key identifying the operation
   * @returns {number} The calculated delay in milliseconds
   */
  getRetryDelay(operationKey) {
    const attempts = this.retryAttempts.get(operationKey) || 0;
    return this.baseDelay * Math.pow(this.backoffMultiplier, attempts);
  }

  /**
   * Clears retry history for successful operations
   * @param {string} operationKey - Unique key identifying the operation
   * @returns {void}
   */
  clearRetryHistory(operationKey) {
    this.retryAttempts.delete(operationKey);
  }

  /**
   * Attempts recovery for specific error types
   * @param {Error} error - The error to attempt recovery for
   * @returns {object} Recovery result with success status and message
   */
  attemptRecovery(error) {
    switch (error.type) {
      case 'QUOTA_EXCEEDED':
        console.log('Quota exceeded - implementing exponential backoff');
        return this.handleQuotaExceeded();

      case 'CALENDAR_ACCESS':
        console.log('Calendar access error - attempting to refresh permissions');
        return this.handleCalendarAccess(error);

      case 'EVENT_SYNC':
        console.log('Event sync error - attempting selective recovery');
        return this.handleEventSyncError(error);

      default:
        return { success: false, message: 'No recovery strategy available' };
    }
  }

  /**
   * Attempts to recover from calendar access errors
   * @param {CalendarAccessError} error - The calendar access error
   * @returns {object} Recovery result with success status and message
   */
  handleCalendarAccess(error) {
    try {
      // Attempt to verify calendar access
      if (error.calendarId) {
        Calendar.Calendars.get(error.calendarId);
        return { success: true, message: 'Calendar access restored' };
      }
    } catch (e) {
      return { success: false, message: `Calendar still inaccessible: ${e.message}` };
    }
    return { success: false, message: 'Cannot verify calendar access' };
  }

  /**
   * Handles errors that occur during event synchronization
   * @param {EventSyncError} error - The event synchronization error
   * @returns {object} Recovery result with success status and message
   */
  handleEventSyncError(error) {
    // For event sync errors, we can continue with other events
    console.log(`Skipping problematic event: ${error.eventId}`);
    return { success: true, message: 'Skipped problematic event' };
  }
  /**
   * Handles quota exceeded errors by implementing backoff strategies
   * @returns {object} Recovery result with success status and message
   */
  handleQuotaExceeded() {
    // Get current API usage stats
    const apiStats = calendarApiManager.getQueueStatus();

    // Calculate appropriate delay based on current usage
    let delay = this.baseDelay;

    if (apiStats.requestCount >= apiStats.maxRequests * QUOTA_CRITICAL_THRESHOLD) {
      // Near quota limit - wait for quota reset
      delay = Math.max(apiStats.quotaResetIn + 1000, this.baseDelay * 5);
      console.log(
        `Near quota limit (${apiStats.requestCount}/${apiStats.maxRequests}), waiting ${delay}ms for quota reset`
      );
    } else {
      // Standard exponential backoff
      delay = Math.min(this.baseDelay * 4, MAX_BACKOFF_DELAY);
      console.log(`Quota exceeded, implementing exponential backoff: ${delay}ms`);
    }

    Utilities.sleep(delay);
    return { success: true, message: `Waited ${delay}ms for quota management` };
  }
}
// Enhanced quota monitoring function
/**
 * Monitors API quota usage and logs warnings when approaching limits
 * @returns {object} Current API usage statistics
 */
function _monitorApiQuota() {
  const apiStats = getApiUsageStats();

  // Log warning if approaching quota limits
  if (apiStats.requestCount >= apiStats.maxRequests * QUOTA_WARNING_THRESHOLD) {
    console.warn(`⚠️  API quota warning: ${apiStats.requestCount}/${apiStats.maxRequests} requests used`);
  }

  // Recommend sync frequency adjustment if quota is consistently high
  if (apiStats.requestCount >= apiStats.maxRequests * QUOTA_CRITICAL_THRESHOLD) {
    console.warn('📊 Consider reducing sync frequency or increasing batch delays to stay within quota limits');
  }

  return apiStats;
}

/**
 * Main function that starts the entire synchronization process.
 * It is called by an automatic trigger.
 */
function runNto1Sync() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT)) {
    console.warn('Another synchronization instance is already running. Skipping.');
    return;
  }

  const errorRecovery = new ErrorRecoveryManager();
  let syncSuccess = false;
  const criticalErrors = [];
  const recoverableErrors = [];

  try {
    const now = new Date();
    const startDate = new Date(now.getTime() - SYNC_CONFIG.DAYS_BACK * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + SYNC_CONFIG.DAYS_FORWARD * 24 * 60 * 60 * 1000);

    console.log('Starting N->1 synchronization...');

    // Get sync state manager for loop detection
    const syncStateManager = getSyncStateManager();

    // Log sync statistics
    const stats = syncStateManager.getSyncStats();
    console.log(
      `Sync stats - Total ops: ${stats.totalOperations}, Recent ops: ${stats.recentOperations}, Potential loops: ${stats.potentialLoops}`
    );

    // Get target events with retry logic
    let allTargetEvents;
    try {
      allTargetEvents = getAllEventsIncludingDeletedSafe(TARGET_CALENDAR_ID, startDate, endDate);
    } catch (error) {
      throw new CalendarAccessError(`Failed to access target calendar: ${error.message}`, TARGET_CALENDAR_ID);
    }

    // PART 1: Synchronization from sources to target (N -> 1)
    let sourceSuccessCount = 0;
    SOURCE_CALENDAR_IDS.forEach(sourceId => {
      const operationKey = `source-sync-${sourceId}`;
      let attempts = 0;
      let success = false;

      while (!success && attempts < errorRecovery.maxRetries + 1) {
        try {
          syncSourceToTarget(sourceId, TARGET_CALENDAR_ID, startDate, endDate, allTargetEvents);
          success = true;
          sourceSuccessCount++;
          errorRecovery.clearRetryHistory(operationKey);
          console.log(`Successfully synced source calendar: ${sourceId}`);
        } catch (error) {
          attempts++;
          const syncError = classifyError(error, sourceId, TARGET_CALENDAR_ID);

          if (syncError.recoverable && errorRecovery.shouldRetry(syncError, operationKey)) {
            console.log(`Attempt ${attempts} failed for ${sourceId}. Retrying...`);
            errorRecovery.recordRetry(operationKey);

            const recovery = errorRecovery.attemptRecovery(syncError);
            if (recovery.success) {
              console.log(`Recovery successful: ${recovery.message}`);
              const delay = errorRecovery.getRetryDelay(operationKey);
              Utilities.sleep(delay);
            } else {
              console.log(`Recovery failed: ${recovery.message}`);
              break;
            }
          } else {
            console.error(`Critical error syncing ${sourceId}: ${syncError.message}`);
            criticalErrors.push(syncError);
            break;
          }
        }
      }

      if (!success) {
        console.error(`Failed to sync source calendar ${sourceId} after ${attempts} attempts`);
        recoverableErrors.push(
          new EventSyncError(`Failed to sync source ${sourceId}`, null, sourceId, TARGET_CALENDAR_ID)
        );
      }
    });

    // PART 2: Reverse synchronization of changes from target to sources (1 -> N)
    try {
      syncTargetToSources(TARGET_CALENDAR_ID, SOURCE_CALENDAR_IDS, allTargetEvents);
      console.log('Reverse synchronization completed successfully');
    } catch (error) {
      const syncError = classifyError(error, TARGET_CALENDAR_ID, 'sources');
      if (syncError.recoverable) {
        console.log(`Recoverable error in reverse sync: ${syncError.message}`);
        recoverableErrors.push(syncError);
      } else {
        console.error(`Critical error in reverse sync: ${syncError.message}`);
        criticalErrors.push(syncError);
      }
    }

    // Determine overall sync success
    const totalSources = SOURCE_CALENDAR_IDS.length;
    const successRate = sourceSuccessCount / totalSources;

    if (successRate >= 0.8) {
      // 80% success rate threshold
      syncSuccess = true;
      console.log(`Synchronization completed successfully. Success rate: ${(successRate * 100).toFixed(1)}%`);
    } else {
      console.warn(`Synchronization completed with issues. Success rate: ${(successRate * 100).toFixed(1)}%`);
    }

    // Log error summary
    if (criticalErrors.length > 0) {
      console.error(`Critical errors encountered: ${criticalErrors.length}`);
      criticalErrors.forEach(error => console.error(`  - ${error.message}`));
    }

    if (recoverableErrors.length > 0) {
      console.warn(`Recoverable errors encountered: ${recoverableErrors.length}`);
      recoverableErrors.forEach(error => console.warn(`  - ${error.message}`));
    }
  } catch (error) {
    const syncError = classifyError(error);
    console.error(`Critical synchronization error: ${syncError.message}`, syncError);

    // Attempt recovery for critical errors
    if (syncError.recoverable) {
      const recovery = errorRecovery.attemptRecovery(syncError);
      if (recovery.success) {
        console.log(`Recovery attempt successful: ${recovery.message}`);
      } else {
        console.error(`Recovery attempt failed: ${recovery.message}`);
      }
    }

    criticalErrors.push(syncError);
  } finally {
    lock.releaseLock();

    // Log final status
    const finalStatus = {
      success: syncSuccess,
      criticalErrors: criticalErrors.length,
      recoverableErrors: recoverableErrors.length,
      timestamp: new Date().toISOString()
    };

    console.log('Synchronization summary:', JSON.stringify(finalStatus, null, 2));

    // Store sync status for monitoring
    try {
      PropertiesService.getScriptProperties().setProperty('LAST_SYNC_STATUS', JSON.stringify(finalStatus));
    } catch (e) {
      console.error('Failed to store sync status:', e);
    }
  }
}

/**
 * Classifies generic errors into specific sync error types
 * @param {Error} error - The error to classify
 * @param {string} sourceId - ID of the source calendar
 * @param {string} targetId - ID of the target calendar
 * @param {string} eventId - ID of the event that caused the error
 * @returns {SyncError} A specific sync error type
 */
function classifyError(error, sourceId = null, targetId = null, eventId = null) {
  const message = error.message || error.toString();

  if (message.includes('Rate Limit') || message.includes('Quota') || message.includes('quota')) {
    return new QuotaExceededError(message);
  }

  if (message.includes('Not Found') || message.includes('Forbidden') || message.includes('Permission')) {
    return new CalendarAccessError(message, sourceId || targetId);
  }

  if (message.includes('loop') || message.includes('circular')) {
    return new LoopDetectionError(message, sourceId, targetId, eventId);
  }

  if (sourceId && targetId) {
    return new EventSyncError(message, eventId, sourceId, targetId);
  }

  // Default to generic sync error
  return new SyncError(message, 'UNKNOWN', false, true);
}

/**
 * Synchronizes one source calendar to the target calendar.
 * @param {string} sourceId - ID of the source calendar
 * @param {string} targetId - ID of the target calendar
 * @param {Date} startDate - Start date for synchronization
 * @param {Date} endDate - End date for synchronization
 * @param {Array} allTargetEvents - All events in the target calendar
 * @returns {void}
 */
function syncSourceToTarget(sourceId, targetId, startDate, endDate, allTargetEvents) {
  console.log(`Processing: ${sourceId} -> ${targetId}`);

  let sourceEvents;
  try {
    sourceEvents = getAllEventsIncludingDeletedSafe(sourceId, startDate, endDate);
  } catch (error) {
    throw new CalendarAccessError(`Failed to access source calendar: ${error.message}`, sourceId);
  }

  const targetEventMap = createEventMapForSource(allTargetEvents, sourceId);
  const syncStateManager = getSyncStateManager();

  let processedEvents = 0;
  let errorCount = 0;
  const maxErrorThreshold = Math.max(5, Math.floor(sourceEvents.length * QUOTA_LOW_THRESHOLD)); // 10% or min 5 errors

  sourceEvents.forEach(sourceEvent => {
    try {
      const expectedSyncKey = generateSyncKey(sourceEvent, sourceId);
      const targetEvent = targetEventMap[expectedSyncKey];

      // Check for potential loops before processing
      if (syncStateManager.wouldCreateLoop(sourceId, targetId, sourceEvent.id, 'update')) {
        console.log(`Skipping sync to prevent loop: ${sourceEvent.summary} (${sourceId} -> ${targetId})`);
        return;
      }

      if (sourceEvent.status === 'cancelled') {
        if (targetEvent && targetEvent.status !== 'cancelled') {
          syncStateManager.recordOperation(sourceId, targetId, sourceEvent.id, 'delete');
          deleteEventSafe(targetId, targetEvent.id);
          console.log(`DELETED in target: "${sourceEvent.summary || ''}" (from ${sourceId})`);
        }
      } else if (!targetEvent) {
        syncStateManager.recordOperation(sourceId, targetId, sourceEvent.id, 'create');
        createOrUpdateSyncedEvent(sourceEvent, targetId, sourceId, allTargetEvents);
        console.log(`CREATED in target: "${sourceEvent.summary}" (from ${sourceId})`);
      } else {
        const sourceUpdated = new Date(sourceEvent.updated);
        const targetUpdated = new Date(targetEvent.updated);

        if (syncStateManager.shouldSkipSync(sourceId, targetId, sourceEvent.id, sourceUpdated, targetUpdated)) {
          return;
        }

        if (sourceUpdated > targetUpdated) {
          syncStateManager.recordOperation(sourceId, targetId, sourceEvent.id, 'update', {
            sourceUpdated: sourceUpdated.toISOString(),
            targetUpdated: targetUpdated.toISOString()
          });
          updateSyncedEventSafe(sourceEvent, targetId, targetEvent.id, sourceId);
          console.log(`UPDATED in target: "${sourceEvent.summary}" (from ${sourceId})`);
        }
      }

      processedEvents++;
    } catch (error) {
      errorCount++;
      console.error(`Error processing event "${sourceEvent.summary || sourceEvent.id}": ${error.message}`);

      // If too many errors, abort this source
      if (errorCount > maxErrorThreshold) {
        throw new EventSyncError(
          `Too many errors (${errorCount}) processing source ${sourceId}`,
          sourceEvent.id,
          sourceId,
          targetId
        );
      }
    }
  });

  console.log(`Source ${sourceId} processed: ${processedEvents} events, ${errorCount} errors`);
}

/**
 * Synchronizes changes from the target calendar back to the sources.
 * @param {string} targetId - ID of the target calendar
 * @param {Array<string>} sourceIds - IDs of the source calendars
 * @param {Array} targetEvents - Events in the target calendar
 * @returns {void}
 */
function syncTargetToSources(targetId, sourceIds, targetEvents) {
  console.log(`Processing reverse synchronization: ${targetId} -> Sources`);
  const syncStateManager = getSyncStateManager();

  let processedEvents = 0;
  let errorCount = 0;
  const maxErrorThreshold = Math.max(5, Math.floor(targetEvents.length * QUOTA_LOW_THRESHOLD));

  targetEvents.forEach(targetEvent => {
    try {
      const sourceCalendarId = targetEvent.extendedProperties?.private?.SYNC_SOURCE;
      const originalEventId = targetEvent.extendedProperties?.private?.SYNC_ORIGINAL_ID;

      if (!sourceCalendarId || !originalEventId || !sourceIds.includes(sourceCalendarId)) {
        return;
      }

      // Check for potential loops before processing
      if (syncStateManager.wouldCreateLoop(targetId, sourceCalendarId, originalEventId, 'update')) {
        console.log(
          `Skipping reverse sync to prevent loop: ${targetEvent.summary} (${targetId} -> ${sourceCalendarId})`
        );
        return;
      }

      let originalEvent;
      try {
        originalEvent = Calendar.Events.get(sourceCalendarId, originalEventId);
      } catch (e) {
        if (e.message.includes('Not Found')) {
          if (targetEvent.status !== 'cancelled') {
            syncStateManager.recordOperation(targetId, sourceCalendarId, originalEventId, 'delete');
            deleteEventSafe(targetId, targetEvent.id);
          }
          return;
        }
        throw e;
      }

      if (targetEvent.status === 'cancelled') {
        if (originalEvent.status !== 'cancelled') {
          syncStateManager.recordOperation(targetId, sourceCalendarId, originalEventId, 'delete');
          deleteEventSafe(sourceCalendarId, originalEventId);
          console.log(`DELETED in source: "${originalEvent.summary}" (in ${sourceCalendarId})`);
        }
      } else {
        const targetUpdated = new Date(targetEvent.updated);
        const originalUpdated = new Date(originalEvent.updated);

        if (
          syncStateManager.shouldSkipSync(targetId, sourceCalendarId, originalEventId, targetUpdated, originalUpdated)
        ) {
          return;
        }

        if (targetUpdated > originalUpdated) {
          syncStateManager.recordOperation(targetId, sourceCalendarId, originalEventId, 'update', {
            targetUpdated: targetUpdated.toISOString(),
            originalUpdated: originalUpdated.toISOString()
          });

          const updatedSourceEvent = updateSourceEventSafe(targetEvent, sourceCalendarId, originalEventId);
          console.log(`UPDATED in source: "${targetEvent.summary}" (in ${sourceCalendarId})`);

          if (updatedSourceEvent) {
            Utilities.sleep(100);
            Calendar.Events.patch(
              {
                summary: targetEvent.summary,
                extendedProperties: targetEvent.extendedProperties
              },
              targetId,
              targetEvent.id
            );
            console.log(`   -> "Touch" target event to unify update time.`);
          }
        }
      }

      processedEvents++;
    } catch (e) {
      errorCount++;
      console.error(`Error during reverse synchronization for event "${targetEvent.summary || targetEvent.id}":`, e);

      // If too many errors, abort reverse sync
      if (errorCount > maxErrorThreshold) {
        throw new EventSyncError(
          `Too many errors (${errorCount}) in reverse synchronization`,
          targetEvent.id,
          targetId,
          'sources'
        );
      }
    }
  });

  console.log(`Reverse sync processed: ${processedEvents} events, ${errorCount} errors`);
}

// --- USER MANAGEMENT FUNCTIONS ---

/**
 * Sets up an automatic trigger to run the sync process at regular intervals
 * @returns {void}
 */
function _setupAutomaticSync() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runNto1Sync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('runNto1Sync').timeBased().everyMinutes(TRIGGER_INTERVAL_MINUTES).create();
  console.log(`Automatic trigger for N->1 sync set to run every ${TRIGGER_INTERVAL_MINUTES} minutes.`);
}

/**
 * Removes the automatic trigger for the sync process
 * @returns {void}
 */
function _removeAutomaticSync() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runNto1Sync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  console.log('Automatic trigger for N->1 sync removed.');
}

/**
 * Tests access to all configured calendars to verify permissions
 * @returns {boolean} True if all calendars are accessible, false otherwise
 */
function _testConfiguration() {
  console.log('Testing configuration...');
  let allOk = true;
  SOURCE_CALENDAR_IDS.forEach(id => {
    try {
      Calendar.Calendars.get(id);
      console.log(`✓ Access to source ${id} works.`);
    } catch (e) {
      console.error(`✗ ERROR with source ${id}: ${e.message}`);
      allOk = false;
    }
  });
  try {
    Calendar.Calendars.get(TARGET_CALENDAR_ID);
    console.log(`✓ Access to target ${TARGET_CALENDAR_ID} works.`);
  } catch (e) {
    console.error(`✗ ERROR with target ${TARGET_CALENDAR_ID}: ${e.message}`);
    allOk = false;
  }

  if (allOk) {
    console.log('\nConfiguration is correct!');
  } else {
    console.error('\nTest failed. Check calendar IDs and permissions.');
  }
}

/**
 * Utility function to get sync statistics
 * @returns {object} Statistics about the sync operations
 */
function _getSyncStatistics() {
  const syncStateManager = getSyncStateManager();
  const stats = syncStateManager.getSyncStats();

  console.log('=== Sync Statistics ===');
  console.log(`Total operations: ${stats.totalOperations}`);
  console.log(`Recent operations (last 5 min): ${stats.recentOperations}`);
  console.log(`Potential loops detected: ${stats.potentialLoops}`);
  console.log('Operations by type:');
  Object.entries(stats.operationsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  return stats;
}

/**
 * Utility function to get last sync status
 */
function _getLastSyncStatus() {
  try {
    const statusJson = PropertiesService.getScriptProperties().getProperty('LAST_SYNC_STATUS');
    if (statusJson) {
      const status = JSON.parse(statusJson);
      console.log('=== Last Sync Status ===');
      console.log(`Success: ${status.success}`);
      console.log(`Critical Errors: ${status.criticalErrors}`);
      console.log(`Recoverable Errors: ${status.recoverableErrors}`);
      console.log(`Timestamp: ${status.timestamp}`);
      return status;
    }
  } catch (e) {
    console.error('Failed to retrieve last sync status:', e);
  }
  return null;
}

/**
 * Utility function to reset sync state (for troubleshooting)
 */
function _resetSyncState() {
  resetSyncStateManager();
  PropertiesService.getScriptProperties().deleteProperty('LAST_SYNC_STATUS');
  console.log('Sync state has been reset.');
}
