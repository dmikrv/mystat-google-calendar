import MystatAPI from "mystat-api"
import fs from "fs/promises"
import path from 'path'
import process from "process"
import { authenticate } from "@google-cloud/local-auth"
import { google, calendar_v3 } from "googleapis"
import { RunBatch } from "gbatchrequests"
import { DateTime } from "luxon";

const userData = {
  username: "Krav_up8d",
  password: "itSTEP1992",
};
const mystatApi = new MystatAPI(userData);
if (typeof (await mystatApi.getAccessToken()) !== 'string') {
  throw new Error("Invalid сredentials for mystat")
}

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = res.data.items;
  if (!events || events.length === 0) {
    console.log('No upcoming events found.');
    return;
  }
  console.log('Upcoming 10 events:');
  events.map((event, i) => {
    const start = event.start.dateTime || event.start.date;
    console.log(`${start} - ${event.summary}`);
  });
}

async function createCalendar(auth) {
  const calendar = google.calendar({version: 'v3', auth})
  let calendarId = {}

  try {
    let res = await calendar.calendars.insert({
      requestBody: {
        summary: 'IT STEP',
        timeZone: 'Europe/Kyiv',
      }
    })
    calendarId = res.data.id
    console.log(`Create new calendar with id: ${calendarId}`)
  }
  catch(err) {
    throw err
  }

  await addMystatEvent(auth, calendarId)
}

async function addMystatEvent(auth, calendarId) {
  // const calendar = google.calendar({version: 'v3', auth})

  const dateStart = DateTime.local(2022, 1, 28)
  const dateEnd = DateTime.local(2022, 12, 15)
  if (dateStart > dateEnd)
    throw new Error("dateStart > dateEnd")
  if (!dateStart.isValid)
    throw new Error("dateStart invalid")
  if (!dateEnd.isValid)
    throw new Error ("dateEnd invalid")

  const months = getMonthArray(dateStart, dateEnd)

  let mystatSchedule = []
  for (let i = 0; i < months.length; i++) {
    const month = months[i];

    let response = {}
    response = await mystatApi.getMonthSchedule(month.toJSDate())
    if (!response.success) {
      let attempts = 3
      while (true) {
        console.log(`Unsuccessful attempt to get data from mystat api. Attempts left: ${attempts}`)
        --attempts
        await delay(1000)
        response = await mystatApi.getMonthSchedule(month.toJSDate())
        if (response.success)
          break
        if (attempts == 0)
          throw new Error("Mystat api is not responding")
      }
    }

    if (i == 0) {
      response.data = response.data.filter(value => DateTime.fromISO(value.date) >= dateStart)
    }
    if (i == months.length - 1) {
      response.data = response.data.filter(value => DateTime.fromISO(value.date) <= dateEnd)
    }
    mystatSchedule.push(...response.data)
  }

  const calendarEvents = mystatSchedule.map((mystatEvent) => {
    return {
      summary: mystatEvent.subject_name,
      location: mystatEvent.room_name,
      description: `Teacher: ${mystatEvent.teacher_name}`,
      start: {
        dateTime: new Date(Date.parse(`${mystatEvent.date}:${mystatEvent.started_at}`)).toISOString(),
        timeZone: 'Europe/Kyiv'
      },
      end: {
        dateTime: new Date(Date.parse(`${mystatEvent.date}:${mystatEvent.finished_at}`)).toISOString(),
        timeZone: 'Europe/Kyiv'
      }
    }
  })

  const obj = {
    accessToken: auth.credentials.access_token,
    api: { name: "calendar", version: "v3" },
    requests: calendarEvents.map((e) => ({
      method: "POST",
      endpoint: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      requestBody: e,
    })),
  };
  RunBatch(obj)
    .then((res) => console.log("Events uploaded to the google calendar"))
    .catch((err) => console.error(err));
}

function getMonthArray (startDate, endDate) {
  startDate = startDate.set({day: 1})
  endDate = endDate.set({day: 1})
  const months = []
  let currentDate = startDate

  while (currentDate <= endDate) {
      months.push(new DateTime(currentDate))
      currentDate = currentDate.plus({month: 1})
  }
  return months
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
} 

authorize().then(createCalendar).catch(console.error);
