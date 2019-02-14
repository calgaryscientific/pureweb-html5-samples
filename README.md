PureWeb sample HTML5 clients
=====================

This repository contains sample HTML5 clients created using the PureWeb software development kit (SDK). The PureWeb SDK combines remote visualization, interactive 3D, and synchronous distributed collaboration technologies, bringing the power of highly sophisticated graphics applications to the mobile world. More information on the SDK is available on our [developer site](https://www.pureweb.io/).

The SDK provides APIs for developers to create their own applications, and the samples in this repository are intended both as a learning tool and a quick start point. They are simple yet functional applications that illustrate all the key fundamentals of the APIs. There are two samples available:
* Scribble: a simple canvas which allows users to draw, change pen color, and erase drawings; the collaboration feature enables multiple users to interact simultaneously with the canvas. Scribble is our main sample application, and the one that we recommend for developers who are new to the SDK.
* DDx: a web interface used internally by the PureWeb development team to exercise and test the features of the APIs. You may find this sample code useful as additional examples of the API’s core methods. Note, however, that we do not provide specific instructions on how to build and deploy the DDx client.

There are three main components to solutions built using the PureWeb SDK, and you must install all three in order to have a working application:
* a client interface that resides on end user devices (such as the sample clients in this repository)
* a service application that handles all the heavy computation, data processing and image rendering (such as the ones in the repositories for the [C++ sample services](https://github.com/calgaryscientific/pureweb-cpp-samples) and [.Net sample services](https://github.com/calgaryscientific/pureweb-dotnet-samples); service applications can reside on a remote server
* the PureWeb server, a middle-tier layer based on Tomcat technology, for which you must obtain a license. You can obtain a free trial license by contacting our support team at support@pureweb.com. 

Because of the interdependency of these components, they must be installed together, in a particular order that allows the creation of the required directory structure. For complete instructions, refer to the [PureWeb documentation](http://docs.pureweb.io/sdk5.0/content/setup/installation.html).

These samples in this repository are provided under the Apache 2 license; see the LICENSE file for the full text.



