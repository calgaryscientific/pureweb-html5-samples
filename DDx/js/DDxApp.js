// Version 5.0.0-DevBuild
// Copyright (c) 2012 Calgary Scientific Inc., all rights reserved.
//

goog.provide('ddxclient');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.string');
goog.require('goog.array');
goog.require('goog.userAgent.product');

goog.require('pureweb');
goog.require('pureweb.IllegalArgumentException');
goog.require('pureweb.SupportedEncoderMimeType');
goog.require('pureweb.client.Framework');
goog.require('pureweb.client.WebClient');
goog.require('pureweb.client.View');
goog.require('pureweb.client.EncoderConfiguration');
goog.require('pureweb.client.EncoderFormat');
goog.require('pureweb.client.CustomRenderer');
goog.require('pureweb.xml.XmlUtility');
goog.require('pureweb.client.collaboration.AcetateToolset');
goog.require('pureweb.client.collaboration.CursorPositionTool');
goog.require('pureweb.client.collaboration.PolylineTool');

/**
 * Override default logging configuration

purewebLogConfig = function() {
    return {
        'goog': pureweb.util.loggingLevel.CONFIG,
        'goog.dom': pureweb.util.loggingLevel.FINER,
        'pureweb': pureweb.util.loggingLevel.FINEST
    };
};

 **/
/**
 * Map if encoder configuration objects for supported client formats, keyed by MimeType
 */
ddxclient.encoderConfigs = {};

/**
 * Connect to the DDx service app.
 */
ddxclient.attachListeners = function(e) {
    pureweb.listen(pureweb.getFramework().getCollaborationManager(),
                       pureweb.client.CollaborationManager.EventType.IS_INITIALIZED_CHANGED,
                       ddxclient.updateOwnerSession);
    pureweb.listen(pureweb.getClient(),
                       pureweb.client.WebClient.EventType.CONNECTED_CHANGED,
                       ddxclient.connectedChanged_);
    pureweb.listen(pureweb.getClient(),
                       pureweb.client.WebClient.EventType.STALLED_CHANGED,
                       ddxclient.stalledChanged_);
    pureweb.listen(pureweb.getClient().getMultiWindow(),
                       pureweb.client.MultiWindow.EventType.MULTI_WINDOW_MESSAGE,
                       ddxclient.onMultiWindowMessage_);
    pureweb.listen(pureweb.getClient().getMultiWindow(),
                       pureweb.client.MultiWindow.EventType.CHILD_WINDOW_CLOSED,
                       ddxclient.onChildWindowClosed_);    
    pureweb.listen(pureweb.getClient(),
                       pureweb.client.WebClient.EventType.SESSION_STATE_CHANGED,
                       ddxclient.onSessionStateChanged);    
    pureweb.listen(pureweb.getClient(),
                       pureweb.client.WebClient.EventType.MULTIPART_HANDLER_EXCEPTION_OCCURRED,
                       ddxclient.handleExceptionInHandler_);
    pureweb.listen(pureweb.getClient().getSessionStorage(),
                        pureweb.client.SessionStorage.EventType.KEY_ADDED,
                        ddxclient.storageKeyAdded);
};
  
ddxclient.connect = function() {
    ddxclient.attachListeners();

    var client = pureweb.getClient();
    
    //now connect - connection path depends on whether we are talking to a PW5+ or PW4
    //server. In the former case, there will be a cluster address.

    var connectToPlatform = function() {
        if (pureweb.canJoinPlatformSession(location.href)) {
            pureweb.joinPlatformSessionFromUri(location.href, "Scientific");   
        }
        else {
            var host = ddxclient.getPlatformHostname();
                                       
            var qs = '';
            var name = getParameterByName('name');
            if (location.search === ''){
                qs = '?name=DDxCpp';
                name = 'DDxCpp';
            } else {
                qs = location.search;
            }

            var uri = location.protocol + '//' + host +  '/pureweb/app' + qs;
            console.log('Connecting to backend at:', uri);

            // pureweb.connect(uri, {username: "admin", password: "admin"}); 
            if ( name === "DDxCpp") {
                client.setTestAuthCredentials('5a8646cb-c114-4936-b079-4e07cb678953',
                    'bbbc22e3007585eb35a7f98bb42eeeee785605b38586dc0e01c8181cc33b0bde542fc8473ab4e650c6527e893e2a0c64a63420344beab3c29bde38c8cae86319');
            }

            if ( name === "DDxCs") {
                client.setTestAuthCredentials('52d2c1ff-33f7-4a90-8604-5a04e3b0eb54',
                    '0dadac0bcb98d9aed64846e46184e7fa762d592bc46554c593aad6618af46a6ea424e2f2faa760723ac573adccacb254534abfb68d7af273fc366aaef0b29926');
            }

            if ( name === "DDxJava") {
                client.setTestAuthCredentials('39f30104-0447-410d-85d2-965bfc2c0592',
                    'f839ae9be15e4b25bdb63c99300f274203154f3387e9bb9b01f78d10744a96a5fcf29d3f3e518dd92ecc119a2caa9e745fd47e461da0792aeeb259a4de35cf4a');
            }

            pureweb.getClient().connectToPlatform(uri);
        }
    };

    var connectToServer = function() {
        pureweb.connectToServer(location.href);        
    };

    var possiblePlatformURL = location.protocol + '//' + ddxclient.getPlatformHostname();
    pureweb.isPlatformEndpoint(possiblePlatformURL, function(isPlatform) {
        if (isPlatform) {
            connectToPlatform();
        } else {
            connectToServer();
        }        
    });
};

ddxclient.getPlatformHostname = function(){
    var host = null;
    var targetCluster = getParameterByName('targetCluster');
    var name = getParameterByName('name');

    if (targetCluster === ''){
        if (location.port === '2001' || location.port === '2002'){  
            host = location.hostname; 
        } else {
            var re = /(.*)\.pureweb\.io/;                
            result = re.exec(location.hostname);

            if (name === ''){
                name = 'DDxCpp';
            }

            //If we're pulling this from ddx.pureweb.io bucket
            //we want to go to ddx.platform.pureweb.io
            //If we're pulling this form ddx-[foo].pureweb.io bucket
            //we want to go to ddx-foo.platform.pureweb.io
            if (result){
                var hyphen = result[1].indexOf('-');
                if (hyphen >= 0){
                    var env = result[1].substring((hyphen+1), result[1].length);
              
                    host = name + '-' + env + '.platform.pureweb.io';
                } else {
                    host = name + '.platform.pureweb.io';    
                }
            } else {
                host = location.hostname;
            }
        }
    } else {
        host = targetCluster;
    }
    return host; 
};

ddxclient.disconnect = function() {
    pureweb.disconnect();
    // just reload the page if connected to the platform otherwise if 
    // it is a standalone server redirec to the view URL so a new instance
    // of DDx is not immediately restarted (otherwise can get a 503 error if
    // server is at maximum load and the previuse DDx instance has not had
    // sufficient time to shutdown - see PWEB-7413)
    pureweb.isPlatformEndpoint(location.href, function(isPlatform) {
        if (isPlatform) {
            location.reload();
        } else {
            location.assign(location.origin + "/pureweb/view?name=DDx&client=html5");
        }        
    });
};

ddxclient.addWindow = function() {
    pureweb.getFramework().createNewWindow('top=1,left=1,location=1,menubar=1,resizable=1,scrollbars=1,titlebar=1,toolbar=1', true);
};

ddxclient.rotateViewBkColors = function() {
    pureweb.getFramework().getClient().queueCommand('RotateDDxViewBkColors');
};

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

ddxclient.windowNumber = 0;
ddxclient.addWindow = function() {
    var windowName = 'DDx Client ' + ddxclient.windowNumber;
    pureweb.getFramework().createNewWindow('top=0,left=1,location=1,menubar=1,resizable=1,scrollbars=1,titlebar=1,toolbar=1', true);
    ddxclient.windowNumber++;
};


/**
 * Data types for testing babel
 */
ddxclient.babelData = {
        'Character' : {type : 'Character', data : 'c'},
        'Integer-Positive': { type : 'Integer', data : 1234567890},
        'Integer-Negative': { type : 'Integer', data : -1234567890},
        'Unsigned-Integer': { type : 'Unsigned Integer', data : 4294967295},
        'Long-Positive': { type : 'Long', data : 12345678901},
        'Long-Negative': { type : 'Long', data : -12345678901},
        'Float-NaN': { type : 'Float', data : Number.NaN},
        'Float-PositiveZero': { type : 'Float', data : (0).toExponential(7)},
        'Float-NegativeZero': { type : 'Float', data : (-0).toExponential(7)},
        'Double-Positive': { type : 'Double', data : 12345678901.1234},
        'Double-Negative': { type : 'Double', data : -12345678901.1234},
        'Double-NaN' : { type : 'Double', data : Number.NaN},
        'Double-PositiveZero': { type : 'Double', data : 0},
        'Double-NegativeZero': { type : 'Double', data : -0},
        'Decimal-Positive': { type : 'Decimal', data : 12345678901.1234},
        'Decimal-Negative': { type : 'Decimal', data : -12345678901.1234},
        'Boolean-True': { type : 'Boolean', data : true},
        'Boolean-False': { type : 'Boolean', data : false},
        //Only works if rounding to 7 points of precision so it matches the C# result
        //http://msdn.microsoft.com/en-us/library/b1e65aza.aspx
        'Float-Positive': { type : 'Float', data : (12345678901.1234).toExponential(7)},
        'Float-Negative': { type : 'Float', data : (-12345678901.1234).toExponential(7)},
        'Float-PositiveInfinity': { type : 'Float', data : Number.POSITIVE_INFINITY},
        'Float-NegativeInfinity': { type : 'Float', data : Number.NEGATIVE_INFINITY},
        'Double-PositiveInfinity': { type : 'Double', data : Number.POSITIVE_INFINITY},
        'Double-NegativeInfinity': { type : 'Double', data :  Number.NEGATIVE_INFINITY}

        //These just won't work on JS
        //'Byte' : { type : 'Byte', data : (byte)255},
        //'Unsigned-Long': { type : 'Unsigned Long', data : 18446744073709551615},
};

