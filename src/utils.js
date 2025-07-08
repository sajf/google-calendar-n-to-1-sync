/**
 * @file Utility functions for Calendar Sync script.
 * These functions handle data manipulation, API calls, and payload creation.
 */

// Import error classes for Node.js environment
let SyncError, CalendarAccessError, QuotaExceededError, EventSyncError, LoopDetectionError;

if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment - define error classes locally
  /**
   *
   */
  class SyncErrorLocal extends Error {
    /**
     *
     * @param message
     * @param type
     * @param recoverable
     * @param retryable
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
   *
   */
  class CalendarAccessErrorLocal extends SyncErrorLocal {
    /**
     *
     * @param message
     * @param calendarId
     */
    constructor(message, calendarId) {
      super(message, 'CALENDAR_ACCESS', false, true);
      this.name = 'CalendarAccessError';
      this.calendarId = calendarId;
    }
  }

  /**
   *
   */
  class QuotaExceededErrorLocal extends SyncErrorLocal {
    /**
     *
     * @param message
     */
    constructor(message) {
      super(message, 'QUOTA_EXCEEDED', true, true);
      this.name = 'QuotaExceededError';
    }
  }

  /**
   *
   */
  class EventSyncErrorLocal extends SyncErrorLocal {
    /**
     *
     * @param message
     * @param eventId
     * @param sourceCalendarId
     * @param targetCalendarId
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
   *
   */
  class LoopDetectionErrorLocal extends SyncErrorLocal {
    /**
     *
     * @param message
     * @param sourceId
     * @param targetId
     * @param eventId
     */
    constructor(message, sourceId, targetId, eventId) {
      super(message, 'LOOP_DETECTION', true, false);
      this.name = 'LoopDetectionError';
      this.sourceId = sourceId;
      this.targetId = targetId;
      this.eventId = eventId;
    }
  }

  SyncError = SyncErrorLocal;
  CalendarAccessError = CalendarAccessErrorLocal;
  QuotaExceededError = QuotaExceededErrorLocal;
  EventSyncError = EventSyncErrorLocal;
  LoopDetectionError = LoopDetectionErrorLocal;
}

/**
 * Enhanced Calendar API wrapper with rate limiting and retry logic
 */
class CalendarApiManager {
  /**
   *
   */
  constructor() {
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    this.backoffMultiplier = 2;
    this.maxDelay = 30000; // 30 seconds max delay
    this.quotaResetWindow = 60000; // 1 minute quota reset window
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.maxRequestsPerWindow = 100; // Conservative limit
  }

  /**
   * Executes Calendar API call with rate limiting and retry logic
   * @param apiFunction
   * @param params
   * @param operationName
   */
  executeApiCall(apiFunction, params = [], operationName = 'API_CALL') {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        apiFunction,
        params,
        operationName,
        resolve,
        reject,
        attempts: 0
      });
      this.processQueue();
    });
  }

  /**
   * Processes the API request queue with rate limiting
   */
  processQueue() {
    if (this.requestQueue.length === 0) {
      return;
    }

    const now = Date.now();

    // Reset quota window if needed
    if (now - this.windowStart >= this.quotaResetWindow) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check if we're within quota limits
    if (this.requestCount >= this.maxRequestsPerWindow) {
      console.log(`Rate limit reached (${this.requestCount} requests), waiting for quota reset...`);
      setTimeout(() => this.processQueue(), this.quotaResetWindow - (now - this.windowStart));
      return;
    }

    // Check minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      setTimeout(() => this.processQueue(), this.minRequestInterval - timeSinceLastRequest);
      return;
    }

    // Process next request
    const request = this.requestQueue.shift();
    this.executeRequest(request);
  }

  /**
   * Executes individual API request with retry logic
   * @param request
   */
  executeRequest(request) {
    const { apiFunction, params, operationName, resolve, reject, attempts } = request;

    try {
      this.lastRequestTime = Date.now();
      this.requestCount++;

      console.log(`Executing ${operationName} (attempt ${attempts + 1})`);

      // Handle mock environment for testing
      let result;
      if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
        // Test environment
        result = apiFunction.apply(global.Calendar.Events, params);
      } else if (typeof Calendar !== 'undefined') {
        // Google Apps Script environment
        result = apiFunction.apply(Calendar.Events, params);
      } else {
        throw new Error('Calendar API not available');
      }

      // Success - resolve and continue processing queue
      resolve(result);
      setTimeout(() => this.processQueue(), this.minRequestInterval);
    } catch (error) {
      this.handleApiError(error, request, resolve, reject);
    }
  }

  /**
   * Handles API errors with appropriate retry logic
   * @param error
   * @param request
   * @param resolve
   * @param reject
   */
  handleApiError(error, request, resolve, reject) {
    const { operationName, attempts } = request;
    const errorMessage = error.message || error.toString();

    // Check if this is a rate limit or quota error
    const isRateLimit = this.isRateLimitError(error);
    const isQuotaError = this.isQuotaError(error);
    const isRetryableError = this.isRetryableError(error);

    if ((isRateLimit || isQuotaError || isRetryableError) && attempts < this.maxRetries) {
      console.log(`${operationName} failed with retryable error (attempt ${attempts + 1}): ${errorMessage}`);

      // Calculate exponential backoff delay
      let delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempts);

      // For rate limit errors, use longer delays
      if (isRateLimit || isQuotaError) {
        delay = Math.min(delay * 5, this.maxDelay); // 5x longer for rate limits
        console.log(`Rate limit detected, implementing exponential backoff: ${delay}ms`);
      }

      // Add jitter to prevent thundering herd
      delay += Math.random() * 1000;

      // Schedule retry
      request.attempts = attempts + 1;
      setTimeout(() => {
        this.requestQueue.unshift(request); // Put back at front of queue
        this.processQueue();
      }, delay);
    } else {
      // Non-retryable error or max retries reached
      console.error(`${operationName} failed after ${attempts + 1} attempts: ${errorMessage}`);

      // Classify error for better handling
      let syncError;
      if (SyncError) {
        if (isRateLimit || isQuotaError) {
          syncError = new QuotaExceededError(`${operationName} quota exceeded: ${errorMessage}`);
        } else if (this.isPermissionError(error)) {
          syncError = new CalendarAccessError(`${operationName} permission denied: ${errorMessage}`, null);
        } else {
          syncError = new SyncError(`${operationName} failed: ${errorMessage}`, 'API_ERROR', false, false);
        }
      } else {
        // Fallback for environments without error classes
        syncError = error;
      }

      reject(syncError);

      // Continue processing queue after a short delay
      setTimeout(() => this.processQueue(), this.minRequestInterval);
    }
  }

  /**
   * Checks if error is a rate limit error
   * @param error
   */
  isRateLimitError(error) {
    const message = error.message || error.toString();
    return (
      message.includes('Rate Limit') ||
      message.includes('Too Many Requests') ||
      message.includes('rateLimitExceeded') ||
      error.code === 429
    );
  }

  /**
   * Checks if error is a quota error
   * @param error
   */
  isQuotaError(error) {
    const message = error.message || error.toString();
    return (
      message.includes('Quota') ||
      message.includes('quota') ||
      message.includes('dailyLimitExceeded') ||
      message.includes('userRateLimitExceeded')
    );
  }

  /**
   * Checks if error is retryable
   * @param error
   */
  isRetryableError(error) {
    const message = error.message || error.toString();
    return (
      message.includes('Service unavailable') ||
      message.includes('Internal error') ||
      message.includes('Backend Error') ||
      message.includes('timeout') ||
      error.code >= 500
    );
  }

  /**
   * Checks if error is a permission error
   * @param error
   */
  isPermissionError(error) {
    const message = error.message || error.toString();
    return (
      message.includes('Forbidden') ||
      message.includes('Permission') ||
      message.includes('Access denied') ||
      error.code === 403
    );
  }

  /**
   * Gets current queue status for monitoring
   */
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      requestCount: this.requestCount,
      maxRequests: this.maxRequestsPerWindow,
      windowStart: this.windowStart,
      quotaResetIn: this.quotaResetWindow - (Date.now() - this.windowStart)
    };
  }
}

