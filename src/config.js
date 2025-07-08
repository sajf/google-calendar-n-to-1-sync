/**
 * @file Configuration for the N-to-1 Calendar Sync script.
 *
 * IMPORTANT: Insert your calendar IDs here.
 */

// List of source calendar IDs from which events will be aggregated.
const SOURCE_CALENDAR_IDS = [
  'source-a-id@group.calendar.google.com',
  'source-b-id@group.calendar.google.com'
  // Add more calendars as needed.
];

// ID of the target (aggregated) calendar.
const TARGET_CALENDAR_ID = 'target-id@group.calendar.google.com';

// Time window settings for synchronization.
const SYNC_CONFIG = {
  DAYS_BACK: 14, // How many days back to synchronize.
  DAYS_FORWARD: 90, // How many days forward to synchronize.

  // Loop detection settings
  LOOP_DETECTION_WINDOW: 300000, // 5 minutes in milliseconds
  MAX_SYNC_ATTEMPTS: 3, // Maximum sync attempts before marking as potential loop
  MIN_UPDATE_INTERVAL: 60000, // Minimum time between updates (1 minute)

  // Sync state management
  MAX_OPERATION_HISTORY: 1000, // Maximum operations to keep in history
  SYNC_STATE_CLEANUP_INTERVAL: 3600000 // 1 hour in milliseconds
};

/**
 * Calendar API Rate Limiting Configuration
 */
const API_RATE_LIMIT_CONFIG = {
  // Request timing
  MIN_REQUEST_INTERVAL: 100, // Minimum milliseconds between requests
  MAX_REQUESTS_PER_WINDOW: 100, // Maximum requests per quota window
  QUOTA_RESET_WINDOW: 60000, // Quota reset window in milliseconds (1 minute)

  // Retry configuration
  MAX_RETRIES: 3, // Maximum retry attempts
  BASE_DELAY: 1000, // Base delay for exponential backoff (1 second)
  BACKOFF_MULTIPLIER: 2, // Multiplier for exponential backoff
  MAX_DELAY: 30000, // Maximum delay between retries (30 seconds)

  // Batch processing
  BATCH_SIZE: 5, // Number of API calls per batch
  BATCH_DELAY: 500, // Delay between batches in milliseconds

  // Monitoring
  QUOTA_WARNING_THRESHOLD: 0.8, // Warn when 80% of quota is used
  QUOTA_CRITICAL_THRESHOLD: 0.9 // Critical warning at 90% quota usage
};

// Apply configuration to CalendarApiManager
if (typeof calendarApiManager !== 'undefined') {
  Object.assign(calendarApiManager, {
    minRequestInterval: API_RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL,
    maxRequestsPerWindow: API_RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW,
    quotaResetWindow: API_RATE_LIMIT_CONFIG.QUOTA_RESET_WINDOW,
    maxRetries: API_RATE_LIMIT_CONFIG.MAX_RETRIES,
    baseDelay: API_RATE_LIMIT_CONFIG.BASE_DELAY,
    backoffMultiplier: API_RATE_LIMIT_CONFIG.BACKOFF_MULTIPLIER,
    maxDelay: API_RATE_LIMIT_CONFIG.MAX_DELAY
  });
}