/**
 * Phrases used for testing the babel tab
 */
ddxclient.babelPhrases = {
    'de-DE':{type: 'text', data: 'Kennwortänderung fehlgeschlagen.'},
    'en-US':{type: 'text', data: 'Password change failed!'},
    'es-ES':{type: 'text', data: 'Error al cambiar la contraseña.'},
    'fr-FR':{type: 'text', data: 'Le changement de mot de passe a échoué.'},
    'it-IT':{type: 'text', data: 'Modifica password non riuscita.'},
    'jp-JP':{type: 'text', data: 'パスワードの変更に失敗しました!'},
    'ko-KR':{type: 'text', data: '암호 다시 설정 실패'},
    'zh-CN':{type: 'text', data: '密码更改失败!'},
    'zh-TW':{type: 'text', data: '變更密碼失敗'},
    'unicode-escape':{type: 'text', data: '\u0CA0_\u0CA0'},
    'unicode-emoji':{type: 'text', data: '\ud83d\udc27\ud83d\ude3a\ud83d\ude06'}
};

ddxclient.DDxEcho = '/DDx/Echo/';
ddxclient.DDxEchoContent = 'Content';
ddxclient.DDxEchoType = 'Type';
ddxclient.DDxEchoKey = 'Key';
ddxclient.DDxFPS = 'Fps: ';
ddxclient.DDxLatency = 'Ping: '
ddxclient.DDxBandwidth = 'Mbps: '
ddxclient.DDxViewSize = '';
ddxclient.imageCounter = 0;
ddxclient.lastSessionState = null;
ddxclient.babelTestInProgress = false;
ddxclient.babelSessionStorageKeysPending = [];

ddxclient.setupCounters = function(pgView) {
    var view_timeLastUpdate = -1;
    var view_interUpdateTimes = [];
    var view_cumInterUpdateTimes = 0;
    var viewUpdatedTimer = ddxclient.setupFpsTimer(view_interUpdateTimes, view_timeLastUpdate);

    //Fires when the PW view is updated
    var onViewUpdated = function() {
         // if view isn't updated every half second, clear the fps buffer
        if (goog.isDefAndNotNull(viewUpdatedTimer)){
            clearTimeout(viewUpdatedTimer);
            viewUpdatedTimer = ddxclient.setupFpsTimer(view_interUpdateTimes, view_timeLastUpdate);
        } 
        var now = Date.now();

        if (view_timeLastUpdate > 0) {
            var interUpdateTime = now - view_timeLastUpdate;
            view_timeLastUpdate = now;
            var numInterUpdateTimes = view_interUpdateTimes.length;

            if (numInterUpdateTimes === 100) {
                view_cumInterUpdateTimes -= view_interUpdateTimes[0];
                view_interUpdateTimes.splice(0, 1);
            }

            view_cumInterUpdateTimes += interUpdateTime;
            view_interUpdateTimes.push(interUpdateTime);
            var fps = 1000.0 / (view_cumInterUpdateTimes / numInterUpdateTimes);
            ddxclient.DDxFPS = 'Fps: ' + fps.toFixed(3);
        }

        view_timeLastUpdate = now;
    };

    var onViewResized = function() {
        var size = pgView.getSize();
        ddxclient.DDxViewSize = size.width + ' x ' + size.height;
    }
    
    //listen for view updated events
    pureweb.listen(pgView, pureweb.client.View.EventType.VIEW_UPDATED, onViewUpdated);
    pureweb.listen(pgView, pureweb.client.View.EventType.VIEW_RESIZED, onViewResized);
}

ddxclient.setupFpsTimer = function(interUpdateTimes, timeLastUpdate){
    var fpsTimer = setTimeout(function(){
        interUpdateTimes = [];
        timeLastUpdate = 0;
        ddxclient.DDxFPS = 'Fps: 0';
        ddxclient.pgView.annotateView_();
    }, 500);

    return fpsTimer;
}

ddxclient.runBabelTest = function(){
    if (!ddxclient.babelTestInProgress){
        ddxclient.resetBabelTest();
        //Start testing    
        ddxclient.babelTestInProgress = true;
        //Because we're attaching session storage listeners dyanmically, we need some indication of when the test is done
        //otherwise the session storage table can get into a state (by hammering the test bable button) where it will not 
        //reflect what is actually in session storage.
        ddxclient.babelSessionStorageKeysPending = Object.keys(ddxclient.completeBabel);
        goog.array.sort(ddxclient.babelSessionStorageKeysPending);
        ddxclient.testBabel(ddxclient.babelPhrases);
        ddxclient.testBabel(ddxclient.babelData);
    }
};


ddxclient.testBabel = function(babelContent){
    for (var key in babelContent){
        if (babelContent.hasOwnProperty(key)){
            var path = ddxclient.DDxEcho + key;

            // AppState
            pureweb.getFramework().getState().setValue(path, '---');
            ddxclient.setBabelCellState('pwDiagnosticsBableAppState_', key, undefined, 'Checking...');
            var dict = {};
            dict[ddxclient.DDxEchoKey] = key;
            dict[ddxclient.DDxEchoContent] = babelContent[key].data;
            dict[ddxclient.DDxEchoType] = babelContent[key].type;
            
            // Commands
            pureweb.getClient().queueCommand('Echo', dict, ddxclient.onEchoResponse);
            ddxclient.setBabelCellState('pwDiagnosticsBableCommand_', key, undefined, 'Checking...');

            // Session Storage
            pureweb.getClient().getSessionStorage().addValueChangedHandler(key, ddxclient.onEchoSessionStorageValueChanged);
            pureweb.getClient().getSessionStorage().setValue(key, dict[ddxclient.DDxEchoContent]);
            ddxclient.setBabelCellState('pwDiagnosticsBableSessionStorage_', key, undefined, 'Checking...');
        }
    }
};

ddxclient.resetBabelTest = function(){
    // Clean app state
    pureweb.getFramework().getState().getStateManager().deleteTree(ddxclient.DDxEcho);

    for (var key in ddxclient.completeBabel){
        //Clean session storage / de-register listeners.    
        pureweb.getClient().getSessionStorage().removeAllValueChangedHandlers(key);
        pureweb.getClient().getSessionStorage().removeValue(key); 
        ddxclient.deleteSessionStorageTableRow(key);

        ddxclient.setBabelCellState('pwDiagnosticsBableAppState_', key, undefined, '');
        ddxclient.setBabelCellState('pwDiagnosticsBableCommand_', key, undefined, '');
        ddxclient.setBabelCellState('pwDiagnosticsBableSessionStorage_', key, undefined, '');
    }
};

ddxclient.onEchoResponse = function(sender, args){
    var key = pureweb.xml.XmlUtility.getText({parent: args.getResponse(), childPath: ddxclient.DDxEchoKey});
    ddxclient.checkLocaleData(ddxclient.completeBabel, key, args.getResponse(), ddxclient.DDxEchoContent, true, false);
};

ddxclient.onEchoStateChanged = function(args){
    var newVal = args.getNewValue();

    // Ignore checking on the empty value as that was to initialize the state before the actual value change
    if (newVal === '---') {
        return;
    }

    var key = args.getPath().slice(ddxclient.DDxEcho.length);
    var contentElement =  pureweb.getFramework().getState().getStateManager().getTreeAsXml(args.getPath());

    ddxclient.checkLocaleData(ddxclient.completeBabel, key, contentElement, '', false, true);

};

ddxclient.onEchoSessionStorageValueChanged = function(args){
    var newContent = args.getNewValue();
    var key = args.getKey();
     
    if (ddxclient.completeBabel[key].type === 'DateTime'){
        newContent = pureweb.util.tryParse(newContent, Date);
    }
     
    var same = ddxclient.same(newContent, ddxclient.completeBabel[key].data);
 
    ddxclient.setBabelCellState('pwDiagnosticsBableSessionStorage_', key, same, newContent);
};
 
ddxclient.same = function(val1, val2){
    var same = false;
     //Because NaN !== NaN
    if (isNaN(val1) && isNaN(val2)){
        same = true;
     }else{
        if ((val1 !== null) && (val2 !== null)){
            same = (val1.toString() === val2.toString());
        }
    }
    return same;
};

