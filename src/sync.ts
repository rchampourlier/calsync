import { CalendarEvent, CalendarEventData, compareEventsData, eventDataToGCalEvent, extractEventData, extractGCalEventData, GCalEvent, isCalDAVEvent, isGCalEvent } from './events';

 export type ToGCalInstructions = {
  insert: CalendarEventData[],
  update: { eventId: string, eventData: CalendarEventData }[],
  delete: string[]
};

/**
 * Returns instructions to perform a synchronisation between
 * sources' events and target's ones. 
 * 
 * Algorithm:
 *   - Make a map of both sourcesEvents and targetEvents on UID key
 *   - Returns a `SyncInstructions` object where the events in 
 *     insert/update/delete array properties are objects in `sourcesEvents`.
 * 
 * @param sourcesEvents
 * @param targetEvents 
 */
export function ToGCal(sourcesEvents: CalendarEvent[], targetEvents: GCalEvent[]): ToGCalInstructions {
  const eventsInsert: CalendarEventData[] = [];
  const eventsUpdate: { eventId: string, eventData: CalendarEventData }[] = [];
  const eventsDelete: string[] = [];

  if (sourcesEvents.length === 0) return {
    insert: [],
    update: [],
    delete: targetEvents.map((e) => e.id)
  }

  if (targetEvents.length === 0) return {
    insert: sourcesEvents.map((e) => {
      const srcId = (() => {
        if (isGCalEvent(e)) return e.id;
        if (isCalDAVEvent(e)) return e.uid;
      })();
      const newEvtData: CalendarEventData = extractEventData(e);
      newEvtData.description = `Original ID: ${srcId}`;
      return newEvtData;
    }),
    update: [],
    delete: []
  }

  const markedTargetEventIds: string[] = []; // ids of target events matched with sources events (missing are deleted)

  for (const srcEvt of sourcesEvents) {
    const srcEvtData = extractEventData(srcEvt);
    const matchingId = (() => {
      if (isGCalEvent(srcEvt)) return srcEvt.id;
      if (isCalDAVEvent(srcEvt)) return srcEvt.uid;
    })();

    // Search matching event in targetEvents
    const matchingTargetEvt = (() => {
      for (const targetEvt of targetEvents) {
        if (targetEvt.description.includes(matchingId)) return targetEvt;
      }
      return undefined;
    })();

    srcEvtData.description = `Original ID: ${matchingId}`;
    if (!matchingTargetEvt) {
      // No match -> insert
      eventsInsert.push(srcEvtData);
    }
    else {
      // Match
      markedTargetEventIds.push(matchingTargetEvt.id);
      if (!compareEventsData(extractGCalEventData(matchingTargetEvt), srcEvtData)) {
        // Not matching -> update
        eventsUpdate.push({ eventId: matchingTargetEvt.id, eventData: srcEvtData });
      }
    }
  }

  for (const targetEvt of targetEvents) {
    if (!markedTargetEventIds.includes(targetEvt.id)) eventsDelete.push(targetEvt.id);
  }

  return {
    insert: eventsInsert,
    update: eventsUpdate,
    delete: eventsDelete,
  }
}