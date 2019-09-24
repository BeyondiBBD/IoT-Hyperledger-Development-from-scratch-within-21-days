#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0


# Remove unwanted docker containers

function dkcl(){
        CONTAINER_IDS=$(docker ps -aq)
	echo
        if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" = " " ]; then
                echo "========== No containers available for deletion =========="
        else
                docker rm -f $CONTAINER_IDS
        fi
	echo
}

# Remove unwanted docker images

function dkrm(){
        DOCKER_IMAGE_IDS=$(docker images | grep "dev\|none\|test-vp\|peer[0-9]-" | awk '{print $3}')
	echo
        if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" = " " ]; then
		echo "========== No images available for deletion ==========="
        else
                docker rmi -f $DOCKER_IMAGE_IDS
        fi
	echo
}


# Restart network.

function restartNetwork() {
	echo

  #teardown the network and clean the containers and intermediate images
	docker-compose -f ./docker-compose.yaml down
	dkcl
	dkrm

	#Cleanup the stores
	rm -rf ./wallet

	#Start the network
	docker-compose -f ./docker-compose.yaml up -d
	echo
}

# Install Node modules

function installNodeModules() {
	echo
	if [ -d node_modules ]; then
		echo "============== node modules installed already ============="
	else
		echo "============== Installing node modules ============="
		npm install
	fi
	echo
}


restartNetwork

installNodeModules

cd ..

node ./lib/members/enroll-admin.js Buyer
node ./lib/members/enroll-admin.js Seller
node ./lib/members/enroll-admin.js Regulator
node ./lib/members/enroll-admin.js Logistic

PORT=4000 nodemon app
