// tests/mocks.js
/* eslint-env jest, node */

// Mock events
const createMockEvent = ({ id, summary, updated, status = 'confirmed', extendedProperties = {} }) => ({
  id,
  summary,
  updated: updated || '2023-01-01T00:00:00.000Z', // Fixed timestamp for consistent snapshots
  status,
  extendedProperties
});

// Mock Calendar API
const mockCalendarApi = {
  Events: {
    get: jest.fn(),
    list: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    patch: jest.fn(),
    remove: jest.fn()
  }
};

// Global mocks for Google Apps Script environment
global.Calendar = mockCalendarApi;
global.LockService = {
  getScriptLock: () => ({
    tryLock: jest.fn().mockReturnValue(true),
    releaseLock: jest.fn()
  })
};
global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

module.exports = {
  createMockEvent,
  mockCalendarApi
};