ddxclient.checkLocaleData = function(babelContents, key, content, contentPath, checkCommandResponse, checkAppState){
    var newContent = null;

    if ((babelContents[key].type === 'text')||
           (babelContents[key].type === 'Character')){
          newContent = pureweb.xml.XmlUtility.getText({parent: content, childPath: contentPath});
    } else if ((babelContents[key].type === 'Integer') ||
              (babelContents[key].type === 'Double') ||
              (babelContents[key].type === 'Long') ||
              (babelContents[key].type === 'Unsigned Integer') ||
              (babelContents[key].type === 'Decimal') ||
              (babelContents[key].type === 'Unsigned Long')) {
        newContent = pureweb.xml.XmlUtility.getTextAs({parent: content, childPath: contentPath}, Number);
    } else if (babelContents[key].type === 'Float'){
        newContent = pureweb.xml.XmlUtility.getTextAs({parent: content, childPath: contentPath}, Number);
        newContent = newContent.toExponential(7);
    } else if (babelContents[key].type === 'Boolean'){
        newContent = pureweb.xml.XmlUtility.getTextAs({parent: content, childPath: contentPath}, Boolean);
    } else if (babelContents[key].type === 'DateTime'){
        newContent = pureweb.xml.XmlUtility.getTextAs({parent: content, childPath: contentPath}, Date);
    } 

    var same = ddxclient.same(newContent, babelContents[key].data);

    if(checkCommandResponse){
        ddxclient.setBabelCellState('pwDiagnosticsBableCommand_', key, same, newContent);
    }

    if(checkAppState){
        ddxclient.setBabelCellState('pwDiagnosticsBableAppState_', key, same, newContent);
    }
};


ddxclient.setBabelCellState = function(table, key, state, content){
    var div = document.getElementById(table + key);
    if (div){
        if (state === true){
            div.innerHTML = '<span style="color:green;">'+ content + '</span>';
        }else if (state === false){
            div.innerHTML = '<span style="color:red;">'+ content + '</span>';
        }else if (state === undefined){
            div.innerHTML = '<span style="color:yellow;">'+ content + '</span>';
        }
    }
};

/**
 * Map of checkbox Ids to state paths
 */
ddxclient.booleanAppStateMap = {
    'chkAsyncImgGen' : '/DDx/AsyncImageGeneration',
    'chkUseDeferredRendering' : '/DDx/UseDeferredRendering',
    'chkUseClientSize' : '/DDx/UseClientSize',
    'chkShowMousePos' : '/DDx/ShowMousePos'
};

/**
 * Map of paths to state handlers
 */
ddxclient.booleanAppStateMapHanders = {
    '/DDx/UseTiles' : ddxclient.onUseTilesChanged
};

/**
 * AppState handler called when ever a change is made on any of the PGView checkboxes
 */
ddxclient.booleanAppStateBaseHandler = function(e){
    var path = e.getPath();
    //Get and parse value from state
    var boolValue =  pureweb.util.parseBoolean(pureweb.getFramework().getState().getValue(path));

    //Loop through map
    for(var prop in ddxclient.booleanAppStateMap) {
        if(ddxclient.booleanAppStateMap.hasOwnProperty(prop)) {
            //Look for path
            if(ddxclient.booleanAppStateMap[prop] === path) {
                //Use key to get checkbox
                var checkbox = document.getElementById(prop);

                //Change value if necessary
                if (checkbox.checked !== boolValue){
                    checkbox.checked = boolValue;
                }

                //Invoke callback if it exists
                if (ddxclient.booleanAppStateMapHanders[path] !== undefined){
                    ddxclient.booleanAppStateMapHanders[path].call();
                }
            }
        }
    }
};

/**
 * Input event handler for the checkboxes at the bottom of PGView
 */
ddxclient.booleanAppStateHandler = function(e){
    var path = ddxclient.booleanAppStateMap[e.id];
    pureweb.getFramework().getState().setValue(path, e.checked.toString());
};

/**
 * Connected changed event handler. Registers to disconnect on unload, and creates the views.
 * @private
 */
ddxclient.connectedChanged_ = function(e) {
    if (e.target.isConnected()) {
        // add a listener to disconnect before page is unloaded

        window.onbeforeunload = window.onunload = function(e) {
            var webClient = pureweb.getFramework().getClient();
            if (webClient.isConnected()) {
                webClient.disconnect(false);
            }
        };

        // create an acetate toolset for the views to use

        var toolset = new pureweb.client.collaboration.AcetateToolset();       
        var client = pureweb.getClient();

        var cursorPositionToolDelegate = new pureweb.client.collaboration.CursorPositionTool();
        var polylineToolDelegate = new pureweb.client.collaboration.PolylineTool();

        var cursorPositionTool = toolset.registerToolDelegate(cursorPositionToolDelegate);
        var polylineTool = toolset.registerToolDelegate(polylineToolDelegate);
        toolset.setDefaultTool(cursorPositionTool);

        // create the View instances
        ddxclient.ddxViews = [];
        ddxclient.ddxViews[0] = new ddxclient.AnnotatedView({id: 'ddxview0', 'viewName': '/DDx/View0'});
        ddxclient.ddxViews[1] = new ddxclient.AnnotatedView({id: 'ddxview1', 'viewName': '/DDx/View1'});
        ddxclient.ddxViews[2] = new ddxclient.AnnotatedView({id: 'ddxview2', 'viewName': '/DDx/View2'});
        ddxclient.ddxViews[3] = new ddxclient.AnnotatedView({id: 'ddxview3', 'viewName': '/DDx/View3'});
        ddxclient.pgView = new ddxclient.AnnotatedView({id: 'pgview', 'viewName': 'PGView'});
        ddxclient.ddxOwnershipView = new pureweb.client.View({id: 'aspectandownership', 'viewName': 'DDx_OwnershipView'});
        ddxclient.ddxCineView = new pureweb.client.View({id: 'cineview', 'viewName': 'DDx_CineView'});
        ddxclient.cineController = ddxclient.ddxCineView.createCinematicController();
        pureweb.listen(pureweb.getClient().latency, pureweb.client.diagnostics.Profiler.EventType.COMPLETE, function(e){
            ddxclient.DDxLatency = 'Ping: ' + client.latency.durationMs().toFixed(3);
            ddxclient.DDxBandwidth = 'Mbps: ' + client.mbps.rate.toFixed(3);
        });
        pureweb.listen(ddxclient.cineController, pureweb.client.cine.CineController.EventType.PRESENTATION_FRAMES_PER_SECOND_CHANGED, function(e){
            var span = document.getElementById('measuredFrameRate');
            span.innerHTML = ddxclient.cineController.getPresentationFramesPerSecond();
        });
        pureweb.listen(ddxclient.cineController, pureweb.client.cine.CineController.EventType.PLAYBACK_STATE_CHANGED, function(e){
            var span = document.getElementById('cinePlaybackstate');
            span.innerHTML = ddxclient.cineController.getPlaybackState();
        });
        pureweb.listen(ddxclient.cineController, pureweb.client.cine.CineController.EventType.STATE_CHANGED, function(e){
            var span = document.getElementById('cineState');
            span.innerHTML = ddxclient.cineController.getState();
        });
        var span = document.getElementById('cinePlaybackstate');
        span.innerHTML = ddxclient.cineController.getPlaybackState();
        span = document.getElementById('cineState');
        span.innerHTML = ddxclient.cineController.getState();
    

        ddxclient.ddxViews[0].setAcetateToolset(toolset);
        ddxclient.ddxViews[1].setAcetateToolset(toolset);
        ddxclient.ddxViews[2].setAcetateToolset(toolset);
        ddxclient.ddxViews[3].setAcetateToolset(toolset);
        ddxclient.pgView.setAcetateToolset(toolset);

        toolset.activateTool(cursorPositionTool);
        toolset.activateTool(polylineTool);

        pureweb.getFramework().getState().getStateManager().addChildChangedHandler('/DDx/Grid', ddxclient.onGridStateChanged);

        var key = '';
        var path = '';
        //Add state handlers for the various checkboxes (defined in the object map above)
        for (key in ddxclient.booleanAppStateMap){
            if (ddxclient.booleanAppStateMap.hasOwnProperty(key)){
                path = ddxclient.booleanAppStateMap[key];
                pureweb.getFramework().getState().getStateManager().addValueChangedHandler(path, ddxclient.booleanAppStateBaseHandler);
            }
        }


        var attrname;
        ddxclient.completeBabel = {};
        for (attrname in ddxclient.babelPhrases) { ddxclient.completeBabel[attrname] = ddxclient.babelPhrases[attrname]; }
        for (attrname in ddxclient.babelData) { ddxclient.completeBabel[attrname] = ddxclient.babelData[attrname]; }

        //Add state handlers for the babel contents
        for (key in ddxclient.completeBabel){
            if (ddxclient.completeBabel.hasOwnProperty(key)){
                path = ddxclient.DDxEcho + key;
                pureweb.getFramework().getState().getStateManager().addValueChangedHandler(path, ddxclient.onEchoStateChanged);
            }
        }

        ddxclient.populateBabelTable('pwDiagnosticsBabelTable', ddxclient.babelPhrases);
        ddxclient.populateBabelTable('pwDiagnosticsDataTypesTable', ddxclient.babelData);

        ddxclient.setupCounters(ddxclient.pgView);

    }
};

