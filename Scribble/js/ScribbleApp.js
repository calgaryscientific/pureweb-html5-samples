// Version 5.0.0-DevBuild
// Copyright (c) 2013 Calgary Scientific Inc., all rights reserved.
//

//IMPORTANT NOTE: This application is designed to show how to use PureWeb in its 
//most basic form.  As such, best practices for developing JavaScript code are 
//not always followed in the intrest of keeping the client code as simple as possible.
//
//Of particular note is the use of alert() and prompt() modal dialogs.  While these are 
//used throughout this client, their use in a production setting is highly discouraged as
//they block execution of the JavaScript thread, which will lead to the disconnection of 
//the PureWeb client if they are not quickly dismissed.  Developers should instead use 
//a non blocking modal such as those provided by JQuery or Boostrap, or simply window.console.log().
//For more information on this topic, please see the PureWeb release notes.



//Stores the collaboration URL when playing with another person
var shareUrl = null;

//keep track of last session state to report connection problems in onSessionStateChanged
var lastSessionState = null;

//Connect to the Scribble service application, setup event listeners, application
//state changed handlers. and add register a callback for window.onbeforeunload to
//disconnect from the service application before the page is unloaded.
function startScribble() {    
    var scribbleView = new pureweb.client.View({id: 'ScribbleView', viewName: 'ScribbleView'});
   
    pureweb.listen(scribbleView, pureweb.client.View.EventType.TOUCH_EVENT_RECEIVED, function(e) {
           var event = e.args;
           
           // ignore any touch events with more than one point
           if (event.touches.length > 1)
               event.cancelBubble = true;
       });
       
    window.addEventListener('shake', clearCanvas, false);
    
    //Attach the listeners for disconnection events.
    setDisconnectOnUnload(true);
       
    var client = pureweb.getClient();

    //register event listeners for connected changed to create the Scribble View instance, and session state changes
    pureweb.listen(client, pureweb.client.WebClient.EventType.CONNECTED_CHANGED, onConnectedChanged);
    pureweb.listen(client, pureweb.client.WebClient.EventType.SESSION_STATE_CHANGED, onSessionStateChanged);   
  
    //initialize the color select, and add an app state changed handler for color changes
    initializeColorSelect();
    var framework = pureweb.getFramework();
    framework.getState().getStateManager().addValueChangedHandler('ScribbleColor', onScribbleColorChanged);

    //register an event listener for state initialization so the color select can be initialized with
    //the default scribble color
    pureweb.listen(framework, pureweb.client.Framework.EventType.IS_STATE_INITIALIZED, onIsStateInitializedChanged);
    
    //everything is setup and ready to go - connect
    if (pureweb.getClient().canJoinSession()) {
        pureweb.joinSession("Scientific");   
    }
    else {
        var host = '';
        var targetCluster = getParameterByName('targetCluster'); 
        var name = getParameterByName('name');

        if (targetCluster === ''){
            if (location.port === '2001' || location.port === '2002'){  
                host = location.hostname; 
            } else {                
                var re = /(.*)\.pureweb\.io/;                
                result = re.exec(location.hostname);

                //If we're pulling this from scribble.pureweb.io bucket
                //we want to go to scribble.platform.pureweb.io
                //If we're pulling this form scribble-[foo].pureweb.io bucket
                //we want to go to scribble-foo.platform.pureweb.io
                if (result){
                    var hyphen = result[1].indexOf('-');
                    if (hyphen >= 0){
                        var env = result[1].substring((hyphen+1), result[1].length);
                        if (name === ''){
                            name = 'ScribbleCpp';
                        }
                        host = name + '-' + env + '.platform.pureweb.io';
                    } else {
                        host = result[1] + '.platform.pureweb.io';    
                    }
                } else {
                    host = location.hostname;
                }            
            }
        } else {
            host = targetCluster;
        }                        
    
        var qs = '';
        if (location.search === ''){
            qs = '?name=ScribbleCpp';
            name = 'ScribbleCpp';
        } else {
            qs = location.search;
        }

        var uri = location.protocol + '//' + host +  '/pureweb/app' + qs;
        console.log('Connecting to backend at:', uri);

        // pureweb.connect(uri, {username: "admin", password: "admin"});

        if ( name === "ScribbleCpp") {
         // for test of identity connect
            client.setTestAuthCredentials('666822c4-c87d-474e-a548-18770a580ac0',
                '47e6e5d96d8e83203ad52c47b6f43803ac520eb72776306c7eeb628337aacfa33bd09852580d36ccb21b26bbca59533d25267575b227f490f1e8ea01b6602f79');
        } 
        
        if ( name === "ScribbleCs") {
            client.setTestAuthCredentials('0fd537b9-587a-4281-8e08-e0d7ae0513b0',
                '892a46fb389a4e2f150e9a6d63ee767f749c038ad922bd2205ed663bd83a31f24a5fa778f025b93188ccf23f601d6e02b6e5d7f473ce76a3dcdd73a8772c04d4');
        }

        if ( name === "ScribbleJava") {
            client.setTestAuthCredentials('6288f8d1-577d-437d-8ebc-efd7cd6826df',
                '10c12d8fc81001b1e8c772b4311f492f15626e0323a70e05d1c939de093feb57e620fcbc4ebb280fcb36dc5c1137ae2ce3dd91d248213cfc6ae4224391b627cc');
        }

        pureweb.getClient().connectWithToken(uri);
    }
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

//This is important for tablets.  You typically want to have a PureWeb disconnection command
//fire when you close your browser window (or navigate away).  However, on tablets, you run 
//the risk that backgrounding the browser on an iOS or Android device might fire the disconnection
//and shut down your app.  This function will allow you to easily attach / detach the listeners 
//for these events.  You can then call this function to deactivate the listeners when you think 
//the user might be about to background your app (like when they collaborate and switch to the 
//email app to email the collaboration URL), then reattach when they have returned.
//Generally this approach is not necessary for desktop browsers.
function setDisconnectOnUnload(flag){
    if (flag){
        // setup the window.onbeforeunload callback to disconnect from the service application
        var f = function(e) {
            if (pureweb.getClient().isConnected()) {
                pureweb.getClient().disconnect(false);
            }
            return null;
        }
        window.onbeforeunload = f;
        window.onunload = f;    
    }
    else
    {
        window.onbeforeunload = null;
        window.onunload = null;    
    }
}

//Connected changed event handler - creates the ScribbleView View instance and initializes the
//diagnostics panel (if it is present).
function onConnectedChanged(e) {
    if (e.target.isConnected()) {
        //register event listeners for connection stalled
        var client = pureweb.getClient();
        pureweb.listen(client, pureweb.client.WebClient.EventType.STALLED_CHANGED, onStalledChanged);

        var diagnosticsPanel = document.getElementById('pwDiagnosticsPanel');
        if (diagnosticsPanel) {
            pureweb.client.diagnostics.initialize();
        }
    }
}

//Stalled state changed event handler - logs a message indicating if the connection to the service
//application has entered the stalled state, or whether it has recovered.
function onStalledChanged(event) {
    if (pureweb.getClient().isStalled()) {
        pureweb.getClient().logger.fine('Connection to the Scribble service application has stalled and may have been lost.');
    } else {
        pureweb.getClient().logger.fine('Connection to the Scribble service application has recovered.');
    }
}

//Session state changed event handler - checks for the failed state.
function onSessionStateChanged(event) {
    var sessionState = pureweb.getClient().getSessionState();
    if (sessionState === pureweb.client.SessionState.FAILED) {
        if (lastSessionState === pureweb.client.SessionState.CONNECTING) {
            //See note re: alert boxes at the top of the file
            var msg = 'Unable to connect to the Scribble service application.';
            var ex = pureweb.getClient().getAcquireException();
            if (ex) {
                msg += ' ' + ex.getMessage();
            }
            alert(msg);
        } else {
            //See note re: alert boxes at the top of the file
            alert('Connection to the Scribble service application has been lost. Refresh the page to restart.');
        }
    }
    lastSessionState = sessionState;
}

//Application state handler for color changes. Updates the selected color in the Color
//select to reflect application state (a collaborator may have changed the color, so this
//ensures the UI remains in synch with the collaborator).
function onScribbleColorChanged(e) {
    selectColor(e.getNewValue());
    
    //Example of using the diagnostics panel trace command.
    pureweb.client.diagnostics.trace("Color is now: " + e.getNewValue());    
}

//Event handler for is-state-initialized change events. Sets the initial color if the
//state has just been initialized in the Scribble client app.
function onIsStateInitializedChanged(e) {
    var framework = pureweb.getFramework();
    if (framework.isStateInitialized()) {
        selectColor(framework.getState().getValue('ScribbleColor'));
    }
}

//select the specified color in the color select
function selectColor(colorName) {
    if (colorName !== undefined && colorName !== null) {
        var colorSelect = document.getElementById('color');

        for (var i = 0; i < colorSelect.options.length; i++) {
            if (colorSelect.options[i].childNodes[0].nodeValue.toLowerCase() === colorName.toLowerCase()) {
                if (colorSelect.selectedIndex !== i) {
                    colorSelect.selectedIndex = i;
                }
                break;
            }
        }
    }
}

//Update application state with the new color selection.
function changeScribbleColor(e){
    pureweb.getFramework().getState().setValue('ScribbleColor', document.getElementById('color').value);
}

//Asynchronously create or revoke a share URL.
function generateShareUrl(){
    //Grab a local ref to the webclient (save some typing)
    var webClient = pureweb.getFramework().getClient();

    //If we don't have a share URL...
    if ((shareUrl === undefined) || (shareUrl === null)) {
        //Stop listening for disconnection events (as we expect the user to background the browser for emailing the collab url)
        setDisconnectOnUnload(false);
        //Generate a share URL (on the service)        
        webClient.getSessionShareUrlAsync('Scientific', '', 1800000, '', function(getUrl, exception) {
            //Call back for share URL generation:
            //If we got a valid Share URL
            if ((getUrl !== null) && (getUrl !== undefined)) {
                //Set it locally
                shareUrl = getUrl;

                //See note re: prompt boxes at the top of the file                
				if (window.prompt("Here is your collaboration URL:",getUrl)){
                    //Reattach the listeners for disconnection events
                    setDisconnectOnUnload(true);                    
                }
				
            } else {

                //See note re: alert boxes at the top of the file
                alert('An error occurred creating the share URL: ' + exception.description);
            }
        });
    } else {
        //If a share URL already exists, we just want to invalidate it
        webClient.invalidateSessionShareUrlAsync(shareUrl, function(exception) {
            if ((exception !== undefined) && (exception !== null)){
                alert('An error occurred invalidating the share URL: ' + exception);
            } else {

                shareUrl = null;
            }
        });
    }
}

//Queue a command to the service application to clear all scribbles.
function clearCanvas() {
    pureweb.getClient().queueCommand("Clear");
}

//Load the color select with PureWeb known colors - note that the color names need to be
//camelcased because this is the format the service application expects them in
function initializeColorSelect() {
    var camelCase = function(name) {
        name = '_' + name;
        return name.toLowerCase().replace(/_(.)/g, function(match, group) {
            return group.toUpperCase();
        });
    };

    var colorSelect = document.getElementById('color');

    for (var color in pureweb.PureWebKnownColor) {
         if (pureweb.PureWebKnownColor.hasOwnProperty(color)) {
             var camelCaseName = camelCase(color);
             colorSelect.options[colorSelect.options.length] = new Option(camelCaseName, camelCaseName);
         }
     }
}