// Create global instance
const calendarApiManager = new CalendarApiManager();

/**
 * Enhanced Calendar API wrapper functions with rate limiting
 * @param apiFunction
 * @param params
 * @param operationName
 */
function safeCalendarApiCall(apiFunction, params, operationName) {
  return calendarApiManager.executeApiCall(apiFunction, params, operationName);
}

// Enhanced utility functions with rate limiting
/**
 *
 * @param calendarId
 * @param startDate
 * @param endDate
 */
function getAllEventsIncludingDeletedSafe(calendarId, startDate, endDate) {
  let events = [];
  let pageToken = null;

  do {
    const optionalArgs = {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      showDeleted: true,
      singleEvents: true,
      maxResults: 2500,
      pageToken: pageToken
    };

    try {
      // Determine the correct Calendar API reference
      let CalendarEvents;
      if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
        CalendarEvents = global.Calendar.Events;
      } else if (typeof Calendar !== 'undefined') {
        CalendarEvents = Calendar.Events;
      } else {
        throw new Error('Calendar API not available');
      }

      const response = safeCalendarApiCall(
        CalendarEvents.list,
        [calendarId, optionalArgs],
        `LIST_EVENTS_${calendarId}`
      );

      if (response.items) {
        events = events.concat(response.items);
      }
      pageToken = response.nextPageToken;
    } catch (error) {
      console.error(`Error loading events from ${calendarId}: ${error.message}`);

      // For non-critical errors, continue with partial results
      if (error.type !== 'CALENDAR_ACCESS') {
        pageToken = null;
      } else {
        throw error;
      }
    }
  } while (pageToken);

  return events;
}