ddxclient.populateBabelTable = function(table, contents){
    //Populate the babel unicode table dynamically
    var tab = document.getElementById(table);
    for (var key in contents){
        if (contents.hasOwnProperty(key)){

            //A new row for each language
            var newRow = document.createElement('tr');

            //Column for language
            var newLangCell = document.createElement('td');
            var newLangCellText = document.createTextNode(key);
            newLangCell.appendChild(newLangCellText);

            //Column for phrase
            var newPhraseCell = document.createElement('td');
            var newPhraseCellText = document.createTextNode(contents[key].data);
            newPhraseCell.appendChild(newPhraseCellText);

            //Column for command reponse w/ internal div for results
            var newCommandCell = document.createElement('td');
            var newCommandCellDiv = document.createElement('div');
            newCommandCellDiv.id = 'pwDiagnosticsBableCommand_' + key;
            newCommandCell.appendChild(newCommandCellDiv);

            //Column for appstate response w/ internal div for results
            var newAppStateCell = document.createElement('td');
            var newAppStateCellDiv = document.createElement('div');
            newAppStateCellDiv.id = 'pwDiagnosticsBableAppState_' + key;
            newAppStateCell.appendChild(newAppStateCellDiv);

            //Column for appstate response w/ internal div for results
            var newSessStorageCell = document.createElement('td');
            var newSessStorageCellDiv = document.createElement('div');
            newSessStorageCellDiv.id = 'pwDiagnosticsBableSessionStorage_' + key;
            newSessStorageCell.appendChild(newSessStorageCellDiv);

            //Add all cells to row
            newRow.appendChild(newLangCell);
            newRow.appendChild(newPhraseCell);
            newRow.appendChild(newCommandCell);
            newRow.appendChild(newAppStateCell);
            newRow.appendChild(newSessStorageCell);

            //Add new row to table
            tab.appendChild(newRow);
        }
    }
};

ddxclient.stalledChanged_ = function(e) {
    if (e.target instanceof pureweb.client.WebClient) {
        pureweb.getClient().logger.fine('Response Exception: ' + e.target.getResponseException());
        pureweb.getClient().logger.fine('Request Exception: ' + e.target.getRequestException());
        pureweb.getClient().logger.fine('Acquire Exception: ' + e.target.getAcquireException());
    }
    alert('Application stalled. If situation does not resolve itself, refresh the page to restart.');
};

ddxclient.removeOldOptions = function(ddlAllWindows){
    while (ddlAllWindows.options.length) {
        ddlAllWindows.remove(0);
    }
}

ddxclient.getMultiWindowTimers = function(){
    // get tmiers
    var multiWindowTimers;
    var win = pureweb.getClient().getMultiWindow();
    if(win.isChildWindow())
        multiWindowTimers = window.opener.pureweb.getClient().getMultiWindow().multiWindowConnectionTimers_;
    else{
        multiWindowTimers = win.multiWindowConnectionTimers_;
    }
    return multiWindowTimers;
}

/**
 * Refresh the list of available windows to be able to send to
 */
ddxclient.populateWindowList = function(){
    var ddlAllWindows = document.getElementById('ddlAllWindows');
    ddxclient.removeOldOptions(ddlAllWindows);

    var wins = pureweb.getClient().getMultiWindow().getOpenWindows();

    // have a default "Broadcast" option
    var option = document.createElement("option");
    option.text = "All Available Windows";
    option.value = null;
    ddlAllWindows.add(option);
    var windowTimers = ddxclient.getMultiWindowTimers();

    // put all windows in the list with the actual window as the value
    for(var i in wins){
        // if a window hasn't connected don't include it in the list of available windows
        if(windowTimers.hasOwnProperty(wins[i].name)){
            continue;
        }
        var option = document.createElement("option");
        option.text = wins[i].name;
        ddlAllWindows.add(option);
    }
}

ddxclient.sendWindowMessage = function(){
    var ddlAllWindows = document.getElementById('ddlAllWindows');
    var selectedWindow = ddlAllWindows[ddlAllWindows.selectedIndex].text;
    var message = document.getElementById('txtWindowMessage').value;
    
    if(selectedWindow === "All Available Windows"){
        selectedWindow = null;
    }
    pureweb.getClient().getMultiWindow().sendMultiWindowMessage(message,selectedWindow);
}

/**
 * Called multiWindowMessage is sent from another window
 */
ddxclient.onMultiWindowMessage_ = function(e) {
        var message = "Message Received From: " + e.sender.source.name + "\n";
        message += "Sent: " + ddxclient.getFormattedDate_() + "\n\n";
        message += e.message;
        var lstInbox = document.getElementById('txtInbox')
        lstInbox.value = message;
};

ddxclient.onChildWindowClosed_ = function(e) {
    console.log('DDx received notification that a child window was closed: ' + e.childWindowName);
};

/**
 * Get timestamp in yyyy-mm-dd time
 */
ddxclient.getFormattedDate_ = function(){
    var date = new Date();
    var str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + ('0' + date.getMinutes()).slice(-2) + ":" + ('0' + date.getSeconds()).slice(-2);

    return str;
}

//Session state changed event handler - checks for the failed state.
ddxclient.onSessionStateChanged = function(event) {
    var sessionState = pureweb.getClient().getSessionState();
    if (sessionState === pureweb.client.SessionState.FAILED) {
        if (this.lastSessionState === pureweb.client.SessionState.CONNECTING) {
            var msg = 'Unable to connect to the DDx service application.';
            var ex = pureweb.getClient().getAcquireException();
            if (goog.isDefAndNotNull(ex)) {
                msg += ' ' + ex.getMessage();
            }
            alert(msg);
        } else {
            alert('Connection to the DDx service application has been lost. Refresh the page to restart.');
        }
    }
    this.lastSessionState = sessionState;
}

ddxclient.handleExceptionInHandler_ = function(e) {
    pureweb.getClient().logger.fine('Exception occured during execution of the multipart handler: ' + e.getEventArgs().getException());
};

/**
 * Called when the on/off checkbox is clicked on the client.
 */
ddxclient.gridOn_Click = function(e){
    var chk = document.getElementById('chkGridOn');
    pureweb.getFramework().getState().setValue('/DDx/Grid/On', chk.checked.toString());
    pureweb.client.diagnostics.trace('Grid state changed ' + chk.checked.toString());
};

/**
 * Called when the position of the slider is changed on the client.
 */
ddxclient.gridSpacing_ValueChanged = function(e){
    pureweb.getFramework().getState().setValue('/DDx/Grid/LineSpacing', e);
};

/**
 * Called when the grid is changed (either size or on/off)
 */
ddxclient.onGridStateChanged = function(e){
    var chk = document.getElementById('chkGridOn');
    var grid = pureweb.getFramework().getState().getValue('/DDx/Grid/On');
    chk.checked = pureweb.util.parseBoolean(grid);

    var spacing = pureweb.getFramework().getState().getValue('/DDx/Grid/LineSpacing');
    var slider = document.getElementById('s1');
    s.setValue(parseInt(spacing));
    var sliderLbl = document.getElementById('lblGridSpace');
    sliderLbl.innerHTML = '(' + spacing + ')';
};

ddxclient.doPing = function() {
    if (!ddxclient.count) {
       ddxclient.count = 0;
       ddxclient.avg = 0;
       ddxclient.maxPing = 0;
    }
    var startPing = new Date().getTime();

    pureweb.getClient().queueCommand('DDxRoundtripPing', null, function (sender, args) {
       pureweb.getClient().logger.fine('Ping Response: ' + args.getResponse().getElementsByTagName('DDxClientPingResponse')[0].textContent);
       pureweb.getClient().logger.fine(args.getResponse());

        //Uncomment to test multipart handler client exception reporting
        //via the MULTIPART_HANDLER_EXCEPTION_OCCURRED event
        // throw new pureweb.IllegalArgumentException('You cannot ping me!');

       if (goog.isDef(args.getExceptionDetail())) {
           //Report server-originated exception in the response
           pureweb.getClient().logger.fine('Exception in DDxPing response:' + args.getExceptionDetail().getMessage());
           pureweb.getClient().logger.fine(args.getExceptionDetail().toString());
           alert('Exception raised in command execution: \n' + args.getExceptionDetail().getMessage());
       } else {
           var duration = new Date().getTime() - startPing;
           ddxclient.avg = ddxclient.avg + duration;
           var lblEl = goog.dom.getElement('roundtripPingReport');
           if (ddxclient.count<10) {
               ddxclient.count++;
               ddxclient.maxPing = Math.max(duration, ddxclient.maxPing);
               lblEl.innerHTML = (ddxclient.count) + ': ' + duration + 'ms Max:' + ddxclient.maxPing + ' Avg:' + (ddxclient.avg/ddxclient.count).toFixed(1);
               setTimeout(ddxclient.doPing, 50);
           } else {
               ddxclient.count = 0;
               ddxclient.avg = 0;
               goog.dom.getElement('roundtripPingButton');
           }
       }
    });
};


/**
 * Extends the PureWeb View class with the ability to annotate the view with mouse information.
 * @constructor
 * @extends {pureweb.client.View}
 */
