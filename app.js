/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('SampleWebApp');
var express = require('express');
   

var bodyParser = require('body-parser');
var http = require('http');
var app = express();
var cors = require('cors');
var jwt = require('jsonwebtoken');
var util = require('util');

//JWT
var expressJWT = require('express-jwt');
var bearerToken = require('express-bearer-token');


require('./config.js');
require('dotenv').config();
var hfc = require('fabric-client');

var host = process.env.HOST || hfc.getConfigSetting('host');
var port = process.env.PORT || hfc.getConfigSetting('port');

//////////////////////////////// SET CONFIGURATONS ////////////////////////////

app.options('*', cors());
app.set('secret', 'IYwK,I%=O9218[C');
app.use(expressJWT({
	secret: 'IYwK,I%=O9218[C'
}).unless({
	path: ['/api/users/signin']
}));
app.use(bearerToken());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
	extended: false
}));

app.use(function(req, res, next) {
	logger.debug(' ------>>>>>> new request for %s',req.originalUrl);
	if (req.originalUrl.indexOf('/api/users/signin') >= 0) {
		return next();
	}

	var token = req.token;
	jwt.verify(token, app.get('secret'), function(err, decoded) {
		if (err) {
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /users call in the authorization header ' +
					' as a Bearer token'
			});
			return;
		} else {
			// add the decoded user name and org name to the request object
			// for the downstream code to use
			req.username = decoded.usr;
			req.orgname = decoded.org;
			logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.usr, decoded.org));
			return next();
		}
	});
});


//////////////////////////////// START SERVER /////////////////////////////////

var server = http.createServer(app).listen(port, function () { });
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************', host, port);
server.timeout = 240000;

///////////////////////// REST ENDPOINTS START HERE ///////////////////////////

// Login and enroll user
require('./api/users/users')(app,hfc);

// error handler, required as of 0.3.0
app.use(function (err, req, res, next) {

	console.log("unhandled", err);

	if (err.message === "validation error") {
		err.status = 422;
		err.statusText = "Unprocessable Entity"

		res.status(422).json(err);
	}

	if (err.name === "UnauthorizedError") {
		res.status(401).json(err);
	}

	res.status(500).send(err);
});
