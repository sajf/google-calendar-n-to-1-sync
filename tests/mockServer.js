// tests/mockServer.js

class MockCalendarServer {
  constructor() {
    this.calendars = new Map();
    this.events = new Map();
    this.reset();
  }

  reset() {
    this.calendars.clear();
    this.events.clear();
    this.setupDefaultCalendars();
  }

  setupDefaultCalendars() {
    this.calendars.set('source1@test.com', {
      id: 'source1@test.com',
      summary: 'Source Calendar 1',
      events: []
    });

    this.calendars.set('source2@test.com', {
      id: 'source2@test.com',
      summary: 'Source Calendar 2',
      events: []
    });

    this.calendars.set('target@test.com', {
      id: 'target@test.com',
      summary: 'Target Calendar',
      events: []
    });
  }

  addEvent(calendarId, event) {
    if (!this.calendars.has(calendarId)) {
      throw new Error(`Calendar ${calendarId} not found`);
    }

    const eventId = event.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEvent = {
      ...event,
      id: eventId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'confirmed'
    };

    this.events.set(`${calendarId}:${eventId}`, fullEvent);
    return fullEvent;
  }

  updateEvent(calendarId, eventId, updates) {
    const eventKey = `${calendarId}:${eventId}`;
    const existingEvent = this.events.get(eventKey);

    if (!existingEvent) {
      throw new Error(`Event ${eventId} not found in calendar ${calendarId}`);
    }

    const updatedEvent = {
      ...existingEvent,
      ...updates,
      updated: new Date().toISOString()
    };

    this.events.set(eventKey, updatedEvent);
    return updatedEvent;
  }

  deleteEvent(calendarId, eventId) {
    const eventKey = `${calendarId}:${eventId}`;
    const exists = this.events.has(eventKey);

    if (!exists) {
      throw new Error(`Event ${eventId} not found in calendar ${calendarId}`);
    }

    this.events.delete(eventKey);
    return { success: true };
  }

  listEvents(calendarId, options = {}) {
    const calendarEvents = Array.from(this.events.entries())
      .filter(([key]) => key.startsWith(`${calendarId}:`))
      .map(([, event]) => event);

    // Apply filtering based on options
    let filteredEvents = calendarEvents;

    if (options.timeMin) {
      const minTime = new Date(options.timeMin);
      filteredEvents = filteredEvents.filter(event => {
        const eventTime = new Date(event.start?.dateTime || event.start?.date);
        return eventTime >= minTime;
      });
    }

    if (options.timeMax) {
      const maxTime = new Date(options.timeMax);
      filteredEvents = filteredEvents.filter(event => {
        const eventTime = new Date(event.end?.dateTime || event.end?.date);
        return eventTime <= maxTime;
      });
    }

    if (!options.showDeleted) {
      filteredEvents = filteredEvents.filter(event => event.status !== 'cancelled');
    }

    return {
      items: filteredEvents,
      nextPageToken: null
    };
  }

  getEvent(calendarId, eventId) {
    const eventKey = `${calendarId}:${eventId}`;
    const event = this.events.get(eventKey);

    if (!event) {
      throw new Error(`Event ${eventId} not found in calendar ${calendarId}`);
    }

    return event;
  }

  // Create mock implementation for Calendar API
  createMockApi() {
    return {
      Events: {
        list: jest.fn().mockImplementation((calendarId, options) => this.listEvents(calendarId, options)),
        get: jest.fn().mockImplementation((calendarId, eventId) => this.getEvent(calendarId, eventId)),
        insert: jest.fn().mockImplementation((event, calendarId) => this.addEvent(calendarId, event)),
        update: jest
          .fn()
          .mockImplementation((event, calendarId, eventId) => this.updateEvent(calendarId, eventId, event)),
        patch: jest
          .fn()
          .mockImplementation((event, calendarId, eventId) => this.updateEvent(calendarId, eventId, event)),
        remove: jest.fn().mockImplementation((calendarId, eventId) => this.deleteEvent(calendarId, eventId))
      }
    };
  }
}

module.exports = { MockCalendarServer };