ddxclient.AnnotatedView = function(args) {
    goog.base(this, args);
    /** @private */
    if (goog.string.startsWith('/')) {
        this.pathPrefix_ = '/DDx' + args.viewName;
    } else {
        this.pathPrefix_ = '/DDx/' + args.viewName;
    }

    /** @private */
    this.canvas_ = this.createLayeredCanvas();

    //Register the custom view renderer for 'image/png' responses
    pureweb.getFramework().registerViewRenderer(pureweb.SupportedEncoderMimeType.PNG, ddxclient.createCustomRenderer);
    pureweb.getFramework().registerViewRenderer(pureweb.SupportedEncoderMimeType.BASE64_PNG, ddxclient.createCustomRenderer);

    goog.events.listen(this,
                        pureweb.client.View.EventType.VIEW_UPDATED,
                        function(e) {
                            this.annotateView_();
                            
                            //We check for the case in which we might have out of order 
                            //views coming across (PWEB-4532)
                            var evt = e.event_ || e;
                            if ((evt.args.params_.imagecounter !== null) && (typeof evt.args.params_.imageCounter !== 'undefined')){
                                var counter = parseInt(e.event.args.params_.imagecounter);
                                if (counter < ddxclient.imageCounter){
                                    alert('I need an adult! Images are coming in out of order!  Last image ' + ddxclient.imageCounter + ' current img: ' + counter);
                                }
                                ddxclient.imageCounter = counter;
                            }                            
                        },
                       false,
                       this);

    // wire up app state change handlers to get the mouse and key event information for the view
    pureweb.getFramework().getState().getStateManager().addChildChangedHandler(this.pathPrefix_ + '/MouseEvent', this.annotateView_, this);
    pureweb.getFramework().getState().getStateManager().addChildChangedHandler(this.pathPrefix_ + '/KeyEvent', this.annotateView_, this);

    var clientMoveCallback = function(e) {
        if (this.getViewName() === 'PGView') {
            if (goog.isDefAndNotNull(e.getBrowserEvent().targetTouches)){
                var x = e.getBrowserEvent().targetTouches[0].clientX;
                var y = e.getBrowserEvent().targetTouches[0].clientY;

                var target = this.viewElement_;

                while (target=target.offsetParent){
                    x -= target.offsetLeft;
                    y -= target.offsetTop;
                }        
                this.lastX_ = x;
                this.lastY_ = y;
            }else{
                this.lastX_ = e.offsetX;
                this.lastY_ = e.offsetY;
            }
        }
    };


    if (args.viewName === 'PGView') {
        goog.events.listen(this.viewElement_,
                           goog.events.EventType.MOUSEMOVE,
                           clientMoveCallback,
                           true,
                           this);
        goog.events.listen(this.viewElement_,
                            goog.events.EventType.TOUCHMOVE,
                            clientMoveCallback,
                            true,
                            this);
    }
    this.lastX_ = 0;
    this.lastY_ = 0;

    pureweb.listen(this, pureweb.client.View.EventType.VIEW_UPDATED, this.annotateView_, false);
};

goog.inherits(ddxclient.AnnotatedView, pureweb.client.View);

/**
 * @inheritDoc
 */
ddxclient.AnnotatedView.prototype.annotateView_ = function() {
    var context = this.canvas_.getContext('2d');
    context.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
    context.fillStyle = 'cyan';
    context.font = '10pt Arial';
    var fakedHeight = context.measureText('m').width;
    if (this.getViewName() !== 'PGView') {
        var state = pureweb.getFramework().getState().getStateManager().getState();
        if (state !== null){
            var path = this.pathPrefix_ + '/MouseEvent';
            context.fillText('MouseEvent Type: ' + state.getValue(path + '/Type'), 5, fakedHeight + 4);

            var voffset = 2;
            context.fillText('ChangedButton: ' + state.getValue(path + '/ChangedButton'), 5, (fakedHeight + 4) * voffset++);
            context.fillText('Buttons: ' + state.getValue(path + '/Buttons'), 5, (fakedHeight + 4) * voffset++);
            context.fillText('Modifiers: ' + state.getValue(path + '/Modifiers'), 5, (fakedHeight + 4) * voffset++);
            context.fillText('X: ' + state.getValue(path + '/X') + ' Y: ' + state.getValue(path + '/Y'), 5, (fakedHeight + 4) * voffset++);
            context.fillText('Delta: ' + state.getValue(path + '/Delta'), 5, (fakedHeight + 4) * voffset++);

            voffset++;
            path = this.pathPrefix_ + '/KeyEvent';
            context.fillText('KeyEvent Type: ' + state.getValue(path + '/Type'), 5, (fakedHeight + 4) * voffset++);
            context.fillText('KeyCode: ' + state.getValue(path + '/KeyCode'), 5, (fakedHeight + 4) * voffset++);
            context.fillText('CharacterCode: ' + state.getValue(path + '/CharacterCode'), 5, (fakedHeight + 4) * voffset++);
            context.fillText('Modifiers: ' + state.getValue(path + '/Modifiers'), 5, (fakedHeight + 4) * voffset);
        }

        voffset+=2;
        context.fillText('Encoder Format: ' + this.getEncodingType(), 5, (fakedHeight + 4) * voffset++);
        context.fillText('Using ObjectURLs: ' + pureweb.getClient().supportsBinary(), 5, (fakedHeight + 4) * voffset++);
        context.fillText('Using WebSockets: ' + pureweb.getClient().supportsWebsockets(), 5, (fakedHeight + 4) * voffset++);

    }else{
        this.showMousePos_(this.lastX_, this.lastY_);
        var client = pureweb.getClient()
        voffset = 2;
        context.fillStyle = 'cyan';
        context.font = '10pt Arial';
        context.fillText(ddxclient.DDxBandwidth, 5, (fakedHeight + 4) * voffset++);
        context.fillText(ddxclient.DDxLatency, 5, (fakedHeight + 4) * voffset++);
        context.fillText(ddxclient.DDxFPS, 5, (fakedHeight + 4) * voffset++);
        context.fillText(ddxclient.DDxViewSize, 5, (fakedHeight + 4) * voffset++);
        context.fillText('Encoder Format: ' + this.getEncodingType(), 5, (fakedHeight + 4) * voffset++);
    }
};

/**
 * @private
 */
ddxclient.AnnotatedView.prototype.showMousePos_ = function(x, y) {
    if (document.getElementById('chkShowMousePos').checked) {
        var context = this.canvas_.getContext('2d');
        context.clearRect(this.lastX_ - 11, this.lastY_ - 11, 22, 22);
        this.lastX_ = x;
        this.lastY_ = y;
        context.beginPath();
        context.arc(this.lastX_, this.lastY_, 11, 0, 2 * Math.PI, false);
        context.fillStyle = 'yellow';
        context.fill();
    }
};

/**
 * When PG view is updated during the blink test
 * this will either continue the test (based on the blinkPGView boolean flag)
 * or will restore the origianl annotated PGView.
 */
ddxclient.onBlinkViewUpdated = function() {
    pureweb.unlisten(ddxclient.pgView, pureweb.client.View.EventType.VIEW_UPDATED, ddxclient.onBlinkViewUpdated);
    if (!ddxclient.stopBlinkPGView){
        // the timeout used here gives a little time needed for initial h.264 framees to render, otherwise
        // the view may not blink at all
        setTimeout(ddxclient.blinkPGView, 50);
    } else {
        goog.dom.setTextContent(document.getElementById('btnBlinkPGView'), 'Blink View');        
        ddxclient.createPGView();            
     }
};

/**
 * Kicks of the PGView blink test.  PGView will be created and destoryed n times.
 */
ddxclient.stopBlinkPGView = true;

ddxclient.onBlinkPGViewClicked = function(){
    ddxclient.stopBlinkPGView = !ddxclient.stopBlinkPGView;
    if (!ddxclient.stopBlinkPGView) {
        goog.dom.setTextContent(document.getElementById('btnBlinkPGView'), 'Stop Blinking');
        ddxclient.blinkPGView();
    } else {
        goog.dom.setTextContent(document.getElementById('btnBlinkPGView'), 'Blink View');
    }
};

/**
 * Destroys the PGView, and recreates it (as a non-annotated view)
 * this is used for testing for memory leaks in the view creation / tear down
 * process
 */
ddxclient.blinkPGView = function() {    
    goog.events.removeAll(ddxclient.pgView);
    if (ddxclient.pgView){
        if (ddxclient.pgView.annotateView_){
            pureweb.getFramework().getState().getStateManager().removeChildChangedHandler(ddxclient.pgView.pathPrefix_ + '/MouseEvent', ddxclient.pgView.annotateView_);
            pureweb.getFramework().getState().getStateManager().removeChildChangedHandler(ddxclient.pgView.pathPrefix_ + '/KeyEvent', ddxclient.pgView.annotateView_);
        }
        if (ddxclient.pgView.dispose){
            ddxclient.pgView.dispose();
            ddxclient.pgView = null; 
        }
    }
    ddxclient.pgView = new pureweb.client.View({id: 'pgview', 'viewName': 'PGView'});
    pureweb.listen(ddxclient.pgView, pureweb.client.View.EventType.VIEW_UPDATED, ddxclient.onBlinkViewUpdated);    
};

/**
 * Creates an annotated PG View if one does not already exist
 */
