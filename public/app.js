/*
  OFFICIAL_MOM_APP_FILE
  
  
 */
/*************************************************************************
 *************************************************************************/


let app = {};


/* ======================================================================
   LOGGING STUFF THAT NEEDS TO BE SET UP BEFORE EVERYTHING ELSE!
   BEGIN
 ====================================================================== */
let logEntriesByIndex = [];
const DEBUG_LEVEL_NONE = 0;
const DEBUG_LEVEL_BASIC = 1;
const DEBUG_LEVEL_DETAILED = 2;

let currentLoggingDebugLevel = DEBUG_LEVEL_BASIC;
const myConsole = {};

/*************************************************************************
 *************************************************************************/
myConsole.log = function(sMsg,objOptions) {
  return lg(sMsg,objOptions);
} // end of myConsole.log() method

/* ======================================================================
   LOGGING STUFF THAT NEEDS TO BE SET UP BEFORE EVERYTHING ELSE\
   END
 ====================================================================== */



// some major DOM node elements' global variable declaration:
const splashNd = $("#splash")[0];
const tintNd = document.getElementById("tint");

const registerDevicePanelNd = document.getElementById("registerDevicePanel");
const info1Nd = document.getElementById("info1");
const installToHomeScreenInitPromptNd = document.getElementById("installToHomeScreenInitPrompt");
const menuNd = $("#menu")[0];
const pixelImgNd = $("#pixelImg")[0];
const pageContentNd = $("#pageContent")[0];
const checkValNd = $("#checkVal")[0];

const sHdrInfo = window.navigator.userAgent;
let bIsStandalone = false;
let w,h;


let bCheck = false;

/*************************************************************************

*************************************************************************/
function initAppObj() {
  myConsole.log("<b>initAppObj()</b> function called");
  app = {};
  app.pin = getLocalValue('pin');
  app.userEmailAdr = getLocalValue('userEmailAdr');
  app.mobileDevice = false;
  app.desktopDevice = true;
  app.iPhone = false;
  app.iPad = false;
  app.currentUserSet = false;
  app.timeDisplaySetupForFirstTime = false;
  
  app.reminderPanelDelay = 400;
  app.schemaInfoByIndex = [];
  app.schemaInfoByTableName = [];
  app.schemaInfoByRecordType = [];
  app.apiCallQueueByIndex = []
  app.appointmentsByIndex = [];
  app.appointmentsByServerId = [];
  app.appointmentDatesByIndex = [];
  app.appointmentDatesByServerId = [];
  app.ajaxLogByIndex = [];
  app.logAjax = true;
  app.active = true;
  app.timeTimerId = -1;
  app.fetchAttempt=0;
  app.gettingImportantData = false;
  app.currentView = "???";
  app.appointmentsVisited = false;
  app.apptsHtml = "";
  app.pollCount = 0;
  app.appScrollEventSet = false;
  app.appointmentsScrollTop = 0;
  app.performingAjaxCall = false;
  app.weeklyRemindersByIndex = [];
  
  /* leave  service worker features alone for now... */
  //serviceWorkerSetup(); // is this the right place???
  
} // end of function initAppObj()

// initAppObj() is directly called at the Bottom of this file!!!





/*************************************************************************
  are there any API call requests that were postponed that we can 
  run now?
  
  If so, run!
 *************************************************************************/
function checkForWaitingApiCalls() {
  myConsole.log("<b>checkForWaitingApiCalls()</b> function called");
  app.performingAjaxCall = false; // reset
  
  if (app.apiCallQueueByIndex.length === 0) {
    myConsole.log("the API call queue is empty.😀");
    return;
  } // end if
  
  const apiCallInfo = app.apiCallQueueByIndex.shift();
  let cmd = apiCallInfo.cmd;
  let dataPosted = apiCallInfo.dataPosted;
  let fnSuccess = apiCallInfo.fnSuccess;
  let fnFailure = apiCallInfo.fnFailure;
  
  myConsole.log("Took a job off the API call queue and I am going to try to call it...");
  apiCall(cmd, dataPosted, fnSuccess,fnFailure);
} // end of function checkForWaitingApiCalls()


/*************************************************************************
function is used for API calls to server
*************************************************************************/
async function apiCall(cmd, dataPosted, fnSuccess,fnFailure) {
  myConsole.log("<b>apiCall()</b> function called for cmd: <b>"+cmd+"</b>");

  if (app.performingAjaxCall) {
    myConsole.log("🛑🛑🛑still performing a previous AJAX call.🛑🛑🛑 - Queuing up this Call request...");
    const apiCallInfo = {};
    apiCallInfo.cmd = cmd;
    apiCallInfo.dataPosted = dataPosted;
    apiCallInfo.fnSuccess = fnSuccess;
    apiCallInfo.fnFailure = fnFailure;
    app.apiCallQueueByIndex.push(apiCallInfo);
    // DO NOT call  checkForWaitingApiCalls()  here!!!!
    return "busy";
  } // end if
  
  app.performingAjaxCall = true;
  dataPosted.cmd = cmd;
  dataPosted.needSchemaInfo = false;
  dataPosted.needCurrentUserInfo = false;
  const startTime = new Date();
  
  let test = app;
  let sSpot = "beginning";
  
  const ajaxLogEntry = {};
  
  ajaxLogEntry.cmd = cmd;
  ajaxLogEntry.notes = [];
  
  if (app.schemaInfoByIndex.length===0) {
    dataPosted.needSchemaInfo = true; // need the server to return the schema definitions
    myConsole.log("determined the need to get schema info...");
  } // end if
  
  
  if (!app.currentUserInfo) {
   // dataPosted.needCurrentUserInfo = true;
   // myConsole.log("determined there is a need need to get <i>current user info</i> from the server...");
  } // end if
  
  if (typeof dataPosted.userEmailAdr === "undefined") {
    dataPosted.userEmailAdr = app.userEmailAdr;
    myConsole.log("<b>dataPosted.userEmailAdr</b> was <i>undefined...</i> setting value to: <b>app.userEmailAdr</b>");
  } // end if
  
  myConsole.log("dataPosted.userEmailAdr = '"+dataPosted.userEmailAdr+"'");
  
  if (typeof dataPosted.pin === "undefined") {
    dataPosted.pin = app.pin;
  } // end if
  
  ajaxLogEntry.dataPosted = dataPosted;
  ajaxLogEntry.startTime = startTime;
  
  const options = {
    method:'POST',
    body:JSON.stringify(dataPosted),
    headers:{"Content-Type":"application/json"}
  }; // end of options definition
  
  try {
    myConsole.log("about to do an asyncronous <b>fetch()</b> call...");
    app.fetchAttempt = app.fetchAttempt + 1;
    sSpot = "about to do fetch";
    myConsole.log("🤝 about to do <i>fetch</i> on '/api'🤝. cmd: <b>"+cmd+"</b>");
    const response = await fetch('/api', options);   // ############ API FETCH...   API FETCH...   API FETCH...  ########### !!!
    myConsole.log("received <i>response</i> from fetch() call to server...");
    
    app.performingAjaxCall = false;
    
    sSpot = "received response";
    myConsole.log("about to process response returned from fetch()...");

    if (response.status !== 200) {
      const lg1 = myConsole.log("fetch failed. reason: <b>"+response.statusText+"</b>");
      const splashNd = document.getElementById("splash");
      splashNd.style.display = "none"; // get out of way if needed
      
      if (app.fetchAttempt < 5) {
        app.fnSuccess = fnSuccess;
        app.fnFailure = fnFailure;
        app.apiCmd = cmd;
        app.apiDataPosted = dataPosted;
        const nWait = 400 * app.fetchAttempt;
        myConsole.log("Waiting "+(nWait)+"ms and retrying...");
        setTimeout(apiCallRetry, nWait); // wait a set time before retrying the operation
        return;
      } else {
        app.fnSuccess = undefined;
        app.fnFailure = undefined;
        returnedData.result = "jsError";
        returnedData.jsFunctionName = "apiCall()";
        returnedData.errorOrigin = "server or network";
        returnedData.message = response.statusText+"";
        returnedData.fileName = "app.js";
        returnedData.lineNumber = 0;
        returnedData.spotInCode = sSpot;
        ajaxLogEntry.returnedData = returnedData;
        app.fetchAttempt = 0; // reset
        displayErrorInfo(returnedData);  // function is in ui.js
        app.performingAjaxCall = false;
      } // end if/else
      
      return;
    } // end if (response.status !== 200)
    
    app.fetchAttempt = 0; // reset
    myConsole.log("reset <i>fetchAttempt</i> back to zero (0)");
    
    
    const returnedData = await response.json();
    sSpot = "got returnedData from json response";
    
    if (returnedData.result === 'ok') {
      // OK
      myConsole.log("API call returned a result of <b>'ok'</b>");
      sSpot = "ajax result was 'ok'";
      ajaxLogEntry.endTime = new Date();
      
      if (app.schemaInfoByIndex.length===0 && returnedData.schemaInfoByIndex) {
        myConsole.log("setting up <i>schema definitions</i> locally that were returned from the server...");
        ajaxLogEntry.notes.push("adding schema");
        sSpot = "adding schema block";
        app.schemaInfoByIndex = returnedData.schemaInfoByIndex;
        let nMax = app.schemaInfoByIndex.length;
        let n;

        for (n=0;n<nMax;n++) {
          let tbl = app.schemaInfoByIndex[n];
          console.log(" --- setting up table name: "+tbl.tableName);
          tbl.fieldsByFieldName = [];

          for (let n2=0;n2<tbl.fields.length;n2++) {
            let fld = tbl.fields[n2];
            tbl.fieldsByFieldName[fld.field] = fld;
          } // next n2
          
          app.schemaInfoByTableName[tbl.tableName] = tbl;
          app.schemaInfoByRecordType[tbl.recordType] = tbl;
        } // next n
        
        myConsole.log("Done setting up <i>schema definitions</i>.");
      } // end if (end of processing schema info)
      
      
      /**********************************************************
         set up return data so it can be referenced by tag 
         name.
         
         Also, if one of the tags is 'currentUserInfo', call
         the setCurrentUser() function!
       **********************************************************/
      myConsole.log("Setting up returned data to be accessible by <b>Tag Name</b>.");
      returnedData.returnPayloadByTagName = [];
      let nMax2 = returnedData.returnPayload.length;
      for (let n=0;n<nMax2;n++) {
        const taskData = returnedData.returnPayload[n];

        if (typeof taskData.taskTag === "string") {
          returnedData.returnPayloadByTagName[taskData.taskTag] = taskData;

          if (taskData.taskTag === "currentUserInfo") {
          //  myConsole.log("Found a taskTag ==='<b>currentUserInfo</b>'");
          //  setCurrentUser(taskData);
          } // end if
        } // end if

      } // next n
      myConsole.log("📌Done setting up returned data by Tag Name.");
      // ==================================================================
      
      
      
      /**********************************************************
         If there is any log data returned from the server,
         add it to our client log data!
       **********************************************************/
      if (returnedData.serverLogInfo) {
        const nMax3 = returnedData.serverLogInfo.length;
        for (let n=0;n<nMax3;n++) {
          const logEntry = returnedData.serverLogInfo[n];
          
          if (typeof logEntry.timestamp === "string") {
            logEntry.timestamp = new Date(logEntry.timestamp+"");
          } // end if
          
          if (typeof logEntry.startTime === "string") {
            logEntry.startTime = new Date(logEntry.startTime+"");
          } // end if
          
          if (typeof logEntry.endTime === "string") {
            logEntry.endTime = new Date(logEntry.endTime+"");
          } // end if
          
          logEntriesByIndex.push(logEntry);
        } // next n
        
        myConsole.log("📌Server log entries returned: "+nMax3);
      } else {
        myConsole.log("📌NO server log entries were returned.");
      } // end if
      
      if (!app.currentUserInfo) {
      } // end if
      
      if (typeof fnSuccess === 'function') {
        myConsole.log("about to call 'success' function (as a result of a successful server call)...");
        
        sSpot = "about to call 'success' function - processing returned data";

        
        
        fnSuccess(dataPosted,returnedData);
        sSpot = "'success' function call completed";
        ajaxLogEntry.notes.push("success function called");
      } else {
        myConsole.log("a 'Success' function was not specified!");
      } // end if  (typeof fnSuccess === 'function') / else
      
      if (app.logAjax) {
        app.ajaxLogByIndex.push(ajaxLogEntry);
      } // end if
      checkForWaitingApiCalls(); // Jan 9, 2020
      return;
    } else {
      // NOT OK
      myConsole.log("API call did NOT return a result of 'ok'... it returned: <b>"+returnedData.result+"</b>");
      sSpot = "returned data result was Not 'ok'... it equaled: "+returnedData.result;
      ajaxLogEntry.endTime = new Date();
      ajaxLogEntry.returnedData = returnedData;
      app.performingAjaxCall = false;
      
      if (returnedData.info === 'site setup error') {
        myConsole.log("server returned a site setup error");
        showConfigProblemPanel();
        return;
      } // end if
      
      if (returnedData.info === 'invalid API call') {
        let lg = myConsole.log("server returned an invalid API call error message - current client device needs to be registered");
        showDeviceRegistrationPanel();
        return;
      } // end if
      
      if (typeof fnFailure === 'function') {
        lg = myConsole.log("about to call 'failure' function (as a result of server error)...");
        fnFailure(dataPosted,returnedData);
      } // end if
            
      
    } // end if
    
  } catch(err) {
    ajaxLogEntry.endTime = new Date();
    let returnedData = {};
    returnedData.result = "jsError";
    returnedData.jsFunctionName = "apiCall()";
    returnedData.errorOrigin = "client";
    returnedData.message = err.message;
    returnedData.fileName = err.sourceURL;
    returnedData.lineNumber = err.line;
    returnedData.spotInCode = sSpot;
    ajaxLogEntry.returnedData = returnedData;
    
    console.log(err);
    app.performingAjaxCall = false;
    
    displayErrorInfo(returnedData);  // function is in ui.js
    
    if (typeof fnFailure === 'function') {
        myConsole.log("about to call 'failure' function (for Js error)...");
        fnFailure(dataPosted,returnedData);
    } else {
      myConsole.log("a <i>failure</i> function was not specified!");
    } // end if / else
    
  //  if (app.logAjax) {
   //     app.ajaxLogByIndex.push(ajaxLogEntry);
   //   } // end if
  } // end of try/catch
  
} // end of function apiCall()


