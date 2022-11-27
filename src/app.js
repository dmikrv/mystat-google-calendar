import { toGoogleCalendarEvent, addPrefixToCalendarEvent } from "./utils.js";

const sync = async (mystat, googleCalendar, syncOptions) => {
  return new Promise(async (resolve, reject) => {
    if (!syncOptions.dateStart)
      return reject(new Error("Parameter 'dateStart' is required"));
    if (!syncOptions.dateEnd)
      return reject(new Error("Parameter 'dateEnd' is required"));
    if (!syncOptions.calendarName)
      syncOptions.calendarName = 'Mystat'

    const mystatEvents = await mystat.getSchedule(syncOptions.dateStart, syncOptions.dateEnd)
    let googleEvents = mystatEvents.map(toGoogleCalendarEvent);
    if (syncOptions.eventPrefix)
      addPrefixToCalendarEvent(googleEvents, syncOptions.eventPrefix)

    const calendar = await googleCalendar.addCalendar(syncOptions.calendarName);
    console.log(`Create new calendar with id: ${calendar.id}`);

    await googleCalendar.addEvents(calendar.id, ...googleEvents);
    resolve();
  })
};

export default {
  sync
};