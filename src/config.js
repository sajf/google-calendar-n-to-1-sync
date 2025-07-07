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
};
