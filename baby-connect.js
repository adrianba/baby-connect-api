const request = require('request');
const cookie = require('cookie');
const tc = require('timezonecomplete');
const NodeCache = require('node-cache');

function Connect(username,password,timezone) {
    if(!(this instanceof Connect)) {
        return new Connect(username,password,timezone);
    }

    this.username = username;
    this.password = password;
    let tz = timezone && tc.TzDatabase.instance().exists(timezone) ? timezone : "US/Pacific";
    this.timezone = tc.zone(tz);
    this.nextCookie = "";
    this._cache = new NodeCache({checkPeriod:0,useClones:false});
};

Connect.prototype.login = function() {
    return new Promise((resolve,reject) => {
        doPost('https://www.baby-connect.com/Cmd?cmd=UserAuth',this.nextCookie,{
            email:this.username,
            pass:this.password
        },(error,result) => {
            if(error) {
                reject(error);
            } else {
                if(result.statusCode===200) {
                    console.log("Invalid login");
                    resolve(false);
                } else if(result.statusCode===302 /*&& result.location=='https://www.baby-connect.com/home'*/) {
                    if(result.nextCookie) {
                        this.nextCookie = result.nextCookie;
                    }
                    resolve(true);
                }
            }
        });
    });
}

Connect.prototype.getUserInfo = function() {
  let info = this._cache.get('userinfo');
  if(info) {
    return Promise.resolve(info);
  }
  let formData = {
  };
  return new Promise((resolve,reject) => {
    doPost('https://www.baby-connect.com/CmdW?cmd=UserInfoW',this.nextCookie,formData,(error,result) => {
      if(error) {
        reject(error);
      } else {
        if(result.statusCode===200) {
          if(result.nextCookie) {
            this.nextCookie = result.nextCookie;
          }
          info = JSON.parse(result.body);
          this._cache.set('userinfo',info,60);
          resolve(info);
        }
      }
    });
  });
}

Connect.prototype.lookupKid = function(childName) {
  if(!childName) return Promise.resolve(undefined);
  return new Promise((resolve,reject) => {
    this.getUserInfo().then(info => {
      childName = childName.toLowerCase();
      let kid = info.myKids.find(k => k.Name.toLowerCase()==childName);
      // if there is only one kid assume that one was meant
      if(!kid && info.myKids.length===1) { kid = info.myKids[0]; }
      resolve(kid ? kid.Id : undefined);
    }).catch(ex => {
      reject(ex);
    });
  });
}

Connect.prototype.getChildList = function() {
  return new Promise((resolve,reject) => {
    this.getUserInfo().then(info => {
      resolve(info.myKids.map(child => ({id:child.Id,name:child.Name})));
    }).catch(ex => {
      reject(ex);
    });
  });
}

Connect.prototype.getStatus = function(p) {
    let formData = {
            fmt:'long',
            '_ts_':Date.now()
    };
    if(!p.day) {
      p.day = getToday(this.timezone);
    }
    formData.pdt = p.day;
    let cacheId = "status-" + formData.pdt;
    if(p.kid) {
        formData.Kid = p.kid;
        cacheId += "-" + p.kid;
    }

    let status = this._cache.get(cacheId);
    if(status) {
      return Promise.resolve(status);
    }

    return new Promise((resolve,reject) => {
        doPost('https://www.baby-connect.com/CmdListW?cmd=StatusList',this.nextCookie,formData,(error,result) => {
            if(error) {
                reject(error);
            } else {
                if(result.statusCode===200) {
                    if(result.nextCookie) {
                        this.nextCookie = result.nextCookie;
                    }
                    status = JSON.parse(result.body);
                    this._cache.set(cacheId,status,10);
                    resolve(status);
                }
            }
        });
    });
}

