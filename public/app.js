// client-side js
// run by the browser each time your view template is loaded

/*************************************************************************
 *************************************************************************/


let app = {};


// some major DOM node elements' global variable declaration:
const splashNd = $("#splash")[0];
const tintNd = document.getElementById("tint");

const registerDevicePanelNd = document.getElementById("registerDevicePanel");
const info1Nd = document.getElementById("info1");
const installToHomeScreenInitPromptNd = document.getElementById("installToHomeScreenInitPrompt");
const menuNd = $("#menu")[0];
const pageContentNd = $("#pageContent")[0];

const sHdrInfo = window.navigator.userAgent;
let bIsStandalone = false;
let w,h;


let bCheck = false;

/*************************************************************************

*************************************************************************/
function initAppObj() {
  console.log("initAppObj() function called");
  app = {};
  app.pin = getLocalValue('pin');
  app.userEmailAdr = getLocalValue('userEmailAdr');
  app.mobileDevice = false;
  app.desktopDevice = true;
  
  app.schemaInfoByIndex = [];
  app.schemaInfoByTableName = [];
  app.schemaInfoByRecordType = [];
  app.appointmentsByIndex = [];
  app.appointmentsByServerId = [];
  app.appointmentDatesByIndex = [];
  app.appointmentDatesByServerId = [];
  app.ajaxLogByIndex = [];
  app.logAjax = true;
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
  const startTime = new Date();
  
  let test = app;
  let sSpot = "beginning";
  
  const ajaxLogEntry = {};
  
  ajaxLogEntry.cmd = cmd;
  ajaxLogEntry.notes = [];
  
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
  
  ajaxLogEntry.dataPosted = dataPosted;
  ajaxLogEntry.startTime = startTime;
  
  const options = {
    method:'POST',
    body:JSON.stringify(dataPosted),
    headers:{"Content-Type":"application/json"}
  }; // end of options definition
  
  try {
    console.log("about to do an asyncronous fetch() call...");
    sSpot = "about to do fetch";
    const response = await fetch('/api', options);
    sSpot = "received response";
    console.log("about to process response returned from fetch()...");

    const returnedData = await response.json();
    sSpot = "got returnedData from json response";
    
    if (returnedData.result === 'ok') {
      // OK
      console.log("API call returned a result of 'ok'");
      sSpot = "ajax result was 'ok'";
      ajaxLogEntry.endTime = new Date();
      
      if (app.schemaInfoByIndex.length===0 && returnedData.schemaInfoByIndex) {
        console.log("setting up schema definitions locally that were returned from the server...");
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
      } // end if (end of processing schema info)
      
      if (typeof fnSuccess === 'function') {
        console.log("about to call 'success' function (as a result of a successful server call)...");
        sSpot = "about to call 'success' function - processing returned data";
        returnedData.returnPayloadByTagName = [];
        let nMax2 = returnedData.returnPayload.length;
        for (let n=0;n<nMax2;n++) {
          const taskData = returnedData.returnPayload[n];
          
          if (typeof taskData.taskTag === "string") {
            returnedData.returnPayloadByTagName[taskData.taskTag] = taskData;
            
            if (taskData.taskTag === "currentUserInfo") {
              setCurrentUser(taskData);
            } // end if
          } // end if
          
        } // next n
        
        sSpot = "about to call 'success' function - do actual call of the function";
        
       
        fnSuccess(dataPosted,returnedData);
        sSpot = "'success' function call completed";
        ajaxLogEntry.notes.push("success function called");
      } // end if
      
      if (app.logAjax) {
        app.ajaxLogByIndex.push(ajaxLogEntry);
      } // end if
      
    } else {
      // NOT OK
      console.log("API call did NOT return a result of 'ok'... it returned: "+returnedData.result);
      sSpot = "returned data result was Not 'ok'... it equaled: "+returnedData.result;
      ajaxLogEntry.endTime = new Date();
      ajaxLogEntry.returnedData = returnedData;
      
      if (returnedData.info === 'site setup error') {
        console.log("server returned a site setup error");
        showConfigProblemPanel();
        ajaxLogEntry.notes.push("showConfigProblemPanel() called");
        return;
      } // end if
      
      if (returnedData.info === 'invalid API call') {
        console.log("server returned an invalid API call error message - current client device needs to be registered");
        showDeviceRegistrationPanel();
        ajaxLogEntry.notes.push("showDeviceRegistrationPanel() called");
        return;
      } // end if
      
      if (typeof fnFailure === 'function') {
        console.log("about to call 'failure' function (as a result of server error)...");
        fnFailure(dataPosted,returnedData);
      } // end if
      
      
      if (app.logAjax) {
        app.ajaxLogByIndex.push(ajaxLogEntry);
      } // end if
      
    } // end if
    
  } catch(err) {
    ajaxLogEntry.endTime = new Date();
    let returnedData = {};
    returnedData.result = "jsError";
    returnedData.jsFunctionName = "apiCall()";
    returnedData.errorOrigin = "client";
    returnedData.message = err.message;
    returnedData.fileName = err.fileName;
    returnedData.lineNumber = err.lineNumber;
    returnedData.spotInCode = sSpot;
    ajaxLogEntry.returnedData = returnedData;
    
    console.log(err);
    
    displayErrorInfo(returnedData);  // function is in ui.js
    
    if (typeof fnFailure === 'function') {
        console.log("about to call 'failure' function (for Js error)...");
        fnFailure(dataPosted,returnedData);
    } // end if
    
    if (app.logAjax) {
        app.ajaxLogByIndex.push(ajaxLogEntry);
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
    } // end if
  } // end if  
  
  if (sHdrInfo.toLowerCase().indexOf("mobile") > -1) {
    app.mobileDevice = true;
    app.desktopDevice = false;
  } // end if
  
  pageResize();
  
  // the function: getFutureAppointments() is in this js file!
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
function pageResize(evt) {
  console.log("pageResize() function called");
  
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
  
  tintNd.style.width = (w)+"px";
  tintNd.style.height = (h)+"px";
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
  Build Home Screen User Menu HTML markup based on current user's
  "permissions" and add to the DOM.
  
  Note that items such as "menuList" and "greeting" and "userNameLabel"
  are already part of the page because they are defined in "index.html"
 *************************************************************************/
function buildMenu() {
  let s=[];
  const menuListNd = $("#menuList")[0];
  const userNameLabelNd = $("#userNameLabel")[0]; // inside a div with a className of: "greeting"
  let sPerson = "Mom's";
  let sPerson2 = "Mom's";
  
  splashNd.style.display = "none";
  
  userNameLabelNd.innerHTML = app.currentUserInfo.userName;
  
  if (hasPermission("mom")) {
    sPerson = "My";
  } // end if
  
  s.push("<li class='mnuItm'>");
  // viewAppts() is in this js file
  s.push("<button class='mnuBtn' onclick='viewAppts()'>"+sPerson+" Appointments</button>");
  s.push("</li>");
  
  
  /* s.push("<li class='mnuItm'>");
  s.push("<button class='mnuBtn' onclick='viewOldAppts()'>"+sPerson2+" Old Appointments</button>");
  s.push("</li>");
  */
  
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    // editAppts() is in this js file
    s.push("<button class='mnuBtn' onclick='editAppts()'>Edit Appointments</button>");
    s.push("</li>");
  } // end if

  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    // editApptDates() function is in this JS file
    s.push("<button class='mnuBtn' onclick='editApptDates()'>Edit Appointment Dates</button>");
    s.push("</li>");
  } // end if
  
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
  
  if (hasPermission("admin,mom,wife")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='editShoppingList()'>"+sPerson+" Shopping List</button>");
    s.push("</li>");
  } // end if
  
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='editLocStatuses()'>Edit Location Statuses</button>");
    s.push("</li>");
  } // end if
  
  if (hasPermission("admin,wife,sister,mom")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='whereAre()'>Where Are...</button>");
    s.push("</li>");
  } // end if
  
  
  if (hasPermission("admin,wife,sister")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='pickLocStatus()'>Set Location Status</button>");
    s.push("</li>");
  }
  
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
  
  if (hasPermission("admin")) {
    s.push("<li class='mnuItm'>");
    s.push("<button class='mnuBtn' onclick='refreshPage()'>REFRESH PAGE!</button>");
    s.push("</li>");
  } // end if
  
  menuListNd.innerHTML = s.join("");
  menuNd.style.display = "block";
  
  const mnuBtns = $(".mnuBtn");
  for (let n=0;n<mnuBtns.length;n++) {
    mnuBtns[n].style.width = (w-30)+"px";
  } // next n
  
} // end of function buildMenu()




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
 *************************************************************************/