ddxclient.createPGView = function() {
    if ((goog.isDefAndNotNull(ddxclient.pgView)) && (goog.isDefAndNotNull(ddxclient.pgView.dispose))){
        goog.events.removeAll(ddxclient.pgView);
        ddxclient.pgView.dispose();
        ddxclient.pgView = null;
    }
    ddxclient.pgView = new ddxclient.AnnotatedView({id: 'pgview', 'viewName': 'PGView'});
    ddxclient.setupCounters(ddxclient.pgView);

    var toolset = new pureweb.client.collaboration.AcetateToolset();
    var client = pureweb.getClient();

    var cursorPositionToolDelegate = new pureweb.client.collaboration.CursorPositionTool();
    var polylineToolDelegate = new pureweb.client.collaboration.PolylineTool();

    var cursorPositionTool = toolset.registerToolDelegate(cursorPositionToolDelegate);
    var polylineTool = toolset.registerToolDelegate(polylineToolDelegate);

    toolset.setDefaultTool(cursorPositionTool);
    ddxclient.pgView.setAcetateToolset(toolset);

    toolset.activateTool(cursorPositionTool);
    toolset.activateTool(polylineTool);    
};

/**
 * Handle Share button clicks on the Collaboration tab.
 */
ddxclient.onShareButtonClicked = function() {
    var webClient = pureweb.getFramework().getClient();

    if (!goog.isDefAndNotNull(ddxclient.shareUrl)) {
        webClient.getSessionShareUrlAsync('Scientific', '', 1800000, '', function(shareUrl, exception) {
            if (goog.isDefAndNotNull(shareUrl)) {
                ddxclient.shareUrl = shareUrl;
                document.getElementById('txtShareUrl').value = shareUrl;
                goog.dom.setTextContent(document.getElementById('btnShare'), 'Invalidate');
            } else {
                alert('An error occurred creating the share URL: ' + exception.description);
            }
        });
    } else {
        webClient.invalidateSessionShareUrlAsync(ddxclient.shareUrl, function(exception) {
            if (goog.isDefAndNotNull(exception)) {
                alert('An error occurred invalidating the share URL: ' + exception);
            } else {
                document.getElementById('txtShareUrl').value = '';
                goog.dom.setTextContent(document.getElementById('btnShare'), 'Share');
                ddxclient.shareUrl = null;
            }
        });
    }
};

/**
 * Handler for Set User Info button clicks on the Collaboration tab.
 * @private
 */
ddxclient.onSetUserInfoButtonClicked = function() {
    var doc =  goog.dom.getDocument();
    var userName = doc.getElementById('txtName').value;

    if (goog.string.isEmptySafe(userName)) {
        alert('A username must be provided with optional email address');
    } else {
        var email = doc.getElementById('txtEmail').value;
        var framework = pureweb.getFramework();
        var collabrationMgr = framework.getCollaborationManager();
        collabrationMgr.updateUserInfo('Name', userName);
        collabrationMgr.updateUserInfo('Email', !goog.isNull(email) ? email : '');
    }
    this.updateOwnerSession();
};

/**
 * Handler for changes to collaboration session information - updates the participants list.
 */
ddxclient.onSessionsChanged = function() {
    // recreate the list of participants

    var participantList = goog.dom.getDocument().getElementById('lstParticipants');
    goog.dom.removeChildren(participantList);

    var framework = pureweb.getFramework();
    var collaborationMgr = framework.getCollaborationManager();
    var activeSessions = collaborationMgr.getActiveSessions();
    var numSessions = activeSessions.length;

    for (var i = 0; i < numSessions; i++) {
        var userInfoDiv = ddxclient.createUserInfoDiv_(collaborationMgr, activeSessions[i]);
        if (!goog.isNull(userInfoDiv)) {
            participantList.appendChild(userInfoDiv);
        }
    }
};

/**
 * Create a div with the name/email, color sample, and acetate visibility checkbox.
 * @private
 */
ddxclient.createUserInfoDiv_ = function(collaborationMgr, sessionId) {
    var userInfo = collaborationMgr.getSessionUserInfo(sessionId);

    if (goog.isNull(userInfo)) { // user info not yet set for the session
        return null;
    }

    var name = pureweb.xml.XmlUtility.getText({parent: userInfo, childPath: 'Name'});

    if (goog.isNull(name)) { // user info not yet set for the session
        return null;
    }

    var email = pureweb.xml.XmlUtility.getText({parent: userInfo, childPath: 'Email'});

    var doc = goog.dom.getDocument();
    var userInfoDiv = doc.createElement('div');
    userInfoDiv.setAttribute('id', sessionId);
    userInfoDiv.setAttribute('style', 'width: 100%; margin-left: 5px; margin-top: 5px;');
    userInfoDiv.className = 'goog-inline-block';

    var visChkBox =  doc.createElement('input');
    visChkBox.setAttribute('type', 'checkbox');
    visChkBox.setAttribute('sessionId', sessionId);
    visChkBox.setAttribute('style', 'goog-checkbox; margin-left: 5px;');
    visChkBox.setAttribute('margin-left', '5px');
    if (collaborationMgr.getMarkupVisible(sessionId) === true) {
        visChkBox.checked = true;
    } else {
        visChkBox.checked = false;
    }
    visChkBox.onclick = ddxclient.onAcetateVisibilityClicked_;
    userInfoDiv.appendChild(visChkBox);

    var colorSample = doc.createElement('div');
    colorSample.className = 'goog-inline-block';
    var color = collaborationMgr.getSessionDefaultColor(sessionId);
    var colorStr = color.getAlpha() === 0xFF ? color.toString() : color.toRGBAString();
    colorSample.setAttribute('style', 'width: 12pt; height: 12pt; background-color: '+ colorStr +
                             '; margin-left: 5px;  margin-right: 5px; vertical-align: middle;');
    userInfoDiv.appendChild(colorSample);

    var txt = name;
    if (!goog.string.isEmptySafe(email)) {
        txt += ' / ' + email;
    }
    var infoText = doc.createTextNode(txt);
    userInfoDiv.appendChild(infoText);

    return userInfoDiv;
};

/**
 * @private
 */
ddxclient.onAcetateVisibilityClicked_ = function(e) {
    var sessionId = e.target.getAttribute('sessionId');
    pureweb.getFramework().getCollaborationManager().setMarkupVisible(sessionId, e.target.checked.toString());
};

/**
 * Handler for changes to collaboration manager initialization changes - updates the collaboration tab.
 */
ddxclient.onCollaborationStateInitialized = function() {
    var collaborationMgr = pureweb.getFramework().getCollaborationManager();
    if (collaborationMgr.isInitialized()) {
        ddxclient.updateOwnerSession();
        ddxclient.onSessionsChanged();
    }
};

/**
 * Handler for changes to collaboration session owner - updates the collaboration tab.
 */
ddxclient.onOwnerSessionChanged = function() {
    ddxclient.updateOwnerSession();
};

/**
 * Handler for changes to collaboration session owner - updates the collaboration tab.
 */
ddxclient.updateOwnerSession = function() {
    var collaborationMgr = pureweb.getFramework().getCollaborationManager();
    if (collaborationMgr.isInitialized()) {
        var ownerSessionId = collaborationMgr.getOwnerSession();
        var owner = pureweb.getFramework().getState().getStateManager().getTree('/PureWeb/Collaboration/Sessions/SessionId-' + ownerSessionId + '/UserInfo', {allowCreate: false});
        var id = ownerSessionId;
        if (goog.isDefAndNotNull(owner.UserInfo) && goog.isDefAndNotNull(owner.UserInfo.Name)){
            id = owner.UserInfo.Name;
        }
        document.getElementById('lblCurrentOwner').innerHTML = id;
    }
};

/**
 * Handler for take ownership button clicks.
 */
ddxclient.onTakeOwnershipClicked = function() {
    pureweb.getFramework().getClient().queueCommand('TakeOwnership');
};

/**
 * Handler for take ownership button clicks.
 */
ddxclient.onClearMarkupClicked = function() {
    var collaborationMgr =  pureweb.getFramework().getCollaborationManager();

    for (var i = 0; i < ddxclient.ddxViews.length; i++) {
        collaborationMgr.removeAcetateMarkupBySession(ddxclient.ddxViews[i].getViewName(), null, ddxclient.ddxViews[i].getAcetateToolset());
    }
    collaborationMgr.removeAcetateMarkupBySession(ddxclient.pgView.getViewName(), null, ddxclient.pgView.getAcetateToolset());
};

/**
 * Handler for input transmission enabled checkbox clicks.
 */
ddxclient.onInputTransmissionEnabledClicked = function() {
    var enabled = document.getElementById('chkInputTransmissionEnabled').checked;
    for (var i = 0; i < ddxclient.ddxViews.length; i++) {
        ddxclient.ddxViews[i].setInputTransmissionEnabled(enabled);
    }
    ddxclient.pgView.setInputTransmissionEnabled(enabled);
};

/**
 * Handler for save screenshot clicks.
 */
ddxclient.onSaveScreenShotClicked = function() {
    pureweb.getClient().queueCommand(
        'Screenshot',
        null,
        function (sender, args) {
            var key = pureweb.xml.XmlUtility.getText({parent: args.getResponse(), childPath: '/ResourceKey'});
            var webClient = pureweb.getClient();
            var resourceUrl = webClient.getResourceUrl(key);
            goog.dom.getElement('txtResourceUrl').value = resourceUrl;
            // exercise WebClient.retrieveObject if Blob is supported by the browser
            if (webClient.supportsRetrieveObject()) {
                webClient.retrieveObject(
                    key,
                    function(obj, err) {
                        if (goog.isDefAndNotNull(obj)) {
                            goog.dom.getElement('screenshotImage').src = window.URL.createObjectURL(obj);
                            goog.style.showElement(goog.dom.getElement('screenshotDiv'), true);
                        } else {
                            alert('Cannot retrieve screenshot: ' + err);
                        }
                    }
                );
            } else {
                goog.dom.getElement('screenshotImage').src = resourceUrl;
                goog.style.showElement(goog.dom.getElement('screenshotDiv'), true);
            }
        }
    );
};