/*************************************************************************
  called from within apiCall() via a setTimeout() function.
 *************************************************************************/
function apiCallRetry() {
  myConsole.log("<b>apiCallRetry()</b> called.");
  const cmd = app.apiCmd;
  let dataPosted = app.apiDataPosted;
  let fnSuccess = app.fnSuccess;
  let fnFailure = app.fnFailure;
  
  apiCall(cmd, dataPosted, fnSuccess,fnFailure);
} // end of function apiCall()




/*************************************************************************
 *************************************************************************/
function getLocalValue(sKey, sDefaultValue) {
  let sValue = "";
  
  myConsole.log("<b>getLocalValue()</b> function called... key=<b>"+sKey+"</b>");
  
  if (typeof sDefaultValue === "string") {
    sValue = sDefaultValue;
  } // end if
  
  if (localStorage.getItem(sKey)) {
    sValue = localStorage.getItem(sKey);
  } // end if
  
  console.log("   return value="+sValue);
  
  return sValue;
} // end of function getLocalValue()




/*************************************************************************
  runs once the initial page has been loaded into the browser
 *************************************************************************/
function pageSetup(evt) {
  myConsole.log("<b>pageSetup()</b> function called");
  tintNd.addEventListener('scroll', noScroll);
  tintNd.addEventListener('click', hidePopupDialog);
  
  info1Nd.innerHTML = sHdrInfo;
  
  const copyrightYear1Nd = $("#copyrightYear1")[0];
  const dt = new Date();
  copyrightYear1Nd.innerHTML = dt.getFullYear()+"";
    
  if (sHdrInfo.indexOf("iPhone") > -1 || sHdrInfo.indexOf("iPad") > -1) {
    if (!window.navigator.standalone === true) {
      bIsStandalone = false;
      showInstallToHomeScreenPrompt();
    } else {
      bIsStandalone = true;
      let refreshPageNd = document.getElementById("refreshPage");
      refreshPageNd.style.display = "block";
      let otherEmergencyOptionsNd = $("#otherEmergencyOptions")[0];
      otherEmergencyOptionsNd.style.display = "block";
    } // end if
  } // end if  
  
  if (sHdrInfo.toLowerCase().indexOf("mobile") > -1) {
    app.mobileDevice = true;
    app.desktopDevice = false;
    if (sHdrInfo.indexOf("iPhone") > -1) {
      app.iPhone = true;
    } // end if
    
    if (sHdrInfo.indexOf("iPad") > -1) {
      app.iPad = true;
    } // end if
  } // end if
  
  pageResize();
  
  // radical debugging... get info and possibly delete recs
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //doDump();  // make sure this line is commented out when not debugging!
  //return; // make sure this line is commented out when not debugging!
  
  // the function: getLatestImportantInfo() is in this js file!
  const sStartApiFuncCall = getLocalValue('startApiFuncCall','startApiFuncCall()'); 
  
  console.log("about to call: "+sStartApiFuncCall);
  setTimeout(sStartApiFuncCall,10); // do initial API call for this session
  
  
  
} // end of function pageSetup()


// safari does not support visibilitychange event at this time

// set up main page event handlers:
myConsole.log("setting up main page event handlers...")
window.addEventListener('load', pageSetup);
window.addEventListener('resize', pageResize);
window.addEventListener('pagehide', pageHide);
window.addEventListener('pageshow', pageShow);
window.addEventListener('blur', pageBlur); // pressing HOME button causes this event to occur (iOS) ... or phone call
window.addEventListener('focus', pageFocus); // fires after going to the home screen and returning to the open app (iOS)


//const spinnerImageNd = $("#spinnerImage")[0];




/*************************************************************************
  for some radical debugging.
  return all data in neDb database.
  
 *************************************************************************/
function doDump() {
  myConsole.log("calling: <b>doDump()</b>");
  const dataPosted = {};
  apiCall("dump", dataPosted, doDumpSuccess, doDumpFailure);
} // end of function doDump()



/*************************************************************************
 *************************************************************************/
function doDumpSuccess(dataPosted, dataReturned) {
  myConsole.log("calling: <b>doDumpSuccess()</b>");
  const recs = dataReturned.returnPayload;
  const nMax = recs.length;
  const users = [];
  const deleteListByIndex = [];
  const deleleListById = [];
  
  for (let n=0;n<nMax;n++) {
    const rec = recs[n];
    
    if (rec.recordType === "user") {
      users.push(rec);
      
      if (typeof rec.userName === "undefined") {
        deleteListByIndex.push(rec._id);
      } // end if
      
    } // end if
    
  } // next n
  
  debugger;
  
  if (deleteListByIndex.length > 0) {
    deleteSomeIds(deleteListByIndex);
  } // end if
  
} // end of function doDumpSuccess()



/*************************************************************************
 *************************************************************************/
function doDumpFailure(dataPosted, dataReturned) {
  myConsole.log("calling: <b>doDumpFailure()</b>");
  debugger;
} // end of function doDumpFailure()



/*************************************************************************
 *************************************************************************/
function deleteSomeIds(aIdListToDelete) {
  
   return;  // un-comment out when done debugging!!
  myConsole.log("calling: <b>deleteSomeIds()</b>");
  
  const dataPosted = {};
  dataPosted.idsToDelete = aIdListToDelete;
  apiCall("deleteIds", dataPosted, deleteSomeIdsSuccess, deleteSomeIdsFailure);
  
} // end of function doDumpFailure()



/*************************************************************************
 *************************************************************************/
function deleteSomeIdsSuccess(dataPosted, dataReturned) {
  myConsole.log("calling: <b>deleteSomeIdsSuccess()</b>");
  debugger;
} // end of function doDumpFailure()



/*************************************************************************
 *************************************************************************/
function deleteSomeIdsFailure(dataPosted, dataReturned) {
  myConsole.log("calling: <b>deleteSomeIdsFailure()</b>");
  debugger;
} // end of function doDumpFailure()


/*************************************************************************
  generic log event routine
  can use as a temporary event handler until I figure out how
  I might use it (the event)!
 *************************************************************************/
function logEvent(evt) {
  myConsole.log("event occurred: <b>"+evt.type+"</b>");
} // end of function logEvent()


/*************************************************************************
 Mainly used for debugging...
 called on click event of 'refreshPage' button
 (which is only visible in full screen mode)
 First, display info about how the page is reloading...
 Then call function after a bit via a setTimeout() to do actual reloading
 *************************************************************************/
function refreshPage(sSpecialMsg) {
  myConsole.log("<b>refreshPage()</b> function called");
  const spinnerImageNd = $("#spinnerImage")[0];
  const menuNd = $("#menu")[0];
  const tintNd = $("#tint")[0];
  const pageContentNd = $("#pageContent")[0];
  const jsErrInfo = $("#jsErrInfo")[0];
  const s=[];
  
  menuNd.style.display = "none";
  tintNd.style.display = "none";
  
  if (typeof jsErrInfo !== "undefined") {
    jsErrInfo.style.display = "none";
  } // end if
  
  pageContentNd.style.background = "white";
  pageContentNd.style.display = "block";
  
  s.push("<center>");
  s.push("<br>&nbsp;");
  s.push("<br>&nbsp;");
  s.push("<br>&nbsp;");
  
  if (typeof sSpecialMsg === "string") {
    s.push("<h1>"+sSpecialMsg+"</h1><br>");
  } // end if
  
  s.push("<h1>One Moment...</h1>");
  s.push("<br>");
  s.push("<h1>Refreshing Page...</h1>");
  s.push("<br>");
  s.push("<img id='spinner' style='padding:0px;margin:0px;'>");
  s.push("</center>");
  pageContentNd.innerHTML = s.join("");
  const spinnerNd = $("#spinner")[0];
  spinnerNd.src = spinnerImageNd.src;
  
  // ** might be good to save the log contents to indexedDb before 
  // ** going on to refresh the page... since that will clear our page's
  // ** memory and start fresh!
  //
  // ** we then (of course) would need in the pageSetup() function
  // **
  setTimeout(refreshPage2,2000);
}// end of function refreshPage()


/*************************************************************************
  do actual page reloading...
 *************************************************************************/
function refreshPage2() {
  myConsole.log("<b>refreshPage2()</b> function called");
  location.reload(true);
}// end of function refreshPage()


/*************************************************************************
 keep tint layer (and stuff above it) from scrolling off the screen
 if the page underneath it is scrollable up and down
 *************************************************************************/
function noScroll(event) {
  console.log("noScroll(event) function called");
  event.cancelDefault();
} // end of function noScroll()





/*************************************************************************
  position and size GUI items based on the window's current dimensions
  called on the page's resize event.
  
  also called from the pageSetup() function.
 *************************************************************************/
