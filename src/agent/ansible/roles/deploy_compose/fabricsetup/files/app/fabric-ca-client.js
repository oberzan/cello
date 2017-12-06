'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('Helper');
logger.setLevel('DEBUG');
var util = require('util');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');

var X509 = require('x509');

var LocalMSP = require('fabric-ca-client/lib/msp/msp.js');
var idModule = require('fabric-ca-client/lib/msp/identity.js');
var SigningIdentity = idModule.SigningIdentity;
var Signer = idModule.Signer;
var User = require('fabric-ca-client/lib/User.js');


var helper = require('/app/helper.js');
var FabricCAServices = require('fabric-ca-client');
var FabricCAClient = FabricCAServices.FabricCAClient;

var req = {
  enrollmentID: "peer46",
  //enrollmentSecret: "peer2pw",
  role: "peer",
  affiliation: "org2"    
};
// var registrar = helper.getAdminUser("org2"); //Unhandled promise rejection
addPeer(req);



function writeFile(filePath, contents, cb) {
  mkdirp(path.dirname(filePath), function (err) {
    if (err) return cb(err);

    if(!cb)
      cb = function(err) {};
    fs.writeFile(filePath, contents, cb);
  });
}

function addPeer(req) {
  //let caUrl = "http://10.0.0.5:7054";
  let caUrl = "http://ca.org2.example.com:7054";
  //let caName = "blockchainX_ca-org2";
  let tlsOptions = null;
  var caService = new FabricCAServices(caUrl, tlsOptions, '');

  var admin = {
	  enrollmentID: 'admin',
	  enrollmentSecret: 'adminpw'
  };

  var eResult, client, member, webAdmin, enrollmentSecret;
  return caService.enroll(admin)
	  .then((enrollment) => {
      logger.info('Successfully enrolled \'' + admin.enrollmentID + '\'.');
      eResult = enrollment;

      var subject;
			try {
				subject = X509.getSubject(FabricCAServices.normalizeX509(enrollment.certificate));
			} catch(err) {
				logger.error(util.format('Failed to parse enrollment cert\n%s\n. Error: %s', enrollment.certificate, err));
      }

      return caService.getCryptoSuite().importKey(enrollment.certificate);
    },(err) => {
			logger.error('Failed to enroll the admin. Can not progress any further. Exiting. ' + err.stack ? err.stack : err);
      throw(err);
			
    }).then((pubKey) => {
			logger.info('Successfully imported public key from the resulting enrollment certificate');
			var msp = new LocalMSP({
				id: "Org2MSP", //ORGS[userOrg].mspid,
				cryptoSuite: caService.getCryptoSuite()
			});

			var signingIdentity = new SigningIdentity(eResult.certificate, pubKey, msp.getId(), msp.cryptoSuite,
        new Signer(msp.cryptoSuite, eResult.key));
      logger.info("?");
			return caService._fabricCAClient.register(req.enrollmentID, null, 'peer', req.affiliation, 1, [], signingIdentity);
		},(err) => {
      logger.error('Failed to import the public key from the enrollment certificate. ' + err.stack ? err.stack : err);
      throw(err);
    }).then((secret) => {
			logger.info('secret: ' + JSON.stringify(secret));
			req.enrollmentSecret = secret; // to be used in the next test case

			member = new User('adminX');
			return member.setEnrollment(eResult.key, eResult.certificate, 'Org2MSP');
		}, (err) => {
      logger.error(err.code === 0);
      throw(err);
    }).then((ttt) => {
      //logger.info(ttt);
      logger.info("???");
      //req.enrollmentSecret = enrollmentSecret;
      return caService.enroll(req);
    }).then((enrollment) => {
      logger.info('Successfully enrolled peer.');
      logger.info(enrollment);
      writeFile("keystore/key.key", enrollment.key.toBytes());
      writeFile("signcerts/cert.cert", enrollment.certificate);
      writeFile("cacerts/cert.cert", enrollment.rootCertificate);
    }).catch((err) => {
      logger.error('Failed at ' + err.stack ? err.stack : err);
    });


  //var signingIdentity = new SigningIdentity(eResult.certificate, pubKey, msp.getId(), msp.cryptoSuite, new Signer(msp.cryptoSuite, eResult.key));  
  //let client = new hfcc(, null, "Org2"); //TODO: get org IP and name dynamically, maybe add CryptoSuite
  //logger.info(registrar);

  //client.register(req, registrar);
  //client.register("peer3", "peer2pw", "peer", "org2", 5, null, [], );
}
