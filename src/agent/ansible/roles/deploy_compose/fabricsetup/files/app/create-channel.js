// /**
//  * Copyright 2017 IBM All Rights Reserved.
//  *
//  * Licensed under the Apache License, Version 2.0 (the 'License');
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *    http://www.apache.org/licenses/LICENSE-2.0
//  *
//  *  Unless required by applicable law or agreed to in writing, software
//  *  distributed under the License is distributed on an 'AS IS' BASIS,
//  *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  *  See the License for the specific language governing permissions and
//  *  limitations under the License.
//  */
// var util = require('util');
// var fs = require('fs');
// var path = require('path');

// var hfc = require('fabric-client');

// var helper = require('./helper.js');
// var logger = helper.getLogger('Create-Channel');
// //Attempt to send a request to the orderer with the sendTransaction method
// var createChannel = async function(channelName, channelConfigPath, username, orgName) {
// 	logger.debug('\n====== Creating Channel \'' + channelName + '\' ======\n');
// 	try {
// 		// first setup the client for this org
// 		var client = await helper.getClientForOrg(orgName);
// 		logger.debug('Successfully got the fabric client for the organization "%s"', orgName);

// 		// read in the envelope for the channel config raw bytes
// 		var envelope = fs.readFileSync(channelConfigPath);
// 		// extract the channel config bytes from the envelope to be signed
// 		var channelConfig = client.extractChannelConfig(envelope);

		
//     //var admin = await client.setUserContext({username:"admin", password:"adminpw"});
//     //if(admin && admin.isEnrolled) {
//     //  logger.debug("Admin enrolled");    
//     //} else {
//     //  logger.debug("Admin failed to enroll");    
//     //}
//     //Acting as a client in the given organization provided with "orgName" param
// 		// sign the channel config bytes as "endorsement", this is required by
// 		// the orderer's channel creation policy
// 		// this will use the admin identity assigned to the client when the connection profile was loaded
//     let signature = client.signChannelConfig(channelConfig);

//     //logger.debug(hfc.getConfigSetting('admins'));
//     logger.debug(channelConfigPath);    
//     logger.debug(client.getClientConfig());
//     //var orderer = client.newOrderer("grpc://orderer.example.com:7050", undefined);
//     logger.debug(hfc.getConfigSetting('network-connection-profile-path'));
    
//     //let orderer = client.getTargetOrderer("orderer.example.com");
//     //orderer: orderer,
// 		let request = {
// 			config: channelConfig,      			
//       signatures: [signature],
// 			name: channelName,
// 			txId: client.newTransactionID(true) // get an admin based transactionID
// 		};
//     logger.debug(client);
//     logger.debug(client._network_config);
//     logger.debug(client._network_config._network_config.peers['peer1.org1.example.com']);
//     let peer = client.newPeer('grpc://'+'peer0.org1.example.com'+':7051'); //TODO
//     logger.debug(peer);
//     let channels = await client.queryChannels(peer, true);
//     logger.debug(channels.channels.map(x => x.channel_id));
//     if(channels.channels.map(x => x.channel_id).includes(channelName)) {
//       logger.debug("Channel "+ channelName +" already exists.");
//       client.getChannel(channelName);
//       logger.debug("Instead of creating channel, used the existing one");
//       throw new Error("Couldn't create channel, returning the existing one");
//     } else {
    
// 		  // send to orderer
//       var response = await client.createChannel(request).catch((err) => {        
//         throw new Error("Could not create the channel"+err.toString());    
//       });

// 		  logger.debug(' response ::%j', response);
// 	    if (response && response.status === 'SUCCESS') {  
//         //let channel = await client.newChannel(channelName);
//         //channel.addOrderer(orderer);
// 		    logger.debug('Successfully created the channel.');
        

// 		    let response = {
// 		    	  success: true,
// 			    message: 'Channel \'' + channelName + '\' created Successfully'
// 		    };
// 		    return response;
// 	    } else {
// 		    logger.error('\n!!!!!!! Failed to create the channel \'' + channelName + '\' !!!!!!!\n');
// 		    throw new Error('Failed to create the channel \'' + channelName + '\'');
// 	    }
//     }
    
// 	} catch (err) {
// 		logger.error('Failed to initialize the channel: ' + err.stack ? err.stack :	err);
// 		//throw new Error('Failed to initialize the channel: ' + err.toString());
// 	}
// };

// exports.createChannel = createChannel;
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
var util = require('util');
var fs = require('fs');
var path = require('path');

var helper = require('./helper.js');
var logger = helper.getLogger('Create-Channel');
//Attempt to send a request to the orderer with the sendTransaction method
var createChannel = async function(channelName, channelConfigPath, username, orgName) {
	logger.debug('\n====== Creating Channel \'' + channelName + '\' ======\n');
	try {
		// first setup the client for this org
		var client = await helper.getClientForOrg(orgName);
		logger.debug('Successfully got the fabric client for the organization "%s"', orgName);

		// read in the envelope for the channel config raw bytes
		var envelope = fs.readFileSync(channelConfigPath);
		// extract the channel config bytes from the envelope to be signed
		var channelConfig = client.extractChannelConfig(envelope);

		//Acting as a client in the given organization provided with "orgName" param
		// sign the channel config bytes as "endorsement", this is required by
		// the orderer's channel creation policy
		// this will use the admin identity assigned to the client when the connection profile was loaded
		let signature = client.signChannelConfig(channelConfig);

		let request = {
			config: channelConfig,
			signatures: [signature],
			name: channelName,
			txId: client.newTransactionID(true) // get an admin based transactionID
		};

		// send to orderer
		var response = await client.createChannel(request)
		logger.debug(' response ::%j', response);
		if (response && response.status === 'SUCCESS') {
			logger.debug('Successfully created the channel.');
			let response = {
				success: true,
				message: 'Channel \'' + channelName + '\' created Successfully'
			};
			return response;
		} else {
			logger.error('\n!!!!!!!!! Failed to create the channel \'' + channelName +
				'\' !!!!!!!!!\n\n');
			throw new Error('Failed to create the channel \'' + channelName + '\'');
		}
	} catch (err) {
		logger.error('Failed to initialize the channel: ' + err.stack ? err.stack :	err);
		throw new Error('Failed to initialize the channel: ' + err.toString());
	}
};

exports.createChannel = createChannel;