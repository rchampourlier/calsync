/**
 * This module maps events from gCal's format to iCal's 
 * and vice-versa.
 */

import { calendar_v3 } from "googleapis";
import { CalendarEvent } from "./caldav/calendar-event";

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

export function MapEventCalDavToGCal(evt: CalendarEvent): calendar_v3.Schema$Event {
  const newEvt: calendar_v3.Schema$Event = {
    summary: evt.summary,
    start: (evt.allDayEvent ?
      { date: formatDate(evt.startDate) } : // yyyy-mm-dd format
      { dateTime: evt.startDate.toISOString() }),
    end: (evt.allDayEvent ?
      { date: formatDate(evt.endDate) } : // yyyy-mm-dd format
      { dateTime: evt.endDate.toISOString() })
  };
  if (evt.iCalendarData.includes('TRANSP:TRANSPARENT')) {
    newEvt.transparency = 'transparent';
  }
  return newEvt;
}

export function MapEventGCalToCalDav(evt: calendar_v3.Schema$Event): CalendarEvent {
  const newEvt: CalendarEvent = {
    uid: evt.recurringEventId ? `${evt.iCalUID}_${Date.now()}` : evt.iCalUID, // trick to have several events for a recurring one
    summary: evt.summary,
    description: '',
    location: evt.location,
    startDate: new Date(evt.start.dateTime || evt.start.date),
    endDate: new Date(evt.end.dateTime || evt.end.date),
    tzid: 'Europe/Berlin',
    allDayEvent: false,
    iCalendarData: undefined // we must provided a value, but undefined will ensure it's built by the library
  };
  return newEvt;
}

export function MapEventGCalToGCal(evt: calendar_v3.Schema$Event): calendar_v3.Schema$Event {
  const newEvt = {
    summary: evt.summary,
    start: evt.start,
    end: evt.end
  };
  return newEvt;
}