function editApptDates() {
  console.log("editApptDates() function called");
  menuNd.style.display = "none";
  
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"appointmentDates",containerDomEl:pageContentNd,addButton:true});
} // end of function editApptDates()




/*************************************************************************
 *************************************************************************/
function editAppts() {
  console.log("editAppts() function called");
  menuNd.style.display = "none";
  bCheck=true;
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"appointments",containerDomEl:pageContentNd,addButton:true});
} // end of function editAppts()





/*************************************************************************
edit different location statuses that a user can pick from...
 *************************************************************************/
function editLocStatuses() {
  console.log("editLocStatuses() function called");
  menuNd.style.display = "none";
  
  buildBasicListUi({forTable:"locStatuses",containerDomEl:pageContentNd,addButton:true});
} // end of function editLocStatuses()





/*************************************************************************
 *************************************************************************/
function editShoppingListItems() {
  console.log("editShoppingListItems() function called");
  menuNd.style.display = "none";
 
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"listItems",containerDomEl:pageContentNd,addButton:true});
} // end of function editShoppingListItems()




/*************************************************************************
 *************************************************************************/
function editStoreNames() {
  console.log("editStoreNames() function called");
  menuNd.style.display = "none";
 
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"stores",containerDomEl:pageContentNd,addButton:true});
} // end of function editStoreNames()





