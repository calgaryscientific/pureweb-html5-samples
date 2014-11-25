//
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

var asteroidsView = null;

//Connect to the Asteroids service application, setup event listeners, application
//state changed handlers. and register a callback for window.onbeforeunload to
//disconnect from the service application before the page is unloaded.
function startAsteroids() {
    //Create the view object for when we're ready to connect
    asteroidsView = new pureweb.client.View({id: 'AsteroidsView', viewName: 'AsteroidsView'});

    //Set up the EncoderConfiguration
    //- only need to do this if you want to override the default configuration
    var params = {};

    //Special case for HTML - if the browser doesn't support binary responses
    //We need to ask for the response as Base64 character encoded
    if (!pureweb.getClient().supportsBinary()) {
        params = {'UseBase64': true};
    }

    //Set to low quality JPEG for performance over quality
    var encoderFormat = new pureweb.client.EncoderFormat('image/jpeg', 30, params);
    
    var encoderConfig = new pureweb.client.EncoderConfiguration(encoderFormat, encoderFormat);

    //You should set the configuration before connecting so that the service knows what format to serve up the view
    asteroidsView.setEncoderConfiguration(encoderConfig);

    var client = pureweb.getClient();

    // if  a mobile client, then show the image-based controls

    if (client.isMobile()) {
        document.getElementById('leftButton').style.visibility='visible';
        document.getElementById('rightButton').style.visibility='visible';
        document.getElementById('forwardButton').style.visibility='visible';
        document.getElementById('reverseButton').style.visibility='visible';
        document.getElementById('fireButton').style.visibility='visible';
        document.getElementById('shieldsButton').style.visibility='visible';
    }

    //register event listener for connected changed to create the Asteroids View
    pureweb.listen(client, pureweb.client.WebClient.EventType.CONNECTED_CHANGED, onConnectedChanged);
   
    //Attach the listeners for disconnection events.
    setDisconnectOnUnload(true);
    
    //add an app state value changed handler to change the background image each time play
    //progresses a level.
    pureweb.getFramework().getState().getStateManager().addValueChangedHandler('Level', onLevelChanged);

    //now connect
    pureweb.connect(location.href);
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

//Connected changed event handler - creates the AsteroidsView View instance and completes initialization.
function onConnectedChanged(e) {
    if (e.target.isConnected()) {
        //register event listeners for connection stalled and session state failed events
        var client = pureweb.getClient();
        pureweb.listen(client, pureweb.client.WebClient.EventType.STALLED_CHANGED, onStalledChanged);
        pureweb.listen(client, pureweb.client.WebClient.EventType.SESSION_STATE_CHANGED, onSessionStateChanged);

        //Initialize Diagnostics panel if there is one
        var diagnosticsPanel = document.getElementById('pwDiagnosticsPanel');
        if (diagnosticsPanel) {
            pureweb.client.diagnostics.initialize();
        }

        setupFPSCounter(asteroidsView);
    }
}

//Stalled state changed event handler - logs a message indicating if the connection to the service
//application has entered the stalled state, or whether it has recovered.
function onStalledChanged(event) {
    if (pureweb.getClient().isStalled()) {
        pureweb.getClient().logger.fine('Connection to the Asteroids service application has stalled and may have been lost.');
    } else {
        pureweb.getClient().logger.fine('Connection to the Asteroids service application has recovered.');
    }
}

//Session state changed event handler - checks for the failed state.
function onSessionStateChanged(event) {
    var sessionState = pureweb.getClient().getSessionState();
    if (sessionState === pureweb.client.SessionState.FAILED) {
        if (lastSessionState === pureweb.client.SessionState.CONNECTING) {
            //See note re: alert boxes at the top of the file
            alert('Unable to connect to the Asteroids service application.');
        } else {
            //See note re: alert boxes at the top of the file            
            alert('Connection to the Asteroids service application has been lost. Refresh the page to restart.');
        }
    }
    lastSessionState = sessionState;
}

//Clicking the start button will prompt you for your name and set it via a PureWeb command
function getName() {
    var name = window.prompt("What is your name?","Anonymous");
    pureweb.getClient().queueCommand('SetName', {"Name" : name});
}

//Key codes for simulating key events (used for the buttons on the bottom of the screen
var FIRE_KEYCODE = 32; //Space key
var THRUST_KEYCODE = 38; //Up cursor key
var REVERSE_KEYCODE = 40; //Down cursor key
var LEFT_KEYCODE = 37; //Left cursor key
var RIGHT_KEYCODE = 39; //Right cursor key
var SHIELDS_KEYCODE = 83; //'s' key

//When a user clicks on a blue button (ex. fire)
function simKeyDown(e, keyCode) {
     //Suppress the default action
    e.preventDefault();

    if (e) {
        var btn = e.target;
        btn.style.backgroundColor='#9090E0';
    }

    //Simulate a keyboard event
    queueKeyboardEvent('KeyDown', keyCode);
}

//When a user unclicks a blue button
function simKeyUp(e, keyCode) {
    e.preventDefault();
    
    if (e) {
        var btn = e.target;
        btn.style.backgroundColor='transparent';
    }

    queueKeyboardEvent('KeyUp', keyCode);
}

//Send a keyboard event using a PureWeb command
function queueKeyboardEvent(eventType, keyCode) {
    //Create the keyboard event as a JS object
    var parameters = {
        'EventType': eventType,
        'Path': 'AsteroidsView',
        'KeyCode': keyCode,
        'CharacterCode': 0,
        'Modifiers': 0
    };
    //Send the PW command
    pureweb.getClient().queueCommand('InputEvent', parameters);
}

//Wrapper for touch down events
function touchDown(e) {
    e.preventDefault();
    simKeyDown(e, FIRE_KEYCODE);
    return false;
}

//Wrapper for touch up events
function touchUp(e) {
    e.preventDefault();
    simKeyUp(e, FIRE_KEYCODE);
    return false;
}

//Fired when the user clicks the 'Share' button
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

//When the level changes in AppState
function onLevelChanged(event){
    var level = 0;
    //Get the new value from the event
    var val = pureweb.util.tryParse(event.getNewValue(), Number);
    //Change the background
    if ((val !== null) && (val !== undefined)){
        level = val % 5;
        var path = '/img/background' + level + '.jpg';
        document.getElementById('backgroundImg').src = path;
    }
}

//Initialize the Frames-per-second counter in the top right corner
function setupFPSCounter(asteroidsView) {
    var timeLastUpdate = -1;
    var interUpdateTimes = [];
    var cumInterUpdateTimes = 0;
    var fpsCounter = document.getElementById('fps-counter');

    //Fires when the PW view is updated
    var onViewUpdated = function() {
        var now = Date.now();

        if (timeLastUpdate > 0) {
            var interUpdateTime = now - timeLastUpdate;
            timeLastUpdate = now;
            var numInterUpdateTimes = interUpdateTimes.length;

            if (numInterUpdateTimes === 100) {
                cumInterUpdateTimes -= interUpdateTimes[0];
                interUpdateTimes.splice(0, 1);
            }

            cumInterUpdateTimes += interUpdateTime;
            interUpdateTimes.push(interUpdateTime);
            var fps = 1000.0 / (cumInterUpdateTimes / numInterUpdateTimes);
            fpsCounter.textContent = 'FPS: ' + fps.toFixed(3);
        }

        timeLastUpdate = now;
    };

    //listen for view updated events
    pureweb.listen(asteroidsView, pureweb.client.View.EventType.VIEW_UPDATED, onViewUpdated);
}
