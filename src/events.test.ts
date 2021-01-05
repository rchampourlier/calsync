import * as events from './events';
import * as fixtures from './testSupport/fixtures';

describe('isCalDAVEvent', () => {
  test('CalDAV event', () => {
    expect(events.isCalDAVEvent(fixtures.GetCalDAV('allDay'))).toEqual(true);
  })

  test('GCal event', () => {
    expect(events.isCalDAVEvent(fixtures.GetCalDAV('allDay'))).toEqual(true);
  });
});

describe('compareMappedEvents', () => {

  function basicGCalEventData(): events.CalendarEventData {
    return {
      summary: 'summary',
      start: { date: '2020-01-01' },
      end: { date: '2020-01-02' },
      transparency: 'transparent'
    };
  }

  test('same events', () => {
    expect(
      events.compareEventsData(basicGCalEventData(), basicGCalEventData())
    ).toEqual(true);
  });

  test('different start kind (date/time)', () => {
    const evt = basicGCalEventData();
    evt.start.date = undefined;
    evt.start.dateTime = '2020-01-01T12:00:00.000Z';
    expect(
      events.compareEventsData(basicGCalEventData(), evt)
    ).toEqual(false);
  });

  test('different start date', () => {
    const evt = basicGCalEventData();
    evt.start.date = '2020-01-02';
    expect(
      events.compareEventsData(basicGCalEventData(), evt)
    ).toEqual(false);
  });

  test('different start time', () => {
    const evtA = basicGCalEventData();
    evtA.start.date = undefined;
    evtA.start.dateTime = '2020-01-01T12:00:00.000Z';
    const evtB = basicGCalEventData();
    evtB.start.date = undefined;
    evtB.start.dateTime = '2020-01-01T13:00:00.000Z';
    expect(
      events.compareEventsData(evtA, evtB)
    ).toEqual(false);
  });

  test('different summaries', () => {
    const evt = basicGCalEventData();
    evt.summary = 'Not the same';
    expect(
      events.compareEventsData(basicGCalEventData(), evt)
    ).toEqual(false);
  });

  test('different transparency', () => {
    const evt = basicGCalEventData();
    evt.transparency = undefined;
    expect(
      events.compareEventsData(basicGCalEventData(), evt)
    ).toEqual(false);
  });
});