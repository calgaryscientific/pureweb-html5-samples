#!/bin/bash
# deploy.sh
# Deploy sample to PureWeb Server

echo Deploying to PureWeb server: PUREWEB_HOME=${PUREWEB_HOME}
SAVE_DIR=`pwd`
cd `dirname $0`
cp *.html ${PUREWEB_HOME}/webapp
cp *.js ${PUREWEB_HOME}/webapp
cp -r ./css ${PUREWEB_HOME}/webapp
cp -r ./img ${PUREWEB_HOME}/webapp
mkdir ${PUREWEB_HOME}/webapp/lib/pureweb/
cp ${PUREWEB_LIBS}/HTML5/pureweb.min.js ${PUREWEB_HOME}/webapp/lib/pureweb/
cd ${SAVE_DIR}