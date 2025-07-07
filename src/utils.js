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

function _buildEventPayload(sourceEvent, sourceCalendarId) {
    const syncKey = generateSyncKey(sourceEvent, sourceCalendarId);
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
                SYNC_ORIGINAL_ID: sourceEvent.id
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
        visibility: targetEvent.visibility
    };
    Object.keys(eventData).forEach(key => (eventData[key] === undefined) && delete eventData[key]);
    return eventData;
}

function createSyncedEvent(sourceEvent, targetCalendarId, sourceCalendarId) {
    const eventData = _buildEventPayload(sourceEvent, sourceCalendarId);
    return Calendar.Events.insert(eventData, targetCalendarId);
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