Connect.prototype.getSleepStatus = function(p) {
  return this.getStatus(p).then(result => {
    let lastSleep = new tc.DateTime(result.summary.timeOfLastSleeping + " " + this.timezone.name(),"MM/dd/yyyy HH:mm zzzz");
    let now = tc.now(this.timezone);
    let diff = now.diff(lastSleep);

    return {
      isSleeping: result.summary.isSleeping,
      elapsedMinutes: Math.floor(diff.minutes()),
      elapsedRendered: renderDuration(diff),
      totalMinutes: result.summary.totalSleepDuration,
      totalRendered: renderDuration(tc.minutes(result.summary.totalSleepDuration))
    }
  });
};

Connect.prototype.getBottleStatus = function(p) {
  return this.getStatus(p).then(result => {
    let lastBottle = new tc.DateTime(result.summary.timeOfLastBottle + " " + this.timezone.name(),"MM/dd/yyyy HH:mm zzzz");
    let now = tc.now(this.timezone);
    let diff = now.diff(lastBottle);

    return {
      elapsedMinutes: Math.floor(diff.minutes()),
      elapsedRendered: renderDuration(diff),
      totalOunces: result.summary.totalBottleSize,
      totalRendered: renderOunces(result.summary.totalBottleSize)
    }
  });
};

Connect.prototype.getNursingStatus = function(p) {
  return this.getStatus(p).then(result => {
    let lastNursing = new tc.DateTime(result.summary.timeOfLastNursing + " " + this.timezone.name(),"MM/dd/yyyy HH:mm zzzz");
    let now = tc.now(this.timezone);
    let diff = now.diff(lastNursing);

    return {
      elapsedMinutes: Math.floor(diff.minutes()),
      elapsedRendered: renderDuration(diff)
    }
  });
};

Connect.prototype.getPumpingStatus = function(p) {
  return this.getStatus(p).then(result => {
    let lastPumping = new tc.DateTime(result.summary.timeOfLastPumping + " " + this.timezone.name(),"MM/dd/yyyy HH:mm zzzz");
    let now = tc.now(this.timezone);
    let diff = now.diff(lastPumping);

    return {
      elapsedMinutes: Math.floor(diff.minutes()),
      elapsedRendered: renderDuration(diff)
    }
  });
};

Connect.prototype.getDiaperStatus = function(p) {
  return this.getStatus(p).then(result => {
    let lastDiaper = new tc.DateTime(result.summary.timeOfLastDiaper + " " + this.timezone.name(),"MM/dd/yyyy HH:mm zzzz");
    let now = tc.now(this.timezone);
    let diff = now.diff(lastDiaper);

    return {
      elapsedMinutes: Math.floor(diff.minutes()),
      elapsedRendered: renderDuration(diff)
    }
  });
};

function getToday(tz) {
  let now = tc.now(tz);
  let today = now.year().toString().substr(-2)
      + ("0" + now.month().toString()).substr(-2)
      + ("0" + now.day().toString()).substr(-2);
  return today;
}

function renderDuration(d) {
  if(d.wholeHours()===0) {
    return d.minute() + " minutes";
  } else if(d.wholeHours()===1) {
    return "1 hour " + d.minute() + " minutes";
  } else {
    return d.wholeHours() + " hours " + d.minute() + " minutes";
  }
}

function renderOunces(q) {
  return q===1 ? "1 ounce" : q + " ounces";
}

function doPost(url,nextCookie,formdata,callback) {
    request.post(url,{
        form: formdata,
        followRedirect: false,
        headers:postHeaders(nextCookie)
    },(error,response,body) => {
        if(error) {
            callback(error);
        } else {
            let nextCookie = findNextCookie(response);
            callback(undefined,{nextCookie:nextCookie,body:body,statusCode:response.statusCode,location:response.location});
        }
    });
}

function findNextCookie(response) {
    if(response.headers['set-cookie']) {
        let c = cookie.parse(response.headers['set-cookie'][0]);
        if(c.seacloud1) {
            return 'seacloud1=' + c.seacloud1;
        }
    }
}

function postHeaders(nextCookie) {
    let headers = {
        'Content-Type':'application/x-www-form-urlencoded',
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
    };
    if(nextCookie) {
        headers['Cookie'] = nextCookie;
    }
    return headers;
}

module.exports = Connect;