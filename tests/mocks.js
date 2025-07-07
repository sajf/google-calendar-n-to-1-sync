// tests/mocks.js

// Mock events
const createMockEvent = ({ id, summary, updated, status = 'confirmed', extendedProperties = {} }) => ({
    id,
    summary,
    updated: updated || new Date().toISOString(),
    status,
    extendedProperties,
});

// Mock Calendar API
const mockCalendarApi = {
    Events: {
        get: jest.fn(),
        list: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        patch: jest.fn(),
        remove: jest.fn(),
    },
};

// Globální mocky pro GAS prostředí
global.Calendar = mockCalendarApi;
global.LockService = {
    getScriptLock: () => ({
        tryLock: jest.fn().mockReturnValue(true),
        releaseLock: jest.fn(),
    }),
};
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

module.exports = {
    createMockEvent,
    mockCalendarApi,
};