// Original synchronous function with improved rate limiting
/**
 *
 * @param calendarId
 * @param startDate
 * @param endDate
 */
function getAllEventsIncludingDeleted(calendarId, startDate, endDate) {
  let events = [];
  let pageToken = null;

  do {
    const optionalArgs = {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      showDeleted: true,
      singleEvents: true,
      maxResults: 2500,
      pageToken: pageToken
    };

    try {
      // Add rate limiting even for synchronous calls
      const now = Date.now();
      if (now - calendarApiManager.lastRequestTime < calendarApiManager.minRequestInterval) {
        const sleepTime = calendarApiManager.minRequestInterval - (now - calendarApiManager.lastRequestTime);
        if (typeof Utilities !== 'undefined') {
          Utilities.sleep(sleepTime);
        } else {
          // For testing environment, we'll skip the sleep
          console.log(`Would sleep for ${sleepTime}ms in production`);
        }
      }

      calendarApiManager.lastRequestTime = Date.now();

      // Determine the correct Calendar API reference
      let response;
      if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
        response = global.Calendar.Events.list(calendarId, optionalArgs);
      } else if (typeof Calendar !== 'undefined') {
        response = Calendar.Events.list(calendarId, optionalArgs);
      } else {
        throw new Error('Calendar API not available');
      }

      if (response.items) {
        events = events.concat(response.items);
      }
      pageToken = response.nextPageToken;
    } catch (error) {
      // Handle rate limit errors with exponential backoff
      if (calendarApiManager.isRateLimitError(error) || calendarApiManager.isQuotaError(error)) {
        const delay = Math.min(calendarApiManager.baseDelay * 2, calendarApiManager.maxDelay);
        console.log(`Rate limit hit, waiting ${delay}ms...`);
        if (typeof Utilities !== 'undefined') {
          Utilities.sleep(delay);
        } else {
          console.log(`Would sleep for ${delay}ms in production`);
        }
        // Don't increment pageToken to retry the same request
        continue;
      }

      console.error(`Error loading events from ${calendarId}: ${error.toString()}`);
      pageToken = null;
    }
  } while (pageToken);

  return events;
}

/**
 *
 * @param events
 * @param sourceId
 */
function createEventMapForSource(events, sourceId) {
  const eventMap = {};
  events.forEach(event => {
    const syncKey = event.extendedProperties?.private?.SYNC_KEY;
    const syncSource = event.extendedProperties?.private?.SYNC_SOURCE;
    if (syncKey && syncSource === sourceId) {
      eventMap[syncKey] = event;
    }
  });
  return eventMap;
}

/**
 *
 * @param event
 * @param sourceCalendarId
 */
function generateSyncKey(event, sourceCalendarId) {
  return `${sourceCalendarId}:${event.id}`;
}

/**
 *
 */
function generateSyncVersion() {
  return Date.now().toString();
}

/**
 *
 * @param sourceEvent
 * @param sourceCalendarId
 */