/**
 * Hide the screenshot .
 */
ddxclient.onClickDismissScreenshotDiv = function() {
    goog.style.showElement(goog.dom.getElement('screenshotDiv'), false);

    var webClient = pureweb.getClient(); 

    //Check if the platforms supports retrieve object, if it does then we need to revoke
    if (webClient.supportsRetrieveObject()) {
        window.URL.revokeObjectURL(goog.dom.getElement('screenshotImage').src);
    }
};

ddxclient.cineButtons = ['detachCinematic', 'rewind', 'playReverse', 'stepBack', 'pause', 'stepForward', 'playForward', 'fastForward'];

ddxclient.autoPlayCine = function(e){
    ddxclient.cineController.setAutoStart(e.checked);  
};

ddxclient.autoAdjustCineTimer = function(e){
    ddxclient.cineController.setAutoAdjustDeltaT(e.checked);
};

ddxclient.updateFPS = function(){
    var span = document.getElementById('measuredFrameRate');
    span.innerHTML = Math.round(ddxclient.cineController.getPresentationFramesPerSecond());
};

ddxclient.updateState = function(){
    span = document.getElementById('cineState');
    span.innerHTML = ddxclient.cineController.getState();
};

ddxclient.updatePlaybackState = function(){
    span = document.getElementById('cinePlaybackstate');
    span.innerHTML = ddxclient.cineController.getPlaybackState();
};

ddxclient.updateFramesFetched = function(){
    span = document.getElementById('cineFramesFetched');    
    var fetched = ddxclient.cineController.getValidFrames().length;
    span.innerHTML = '(' + fetched + ' / ' + ddxclient.maxFrames + ')'; 
};

ddxclient.updateMaxFrameCount = function(){
    span = document.getElementById('cineFramesFetched');
    ddxclient.maxFrames = ddxclient.cineController.getMaxFrameCount();
    span.innerHTML = '(0 / ' + ddxclient.maxFrames + ')';
};

ddxclient.memoryAlert = function(){
    var memory = ddxclient.cineController.getFrameDataSize();
    console.log('Cine memory alert.  Current memory useage (in bytes): ' + memory);
};

ddxclient.attachCinematic = function(){
    ddxclient.maxFrames = 0;    
    console.log('Attaching cinematic view');    
    ddxclient.cineController.attachCinematic(ddxclient.ddxCineView);    
    var cid = ddxclient.cineController.getCinematicId();
    var params = {'CinematicId': cid};
    pureweb.getFramework().getClient().queueCommand('GenerateCine', params);

    pureweb.listen(ddxclient.cineController, pureweb.client.cine.CineController.EventType.FRAME_RECEIVED, ddxclient.enableControls);
    pureweb.listen(ddxclient.cineController, pureweb.client.cine.CineController.EventType.PRESENTATION_FRAMES_PER_SECOND_CHANGED, ddxclient.updateFPS);
    pureweb.listen(ddxclient.cineController, pureweb.client.cine.CineController.EventType.PLAYBACK_STATE_CHANGED, ddxclient.updatePlaybackState);
    pureweb.listen(ddxclient.cineController, pureweb.client.cine.CineController.EventType.FRAME_RECEIVED, ddxclient.updateFramesFetched);
    pureweb.listen(ddxclient.cineController, pureweb.client.cine.CineController.EventType.MAX_FRAME_COUNT_CHANGED, ddxclient.updateMaxFrameCount);
    pureweb.listen(ddxclient.cineController, pureweb.client.cine.CineController.EventType.MEMORY_WARNING, ddxclient.memoryAlert);    

    var span = document.getElementById('cinePlaybackstate');
    span.innerHTML = ddxclient.cineController.getPlaybackState();
    span = document.getElementById('cineState');
    span.innerHTML = ddxclient.cineController.getState();
};

ddxclient.enableControls = function(evt){    
    ddxclient.cineButtons.forEach(function(entry){
        var button = document.getElementById(entry);
        button.disabled = false;
    });
};

ddxclient.detachCinematic = function(){
    pureweb.unlisten(ddxclient.cineController, pureweb.client.cine.CineController.EventType.FRAME_RECEIVED, ddxclient.enableControls);
    pureweb.unlisten(ddxclient.cineController, pureweb.client.cine.CineController.EventType.PRESENTATION_FRAMES_PER_SECOND_CHANGED, ddxclient.updateFPS);
    pureweb.unlisten(ddxclient.cineController, pureweb.client.cine.CineController.EventType.PLAYBACK_STATE_CHANGED, ddxclient.updatePlaybackState);
    pureweb.unlisten(ddxclient.cineController, pureweb.client.cine.CineController.EventType.STATE_CHANGED, ddxclient.updateState);
    pureweb.unlisten(ddxclient.cineController, pureweb.client.cine.CineController.EventType.FRAME_RECEIVED, ddxclient.updateFramesFetched);
    pureweb.unlisten(ddxclient.cineController, pureweb.client.cine.CineController.EventType.MAX_FRAME_COUNT_CHANGED, ddxclient.updateMaxFrameCount);
    pureweb.unlisten(ddxclient.cineController, pureweb.client.cine.CineController.EventType.MEMORY_WARNING, ddxclient.memoryAlert);    
    
    console.log('Detaching cinematic view');
    var cid = ddxclient.cineController.getCinematicId();
    var params = {'CinematicId': cid};
    pureweb.getFramework().getClient().queueCommand('DestroyCine', params);
    ddxclient.cineController.detachCinematic();    
    pureweb.getFramework().getState().getStateManager().deleteTree(ddxclient.cineController.getCinePath());
    ddxclient.cineButtons.forEach(function(entry){
        var button = document.getElementById(entry);
        button.disabled = true;
    });
    ddxclient.cineController = ddxclient.ddxCineView.createCinematicController(); 
};

ddxclient.rewind = function(){
    ddxclient.cineController.rewind();
};

ddxclient.playReverse = function(){
    ddxclient.cineController.playReverse();
};

ddxclient.stepBack = function(){
    ddxclient.cineController.stepBack();
};

ddxclient.pause = function(){
    ddxclient.cineController.pause();
};

ddxclient.stepForward = function(){
    ddxclient.cineController.stepForward();
};

ddxclient.playForward = function(){
    ddxclient.cineController.playForward();
};

ddxclient.fastForward = function(){
    ddxclient.cineController.fastForward();
};

ddxclient.manualCineDeltaT = function(e){    
    ddxclient.cineController.setDeltaTManual(e.checked);    
};

ddxclient.changeCineDeltaT = function(val){
    ddxclient.cineController.setFrameDeltaT(val);
};

ddxclient.onJoinServerShare = function() {
    var doc =  goog.dom.getDocument();
    var shareUrl = doc.getElementById('shareUri').value;
    var sharePassword = doc.getElementById('sharePassword').value;

    if(goog.string.isEmptySafe(sharePassword)) {
        alert("You must provide a password in order to join an exising session");
        return;
    }

    ddxclient.attachListeners(); // so the CONNECTED_CHANGED event is handled and views get created

    try {
       pureweb.joinServerSession(shareUrl,sharePassword);
    } catch (ex) {
        alert("An error occurred joining the server session: " + ex.getMessage());
    }
}

ddxclient.locateSessionStorageTableRowIndex = function(key){
    var storageTable = document.getElementById('sessionstoragetable');
    var rows = storageTable.rows;
    for (var i = 0; i < rows.length; i++){
        var cells = rows[i].cells;
        if (cells[0].textContent === key){
            return i;            
        }
    }
    return null;
};

ddxclient.deleteSessionStorageTableRow = function(key){
    var index = ddxclient.locateSessionStorageTableRowIndex(key);
    if (index !== null){
        document.getElementById('sessionstoragetable').deleteRow(index);    
    }    
};

ddxclient.changeSessionStorageTableRow = function(key, value){
    var index = ddxclient.locateSessionStorageTableRowIndex(key);
    if (index !== null){
        var cells =  document.getElementById('sessionstoragetable').rows[index].cells;
        cells[1].textContent = value;
    }
};

ddxclient.genericStorageValueChangedHandler = function(evt){
    var key = evt.getKey();
    var value = evt.getNewValue();
    if (evt.isDeletion()){
        ddxclient.deleteSessionStorageTableRow(key);    
    } else {
        ddxclient.changeSessionStorageTableRow(key, value);    
    }        
};