function pageResize(evt) {
  myConsole.log("<b>pageResize()</b> function called");
  
  w = window.innerWidth;
  h = window.innerHeight;
  
  resizePanel(splashNd);
  resizePanel(registerDevicePanelNd);
  
  menuNd.style.height = (h-100)+"px";
  pageContentNd.style.height = menuNd.style.height;
  pageContentNd.style.width = (w)+"px";
  
  const titleBarNd = $("#titleBar")[0];
  titleBarNd.style.width = (w)+"px";
  
  const installToHomeScreenInitPromptNd = $("#installToHomeScreenInitPrompt")[0];
  
  installToHomeScreenInitPromptNd.style.top = (h-43)+"px";
  installToHomeScreenInitPromptNd.style.width = (w-45)+"px";
  
  const reminderPanelNd = $("#reminderPanel")[0];
  const viewLogPanelNd = $("#viewLogPanel")[0];
  resizePanel(reminderPanelNd);
  resizePanel(viewLogPanelNd);
  
  tintNd.style.width = (w)+"px";
  tintNd.style.height = (h)+"px";
} // end of function pageResize()



/*************************************************************************
  on iOS, fires when:
            - user presses Home button which takes them to Home Screen.
            - a phone call comes in and user is routed away to the phone app.
            - user taps on a tel: link and msg box comes up asking user to dial
            - using alert() ... alert box will take focus away from the page!
            - user brings up a SELECT tag selection widget
            - user locks their device
 *************************************************************************/
function pageBlur(evt) {
  let lg = myConsole.log("<b>pageBlur()</b> event fired");
  lg.addObjInfo(evt, "evt");
  
  setLastFocusEventTimestamp();
  
  if (app.displayingReminderPanel) {
    hideReminderPanel(); // function in ui.js
  } // end if
  
  // pauseTimeTimer();  // function in ui.js
} // end of function pageBlur()


/*************************************************************************
 on iOS, fires when:
              - user re-enters active app from home screen
              - user finishes using phone app and control is returned to the web app
              - an alert() fired and the user responded to it
              - user brings up a SELECT tag selection widget and then leaves it
              - after unlocking device and still on the page
 *************************************************************************/
function pageFocus(evt) {
  let lg = myConsole.log("<b>pageFocus()</b> event fired");
  lg.addObjInfo(evt, "evt");
  
  if (!app.mobileDevice) return;
  
  if (!hasFriendlyReminder()) {
    updateTimeDisplay(); // in ui.js
    return;
  } // end if
  
  setTimeout(displayReminderPanel,1000); // displayReminderPanel() is in ui.js
  //updateTimeDisplay(); // in ui.js
} // end of function pageBlur()



/*************************************************************************
  does not seem to be firing as of now
 *************************************************************************/
function pageHide(evt) {
  myConsole.log("pageHide() event fired");
} // end of function pageHide()


/*************************************************************************
  does not seem to be firing as of now
 *************************************************************************/
function pageShow(evt) {
  myConsole.log("pageShow() event fired");
} // end of function pageHide()

/*************************************************************************
  does not seem to be firing as of now
 *************************************************************************/
function visibilityChange(evt) {
  myConsole.log("visibilityChange() event fired");
} // end of function pageHide()





/*************************************************************************
  generic resize of DIV and set up its formatting as a panel.
 *************************************************************************/
function resizePanel(pnl) {
  myConsole.log("<b>resizePanel()</b> function called");
  let w2 = w - 20;
  let h2 = h - 20;
  
  pnl.style.position = "absolute";
  pnl.style.width = (w2)+"px";
  pnl.style.height = (h2)+"px";
  pnl.style.left = (10)+"px";
  pnl.style.top = (10)+"px";
  
  pnl.style.background = "linear-gradient(180deg, rgba(244,241,234,1) 0%, rgba(138,179,180,0.9416141456582633) 100%)";
  pnl.style.border = "solid blue 5px"
  pnl.style.borderRadius = "20px";
  
} // end of function resizePanel()




// ##########################################################################
//   Functions listed below should be listed in alphabetical order...
// ##########################################################################



/*************************************************************************
  Build Home Screen User Menu HTML markup based on current user's
  "permissions" and add to the DOM.
  
  Note that items such as "menuList" and "greeting" and "userNameLabel"
  are already part of the page because they are defined in "index.html"
 *************************************************************************/
function buildMenu() {
  myConsole.log("<b>buildMenu2()</b> called");
  let s=[];
  const menuListNd = $("#menuList")[0];
  const userNameLabelNd = $("#userNameLabel")[0]; // inside a div with a className of: "greeting"
  let sPerson = "Mom's";
  let sPerson2 = "Mom's";
  const Q = '"';
  
  splashNd.style.display = "none";
  
  userNameLabelNd.innerHTML = app.currentUserInfo.userName;
  
  if (hasPermission("mom")) {
    sPerson = "My";
  } // end if
  
  s.push("<li class='mnuItm'>");
  // viewAppts() is in this js file
  s.push("<button class='mnuBtn' onclick='viewAppts()'>📅 "+sPerson+" Appointments</button>");
  s.push("</li>");
  
  if (hasPermission("admin,wife,sister")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='pickLocStatus()'>Set Location Status</button>");
    s.push("</li>");
  } // end if
  
  /* s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='viewOldAppts()'>"+sPerson2+" Old Appointments</button>");
  s.push("</li>");
  */
  
   if (hasPermission("admin,wife,sister,mom")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='whereAre()'>🔎 Where Are...</button>");
    s.push("</li>");
  } // end if
  
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    // editAppts() is in this js file
    s.push("<button class='mnuBtn' onclick='editAppts()'>Edit Appointments</button>");
    s.push("</li>");
  } // end if

  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    // editApptDates() function is in this JS file
    s.push("<button class='mnuBtn' onclick='editApptDates()'>📆 Edit Appointment Dates</button>");
    s.push("</li>");
  } // end if
  
  /*
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='editShoppingListItems()'>Edit Shopping List Items</button>");
    s.push("</li>");
  } // end if
  
  
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='editStoreNames()'>Edit Store Names</button>");
    s.push("</li>");
  } // end if
  
  // 📋
  /*
  if (hasPermission("admin,mom,wife")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='editShoppingList()'>🥦 "+sPerson+" Shopping List</button>");
    s.push("</li>");
  } // end if
  */
  
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='editLocStatuses()'>Edit Location Statuses</button>");
    s.push("</li>");
  } // end if
  

  
  

  
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='editUsers()'>Edit Users</button>");
    s.push("</li>");
  } // end if
  
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='editWeeklyReminders()'>Edit Weekly Reminders</button>");
    s.push("</li>");
  } // end if
  
  if (hasPermission("admin") || app.desktopDevice) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='refreshPage()'>♻ REFRESH PAGE! ♻</button>");
    s.push("</li>");
  } // end if
  
  if (hasPermission("admin") || app.desktopDevice) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='deregisterDevice()'>❗De-Register Device❗</button>");
    s.push("</li>");
  } // end if
  
  
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    // displayReminderPanel() is in this file
    // this button is to help me with debugging???
    s.push("<button class='mnuBtn' onclick='displayReminderPanel()'>Bring Up Reminder Panel</button>");
    s.push("</li>");
  } // end if
  
  
  if (hasPermission("admin") || app.desktopDevice) {
    s.push("<li class='mnuItm'>");
    //
    s.push("<button class='mnuBtn' onclick='lgDisplayLog()'>View Log</button>");
    s.push("</li>");
    const otherEmergencyOptionsNd = $("#otherEmergencyOptions")[0];
    otherEmergencyOptionsNd.style.display = "none";
  } // end if
  
  
  if (hasPermission("admin") || app.desktopDevice) {
    s.push("<li class='mnuItm'>");
    //
    s.push("<button class='mnuBtn' onclick='debuggerMode()'>Enter Browser's Debugger</button>");
    s.push("</li>");
  } // end if
  
  
  // put in button to press to quickly start a phone call with mom!
  s.push(callMomButtonMarkup());
  
  
  s.push(getUserStatusMenuMarkup());
  
  for (let n=0;n<6;n++) {
  s.push("&nbsp;<br>");
  } // next n
  
  menuListNd.innerHTML = s.join("");
  menuNd.style.display = "block";
  
  const mnuBtns = $(".mnuBtn");
  for (let n=0;n<mnuBtns.length;n++) {
    mnuBtns[n].style.width = (w-30)+"px";
  } // next n
  
  const callMomBtnNd = $(".callMomBtn")[0];
  
  // if Mom is running the app she will of course not have a 
  // [Call Mom] button.
  // So... the conditional code to take that into consideration...
  if (typeof callMomBtnNd !== "undefined") {
    callMomBtnNd.style.width = (w-30)+"px";
    
    const callMomBtn2Nd = $(".callMomBtn2")[0];
    callMomBtn2Nd.style.width = (w-30)+"px";
    
    const callMomBtnImgNd = $("#callMomBtnImg")[0];
    callMomBtnImgNd.width = (w-30)+"";
    callMomBtnImgNd.src = pixelImgNd.src;
  } // end if
  
  app.currentView = "menu";
  app.appointmentsVisited = false;
  
  if (!app.timeDisplaySetupForFirstTime) {
    setupTimeDisplay(); // is in ui.js
    app.timeDisplaySetupForFirstTime = true;
  } // end if
  
} // end of function buildMenu()





/*************************************************************************
 *************************************************************************/
function callMomButtonMarkup() {
  myConsole.log("<b>callMomButtonMarkup()</b> called");
  const s=[];
  
  // If you are not mom, get an option to call mom!
  if (!hasPermission("mom")) {
    
    if (typeof app.momUser === "undefined") {
      const lg = myConsole.log("app.momUser is undefined");
      return "";
    } // end if
    
    if (app.mobileDevice && !app.iPad) {
      s.push("<li class='mnuItm'>");
      //
        let sMomPhone = app.momUser.phone; 


        s.push("<div class='callMomBtn'>");
          s.push("<div class='callMomBtn2'>");
          s.push("📞 Call Mom");
          s.push("<a href='tel:+1"+sMomPhone+"'>");
            s.push("<img width='400' height='50' id='callMomBtnImg' border='0'>");
          s.push("</a>");
          s.push("</div>"); // callMomBtn2

        s.push("</div>"); // callMomBtn      
      s.push("</li>");
    } // end if
  } // end if
  
  return s.join("");
} // end of function callMomButtonMarkup()



/*************************************************************************
 *************************************************************************/
function dayOfWeek(dt) {
		var sDay;
	
		switch(dt.getDay()) {
			case 0:
				sDay = "Sunday";
				break;
			case 1:
				sDay = "Monday";
				break;
			case 2:
				sDay = "Tuesday";
				break;
			case 3:
				sDay = "Wednesday";
				break;
			case 4:
				sDay = "Thursday";
				break;
			case 5:
				sDay = "Friday";
				break;
			case 6:
				sDay = "Saturday";
				break;
		} // end of switch()
		
		return sDay;
	} // end of function dayOfWeek()
	



/*************************************************************************
  allow me to easily see current app values.
  ... and who knows what else
 *************************************************************************/
function debuggerMode() {
  var appObj = app;
  debugger;
} // end of function debuggerMode() 


/*************************************************************************
  mainly used to quickly be able to test device registration after
  running this.
 *************************************************************************/
function deregisterDevice() {
  myConsole.log("<b>deregisterDevice()</b> called");
  localStorage.removeItem("userEmailAdr");
  localStorage.removeItem("pin");
  localStorage.removeItem("viewCmd");
  
  refreshPage("Device De-registered!");
  // at this point the device registration screen show automatically show up
  
} // end of function deregisterDevice()





/*************************************************************************
 *************************************************************************/
function displayIosInstallHelp() {
  
} // end of function displayIosInstallHelp() 




/*************************************************************************
 *************************************************************************/
function editApptDates() {
  console.log("<b>editApptDates()</b> function called");
  menuNd.style.display = "none";
  
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"appointmentDates",containerDomEl:pageContentNd,addButton:true});
  app.currentView = "editApptDates";
} // end of function editApptDates()




/*************************************************************************
 *************************************************************************/
function editAppts() {
  console.log("<b>editAppts()</b> function called");
  menuNd.style.display = "none";
  bCheck=true;
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"appointments",containerDomEl:pageContentNd,addButton:true});
  app.currentView = "editAppts";
} // end of function editAppts()





