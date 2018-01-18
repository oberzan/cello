'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('ca.js');
logger.setLevel('DEBUG');

var hfcc = require('fabric-ca-client');

var hfc = require('fabric-client');
hfc.setLogger(logger);
var networkConfig = hfc.getConfigSetting('network-connection-profile-path');


async function enrollCAUser (username, enrollmentSecret, orgname) {
	//var client = await helper.getClientForOrg(orgName);
  return networkConfig;
  // var caService = new FabricCAServices(caUrl, tlsOptions, null, );

	// var user = await caService.enroll({ enrollmentID: username,
	// 									                  enrollmentSecret: enrollmentSecret });
	// return user;
}

exports.enrollCAUser = enrollCAUser;