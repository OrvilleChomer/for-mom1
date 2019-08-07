// client-side js
// run by the browser each time your view template is loaded

/*************************************************************************
 *************************************************************************/


const app = {};


// some major DOM node elements' global variable declaration:
const splashNd = $("#splash")[0];
const tintNd = document.getElementById("tint");

const registerDevicePanelNd = document.getElementById("registerDevicePanel");
const info1Nd = document.getElementById("info1");
const installToHomeScreenInitPromptNd = document.getElementById("installToHomeScreenInitPrompt");
const menuNd = $("#menu")[0];

const sHdrInfo = window.navigator.userAgent;
let bIsStandalone = false;
let w,h;




/*************************************************************************

*************************************************************************/
function initAppObj() {
  console.log("initAppObj() function called");
  app.pin = getLocalValue('pin');
  app.userEmailAdr = getLocalValue('userEmailAdr');
  app.schemaInfoByIndex = [];
  app.schemaInfoByTableName = [];
  app.appointmentsByIndex = [];
  app.appointmentsByServerId = [];
  app.appointmentDatesByIndex = [];
  app.appointmentDatesByServerId = [];
} // end of function initAppObj()

 
initAppObj();


/*************************************************************************
function is used for API calls to server
*************************************************************************/
async function apiCall(cmd, dataPosted, fnSuccess,fnFailure) {
  console.log("apiCall function called");
  console.log("cmd="+cmd);
  dataPosted.cmd = cmd;
  dataPosted.needSchemaInfo = false;
  dataPosted.needCurrentUserInfo = false;
  
  let test = app;
  
  if (app.schemaInfoByIndex.length===0) {
    dataPosted.needSchemaInfo = true; // need the server to return the schema definitions
  } // end if
  
  
  if (!app.currentUserInfo) {
    dataPosted.needCurrentUserInfo = true;
  } // end if
  
  if (typeof dataPosted.userEmailAdr === "undefined") {
    dataPosted.userEmailAdr = app.userEmailAdr;
  } // end if
  
  if (typeof dataPosted.pin === "undefined") {
    dataPosted.pin = app.pin;
  } // end if
  
  const options = {
    method:'POST',
    body:JSON.stringify(dataPosted),
    headers:{"Content-Type":"application/json"}
  }; // end of options definition
  
  try {
    console.log("about to do an asyncronous fetch() call...");

    const response = await fetch('/api', options);
    console.log("about to process response returned from fetch()...");
    const returnedData = await response.json();

    if (returnedData.result === 'ok') {
      // OK
      console.log("API call returned a result of 'ok'");

      if (app.schemaInfoByIndex.length===0 && returnedData.schemaInfoByIndex) {
        console.log("setting up schema definitions locally that were returned from the server...");
        app.schemaInfoByIndex = returnedData.schemaInfoByIndex;
        let nMax = app.schemaInfoByIndex.length;
        let n;
        
        for (n=0;n<nMax;n++) {
          let tbl = app.schemaInfoByIndex[n];
          console.log(" --- setting up table name: "+tbl.tableName);
          app.schemaInfoByTableName[tbl.tableName] = tbl;
        } // next n
      } // end if (end of processing schema info)
      
      if (typeof fnSuccess === 'function') {
        console.log("about to call 'success' function (as a result of a successful server call)...");
        fnSuccess(dataPosted,returnedData);
      } // end if
    } else {
      // NOT OK
      console.log("API call did NOT return a result of 'ok'... it returned: "+returnedData.result);
      
      if (returnedData.info === 'site setup error') {
        console.log("server returned a site setup error");
        showConfigProblemPanel();
        return;
      } // end if
      
      if (returnedData.info === 'invalid API call') {
        console.log("server returned an invalid API call error message - current client device needs to be registered");
        showDeviceRegistrationPanel();
        return;
      } // end if
      
      if (typeof fnFailure === 'function') {
        console.log("about to call 'failure' function (as a result of server error)...");
        fnFailure(dataPosted,returnedData);
      } // end if
    } // end if
  } catch(err) {
    let returnedData = {};
    returnedData.result = "jsError";
    returnedData.message = err.message;
    returnedData.fileName = err.fileName;
    returnedData.lineNumber = err.lineNumber;
    if (typeof fnFailure === 'function') {
        console.log("about to call 'failure' function (for Js error)...");
        fnFailure(dataPosted,returnedData);
    } // end if
  } // end of try/catch
  
} // end of function apiCall()




/*************************************************************************
 *************************************************************************/
