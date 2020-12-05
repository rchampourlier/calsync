# calsync

Synchronizes CalDAV calendars to Google Calendars and vice-versa.

## Why would I do that?

- You need to have your events in a Google Calendar for sharing or integration purposes, in particular to share availability (busy/free) more than the details of events.
- Your main calendar is in some CalDAV service (maybe for environmental footprint or data-privacy concerns).

## What does it offer?

- Mirroring your calendars from/to CalDAV/Google Calendar.
- Filtering the events to be mirrored and obfuscating the details.

## How it works

It's doing a simple mirroring, not a synchronization. The mirroring is quite basic:

1. Delete all events on the target calendar.
2. Copy all event from the source(s) to the target.

This means you **MUST NOT** use your mirroring target for anything else than providing visibility on your events. Adding or modifying events in this calendar will only result in data loss.

### In more details

1. It fetches all upcoming events (all events with a start date greater than now) from the mirrored calendars.
1. It **deletes** all upcoming events (start date > now) in the Google Calendar.
1. It copies all upcoming events from the mirrored calendars to the target one.
1. It doesn't copy events that are marked "free". You may adjust the code if you want to copy them too.
1. It redacts the event summary using a string provided in the config, so personal information is not copied to the target calendars.
1. You may use a special character in your event's summary to prevent the redacting of the summary (cf. `FORCE_SHARING_SIGN` in the config).
1. Only the minimum information of the events is copied (summary, start and end date). Participants, description, location... are not copied, but you may adjust the code to do it if you want.

### Recurring events

- When fetching events, Google Calendar API returns an item for each occurrence of the recurring event. When copying it to CalDAV, we add an index at the end of the UID so the event is not overriden and we got a copy for each occurrence.

## How to use

**This repository is not intended to be usable as-is. It's intended to be cloned and modified to fit your needs, so will have to modify the `config.ts` file to add your own data (calendar information) and credentials, but you may have to change the `app.ts` file and other parts of the code to fit your needs. It's only intended to provide you with some parts of what you need for you own goals!**

1. For your CalDAV calendars:
  - You will have to find the Calendar URL. You may look at [these instructions](https://help.runbox.com/using-a-calendar-client-with-caldav/) from Runbox on how to connect Thunderbird Lightning to a CalDAV server, you'll have to do the same to find the calendar's URL (in short, navigate in your browser to [](caldav.<replace-with-your-hosting-domain.com>)).
  - You will have to add in the `config.ts` file your CalDAV account credentials. This will probably be your username and password.
1. For your Google Calendar calendars:
  - The code is made so you may only connect to one Google account for now, so if you need to access several calendars they must all be accessible from this account. You will have to share calendars from other account with the account you'll use with this project for it to work.
  - The authentication is more complex and you'll need to setup a Google Cloud Platform (GCP) project, download the API credentials and get an OAuth token for accessing your calendar. This is made easy by the code provided by Google and used in this repository but you'll still have to do some setup before. You should follow the steps from [this tutorial](https://developers.google.com/calendar/quickstart/nodejs).
1. Since the mirroring approach is **deleting all events** before making the copy, the mirror targets should not contain any other events than the ones copied from other calendards. So you should create dedicated calendars to serve as mirroring targets. Be sure to use their ID/URL in the config!

## How to automate running recurrently

You may copy `com.champourlier.calsync.plist` to your `$HOME/Library/LaunchAgents` and run `launchctl load $HOME/Library/LaunchAgents/com.champourlier.calsync.plist` to load it. Change to `unload` to unload it. Adjust the file as needed to run it how often you want.

More information on using `launchctl` in [this article](https://alvinalexander.com/mac-os-x/mac-osx-startup-crontab-launchd-jobs/).

## Contribution

Feel free to add issues if you have suggestions, remarks or want to contribute.

## Todos

- [ ] Support calendar discovery
- [ ] Optimize execution by running some things in parallel
- [ ] Reduce footprint by improving the mirroring strategy, avoiding numerous API calls to re-sync events that have already been synced before.

## Credits

- [Ulrich Tiofack](https://github.com/TheJLifeX) for the [simple-caldav-client](https://github.com/TheJLifeX/simple-caldav-client) source code.