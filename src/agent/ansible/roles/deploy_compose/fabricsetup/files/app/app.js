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
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var util = require('util');
var path = require('path');
var app = express();
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
var cors = require('cors');

require('./config.js');
//var hfcc = require('/app/fabric-ca-client.js');
var hfc = require('fabric-client');

var helper = require('/app/helper.js');
var appCa = require('/app/ca.js');
var createChannel = require('/app/create-channel.js');
var join = require('/app/join-channel.js');
var install = require('/app/install-chaincode.js');
var instantiate = require('/app/instantiate-chaincode.js');
var invoke = require('/app/invoke-transaction.js');
var query = require('/app/query.js');

var host = process.env.HOST || hfc.getConfigSetting('host');
var port = process.env.PORT || hfc.getConfigSetting('port');
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SET CONFIGURATONS ////////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
	extended: false
}));
// set secret variable
app.set('secret', 'thisismysecret');
app.use(expressJWT({
	secret: 'thisismysecret'
}).unless({
	path: ['/users',
		   /^\/ca\//]
}));
app.use(bearerToken());
app.use(function(req, res, next) {
  logger.debug(' ------>>>>>> new request for %s',req.originalUrl);
	if (req.originalUrl.indexOf('/users') >= 0 ||
		req.originalUrl.indexOf('/ca/') >= 0) {
		return next();
	}

	var token = req.token;
	logger.debug('Verify token: ' + token);
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
			req.username = decoded.username;
			req.orgname = decoded.orgName;
			logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
			return next();
		}
	});
});

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
var server = http.createServer(app).listen(port, function() {});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************',host,port);
server.timeout = 240000;

function getErrorMessage(field) {
	var response = {
		success: false,
		message: field + ' field is missing or Invalid in the request'
	};
	return response;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Register and enroll user
app.post('/users', async function(req, res) {
	var username = req.body.username;
	var orgName = req.body.orgName;
  	var caUrl = req.body.caUrl;
	logger.info('End point : /users');
	logger.info('User name : ' + username);
	logger.info('Org name  : ' + orgName);
	if (!username) {
		res.json(getErrorMessage('\'username\''));
		return;
	}
	if (!orgName) {
		res.json(getErrorMessage('\'orgName\''));
		return;
	}
	var token = jwt.sign({
		exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
		username: username,
		orgName: orgName
	}, app.get('secret'));

	let response = await helper.getRegisteredUser(username, orgName, true);
	logger.debug('-- returned from registering the username %s for organization %s',username,orgName);  
	if (response && typeof response !== 'string') {
		logger.debug('Successfully registered the username %s for organization %s',username,orgName);
		response.token = token;
		res.json(response);
	} else {
		logger.debug('Failed to register the username %s for organization %s with::%s',username,orgName,response);
		res.json({success: false, message: response});
	}

});

app.post('/ca/users/register', async function(req, res) {
	var username = req.body.username;
	var orgName = req.body.orgName;
  	var caUrl = req.body.caUrl;
	logger.debug('End point : /users');
	logger.debug('User name : ' + username);
	logger.debug('Org name  : ' + orgName);
	if (!username) {
		res.json(getErrorMessage('\'username\''));
		return;
	}
	if (!orgName) {
		res.json(getErrorMessage('\'orgName\''));
		return;
	}
	// var token = jwt.sign({
	// 	exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
	// 	username: username,
	// 	orgName: orgName
	// }, app.get('secret'));

  	let response = await appCa.registerCAUser(username, orgName, true);	
	if (response && typeof response !== 'string') {
		logger.debug('Successfully returned from registering the username %s for organization %s',username,orgName);
		response.token = token;
		res.json(response);
	} else {
		res.json({success: false, message: response});
	}
});
app.post('/ca/:orgname/users/enroll', async function(req, res) {
	var username = req.body.username;
	var enrollmentSecret = req.body.enrollmentSecret;
	var orgname = req.params.orgname;
  	//var caUrl = req.body.caUrl;
	logger.info('End point : /ca/users/enroll');
	logger.info('User name : ' + username);
	logger.info('Org name  : ' + orgname);
	if (!username) {
		res.json(getErrorMessage('\'username\''));
		return;
	}
	if (!enrollmentSecret) {
		res.json(getErrorMessage('\'enrollmentSecret\''));
		return;
	}
	if (!orgname) {
		res.json(getErrorMessage('\'orgname\''));
		return;
	}
	// var token = jwt.sign({
	// 	exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
	// 	username: username,
	// 	orgName: orgName
	// }, app.get('secret'));

  	let response = await appCa.enrollCAUser(username, enrollmentSecret, orgname);	
	if (response && typeof response !== 'string') {
		logger.debug('Successfully returned from registering the username %s for organization %s',username,orgname);
		response.token = token;
		res.json(response);
	} else {
		res.json({success: false, message: response});
	}
});

app.post('/peers', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< REGISTER PEER >>>>>>>>>>>>>>>>>');
	var hostname = req.body.hostname;
	var orgName = req.body.orgName;
  	//var caUrl = req.body.caUrl;
	logger.info('End point : /peers');
	logger.info('User name : ' + hostname);
	logger.info('Org name  : ' + orgName);
	if (!username) {
		res.json(getErrorMessage('\'username\''));
		return;
	}
	if (!orgName) {
		res.json(getErrorMessage('\'orgName\''));
		return;
	}
	// var token = jwt.sign({
	// 	exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
	// 	username: username,
	// 	orgName: orgName
	// }, app.get('secret'));

  	let response = await appCa.getRegisteredPeer(username, orgName);	
	if (response && typeof response !== 'string') {
		logger.debug('Successfully returned from registering the username %s for organization %s',username,orgName);
		response.token = token;
		res.json(response);
	} else {
		res.json({success: false, message: response});
	}

});

