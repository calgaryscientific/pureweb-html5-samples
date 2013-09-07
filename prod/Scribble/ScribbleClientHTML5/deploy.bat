@echo off
@echo Deploying sample to PureWeb server: PUREWEB_HOME=%PUREWEB_HOME%
pushd %~dp0
xcopy /E /I /Y /D *.* %PUREWEB_HOME%\webapp
xcopy /E /I /Y /D  %PUREWEB_LIBS%\HTML5\*.* %PUREWEB_HOME%\webapp\lib\pureweb\
popd
