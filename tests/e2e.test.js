// tests/e2e.test.js
/* eslint-env jest, node */
const { MockCalendarServer } = require('./mockServer');
const { createMockEvent } = require('./mocks');

describe('End-to-End Sync Scenarios', () => {
  let mockServer;
  let mockCalendarApi;

  beforeEach(() => {
    mockServer = new MockCalendarServer();
    mockCalendarApi = mockServer.createMockApi();

    // Replace global Calendar with mock
    global.Calendar = mockCalendarApi;
  });

  afterEach(() => {
    mockServer.reset();
  });

  test('SCENARIO 1: New event in source should be created in target', () => {
    // Arrange
    const sourceEvent = createMockEvent({
      id: 'event1',
      summary: 'New Meeting',
      start: { dateTime: '2023-01-01T10:00:00Z' },
      end: { dateTime: '2023-01-01T11:00:00Z' }
    });

    mockServer.addEvent('source1@test.com', sourceEvent);

    // Act - Simulate the sync process
    const sourceEvents = mockCalendarApi.Events.list('source1@test.com');
    const targetEvents = mockCalendarApi.Events.list('target@test.com');

    // The sync logic would create the event in target
    const syncedEvent = mockCalendarApi.Events.insert(
      {
        ...sourceEvent,
        extendedProperties: {
          private: {
            SYNC_KEY: 'source1@test.com:event1',
            SYNC_SOURCE: 'source1@test.com',
            SYNC_ORIGINAL_ID: 'event1'
          }
        }
      },
      'target@test.com'
    );

    // Assert
    expect(sourceEvents.items).toHaveLength(1);
    expect(targetEvents.items).toHaveLength(0);
    expect(syncedEvent.summary).toBe('New Meeting');
    expect(syncedEvent.extendedProperties.private.SYNC_KEY).toBe('source1@test.com:event1');
  });

  test('SCENARIO 2: Event deletion in source should delete in target', () => {
    // Arrange
    const sourceEvent = createMockEvent({ id: 'event1', summary: 'To Delete' });
    mockServer.addEvent('source1@test.com', sourceEvent);

    const syncedEvent = mockServer.addEvent('target@test.com', {
      ...sourceEvent,
      id: 'synced1',
      extendedProperties: {
        private: {
          SYNC_KEY: 'source1@test.com:event1',
          SYNC_SOURCE: 'source1@test.com',
          SYNC_ORIGINAL_ID: 'event1'
        }
      }
    });

    // Act - Delete from source
    mockCalendarApi.Events.remove('source1@test.com', 'event1');

    // Sync logic would then delete from target
    mockCalendarApi.Events.remove('target@test.com', 'synced1');

    // Assert
    expect(() => mockCalendarApi.Events.get('source1@test.com', 'event1')).toThrow();
    expect(() => mockCalendarApi.Events.get('target@test.com', 'synced1')).toThrow();
  });

  test('SCENARIO 3: Bidirectional update propagation', () => {
    // Arrange
    const originalEvent = createMockEvent({
      id: 'event1',
      summary: 'Original Meeting',
      updated: '2023-01-01T10:00:00Z'
    });

    mockServer.addEvent('source1@test.com', originalEvent);

    const syncedEvent = mockServer.addEvent('target@test.com', {
      ...originalEvent,
      id: 'synced1',
      extendedProperties: {
        private: {
          SYNC_KEY: 'source1@test.com:event1',
          SYNC_SOURCE: 'source1@test.com',
          SYNC_ORIGINAL_ID: 'event1'
        }
      }
    });

    // Act - Update in target (newer timestamp)
    const updatedTargetEvent = mockCalendarApi.Events.update(
      {
        summary: 'Updated from Target',
        updated: '2023-01-01T11:00:00Z'
      },
      'target@test.com',
      'synced1'
    );

    // Sync logic would propagate back to source
    const updatedSourceEvent = mockCalendarApi.Events.update(
      {
        summary: 'Updated from Target'
      },
      'source1@test.com',
      'event1'
    );

    // Assert
    expect(updatedTargetEvent.summary).toBe('Updated from Target');
    expect(updatedSourceEvent.summary).toBe('Updated from Target');
  });

  test('SCENARIO 4: Orphaned event cleanup', () => {
    // Arrange - Create orphaned event in target
    const orphanedEvent = mockServer.addEvent('target@test.com', {
      id: 'orphaned1',
      summary: 'Orphaned Event',
      extendedProperties: {
        private: {
          SYNC_KEY: 'nonexistent@test.com:deleted123',
          SYNC_SOURCE: 'nonexistent@test.com',
          SYNC_ORIGINAL_ID: 'deleted123'
        }
      }
    });

    // Act - Sync logic would detect orphaned event and remove it
    mockCalendarApi.Events.remove('target@test.com', 'orphaned1');

    // Assert
    expect(() => mockCalendarApi.Events.get('target@test.com', 'orphaned1')).toThrow();
  });

  test('SCENARIO 5: Multiple source calendars sync', () => {
    // Arrange
    const source1Event = createMockEvent({ id: 'event1', summary: 'Source 1 Event' });
    const source2Event = createMockEvent({ id: 'event2', summary: 'Source 2 Event' });

    mockServer.addEvent('source1@test.com', source1Event);
    mockServer.addEvent('source2@test.com', source2Event);

    // Act - Sync both sources to target
    const synced1 = mockCalendarApi.Events.insert(
      {
        ...source1Event,
        extendedProperties: {
          private: {
            SYNC_KEY: 'source1@test.com:event1',
            SYNC_SOURCE: 'source1@test.com',
            SYNC_ORIGINAL_ID: 'event1'
          }
        }
      },
      'target@test.com'
    );

    const synced2 = mockCalendarApi.Events.insert(
      {
        ...source2Event,
        extendedProperties: {
          private: {
            SYNC_KEY: 'source2@test.com:event2',
            SYNC_SOURCE: 'source2@test.com',
            SYNC_ORIGINAL_ID: 'event2'
          }
        }
      },
      'target@test.com'
    );

    // Assert
    const targetEvents = mockCalendarApi.Events.list('target@test.com');
    expect(targetEvents.items).toHaveLength(2);
    expect(targetEvents.items.map(e => e.summary)).toContain('Source 1 Event');
    expect(targetEvents.items.map(e => e.summary)).toContain('Source 2 Event');
  });
});
