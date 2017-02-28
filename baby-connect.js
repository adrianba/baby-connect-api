const request = require('request');
const cookie = require('cookie');

function Connect(username,password) {
    this.username = username;
    this.password = password;

    this.nextCookie = "";
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
                    resolve(JSON.parse(result.body));
                }
            }
        });
    });
}

Connect.prototype.getStatus = function(day,kid) {
    let formData = {
            pdt:day,
            fmt:'long',
            '_ts_':Date.now()
    };
    if(kid) {
        formData.Kid = kid;
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
                    resolve(JSON.parse(result.body));
                }
            }
        });
    });
}

function doPost(url,nextCookie,formdata,callback) {
    let headers = {
        'Content-Type':'application/x-www-form-urlencoded',
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
    };
    if(nextCookie) {
        headers['Cookie'] = nextCookie;
    }
    request.post(url,{
        form: formdata,
        followRedirect: false,
        strictSSL:false,
        headers
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

module.exports = Connect;