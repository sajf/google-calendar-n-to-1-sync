/**
 * @fileoverview Main logic for N-to-1 Calendar Sync.
 * Contains the core orchestration and user-facing functions.
 */

/**
 * Main function that starts the entire synchronization process.
 * It is called by an automatic trigger.
 */
function runNto1Sync() {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(15 * 60 * 1000)) {
        console.warn('Another synchronization instance is already running. Skipping.');
        return;
    }

    try {
        const now = new Date();
        const startDate = new Date(now.getTime() - (SYNC_CONFIG.DAYS_BACK * 24 * 60 * 60 * 1000));
        const endDate = new Date(now.getTime() + (SYNC_CONFIG.DAYS_FORWARD * 24 * 60 * 60 * 1000));

        console.log('Starting N->1 synchronization...');

        const allTargetEvents = getAllEventsIncludingDeleted(TARGET_CALENDAR_ID, startDate, endDate);

        // PART 1: Synchronization from sources to target (N -> 1)
        SOURCE_CALENDAR_IDS.forEach(sourceId => {
            syncSourceToTarget(sourceId, TARGET_CALENDAR_ID, startDate, endDate, allTargetEvents);
        });

        // PART 2: Reverse synchronization of changes from target to sources (1 -> N)
        syncTargetToSources(TARGET_CALENDAR_ID, SOURCE_CALENDAR_IDS, allTargetEvents);

        console.log('Synchronization successfully completed.');

    } catch (error) {
        console.error('A serious error occurred during synchronization:', error, error.stack);
    } finally {
        lock.releaseLock();
    }
}

/**
 * Synchronizes one source calendar to the target calendar.
 */
function syncSourceToTarget(sourceId, targetId, startDate, endDate, allTargetEvents) {
    console.log(`Processing: ${sourceId} -> ${targetId}`);
    const sourceEvents = getAllEventsIncludingDeleted(sourceId, startDate, endDate);
    const targetEventMap = createEventMapForSource(allTargetEvents, sourceId);

    sourceEvents.forEach(sourceEvent => {
        const expectedSyncKey = generateSyncKey(sourceEvent, sourceId);
        const targetEvent = targetEventMap[expectedSyncKey];

        if (sourceEvent.status === 'cancelled') {
            if (targetEvent && targetEvent.status !== 'cancelled') {
                deleteEvent(targetId, targetEvent.id);
                console.log(`DELETED in target: "${sourceEvent.summary || ''}" (from ${sourceId})`);
            }
        } else if (!targetEvent) {
            createOrUpdateSyncedEvent(sourceEvent, targetId, sourceId);
            console.log(`CREATED in target: "${sourceEvent.summary}" (from ${sourceId})`);
        } else {
            const sourceUpdated = new Date(sourceEvent.updated);
            const targetUpdated = new Date(targetEvent.updated);
            if (sourceUpdated > targetUpdated) {
                updateSyncedEvent(sourceEvent, targetId, targetEvent.id, sourceId);
                console.log(`UPDATED in target: "${sourceEvent.summary}" (from ${sourceId})`);
            }
        }
    });
}

/**
 * Synchronizes changes from the target calendar back to the sources.
 */
function syncTargetToSources(targetId, sourceIds, targetEvents) {
    console.log(`Processing reverse synchronization: ${targetId} -> Sources`);

    targetEvents.forEach(targetEvent => {
        try {
            const sourceCalendarId = targetEvent.extendedProperties?.private?.SYNC_SOURCE;
            const originalEventId = targetEvent.extendedProperties?.private?.SYNC_ORIGINAL_ID;

            if (!sourceCalendarId || !originalEventId || !sourceIds.includes(sourceCalendarId)) return;

            let originalEvent;
            try { originalEvent = Calendar.Events.get(sourceCalendarId, originalEventId); }
            catch (e) { if (e.message.includes('Not Found')) { if (targetEvent.status !== 'cancelled') deleteEvent(targetId, targetEvent.id); return; } throw e; }

            if (targetEvent.status === 'cancelled') {
                if (originalEvent.status !== 'cancelled') {
                    deleteEvent(sourceCalendarId, originalEventId);
                    console.log(`DELETED in source: "${originalEvent.summary}" (in ${sourceCalendarId})`);
                }
            } else {
                const targetUpdated = new Date(targetEvent.updated);
                const originalUpdated = new Date(originalEvent.updated);
                if (targetUpdated > originalUpdated) {
                    const updatedSourceEvent = updateSourceEvent(targetEvent, sourceCalendarId, originalEventId);
                    console.log(`UPDATED in source: "${targetEvent.summary}" (in ${sourceCalendarId})`);
                    if (updatedSourceEvent) {
                        Calendar.Events.patch({ summary: targetEvent.summary }, targetId, targetEvent.id);
                        console.log(`   -> "Touch" target event to unify update time.`);
                    }
                }
            }
        } catch (e) {
            console.error(`Error during reverse synchronization for event "${targetEvent.summary || targetEvent.id}":`, e);
        }
    });
}


// --- USER MANAGEMENT FUNCTIONS ---

function setupAutomaticSync() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => { if (trigger.getHandlerFunction() === 'runNto1Sync') ScriptApp.deleteTrigger(trigger); });
    ScriptApp.newTrigger('runNto1Sync').timeBased().everyMinutes(15).create();
    console.log('Automatic trigger for N->1 sync set to run every 15 minutes.');
}

function removeAutomaticSync() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => { if (trigger.getHandlerFunction() === 'runNto1Sync') ScriptApp.deleteTrigger(trigger); });
    console.log('Automatic trigger for N->1 sync removed.');
}

function testConfiguration() {
    console.log('Testing configuration...');
    let allOk = true;
    SOURCE_CALENDAR_IDS.forEach(id => {
        try { Calendar.Calendars.get(id); console.log(`✓ Access to source ${id} works.`); }
        catch(e) { console.error(`✗ ERROR with source ${id}: ${e.message}`); allOk = false; }
    });
    try { Calendar.Calendars.get(TARGET_CALENDAR_ID); console.log(`✓ Access to target ${TARGET_CALENDAR_ID} works.`); }
    catch(e) { console.error(`✗ ERROR with target ${TARGET_CALENDAR_ID}: ${e.message}`); allOk = false; }

    if (allOk) console.log('\nConfiguration is correct!'); else console.error('\nTest failed. Check calendar IDs and permissions.');
}
