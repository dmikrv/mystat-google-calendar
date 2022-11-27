import MystatApi from "mystat-api"
import { DateTime } from "luxon";

import { getMonthsFromTimeSpan, delay } from "./utils.js"

export default class Mystat {
  constructor() {
    this.api = {}
  }

  async authorize(credentials) {
    return new Promise(async (resolve, reject) => {
      this.api = new MystatApi({
        username: credentials.login,
        password: credentials.password
      });
      const token = await this.api.getAccessToken();
      if (typeof token === 'string')
        resolve();
      else
        reject(new Error('Invalid сredentials for mystat'));
    })
  }

  async getProfileFullname() {
    return new Promise(async (resolve, reject) => {
      const profileInfo = await this.api.getProfileInfo();
      
      if (profileInfo.success) {
        resolve(profileInfo.data.full_name)
      }
      else {
        reject(new Error(`Mystat API: ${profileInfo.error}`))
      }
    })
  }

  async getProfileGroup() {
    return new Promise(async (resolve, reject) => {
      const profileInfo = await this.api.getProfileInfo();
      if (profileInfo.success) {
        resolve(profileInfo.data.group_name)
      }
      else {
        reject(new Error(`Mystat API: ${profileInfo.error}`))
      }
    })
  }
  
  async getProfilePhotoUrl() {
    return new Promise(async (resolve, reject) => {
      const profileInfo = await this.api.getProfileInfo();
      if (profileInfo.success) {
        resolve(profileInfo.data.photo)
      }
      else {
        reject(new Error(`Mystat API: ${profileInfo.error}`))
      }
    })
  }

  async getSchedule(dateStart, dateEnd) {
    return new Promise(async (resolve, reject) => {
      if (!dateStart.isValid)
        return reject(new Error('Date start is invalid'));
      if (!dateEnd.isValid)
        return reject(new Error('Date end is invalid'));
      if (dateStart > dateEnd)
        return reject(new Error('Date start should be earlier then date end'));

      const months = getMonthsFromTimeSpan(dateStart, dateEnd);

      let mystatSchedule = [];
      for (let i = 0; i < months.length; i++) {
        const month = months[i];
    
        let response = {};
        response = await this.api.getMonthSchedule(month.toJSDate());
        if (!response.success) {
          let attempts = 3
          while (true) {
            console.log(`Unsuccessful attempt to get data from mystat api. Attempts left: ${attempts}`)
            --attempts
            await delay(1000)
            response = await this.api.getMonthSchedule(month.toJSDate())
            if (response.success)
              break
            if (attempts == 0)
              return reject(new Error('Mystat api is not responding'));
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
      resolve(mystatSchedule)
    })
  }
}

