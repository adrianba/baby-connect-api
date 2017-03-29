const request = require('request');
const cookie = require('cookie');
const NodeCache = require('node-cache');

function Connect(username,password) {
    if(!(this instanceof Connect)) {
        return new Connect(username,password);
    }

    this.username = username;
    this.password = password;
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

Connect.prototype.getStatus = function(p) {
    let formData = {
            fmt:'long',
            '_ts_':Date.now()
    };
    if(!p.day) {
      let now = new Date();
      let today = now.getFullYear().toString().substr(-2)
          + ("0" + (now.getMonth()+1).toString()).substr(-2)
          + ("0" + now.getDate().toString()).substr(-2);
      p.day = today;
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