/*************************************************************************
edit different location statuses that a user can pick from...
 *************************************************************************/
function editLocStatuses() {
  myConsole.log("<b>editLocStatuses()</b> function called");
  menuNd.style.display = "none";
   // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"locStatuses",containerDomEl:pageContentNd,addButton:true});
  app.currentView = "editLocStatuses";
} // end of function editLocStatuses()





/*************************************************************************
 *************************************************************************/
function editShoppingListItems() {
  console.log("<b>editShoppingListItems()</b> function called");
  menuNd.style.display = "none";
 
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"listItems",containerDomEl:pageContentNd,addButton:true});
  app.currentView = "editShoppingListItems";
} // end of function editShoppingListItems()




/*************************************************************************
 *************************************************************************/
function editStoreNames() {
  console.log("<b>editStoreNames()</b> function called");
  menuNd.style.display = "none";
 
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"stores",containerDomEl:pageContentNd,addButton:true});
  app.currentView = "editStoreNames";
} // end of function editStoreNames()





/*************************************************************************
 *************************************************************************/
function editUsers() {
  console.log("<b>editUsers()</b> function called");
  menuNd.style.display = "none";
  //buildBasicListUi({forTable:"users",cmd:"getUsers",saveCmd:"updateUserInfo",containerDomEl:pageContentNd,addButton:true});
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"users",containerDomEl:pageContentNd,addButton:true});
  app.currentView = "editUsers";
}// end of function editUsers() 




/*************************************************************************
 *************************************************************************/
function editWeeklyReminders() {
  console.log("<b>editWeeklyReminders()</b> function called");
  menuNd.style.display = "none";
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"weeklyReminders",containerDomEl:pageContentNd,addButton:true});
  app.currentView = "editWeeklyReminders";
} // end of function editWeeklyReminders()




/*************************************************************************
 *************************************************************************/
function exitApptView() {
  console.log("<b>exitApptView()</b> function called");
  const menuNd = document.getElementById("menu");
  const pageContentNd = document.getElementById("pageContent");
  
  pageContentNd.style.display = "none";
  pageContentNd.innerHTML = "";
  menuNd.style.display = "block";
  app.currentView = "menu";
} // end of function exitApptView()




/*************************************************************************
 *************************************************************************/
	function formattedTime(dt) {
		var nHour = dt.getHours();
		var sAMPM = "AM";
		var sTime;
		var sMinutes = zeroPadded(dt.getMinutes());
		
		if (nHour > 11) {
			sAMPM = "PM";
		} // end if
		
		if (nHour > 12) {
			nHour = nHour - 12;
		} // end if
		
		sTime = (nHour)+":";
				
		sTime = sTime + sMinutes + " " +sAMPM;
		return sTime;
	} // end of function formattedTime()


/*************************************************************************
 *************************************************************************/
  function getCurrentUser() {
    myConsole.log("<b>getCurrentUser()</b> called");
    const users = app.usersByIndex;
    const nMax = users.length;
    
    for (let n=0;n<nMax;n++) {
      const user = users[n];
      
      if (app.userEmailAdr === user.emailAdr) {
        myConsole.log("current user found and set.");
        return user;
      } // end if
      
    } // next n
    
  } // end of function getCurrentUser()


/*************************************************************************
 *************************************************************************/
	function getFullFormattedTime(dt) {
    if (typeof dt === "undefined") {
      console.log("😵😵 Rut Roe! An undefined dt parameter variable!!");
      debugger; // when in debug mode, this allows us to see where the problem is from!
      
      return "undefined dt param in <b>getFullFormattedTime()</b>"; // go back where we came from
    } // end if
    
		var nHour = dt.getHours();
		var sMinutes = zeroPadded(dt.getMinutes());
		var sSeconds = zeroPadded(dt.getSeconds());
		var sAMPM = "AM";
	   	var s = "";
	   
	   
	   	s = s + dayOfWeek(dt) + ", ";
	   	
	   	s = s + getMonthName(dt) + " ";
	   	s = s + dt.getDate()+" "+(dt.getFullYear());
	   	
	  // 	s = s + "<br>";
	   	s = s + "&nbsp;&nbsp;&nbsp;&nbsp;";
    
    
	   	if (nHour > 11) {
			sAMPM = "PM";
		} // end if
		
		if (nHour > 12) {
			nHour = nHour - 12;
		} // end if
		
		s = s + (nHour)+":" + sMinutes + ":" + sSeconds + " " + sAMPM;
		
		return s;
	}  // end of function getFullFormattedTime()




/*************************************************************************
  used for live time display
  called by updateTimeDisplay() in ui.js
 *************************************************************************/
	function getFullFormattedTime2(dt) {
		var nHour = dt.getHours();
    let nMinutes = dt.getMinutes();
    let nSeconds = dt.getSeconds();
		let sMinutes = zeroPadded(nMinutes);
		let sSeconds = zeroPadded(nSeconds);
		var sAMPM = "AM";
	   	var s = "";
	   
	   
	   	s = s + dayOfWeek(dt) + ", ";
	   	
	   	s = s + getMonthName(dt) + " ";
	   	s = s + dt.getDate()+" "+(dt.getFullYear());
	   	
	  // 	s = s + "<br>";
	   	s = s + " ";
    
    
	   	if (nHour > 11) {
			sAMPM = "PM";
		} // end if
		
		if (nHour > 12) {
			nHour = nHour - 12;
		} // end if
		
    let sCMHOpen = "";
    let sCMHClose = "";
    let sCSHOpen = "";
    let sCSHClose = "";
    
    if (nSeconds===0) {
      sCSHOpen = "<span class='flashSecond'>";
      sCSHClose = "</span>";
    } // end if
    
    if (nMinutes===0 && nSeconds===0) {
      sCMHOpen = "<span class='flashMinute'>";
      sCMHClose = "</span>";
    } // end if
    
    
		s = s + sCMHOpen + (nHour)+ sCMHClose + ":" + sCSHOpen + sMinutes + sCSHClose + ":" + sCSHOpen + sSeconds + sCSHClose + " " + sAMPM;
		
		return s;
	}  // end of function getFullFormattedTime()





/*************************************************************************
  called from:  pageSetup() function in this js file.
 *************************************************************************/
function getLatestImportantInfo(nextFunc) {
  myConsole.log("<b>getLatestImportantInfo()</b> function called");
  
  if (app.gettingImportantData) {
    myConsole.log("already getting important data");
  //  nextFunc();
    return;
  } // end if
  
  const iData={}; // empty input data object
  
  app.gettingImportantData = true;
  
  app.nextFunc = nextFunc;
  apiCall("getLatestImportantInfo", iData, getLatestImportantInfoSuccess, getLatestImportantInfoFailure);
  
} // end of function getLatestImportantInfo()




/*************************************************************************
   generates display of future appointments based on results
   returned back from data source
   
   Procedure:
     Steps: ...
          app.js
          ======
          1:  call: getLatestImportantInfo()    in app.js
          2:  which calls:  apiCall()          in app.js
          3:  which calls the end point:  "/api"   in server.js (search for:    #api_endpoint  in file)
              (the command passed in is: "getFutureAppts")
          server.js
          =========
          4:  which calls:    getFutureAppts()   in server.js
          5:  which sets up a new task on {dbTaskProc} to run the getFutureApptsProc() function when ready
          6.  call the:   dbTaskProc.performTasks()  to kick things off!
          7.  getFutureApptsProc()  if run!
          8.  Does an neDb query on the "appointment" record type  (search for: #future_appt_query1 in file)
          9.  If successful, it returns the results in:   returnPayload.data 
         10.  The function that is in: doneTaskFunction variable is called passing the: (returnPayload)   
         
 *************************************************************************/
function getLatestImportantInfoSuccess(dataPosted, dataReturned) {
  myConsole.log("<b>getLatestImportantInfoSuccess()</b> function called");
  
  try {
    const nMax = dataReturned.returnPayload.length;
    
    for (let n=0;n<nMax;n++) {
      const retPayloadItm = dataReturned.returnPayload[n];
      
      if (typeof retPayloadItm.data !== "undefined") {
        const data = retPayloadItm.data;
        addReturnedDataToModel(data); // function is in ui.js
      } // end if
      
    } // next n
    
    app.gettingImportantData = false;
    
    if (!app.currentUserInfo) {
      app.currentUserInfo = getCurrentUser();
    } // end if
    
    const fn = app.nextFunc;
    if (typeof fn === "function") {
      fn();
      app.nextFunc = undefined;
      return;
    } // end if
  
  } catch(err) {
    debugger;
    let returnedData = {};
    returnedData.result = "jsError";
    returnedData.jsFunctionName = "getLatestImportantInfoSuccess()";
    returnedData.errorOrigin = "client";
    returnedData.message = err.message;
    returnedData.fileName = err.sourceURL;
    returnedData.lineNumber = err.line;
    returnedData.spotInCode = "n/a";
    
    console.log(err);
    
    displayErrorInfo(returnedData);  // function is in ui.js
        
  } // end of try/catch
  
} // end of function getLatestImportantInfoSuccess()



/*************************************************************************

 *************************************************************************/
function getLatestImportantInfoFailure(dataPosted, dataReturned) {
  myConsole.log("getLatestImportantInfoFailure() function called");
  const test = dataReturned;
  debugger;
} // end of function getLatestImportantInfoFailure()



/*************************************************************************
  called from:  startApiFuncCallPart2()
 *************************************************************************/
function getMomUser() {
  myConsole.log("<b>getMomUser()</b> called");
  const users = app.usersByIndex;
  const nMax = users.length;
  
  for (let n=0;n<nMax;n++) {
    const usr = users[n];
    const aFuncTags = usr.functionTags.split(",");
    const nMax2 = aFuncTags.length;
    for (let n2=0;n2<nMax2;n2++) {
      if (aFuncTags[n2]==="mom") {
        myConsole.log("momUser object was found!");
        return usr;
      } // end if
    } // next n2
  } // next n
  
  myConsole.log("momUser object was NOT found");
} // end of function getMomUser()





/*************************************************************************

 *************************************************************************/
	function getMonthName(dt) {
		var sMonth ="?";
		
		switch(dt.getMonth()) {
			case 0:
				sMonth = "Jan";
				break;
			case 1:
				sMonth = "Feb";
				break;
			case 2:
				sMonth = "Mar";
				break;
			case 3:
				sMonth = "Apr";
				break;
			case 4:
				sMonth = "May";
				break;
			case 5:
				sMonth = "Jun";
				break;
			case 6:
				sMonth = "Jul";
				break;
			case 7:
				sMonth = "Aug";
				break;
			case 8:
				sMonth = "Sep";
				break;
			case 9:
				sMonth = "Oct";
				break;
			case 10:
				sMonth = "Nov";
				break;
			case 11:
				sMonth = "Dec";
				break;
		} // end of switch()
		
		return sMonth;
	} // end of function getMonthName()



/*************************************************************************
 *************************************************************************/
function getTimeAfter(dt,nHoursAfter) {
	    //            hrs        ms    secs  mins
		var msDif = nHoursAfter * 1000 * 60 * 60;
		var msNewDate = dt.getTime() + msDif; 
		
		return new Date(msNewDate);
} // end of function getTimeBefore()






/*************************************************************************
 *************************************************************************/
function getTimeBefore(dt,nHoursBefore) {
	    //            hrs         ms    secs  mins
		var msDif = nHoursBefore * 1000 * 60 * 60;
		var msNewDate = dt.getTime() - msDif; 
		
		return new Date(msNewDate);
} // end of function getTimeBefore()




/*************************************************************************
  return true if current weekday has a friendly reminder
 *************************************************************************/
