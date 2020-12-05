#!/bin/sh

NODE_DIR=$HOME/.nvm/versions/node/v14.10.1/bin
APP_DIR=$HOME/Dev/+projects/calsync
NODE=$NODE_DIR/node
APP=$APP_DIR/dist/app.js

cd $APP_DIR && $NODE $APP

