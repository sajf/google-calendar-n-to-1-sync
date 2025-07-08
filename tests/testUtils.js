// tests/testUtils.js
/* eslint-env jest, node */

/**
 * Test utilities for calendar sync testing
 */

const { createMockEvent } = require('./mocks');

/**
 * Creates a realistic event with random data
 * @param {object} overrides - Properties to override in the event
 * @returns {object} Mock event object
 */
function createRealisticEvent(overrides = {}) {
  const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + (1 + Math.random() * 3) * 60 * 60 * 1000);

  return createMockEvent({
    id: eventId,
    summary: `Test Event ${eventId}`,
    description: `Description for ${eventId}`,
    location: 'Test Location',
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    attendees: [
      { email: 'attendee1@test.com', responseStatus: 'accepted' },
      { email: 'attendee2@test.com', responseStatus: 'needsAction' }
    ],
    ...overrides
  });
}

/**
 * Creates a batch of test events
 * @param {number} count - Number of events to create
 * @param {object} overrides - Properties to override in each event
 * @returns {Array<object>} Array of mock event objects
 */
function createEventBatch(count = 5, overrides = {}) {
  return Array.from({ length: count }, (_, i) =>
    createRealisticEvent({
      summary: `Batch Event ${i + 1}`,
      ...overrides
    })
  );
}

/**
 * Asserts that two events are equivalent (ignoring timestamps)
 * @param {object} event1 - First event to compare
 * @param {object} event2 - Second event to compare
 * @param {Array<string>} ignoreFields - Fields to ignore during comparison
 */
function assertEventsEqual(event1, event2, ignoreFields = ['updated', 'created']) {
  const normalize = event => {
    const normalized = { ...event };
    ignoreFields.forEach(field => delete normalized[field]);
    return normalized;
  };

  expect(normalize(event1)).toEqual(normalize(event2));
}

/**
 * Simulates time passing for testing timestamp-based logic
 * @param {number} milliseconds - Number of milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
function simulateTimePass(milliseconds = 1000) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Creates a mock date range for testing
 * @param {number} daysFromNow - Number of days from now to start the range
 * @param {number} durationDays - Duration of the range in days
 * @returns {object} Object with start and end dates
 */
function createDateRange(daysFromNow = 0, durationDays = 30) {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

module.exports = {
  createRealisticEvent,
  createEventBatch,
  assertEventsEqual,
  simulateTimePass,
  createDateRange
};
