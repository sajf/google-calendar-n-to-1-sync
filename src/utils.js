
/**
 * @fileoverview Utility functions for Calendar Sync script.
 * These functions handle data manipulation, API calls, and payload creation.
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
            const response = Calendar.Events.list(calendarId, optionalArgs);
            if (response.items) {
                events = events.concat(response.items);
            }
            pageToken = response.nextPageToken;
        } catch (e) {
            console.error(`Error loading events from ${calendarId}: ${e.toString()}`);
            pageToken = null;
        }
    } while (pageToken);
    return events;
}

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

function generateSyncKey(event, sourceCalendarId) {
    return `${sourceCalendarId}:${event.id}`;
}

function generateSyncVersion() {
    return Date.now().toString();
}

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
    Object.keys(eventData).forEach(key => (eventData[key] === undefined) && delete eventData[key]);
    return eventData;
}

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
    Object.keys(eventData).forEach(key => (eventData[key] === undefined) && delete eventData[key]);
    return eventData;
}

function createSyncedEvent(sourceEvent, targetCalendarId, sourceCalendarId) {
    const eventData = _buildEventPayload(sourceEvent, sourceCalendarId);
    return Calendar.Events.insert(eventData, targetCalendarId);
}

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

function createOrUpdateSyncedEvent(sourceEvent, targetCalendarId, sourceCalendarId, targetEvents) {
    const syncKey = generateSyncKey(sourceEvent, sourceCalendarId);

    // First, try to find by syncKey in the event map
    const eventMap = createEventMapForSource(targetEvents, sourceCalendarId);
    let targetEvent = eventMap[syncKey];

    if (targetEvent) {
        // Event exists by syncKey, update it
        console.log(`UPDATING in target: "${sourceEvent.summary}" (from ${sourceCalendarId})`);
        return updateSyncedEvent(sourceEvent, targetCalendarId, targetEvent.id, sourceCalendarId);
    } else {
        // Check if event exists by name, summary, start, and end times
        targetEvent = findEventByAttributes(targetEvents, sourceEvent);

        if (targetEvent) {
            // Event exists by attributes, sync it by updating with sync properties
            console.log(`SYNCING existing event in target: "${sourceEvent.summary}" (from ${sourceCalendarId})`);
            return updateSyncedEvent(sourceEvent, targetCalendarId, targetEvent.id, sourceCalendarId);
        } else {
            // Event doesn't exist, create new one
            console.log(`CREATED in target: "${sourceEvent.summary}" (from ${sourceCalendarId})`);
            return createSyncedEvent(sourceEvent, targetCalendarId, sourceCalendarId);
        }
    }
}

function updateSyncedEvent(sourceEvent, targetCalendarId, targetEventId, sourceCalendarId) {
    const eventData = _buildEventPayload(sourceEvent, sourceCalendarId);
    return Calendar.Events.update(eventData, targetCalendarId, targetEventId);
}

function updateSourceEvent(targetEvent, sourceCalendarId, originalEventId) {
    const eventData = _buildSourceEventPayload(targetEvent);
    return Calendar.Events.update(eventData, sourceCalendarId, originalEventId);
}

function deleteEvent(calendarId, eventId) {
    try {
        return Calendar.Events.remove(calendarId, eventId);
    } catch (error) {
        if (error.message.includes('Not Found')) {
            console.log(`Attempt to delete event ${eventId}, which no longer exists.`);
        } else {
            console.error(`Error deleting event ${eventId}:`, error);
        }
    }
}

/**
 * Checks if two events are in a potential sync loop based on their sync metadata
 */
function isInSyncLoop(event1, event2) {
    const sync1 = event1.extendedProperties?.private;
    const sync2 = event2.extendedProperties?.private;

    if (!sync1 || !sync2) return false;

    // Check if both events were updated recently (within 5 minutes)
    const updated1 = new Date(sync1.SYNC_UPDATED || event1.updated);
    const updated2 = new Date(sync2.SYNC_UPDATED || event2.updated);
    const timeDiff = Math.abs(updated1.getTime() - updated2.getTime());

    return timeDiff < 300000; // 5 minutes
}

/**
 * Gets the sync metadata from an event
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
    module.exports = {
        getAllEventsIncludingDeleted,
        createEventMapForSource,
        generateSyncKey,
        generateSyncVersion,
        createSyncedEvent,
        updateSyncedEvent,
        updateSourceEvent,
        deleteEvent,
        createOrUpdateSyncedEvent,
        isInSyncLoop,
        getSyncMetadata
    };
}