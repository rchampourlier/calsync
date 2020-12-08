import * as config from './config';
import { CalDavDescriptor, GCalDescriptor } from './config';
import { CalendarEvent } from './caldav/calendar-event';
import * as cd from "./caldav/caldav";
import * as gc from "./gcal/gcal";
import { log as clog } from "./log";

const LOG_DETAIL = false;

function formatDate(date: Date): string {
  function pad(n: number): string {
    return (n <= 9 ? `0${n}` : `${n}`);
  }
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const str = `${year}-${pad(month)}-${pad(day)}`;
  return str;
}

export async function CalDavToGCal(caldav: CalDavDescriptor, gcal: GCalDescriptor) {
  function log(msg: string) {
    clog(`[CalDAV:${caldav.label}>GCal:${gcal.label}] ${msg}`);
  }

  try {
    const sourceEvents = await cd.ListUpcomingEvents(caldav);
    log('Fetched all events');

    let newEvents = [];
    for (const evt of sourceEvents) {
      const forceSharing = evt.summary.includes(config.FORCE_SHARING_SIGN);
      const markedFree = evt.iCalendarData.includes('TRANSP:TRANSPARENT');

      if (!forceSharing && markedFree) {
        // Event is marked "free" (instead of "busy"), so
        // it may be ignored.
        log('Ignore event "' + evt.summary + '" (' + evt.startDate.toISOString() + ')');
        continue;
      }

      const summary = caldav.redactedSummary === undefined || evt.summary.includes(config.FORCE_SHARING_SIGN) ? evt.summary : caldav.redactedSummary
      if (LOG_DETAIL) log('Will copy event "' + summary + '" (' + evt.startDate.toISOString() + ')')

      const newEvt = {
        'summary': summary,
        'start': (evt.allDayEvent ?
          { 'date': formatDate(evt.startDate) } : // yyyy-mm-dd format
          { 'dateTime': evt.startDate.toISOString() }),
        'end': (evt.allDayEvent ?
          { 'date': formatDate(evt.endDate) } : // yyyy-mm-dd format
          { 'dateTime': evt.endDate.toISOString() })
      };
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
    let recurringUniqueIndex = 0;
    for (const evt of sourceEvents) {
      evt.recurringEventId;

      const summary = gcal.redactedSummary && evt.summary.includes(config.FORCE_SHARING_SIGN) ? evt.summary : gcal.redactedSummary;
      if (LOG_DETAIL) log(`Will copy event "${summary}" (${evt.start.date ? evt.start.date : evt.start.dateTime})`);

      const newEvt: CalendarEvent = {
        uid: evt.recurringEventId ? `${evt.iCalUID}_${recurringUniqueIndex++}` : evt.iCalUID, // trick to have several events for a recurring one
        summary: evt.summary,
        description: '',
        location: evt.location,
        startDate: new Date(evt.start.dateTime || evt.start.date),
        endDate: new Date(evt.end.dateTime || evt.end.date),
        tzid: 'Europe/Berlin',
        allDayEvent: false,
        iCalendarData: undefined // we must provided a value, but undefined will ensure it's build by the library
      };
      // TODO: handle recurrence
      newEvents.push(newEvt);
    }

    /**
     * Mirroring events from GCal mirrored to CalDAV mirror target
     */
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
      const summary = gcal.redactedSummary === undefined || evt.summary.includes(config.FORCE_SHARING_SIGN) ? evt.summary : gcal.redactedSummary
      const newEvt = {
        summary: evt.summary,
        start: evt.start,
        end: evt.end
      };
      if (LOG_DETAIL) log(`Will copy event "${evt.summary}" (${evt.start.date ? evt.start.date : evt.start.dateTime})`);
      newEvents.push(newEvt);
    }

    /**
     * Mirroring events from GCal mirrored to CalDAV mirror target
     */
    await gc.InsertEvents(config.GCAL_MIRROR_TARGET, newEvents);
    log('Copied all events');
  }
  catch (err) {
    log(`Failed to copy all events: ${err}`);
  }
};