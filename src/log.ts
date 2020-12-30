import { calendar_v3 } from "googleapis"
import { CalendarEvent } from "./caldav/calendar-event"
import { isCalDAVEvent, isGCalEvent } from "./events";

const Version = '1.1.0';

function prefix(): string {
  return `v${Version} -- ${(new Date()).toISOString()} -- `;
}

function eventStr(event: calendar_v3.Schema$Event | CalendarEvent): string {
  if (isGCalEvent(event)) {
    return `"${event.summary}" #${event.iCalUID} (${event.start.date ? event.start.date : event.start.dateTime})`;
  }
  else if (isCalDAVEvent(event)) {
    return `"${event.summary}" #${event.uid} (${event.startDate.toISOString()})`;
  }
}

export function log(msg: string, ...args: any[]) {
  if (args.length > 0) console.log(`${prefix()}${msg}`, ...args)
  else console.log(`${prefix()}${msg}`)
}

export function logWithEvent(msg: string, event: calendar_v3.Schema$Event | CalendarEvent) {
  console.log(`${prefix()}${msg} -- ${eventStr(event)}`)
}