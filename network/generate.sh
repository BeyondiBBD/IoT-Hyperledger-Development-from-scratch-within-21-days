#!/bin/sh
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
export PATH=$GOPATH/src/github.com/hyperledger/fabric/build/bin:${PWD}/../bin:${PWD}:$PATH
export FABRIC_CFG_PATH=${PWD}
export PATH=/home/davor/Desktop/IoT-Hyperledger-Development-from-scratch-within-21-days/bin
CHANNEL_NAME=logisticchannel


# generate crypto material
cryptogen generate --config=./crypto-config.yaml
if [ "$?" -ne 0 ]; then
  echo "Failed to generate crypto material..."
  exit 1
fi

# generate genesis block for orderer
configtxgen -profile FourOrgsOrdererGenesis -outputBlock ./artifacts/genesis.block
if [ "$?" -ne 0 ]; then
  echo "Failed to generate orderer genesis block..."
  exit 1
fi

# generate channel configuration transaction 
  configtxgen -profile LogisticChannel -outputCreateChannelTx ./artifacts/logisticchannel.tx -channelID $CHANNEL_NAME
if [ "$?" -ne 0 ]; then
  echo "Failed to generate channel configuration transaction..."
  exit 1
fi

# generate anchor peer transaction
configtxgen -profile LogisticChannel -outputAnchorPeersUpdate ./artifacts/RegulatorMSPanchors.tx -channelID $CHANNEL_NAME -asOrg RegulatorMSP 
if [ "$?" -ne 0 ]; then
  echo "Failed to generate anchor peer update for RegulatorMSP..."
  exit 1
fi

# generate anchor peer transaction
configtxgen -profile LogisticChannel -outputAnchorPeersUpdate ./artifacts/BuyerMSPanchors.tx -channelID $CHANNEL_NAME -asOrg BuyerMSP 
if [ "$?" -ne 0 ]; then
  echo "Failed to generate anchor peer update for BuyerMSP..."
  exit 1
fi


# generate anchor peer transaction
configtxgen -profile LogisticChannel -outputAnchorPeersUpdate ./artifacts/SellerMSPanchors.tx -channelID $CHANNEL_NAME -asOrg SellerMSP 
if [ "$?" -ne 0 ]; then
  echo "Failed to generate anchor peer update for SellerMSP..."
  exit 1
fi


# generate anchor peer transaction
configtxgen -profile LogisticChannel -outputAnchorPeersUpdate ./artifacts/LogisticMSPanchors.tx -channelID $CHANNEL_NAME -asOrg LogisticMSP 
if [ "$?" -ne 0 ]; then
  echo "Failed to generate anchor peer update for LogisticMSP..."
  exit 1
fi