// Create Channel
app.post('/channels', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
	logger.info('End point : /channels');
	var channelName = req.body.channelName;
	var channelConfigPath = path.join('/etc', 'hyperledger', 'keyfiles', req.body.channelConfig);
	logger.info('Channel name : ' + channelName);
	logger.info('channelConfigPath : ' + channelConfigPath); //etc/hyperledger/keyfiles/...
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!req.body.channelConfig) {
		res.json(getErrorMessage('\'channelConfig\''));
		return;
	}

  	let message = await createChannel.createChannel(channelName, channelConfigPath, req.username, req.orgname);
+	res.send(message);
});
// Join Channel
app.post('/channels/:channelName/peers', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
	var channelName = req.params.channelName;
	var peers = req.body.peers;
	logger.debug('channelName : ' + channelName);
	logger.debug('peers : ' + peers);
  	logger.info('username :' + req.username);
  	logger.info('orgname:' + req.orgname);

	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}

  let message =  await join.joinChannel(channelName, peers, req.username, req.orgname);
  res.send(message);
});
// Install chaincode on target peers
app.post('/chaincodes', async function(req, res) {
	logger.info('==================== INSTALL CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	//var chaincodePath = req.body.chaincodePath;
	var chaincodePath = hfc.getConfigSetting('CC_SRC_PATH');
	var chaincodeVersion = req.body.chaincodeVersion;
  	var chaincodeType = req.body.chaincodeType;
	logger.info('peers : ' + peers); // target peers list
	logger.info('chaincodeName : ' + chaincodeName);
	logger.info('chaincodePath  : ' + chaincodePath);
	logger.info('chaincodeVersion  : ' + chaincodeVersion);
  logger.info('chaincodeType  : ' + chaincodeType);
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodePath) {
		res.json(getErrorMessage('\'chaincodePath\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
  if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}

  let message = await install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, req.username, req.orgname);
  res.send(message);
});
// Instantiate chaincode on target peers
app.post('/channels/:channelName/chaincodes', async function(req, res) {
	logger.info('==================== INSTANTIATE CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodeVersion = req.body.chaincodeVersion;
	var channelName = req.params.channelName;
  	var chaincodeType = req.body.chaincodeType;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('peers  : ' + peers);
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
  	logger.debug('chaincodeType  : ' + chaincodeType);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
  	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	let message = await instantiate.instantiateChaincode(peers, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgname);
  	res.send(message);
});
// Invoke transaction on chaincode on target peers
app.post('/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.info('==================== INVOKE ON CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.params.chaincodeName;
	var channelName = req.params.channelName;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

  let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgname);
  res.send(message);
});
// Query on chaincode on target peers
app.get('/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.info('==================== QUERY BY CHAINCODE ==================');
	var channelName = req.params.channelName;
	var chaincodeName = req.params.chaincodeName;
	let args = req.query.args;
	let fcn = req.query.fcn;
	let peer = req.query.peer;

	logger.debug('channelName : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn : ' + fcn);
	logger.debug('args : ' + args);

	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}
	args = args.replace(/'/g, '"');
	args = JSON.parse(args);
	logger.debug(args);

  let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgname);
	res.send(message);
});
//  Query Get Block by BlockNumber
app.get('/channels/:channelName/blocks/:blockId', async function(req, res) {
	logger.info('==================== GET BLOCK BY NUMBER ==================');
	let blockId = req.params.blockId;
	let peer = req.query.peer;
	logger.debug('channelName : ' + req.params.channelName);
	logger.debug('BlockID : ' + blockId);
	logger.debug('Peer : ' + peer);
	if (!blockId) {
		res.json(getErrorMessage('\'blockId\''));
		return;
	}

  let message = await query.getBlockByNumber(peer, req.params.channelName, blockId, req.username, req.orgname);
	res.send(message);
});
// Query Get Transaction by Transaction ID
app.get('/channels/:channelName/transactions/:trxnId', async function(req, res) {
	logger.info('================ GET TRANSACTION BY TRANSACTION_ID =====================');
	logger.debug('channelName : ' + req.params.channelName);
	let trxnId = req.params.trxnId;
	let peer = req.query.peer;
	if (!trxnId) {
		res.json(getErrorMessage('\'trxnId\''));
		return;
	}

  let message = await query.getTransactionByID(peer, req.params.channelName, trxnId, req.username, req.orgname);
	res.send(message);
});

