'use strict';

const assert = require('chai').assert;
const clone = require('clone');
const moment = require('./../src/moment');

const CalendarActionBuilder = require('./../src/CalendarActionBuilder');

const ical = require('ical-generator');
const IcalExpander = require('ical-expander');
  
function createCal(events) {

  const cal = ical({domain: 'github.com', name: 'test calendar'});

  for (var property in events) {
    if (events.hasOwnProperty(property)) {
      
      var event = events[property];

      var e = cal.createEvent({
        start: event.start,
        end: event.end,
        summary: event.summary
      });

      if (event.rrule) {
        e.repeating(event.rrule);
      }
      
    }
  }

  const ics = cal.toString();

  const icalExpander = new IcalExpander({
    ics,
    maxIterations: 100
  });

  const calendar = icalExpander.all();

  return calendar;

}

describe('CalendarActionBuilder with offset', () => {

  const oneEvent = {
    'foo': {
      summary: 'Test',
      start: new Date(2018, 0, 30, 10, 0, 0, 0),
      end: new Date(2018, 0, 30, 10, 15, 0, 0),
    }
  };

  const recurringEvent = {
    'foo': {
      summary: 'Test',
      start: new Date(2018, 0, 30, 10, 0, 0, 0),
      end: new Date(2018, 0, 30, 10, 15, 0, 0),
      rrule: {
        freq: 'DAILY',
        until: new Date(2018, 1, 5, 10, 0)
      }
    }
  };

  it('Move start of non-recurring event for 2d offset', () => {
    const expectedActions = [
      {
        date: new Date(2018, 0, 28, 10, 0, 0, 0),
        expires: oneEvent.foo.end,
        state: true,
        summary: oneEvent.foo.summary
      }, {
        date: oneEvent.foo.end,
        expires: oneEvent.foo.end,
        state: false,
        summary: oneEvent.foo.summary
      }
    ];

    const actionBuilder = new CalendarActionBuilder('-2d');
    const actions = actionBuilder._generateNonRecurringEvents(createCal(oneEvent));

    assert.deepEqual(actions, expectedActions);
  });

  it('Move start of non-recurring event for 4h offset', () => {
    const expectedActions = [
      {
        date: new Date(2018, 0, 30, 6, 0, 0, 0),
        expires: oneEvent.foo.end,
        state: true,
        summary: oneEvent.foo.summary
      }, {
        date: oneEvent.foo.end,
        expires: oneEvent.foo.end,
        state: false,
        summary: oneEvent.foo.summary
      }
    ];

    const actionBuilder = new CalendarActionBuilder('-4h');
    const actions = actionBuilder._generateNonRecurringEvents(createCal(oneEvent));

    assert.deepEqual(actions, expectedActions);
  });


  it('Move start of non-recurring event for 30m offset', () => {
    const expectedActions = [
      {
        date: new Date(2018, 0, 30, 9, 30, 0, 0),
        expires: oneEvent.foo.end,
        state: true,
        summary: oneEvent.foo.summary
      }, {
        date: oneEvent.foo.end,
        expires: oneEvent.foo.end,
        state: false,
        summary: oneEvent.foo.summary
      }
    ];

    const actionBuilder = new CalendarActionBuilder('-30m');
    const actions = actionBuilder._generateNonRecurringEvents(createCal(oneEvent));

    assert.deepEqual(actions, expectedActions);
  });

  it('Move start of non-recurring event for 15s offset', () => {
    const expectedActions = [
      {
        date: new Date(2018, 0, 30, 9, 59, 45, 0),
        expires: oneEvent.foo.end,
        state: true,
        summary: oneEvent.foo.summary
      }, {
        date: oneEvent.foo.end,
        expires: oneEvent.foo.end,
        state: false,
        summary: oneEvent.foo.summary
      }
    ];

    const actionBuilder = new CalendarActionBuilder('-15s');
    const actions = actionBuilder._generateNonRecurringEvents(createCal(oneEvent));

    assert.deepEqual(actions, expectedActions);
  });

  it('Moves all recurring events ahead by 2 days', () => {
    /**
     * Only test expansion of the recurring event - do not actually test 
     * all recurrences as that's actually handled by node-ical. This only makes
     * sure that we're generating more than one pair of actions for them.
     */
    const offset = 2 * 24 * 60 * 60 * 1000;

    const expectedActions = [
      {
        date: new Date(recurringEvent.foo.start.valueOf() - offset),
        expires: recurringEvent.foo.end,
        state: true,
        summary: recurringEvent.foo.summary
      }, {
        date: recurringEvent.foo.end,
        expires: recurringEvent.foo.end,
        state: false,
        summary: recurringEvent.foo.summary
      }
    ];

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    for (let i = 1; i < 7; i++) {
      const start = clone(expectedActions[0]);
      const end = clone(expectedActions[1]);

      start.date = new Date(start.date.valueOf() + (i * millisecondsPerDay));
      start.expires = new Date(end.expires.valueOf() + (i * millisecondsPerDay));
      end.date = new Date(end.date.valueOf() + (i * millisecondsPerDay));
      end.expires = new Date(end.expires.valueOf() + (i * millisecondsPerDay));
      expectedActions.push(start, end);
    }

    const actionBuilder = new CalendarActionBuilder('-2d');
    const actions = actionBuilder._generateRecurringEvents(createCal(recurringEvent), moment('20180130'));

    assert.equal(actions.length, 14);
    assert.deepEqual(actionBuilder._sortEventsByDate(actions), actionBuilder._sortEventsByDate(expectedActions));
  });

  it('Moves all recurring events ahead by 2 hours', () => {
    /**
     * Only test expansion of the recurring event - do not actually test 
     * all recurrences as that's actually handled by node-ical. This only makes
     * sure that we're generating more than one pair of actions for them.
     */

    const offset = 2 * 60 * 60 * 1000;

    const expectedActions = [
      {
        date: new Date(recurringEvent.foo.start.valueOf() - offset),
        expires: recurringEvent.foo.end,
        state: true,
        summary: recurringEvent.foo.summary
      }, {
        date: recurringEvent.foo.end,
        expires: recurringEvent.foo.end,
        state: false,
        summary: recurringEvent.foo.summary
      }
    ];

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    for (let i = 1; i < 7; i++) {
      const start = clone(expectedActions[0]);
      const end = clone(expectedActions[1]);

      start.date = new Date(start.date.valueOf() + (i * millisecondsPerDay));
      start.expires = new Date(end.expires.valueOf() + (i * millisecondsPerDay));
      end.date = new Date(end.date.valueOf() + (i * millisecondsPerDay));
      end.expires = new Date(end.expires.valueOf() + (i * millisecondsPerDay));
      expectedActions.push(start, end);
    }

    const actionBuilder = new CalendarActionBuilder('-2h');
    const actions = actionBuilder._generateRecurringEvents(createCal(recurringEvent), moment('20180130'));

    assert.equal(actions.length, 14);
    assert.deepEqual(actionBuilder._sortEventsByDate(actions), actionBuilder._sortEventsByDate(expectedActions));
  });

  it('Moves all recurring events ahead by 15 minutes', () => {
    /**
     * Only test expansion of the recurring event - do not actually test 
     * all recurrences as that's actually handled by node-ical. This only makes
     * sure that we're generating more than one pair of actions for them.
     */

    const offset = 15 * 60 * 1000;

    const expectedActions = [
      {
        date: new Date(recurringEvent.foo.start.valueOf() - offset),
        expires: recurringEvent.foo.end,
        state: true,
        summary: recurringEvent.foo.summary
      }, {
        date: recurringEvent.foo.end,
        expires: recurringEvent.foo.end,
        state: false,
        summary: recurringEvent.foo.summary
      }
    ];

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    for (let i = 1; i < 7; i++) {
      const start = clone(expectedActions[0]);
      const end = clone(expectedActions[1]);

      start.date = new Date(start.date.valueOf() + (i * millisecondsPerDay));
      start.expires = new Date(end.expires.valueOf() + (i * millisecondsPerDay));
      end.date = new Date(end.date.valueOf() + (i * millisecondsPerDay));
      end.expires = new Date(end.expires.valueOf() + (i * millisecondsPerDay));
      expectedActions.push(start, end);
    }

    const actionBuilder = new CalendarActionBuilder('15m');
    const actions = actionBuilder._generateRecurringEvents(createCal(recurringEvent), moment('20180130'));

    assert.equal(actions.length, 14);
    assert.deepEqual(actionBuilder._sortEventsByDate(actions), actionBuilder._sortEventsByDate(expectedActions));
  });

  it('Moves all recurring events ahead by 30 seconds', () => {
    /**
     * Only test expansion of the recurring event - do not actually test 
     * all recurrences as that's actually handled by node-ical. This only makes
     * sure that we're generating more than one pair of actions for them.
     */
    const offset = 30 * 1000;

    const expectedActions = [
      {
        date: new Date(recurringEvent.foo.start.valueOf() - offset),
        expires: recurringEvent.foo.end,
        state: true,
        summary: recurringEvent.foo.summary
      }, {
        date: recurringEvent.foo.end,
        expires: recurringEvent.foo.end,
        state: false,
        summary: recurringEvent.foo.summary
      }
    ];

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    for (let i = 1; i < 7; i++) {
      const start = clone(expectedActions[0]);
      const end = clone(expectedActions[1]);

      start.date = new Date(start.date.valueOf() + (i * millisecondsPerDay));
      start.expires = new Date(end.expires.valueOf() + (i * millisecondsPerDay));
      end.date = new Date(end.date.valueOf() + (i * millisecondsPerDay));
      end.expires = new Date(end.expires.valueOf() + (i * millisecondsPerDay));
      expectedActions.push(start, end);
    }

    const actionBuilder = new CalendarActionBuilder('30s');
    const actions = actionBuilder._generateRecurringEvents(createCal(recurringEvent), moment('20180130'));

    assert.equal(actions.length, 14);
    assert.deepEqual(actionBuilder._sortEventsByDate(actions), actionBuilder._sortEventsByDate(expectedActions));
  });
});
