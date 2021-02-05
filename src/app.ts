import * as fs from 'fs';
import * as config from './config';
import * as caldav from './caldav/caldav';
import * as gcal from './gcal/gcal';
import * as sync from './sync';
import { log } from './log';
import { CalendarEvent, isCalDAVEvent, CalDAVEvent } from './events';

const writeToFile = false;

async function main() {
  const start: Date = new Date();
  const end: Date = new Date(); end.setFullYear(end.getFullYear() + 1);

  const sourcesEvents: { event: CalendarEvent, redactedSummary: string | undefined }[] = [];
  for (const source of config.sources) {
    const fetchedEvents = source.kind === 'CalDav' ?
      await caldav.listEvents(source, start, end) :
      await gcal.listEvents(source, start, end);
    log(`Fetched ${fetchedEvents.length} events for ${source.label}`);
    fetchedEvents.forEach((event: CalendarEvent) => {
      // Handling CalDAV recurrent events
      if (isCalDAVEvent(event) && event.isRecurring) {
        // Handling recurring CalDAV events
        // Iterate using the recurrenceIterator and create
        // events when in the timespan.
        if (event.startDate >= start && event.startDate <= end) {
          // `event` is within the period
          sourcesEvents.push({ event: event, redactedSummary: source.redactedSummary });
        }
        const it = event.recurrenceIterator;
        let nextOccurrence: any;
        while (nextOccurrence = it.next()) {
          const nextOccurrenceStartDate = new Date(nextOccurrence);

          // Ignoring occurrences which are before the range and
          // stopping the loop once the end of the range has been reached
          if (nextOccurrenceStartDate < start) continue; 
          if (nextOccurrenceStartDate > end) break;

          const eventDuration = event.endDate.getTime() - event.startDate.getTime();
          const nextOccurrenceEndDate = new Date();
          nextOccurrenceEndDate.setTime(nextOccurrenceStartDate.getTime() + eventDuration);
          const nextOccurrenceEvent: CalDAVEvent = {
            ...event,
            uid: `${event.uid}-${nextOccurrenceStartDate.getTime()}`,
            startDate: nextOccurrenceStartDate,
            endDate: nextOccurrenceEndDate,
          };
          sourcesEvents.push({ event: nextOccurrenceEvent, redactedSummary: source.redactedSummary});
        }
        // We skip the push below since we only want to push
        // the instances within the selected period for CalDAV
        // recurrent events. The CalDAV API returns the initial 
        // event (which may be before the fetched period) if
        // some instances are within the fetched period.
        return;
      }
      sourcesEvents.push({ event: event, redactedSummary: source.redactedSummary });
    });
  }
  if (writeToFile) fs.writeFileSync('./data/sourcesEvents.json', JSON.stringify(sourcesEvents));

  if (config.target.kind === 'GCal') {
    const targetEvents = await gcal.listEvents(config.target, start, end);
    console.log('fetched %d events in target', targetEvents.length);
    if (writeToFile) fs.writeFileSync('./data/targetEvents.json', JSON.stringify(targetEvents));
    const instructions: sync.ToGCalInstructions = sync.ToGCal(sourcesEvents, targetEvents);

    log(`Sync: ${instructions.insert.length} inserts, ${instructions.update.length} updates, ${instructions.delete.length} deletions`);
    await gcal.insertEvents(config.target, instructions.insert);
    await gcal.updateEvents(config.target, instructions.update);
    await gcal.deleteEventsByIds(config.target, instructions.delete);
  }
  else throw new Error('NOT IMPLEMENTED YET');
}

async function cleanTarget() {
  const target = config.target as config.GCalDescriptor;
  let start: Date = new Date(2021, 0, 17);
  let end: Date = new Date(2021, 0, 19);
  await gcal.deleteEvents(target, start, end);
  start = new Date(2020, 10, 18);
  end = new Date(2020, 10, 20);
  await gcal.deleteEvents(target, start, end);
}

try {
  main();
  // cleanTarget();
} catch (err) {
  log('Error: ' + err);
}