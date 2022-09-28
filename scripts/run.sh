#!/bin/sh

NVM_DIR=$HOME/.nvm
NODE_DIR=$NVM_DIR/versions/node/v14.17.4/bin
#NODE=$NODE_DIR/node
NODE=node
APP_DIR=$HOME/Dev/_projects/calsync
APP=$APP_DIR/dist/app.js

source $NVM_DIR/nvm.sh && cd $APP_DIR && $NODE $APP

