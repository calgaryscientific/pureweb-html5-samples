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
    var encoderFormat = new pureweb.client.EncoderFormat('video/h264', 30, params);
    
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

    //register event listener for connected changed to create the Asteroids View, and session state changed
    pureweb.listen(client, pureweb.client.WebClient.EventType.CONNECTED_CHANGED, onConnectedChanged);
    pureweb.listen(client, pureweb.client.WebClient.EventType.SESSION_STATE_CHANGED, onSessionStateChanged);    
   
    //Attach the listeners for disconnection events.
    setDisconnectOnUnload(true);
    
    //add an app state value changed handler to change the background image each time play
    //progresses a level.
    pureweb.getFramework().getState().getStateManager().addValueChangedHandler('Level', onLevelChanged);

    var ua = navigator.userAgent.toLowerCase();
    var isSafari = ((ua.indexOf('safari') > -1) && !(ua.indexOf('chrome') > -1))
    // setup sound value changed handlers, except for safari, which doesn't cache these audio files
    if(!isSafari){
        setupRepeatableClipPlayer('/Sounds/Fire', './sound/151013__bubaproducer__laser-classic-shot-2.mp3');
        setupRepeatableClipPlayer('/Sounds/Explosion', './sound/94185__nbs-dark__explosion.mp3');
        setupRepeatableClipPlayer('/Sounds/ShipExplosion', './sound/77339__tcpp__explosion-17.mp3');
        setupRepeatableClipPlayer('/Sounds/Collision', './sound/140867__juskiddink__boing.mp3');
        setupRepeatableClipPlayer('/Sounds/GameOver', './sound/175409__kirbydx__wah-wah-sad-trombone.mp3');

        setupOnOffClipPlayer('/Sounds/Ship1/Thrusters',  './sound/146770__qubodup__rocket-boost-engine-loop.mp3');
        setupOnOffClipPlayer('/Sounds/Ship1/Shields', './sound/66087__calmarius__forcefield.mp3');
        setupOnOffClipPlayer('/Sounds/Ship2/Thrusters', './sound/146770__qubodup__rocket-boost-engine-loop.mp3');
        setupOnOffClipPlayer('/Sounds/Ship2/Shields', './sound/66087__calmarius__forcefield.mp3');
    }        

    //now connect	
	
    if (pureweb.getClient().canJoinSession()) {
        pureweb.joinSession("Scientific");   
    }
    else {
        var host = '';
        var targetCluster = getParameterByName('targetCluster'); 
        
        if (targetCluster === ''){
            if (location.port === '2001' || location.port === '2002'){  
                host = location.hostname; 
            } else {
                var re = /(.*)\.pureweb\.io/;
                result = re.exec(location.hostname);
                host = result[1] + '.platform.pureweb.io';
            }
        } else {
            host = targetCluster;
        }                        
    
        var qs = '';
        if (location.search === ''){
            qs = '?name=AsteroidsJava';            
        } else {
            qs = location.search;
        }

        var uri = location.protocol + '//' + host +  '/pureweb/app' + qs;
        console.log('Connecting to backend at:', uri);
        
        // pureweb.connect(uri, {username: "admin", password: "admin"});
        client.setTestAuthCredentials('fc358a27-3ec8-4cea-a147-b2e4cf951930',
            'c8741972e2d08faf9d03e7f528b4e15c435a8e2b1c4f2b75c6576fedcd27eb35832344a5b7125a6baa55d8650be3797e868979f272d78ec00c658be96ccbd926');
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

//Connected changed event handler - creates the AsteroidsView View instance and completes initialization.
function onConnectedChanged(e) {
    if (e.target.isConnected()) {
        //register event listeners for connection stalled
        var client = pureweb.getClient();
        pureweb.listen(client, pureweb.client.WebClient.EventType.STALLED_CHANGED, onStalledChanged);

        //Initialize Diagnostics panel if there is one
        var diagnosticsPanel = document.getElementById('pwDiagnosticsPanel');
        if (diagnosticsPanel) {
            pureweb.client.diagnostics.initialize();
        }

        setupFPSCounter(asteroidsView);
        pureweb.listen(client.latency, pureweb.client.diagnostics.Profiler.EventType.COMPLETE, updateNetworkInformation)
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
            var msg = 'Unable to connect to the Asteroids service application.';
            var ex = pureweb.getClient().getAcquireException();
            if (ex) {
                msg += ' ' + ex.getMessage();
            }
            alert(msg);
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
        var path = './img/background' + level + '.jpg';
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
            fpsCounter.textContent = 'Fps: ' + fps.toFixed(3);
        }

        timeLastUpdate = now;
    };

    //listen for view updated events
    pureweb.listen(asteroidsView, pureweb.client.View.EventType.VIEW_UPDATED, onViewUpdated);
}

function updateNetworkInformation (){
    var client = pureweb.getClient();
    var pingCounter = document.getElementById('latency-counter');
    var bandwidthCounter = document.getElementById('bandwidth-counter');
    var encodingType = document.getElementById('encoder-type');
    var latency = client.latency.durationMs().toFixed(3);

    pingCounter.textContent = 'Ping: ' + latency;
    bandwidthCounter.textContent = 'Mbps: ' + client.mbps.rate.toFixed(3);
    encodingType.textContent = 'Mime: ' + asteroidsView.getEncodingType();
}

setupRepeatableClipPlayer = function(statePath, clipName) {
    var clip = clipName;
    var clipCount = 0;
    var valueChangedHandler = function(event) {
        var newClipCount = event.getNewValue();

        while (clipCount < newClipCount) {
            var audioClip = new Audio(clip);        
            audioClip.play();
            clipCount++;
        }
    }

    pureweb.getFramework().getState().getStateManager().addValueChangedHandler(statePath, valueChangedHandler);
}

setupOnOffClipPlayer = function(statePath, clipName) {
    var audioClip = new Audio(clipName); 
    audioClip.loop = true;    
    var valueChangedHandler = function(event) {
        if (event.getNewValue() === 'true') {
            audioClip.play();
        } else {
            audioClip.pause();     
        }
    }

    pureweb.getFramework().getState().getStateManager().addValueChangedHandler(statePath, valueChangedHandler);
}