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
});