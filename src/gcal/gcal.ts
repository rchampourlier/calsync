import fs from "fs";
import readline from "readline";
import { calendar_v3, google, Auth } from "googleapis";
import { CalendarDescriptor, GCalDescriptor, LOG_DETAIL } from "../config";
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
const TOKENS_FILE_PATH = 'tokens.json';

const THROTTLING_DELAY = 200; // ms, Google API limit is 10 requests per second
function throttlingDelay() {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, THROTTLING_DELAY);
  });
};

export async function listEvents(gcal: GCalDescriptor, start: Date, end: Date): Promise<calendar_v3.Schema$Event[]> {
  const auth = await getAuthenticatedClient(gcal.id)
  return await _listEvents(auth, gcal.id, start, end)
};

export async function deleteEvents(gcal: GCalDescriptor, start: Date, end: Date) {
  const auth = await getAuthenticatedClient(gcal.id)
  await _deleteEvents(auth, gcal.id, start, end)
};

export async function deleteEventsByIds(gcal: GCalDescriptor, eventIds: string[]) {
  const auth = await getAuthenticatedClient(gcal.id)
  await _deleteEventsByIds(auth, gcal.id, eventIds)
};

export async function insertEvents(gcal: GCalDescriptor, events: Array<calendar_v3.Schema$Event>) {
  const auth = await getAuthenticatedClient(gcal.id)
  await _insertEvents(auth, gcal.id, events)
};

export async function updateEvents(gcal: GCalDescriptor, updates: { eventId: string, eventData: CalendarEventData }[]) {
  const auth = await getAuthenticatedClient(gcal.id)
  await _updateEvents(auth, gcal.id, updates)
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 */
async function getAuthenticatedClient(gcalAccountId: GCalDescriptor['id']): Promise<Auth.OAuth2Client> {
  const credentials = getCredentialsData()
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  const tokens = loadTokens()
  const matchingToken = tokens[gcalAccountId];
  if (!matchingToken) {
    return await getAccessToken(gcalAccountId, oAuth2Client);
  } else {
    oAuth2Client.setCredentials(matchingToken);
    return oAuth2Client
  }
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
async function getAccessToken(gcalAccountId: GCalDescriptor['id'], oAuth2Client: Auth.OAuth2Client): Promise<Auth.OAuth2Client> {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  log(`Authorize this app to access ${gcalAccountId} Google Calendar by visiting this url: ${authUrl}`);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const authCode: string = await new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      resolve(code);
    })
  })
  return new Promise((resolve, reject) => {
    oAuth2Client.getToken(authCode, (err, token) => {
      if (err) {
        reject(`Error retrieving access token: ${err}`);
      }
      oAuth2Client.setCredentials(token);
      storeToken(gcalAccountId, token)
      resolve(oAuth2Client);
    });
  })
}

/**
 * Inserts the passed events in the specified calendar. 
 */
async function _insertEvents(auth: Auth.OAuth2Client, calendarId: string, events: Array<calendar_v3.Schema$Event>) {
  const calendar = google.calendar({ version: 'v3', auth });

  for (const evt of events) {
    await throttlingDelay(); // throttling is done before the call, otherwise calls failing in sequence would break the rate limit
    await calendar.events.insert({
      calendarId,
      requestBody: evt
    });
    if (LOG_DETAIL) {
      logWithGCalEvent(`Inserted`, evt);
    }
  }
};

function _updateEvents(auth: Auth.OAuth2Client, calendarId: string, updates: { eventId: string, eventData: CalendarEventData }[]) {
  return new Promise<void>(async (resolve, reject) => {
    const calendar = google.calendar({ version: 'v3', auth });

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
    const calendar = google.calendar({ version: 'v3', auth });

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
    const calendar = google.calendar({ version: 'v3', auth });

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
  auth: Auth.OAuth2Client,
  calendarId: string,
  start: Date,
  end: Date,
  allEvents?: calendar_v3.Schema$Event[],
  nextPageToken?: string
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = google.calendar({ version: 'v3', auth });
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

/**
 * Returns the data from the credentials.json file.
 */
function getCredentialsData(): any {
  const credentialsData = JSON.parse(fs.readFileSync('credentials.json').toString());
  return credentialsData
}

function loadTokens(): Record<string, Auth.Credentials> {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE_PATH).toString());
  }
  catch (error) {
    return {}
  }
}

function storeToken(gcalAccountId: GCalDescriptor['id'], token: Auth.Credentials) {
  const tokens = loadTokens();
  tokens[gcalAccountId] = token;
  fs.writeFileSync(TOKENS_FILE_PATH, JSON.stringify(tokens))
  log(`Token stored to ${TOKENS_FILE_PATH}`);
}