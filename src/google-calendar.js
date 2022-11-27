import fs from "fs/promises";
import path, { resolve } from 'path';
import process from "process";
import { authenticate } from "@google-cloud/local-auth";
import { google, calendar_v3 } from "googleapis";
import { RunBatch } from "gbatchrequests";
import * as dotenv from 'dotenv';

dotenv.config();

export default class GoogleCalendar {
  constructor() {
    this.auth = '';
  }

  async authorize() {
    return new Promise(async (resolve, reject) => {
      try {
        this.auth = await authorize();
        resolve();
      }
      catch(err) {
        reject(new Error(`Google Calendar: ${err}`));
      }
    })
  }

  async addCalendar(name, timeZone = 'Europe/Kyiv') {
    return new Promise(async (resolve, reject) => {
      const calendar = google.calendar({version: 'v3', auth: this.auth});

      try {
        let res = await calendar.calendars.insert({
          requestBody: {
            summary: name,
            timeZone,
          }
        })
        resolve({id: res.data.id});
      }
      catch(err) {
        reject(new Error(`Google Calendar: ${err}`));
      }
    })
  }

  async addEvents(calendarId, ...calendarEvents) {
    return new Promise(async (resolve, reject) => {
      const obj = {
        accessToken: this.auth.credentials.access_token,
        api: { name: "calendar", version: "v3" },
        requests: calendarEvents.map((e) => ({
          method: "POST",
          endpoint: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          requestBody: e,
        })),
      };

      try {
        const res = await RunBatch(obj);
        resolve(res);
      }
      catch(err) {
        reject(new Error(`Google Calendar: ${err}`));
      }
    })
  }
}

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

const TOKEN_PATH = path.join(process.cwd(), process.env.GOOGLE_TOKEN_PATH);
const CREDENTIALS_PATH = path.join(process.cwd(), process.env.GOOGLE_CREDENTIALS_PATH);

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