function hasFriendlyReminder() {
  const weeklyReminders = app.weeklyRemindersByIndex;
  prepReminders(weeklyReminders);
  const dt = new Date();
  const nDayOfWeek = dt.getDay();
  const nMax = weeklyReminders.length;
  
  for (let n=0;n<nMax;n++) {
    const reminder = weeklyReminders[n];
    
    if (reminder.dayOfWeekNum === nDayOfWeek) {
      return true; // have at least one!
    } // end if
    
  } // next n
  
  return false; // do not have one for the current day of week
  
} // end of function hasFriendlyReminder()




/*************************************************************************

 *************************************************************************/
function hasPermission(sPerms) {
  
  if (!app.currentUserInfo) {
    return false; // don't have a current user? then they can't have permission!!
  } // end if
  
  const currUser = app.currentUserInfo;
  const userFunctionTagsByIndex = currUser.functionTags.split(",");
  const checkPermsByIndex = sPerms.split(",");
  const userFunctionTagsByPerm = [];
  const nMax1 = userFunctionTagsByIndex.length;
  for (let n=0;n<nMax1;n++) {
    userFunctionTagsByPerm[userFunctionTagsByIndex[n]] = userFunctionTagsByIndex[n].toLowerCase();
  } // next n
  
  
  const nMax2 = checkPermsByIndex.length;
  for (let n=0;n<nMax2;n++) {
    const sCheck = checkPermsByIndex[n].toLowerCase();
    
    if (userFunctionTagsByPerm[sCheck]) {
      // Found one!
      return true;
    } // end if 
  } // next n
  
  return false;
} // end of function hasPermission()



/*************************************************************************
 *************************************************************************/
function hidePopupDialog() {
  myConsole.log("<b>hidePopupDialog()</b> called");
  const calPopupNd = $("#calPopup")[0];
  
  calPopupNd.style.display = "none";
  splashNd.style.display = "none";
  tintNd.style.display = "none";
} // end of function hidePopupDialog()



/*************************************************************************
 *************************************************************************/
function hideRegisterDevicePanel() {
  myConsole.log("<b>hideRegisterDevicePanel()</b> called");
  tintNd.style.display = "none";
  registerDevicePanelNd.style.display = "none";
} // end of function hideRegisterDevicePanel()


/*************************************************************************
 *************************************************************************/
function hideSplashPanel() {
  myConsole.log("<b>hideSplashPanel()</b> called");
  tintNd.style.display = "none";
  splashNd.style.display = "none";
} // end of function hideSplashPanel()



/*************************************************************************
 *************************************************************************/
function installThis() {
  
} // end of function installThis()




/*************************************************************************
  check if value passed in is a  Date or not...
 *************************************************************************/
function isDate(vInput) {
  let bIsDate = false;
  
  if (Object.prototype.toString.call(vInput) === '[object Date]') {
    bIsDate = true;
  } // end if
  
  return bIsDate;
} // end of function isDate()


/*************************************************************************
  call this function from the JavaScript console, and get a list
  of schema data types in the console!
 *************************************************************************/
function listDataTypes() {
  const nMax = app.schemaInfoByIndex.length;
  
  console.log(" ");
  console.log(" recordType");
  console.log("=================");
  for (let n=0;n<nMax;n++) {
    const tblDef = app.schemaInfoByIndex[n]
    console.log("   "+tblDef.recordType);
  } // next n
  console.log("===============================");
  console.log(" ");
} // end of function listDataTypes()




/*************************************************************************
 *************************************************************************/
function numberOfDaysBetweenDates(date1, date2) {
  var one_day= 1000 * 60 * 60 * 24;
  var date1ms = date1.getTime(); 
  var date2ms = date2.getTime(); 
  var difference_ms = date2ms - date1ms; 
  //  getMonth() getDate() getFullYear
  if (date1.getMonth() === date2.getMonth()) {
    if (date1.getDate() === date2.getDate()) {
      if (date1.getFullYear() === date2.getFullYear()) {
        return 0;
      } // end if
    } // end if
  } // end if

  return Math.round(difference_ms/one_day); 

} // end of function numberOfDaysBetweenDates()




/*************************************************************************
 *************************************************************************/
function numberOfHoursBetweenDates(date1, date2) {
  return Math.floor(Math.abs(date1 - date2) / 36e5);
} // end of function numberOfHoursBetweenDates()


/*************************************************************************
 *************************************************************************/
function numberOfMinutesBetweenDates(date1, date2) {
  const diffMs = (date1 - date2);
  const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
  return Math.abs(diffMins);
} // end of function numberOfMinutesBetweenDates();




/*************************************************************************
  called from menu button
 *************************************************************************/
function pickLocStatus() {
  myConsole.log("<b>pickLocStatus()</b> called");
  const s=[];
  const Q = '"';
  const aGlobalStatuses = [];
  const aPrivateStatuses = [];
  const aStatuses = app.locStatusesByIndex;
  const nMax = aStatuses.length
  let bItemSet = false;
  app.possibleLocStatusId = ""; // assume nothing selected at first
  app.locStatusSelected = false;
  
  
  for (let n=0;n<nMax;n++) {
    const status = aStatuses[n];
    
    if (status.isGlobal === "Y") {
      aGlobalStatuses.push(status);
    } else {
      if (status.forUserId === app.currentUserInfo.userId) {
        aPrivateStatuses.push(status);
      } // end if
    } // end if/else
    
  } // next n
  
  s.push("<b>Change Your Status:</b>");
  
  const nMax2 = aGlobalStatuses.length;
  const nMax3 = aPrivateStatuses.length;
  let sSetBtnDisabled = " disabled";
  
  //s.push("");
  s.push("<div id='setLocStatusVwPrt' ");
  s.push(">");
  
    s.push("<ul class='locStatusLst'>");
  
  
    // OUTPUT [GLOBAL] STATUSES:
    for (let n=0;n<nMax2;n++) {
      const status = aGlobalStatuses[n];
      let sClass = "locStatusLstItm";
      
      // locStatuseId ... SHOULD be: locStatusId
      if (status.locStatuseId === app.currentUserInfo.locStatusId) {
        sClass = "locStatusLstItmSel";
        sSetBtnDisabled = "";
        bItemSet = true;
        app.possibleLocStatusId = status.locStatuseId;
        app.locStatusSelected = true;
      } // end if
      
      s.push("<li class='"+sClass+" locStatusItm' ");
      
      if (bItemSet) {
        s.push(" id='lastLocStatusSel' ");
      } // end if
      
      s.push("data-locstatusid="+Q+status.locStatuseId+Q);
      s.push(">");
      s.push(status.locStatusText);
      s.push("</li>");
    } // next n
  
    // OUTPUT PRIVATE USER STATUSES:
    for (let n=0;n<nMax3;n++) {
      const status = aPrivateStatuses[n];
      let sClass = "locStatusLstItm";
      
      // locStatuseId ... SHOULD be: locStatusId
      if (status.locStatuseId === app.currentUserInfo.locStatusId) {
        sClass = "locStatusLstItmSel";  //
        bItemSet = true;
        app.possibleLocStatusId = status.locStatuseId;
        app.locStatusSelected = true;
      } // end if
      
      s.push("<li class='"+sClass+" locStatusItm' ");
      
      if (bItemSet) {
        s.push(" id='lastLocStatusSel' ");
      } // end if
      
      s.push("data-locstatusid="+Q+status.locStatuseId+Q);
      s.push(">");
      s.push(status.locStatusText);
      s.push("</li>");
    } // next n
  
    s.push("</ul>"); // locStatusLst
  s.push("</div>"); //setLocStatusVwPrt
  
  s.push("<div id='locStatSetBtns' ");
  s.push(">");
    s.push("<button id='setLocStatusBtn' "+sSetBtnDisabled);
    s.push(" onclick="+Q+"pickLocStatusSet()"+Q)
    s.push(">Set Your Status</button>");

    s.push("&nbsp;<button ")
    s.push("onclick="+Q+"pickLocStatusCancel()"+Q)
    s.push(">Cancel</button>")
  s.push("</div>"); // locStatSetBtns
  
  
  pageContentNd.innerHTML = s.join("");
  
  const setLocStatusVwPrtNd = $("#setLocStatusVwPrt")[0];
  setLocStatusVwPrtNd.style.height = (h-210)+"px";
  const locStatSetBtnsNd = $("#locStatSetBtns")[0];
  locStatSetBtnsNd.style.top = (h-150)+"px";
  pageContentNd.style.display = "block";
  menuNd.style.display = "none";
  
  if (bItemSet) {
    app.lastLocStatusSelNd = $("#lastLocStatusSel")[0];
  } // end if
  
  setLocStatusVwPrtNd.addEventListener("click",pickLocStatusSel);

} // end of function pickLocStatus()



/*************************************************************************
  called from cancel button
 *************************************************************************/
function pickLocStatusCancel() {
  myConsole.log("<b>pickLocStatusCancel()</b> called");
  pageContentNd.style.display = "none";
  menuNd.style.display = "block";
  pageContentNd.innerHTML = "";
} // end of function pickLocStatusCancel()



/*************************************************************************
  called when user Selects a location status for list of statuses
  
 *************************************************************************/
function pickLocStatusSel(evt) {
  const el = evt.srcElement;
  
  
  app.possibleLocStatusId = el.dataset.locstatusid;
  
  if (app.locStatusSelected) {
    // unselect visually previously selected item:
    app.lastLocStatusSelNd.className = "locStatusLstItm locStatusItm";
  } // end if
  
  const setLocStatusBtnNd = document.getElementById("setLocStatusBtn");
  setLocStatusBtnNd.disabled = false;
  el.className = "locStatusLstItmSel locStatusItm";  // show as highlighted!
  app.lastLocStatusSelNd = el;
  app.locStatusSelected = true;
} // end of function pickLocStatusSel()



/*************************************************************************
  called from [Set Your Status] button press
 *************************************************************************/
function pickLocStatusSet() {
  const setLocStatusBtnNd = document.getElementById("setLocStatusBtn");
  setLocStatusBtnNd.style.display = "none";
  const currentUserInfo = app.currentUserInfo;
  
  currentUserInfo.locStatusId = app.possibleLocStatusId;
  currentUserInfo.statusSetDate = new Date();
  
  const iData = {};  
  iData.tableName = "users";
  iData.recData = currentUserInfo;
  apiCall("saveRec", iData, pickLocStatusSuccess, pickLocStatusSetFailure);
} // end of function pickLocStatusSet()


/*************************************************************************
  called if API call to save the user status fails
 *************************************************************************/
function pickLocStatusSetFailure() {
  myConsole.log("pickLocStatusSetFailure() called.")
  debugger;
} // end of function pickLocStatusSetFailure()




/*************************************************************************
  called if API call to save the user status succeeds!
 *************************************************************************/
function pickLocStatusSuccess() {
  myConsole.log("pickLocStatusSuccess() called.")
  
  // go back to main menu screen:
  pageContentNd.style.display = "none";
  menuNd.style.display = "block";
  pageContentNd.innerHTML = "";
  
  userNotice("Location Status Set!"); // function in ui.js
} // end of function pickLocStatusSuccess()




/*************************************************************************
 *************************************************************************/
function prepReminders(weeklyReminders) {
  const nMax = weeklyReminders.length;
  
  for (let n=0;n<nMax;n++) {
    const reminder = weeklyReminders[n];
    
    reminder.dayOfWeekNum = -1; // assume not found
    
    if (reminder.dayOfWeek === "Sunday") {
      reminder.dayOfWeekNum = 0;
    } // end if
    
    if (reminder.dayOfWeek === "Monday") {
      reminder.dayOfWeekNum = 1;
    } // end if
    
    if (reminder.dayOfWeek === "Tuesday") {
      reminder.dayOfWeekNum = 2;
    } // end if
    
    if (reminder.dayOfWeek === "Wednesday") {
      reminder.dayOfWeekNum = 3;
    } // end if
    
    if (reminder.dayOfWeek === "Thursday") {
      reminder.dayOfWeekNum = 4;
    } // end if
    
    if (reminder.dayOfWeek === "Friday") {
      reminder.dayOfWeekNum = 5;
    } // end if
    
    if (reminder.dayOfWeek === "Saturday") {
      reminder.dayOfWeekNum = 6;
    } // end if
  } // next n
} // end of function prepReminders()




