"use strict";

const assert = require("assert");
const BabyConnect = require('../baby-connect.js');

const username = process.env.BABYCONNECTUSER;
const password = process.env.BABYCONNECTPWD;

describe('Testing BabyConnect',() => {
    it('should login with correct credientials',() => {
        let bc = new BabyConnect(username,password);
        return bc.login()
        .then(result => {
            assert(result,"login should resolve with true for success");
        });
    });

    it('should fail login with incorrect credientials',() => {
        let bc = new BabyConnect("demo@demo.com","demo");
        return bc.login()
        .then(result => {
            assert(!result,"login should resolve with false for failure");
        });
    });

    it('should return user info',() => {
        let bc = new BabyConnect(username,password);
        return bc.login()
        .then(result => {
            assert(result,"login should resolve with true for success");
            return bc.getUserInfo();
        }).then(result => {
            assert(result.myKids.length>0,"myKids collection should not be empty");
        });
    });

    it('should return kid status',() => {
        let bc = new BabyConnect(username,password);
        return bc.login()
        .then(result => {
            assert(result,"login should resolve with true for success");
            return bc.getUserInfo();
        }).then(result => {
            return bc.getStatus('170226',result.myKids[0].Id);
        }).then(result => {
            assert(result.list.length>0,"list collection should not be empty");
        });
    });
});