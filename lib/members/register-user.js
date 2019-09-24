'use strict';

require('../../config');

let helper = require('../helper'),
    _ = require('lodash'),
    util = require('util'),
    bcrypt = require('bcrypt'),
    orgName = process.argv[2];

var log4js = require('log4js');
var logger = log4js.getLogger('SampleWebApp');

var registerUser =  async function registerUser(object, userOrg, adminUsername) {
    
    let client = await helper.getClientForOrg(userOrg);
    let password = object.password;
    let username = object.username;

    const user = await client.getUserContext(username, true);

    if (user && user.isEnrolled()) {
        logger.info('User is already registered and enrolled');
        return user;
    }

    // get the Admin and use it to enroll the user
    const admin =  await client.getUserContext(adminUsername, true);

    if (!admin || !admin.isEnrolled()) {
        logger.info('Admin does not exists or it is not enrolled!');
        return false;
    }

    let caClient = client.getCertificateAuthority();

    await caClient.register({
        enrollmentID: username,
        enrollmentSecret: password,
        attrs: getAttributes(object),
        affiliation: "org1.developers",
        role: 'user'
    }, admin);

    logger.debug(username + ' registered successfully');

    const message = await caClient.enroll({
        enrollmentID: username,
        enrollmentSecret: password,
    });

    if (message && typeof message === 'string' && message.includes(
        'Error:')) {
        logger.error(username + ' enrollment failed');
    }
    logger.debug(username + ' enrolled successfully');

    const userOptions = {
        username,
        mspid: userOrg + 'MSP',
        role: 'user',
        cryptoContent: {
            privateKeyPEM: message.key.toBytes(),
            signedCertPEM: message.certificate
        }
    };

    const member = await client.createUser(userOptions);
    return member;
}

function getAttributes(object) {
    delete object.username;
    
    const result = _.map(object, function (value, name) {
        
        if (name === 'password') {
            value = bcrypt.hashSync(value, 10);
        }

        return {name, value};
    });

    return result;
}

module.exports.registerUser = registerUser;
