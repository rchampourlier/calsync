import fs from "fs";
import readline from "readline";
import { google, calendar_v3 } from "googleapis";
import { GCalDescriptor, LOG_DETAIL } from "../config";
import { CalendarEventData } from "../events";
import { log, logWithGCalEvent } from "../log";

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly', 
  'https://www.googleapis.com/auth/calendar.events'
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const THROTTLING_DELAY = 200; // ms, Google API limit is 10 requests per second
function throttlingDelay() {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, THROTTLING_DELAY);
  });
};

export const listEvents = (gcal: GCalDescriptor, start: Date, end: Date): Promise<calendar_v3.Schema$Event[]> => {
  return new Promise((resolve, reject) => {
    fs.readFile('credentials.json', (err, content) => {
      if (err) return log(`Error loading client secret file: ${err}`);
      authorize(JSON.parse(content.toString()), (oauth) => { 
        _listEvents(oauth, gcal.id, start, end)
        .then(resolve)
        .catch(reject);
      });
    });
  });
};

export const deleteEvents = (gcal: GCalDescriptor, start: Date, end: Date) => {
  return new Promise((resolve, reject) => {
    fs.readFile('credentials.json', (err, content) => {
      if (err) return log(`Error loading client secret file: ${err}`);
      authorize(JSON.parse(content.toString()), (oauth) => { 
        _deleteEvents(oauth, gcal.id, start, end)
        .then(resolve).catch(reject);
      });
    });
  });
};

export const deleteEventsByIds = (gcal: GCalDescriptor, eventIds: string[]) => {
  return new Promise((resolve, reject) => {
    fs.readFile('credentials.json', (err, content) => {
      if (err) return log(`Error loading client secret file: ${err}`);
      authorize(JSON.parse(content.toString()), (oauth) => { 
        _deleteEventsByIds(oauth, gcal.id, eventIds)
        .then(resolve).catch(reject);
      });
    });
  });
};

export const insertEvents = (gcal: GCalDescriptor, events: Array<calendar_v3.Schema$Event>) => {
  return new Promise((resolve, reject) => {
    fs.readFile('credentials.json', (err, content) => {
      if (err) return log(`Error loading client secret file: ${err}`);
      authorize(JSON.parse(content.toString()), (oauth) => { 
        _insertEvents(oauth, gcal.id, events)
        .then(resolve).catch(reject);
      });
    });
  });
};

export const updateEvents = (gcal: GCalDescriptor, updates: { eventId: string, eventData: CalendarEventData }[]) => {
  return new Promise((resolve, reject) => {
    fs.readFile('credentials.json', (err, content) => {
      if (err) return log(`Error loading client secret file: ${err}`);
      authorize(JSON.parse(content.toString()), (oauth) => { 
        _updateEvents(oauth, gcal.id, updates)
        .then(resolve).catch(reject);
      });
    });
  });
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token.toString()));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  log(`Authorize this app by visiting this url: ${authUrl}`);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        log(`Token stored to ${TOKEN_PATH}`);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Inserts the passed events in the specified calendar. Returns a `Promise`.
 * 
 * @param auth Inser
 * @param calendarId 
 * @param events 
 * @param resolve 
 * @param reject 
 */
function _insertEvents(auth: any, calendarId: string, events: Array<calendar_v3.Schema$Event>) {
  return new Promise<void>(async (resolve, reject) => {
    const calendar = google.calendar({version: 'v3', auth});

    for (const evt of events) {
      try {
        await throttlingDelay(); // throttling is done before the call, otherwise calls failing in sequence would break the rate limit
        await calendar.events.insert({
          calendarId: calendarId,
          requestBody: evt
        });
        if (LOG_DETAIL) logWithGCalEvent(`Inserted`, evt);
      }
      catch (err) {
        logWithGCalEvent(`${err}, inserting event`, evt);
      }
    }
    resolve();
  });
};

function _updateEvents(auth: any, calendarId: string, updates: { eventId: string, eventData: CalendarEventData }[]) {
  return new Promise<void>(async (resolve, reject) => {
    const calendar = google.calendar({version: 'v3', auth});

    for (const update of updates) {
      try {
        await throttlingDelay(); // throttling is done before the call, otherwise calls failing in sequence would break the rate limit
        await calendar.events.update({
          calendarId: calendarId,
          eventId: update.eventId,
          requestBody: update.eventData
        });
        if (LOG_DETAIL) logWithGCalEvent(`Updated #${update.eventId}`, update.eventData);
      }
      catch (err) {
        logWithGCalEvent(`Error updating event #${update.eventId}`, update.eventData);
      }
    }
    resolve();
  });
};


/**
 * Deletes all upcoming events on the specified calendar. Returns a `Promise`.
 * 
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @returns Promise<unknown>
 */
function _deleteEvents(auth, calendarId: string, start: Date, end: Date) {
  return new Promise<void>((resolve, reject) => {
    const calendar = google.calendar({version: 'v3', auth});

    _listEvents(auth, calendarId, start, end)
    .then(async (events) => {
      if (events.length === 0) {
        resolve();
        return;
      }
      for (const evt of events) {
        try {
          await calendar.events.delete({
            calendarId: calendarId,
            eventId: evt.id
          });
          if (LOG_DETAIL) logWithGCalEvent('Deleted', evt);
          await throttlingDelay();
        }
        catch (err) {
          reject(`Error deleting event "${evt.summary}" (${evt.start.date ? evt.start.date : evt.start.dateTime})": ${err}\n${evt}`);
        }
      }
      resolve();
    })
    .catch((err) => {
      reject(`Error fetching upcoming events: ${err}`);
    });
  });
}

function _deleteEventsByIds(auth, calendarId: string, eventIds: string[]) {
  return new Promise<void>(async (resolve, reject) => {
    const calendar = google.calendar({version: 'v3', auth});

    for (const evtId of eventIds) {
      try {
        await calendar.events.delete({
          calendarId: calendarId,
          eventId: evtId
        });
        if (LOG_DETAIL) log(`Deleted event #${evtId}`);
        await throttlingDelay();
      }
      catch (err) {
        reject(`Error deleting event #${evtId}`);
      }
    }
    resolve();
  });
}

/**
 * List upcoming events in the specified calendar. Returns a `Promise`.
 */
function _listEvents(
  auth: any,
  calendarId: string,
  start: Date,
  end: Date,
  allEvents?: calendar_v3.Schema$Event[],
  nextPageToken?: string
): Promise<calendar_v3.Schema$Event[]>  {
  const calendar = google.calendar({version: 'v3', auth});
  if (!allEvents) allEvents = [];

  return new Promise(async (resolve, reject) => {
    try {
      const res = await calendar.events.list({
        calendarId: calendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        pageToken: nextPageToken,
      });
      res.data.items.forEach((i) => allEvents.push(i));
      if (res.data.nextPageToken) {
        resolve(
          _listEvents(auth, calendarId, start, end, allEvents, res.data.nextPageToken)
        );
      }
      else {
        resolve(allEvents);
      }
    }
    catch (error) {
      reject(`Failed to list gcal events. Error: ${error}`);
    }
  });
}
