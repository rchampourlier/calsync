import { mapEventToGCal } from './events';
import * as sync from './sync';
import * as fixtures from './testSupport/fixtures';

describe('GetInstructions', () => {

  test('empty sources and target', () => {
    const sourcesEvents = [];
    const targetEvents = [];
    expect(
      sync.GetInstructions(sourcesEvents, targetEvents)
    ).toStrictEqual({
      insert: [],
      update: [],
      delete: []
    });
  });

  test('empty target', () => {
    const sourcesEvents = [fixtures.GetGCal('common'), fixtures.GetCalDAV('allDay')];
    const targetEvents = [];
    expect(
      sync.GetInstructions(sourcesEvents, targetEvents)
    ).toStrictEqual({
      insert: sourcesEvents,
      update: [],
      delete: []
    });
  });

  test('empty sources and non-empty target', () => {
    const sourcesEvents = [];
    const targetEvents = [fixtures.GetGCal('common'), fixtures.GetCalDAV('nonTransparent')].map((e) => mapEventToGCal(e));
    expect(
      sync.GetInstructions(sourcesEvents, targetEvents)
    ).toStrictEqual({
      insert: [],
      update: [],
      delete: targetEvents
    });
  });

  test('target events are in sync with sources events', () => {
    const sourcesEvents = [fixtures.GetGCal('common'), fixtures.GetCalDAV('transparent')];
    const targetEvents = sourcesEvents.map((e) => mapEventToGCal(e));

    expect(
      sync.GetInstructions(sourcesEvents, targetEvents)
    ).toStrictEqual({
      insert: [],
      update: [],
      delete: []
    });
  });

  test('event updated in sources', () => {
    const updatedGCalEvent = fixtures.GetGCal('common');
    updatedGCalEvent.start.dateTime = '2020-12-28T13:00:00+01:00';
    updatedGCalEvent.end.dateTime = '2020-12-28T14:00:00+01:00';

    const sourcesEvents = [updatedGCalEvent, fixtures.GetCalDAV('nonTransparent')];

    const targetUpdatedEvent = mapEventToGCal(fixtures.GetGCal('common'));
    targetUpdatedEvent.id = 'aaaa_20201228T100000Z';
    // Changing the matching target's event ID to ensure the update API call
    // is done using it's ID and not the one of the matching sources event.
    const targetEvents = [targetUpdatedEvent, fixtures.GetCalDAV('nonTransparent')].map((e) => mapEventToGCal(e));

    const updateEvent = mapEventToGCal(fixtures.GetGCal('common'));
    updateEvent.id = 'aaaa_20201228T100000Z';
    updateEvent.start.dateTime = '2020-12-28T13:00:00+01:00';
    updateEvent.end.dateTime = '2020-12-28T14:00:00+01:00';

    expect(
      sync.GetInstructions(sourcesEvents, targetEvents)
    ).toStrictEqual({
      insert: [],
      update: [updateEvent],
      delete: []
    });
  });

  test('missing event in target', () => {
    const sourcesEvents = [fixtures.GetGCal('common'), fixtures.GetCalDAV('nonTransparent')];
    const targetEvents = [fixtures.GetCalDAV('nonTransparent')].map((e) => mapEventToGCal(e));

    expect(
      sync.GetInstructions(sourcesEvents, targetEvents)
    ).toStrictEqual({
      insert: [fixtures.GetGCal('common')],
      update: [],
      delete: []
    });
  });

  test('extraneous event in target', () => {
    const sourcesEvents = [fixtures.GetGCal('common'), fixtures.GetCalDAV('nonTransparent')];
    const targetEvents = [fixtures.GetGCal('common'), fixtures.GetCalDAV('nonTransparent'), fixtures.GetCalDAV('transparent')].map((e) => mapEventToGCal(e));

    expect(
      sync.GetInstructions(sourcesEvents, targetEvents)
    ).toStrictEqual({
      insert: [],
      update: [],
      delete: [fixtures.GetCalDAV('transparent')].map(mapEventToGCal)
    });
  });

  test('multiple changes', () => {
    const updatedGCalEvent = fixtures.GetGCal('common');
    updatedGCalEvent.id = 'aaaabbbb';
    updatedGCalEvent.start.dateTime = '2020-12-28T13:00:00+01:00';
    updatedGCalEvent.end.dateTime = '2020-12-28T14:00:00+01:00';
    const sourcesEvents = [updatedGCalEvent, fixtures.GetCalDAV('nonTransparent'), fixtures.GetCalDAV('nonAllDay')];
    const targetEvents = [fixtures.GetGCal('common'), fixtures.GetCalDAV('nonTransparent'), fixtures.GetCalDAV('allDay')].map(mapEventToGCal)

    const updateEvent = mapEventToGCal(fixtures.GetGCal('common'));
    updateEvent.start.dateTime = '2020-12-28T13:00:00+01:00';
    updateEvent.end.dateTime = '2020-12-28T14:00:00+01:00';

    expect(
      sync.GetInstructions(sourcesEvents, targetEvents)
    ).toStrictEqual({
      insert: [fixtures.GetCalDAV('nonAllDay')],
      update: [updateEvent],
      delete: [fixtures.GetCalDAV('allDay')].map(mapEventToGCal)
    });
  });
});