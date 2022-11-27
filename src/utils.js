import { DateTime } from "luxon";

export const delay = (time) => {
  return new Promise(resolve => setTimeout(resolve, time));
};

export const getMonthsFromTimeSpan = (startDate, endDate) => {
  startDate = startDate.set({day: 1});
  endDate = endDate.set({day: 1});
  const months = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    months.push(new DateTime(currentDate));
    currentDate = currentDate.plus({month: 1});
  }
  return months;
};

export const toGoogleCalendarEvent = (event) => {
  return {
    summary: event.subject_name,
    location: event.room_name,
    description: `Teacher: ${event.teacher_name}`,
    start: {
      dateTime: DateTime.fromISO(`${event.date}T${event.started_at}`).toISO(),
      timeZone: 'Europe/Kyiv'
    },
    end: {
      dateTime: DateTime.fromISO(`${event.date}T${event.finished_at}`).toISO(),
      timeZone: 'Europe/Kyiv'
    }
  };
};

export const addPrefixToCalendarEvent = (events, prefix) => events.forEach(element => {
  element.summary = prefix + element.summary;
});