ddxclient.storageKeyAdded = function(evt){
    var storageTable = document.getElementById('sessionstoragetable');

    var keyCell = document.createElement('td');
    var keyText = document.createTextNode(evt.args.getKey());
    keyCell.appendChild(keyText);

    var valueCell = document.createElement('td');    
    var valueText = document.createTextNode(evt.args.getNewValue());
    valueCell.appendChild(valueText);
    
    var serviceListenerButtonCell = document.createElement('td');
    serviceListenerButtonCell.className = 'centerCell';
    var serviceListenerButton = document.createElement('button');
    serviceListenerButton.value = evt.args.getKey();
    var serviceListenerButtonText = document.createTextNode('Off');    
    serviceListenerButton.appendChild(serviceListenerButtonText);
    serviceListenerButton.onclick = function(evt){
        if (evt.target.innerHTML === 'Off'){
            evt.target.innerHTML = 'On'
            pureweb.getClient().queueCommand('AttachStorageListener', {key:evt.target.value});
        } else {
            evt.target.innerHTML = 'Off'
            pureweb.getClient().queueCommand('DetachStorageListener', {key:evt.target.value});
        }        
    };
    serviceListenerButtonCell.appendChild(serviceListenerButton);

    var deleteButtonCell = document.createElement('td');    
    deleteButtonCell.className = 'centerCell';
    var deleteButton = document.createElement('button');
    deleteButton.value = evt.args.getKey();
    var deleteButtonText = document.createTextNode('X');    
    deleteButton.appendChild(deleteButtonText);
    deleteButton.onclick = function(evt){
        var key = evt.target.value;
        pureweb.getClient().queueCommand('DetachStorageListener', {key:key});
        pureweb.getClient().getSessionStorage().removeAllValueChangedHandlers(key);
        ddxclient.deleteSessionStorageTableRow(key);
        pureweb.getClient().getSessionStorage().removeValue(key);
    };
    deleteButtonCell.appendChild(deleteButton);

    var collaboratorButtonCell = document.createElement('td');
    collaboratorButtonCell.className = 'centerCell';
    var collaboratorButton = document.createElement('button');
    collaboratorButton.value = evt.args.getKey();
    var collaboratorButtonText = document.createTextNode('Query');    
    collaboratorButton.appendChild(collaboratorButtonText);
    collaboratorButton.onclick = function(evt){
        pureweb.getClient().queueCommand('QuerySessionsWithKey', {key:evt.target.value}, function(sender, args){
             alert(pureweb.xml.XmlUtility.getText({parent: args.getResponse(), childPath: 'guids'}));
        });
    };
    collaboratorButtonCell.appendChild(collaboratorButton);

    var getValueCell = document.createElement('td');
    getValueCell.className = 'centerCell';
    var getValue = document.createElement('button');
    getValue.value = evt.args.getKey();
    var getValueText = document.createTextNode('getValue');    
    getValue.appendChild(getValueText);
    getValue.onclick = function(evt){
        alert(pureweb.getClient().getSessionStorage().getValue(evt.target.value));
    };
    getValueCell.appendChild(getValue);

    var row = document.createElement('tr');
    row.appendChild(keyCell);
    row.appendChild(valueCell);
    row.appendChild(serviceListenerButtonCell);
    row.appendChild(deleteButtonCell);
    row.appendChild(collaboratorButtonCell);
    row.appendChild(getValueCell);

    storageTable.appendChild(row);    
    setTimeout(function(){pureweb.getClient().getSessionStorage().addValueChangedHandler(evt.args.getKey(), ddxclient.genericStorageValueChangedHandler)},0);
    goog.array.binaryRemove(ddxclient.babelSessionStorageKeysPending, evt.args.getKey());
    if (ddxclient.babelSessionStorageKeysPending.length === 0){
        ddxclient.babelTestInProgress = false
    }
};

ddxclient.queryServiceSessionStorageKeys = function(evt) {
    pureweb.getClient().queueCommand('QuerySessionStorageKeys', null, function(sender, args){
        alert(pureweb.xml.XmlUtility.getText({parent: args.getResponse(), childPath: 'keys'}));
    });
};

ddxclient.addKeyToStorage = function(evt){
    var key = document.getElementById('newStorageKeyTextField').value;
    var value = document.getElementById('newStorageValueTextField').value;

    if (key === ''){
        alert('Keys must not be the empty string');
        return;
    }

    pureweb.getClient().getSessionStorage().setValue(key, value);
};

ddxclient.setKeyForceResponse = function(evt){
    var key = document.getElementById('newStorageKeyTextField').value;
    var value = document.getElementById('newStorageValueTextField').value;

    if (key === ''){
        alert('Keys must not be the empty string');
        return;
    }

    var sessionStorage = pureweb.getClient().getSessionStorage();

    if (!sessionStorage.containsKey(key)) {
        alert('Key must refer to an existing session storage value');
        return;
    }

    if (value !== sessionStorage.getValue(key)) {
        alert('value must be the same as the current session storage value');
        return;
    }

    // remove any existing forced response handler that may not have properly fired, and then add it again
    pureweb.getClient().getSessionStorage().removeValueChangedHandler(key, ddxclient.forcedResponseStorageValueChangedHandler);
    pureweb.getClient().getSessionStorage().addValueChangedHandler(key, ddxclient.forcedResponseStorageValueChangedHandler);

    pureweb.getClient().queueCommand('SessionStorageSetKeyForceResponse', {key: key, value: value})
};

ddxclient.forcedResponseStorageValueChangedHandler = function(evt){
    var key = evt.getKey();
    var value = evt.getNewValue();
    pureweb.getClient().getSessionStorage().removeValueChangedHandler(key, ddxclient.forcedResponseStorageValueChangedHandler);
    alert('Got forced response for key=' + key + ', value=' + value);
};

ddxclient.sessionStorageBroadcast = function(evt){
    var key = document.getElementById('newStorageKeyTextField').value;
    var value = document.getElementById('newStorageValueTextField').value;

    pureweb.getClient().queueCommand('SessionStorageBroadcast', {key: key, value: value});
};


/**
 * Create a custom renderer to render PNG image responses from the service
 */
ddxclient.createCustomRenderer = function(target) {
    var img = new Image();
    var revokeUrl = false;
    var renderInProgress = false;
    var pendingMimeType = null;
    var pendingData = null;
    var pendingParameters = null;
    var dataUrl = '';
    var dataUrlPrefix = '';
    var context = null;     
    var promises = [];

    var resolver = function() {
        var p = promises.pop();
        if (p) p.resolve();
    };

    var myPngRendererImplementation = {
        name: 'DDxPNGRenderer',
        init: function(renderer) {
            pureweb.getClient().logger.fine('Initialize my own renderer:' + renderer.toString());
        },
        renderBytes: function(mimeType, data, parameters, canvas, renderer) {
            if (renderInProgress) {
                // We are currently rendering a frame, but have no pending data
                if (goog.isNull(pendingMimeType)) {
                    pendingMimeType = mimeType;
                    pendingData = data;
                    pendingParameters = parameters;
                    return;
                } else {
                    // We are currently rendering a frame, but have pending data. Drop the frame.
                    if (goog.isDefAndNotNull(parameters.promise_)) {
                        parameters.promise_.resolve();
                    }
                    return;
                }
            }

            promises.push(parameters.promise_);

            renderInProgress = true;
            dataUrl = '';
            dataUrlPrefix = '';

            if (mimeType.indexOf(pureweb.SupportedEncoderMimeType.PNG)!==0) {
                pureweb.getClient().logger.fine('Cannot render mimeType:' + mimeType + ' - I do PNGs only.');
                return;
            }

            img.onload = function() {
                // guard against the (slight) possibility of out-of-sequence renders
                renderInProgress = false;

                if (!renderer.isActivated() && !renderer.isActivatingNextUpdate()) {
                    resolver();
                    return;
                }

                //Should be called to prepare the canvas before drawing on it
                renderer.beginRendering(canvas, {width: img.width, height: img.height});

                var context = canvas.getContext('2d');
                context.drawImage(this, 0, 0);
                if (revokeUrl) {
                    window.URL.revokeObjectURL(this.src);
                    revokeUrl = false;
                }

                //Must be called after drawing if beginRendering was called
                renderer.doneRendering(canvas, parameters);
                resolver();

                 if (goog.isDefAndNotNull(pendingMimeType)) {                    
                    renderer.renderBytes(pendingMimeType, pendingData, pendingParameters, canvas, renderer);
                    pendingMimeType = null;
                    pendingData = null;
                    pendingParameters = null;
                }        
            }

            //Render the PNG data
            if ((mimeType === 'image/jpeg' || mimeType === 'image/png') && (window.URL)) {
                if (revokeUrl) {
                    window.URL.revokeObjectURL(img.src);
                    revokeUrl = false;
                }
                
                img.src = window.URL.createObjectURL(new Blob([data], {type: mimeType}));
                revokeUrl = true;
            } else if (mimeType .indexOf('base64')>=0) {
                dataUrlPrefix = 'data:' + mimeType + ',';
                if (typeof data === 'string') {
                    dataUrl = dataUrlPrefix + data;
                } else {
                    //Turn the data into characters
                    data = /** @type {ArrayBuffer} */ (data);
                    var bytes = new Uint8Array(data);
                    for (var i=0; i<bytes.byteLength; i++) {
                        dataUrl += String.fromCharCode(bytes[i]);
                    }
                    dataUrl = dataUrlPrefix + dataUrl;
                }
                img.src = dataUrl;
                revokeUrl = false;
            } else {
                pureweb.getClient().logger.fine('Custom renderer cannot render image data. [mimeType:' + mimeType + ']');
            }
        },
        clear: function() {
            pureweb.getClient().logger.fine('Clear my own renderer');
        }
    };

    return new pureweb.client.Framework.createViewRendererImplementation(target, myPngRendererImplementation);
};
