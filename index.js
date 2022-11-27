import { DateTime } from "luxon";

import App from "./src/app.js";
import Mystat from './src/mystat.js';
import GoogleCalendar from "./src/google-calendar.js";

const mystatCredentials = {
  login: 'your_login',
  password: 'your_pass',
};

const syncOptions = {
  dateStart: DateTime.local(2023, 01, 01),
  dateEnd: DateTime.local(2023, 12, 31),
  calendarName: 'Mystat',
  eventPrefix: 'Mystat | '
}

try {
  const mystat = new Mystat();
  await mystat.authorize(mystatCredentials)
  console.log('Successful login in mystat');
  console.log(`${await mystat.getProfileFullname()} (${await mystat.getProfileGroup()})`);

  const googleCalendar = new GoogleCalendar();
  await googleCalendar.authorize();
  console.log('Successful authorize google account');

  await App.sync(mystat, googleCalendar, syncOptions)
  console.log("Events uploaded to the google calendar");
} catch(err) {
  console.log(err)
}