/*************************************************************************
'Register This Device' button is clicked by the user
 *************************************************************************/
function registerThisDevice() {
  myConsole.log("registerDevice() function called");
  const regEmailAdr = document.getElementById("regEmailAdr");
  const appPIN = document.getElementById("appPIN");
  const regResultsNd = $("#regResults")[0];
  
  // do some input validation here
  
  
  regResultsNd.innerHTML = "Registering this device...";
  
  setTimeout("registerThisDevice2()",20);
} // end of function registerThisDevice()




/*************************************************************************
 Do actual API call to server to register the device
 *************************************************************************/
function registerThisDevice2() {
  myConsole.log("<b>registerThisDevice2()</b> function called");
  const regEmailAdr = document.getElementById("regEmailAdr");
  const appPIN = document.getElementById("appPIN");
  let iData = {};
  
  iData.userEmailAdr = regEmailAdr.value;
  iData.pin = appPIN.value;
  
  apiCall("registerDevice", iData, registerDeviceSuccessful, registerDeviceFailure);
} // end of function registerThisDevice2() 





/*************************************************************************
  if device registration on the server was a success, 
  the function below is executed.
 *************************************************************************/
function registerDeviceSuccessful(postedData, returnedData) {
  myConsole.log("<b>registerDeviceSuccessful()</b> function called");
  console.log("postedData.userEmailAdr="+postedData.userEmailAdr);
  console.log("postedData.pin="+postedData.pin);
  
  localStorage.setItem("userEmailAdr",postedData.userEmailAdr);
  localStorage.setItem("pin",postedData.pin);
  localStorage.setItem("viewCmd","getFutureAppts");
  
  app.pin = postedData.pin;
  app.userEmailAdr = postedData.userEmailAdr;
  
  hideRegisterDevicePanel();
  hideSplashPanel();
  
  
  // temp below for debugging
 // const otherEmergencyOptionsNd = document.getElementById("otherEmergencyOptions");
 // otherEmergencyOptionsNd.style.display = "block";
  
  app.gettingImportantData = false;
  
  // below does call to get data from server
  // because we are passing 'start' function , it will call function to display menu when done.
  console.log("About to call:  startApiFuncCall())...");

  startApiFuncCall();
} // end of function registerDeviceSuccessful()




/*************************************************************************
 *************************************************************************/
function registerDeviceFailure(postedData, returnedData) {
  console.log("<b>registerDeviceFailure()</b> function called");
  const regResultsNd = $("#regResults")[0];
  
  regResultsNd.innerHTML = "Houston... There was a problem...";
  
} // end of function registerDeviceFailure()




/*************************************************************************
 *************************************************************************/
function resetApp() {
  // return;
  console.log("<b>resetApp()</b> function called");
  const iData = {};
  
  apiCall("resetApp", iData, resetAppSuccessful, resetAppFailure);
} // end of function resetApp()



/*************************************************************************
 *************************************************************************/
function resetAppRequest() {
  console.log("resetAppRequest() function called");
  if (confirm('reset app???')) {
    info1Nd.innerHTML = "Resetting App... Please Wait...";
    setTimeout(resetApp,600);
  } // end if
  
  
} // end of function resetAppRequest()




/*************************************************************************
 *************************************************************************/
function resetAppSuccessful(postedData, returnedData) {
  console.log("<b>resetAppSuccessful()</b> function called");
  info1Nd.innerHTML = "App was Reset...";
  localStorage.setItem("userEmailAdr","");
  localStorage.setItem("pin","");
  localStorage.setItem("viewCmd","getFutureAppts");
  initAppObj();
  refreshPage();
} // end of function



/*************************************************************************
 *************************************************************************/
function resetAppFailure(postedData, returnedData) {
  console.log("<b>resetAppFailure()</b> function called");
  debugger;
} // end of function resetAppFailure()



/*************************************************************************
 *************************************************************************/	
function sameDate(dt1, dt2) {
  var bFlag = false;

  if (dt1.getDate() === dt2.getDate() &&
      dt1.getMonth() === dt2.getMonth() &&
      dt1.getFullYear() === dt2.getFullYear() ) {
      bFlag = true;
  } // end if

  return bFlag;
} // end of function sameDate()




/*************************************************************************
 *************************************************************************/
function setCurrentUser(taskData) {
  myConsole.log("<b>setCurrentUser()</b> called")
  const currUserObj = taskData.currentUserInfo;
  
  if (taskData.payloadStatus !== "error") {
    app.currentUserInfo = currUserObj;
    addRecDataToModel(currUserObj);  // right now, this function is in:   ui.js
    return true;
  } else {
    
  } // end if/else
  
} // end of function setCurrentUser()



/*************************************************************************
  when did the app last receive focus (from Home screen or where ever)...
  save that date time stamp to local storage.
 *************************************************************************/
function setLastFocusEventTimestamp() {
  myConsole.log("<b>setLastFocusEventTimestamp()</b> called");
  const dt = new Date();
  
  localStorage.setItem("lastFocusEvt",dt+"");
} // end of function setLastFocusEventTimestamp() 



/*************************************************************************
 *************************************************************************/
function showDeviceRegistrationPanel() {
  myConsole.log("<b>showDeviceRegistrationPanel()</b> called");
  const regEmailAdrNd = $("#regEmailAdr")[0];
  const appPinNd = $("#appPIN")[0];
  const regResultsNd = $("#regResults")[0];
  
  regEmailAdrNd.value = "";
  appPinNd.value = "";
  regResultsNd.innerHTML = "";
  
  splashNd.style.display = "none";
  
  tintNd.style.display = "block";
  registerDevicePanelNd.style.top = "50px";
  registerDevicePanelNd.style.height = (h-100)+"px";
  registerDevicePanelNd.style.display = "block";
  
  regEmailAdrNd.focus();
} // end of function showDeviceRegistrationPanel() 






/*************************************************************************
 *************************************************************************/
function showConfigProblemPanel() {
  myConsole.log("<b>showConfigProblemPanel()</b> called");
  tintNd.style.display = "block";
} // end of function




/*************************************************************************
 *************************************************************************/
function showInstallToHomeScreenPrompt() {
  myConsole.log("<b>showInstallToHomeScreenPrompt()</b> called");
  installToHomeScreenInitPromptNd.style.display = "block";
} // end of function showInstallToHomeScreenPrompt()



/*************************************************************************
   do first API call on startup...
   called from: pageSetup()   ... in this file
 *************************************************************************/
function startApiFuncCall() {
  myConsole.log("<b>startApiFuncCall()</b> called");
  getLatestImportantInfo(startApiFuncCallPart2); // in this file
} // end of function startApiFuncCall()


/*************************************************************************
   After doing the first API call on startup...
 *************************************************************************/
function startApiFuncCallPart2() {
  myConsole.log("<b>startApiFuncCallPart2()</b> called");
  app.momUser = getMomUser(); // in this file
  buildMenu(); // in this file
  setTimeout(displayReminderPanel, app.reminderPanelDelay); // displayReminderPanel() is in ui.js
} // end of function startApiFuncCall()


/*************************************************************************
mainly a hack
 *************************************************************************/
function titleBarClick() {
  const titleBarNd = $("#titleBar")[0];
  
  titleBarNd.style.display = "none";
} // end of function titleBarClick()





/*************************************************************************
 *************************************************************************/
function toggleShowPwd(chkBx) {
  const appPIN_Nd = $("#appPIN")[0];
  
  if (chkBx.checked) {
    appPIN_Nd.type = "text";
  } else {
    appPIN_Nd.type = "password";
  } // end if/else
  
} // end of function toggleShowPwd()



/*************************************************************************
  Bring up normal view of mom's upcoming appointments...
  1. sort appointment date records by appointment date!
  
 *************************************************************************/
function viewAppts() {
  myConsole.log("<b>viewAppts()</b> called");
  
  if (app.apptsHtml !== "") {
    const pageContentNd = document.getElementById("pageContent");
    pageContentNd.innerHTML = app.apptsHtml;
  } // end if
  
  getLatestImportantInfo(viewAppts2);
} // end of function viewAppts()


/*************************************************************************
  Bring up normal view of mom's upcoming appointments...
  1. sort appointment date records by appointment date!
  
 *************************************************************************/
