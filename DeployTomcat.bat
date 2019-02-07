echo off

if "%PUREWEB_HOME%" == "" (
    echo PUREWEB_HOME environment variable is not set
    goto :eof
)

if "%PUREWEB_LIBS%" == "" (
    echo PUREWEB_LIBS environment variable is not set
    goto :eof
)

echo node.js version:
call node --version
if errorlevel 1 (
    echo node.js is not installed - see https://nodejs.org/en/download/
    goto :eof
)

echo bower version:
call bower --version
if errorlevel 1 (
   echo bower is not installed - use: npm install -g bower
   goto :eof
)

rem Deploy the Scribble HTML5 sample to Tomcat
echo Deploying Scribble to Tomcat
cd Scribble
call bower install
xcopy /s /y bower_components %PUREWEB_HOME%\tomcat-server\webapp\bower_components\
xcopy /s /y css %PUREWEB_HOME%\tomcat-server\webapp\css\
xcopy /s /y js %PUREWEB_HOME%\tomcat-server\webapp\js\
xcopy /s /y %PUREWEB_LIBS%\HTML5 %PUREWEB_HOME%\tomcat-server\webapp\lib\pureweb\
powershell -Command "(gc index.html) -replace '%%PUREWEB_BASE_PATH%%', '' | Out-File %PUREWEB_HOME%\tomcat-server\webapp\ScribbleApp.html"
cd ..

rem Deploy the Scribble HTML5 sample to Tomcat
echo Deploying DDx to Tomcat
cd DDx
call bower install
xcopy /s /y bower_components %PUREWEB_HOME%\tomcat-server\webapp\bower_components\
xcopy /s /y css %PUREWEB_HOME%\tomcat-server\webapp\css\
xcopy /s /y js %PUREWEB_HOME%\tomcat-server\webapp\js\
xcopy /s /y %PUREWEB_LIBS%\HTML5 %PUREWEB_HOME%\tomcat-server\webapp\lib\pureweb\
powershell -Command "(gc index.html) -replace '%%PUREWEB_BASE_PATH%%', '' | Out-File %PUREWEB_HOME%\tomcat-server\webapp\DDxApp.html"
cd ..

echo Samples deployed to Tomcat

:eof