/*************************************************************************
 *************************************************************************/
function editUsers() {
  console.log("editUsers() function called");
  menuNd.style.display = "none";
  //buildBasicListUi({forTable:"users",cmd:"getUsers",saveCmd:"updateUserInfo",containerDomEl:pageContentNd,addButton:true});
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"users",containerDomEl:pageContentNd,addButton:true});
}// end of function editUsers() 




/*************************************************************************
 *************************************************************************/
function editWeeklyReminders() {
  console.log("editWeeklyReminders() function called");
  menuNd.style.display = "none";
  // buildBasicListUi() is in ui.js
  buildBasicListUi({forTable:"weeklyReminders",containerDomEl:pageContentNd,addButton:true});
} // end of function editWeeklyReminders()




/*************************************************************************
 *************************************************************************/
function exitApptView() {
  const menuNd = document.getElementById("menu");
  const pageContentNd = document.getElementById("pageContent");
  
  pageContentNd.style.display = "none";
  pageContentNd.innerHTML = "";
  menuNd.style.display = "block";
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
	function getFullFormattedTime(dt) {
		var nHour = dt.getHours();
		var sMinutes = zeroPadded(dt.getMinutes());
		var sSeconds = zeroPadded(dt.getSeconds());
		var sAMPM = "AM";
	   	var s = "";
	   
	   
	   	s = s + dayOfWeek(dt) + ", ";
	   	
	   	s = s + getMonthName(dt) + " ";
	   	s = s + dt.getDate()+" "+(dt.getFullYear());
	   	
	   	s = s + "<br>";
	   	
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
  called from:  pageSetup() function in this js file.
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
   
   Procedure:
     Steps: ...
          app.js
          ======
          1:  call: getFutureAppointments()    in app.js
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
function getFutureAppointmentsSuccess(dataPosted, dataReturned) {
  console.log("getFutureAppointmentsSuccess() function called");

  const data = dataReturned.returnPayload[1].data;
  addReturnedDataToModel(data); // function is in ui.js
 
  
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
  const calPopupNd = $("#calPopup")[0];
  
  calPopupNd.style.display = "none";
  splashNd.style.display = "none";
  tintNd.style.display = "none";
} // end of function hidePopupDialog()



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
  
  app.pin = postedData.pin;
  app.userEmailAdr = postedData.userEmailAdr;
  
  hideRegisterDevicePanel();
  hideSplashPanel();
  buildMenu();
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
function sameDate(dt1, dt2) {
  var bFlag = false;

  if (dt1.getDate() === dt2.getDate() &&
      dt1.getMonth() === dt2.getMonth() &&
      dt1.getFullYear() === dt2.getFullYear() ) {
      bFlag = true;
  } // end if

  return bFlag;
} // end of function




/*************************************************************************
 *************************************************************************/
function setCurrentUser(taskData) {
  console.log("setCurrentUser() called")
  const currUserObj = taskData.currentUserInfo;
  app.currentUserInfo = currUserObj;
  addRecDataToModel(currUserObj);  // right now, in ui.js
} // end of function setCurrentUser()




/*************************************************************************
 *************************************************************************/
function showDeviceRegistrationPanel() {
  
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
  tintNd.style.display = "block";
} // end of function




/*************************************************************************
 *************************************************************************/
function showInstallToHomeScreenPrompt() {
  installToHomeScreenInitPromptNd.style.display = "block";
} // end of function showInstallToHomeScreenPrompt()









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
  const s=[];
  const menuNd = document.getElementById("menu");
  const pageContentNd = document.getElementById("pageContent");
  const sHouseIcon = "🏠";
  const sCarIcon = "🚗";
  const apptLst = app.appointmentDatesByIndex;
  const apptLookup = app.appointmentsByServerId;
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
  
  
  
  
  apptLst.sort(function(rec1,rec2) {
    return rec1.appointmentDate - rec2.appointmentDate;
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
        nHoursUntil = numberOfHoursBetweenDates(now, apptDateInfo.appointmentDate);
        
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
  
  s.push("</div>"); // close of apptLst DIV
  
  pageContentNd.innerHTML = s.join("");
  pageContentNd.style.display = "block";
  menuNd.style.display = "none";
} // end of function viewAppts() 



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
