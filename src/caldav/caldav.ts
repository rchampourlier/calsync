import { CalendarClient } from './calendar-client';
import { CalDavDescriptor, LOG_DETAIL } from '../config';
import { CalendarEvent } from './calendar-event';
import { logWithCalDAVEvent } from '../log';

const THROTTLING_DELAY = 100;
function throttlingDelay() {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, THROTTLING_DELAY);
  });
};

export const listEvents = (calDesc: CalDavDescriptor, start: Date, end: Date): Promise<CalendarEvent[]> => {
  const calendarClient = new CalendarClient(calDesc.url, calDesc.username, calDesc.password);
  return calendarClient.getEvents(start, end);
}