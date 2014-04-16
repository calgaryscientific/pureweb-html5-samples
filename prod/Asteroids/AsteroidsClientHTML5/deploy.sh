#!/bin/bash
# deploy.sh
# Deploy sample to PureWeb Server

echo Deploying to PureWeb server: PUREWEB_HOME=${PUREWEB_HOME}
SAVE_DIR=`pwd`
cd `dirname $0`
cp -a *.html ${PUREWEB_HOME}/webapp
cp -a *.js ${PUREWEB_HOME}/webapp
cp -ar ./css ${PUREWEB_HOME}/webapp
cp -ar ./img ${PUREWEB_HOME}/webapp
mkdir ${PUREWEB_HOME}/webapp/lib/pureweb/
cp -a ${PUREWEB_LIBS}/HTML5/pureweb.min.js ${PUREWEB_HOME}/webapp/lib/pureweb/
cd ${SAVE_DIR}