function _buildEventPayload(sourceEvent, sourceCalendarId) {
  const syncKey = generateSyncKey(sourceEvent, sourceCalendarId);
  const syncVersion = generateSyncVersion();
  const eventData = {
    summary: sourceEvent.summary,
    description: sourceEvent.description,
    location: sourceEvent.location,
    start: sourceEvent.start,
    end: sourceEvent.end,
    attendees: sourceEvent.attendees,
    reminders: sourceEvent.reminders,
    transparency: sourceEvent.transparency,
    visibility: sourceEvent.visibility,
    extendedProperties: {
      private: {
        SYNC_KEY: syncKey,
        SYNC_SOURCE: sourceCalendarId,
        SYNC_ORIGINAL_ID: sourceEvent.id,
        SYNC_VERSION: syncVersion,
        SYNC_UPDATED: new Date().toISOString()
      }
    }
  };
  Object.keys(eventData).forEach(key => eventData[key] === undefined && delete eventData[key]);
  return eventData;
}

/**
 *
 * @param targetEvent
 */
function _buildSourceEventPayload(targetEvent) {
  const eventData = {
    summary: targetEvent.summary,
    description: targetEvent.description,
    location: targetEvent.location,
    start: targetEvent.start,
    end: targetEvent.end,
    attendees: targetEvent.attendees,
    reminders: targetEvent.reminders,
    transparency: targetEvent.transparency,
    visibility: targetEvent.visibility,
    extendedProperties: {
      private: {
        SYNC_UPDATED: new Date().toISOString()
      }
    }
  };
  Object.keys(eventData).forEach(key => eventData[key] === undefined && delete eventData[key]);
  return eventData;
}

/**
 *
 * @param sourceEvent
 * @param targetCalendarId
 * @param sourceCalendarId
 */
function createSyncedEvent(sourceEvent, targetCalendarId, sourceCalendarId) {
  const eventData = _buildEventPayload(sourceEvent, sourceCalendarId);

  // Determine the correct Calendar API reference
  if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
    return global.Calendar.Events.insert(eventData, targetCalendarId);
  } else if (typeof Calendar !== 'undefined') {
    return Calendar.Events.insert(eventData, targetCalendarId);
  }
  throw new Error('Calendar API not available');
}

/**
 *
 * @param sourceEvent
 * @param targetCalendarId
 * @param sourceCalendarId
 */
function createSyncedEventSafe(sourceEvent, targetCalendarId, sourceCalendarId) {
  const eventData = _buildEventPayload(sourceEvent, sourceCalendarId);

  // Determine the correct Calendar API reference
  let CalendarEvents;
  if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
    CalendarEvents = global.Calendar.Events;
  } else if (typeof Calendar !== 'undefined') {
    CalendarEvents = Calendar.Events;
  } else {
    throw new Error('Calendar API not available');
  }

  return safeCalendarApiCall(CalendarEvents.insert, [eventData, targetCalendarId], `INSERT_EVENT_${targetCalendarId}`);
}

/**
 *
 * @param events
 * @param sourceEvent
 */
function findEventByAttributes(events, sourceEvent) {
  return events.find(event => {
    // Skip events that already have sync properties (they're already synced)
    if (event.extendedProperties?.private?.SYNC_KEY) {
      return false;
    }

    // Match by summary, start, and end times
    const summaryMatch = event.summary === sourceEvent.summary;

    // Handle both dateTime and date formats
    const sourceStart = sourceEvent.start?.dateTime || sourceEvent.start?.date;
    const sourceEnd = sourceEvent.end?.dateTime || sourceEvent.end?.date;
    const targetStart = event.start?.dateTime || event.start?.date;
    const targetEnd = event.end?.dateTime || event.end?.date;

    const startMatch = sourceStart === targetStart;
    const endMatch = sourceEnd === targetEnd;

    return summaryMatch && startMatch && endMatch;
  });
}

/**
 *
 * @param sourceEvent
 * @param targetCalendarId
 * @param sourceCalendarId
 * @param targetEvents
 */
