import * as fs from 'fs';
import * as config from './config';
import * as caldav from './caldav/caldav';
import * as gcal from './gcal/gcal';
import * as sync from './sync';
import { log } from './log';
import { CalendarEvent } from './events';

const writeToFile = false;

async function main() {
  const sourcesEvents: { event: CalendarEvent, redactedSummary: string | undefined }[] = [];
  for (const source of config.sources) {
    const fetchedEvents = source.kind === 'CalDav' ?
      await caldav.ListEventsUpcomingYear(source) :
      await gcal.ListEventsUpcomingYear(source);
    fetchedEvents.forEach((event: CalendarEvent) => {
      sourcesEvents.push({ event: event, redactedSummary: source.redactedSummary });
    });
  }
  if (writeToFile) fs.writeFileSync('./data/sourcesEvents.json', JSON.stringify(sourcesEvents));

  if (config.target.kind === 'GCal') {
    const targetEvents = await gcal.ListEventsUpcomingYear(config.target);
    if (writeToFile) fs.writeFileSync('./data/targetEvents.json', JSON.stringify(targetEvents));
    const instructions: sync.ToGCalInstructions = sync.ToGCal(sourcesEvents, targetEvents);

    await gcal.InsertEvents(config.target, instructions.insert);
    await gcal.UpdateEvents(config.target, instructions.update);
    await gcal.DeleteEvents(config.target, instructions.delete);
  }
  else throw new Error('NOT IMPLEMENTED YET');
}

async function cleanTarget() {
  const target = config.target as config.GCalDescriptor;
  await gcal.DeleteUpcomingEvents(target);
}

try {
  main();
  // cleanTarget();
} catch (err) {
  log('Error: ' + err);
}