
const { mockCalendarApi, createMockEvent } = require('./mocks');
const { runNto1Sync } = require('../src/main'); // Assumes code separation

// Description of scenarios that should be tested manually or automatically

describe('End-to-End Sync Scenarios', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    test('SCENARIO 1: New event in source should be created in target', () => {
        // 1. Arrange - State setup
        const sourceEvent = createMockEvent({ id: 'event1', summary: 'New Meeting' });
        mockCalendarApi.Events.list
            .mockReturnValueOnce({ items: [sourceEvent] }) // Source calendar
            .mockReturnValueOnce({ items: [] }); // Target calendar is empty

        // 2. Act - Run the function
        runNto1Sync();

        // 3. Assert - Verify the result
        expect(mockCalendarApi.Events.insert).toHaveBeenCalledTimes(1);
        expect(mockCalendarApi.Events.insert).toHaveBeenCalledWith(
            expect.objectContaining({ summary: 'New Meeting' }),
            'TARGET_CALENDAR_ID'
        );
    });

    test('SCENARIO 2: Updated event in target should be updated back in source', () => {
        // Arrange
        const originalEventId = 'event-in-source-1';
        const sourceCalendarId = 'SOURCE_A';
        const syncKey = `${sourceCalendarId}:${originalEventId}`;

        const sourceEvent = createMockEvent({
            id: originalEventId,
            summary: 'Old Summary',
            updated: '2023-01-01T10:00:00Z'
        });

        const targetEvent = createMockEvent({
            id: 'event-in-target-copy-1',
            summary: 'Updated Summary',
            updated: '2023-01-01T11:00:00Z', // Newer timestamp
            extendedProperties: { private: { SYNC_KEY: syncKey, SYNC_SOURCE: sourceCalendarId, SYNC_ORIGINAL_ID: originalEventId } }
        });

        mockCalendarApi.Events.list
            .mockReturnValueOnce({ items: [sourceEvent] }) // Source A
            .mockReturnValueOnce({ items: [] }) // Source B
            .mockReturnValueOnce({ items: [targetEvent] }); // Target

        mockCalendarApi.Events.get.mockReturnValue(sourceEvent);

        // Act
        runNto1Sync();

        // Assert
        expect(mockCalendarApi.Events.update).toHaveBeenCalledTimes(1);
        expect(mockCalendarApi.Events.update).toHaveBeenCalledWith(
            expect.objectContaining({ summary: 'Updated Summary' }),
            sourceCalendarId, // Must be called on the correct source
            originalEventId
        );
        // Verify that "touch" was called to prevent ping-pong
        expect(mockCalendarApi.Events.patch).toHaveBeenCalledTimes(1);
    });

    // Additional scenarios would follow here:
    // - Event deletion in source -> deletion in target
    // - Event deletion in target -> deletion in source
    // - Change in source -> change in target
    // - Ignoring new event created in target
    // - Orphaned event in target is deleted
});