import * as fs from 'fs';
import * as config from './config';
import * as caldav from './caldav/caldav';
import * as gcal from './gcal/gcal';
import * as sync from './sync';
import { log, logWithEvent } from './log';
import { calendar_v3 } from 'googleapis';
import { CalendarEvent as CalDavEvent } from './caldav/calendar-event';
import { mapEventToGCal } from './events';

type CalEvent = calendar_v3.Schema$Event | CalDavEvent;

const writeToFile = true;

/**
 * Algorithm:
 * 
 *  1. Fetch all events from all sources events
 *  2. Fetch events from the target
 * [3. Write fetched events to ./data/xyzEvents.json]
 *  4. For each event from sources, look for a matching
 *       event in target (using UID)
 */
async function main() {
  const sourcesEvents = [];
  for (const source of config.sources) {
    const fetchedEvents = source.kind === 'CalDav' ?
      await caldav.ListUpcomingEvents(source) :
      await gcal.ListUpcomingEvents(source);
    fetchedEvents.forEach((event: CalEvent) => {
      sourcesEvents.push(event);
    });
  }
  if (writeToFile) fs.writeFileSync('./data/sourcesEvents.json', JSON.stringify(sourcesEvents));

  const targetEvents = config.target.kind === 'CalDav' ? 
    await caldav.ListUpcomingEvents(config.target) :
    await gcal.ListUpcomingEvents(config.target);
  if (writeToFile) fs.writeFileSync('./data/targetEvents.json', JSON.stringify(targetEvents));

  const syncInstructions: sync.SyncInstructions = sync.GetInstructions(sourcesEvents, targetEvents);

  for (const e of syncInstructions.insert) {
    logWithEvent('INSERT', e);
  }
  for (const e of syncInstructions.update) {
    logWithEvent('UPDATE', e);
  }
  for (const e of syncInstructions.delete) {
    logWithEvent('DELETE', e);
  }

  if (config.isGCalDescriptor(config.target)) {
    await gcal.InsertEvents(config.target, syncInstructions.insert.map(mapEventToGCal));
    await gcal.UpdateEvents(config.target, syncInstructions.update.map(mapEventToGCal));
    await gcal.DeleteEvents(config.target, syncInstructions.delete.map(mapEventToGCal));
  }
}

async function cleanTarget() {
  const target = config.target as config.GCalDescriptor;
  await gcal.DeleteUpcomingEvents(target);
}

try {
  main();
  cleanTarget();
} catch (err) {
  log('Error: ' + err);
}