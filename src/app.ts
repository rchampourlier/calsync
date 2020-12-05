import * as config from "./config";
import * as copy from "./copy";
import * as gc from "./gcal/gcal";
import { log } from "./log";

// TODO: run all copies in parallel
async function main() {
  // Delete upcoming events from mirror targets.
  // TODO: run in parallel
  await gc.DeleteUpcomingEvents(config.GCAL_MIRROR_TARGET);
  log(`[GCal:${config.GCAL_MIRROR_TARGET.label}] Deleted target upcoming events`);

  // CalDAV -> GCal
  // This copy makes private events (in several CalDAVs) visible
  // through a shareable Google calendar.
  for (const calId in config.CALDAV_MIRRORED_CALS) {
    copy.CalDavToGCal(config.CALDAV_MIRRORED_CALS[calId], config.GCAL_MIRROR_TARGET);
  }

  // GCal -> GCal
  // This one is necessary for the events scheduled on the public
  // calendar to be visible on the mirror which serves to determine
  // availability.
  for (const calId in config.GCAL_MIRRORED_CALS) {
    copy.GCalToGCal(config.GCAL_MIRRORED_CALS[calId], config.GCAL_MIRROR_TARGET);
  }
}

try {
  main();
} catch (err) {
  log('Error: ' + err);
}