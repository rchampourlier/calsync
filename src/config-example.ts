export type CalDavDescriptor = {
  label: string,
  url: string,
  username: string,
  password: string,
  redactedSummary?: string
};

export type GCalDescriptor = {
  label: string,
  id: string,
  redactedSummary?: string
};

// A string that will be searched in event summaries to prevent
// the redacting of the summary when copying the event.
export const FORCE_SHARING_SIGN = "👀";

// A Google Calendar that will receive the events from mirrored calendars.
export const GCAL_MIRROR_TARGET: GCalDescriptor = {
  label: 'mirror-target', // just a label for logs
  id: 'YOUR-CALENDAR-KEY@group.calendar.google.com' // search for the calendar ID in the calendar's settings in Google Calendar
};

// Google Calendars that will be mirrored.
export const GCAL_MIRRORED_CALS: {[key: string]: GCalDescriptor } = {
  personal: {
    label: 'PERSONAL', // just a label for logs
    id: 'YOUR-PERSONAL-MIRRORED-CALENDAR-ID',
    redactedSummary: 'Personal', // a text that will replace the event's summary when it's copied for privacy
  },
  other: {
    label: 'OTHER',
    id: 'YOUR-OTHER-MIRRORED-CALENDAR-ID',
    redactedSummary: 'Other'
  }
};

// CalDAV calendars that will be mirrored
export const CALDAV_MIRRORED_CALS: {[key: string]: CalDavDescriptor} = {
  personal: {
    label: 'PERSONAL', // just a label for logs
    url: 'https://dav.YOUR-DOMAIN/calendars/CALENDAR-ID/CALENDAR-NAME/', // the calendar's URL, look at the readme for how to find it
    username: 'YOUR-USERNAME',
    password: 'YOUR-PASSWWORD',
    redactedSummary: 'Personal'
  },
  other: {
    label: 'other',
    url: 'https://dav.YOUR-DOMAIN/calendars/CALENDAR-ID/CALENDAR-NAME/',
    username: 'YOUR-USERNAME',
    password: 'YOUR-PASSWWORD',
    redactedSummary: 'Work'
  }
};