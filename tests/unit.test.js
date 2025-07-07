// tests/unit.test.js
require('./mocks');
const { generateSyncKey } = require('../src/utils'); // Předpokládá rozdělení kódu

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

    // Zde by byly další testy pro _buildEventPayload, createEventMapForSource, atd.

});