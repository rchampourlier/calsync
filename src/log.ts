import { calendar_v3 } from "googleapis"
import { CalendarEvent } from "./caldav/calendar-event"

const Version = '1.1.0';

function prefix(): string {
  return `v${Version} -- ${(new Date()).toISOString()} -- `;
}

export function log(msg: string, ...args: any[]) {
  if (args.length > 0) console.log(`${prefix()}${msg}`, ...args)
  else console.log(`${prefix()}${msg}`)
}

export function logWithCalDAVEvent(msg: string, event: CalendarEvent) {
  const eventStr = `"${event.summary}" (${event.startDate.toISOString()})`;
  console.log(`${prefix()}${msg} -- ${eventStr}`)
}

export function logWithGCalEvent(msg: string, event: calendar_v3.Schema$Event) {
  const eventStr = `"${event.summary}" (${event.start.date ? event.start.date : event.start.dateTime})`;
  console.log(`${prefix()}${msg} -- ${eventStr}`)
}