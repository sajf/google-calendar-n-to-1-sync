// tests/unit.test.js
require('./mocks');
const {
    generateSyncKey,
    getAllEventsIncludingDeleted,
    createEventMapForSource,
    createSyncedEvent,
    updateSyncedEvent,
    updateSourceEvent,
    deleteEvent,
    createOrUpdateSyncedEvent
} = require('../src/utils');

describe('Utility Functions', () => {

    describe('generateSyncKey', () => {
        it('should generate a correct sync key from an event and calendar ID', () => {
            const mockEvent = { id: 'event123' };
            const calendarId = 'cal@google.com';
            const expectedKey = 'cal@google.com:event123';

            const result = generateSyncKey(mockEvent, calendarId);

            expect(result).toBe(expectedKey);
        });

        it('should handle complex event IDs', () => {
            const mockEvent = { id: 'a_b_c_123_recurring' };
            const calendarId = 'work-calendar@group.calendar.google.com';
            const expectedKey = 'work-calendar@group.calendar.google.com:a_b_c_123_recurring';

            const result = generateSyncKey(mockEvent, calendarId);

            expect(result).toBe(expectedKey);
        });
    });

    describe('getAllEventsIncludingDeleted', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should fetch all events from calendar within date range', () => {
            const mockEvents = [
                { id: 'event1', summary: 'Event 1' },
                { id: 'event2', summary: 'Event 2' }
            ];

            global.Calendar.Events.list.mockReturnValue({ items: mockEvents });

            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-01-31');
            const result = getAllEventsIncludingDeleted('cal@google.com', startDate, endDate);

            expect(result).toEqual(mockEvents);
            expect(global.Calendar.Events.list).toHaveBeenCalledWith('cal@google.com', {
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                showDeleted: true,
                singleEvents: true,
                maxResults: 2500,
                pageToken: null
            });
        });

        it('should handle pagination correctly', () => {
            const page1 = [{ id: 'event1' }];
            const page2 = [{ id: 'event2' }];

            global.Calendar.Events.list
                .mockReturnValueOnce({ items: page1, nextPageToken: 'token123' })
                .mockReturnValueOnce({ items: page2 });

            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-01-31');
            const result = getAllEventsIncludingDeleted('cal@google.com', startDate, endDate);

            expect(result).toEqual([...page1, ...page2]);
            expect(global.Calendar.Events.list).toHaveBeenCalledTimes(2);
        });

        it('should handle API errors gracefully', () => {
            global.Calendar.Events.list.mockImplementation(() => {
                throw new Error('API Error');
            });

            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-01-31');
            const result = getAllEventsIncludingDeleted('cal@google.com', startDate, endDate);

            expect(result).toEqual([]);
            expect(global.console.error).toHaveBeenCalled();
        });
    });

    describe('createEventMapForSource', () => {
        it('should create event map for given source', () => {
            const events = [
                {
                    id: 'event1',
                    extendedProperties: {
                        private: {
                            SYNC_KEY: 'source1:original1',
                            SYNC_SOURCE: 'source1'
                        }
                    }
                },
                {
                    id: 'event2',
                    extendedProperties: {
                        private: {
                            SYNC_KEY: 'source2:original2',
                            SYNC_SOURCE: 'source2'
                        }
                    }
                }
            ];

            const result = createEventMapForSource(events, 'source1');

            expect(result).toEqual({
                'source1:original1': events[0]
            });
        });

        it('should handle events without sync properties', () => {
            const events = [
                { id: 'event1' },
                { id: 'event2', extendedProperties: {} }
            ];

            const result = createEventMapForSource(events, 'source1');

            expect(result).toEqual({});
        });
    });

    describe('createSyncedEvent', () => {
        it('should create synced event with proper payload', () => {
            const sourceEvent = {
                id: 'original123',
                summary: 'Test Event',
                description: 'Test Description',
                start: { dateTime: '2023-01-01T10:00:00Z' },
                end: { dateTime: '2023-01-01T11:00:00Z' }
            };

            const mockInsertedEvent = { id: 'inserted123' };
            global.Calendar.Events.insert.mockReturnValue(mockInsertedEvent);

            const result = createSyncedEvent(sourceEvent, 'target@cal.com', 'source@cal.com');

            expect(result).toBe(mockInsertedEvent);
            expect(global.Calendar.Events.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    summary: 'Test Event',
                    description: 'Test Description',
                    start: { dateTime: '2023-01-01T10:00:00Z' },
                    end: { dateTime: '2023-01-01T11:00:00Z' },
                    extendedProperties: {
                        private: expect.objectContaining({
                            SYNC_KEY: 'source@cal.com:original123',
                            SYNC_SOURCE: 'source@cal.com',
                            SYNC_ORIGINAL_ID: 'original123'
                            // SYNC_VERSION and SYNC_UPDATED are dynamic, so we just check they exist
                        })
                    }
                }),
                'target@cal.com'
            );

            // Verify that the dynamic properties exist
            const callArgs = global.Calendar.Events.insert.mock.calls[0][0];
            expect(callArgs.extendedProperties.private.SYNC_VERSION).toBeDefined();
            expect(callArgs.extendedProperties.private.SYNC_UPDATED).toBeDefined();
        });
    });

    describe('updateSyncedEvent', () => {
        it('should update synced event with proper payload', () => {
            const sourceEvent = {
                id: 'original123',
                summary: 'Updated Event',
                description: 'Updated Description'
            };

            const mockUpdatedEvent = { id: 'target123' };
            global.Calendar.Events.update.mockReturnValue(mockUpdatedEvent);

            const result = updateSyncedEvent(sourceEvent, 'target@cal.com', 'target123', 'source@cal.com');

            expect(result).toBe(mockUpdatedEvent);
            expect(global.Calendar.Events.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    summary: 'Updated Event',
                    description: 'Updated Description',
                    extendedProperties: {
                        private: expect.objectContaining({
                            SYNC_KEY: 'source@cal.com:original123',
                            SYNC_SOURCE: 'source@cal.com',
                            SYNC_ORIGINAL_ID: 'original123'
                        })
                    }
                }),
                'target@cal.com',
                'target123'
            );

            // Verify that the dynamic properties exist
            const callArgs = global.Calendar.Events.update.mock.calls[0][0];
            expect(callArgs.extendedProperties.private.SYNC_VERSION).toBeDefined();
            expect(callArgs.extendedProperties.private.SYNC_UPDATED).toBeDefined();
        });
    });

    describe('updateSourceEvent', () => {
        it('should update source event without sync properties', () => {
            const targetEvent = {
                id: 'target123',
                summary: 'Updated from Target',
                extendedProperties: {
                    private: {
                        SYNC_KEY: 'source@cal.com:original123'
                    }
                }
            };

            const mockUpdatedEvent = { id: 'original123' };
            global.Calendar.Events.update.mockReturnValue(mockUpdatedEvent);

            const result = updateSourceEvent(targetEvent, 'source@cal.com', 'original123');

            expect(result).toBe(mockUpdatedEvent);
            expect(global.Calendar.Events.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    summary: 'Updated from Target',
                    extendedProperties: {
                        private: expect.objectContaining({
                            SYNC_UPDATED: expect.any(String)
                        })
                    }
                }),
                'source@cal.com',
                'original123'
            );
        });
    });

    describe('deleteEvent', () => {
        it('should delete event successfully', () => {
            const mockResult = { success: true };
            global.Calendar.Events.remove.mockReturnValue(mockResult);

            const result = deleteEvent('cal@google.com', 'event123');

            expect(result).toBe(mockResult);
            expect(global.Calendar.Events.remove).toHaveBeenCalledWith('cal@google.com', 'event123');
        });

        it('should handle not found error gracefully', () => {
            const notFoundError = new Error('Not Found');
            global.Calendar.Events.remove.mockImplementation(() => {
                throw notFoundError;
            });

            const result = deleteEvent('cal@google.com', 'event123');

            expect(result).toBeUndefined();
            expect(global.console.log).toHaveBeenCalledWith(
                'Attempt to delete event event123, which no longer exists.'
            );
        });

        it('should handle other errors', () => {
            const otherError = new Error('API Error');
            global.Calendar.Events.remove.mockImplementation(() => {
                throw otherError;
            });

            const result = deleteEvent('cal@google.com', 'event123');

            expect(result).toBeUndefined();
            expect(global.console.error).toHaveBeenCalledWith(
                'Error deleting event event123:',
                otherError
            );
        });
    });

    describe('createOrUpdateSyncedEvent', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should update existing event found by syncKey', () => {
            const sourceEvent = {
                id: 'original123',
                summary: 'Test Event',
                start: { dateTime: '2023-01-01T10:00:00Z' },
                end: { dateTime: '2023-01-01T11:00:00Z' }
            };

            const targetEvents = [
                {
                    id: 'target123',
                    summary: 'Test Event',
                    start: { dateTime: '2023-01-01T10:00:00Z' },
                    end: { dateTime: '2023-01-01T11:00:00Z' },
                    extendedProperties: {
                        private: {
                            SYNC_KEY: 'source@cal.com:original123',
                            SYNC_SOURCE: 'source@cal.com',
                            SYNC_ORIGINAL_ID: 'original123'
                        }
                    }
                }
            ];

            const mockUpdatedEvent = { id: 'target123' };
            global.Calendar.Events.update.mockReturnValue(mockUpdatedEvent);

            const result = createOrUpdateSyncedEvent(sourceEvent, 'target@cal.com', 'source@cal.com', targetEvents);

            expect(result).toBe(mockUpdatedEvent);
            expect(global.Calendar.Events.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    summary: 'Test Event',
                    extendedProperties: {
                        private: expect.objectContaining({
                            SYNC_KEY: 'source@cal.com:original123',
                            SYNC_SOURCE: 'source@cal.com',
                            SYNC_ORIGINAL_ID: 'original123'
                        })
                    }
                }),
                'target@cal.com',
                'target123'
            );
        });

        it('should sync existing event found by attributes', () => {
            const sourceEvent = {
                id: 'original123',
                summary: 'Test Event',
                start: { dateTime: '2023-01-01T10:00:00Z' },
                end: { dateTime: '2023-01-01T11:00:00Z' }
            };

            const targetEvents = [
                {
                    id: 'target123',
                    summary: 'Test Event',
                    start: { dateTime: '2023-01-01T10:00:00Z' },
                    end: { dateTime: '2023-01-01T11:00:00Z' }
                    // No sync properties initially
                }
            ];

            const mockUpdatedEvent = { id: 'target123' };
            global.Calendar.Events.update.mockReturnValue(mockUpdatedEvent);

            const result = createOrUpdateSyncedEvent(sourceEvent, 'target@cal.com', 'source@cal.com', targetEvents);

            expect(result).toBe(mockUpdatedEvent);
            expect(global.Calendar.Events.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    summary: 'Test Event',
                    extendedProperties: {
                        private: expect.objectContaining({
                            SYNC_KEY: 'source@cal.com:original123',
                            SYNC_SOURCE: 'source@cal.com',
                            SYNC_ORIGINAL_ID: 'original123'
                        })
                    }
                }),
                'target@cal.com',
                'target123'
            );
        });

        it('should create new event when not found', () => {
            const sourceEvent = {
                id: 'original123',
                summary: 'New Event',
                start: { dateTime: '2023-01-01T10:00:00Z' },
                end: { dateTime: '2023-01-01T11:00:00Z' }
            };

            const targetEvents = []; // No existing events

            const mockInsertedEvent = { id: 'inserted123' };
            global.Calendar.Events.insert.mockReturnValue(mockInsertedEvent);

            const result = createOrUpdateSyncedEvent(sourceEvent, 'target@cal.com', 'source@cal.com', targetEvents);

            expect(result).toBe(mockInsertedEvent);
            expect(global.Calendar.Events.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    summary: 'New Event',
                    extendedProperties: {
                        private: expect.objectContaining({
                            SYNC_KEY: 'source@cal.com:original123',
                            SYNC_SOURCE: 'source@cal.com',
                            SYNC_ORIGINAL_ID: 'original123'
                        })
                    }
                }),
                'target@cal.com'
            );
        });
    });
});