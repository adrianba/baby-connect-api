const BabyConnect = require('./baby-connect');

const username = process.env.BABYCONNECTUSER;
const password = process.env.BABYCONNECTPWD;

var bc = new BabyConnect(username,password);
var kid;
bc.login().then(result => {
  if(!result) throw 'Login error';
  return bc.getUserInfo();
}).then(result => {
  console.log(result);
  return bc.lookupKid('George');
}).then(k => {
  kid = k;
  console.log(kid);
  return bc.getStatus({kid});
}).then(result => {
  console.log(result);
  return bc.getSleepStatus({kid});
}).then(result => {
  console.log(result);
  return bc.getBottleStatus({kid});
}).then(result => {
  console.log(result);
  return bc.getNursingStatus({kid});
}).then(result => {
  console.log(result);
  return bc.getPumpingStatus({kid});
}).then(result => {
  console.log(result);
  return bc.getDiaperStatus({kid});
}).then(result => {
  console.log(result);
  return bc.getChildList();
}).then(result => {
  console.log(result);
}).catch(error => {
  console.error(error);
});