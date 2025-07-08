// tests/snapshot.test.js
/* eslint-env jest, node */
require('./mocks');
const { createMockEvent } = require('./mocks');

describe('Snapshot Tests', () => {
  describe('Event Data Structures', () => {
    it('should match event payload snapshot', () => {
      const sourceEvent = {
        id: 'event123',
        summary: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        start: { dateTime: '2023-01-01T10:00:00Z' },
        end: { dateTime: '2023-01-01T11:00:00Z' },
        attendees: [
          { email: 'user1@test.com', responseStatus: 'accepted' },
          { email: 'user2@test.com', responseStatus: 'needsAction' }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 15 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };

      // This would create a snapshot of the event structure
      expect(sourceEvent).toMatchSnapshot();
    });

    it('should match sync event payload snapshot', () => {
      const syncEvent = createMockEvent({
        id: 'sync123',
        summary: 'Synced Event',
        extendedProperties: {
          private: {
            SYNC_KEY: 'source@cal.com:original123',
            SYNC_SOURCE: 'source@cal.com',
            SYNC_ORIGINAL_ID: 'original123'
          }
        }
      });

      expect(syncEvent).toMatchSnapshot();
    });

    it('should match complex event map snapshot', () => {
      const events = [
        createMockEvent({
          id: 'event1',
          summary: 'Event 1',
          extendedProperties: {
            private: {
              SYNC_KEY: 'source1:original1',
              SYNC_SOURCE: 'source1'
            }
          }
        }),
        createMockEvent({
          id: 'event2',
          summary: 'Event 2',
          extendedProperties: {
            private: {
              SYNC_KEY: 'source2:original2',
              SYNC_SOURCE: 'source2'
            }
          }
        })
      ];

      expect(events).toMatchSnapshot();
    });
  });
});
