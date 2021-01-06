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

export const ListUpcomingEvents = (calDesc: CalDavDescriptor): Promise<CalendarEvent[]> => {
  const calendarClient = new CalendarClient(calDesc.url, calDesc.username, calDesc.password);
  return calendarClient.getEvents(new Date());
}

export const DeleteUpcomingEvents = (calDesc: CalDavDescriptor) => {
  return new Promise<void>(async (resolve, reject) => {
    const calendarClient = new CalendarClient(calDesc.url, calDesc.username, calDesc.password);
    
    ListUpcomingEvents(calDesc)
    .then(async (events) => {
      if (events.length === 0) {
        resolve();
        return;
      }
      for (const evt of events) {
        try {
          await calendarClient.removeEvent(evt);
          if (LOG_DETAIL) logWithCalDAVEvent('Deleted', evt);
          await throttlingDelay();
        }
        catch (err) {
          reject(`Error deleting event "${evt.summary}" (${evt.startDate.toISOString()})": ${err}\n${evt}`);
        }
      }
      resolve();
    })
    .catch((err) => {
      reject(`Error fetching upcoming events: ${err}`);
    });
  });
}