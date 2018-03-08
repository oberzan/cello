#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
#sleep 99999
set -e

# Enroll the peer to get a TLS cert
fabric-ca-client enroll -d --enrollment.profile tls -u $ENROLLMENT_URL -M /tmp/tls --csr.hosts $(hostname)
# Copy the TLS key and cert to the appropriate place
TLSDIR=/opt/gopath/src/github.com/hyperledger/fabric/peer/tls
mkdir -p $TLSDIR
cp /tmp/tls/signcerts/* $CORE_PEER_TLS_CERT_FILE
cp /tmp/tls/keystore/* $CORE_PEER_TLS_KEY_FILE
rm -rf /tmp/tls

# Enroll the peer to get an enrollment certificate and set up the core's local MSP directory
fabric-ca-client enroll -d -u $ENROLLMENT_URL -M $CORE_PEER_MSPCONFIGPATH

if [ ! -d $CORE_PEER_MSPCONFIGPATH/tlscacerts ]; then
    mkdir $CORE_PEER_MSPCONFIGPATH/tlscacerts
    cp $CORE_PEER_MSPCONFIGPATH/cacerts/* $CORE_PEER_MSPCONFIGPATH/tlscacerts
    if [ -d $CORE_PEER_MSPCONFIGPATH/intermediatecerts ]; then
        mkdir $CORE_PEER_MSPCONFIGPATH/tlsintermediatecerts
        cp $CORE_PEER_MSPCONFIGPATH/intermediatecerts/* $CORE_PEER_MSPCONFIGPATH/tlsintermediatecerts
    fi
fi

mkdir -p $CORE_PEER_MSPCONFIGPATH/admincerts
#dowait "$ORG administator to enroll" 60 $SETUP_LOGFILE $ORG_ADMIN_CERT
cp /etc/hyperledger/peer/msp/admincerts/cert.pem $CORE_PEER_MSPCONFIGPATH/admincerts

# Start the peer
peer node start


# ## Register a new peer
# fabric-ca-client enroll -u https://{{ caname }}.admin:adminpw@{{ caname }}:7054
# fabric-ca-client register --id.name {name} --id.secret {secret} --id.affiliation {org} --id.type peer
#
# ## Start the new peer
# # Copy and edit an existing peer in {composefile}
# docker-compose -p bc1st.{peername} -f {composefile}.yml up -d
# peer channel fetch config /etc/hyperledger/keyfiles/{channel}.block -c {channel} -o {orderername}:7050 --tls --cafile /etc/hyperledger/keyfiles/{ordererorg}-ca-chain.pem
# export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/peer/admin/msp;
# peer channel join -b /etc/hyperledger/keyfiles/{channel}.block
#
# # Create a channel
# peer channel create -o {orderername}:7050 -c {channel} -f /etc/hyperledger/keyfiles/{channel}.tx --tls true --timeout 120 --cafile /etc/hyperledger/keyfiles/{ordererorg}-ca-chain.pem