// Query Get Block by Hash
app.get('/channels/:channelName/blocks', async function(req, res) {
	logger.info('================ GET BLOCK BY HASH ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let hash = req.query.hash;
	let peer = req.query.peer;
	if (!hash) {
		res.json(getErrorMessage('\'hash\''));
		return;
	}

  let message = await query.getBlockByHash(peer, req.params.channelName, hash, req.username, req.orgname);
	res.send(message);
});

//Query for Channel Information
app.get('/channels/:channelName', async function(req, res) {
	logger.info('================ GET CHANNEL INFORMATION ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getChainInfo(peer, req.params.channelName, req.username, req.orgname);
	res.send(message);
});

//Query for Channel instantiated chaincodes
app.get('/channels/:channelName/chaincodes', async function(req, res) {
	logger.info('================ GET INSTANTIATED CHAINCODES ======================');
   	logger.debug('channelName : ' + req.params.channelName);
 	let peer = req.query.peer;
  let message = await query.getInstalledChaincodes(peer, req.params.channelName, 'instantiated', req.username, req.orgname);
	res.send(message);
});

// Query to fetch all Installed/instantiated chaincodes
app.get('/chaincodes', async function(req, res) {
	var peer = req.query.peer;
	var installType = req.query.type;
	logger.info('================ GET INSTALLED CHAINCODES ======================');
  let message = await query.getInstalledChaincodes(peer, null, 'installed', req.username, req.orgname)
	res.send(message);
});

// Query to fetch channels
app.get('/channels', async function(req, res) {
	logger.info('================ GET CHANNELS ======================');
	logger.debug('peer: ' + req.query.peer);
	var peer = req.query.peer;
	if (!peer) {
		res.json(getErrorMessage('\'peer\''));
		return;
	}

	let message = await query.getChannels(peer, req.username, req.orgname);
	res.send(message);
});