function viewAppts2() {
  myConsole.log("<b>viewAppts2()</b> called");
  
  try {
    const s=[];
    const menuNd = document.getElementById("menu");
    const pageContentNd = document.getElementById("pageContent");
    const sHouseIcon = "🏠";
    const sCarIcon = "🚗";
    const apptLst = app.appointmentDatesByIndex;
    const apptLookup = app.appointmentsByServerId;
    const weeklyReminders = app.weeklyRemindersByIndex;
    const nMax2 = weeklyReminders.length;
    const nMax = apptLst.length;
    const startOfToday = new Date();  // today's date
    startOfToday.setHours(0);
    startOfToday.setMinutes(0);

    const now = new Date(); // current date and time
    const Q = '"';
    let sPerson = "Mom's";

    if (hasPermission("mom")) {
      sPerson = "My";
    } // end if

    prepReminders(weeklyReminders); // function is in this file


    apptLst.sort(function(rec1,rec2) {
      return rec1.appointmentDate - rec2.appointmentDate;
    });

    weeklyReminders.sort(function(rec1,rec2) {
      return rec1.dayOfWeekNum - rec2.dayOfWeekNum;
    });

    // s.push("");

    // ########################################################
    s.push("<div class='viewTitleBar' ");
    s.push("style="+Q+"width:"+(w)+"px;"+Q+" ");
    s.push("");
    s.push(">");

    s.push("<button class='backBtn' ");
    s.push("onclick="+Q+"exitApptView()"+Q+" ");
    s.push(">&lt;</button>");

    s.push(sPerson+" Appointments");

    s.push("</div>"); // close of viewTitleBar DIV
    // ########################################################


    s.push("<div class='apptLst' ");
    s.push("style="+Q);
    s.push("width:"+(w)+"px;");
    s.push("height:"+(h-55-100)+"px;");
    s.push(Q);
    s.push(">");


    s.push("<ul class='appLst2'>");

    s.push("<li><span class='hlt'>Each Week:</span>");
    s.push("<ul>");

    for (let n=0;n<nMax2;n++) {
      const reminder = weeklyReminders[n];

      s.push("<li class='everyWeek'>");
      s.push(reminder.reminderText);
      s.push(":<ul>");
        s.push("<li class='everyWeek2'>Every <i>");
        s.push(reminder.dayOfWeek);
        s.push("</i>");

        if (reminder.dayOfWeekNum === now.getDay()) {
          //s.push("&nbsp;&nbsp;&nbsp;&nbsp;");
          s.push("<br>Which is today! 😀");
        } // end if

        s.push("</li>");
      s.push("</ul>");
      s.push("</li>");
    } // next n


    s.push("</ul>");
    s.push("</li>");

    for (let n=0;n<nMax;n++) {
      const apptDateInfo = apptLst[n];
      if (apptDateInfo.appointmentDate > startOfToday) {
        const sApptKey = apptDateInfo.appointmentId;
        const apptInfo = apptLookup[sApptKey];
        let nHoursUntil = -1;
        let nDaysUntil = numberOfDaysBetweenDates(now, apptDateInfo.appointmentDate);
        let sPlural = "";
        let sHighlightClass = "hltLater";
        let dtRemindBefore,dtBeReadyAt;

        if (nDaysUntil === 0) {
          sHighlightClass = "hlt";
        } // end if

        s.push("<li class='apptDetails'><hr>");

        if (apptInfo.atHome === "Y") {
          s.push("<span class='icon'>"+sHouseIcon+"</span>&nbsp;");
        } else {
          s.push("<span class='icon'>"+sCarIcon+"</span>&nbsp;");
        } // end if

        s.push("<span class='"+sHighlightClass+"'>");      
        if (typeof apptInfo === "undefined") {
          s.push("variable: <i>apptInfo</i> is undefined!");
        } else {
          s.push(apptInfo.appointmentTitle);
        } // end if/else

        s.push("</span>");

        s.push("<ul class='lst2'><li>");

        if (nDaysUntil === 0) {
          nHoursUntil = numberOfHoursBetweenDates(now, apptDateInfo.appointmentDate);  // function in this file

          if (nHoursUntil > 1) {
            sPlural = "s";
          } // end if

          //s.push("<br>nHoursUntil:'"+nHoursUntil+"'<br>");
          let sContext = " from now";

          if (apptDateInfo.appointmentDate<now) {
            sContext = " ago";
          } // end if

          s.push("<span class='hoursAway'>");
          if (nHoursUntil>0) {
            s.push((nHoursUntil) + " hour"+sPlural+sContext);
          } else {
            if (apptDateInfo.appointmentDate > now) {
              s.push("in ");
            } // end if
            s.push("less than an hour"+sPlural+sContext);
          } // end if/else

          s.push("</span>");
        } else { 
          if (nDaysUntil > 1) {
            sPlural = "s";
          } // end if

          s.push("<span class='dayAway'>");
          s.push((nDaysUntil) + " day"+sPlural+" from now");
          s.push("</span>");
        } // end if (nDaysUntil === 0) / else

   //     s.push("<br>apptInfo.atHome:'"+apptInfo.atHome+"'<br>");
   //     s.push("<br>apptInfo.seatCushion:'"+apptInfo.seatCushion+"'<br>");

        if (sameDate(now, apptDateInfo.appointmentDate)) {
          let sExtra = "";

          if (apptInfo.atHome === "Y") {
            sExtra = " (At Home)";
          } // end if
          s.push("<ul class='lst3'><li><span class='today'>Today"+sExtra+":</span>");
        } else {
          s.push(" on: <ul><li>"+dayOfWeek(apptDateInfo.appointmentDate)+", ");
          s.push(getMonthName(apptDateInfo.appointmentDate)+" "+apptDateInfo.appointmentDate.getDate());
          s.push(", "+apptDateInfo.appointmentDate.getFullYear());
          s.push("</li>");
        } // end if / else

        // s.push("");
        let sTimeCaption = "at";

        if (apptInfo.atHome === "Y") {        
          sTimeCaption = "should be arriving at our house";

          if (apptInfo.visitRange > 0) {    
            sTimeCaption = sTimeCaption + " between";
          } // end if

          if (typeof apptInfo.visitorName === "string") {
            if (apptInfo.visitorName.length > 0) {
              sTimeCaption = apptInfo.visitorName + " " + sTimeCaption;
            } // end if
          } // end if
        } // end if

        s.push("<li>"+sTimeCaption+": " + formattedTime(apptDateInfo.appointmentDate));

        if (apptInfo.atHome === "Y" && apptInfo.visitRange > 0) {     
          const dtRangeEnd = getTimeAfter(apptDateInfo.appointmentDate, apptInfo.visitRange);
          s.push(" and ");
          s.push(formattedTime(dtRangeEnd));
        } // end if

        s.push("</li>");

        if (apptInfo.important !== "") {
          s.push("<li>"+apptInfo.important+"</li>");
        } // end if

        if (nDaysUntil === 0) {
          dtRemindBefore = getTimeBefore(apptDateInfo.appointmentDate, apptInfo.remindOrville);
          dtBeReadyAt = getTimeBefore(apptDateInfo.appointmentDate, apptInfo.readyToGo);

          s.push("<li>Remind Orville &nbsp;&nbsp; at: ");
          s.push(formattedTime(dtRemindBefore));
          s.push("</li>");

          if (!apptInfo.atHome === "Y") {
            // Road Trip!!!
            s.push("<li>Be ready to go &nbsp;&nbsp; at: ");
            s.push(formattedTime(dtBeReadyAt));
            s.push("</li>");

            if (apptInfo.seatCushion === "Y") {
              s.push("<li>Don't forget <b>seat cushion</b> for car.</li>");
            } // end if

            s.push("<li>Don't forget your <b>sun glasses</b>...<br>&nbsp;&nbsp;&nbsp;(if needed).</li>");
          } else {
            // At home!!

          } // end if/else

          // comments are only displayed the day of so as not to 
          // possibly confuse the user
          if (apptInfo.comments !== "" && apptInfo.important !== apptInfo.comments) {	
            s.push("<li>"+apptInfo.comments+"</li>");
          } // end if

        } // end if (nDaysUntil === 0)

        s.push("<br>&nbsp;</ul>");
        s.push("</li></ul>");
        s.push("</li>");

      } // end if (apptDateInfo.appointmentDate > now)
    } // next n

    s.push("</ul>");

    s.push(getUserStatusAppointmentMarkup());
    
    s.push("</div>"); // close of apptLst DIV

    app.apptsHtml = s.join("");
    pageContentNd.innerHTML = app.apptsHtml;
    pageContentNd.style.display = "block";
    viewAppts2SetScrollTop();

    if (!app.appScrollEventSet) {
      myConsole.log("setting up scroll event listener for 'pageContent'");
      pageContentNd.addEventListener('scroll',viewAppts2SaveScrollTop);
      app.appScrollEventSet = true;
    } // end if

    menuNd.style.display = "none";
    app.currentView = "appointments";
    app.appointmentsVisited = true;
  } catch(err) {
    const returnedData = {};
    returnedData.result = "jsError";
    returnedData.jsFunctionName = "viewAppts2()";
    returnedData.errorOrigin = "client";
    returnedData.message = err.message;
    returnedData.fileName = err.sourceURL;
    returnedData.lineNumber = err.line;
    returnedData.spotInCode = "";
        
    console.log(err);
    debugger;    
    displayErrorInfo(returnedData);  // function is in ui.js
  } // end of try / catch block
  
} // end of function viewAppts2() 




/*************************************************************************
  save scroll top in app object as a result of 'scroll' event.
 *************************************************************************/
function viewAppts2SaveScrollTop(evt) {
  myConsole.log("<b>viewAppts2SaveScrollTop()</b> called");
  
  if (app.currentView !== "appointments") {
    myConsole.log("view is not appointments... don't save scrollTop.");
    return;
  } // end if
  
  app.appointmentsScrollTop = pageContentNd.scrollTop;
  myConsole.log(" -- scrolled!");
} // end of function viewAppts2SetScrollTop() 



/*************************************************************************
 *************************************************************************/
function viewAppts2SetScrollTop() {
  try {
    pageContentNd.scrollTop = app.appointmentsScrollTop;
  } catch(err) {
    
  } // end of try/catch
} // end of function viewAppts2SetScrollTop() 




/*************************************************************************
 *************************************************************************/
function zeroPadded(nNum) {
	   var sVal = nNum + "";
	   
	   if (sVal.length === 1) {
	   		sVal = "0" + sVal;
	   } // end if
	   
	   return sVal;
} // end of function zeroPadded()





// ##########################################################################
//   SERVICE WORKER functions
//
//   Functions listed below should be listed in alphabetical order...
// ##########################################################################
function serviceWorkerSetup() {
  if (!'serviceWorker' in navigator) {
    myConsole.log("service workers are <b>NOT</b> supported by this browser");
    return;
  } // end if
  
  myConsole.log("service workers supported by browser");
  
  navigator.serviceWorker.register('/sw.js').then(function(registration) {
    // register [callback] block (of [callback] / error blocks)
    myConsole.log("service worker was registered");
    
    /***********************************************
     get message back from the service worker:
     ***********************************************/
    navigator.serviceWorker.addEventListener("message", event => {
      myConsole.log("navigator.serviceWorker 'message' event fired in client (get message from service worker)");
      const data = event.data;
      
      if (data.cmd==="lg") {
        const lg = myConsole.log(data.msg.entry);
        lg.tagsByIndex.push("sw");
        return;
      } // end if
      
    }); // end of message event listener block
    
    
    /***********************************************
     ***********************************************/    
    window.addEventListener('beforeinstallprompt', (e) => {
      myConsole.log("beforeinstallprompt event fired in client");
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Stash the event so it can be triggered later.
      app.deferredPrompt = e;
    }); // end of beforeinstallprompt event listener block
    
    
    /***********************************************
     ***********************************************/        
    window.addEventListener('appinstalled', (evt) => {
      myConsole.log("appinstalled event fired in client (installed web app to home screen)");
      
    }); // end of appinstalled event listener block
    
    
    
  }, function(err) { 
    // the error block (of callback / [error] block)
    myConsole.log("service worker registration Failed");
    console.log(err);
  });  // end of entire register service worker block
  
} // end of function serviceWorkerSetup()





// ##########################################################################
//   LOGGING functions
//
//   See top of file for important initialization code.
//
//   Functions listed below should be listed in alphabetical order...
// ##########################################################################



/*************************************************************************
 *************************************************************************/
function lg(sMsg,objOptions) {
  let logEntry = {};
  
  if (currentLoggingDebugLevel === DEBUG_LEVEL_NONE) {
    return;
  } // end if
  
  if (typeof sMsg !== "string") return;
  if (sMsg === "") return;
  
  logEntry.recordType = "logEntry";
  logEntry.timestamp = new Date();
  logEntry.startTime = new Date();
  logEntry.msg = sMsg;
  logEntry.details = "";
  logEntry.origin = "client";
  logEntry.options = {};
  logEntry.tagsByIndex = [];
  logEntry.childTasksByIndex = [];
  logEntry.parentTask = "na";
  
  
  logEntry.addChildTask = function(childTask) {
    let le = this;
    le.childTasksByIndex.push(childTask);
    childTask.parentTask = le;
  } // end of markComplete method
  
  
  logEntry.addToDetails = function(sInfo) {
    logEntry.details = logEntry.details + "<p>"+sInfo+"</p>";
  } // end of addToDetails method
  
  logEntry.addObjInfo = function(obj, sVarName) {
    const lg = this;
    lg.addToDetails(getObjInfo(obj, sVarName));
  } // end of addObjInfo
  
  
  
  logEntry.markComplete = function() {
    let le = this;
    le.endTime = new Date();
  } // end of markComplete method
  
  if (typeof objOptions === "object") {
    logEntry.options = objOptions;
    
    if (objOptions.serviceWorker) {
      logEntry.tagsByIndex.push("service worker");
    } // end if
    
  } // end if
  
  let sMsg2 = sMsg + "";
  let nPos = sMsg2.indexOf("<");
  
  if (nPos > -1) {
    checkValNd.innerHTML = sMsg2;    
    sMsg2 = checkValNd.textContent;
  } // end if
  
  const ts = "⏱["+formattedDateTime(logEntry.timestamp)+"] ";
  console.log(ts+sMsg2);
  
  logEntriesByIndex.push(logEntry);
  return logEntry;
} // end of lg() function


/*************************************************************************
   see top of this file for myConsole.log() method definition!
 *************************************************************************/




/*************************************************************************
 *************************************************************************/
function lgClear() {
  logEntriesByIndex = [];
  lgDisplayLog();
} // end of lgClear()


/*************************************************************************

s.push("");
 *************************************************************************/
