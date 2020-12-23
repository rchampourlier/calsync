/**
 * This modules implements copying event from a
 * GCal to a CalDav and vice-versa.
 * 
 * TODO: handle recurrence
 */
import * as config from './config';
import { CalDavDescriptor, GCalDescriptor } from './config';
import * as cd from "./caldav/caldav";
import * as gc from "./gcal/gcal";
import { log as clog, logWithEvent } from "./log";
import * as rules from './rules';
import { MapEventCalDavToGCal, MapEventGCalToCalDav, MapEventGCalToGCal } from './eventMapping';

export async function CalDavToGCal(caldav: CalDavDescriptor, gcal: GCalDescriptor) {
  function log(msg: string) {
    clog(`[CalDAV:${caldav.label}>GCal:${gcal.label}] ${msg}`);
  }

  try {
    const sourceEvents = await cd.ListUpcomingEvents(caldav);
    log('Fetched all events');

    const newEvents = [];
    for (const evt of sourceEvents) {
      const markedFree = evt.iCalendarData.includes('TRANSP:TRANSPARENT');

      if (!rules.ShouldCopy(evt.summary, markedFree)) {
        logWithEvent('Ignore event', evt);
        continue;
      };

      const newSummary = rules.NewSummary(evt.summary, caldav.redactedSummary);
      const newEvt = MapEventCalDavToGCal(evt);
      newEvt.summary = newSummary;
      newEvents.push(newEvt);
    }

    await gc.InsertEvents(gcal, newEvents);
    log(`Copied all events`);
  }
  catch (err) {
    log(`Failed to copy all events: ${err}`); 
  }
};

export async function GCalToCalDav(gcal: GCalDescriptor, caldav: CalDavDescriptor) {
  function log(msg: string) {
    clog(`[GCal:${gcal.label}>CalDAV:${caldav.label}] ${msg}`);
  }

  try {
    const sourceEvents = await gc.ListUpcomingEvents(gcal);
    log('Fetched all events');

    const newEvents = [];
    for (const evt of sourceEvents) {
      if (config.LOG_DETAIL) logWithEvent('Will copy', evt);

      const newEvt = MapEventGCalToCalDav(evt);
      const newSummary = rules.NewSummary(evt.summary, gcal.redactedSummary);
      newEvt.summary = newSummary;
      newEvents.push(newEvt);
    }

    // Mirroring events from GCal mirrored to CalDAV mirror target
    await cd.InsertOrUpdateEvents(caldav, newEvents);
    log('Copied all events');
  }
  catch (err) {
    log(`Failed to copy all events: ${err}`);
  }
};

export async function GCalToGCal(gcal: GCalDescriptor, gcalTarget: GCalDescriptor) {
  function log(msg: string) {
    clog(`[GCal:${gcal.label}>GCal:${gcalTarget.label}] ${msg}`);
  }

  try {
    const sourceEvents = await gc.ListUpcomingEvents(gcal);
    log('Fetched all events');

    const newEvents = [];
    for (const evt of sourceEvents) {
      const markedFree = evt.transparency && evt.transparency === 'transparent';
      if (!rules.ShouldCopy(evt.summary, markedFree)) {
        logWithEvent('Ignore event', evt);
        continue;
      };

      const newEvt = MapEventGCalToGCal(evt);
      const newSummary = rules.NewSummary(evt.summary, gcal.redactedSummary);
      newEvt.summary = newSummary;
      newEvents.push(newEvt);
    }

    // Mirroring events from GCal mirrored to CalDAV mirror target
    await gc.InsertEvents(config.GCAL_MIRROR_TARGET, newEvents);
    log('Copied all events');
  }
  catch (err) {
    log(`Failed to copy all events: ${err}`);
  }
};