function createOrUpdateSyncedEvent(sourceEvent, targetCalendarId, sourceCalendarId, targetEvents) {
  const syncKey = generateSyncKey(sourceEvent, sourceCalendarId);

  // First, try to find by syncKey in the event map
  const eventMap = createEventMapForSource(targetEvents, sourceCalendarId);
  let targetEvent = eventMap[syncKey];

  if (targetEvent) {
    // Event exists by syncKey, update it
    console.log(`UPDATING in target: "${sourceEvent.summary}" (from ${sourceCalendarId})`);
    return updateSyncedEvent(sourceEvent, targetCalendarId, targetEvent.id, sourceCalendarId);
  }
  // Check if event exists by name, summary, start, and end times
  targetEvent = findEventByAttributes(targetEvents, sourceEvent);

  if (targetEvent) {
    // Event exists by attributes, sync it by updating with sync properties
    console.log(`SYNCING existing event in target: "${sourceEvent.summary}" (from ${sourceCalendarId})`);
    return updateSyncedEvent(sourceEvent, targetCalendarId, targetEvent.id, sourceCalendarId);
  }
  // Event doesn't exist, create new one
  console.log(`CREATED in target: "${sourceEvent.summary}" (from ${sourceCalendarId})`);
  return createSyncedEvent(sourceEvent, targetCalendarId, sourceCalendarId);
}

/**
 *
 * @param sourceEvent
 * @param targetCalendarId
 * @param targetEventId
 * @param sourceCalendarId
 */
function updateSyncedEvent(sourceEvent, targetCalendarId, targetEventId, sourceCalendarId) {
  const eventData = _buildEventPayload(sourceEvent, sourceCalendarId);

  // Determine the correct Calendar API reference
  if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
    return global.Calendar.Events.update(eventData, targetCalendarId, targetEventId);
  } else if (typeof Calendar !== 'undefined') {
    return Calendar.Events.update(eventData, targetCalendarId, targetEventId);
  }
  throw new Error('Calendar API not available');
}

/**
 *
 * @param sourceEvent
 * @param targetCalendarId
 * @param targetEventId
 * @param sourceCalendarId
 */
function updateSyncedEventSafe(sourceEvent, targetCalendarId, targetEventId, sourceCalendarId) {
  const eventData = _buildEventPayload(sourceEvent, sourceCalendarId);

  // Determine the correct Calendar API reference
  let CalendarEvents;
  if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
    CalendarEvents = global.Calendar.Events;
  } else if (typeof Calendar !== 'undefined') {
    CalendarEvents = Calendar.Events;
  } else {
    throw new Error('Calendar API not available');
  }

  return safeCalendarApiCall(
    CalendarEvents.update,
    [eventData, targetCalendarId, targetEventId],
    `UPDATE_EVENT_${targetCalendarId}_${targetEventId}`
  );
}

/**
 *
 * @param targetEvent
 * @param sourceCalendarId
 * @param originalEventId
 */
function updateSourceEvent(targetEvent, sourceCalendarId, originalEventId) {
  const eventData = _buildSourceEventPayload(targetEvent);

  // Determine the correct Calendar API reference
  if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
    return global.Calendar.Events.update(eventData, sourceCalendarId, originalEventId);
  } else if (typeof Calendar !== 'undefined') {
    return Calendar.Events.update(eventData, sourceCalendarId, originalEventId);
  }
  throw new Error('Calendar API not available');
}

/**
 *
 * @param targetEvent
 * @param sourceCalendarId
 * @param originalEventId
 */
function updateSourceEventSafe(targetEvent, sourceCalendarId, originalEventId) {
  const eventData = _buildSourceEventPayload(targetEvent);

  // Determine the correct Calendar API reference
  let CalendarEvents;
  if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
    CalendarEvents = global.Calendar.Events;
  } else if (typeof Calendar !== 'undefined') {
    CalendarEvents = Calendar.Events;
  } else {
    throw new Error('Calendar API not available');
  }

  return safeCalendarApiCall(
    CalendarEvents.update,
    [eventData, sourceCalendarId, originalEventId],
    `UPDATE_SOURCE_EVENT_${sourceCalendarId}_${originalEventId}`
  );
}

/**
 *
 * @param calendarId
 * @param eventId
 */
function deleteEvent(calendarId, eventId) {
  try {
    // Determine the correct Calendar API reference
    if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
      return global.Calendar.Events.remove(calendarId, eventId);
    } else if (typeof Calendar !== 'undefined') {
      return Calendar.Events.remove(calendarId, eventId);
    }
    throw new Error('Calendar API not available');
  } catch (error) {
    if (error.message.includes('Not Found')) {
      console.log(`Attempt to delete event ${eventId}, which no longer exists.`);
    } else {
      console.error(`Error deleting event ${eventId}:`, error);
    }
  }
  return undefined;
}

/**
 *
 * @param calendarId
 * @param eventId
 */