function lgDisplayLog() {
  menuNd.style.display = "none";
  const viewLogPanelNd = $("#viewLogPanel")[0];
  const s=[];
  const nMax = logEntriesByIndex.length;
  const Q = '"';
  
  s.push("<div id='viewLogEntry' >");
  s.push("</div>"); // viewLogEntry
  
  s.push("<div id='viewLogPanelLst' ");
  s.push("style="+Q);
  s.push("width:"+(w - 20 - 22)+"px;");
  s.push("height:"+(h - 20 - 135)+"px;");
  s.push(Q);
  s.push(">");
  s.push("<ul class='logPanelLst'>");
  
  // ======================================
  for(let n=0;n<nMax;n++) {
    const logEntry = logEntriesByIndex[n];
    s.push("<li class='logEntry logPanelLstItm' ");
    s.push("data-idx="+Q+n+Q);
    s.push(">");
    s.push(logEntry.msg);
    s.push("<br>");
    
    s.push("<small>");
    s.push(getFullFormattedTime(logEntry.timestamp));
    s.push("&nbsp;&nbsp;&nbsp;&nbsp;Origin: &nbsp;");
    s.push(logEntry.origin);
    s.push("</small>");
    s.push("</li>");
  } // next n
  // ======================================
  
  s.push("</ul>");
  
  
  s.push("</div>"); // viewLogPanelLst
  
  s.push("<div style="+Q);
  s.push("position:absolute;");
  s.push("z-index:2000;");
  s.push("width:"+(w - 20 - 30-15)+"px;");
  s.push("height:40px;");
  s.push("left:5px;");
  s.push("top:"+(h - 85)+"px;");
  s.push(Q);
  s.push(">");
  s.push("<button onclick='lgDisplayLogClose()'>Close</button>&nbsp;&nbsp;&nbsp;");
  s.push("");
  
  s.push("<button onclick='lgClear()'>Clear</button>&nbsp;");
  
  s.push("</div>"); // close of button area
  
  viewLogPanelNd.innerHTML = s.join("");
  const entryCells = $(".logEntry");
  const nMax2 = entryCells.length;
  for(let n=0;n<nMax2;n++) {
    const entryCell = entryCells[n];
    entryCell.addEventListener("click", lgDisplayLogEntryDetails);
  } // next n
  
  viewLogPanelNd.style.zIndex = "3000";
  viewLogPanelNd.style.display = "block";
  
  
} // end of function lgDisplayLog()


/*************************************************************************

s.push("");
 *************************************************************************/
function lgDisplayLogClose() {
  const viewLogPanelNd = $("#viewLogPanel")[0];
  viewLogPanelNd.style.display = "none";
  viewLogPanelNd.innerHTML = "";
  menuNd.style.display = "block";
} // end of function lgDisplayLogClose()


/*************************************************************************
 *************************************************************************/
function lgDisplayLogEntryDetails(evt) {
  let nd = evt.target;
  
  if (nd.tagName === "SMALL") {
    nd = nd.parentNode;
  } // end if
  
  const idx = nd.dataset.idx - 0;
  const logEntry = logEntriesByIndex[idx];
  
  const s=[];
  const viewLogEntryNd = $("#viewLogEntry")[0];
  s.push("<h2>Log Entry Details</h2>");
  
  s.push(logEntry.msg);
  s.push("<br>");
  s.push("Timestamp: &nbsp;");
  s.push(getFullFormattedTime(logEntry.timestamp));
  s.push("<br>");
  s.push("Origin: &nbsp;");
  s.push(logEntry.origin);
  
  s.push(logEntry.details);
  
  s.push("<button id='logEntryCloseBtn' ");
  s.push(">");
  s.push("CLOSE</button>");
  
  viewLogEntryNd.innerHTML = s.join("");
  viewLogEntryNd.style.paddingLeft = "10px;"
  viewLogEntryNd.style.width = (w-50)+"px";
  viewLogEntryNd.style.height = (h-60)+"px";
  viewLogEntryNd.style.display = "block";
  
  const logEntryCloseBtnNd = $("#logEntryCloseBtn")[0];
  logEntryCloseBtnNd.addEventListener("click", lgDisplayLogEntryDetailsClose);
} // end of function lgDisplayLogEntryDetails()\



/*************************************************************************
 *************************************************************************/
function lgDisplayLogEntryDetailsClose(evt) {
  const viewLogEntryNd = $("#viewLogEntry")[0];
  
  viewLogEntryNd.style.display = "none";
  viewLogEntryNd.innerHTML = "";
} // end of function lgDisplayLogEntryDetails()\



/*************************************************************************
 *************************************************************************/
function lgVariableSnapshot(inputVar) {
  if (currentLoggingDebugLevel === DEBUG_LEVEL_NONE) {
    return;
  } // end if
  
  let logEntry = {};
  logEntry.recordType = "logEntryVariableSnapshot";
  logEntry.timestamp = new Date();
  
  
  logEntriesByIndex.push(logEntry);
} // end of function lgVariableSnapshot()


/*************************************************************************
 *************************************************************************/
function dspObjInfo(obj) {
  const Q = '"';
  
  for (let prop in obj) {
    let vVal = obj[prop];
    let sLine = prop+" ("
    let sDataType = typeof vVal;
    let bFound = false;
    
    if (Array.isArray(vVal) && !bFound) {
      sDataType = "Array";
      vVal = "[]";
      bFound = true;
    } // end if
    
    if (vVal instanceof Date && !bFound) {
      sDataType = "Date";
      vVal = getFullFormattedTime(vVal);
      bFound = true;
    } // end if
    
    if (typeof vVal === "function" && !bFound) {
      sDataType = "Function";
      vVal = "  "+prop+"()";
      bFound = true;
    } // end if
    
    if (typeof vVal === "object" && !bFound) {
      sDataType = "Object";
      vVal = "{}";
      bFound = true;
    } // end if
    
    if (typeof vVal === "string" && !bFound) {
      sDataType = "String";
      vVal = Q+vVal+Q;
      bFound = true;
    } // end if
    
    
    sLine = sLine + sDataType + "): " + vVal;
    console.log(sLine);
  } // next prop
  
} // end of function dspObjInfo()

/*************************************************************************
 *************************************************************************/
function getObjInfo(obj, sVarName) {
  const Q = '"';
  const s = [];
  
  s.push("<hr> - the values in the: <b>"+sVarName+"</b> object at this time...");
  s.push("<ul>");
  for (let prop in obj) {
    let vVal = obj[prop];
    let sLine = prop+" ("
    let sDataType = typeof vVal;
    let bFound = false;
    
    if (Array.isArray(vVal) && !bFound) {
      sDataType = "Array";
      vVal = "[] length: "+vVal.length;
      bFound = true;
    } // end if
    
    if (vVal instanceof Date && !bFound) {
      sDataType = "Date";
      vVal = getFullFormattedTime(vVal);
      bFound = true;
    } // end if
    
    if (typeof vVal === "function" && !bFound) {
      sDataType = "Function";
      vVal = "  "+prop+"()";
      bFound = true;
    } // end if
    
    if (typeof vVal === "object" && !bFound) {
      sDataType = "Object";
      vVal = "{}";
      bFound = true;
    } // end if
    
    if (typeof vVal === "string" && !bFound) {
      sDataType = "String";
      vVal = Q+vVal+Q;
      bFound = true;
    } // end if
    
    
    sLine = sLine + sDataType + "): " + vVal;
    s.push("<li>"+sLine+"</li>");
  } // next prop
  s.push("</ul>");
  return s.join("");
} // end of function getObjInfo()


/*************************************************************************
 *************************************************************************/
function getUserStatusAppointmentMarkup() {
  myConsole.log("<b>getUserStatusAppointmentMarkup()</b> called");

  const userStatusData = getUserStatusData();
  const allStatusUsers = userStatusData.allStatusUsers;

  return getUserStatusMarkup(allStatusUsers);
} // end of function getUserStatusAppointmentMarkup()





/*************************************************************************
 *************************************************************************/
function getUserStatusData() {
  myConsole.log("<b>getUserStatusData()</b> called");
  const users = app.usersByIndex;
  const nMax = users.length;
  const locStatusLookup = app.locStatusesByServerId;
  const activeStatusUsers = [];
  const allStatusUsers = [];
  
  for (let n=0;n<nMax;n++) {
    const user = users[n];
    const userStatus = {};
    
    // mom should not be listed in status list...
    if (user.functionTags !== "mom") {
      userStatus.userId = user.userId;
      userStatus.userName = user.userName;
      userStatus.emailAdr = user.emailAdr;
      userStatus.phone = user.phone;
      userStatus.statusText = "😴 I'm doing Nothing Special 😌"; // default unless overridden
      userStatus.extraInfo = "";
      
      
      if (user.locStatusId !== "") {
        const locStatus = locStatusLookup[user.locStatusId];

        if (typeof locStatus !== "undefined") {
          userStatus.statusText = locStatus.locStatusText;
          userStatus.extraInfo = locStatus.extraInfo;
          activeStatusUsers.push(userStatus);
        } // end if

      } // end  if

      allStatusUsers.push(userStatus);
    } // end if (user.functionTags !== "mom")
    
  } // next n
  
  const userStatusData = {};
  userStatusData.activeStatusUsers = activeStatusUsers;
  userStatusData.allStatusUsers = allStatusUsers;
  
  return userStatusData;
} // end of function getUserStatusData()


/*************************************************************************
 *************************************************************************/
function getUserStatusMarkup(userStatusData) {
  myConsole.log("<b>getUserStatusMarkup()</b> called");
  const s = [];
  const nMax = userStatusData.length;
  const Q1 = '“';
  const Q2 = '”';
  
  s.push("<br>");
  s.push("<b class='rightNowTitle'>🕑 Right now 😀...</b><br>");
  s.push("<table class='userStatusTable'>");
  
  for (let n=0;n<nMax;n++) {
    const userStatus = userStatusData[n];
    s.push("<tr>");
      s.push("<td nowrap class='userStatusUserName'>");
      s.push(userStatus.userName);
      s.push("'s ");
      s.push("status is");
      s.push(":</td>");
    s.push("</tr>");
    s.push("<tr>");
      s.push("<td nowrap class='userStatusUserStatus'>&nbsp;&nbsp;&nbsp;"+Q1);
      s.push(userStatus.statusText);
      s.push(Q2+"</td>");
    s.push("</tr>");
    
      if (userStatus.extraInfo !== "") {
        s.push("<tr>");
          s.push("<td nowrap class='userStatusExtraInfo'>&nbsp;&nbsp;&nbsp;"+Q1);
          s.push(userStatus.extraInfo);
          s.push(Q2+"</td>");
        s.push("</tr>");
      } // end if
    
      /*
        To display dial phone link there must be:
        - a phone number to dial
        - device must be a mobile device
        - device cannot be an iPad
        - current user can't be the same user being displayed (you can't dial yourself)!!
       */
      if (userStatus.phone !== "" && app.mobileDevice && !app.iPad && userStatus.emailAdr !== app.currentUserInfo.emailAdr) {
        s.push("<tr>");
          s.push("<td nowrap class='userStatusDialLinkContainer'>&nbsp;&nbsp;&nbsp;");
          s.push("<a class='dialLink' href='tel:+1"+userStatus.phone+"'");
          s.push(">");
            s.push("📞 Call ");
            s.push(userStatus.userName);
          s.push("</a>");
          s.push("</td>");
        s.push("</tr>");
      } // end if
    s.push("</tr>");
  } // next n
  
  s.push("</table>");
  
  
  return s.join("");
  
} // end of function getUserStatusMarkup()


/*************************************************************************
 *************************************************************************/
function getUserStatusMenuMarkup() {
  myConsole.log("<b>getUserStatusMenuMarkup()</b> called");
  const s = [];
  const userStatusData = getUserStatusData();
  const activeStatusUsers = userStatusData.activeStatusUsers;
  
  
  return getUserStatusMarkup(activeStatusUsers);
} // end of function getUserStatusMenuMarkup()




// call initAppObj() at the bottom of the file to
// make sure that anything that needs initializing first
// IS initialized first!!!
initAppObj(); // function is near the top of this file
