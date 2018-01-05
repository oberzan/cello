#!/usr/bin/env bash

# Copyright IBM Corp., All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
# This script will only build and redeploy the specific service.
# It should be triggered at the upper directory

# Detecting whether can import the header file to render colorful cli output
# Need add choice option
if [ -f ../header.sh ]; then
	source ../header.sh
elif [ -f scripts/header.sh ]; then
	source scripts/header.sh
else
	echo_r() {
		echo "$@"
	}
	echo_g() {
		echo "$@"
	}
	echo_b() {
		echo "$@"
	}
fi

if [ "$#" -ne 1 ]; then
    echo "Redeploy the service, e.g., engine, api, watchdog, mongo, nginx"
    exit
fi

SERVICE=$1

echo "Remove the old image"
docker rmi ${PROJECT}-${SERVICE}

echo "Rebuilding the ${PROJECT}-${SERVICE} image"
docker-compose build ${SERVICE}

echo "Remove the old containers"
docker-compose stop ${SERVICE}
docker-compose rm -f --all ${SERVICE}

echo "Redeploy the ${PROJECT}-${SERVICE} container"
docker-compose up --no-deps -d ${SERVICE}