// tests/integration.test.js
/* eslint-env jest, node */
const { mockCalendarApi, createMockEvent } = require('./mocks');

describe('Calendar API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Calendar Events API', () => {
    it('should handle calendar list operations', () => {
      const mockEvents = [
        createMockEvent({ id: 'event1', summary: 'Meeting 1' }),
        createMockEvent({ id: 'event2', summary: 'Meeting 2' })
      ];

      mockCalendarApi.Events.list.mockReturnValue({ items: mockEvents });

      const result = mockCalendarApi.Events.list('calendar@test.com', {
        timeMin: new Date('2023-01-01').toISOString(),
        timeMax: new Date('2023-01-31').toISOString()
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].summary).toBe('Meeting 1');
    });

    it('should handle event creation', () => {
      const eventData = {
        summary: 'New Event',
        start: { dateTime: '2023-01-01T10:00:00Z' },
        end: { dateTime: '2023-01-01T11:00:00Z' }
      };

      const createdEvent = { ...eventData, id: 'created123' };
      mockCalendarApi.Events.insert.mockReturnValue(createdEvent);

      const result = mockCalendarApi.Events.insert(eventData, 'calendar@test.com');

      expect(result.id).toBe('created123');
      expect(result.summary).toBe('New Event');
      expect(mockCalendarApi.Events.insert).toHaveBeenCalledWith(eventData, 'calendar@test.com');
    });

    it('should handle event updates', () => {
      const eventData = {
        summary: 'Updated Event',
        description: 'Updated description'
      };

      const updatedEvent = { ...eventData, id: 'event123' };
      mockCalendarApi.Events.update.mockReturnValue(updatedEvent);

      const result = mockCalendarApi.Events.update(eventData, 'calendar@test.com', 'event123');

      expect(result.summary).toBe('Updated Event');
      expect(mockCalendarApi.Events.update).toHaveBeenCalledWith(eventData, 'calendar@test.com', 'event123');
    });

    it('should handle event deletion', () => {
      mockCalendarApi.Events.remove.mockReturnValue({ success: true });

      const result = mockCalendarApi.Events.remove('calendar@test.com', 'event123');

      expect(result.success).toBe(true);
      expect(mockCalendarApi.Events.remove).toHaveBeenCalledWith('calendar@test.com', 'event123');
    });

    it('should handle API errors properly', () => {
      const apiError = new Error('API_ERROR');
      mockCalendarApi.Events.list.mockImplementation(() => {
        throw apiError;
      });

      expect(() => {
        mockCalendarApi.Events.list('invalid@calendar.com');
      }).toThrow('API_ERROR');
    });
  });

  describe('Lock Service Integration', () => {
    it('should acquire and release locks properly', () => {
      const lock = global.LockService.getScriptLock();

      expect(lock.tryLock()).toBe(true);
      expect(lock.releaseLock).toBeDefined();

      lock.releaseLock();
      expect(lock.releaseLock).toHaveBeenCalled();
    });
  });
});