function deleteEventSafe(calendarId, eventId) {
  try {
    // Determine the correct Calendar API reference
    let CalendarEvents;
    if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
      CalendarEvents = global.Calendar.Events;
    } else if (typeof Calendar !== 'undefined') {
      CalendarEvents = Calendar.Events;
    } else {
      throw new Error('Calendar API not available');
    }

    return safeCalendarApiCall(CalendarEvents.remove, [calendarId, eventId], `DELETE_EVENT_${calendarId}_${eventId}`);
  } catch (error) {
    if (error.message && error.message.includes('Not Found')) {
      console.log(`Attempt to delete event ${eventId}, which no longer exists.`);
      return true; // Treat as success
    }
    throw error;
  }
}

/**
 *
 * @param calendarId
 * @param eventId
 */
function _getCalendarEventSafe(calendarId, eventId) {
  // Determine the correct Calendar API reference
  let CalendarEvents;
  if (typeof global !== 'undefined' && global.Calendar && global.Calendar.Events) {
    CalendarEvents = global.Calendar.Events;
  } else if (typeof Calendar !== 'undefined') {
    CalendarEvents = Calendar.Events;
  } else {
    throw new Error('Calendar API not available');
  }

  return safeCalendarApiCall(CalendarEvents.get, [calendarId, eventId], `GET_EVENT_${calendarId}_${eventId}`);
}

/**
 * Batch API call utility for more efficient processing
 * @param calls
 * @param batchSize
 */
function batchCalendarApiCalls(calls, batchSize = 5) {
  const results = [];

  for (let i = 0; i < calls.length; i += batchSize) {
    const batch = calls.slice(i, i + batchSize);
    const batchPromises = batch.map(call => safeCalendarApiCall(call.apiFunction, call.params, call.operationName));

    try {
      const batchResults = Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid overwhelming the API
      if (i + batchSize < calls.length) {
        Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Batch API call failed:`, error);
      // Continue with next batch
    }
  }

  return results;
}

/**
 * Utility function to monitor API usage
 */
function getApiUsageStats() {
  const queueStatus = calendarApiManager.getQueueStatus();
  console.log('=== Calendar API Usage Stats ===');
  console.log(`Queue length: ${queueStatus.queueLength}`);
  console.log(`Requests in current window: ${queueStatus.requestCount}/${queueStatus.maxRequests}`);
  console.log(`Quota resets in: ${Math.round(queueStatus.quotaResetIn / 1000)}s`);
  return queueStatus;
}

/**
 * Checks if two events are in a potential sync loop based on their sync metadata
 * @param event1
 * @param event2
 */
function isInSyncLoop(event1, event2) {
  const sync1 = event1.extendedProperties?.private;
  const sync2 = event2.extendedProperties?.private;

  if (!sync1 || !sync2) {
    return false;
  }

  // Check if both events were updated recently (within 5 minutes)
  const updated1 = new Date(sync1.SYNC_UPDATED || event1.updated);
  const updated2 = new Date(sync2.SYNC_UPDATED || event2.updated);
  const timeDiff = Math.abs(updated1.getTime() - updated2.getTime());

  return timeDiff < 300000; // 5 minutes
}

/**
 * Gets the sync metadata from an event
 * @param event
 */
function getSyncMetadata(event) {
  return {
    syncKey: event.extendedProperties?.private?.SYNC_KEY,
    syncSource: event.extendedProperties?.private?.SYNC_SOURCE,
    syncOriginalId: event.extendedProperties?.private?.SYNC_ORIGINAL_ID,
    syncVersion: event.extendedProperties?.private?.SYNC_VERSION,
    syncUpdated: event.extendedProperties?.private?.SYNC_UPDATED
  };
}

// For Node.js testing environment
if (typeof module !== 'undefined') {
  // eslint-disable-next-line no-undef
  module.exports = {
    getAllEventsIncludingDeleted,
    getAllEventsIncludingDeletedSafe,
    createEventMapForSource,
    generateSyncKey,
    generateSyncVersion,
    createSyncedEvent,
    createSyncedEventSafe,
    updateSyncedEvent,
    updateSyncedEventSafe,
    updateSourceEvent,
    updateSourceEventSafe,
    deleteEvent,
    deleteEventSafe,
    createOrUpdateSyncedEvent,
    isInSyncLoop,
    getSyncMetadata,
    getApiUsageStats,
    batchCalendarApiCalls,
    CalendarApiManager,
    calendarApiManager
  };
}
