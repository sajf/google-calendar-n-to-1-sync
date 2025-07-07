
/**
 * @fileoverview Configuration for the N-to-1 Calendar Sync script.
 *
 * IMPORTANT: Insert your calendar IDs here.
 */

// List of source calendar IDs from which events will be aggregated.
const SOURCE_CALENDAR_IDS = [
    'source-a-id@group.calendar.google.com',
    'source-b-id@group.calendar.google.com',
    // Add more calendars as needed.
];

// ID of the target (aggregated) calendar.
const TARGET_CALENDAR_ID = 'target-id@group.calendar.google.com';

// Time window settings for synchronization.
const SYNC_CONFIG = {
    DAYS_BACK: 14,     // How many days back to synchronize.
    DAYS_FORWARD: 90,  // How many days forward to synchronize.

    // Loop detection settings
    LOOP_DETECTION_WINDOW: 300000, // 5 minutes in milliseconds
    MAX_SYNC_ATTEMPTS: 3,          // Maximum sync attempts before marking as potential loop
    MIN_UPDATE_INTERVAL: 60000,    // Minimum time between updates (1 minute)

    // Sync state management
    MAX_OPERATION_HISTORY: 1000,   // Maximum operations to keep in history
    SYNC_STATE_CLEANUP_INTERVAL: 3600000, // 1 hour in milliseconds
};