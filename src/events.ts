/**
 * This module maps events from gCal's format to iCal's 
 * and vice-versa.
 */

import { calendar_v3 } from "googleapis";
import { CalendarEvent as CalDAVCalendarEvent } from "./caldav/calendar-event";

export type CalDAVEvent = CalDAVCalendarEvent;
export type GCalEvent = calendar_v3.Schema$Event;
export type CalendarEvent = GCalEvent | CalDAVEvent;

export const isCalDAVEvent = (e: any): e is CalDAVEvent => !!e.iCalendarData;
export const isGCalEvent = (e: any): e is GCalEvent => !!e.iCalUID;

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

export function mapEventToGCal(evt: CalendarEvent): GCalEvent {
  if (isCalDAVEvent(evt)) {
    const newEvt: GCalEvent = {
      summary: evt.summary,
      start: (evt.allDayEvent ?
        { date: formatDate(evt.startDate) } : // yyyy-mm-dd format
        { dateTime: evt.startDate.toISOString() }),
      end: (evt.allDayEvent ?
        { date: formatDate(evt.endDate) } : // yyyy-mm-dd format
        { dateTime: evt.endDate.toISOString() }),
      iCalUID: evt.uid,
      description: evt.uid,
    };
    if (evt.iCalendarData.includes('TRANSP:TRANSPARENT')) {
      newEvt.transparency = 'transparent';
    }
    return newEvt;
  } else if (isGCalEvent(evt)) {
    const newEvt = {
      // TODO: add a test on using recurringEventId here
      id: evt.recurringEventId || evt.id, // maintaining the ID if mapping to the same calendar
      summary: evt.summary,
      start: evt.start,
      end: evt.end,
      transparency: evt.transparency,
      iCalUID: evt.iCalUID,
      description: evt.iCalUID
    };
    return newEvt;
  }
}

export function mapEventToCalDav(evt: CalendarEvent): CalDAVEvent {
  if (isCalDAVEvent(evt)) {
    throw new Error('Not implemented');
  } else if (isGCalEvent(evt)) {
    const targetUID = evt.recurringEventId ? `${evt.iCalUID}_${evt.recurringEventId}` : evt.iCalUID;
    const newEvt: CalendarEvent = {
      uid: targetUID,
      summary: evt.summary,
      description: targetUID, // storing the UID to enable matching the event when syncing
      location: evt.location,
      startDate: new Date(evt.start.dateTime || evt.start.date),
      endDate: new Date(evt.end.dateTime || evt.end.date),
      tzid: 'Europe/Berlin',
      allDayEvent: false,
      iCalendarData: undefined // we must provided a value, but undefined will ensure it's built by the library
    };
    return newEvt;
  }
}

export function mapEventToMatchingCal(evt: CalendarEvent, evtToMatch: CalendarEvent): CalendarEvent {
  if (isCalDAVEvent(evtToMatch)) return mapEventToCalDav(evt);
  if (isGCalEvent(evtToMatch)) return mapEventToGCal(evt);
}

/**
 * Compare 2 events by mapping them using `mapEventToMatchingCal(...)`,
 * matching to the calendar format of `target`. Then compares the following
 * properties to check for equality:
 *  - start date
 *  - end date
 *  - summary
 *  - transparency
 * 
 * If any property doesn't match, returns `false`, otherwise `true`.
 * 
 * NB: the comparison ignores the `uid` or `iCalUID` field.
 * 
 * @param src 
 * @param target 
 */
export function checkMappedEquality(src: CalendarEvent, target: CalendarEvent): boolean {
  const mEvtA = mapEventToMatchingCal(src, target);
  const mEvtB = mapEventToMatchingCal(target, target);
  if (mEvtA.summary !== mEvtB.summary) return false;

  if (isGCalEvent(mEvtA)) {
    if (mEvtA.transparency !== (mEvtB as GCalEvent).transparency) return false;
    if (mEvtA.start.date && (!(mEvtB as GCalEvent).start.date)) return false;
    if (mEvtA.start.date !== (mEvtB as GCalEvent).start.date) return false;
    if (mEvtA.start.dateTime && !(mEvtB as GCalEvent).start.dateTime) return false;
    if (mEvtA.start.dateTime !== (mEvtB as GCalEvent).start.dateTime) return false;
    if (mEvtA.end.date && (!(mEvtB as GCalEvent).end.date)) return false;
    if (mEvtA.end.date !== (mEvtB as GCalEvent).end.date) return false;
    if (mEvtA.end.dateTime && !(mEvtB as GCalEvent).end.dateTime) return false;
    if (mEvtA.end.dateTime !== (mEvtB as GCalEvent).end.dateTime) return false;
  } 
  
  else if (isCalDAVEvent(mEvtA)) {
    if (mEvtA.iCalendarData.includes('TRANSP:TRANSPARENT') !== (mEvtB as CalDAVEvent).iCalendarData.includes('TRANSP:TRANSPARENT')) return false;
    if (mEvtA.startDate !== (mEvtB as CalDAVEvent).startDate) return false;
    if (mEvtA.endDate !== (mEvtB as CalDAVEvent).endDate) return false;
  }

  return true;
}

/**
 * Checks if `copy` is a copy of `src` event. The check is performed by
 * looking for `src`'s UID in `copy.description`.
 * 
 * @param src 
 * @param copy 
 */
export function matchingCopy(src: CalendarEvent, copy: CalendarEvent): boolean {
  if (isCalDAVEvent(src)) return copy.description.includes(src.uid);
  if (isGCalEvent(src)) return copy.description.includes(src.iCalUID);
}