#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

set -e

# Enroll to get orderer's TLS cert (using the "tls" profile)
fabric-ca-client enroll -d --enrollment.profile tls -u $ENROLLMENT_URL -M /tmp/tls --csr.hosts $ORDERER_NAME

# Copy the TLS key and cert to the appropriate place
TLSDIR=$ORDERER_HOME/tls
mkdir -p $TLSDIR
echo $TLSDIR
ls $TLSDIR
cp /tmp/tls/keystore/* $ORDERER_GENERAL_TLS_PRIVATEKEY
cp /tmp/tls/signcerts/* $ORDERER_GENERAL_TLS_CERTIFICATE
rm -rf /tmp/tls

# Enroll again to get the orderer's enrollment certificate (default profile)
fabric-ca-client enroll -d -u $ENROLLMENT_URL -M $ORDERER_GENERAL_LOCALMSPDIR

# Finish setting up the local MSP for the orderer
if [ ! -d $ORDERER_GENERAL_LOCALMSPDIR/tlscacerts ]; then
    mkdir $ORDERER_GENERAL_LOCALMSPDIR/tlscacerts
    cp $ORDERER_GENERAL_LOCALMSPDIR/cacerts/* $ORDERER_GENERAL_LOCALMSPDIR/tlscacerts
    if [ -d $ORDERER_GENERAL_LOCALMSPDIR/intermediatecerts ]; then
        mkdir $ORDERER_GENERAL_LOCALMSPDIR/tlsintermediatecerts
        cp $ORDERER_GENERAL_LOCALMSPDIR/intermediatecerts/* $ORDERER_GENERAL_LOCALMSPDIR/tlsintermediatecerts
    fi
fi

if $ADMINCERTS; then
    dstDir=$ORDERER_GENERAL_LOCALMSPDIR/admincerts
    mkdir -p $dstDir
    #cp $ORG_ADMIN_CERT $dstDir
fi

# Wait for the genesis block to be created
#dowait "genesis block to be created" 60 $SETUP_LOGFILE $ORDERER_GENERAL_GENESISFILE

# Start the orderer
echo "Starting orderer $ORDERER_NAME"
#env | grep ORDERER
orderer