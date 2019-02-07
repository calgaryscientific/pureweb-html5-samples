pureweb-html5-samples
=====================

The following notes outline what I did to get the HTML5 samples deployed to Tomcat from the command line and
running in Tomcat without the PureWeb Gravity environment. The instructions below assume the following that node and bower are both installed (the batch file DeployTomcat.bat will warn with instructions on what to do if not).

1. Downloaded Tomcat server zip artifact from Bamboo and unzip to c:\temp\PureWeb\tomcat-server.

2. Download the HTML5 SDK zip artifact from Bamboo and unzip to c:\temp\PureWeb\sdk\Libs\HTML5.

3. Build and deploy either the C++ or .NET samples to Tomcat as described in the README files for those samples.

4. Clone HTML5 samples repo to c:\temp\PureWeb\samples\HTML5

5. The expanded directory structure should mimic the PureWeb Gravity setup:
    
   C:\temp\PureWeb\samples\HTML5
   C:\temp\PureWeb\samples\HTML5\Scribble
   C:\temp\PureWeb\samples\HTML5\DDx
   C:\temp\PureWeb\sdk\Libs\HTML5
   C:\temp\PureWeb\tomcat-server
   C:\temp\PureWeb\tomcat-server\conf
   C:\temp\PureWeb\tomcat-server\docs
   C:\temp\PureWeb\tomcat-server\etc
   C:\temp\PureWeb\tomcat-server\tomcat
   C:\temp\PureWeb\tomcat-server\webapp

6. Open a command prompt in c:\temp\PureWeb and set environment variables:
   
   set PUREWEB_LIBS=c:\temp\PureWeb\sdk\Libs
   set PUREWEB_HOME=c:\temp\PureWeb
   
7. To deploy the HTML5 samples to Tomcat:
   
   cd c:\temp\PureWeb\samples\HTML5
   DeployTomcat

7. To run Tomcat
   a. a PureWeb license file is required and in must be placed in c:\temp\PureWeb\tomcat-server\conf
   b. cd c:\temp\PureWeb\tomcat-server\tomcat\bin
   c. catalina run
   d. Go to the apps page and run either DDx or Scribble.


