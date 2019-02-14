# check for prerequisites

if [[ -z "${PUREWEB_HOME}" ]]; then
    echo "PUREWEB_HOME environment variable is not set"
    exit 1
else
	echo "PUREWEB_HOME=${PUREWEB_HOME}"
fi

if [[ -z "${PUREWEB_LIBS}" ]]; then
    echo "PUREWEB_LIBS environment variable is not set"
    exit 1
else
	echo "PUREWEB_LIBS=${PUREWEB_LIBS}"
fi

echo "Checking node installed"
node --version &> /dev/null
if [ $? != 0 ]; then
    echo "node.js is not installed - see https://nodejs.org/en/download/"
    exit 1
fi

echo "Checking bower installed"
bower --version &> /dev/null
if [ $? != 0 ]; then
    echo "bower is not installed - use: npm install -g bower"
    exit 1
fi

# Deploy the Scribble HTML5 sample to Tomcat
echo "Deploying Scribble to Tomcat"
cd Scribble
bower install
if ! [ -d "${PUREWEB_HOME}/tomcat-server/webapp/bower_components" ]; then
	mkdir "${PUREWEB_HOME}/tomcat-server/webapp/bower_components"
fi
cp -r bower_components/* ${PUREWEB_HOME}/tomcat-server/webapp/bower_components
if ! [ -d "${PUREWEB_HOME}/tomcat-server/webapp/css" ]; then
	mkdir "${PUREWEB_HOME}/tomcat-server/webapp/css"
fi
cp -r css/* ${PUREWEB_HOME}/tomcat-server/webapp/css
if ! [ -d "${PUREWEB_HOME}/tomcat-server/webapp/js" ]; then
	mkdir "${PUREWEB_HOME}/tomcat-server/webapp/js"
fi
cp -r js/* ${PUREWEB_HOME}/tomcat-server/webapp/js
if ! [ -d "${PUREWEB_HOME}/tomcat-server/webapp/lib" ]; then
	mkdir "${PUREWEB_HOME}/tomcat-server/webapp/lib"
fi
if ! [ -d "${PUREWEB_HOME}/tomcat-server/webapp/lib/pureweb" ]; then
	mkdir "${PUREWEB_HOME}/tomcat-server/webapp/lib/pureweb"
fi
cp -r ${PUREWEB_LIBS}/HTML5/* ${PUREWEB_HOME}/tomcat-server/webapp/lib/pureweb
cp  index.html ${PUREWEB_HOME}/tomcat-server/webapp/ScribbleApp.html
sed -i 's/%PUREWEB_BASE_PATH%//' ${PUREWEB_HOME}/tomcat-server/webapp/ScribbleApp.html
cd ..

# Deploy the DDx HTML5 sample to Tomcat
echo "Deploying DDx to Tomcat"
cd DDx
bower install
cp -r bower_components/* ${PUREWEB_HOME}/tomcat-server/webapp/bower_components
cp -r css/* ${PUREWEB_HOME}/tomcat-server/webapp/css
cp -r js/* ${PUREWEB_HOME}/tomcat-server/webapp/js
cp  index.html ${PUREWEB_HOME}/tomcat-server/webapp/DDxApp.html
sed -i 's/%PUREWEB_BASE_PATH%//' ${PUREWEB_HOME}/tomcat-server/webapp/DDxApp.html
cd ..

echo "Samples deployed to Tomcat"
