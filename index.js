import MystatAPI from "mystat-api";

const userData = {
  username: "Krav_up8d",
  password: "itSTEP1992",
};
const api = new MystatAPI(userData);

api.getMonthSchedule().then((result) => {
  if (result.success) {
    console.log(result.data);
  } else {
    console.log(result.error);
  }
});