const BabyConnect = require('./baby-connect');

const username = process.env.BABYCONNECTUSER;
const password = process.env.BABYCONNECTPWD;

var bc = new BabyConnect(username,password);
bc.login().then(result => {
  if(!result) throw 'Login error';
  return bc.getUserInfo();
}).then(result => {
  console.log(result);
  return bc.lookupKid('George');
}).then(kid => {
  console.log(kid);
  return bc.getStatus({kid});
}).then(result => {
  console.log(result);
  return bc.getSleepStatus({kid:result.summary.kidId});
}).then(result => {
  console.log(result);
}).catch(error => {
  console.error(error);
});