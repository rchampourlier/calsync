import { CalendarClient } from './calendar-client';
import { CalDavDescriptor, LOG_DETAIL } from '../config';
import { CalendarEvent } from './calendar-event';
import { log, logWithEvent } from "../log"

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
          if (LOG_DETAIL) logWithEvent('Deleted', evt);
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

export const InsertOrUpdateEvents = (calDesc: CalDavDescriptor, events: CalendarEvent[]) => {
  return new Promise<void>(async (resolve, reject) => {
    const calendarClient = new CalendarClient(calDesc.url, calDesc.username, calDesc.password);
    for (const evt of events) {
      try {
        await calendarClient.addOrUpdateEvent(evt);
        await throttlingDelay();
        if (LOG_DETAIL) logWithEvent(`Inserted`, evt);
      }
      catch (err) {
        log(`Error inserting event "${evt.summary} (${evt.startDate.toISOString()})": ${err}\n`);
      }
    }
    resolve();
  });
}