import { calendar_v3 } from "googleapis"
import { CalendarEvent } from "./caldav/calendar-event"

const Version = '1.0.3'

function prefix(): string {
  return `v${Version} -- ${(new Date()).toISOString()} -- `;
}

function eventStr(event: calendar_v3.Schema$Event | CalendarEvent): string {
  if (Object.keys(event).includes('start')) {
    // GCal event
    const evt = event as calendar_v3.Schema$Event;
    return `"${evt.summary}" (${evt.start.date ? evt.start.date : evt.start.dateTime})`;
  }
  else {
    // CalDAV event
    const evt = event as CalendarEvent;
    return `"${evt.summary}" (${evt.startDate.toISOString()})`;
  }
}

export function log(msg: string, ...args: any[]) {
  if (args.length > 0) console.log(`${prefix()}${msg}`, ...args)
  else console.log(`${prefix()}${msg}`)
}

export function logWithEvent(msg: string, event: calendar_v3.Schema$Event | CalendarEvent) {
  console.log(`${prefix()}${msg} -- ${eventStr(event)}`)
}