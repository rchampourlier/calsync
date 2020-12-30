import { CalDAVEvent, CalendarEvent, checkMappedEquality, GCalEvent, isCalDAVEvent, isGCalEvent, mapEventToMatchingCal, matchingCopy } from './events';

export type SyncInstructions = {
  insert: CalendarEvent[],
  update: CalendarEvent[],
  delete: CalendarEvent[]
};

/**
 * Returns instructions to perform a synchronisation between
 * sources' events and target's ones. 
 * 
 * Should be agnostic of the target's calendar type.
 * 
 * Algorithm:
 *   - Make a map of both sourcesEvents and targetEvents on UID key
 *   - Returns a `SyncInstructions` object where the events in 
 *     insert/update/delete array properties are objects in `sourcesEvents`.
 * 
 * @param sourcesEvents
 * @param targetEvents 
 */
export function GetInstructions(sourcesEvents: CalendarEvent[], targetEvents: CalendarEvent[]): SyncInstructions {
  const [eventsInsert, eventsUpdate, eventsDelete] = [[], [], []];

  if (sourcesEvents.length === 0) return {
    insert: [],
    update: [],
    delete: targetEvents
  }

  if (targetEvents.length === 0) return {
    insert: sourcesEvents,
    update: [],
    delete: []
  }

  let targetEventsMap: { [key: string]: CalendarEvent } = {};
  for (const evt of targetEvents) {
    if (isGCalEvent(evt)) {
      targetEventsMap[evt.iCalUID] = evt;
    } else if (isCalDAVEvent(evt)) {
      targetEventsMap[evt.uid] = evt;
    }
  }

  const markedTargetEvents: CalendarEvent[] = [];
  for (const srcEvt of sourcesEvents) {
    const srcEvtUID = (() => {
      if (isGCalEvent(srcEvt)) return srcEvt.iCalUID;
      if (isCalDAVEvent(srcEvt)) return srcEvt.uid;
    })();
    const matchingTargetEvent = targetEventsMap[srcEvtUID];
    if (matchingTargetEvent) {
      if (!checkMappedEquality(srcEvt, matchingTargetEvent)) {
        const updatedTargetEvent = mapEventToMatchingCal(srcEvt, matchingTargetEvent);
        if (isGCalEvent(matchingTargetEvent)) (updatedTargetEvent as GCalEvent).id = matchingTargetEvent.id;
        if (isCalDAVEvent(matchingTargetEvent)) (updatedTargetEvent as CalDAVEvent).uid = matchingTargetEvent.uid;
        eventsUpdate.push(updatedTargetEvent);
      }
      markedTargetEvents.push(matchingTargetEvent);
    }
    else {
      eventsInsert.push(srcEvt);
    }
  }

  // Deleting all non marked events
  for (const targetEvt of targetEvents) {
    // Check if targetEvt is in markedTargetEvents, if no, add it to the delete list
    if (!markedTargetEvents.find((evt) => matchingCopy(targetEvt, evt))) {
      eventsDelete.push(targetEvt);
    }
  }

  return {
    insert: eventsInsert,
    update: eventsUpdate,
    delete: eventsDelete,
  }
}