function getLocalValue(sKey, sDefaultValue) {
  let sValue = "";
  
  console.log("getLocalValue() function called... key="+sKey);
  
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
function pageSetup() {
  console.log("pageSetup() function called");
  tintNd.addEventListener('scroll', noScroll);
  
  info1Nd.innerHTML = sHdrInfo;
  
  if (sHdrInfo.indexOf("iPhone") > -1 || sHdrInfo.indexOf("iPad") > -1) {
    if (!window.navigator.standalone === true) {
      bIsStandalone = false;
      showInstallToHomeScreenPrompt();
    } else {
      bIsStandalone = true;
      let refreshPageNd = document.getElementById("refreshPage");
      refreshPageNd.style.display = "block";
    } // end if
  } // end if  
  
  
  pageResize();
  
  const sStartApiFuncCall = getLocalValue('startApiFuncCall','getFutureAppointments("start")'); 
  
  console.log("about to call: "+sStartApiFuncCall);
  setTimeout(sStartApiFuncCall,500); // do initial API call for this session
} // end of function pageSetup()



// set up main page event handlers:
window.addEventListener('load', pageSetup);
window.addEventListener('resize', pageResize);




/*************************************************************************
 Mainly used for debugging...
 called on click event of 'refreshPage' button
 (which is only visible in full screen mode)
 *************************************************************************/
function refreshPage() {
  console.log("refreshPage() function called");
  info1Nd.innerHTML = "reloading base page...";
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
 *************************************************************************/
function pageResize() {
  console.log("pageResize() function called");
  
  w = window.innerWidth;
  h = window.innerHeight;
  
  resizePanel(splashNd);
} // end of function pageResize()


/*************************************************************************
 *************************************************************************/
function resizePanel(pnl) {
  let w2 = w - 20;
  let h2 = h - 20;
  
  pnl.style.position = "absolute";
  pnl.style.width = (w2)+"px";
  pnl.style.height = (h2)+"px";
  pnl.style.left = (10)+"px";
  pnl.style.top = (10)+"px";
  
  pnl.style.background = "lightyellow";
  pnl.style.border = "solid blue 5px"
} // end of function resizePanel()




// ##########################################################################
//   Functions listed below should be listed in alphabetical order...
// ##########################################################################



/*************************************************************************
 *************************************************************************/
function buildMenu() {
  let s=[];
  const menuListNd = $("#menuList")[0];
  let sPerson = "Mom's";
  let sPerson2 = "Mom's";
  
  splashNd.style.display = "none";
  
  s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='viewAppts()'>"+sPerson+" Appointments</button>");
  s.push("</li>");
  
  /* s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='viewOldAppts()'>"+sPerson2+" Old Appointments</button>");
  s.push("</li>");
  */
  
  s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='editAppts()'>Edit Appointments</button>");
  s.push("</li>");
  
  s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='editApptDates()'>Edit Appointment Dates</button>");
  s.push("</li>");
  
  s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='editShoppingListItems()'>Edit Shopping List Items</button>");
  s.push("</li>");
  
  s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='editShoppingList()'>Shopping List</button>");
  s.push("</li>");
  
  
  s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='editLocStatuses()'>Edit Location Statuses</button>");
  s.push("</li>");
  
  s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='pickLocStatus()'>Set Location Status</button>");
  s.push("</li>");
  
  s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='editUsers()'>Edit Users</button>");
  s.push("</li>");
  
  s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='editWeeklyReminders()'>Edit Weekly Reminders</button>");
  s.push("</li>");
  
  menuListNd.innerHTML = s.join("");
  menuNd.style.display = "block";
  
  const mnuBtns = $(".mnuBtn");
  for (let n=0;n<mnuBtns.length;n++) {
    mnuBtns[n].style.width = (w-30)+"px";
  } // next n
  
} // end of function buildMenu()



/*************************************************************************
 *************************************************************************/
function getFutureAppointments(appState) {
  console.log("getFutureAppointments() function called");
  const iData = {};
  
  iData.appState = appState;
  apiCall("getFutureAppts", iData, getFutureAppointmentsSuccess, getFutureAppointmentsFailure);
  
} // end of function getFutureAppointments()




/*************************************************************************
   generates display of future appointments based on results
   returned back from data source
 *************************************************************************/
function getFutureAppointmentsSuccess(dataPosted, dataReturned) {
  console.log("getFutureAppointmentsSuccess() function called");
  //debugger;
  
  if (dataPosted.appState === "start") {
    buildMenu();
    return;
  } // end if
  
  
} // end of function getFutureAppointmentsSuccess()



/*************************************************************************
 *************************************************************************/
function getFutureAppointmentsFailure(dataPosted, dataReturned) {
  console.log("getFutureAppointmentsFailure() function called");
  const test = dataReturned;
  debugger;
} // end of function getFutureAppointmentsFailure()




/*************************************************************************
 *************************************************************************/
function hideRegisterDevicePanel() {
  tintNd.style.display = "none";
  registerDevicePanelNd.style.display = "none";
} // end of function hideRegisterDevicePanel()


/*************************************************************************
 *************************************************************************/
function hideSplashPanel() {
  tintNd.style.display = "none";
  splashNd.style.display = "none";
} // end of function hideRegisterDevicePanel()




/*************************************************************************
'Register This Device' button is clicked by the user
 *************************************************************************/
function registerThisDevice() {
  console.log("registerDevice() function called");
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
  console.log("registerThisDevice2() function called");
  const regEmailAdr = document.getElementById("regEmailAdr");
  const appPIN = document.getElementById("appPIN");
  let iData = {};
  
  iData.userEmailAdr = regEmailAdr.value;
  iData.pin = appPIN.value;
  
  apiCall("registerDevice", iData, registerDeviceSuccessful, registerDeviceFailure);
} // end of function registerThisDevice2() 





/*************************************************************************
 *************************************************************************/
function registerDeviceSuccessful(postedData, returnedData) {
  console.log("registerDeviceSuccessful() function called");
  console.log("postedData.userEmailAdr="+postedData.userEmailAdr);
  console.log("postedData.pin="+postedData.pin);
  localStorage.setItem("userEmailAdr",postedData.userEmailAdr);
  localStorage.setItem("pin",postedData.pin);
  localStorage.setItem("viewCmd","getFutureAppts");
  hideRegisterDevicePanel();
  hideSplashPanel();
} // end of function registerDeviceSuccessful()




/*************************************************************************
 *************************************************************************/
function registerDeviceFailure(postedData, returnedData) {
  console.log("registerDeviceFailure() function called");
  const regResultsNd = $("#regResults")[0];
  
  regResultsNd.innerHTML = "Houston... There was a problem...";
  
} // end of function registerDeviceFailure()




/*************************************************************************
 *************************************************************************/
function resetApp() {
  // return;
  console.log("resetApp() function called");
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
  console.log("resetAppSuccessful() function called");
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
  console.log("resetAppFailure() function called");
} // end of function resetAppFailure()




/*************************************************************************
 *************************************************************************/
function showDeviceRegistrationPanel() {
  
  const regEmailAdrNd = $("#regEmailAdr")[0];
  const appPinNd = $("#appPIN")[0];
  const regResultsNd = $("#regResults")[0];
  
  regEmailAdrNd.value = "";
  appPinNd.value = "";
  regResultsNd.innerHTML = "";
  
  tintNd.style.display = "block";
  registerDevicePanelNd.style.display = "block";
  
  regEmailAdrNd.focus();
} // end of function showDeviceRegistrationPanel() 






/*************************************************************************
 *************************************************************************/
function showConfigProblemPanel() {
  tintNd.style.display = "block";
} // end of function




/*************************************************************************
 *************************************************************************/
function showInstallToHomeScreenPrompt() {
  installToHomeScreenInitPromptNd.style.display = "block";
} // end of function showInstallToHomeScreenPrompt()





// ##########################################################################
//   SERVICE WORKER functions
//
//   Functions listed below should be listed in alphabetical order...
// ##########################################################################






// ##########################################################################
//   LOGGING functions
//
//   Functions listed below should be listed in alphabetical order...
// ##########################################################################

let logEntriesByIndex = [];
const DEBUG_LEVEL_NONE = 0;
const DEBUG_LEVEL_BASIC = 1;
const DEBUG_LEVEL_DETAILED = 2;

let currentLoggingDebugLevel = DEBUG_LEVEL_NONE;

/*************************************************************************
 *************************************************************************/
function lg(sMsg,objOptions) {
  let logEntry = {};
  
  if (currentLoggingDebugLevel === DEBUG_LEVEL_NONE) {
    return;
  } // end if
  
  logEntry.recordType = "logEntry";
  logEntry.timestamp = new Date();
  logEntry.startTime = logEntry.timestamp;
  logEntry.msg = sMsg;
  logEntry.options = {};
  logEntry.tagsByIndex = [];
  logEntry.childTasksByIndex = [];
  logEntry.parentTask = "na";
  
  
  logEntry.addChildTask = function(childTask) {
    let le = this;
    le.childTasksByIndex.push(childTask);
    childTask.parentTask = le;
  } // end of markComplete method
  
  
  
  logEntry.markComplete = function() {
    let le = this;
    le.endTime = new Date();
  } // end of markComplete method
  
  if (typeof objOptions === "object") {
    logEntry.options = objOptions;
    
    if (objOptions.serviceWorker) {
      logEntry.tagsByIndex.push("service worker");
    }
  } // end if
  
  console.log(sMsg);
  
  logEntriesByIndex.push(logEntry);
  
} // end of lg() function


/*************************************************************************
 *************************************************************************/
function lgDisplayLog() {
  
} // end of function lgDisplayLog()\




/*************************************************************************
 *************************************************************************/
function lgDisplayLogEntryDetails() {
  
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
