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

export const ListEventsUpcomingYear = (calDesc: CalDavDescriptor): Promise<CalendarEvent[]> => {
  const calendarClient = new CalendarClient(calDesc.url, calDesc.username, calDesc.password);
  const now = new Date(); 
  const inOneYear = new Date(); inOneYear.setFullYear(now.getFullYear() + 1);
  return calendarClient.getEvents(now, inOneYear);
}