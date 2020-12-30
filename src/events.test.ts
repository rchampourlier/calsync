import { calendar_v3 } from 'googleapis';
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

describe('mapEventToGCal', () => {

  test('allDay CalDAV event', () => {
    const evt = fixtures.GetCalDAV('allDay');
    expect(events.mapEventToGCal(evt)).toStrictEqual({
      summary: 'Event CalDav AllDay',
      start: { date: '2026-01-01' },
      end: { date: '2026-01-02' },
      iCalUID: '00000004-AAAA-BBBB-CCCC-DDDDDDDDDDDD',
      description: '00000004-AAAA-BBBB-CCCC-DDDDDDDDDDDD'
    } as calendar_v3.Schema$Event);
  });

  test('non allDay CalDAV event', () => {
    const evt = fixtures.GetCalDAV('nonAllDay');
    expect(events.mapEventToGCal(evt)).toStrictEqual({
      summary: 'Event CalDav NonAllDay',
      start: { dateTime: '2020-12-04T16:45:00.000Z' },
      end: { dateTime: '2020-12-04T17:45:00.000Z' },
      iCalUID: '00000003-AAAA-BBBB-CCCC-DDDDDDDDDDDD',
      description: '00000003-AAAA-BBBB-CCCC-DDDDDDDDDDDD'
    } as calendar_v3.Schema$Event);
  });

  test('transparent GCal event', () => {
    const evt = fixtures.GetGCal('common');
    evt.transparency = 'transparent';
    expect(events.mapEventToGCal(evt)).toStrictEqual({
      id: '6507h6nl57g862qrast14euejr_20201228T100000Z',
      summary: evt.summary,
      start: { dateTime: evt.start.dateTime, timeZone: evt.start.timeZone },
      end: { dateTime: evt.end.dateTime, timeZone: evt.end.timeZone },
      transparency: 'transparent',
      iCalUID: evt.iCalUID,
      description: evt.iCalUID
    });
  });

  test('transparent event', () => {
    const evt = fixtures.GetCalDAV('transparent');
    expect(events.mapEventToGCal(evt)).toStrictEqual({
      summary: 'Event CalDav Transparent',
      start: { date: '2026-01-01' },
      end: { date: '2026-01-02' },
      transparency: 'transparent',
      iCalUID: '00000001-AAAA-BBBB-CCCC-DDDDDDDDDDDD',
      description: '00000001-AAAA-BBBB-CCCC-DDDDDDDDDDDD'
    } as calendar_v3.Schema$Event);
  });

  test('nonTransparent event', () => {
    const evt = fixtures.GetCalDAV('nonTransparent');
    expect(events.mapEventToGCal(evt)).toStrictEqual({
      summary: 'Event CalDav NonTransparent',
      start: { date: '2026-01-01' },
      end: { date: '2026-01-02' },
      iCalUID: '00000002-AAAA-BBBB-CCCC-DDDDDDDDDDDD',
      description: '00000002-AAAA-BBBB-CCCC-DDDDDDDDDDDD'
    } as calendar_v3.Schema$Event);
  });
});

describe('checkEquality', () => {

  test('matching events', () => {
    const evt: events.GCalEvent = {
      summary: 'Event CalDav Transparent',
      start: { date: '2026-01-01' },
      end: { date: '2026-01-02' },
      transparency: 'transparent',
      iCalUID: '00000009-AAAA-BBBB-CCCC-DDDDDDDDDDDD'
    };
    expect(
      events.checkMappedEquality(fixtures.GetCalDAV('transparent'), evt)
    ).toEqual(true);
  });

  test('different start dates', () => {
    const evt: events.GCalEvent = {
      summary: 'Event CalDav Transparent',
      start: { date: '2026-01-02' },
      end: { date: '2026-01-02' },
      transparency: 'transparent',
      iCalUID: '00000009-AAAA-BBBB-CCCC-DDDDDDDDDDDD'
    };
    expect(
      events.checkMappedEquality(fixtures.GetCalDAV('transparent'), evt)
    ).toEqual(false); 
  });

  test('allDay event and non allDay one', () => {
    const evt: events.GCalEvent = {
      summary: 'Event CalDav AllDay',
      start: { dateTime: '2020-11-27T13:00:00.000Z' },
      end: { dateTime: '2020-11-27T14:00:00.000Z' },
      iCalUID: '00000009-AAAA-BBBB-CCCC-DDDDDDDDDDDD'
    };
    expect(
      events.checkMappedEquality(fixtures.GetCalDAV('allDay'), evt)
    ).toEqual(false); 
  });

  test('different start times', () => {
    const evt = {
      summary: 'Event CalDav NonAllDay',
      start: { dateTime: '2020-12-04T17:45:00.000Z' },
      end: { dateTime: '2020-12-04T18:45:00.000Z' },
      iCalUID: '00000009-AAAA-BBBB-CCCC-DDDDDDDDDDDD' // needed to ensure the event is recognized as a GCal event
    };
    expect(
      events.checkMappedEquality(fixtures.GetCalDAV('nonAllDay'), evt)
    ).toEqual(false); 
  });

  test('different summaries', () => {
    const evt = {
      summary: 'Different',
      start: { dateTime: '2020-12-04T16:45:00.000Z' },
      end: { dateTime: '2020-12-04T17:45:00.000Z' },
      iCalUID: '00000009-AAAA-BBBB-CCCC-DDDDDDDDDDDD'
    };
    expect(
      events.checkMappedEquality(fixtures.GetCalDAV('nonAllDay'), evt)
    ).toEqual(false); 
  });

  test('different transparency', () => {
    const evt = {
      summary: 'Event CalDav Transparent',
      start: { date: '2026-01-01' },
      end: { date: '2026-01-02' },
      iCalUID: '00000009-AAAA-BBBB-CCCC-DDDDDDDDDDDD'
    };
    expect(
      events.checkMappedEquality(fixtures.GetCalDAV('transparent'), evt)
    ).toEqual(false); 
  });
});

describe('matchingCopy', () => {
  
  test('matching', () => {
    expect(
      events.matchingCopy(fixtures.GetCalDAV('transparent'), events.mapEventToGCal(fixtures.GetCalDAV('transparent')))
    ).toStrictEqual(true);
  });

  test('not matching', () => {
    expect(
      events.matchingCopy(fixtures.GetCalDAV('transparent'), events.mapEventToGCal(fixtures.GetCalDAV('nonTransparent')))
    ).toStrictEqual(false);
  });
});