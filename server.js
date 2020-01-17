// server.js
// where your node app starts

/*************************************************************************
  using neDb (as subset of MongoDb)
  
  info from video:   https://www.youtube.com/watch?v=xVYa20DCUv0&t=457s
  
  
  
  ------
  Documentation on using neDb:
     - https://github.com/louischatriot/nedb
     
       - Basic Querying:        https://github.com/louischatriot/nedb#basic-querying
       - Operators:             https://github.com/louischatriot/nedb#operators-lt-lte-gt-gte-in-nin-ne-exists-regex
       - Logical Operators:     https://github.com/louischatriot/nedb#logical-operators-or-and-not-where
       - Sorting & Pagination:  https://github.com/louischatriot/nedb#sorting-and-paginating
       - Counting Documents:    https://github.com/louischatriot/nedb#counting-documents
       - Updating Documents:    https://github.com/louischatriot/nedb#updating-documents
       - Removing Documents:    https://github.com/louischatriot/nedb#removing-documents
       - Indexing:              https://github.com/louischatriot/nedb#indexing
       
       
  JS Function of Interest in this file:
  
       getRecsProc()
 *************************************************************************/
// init project
const express = require('express');
const process = require('process');
const Datastore = require('nedb');
const app = express();
const fs = require('fs');
require('dotenv').config();
let db;

let myConsoleLogEntriesByIndex = [];
const myConsole = {};


/*************************************************************************
 removes any HTML tags
 *************************************************************************/
function justText(sInput) {
  let sOutput = "";
  let bScanningTag = false;
  let bEscapedChar = false;
  const sBackSlash = "\\";
  
  const nMax = sInput.length;
  for (let n=0;n<nMax;n++) {
    const sChar = sInput.substr(n,1);
    
    if (!bScanningTag) {
      if (!bEscapedChar) {
        if (sChar === "<") {
          bScanningTag = true;
        } else {
          sOutput = sOutput + sChar;
        } // end if '<' / else
      } else {
        sOutput = sOutput + sChar;
        
        if (sChar === sBackSlash) {
          bEscapedChar = true;
        } else {
          bEscapedChar = false;
        } // end if / else
        
      } // end if !bEscapedChar / else
      
    } else {
      if (sChar === ">") {
        bScanningTag = false;
      } // end if
    } // end if !bScanningTag / else
    
  } // next n
  
  return sOutput;
} // end of function justText()




/*************************************************************************
 
 DON'T USE  myConsole.log() Inside of this function or you will get 
 a stack overflow for sure!!
 *************************************************************************/
myConsole.log = function(sMsg, params) {
  if (typeof sMsg !== "string") return;
  if (sMsg === "") return;
  
  let logEntry = {};
  logEntry.recordType = "logEntry";
  logEntry.timestamp = new Date();
  logEntry.startTime = new Date();
  logEntry.msg = sMsg;
  logEntry.details = "";
  logEntry.options = {};
  logEntry.origin = "server";
  logEntry.tagsByIndex = [];
  logEntry.childTasksByIndex = [];
  logEntry.parentTask = "na";
  
  logEntry.markComplete = function() {
    let le = this;
    le.endTime = new Date();
  } // end of markComplete method
  
  const ts = "⏱["+formattedDateTime(logEntry.timestamp)+"] ";
  console.log(ts+justText(sMsg));
  
  myConsoleLogEntriesByIndex.push(logEntry);
  
  return logEntry;
} // end of log method


// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

let appSchemaDataByIndex = [];
let appSchemaDataByTableName = [];

console.clear();
console.log('*** logging on the server side');

app.use(express.json({limit:'1mb'}));

setupSchemaDefinition();

// placing database in .data directory so it is private
const sDbFileName = "./.data/"+process.env.dbFileName;

if (sDbFileName) {
  myConsole.log("checking to see if the neDb database file: <i>"+sDbFileName+"</i> exists...");
  let bExists1 = fs.existsSync(sDbFileName);
  
  if (bExists1) {
    myConsole.log("neDb database file exists");
  } else {
    myConsole.log("neDb database file does <i>not</i> exist");
  } // end if/else
  
} // end if

let bExists2;

const pin = process.env.PIN;
const defAdminEmailAdr = process.env.defAdminEmailAdr;
const defAdminUserName = process.env.defAdminUserName;
const defMomEmailAdr = process.env.defMomEmailAdr;

let dbTaskProc;
let bDbOpen = false;



/*************************************************************************
   Do cleanup when node server is shut down...
   
      https://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
      
 *************************************************************************/
function exitHandler(options, exitCode) {
    console.log("exitHandler() called");
    if (options.cleanup) console.log('clean');
    if (exitCode || exitCode === 0) console.log(exitCode);
  
    if (bDbOpen) {
      // https://github.com/louischatriot/nedb#persistence
      console.log("about to call: db.persistence.compactDatafile()");
      db.persistence.compactDatafile();
    } // end if
  
    if (options.exit) process.exit();
} // end of function exitHandler()



if (sDbFileName) {
  //db = new Datastore(sDbFileName); // (5:13)
  db = new Datastore({ filename: sDbFileName, autoload: true });  // added:  Jan 12, 2020
  myConsole.log("db object instantiated");
  //db.loadDatabase(); // (5:40)
  //myConsole.log(" - db.loadDatabase() method executed");
  bDbOpen = true; //
  
  
  /*
  
  // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  // CAPTURE NODE.JS SERVER SHUTTING DOWN:
  
  //  https://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
  //  https://nodejs.org/api/process.html#process_event_exit
  // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  
  process.stdin.resume();//so the program will not close instantly
  
  //do something when app is closing
  process.on('exit', exitHandler.bind(null,{exit:true}));
  
  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, {exit:true}));

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
  process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
  
  // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  
  */
  
  dbTaskProc = new DbTaskProcessor();
  
  handleAdminUser(); // should be called After database has been loaded into memory
} // end if (sDbFileName)


/*************************************************************************
   Gonna use POST for Everything!
   #api_endpoint 
 *************************************************************************/
app.post('/api', (request, response) => {
  const dataInput = request.body;
  const cmd = dataInput.cmd;
  let returnPayload = {};
  
  myConsole.log("<b>/api</b> called from client");
  
 
  if (!cmd) {
    myConsole.log("cmd property missing");
    let rData = {};
    rData.result = "error";
    rData.info = "missing cmd value";
    response.json(rData);
    return;
  } // end if
  
  
  // has the server been set up properly?
  if (!pin || !defAdminEmailAdr || !defAdminUserName || !sDbFileName) {
    let rData = {};
    rData.result = "error";
    rData.info = "site setup error";
    
    response.json(rData);
    return;
  } // end if
  
  
  // has the client device been registered properly?
  if (!dataInput.pin || !dataInput.userEmailAdr) {
    let rData = {};
    rData.result = "error";
    rData.info = "invalid API call";
    
    response.json(rData);
    return;
  } // end if (!dataInput.pin || !dataInput.userEmailAdr)
  
  
  dbTaskProc.beginApiRequestTasksForCmd(cmd, response);
  
  
  if (dataInput.needCurrentUserInfo === true) {
    //myConsole.log("--- 🗃 need to grab current user info... adding task to get it");
    //dbTaskProc.addTask(getCurrentUserInfoProc, "currentUserInfo");
    // it will be up to another bit of code to call:   dbTaskProc.performTasks(dataInput);   Later!
    
  } // end if
  
  
  switch(cmd) {
    case "getHash":
      break;
    case "resetApp":
      resetApp(dataInput, returnPayload);
      break;
    case "registerDevice":
      deviceRegistered(dataInput, returnPayload);
      break;
    case "dump":
      //dumpDb(response);   // comment out when done debugging!!
      break;
    case "deleteIds":
      deleteRecsForIds(dataInput, response);  // comment out when done debugging!!
      break;
    case "getUsers":
      getUsers(dataInput);
      break;
    case "getRecs":
      getRecs(dataInput);  // *** IMPORTANT
      break;
    case "saveRec":
      saveRec(dataInput);  // *** IMPORTANT
      break;
    case "newUserSetup":
      break;
    case "updateUserInfo":
      break;
    case "delUserInfo":
      break;
    case "pingUser":
      break;
    case "getLatestImportantInfo":
      getLatestImportantInfo(dataInput, returnPayload);
      break;
    case "getPrevAppts":
      break;
    case "getCurrentShoppingList":
      break;
    case "updateCurrentShoppingList":
      break;
    case "getShoppingLists":
      break;
    case "updateShoppingResults":
      break;
    case "getGroceryReceipts":
      break;
    case "addGroceryReceipt":
      break;
    case "updateGroceryReceipt":
      break;
    case "delGroceryReceipt":
      break;
    case "getBankAccts":
      break;
    case "addBankAcct":
      break;
    case "updateBankAcct":
      break;
    case "delBankAcct":
      break;
    case "getSvrLogEntries":
      break;
    default: {
      let rData = {};
      rData.result = "error";
      rData.info = "invalid cmd value";
      response.json(rData);
      return;
    } // end of case default block
  } // end of switch
 
  /*
  responses from successful API calls are sent via internal performTask() function
  */
  
}); // end of app.post('/api') block


function getBasicReturnObj() {
  let obj = {};
  
  obj.result = "???";
  obj.data = {};
  
  return obj;
} // end of function



/*
  Write some
  */
/*let info = {};
info.dbInfo = "testing nedb database";
info.createDate = new Date();
db.insert(info); */

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port: ' + listener.address().port);
}); // end of port listener block



/*************************************************************************
  only run when the Node server is restarted.
  (make a small change to this file for that to happen!!)
 *************************************************************************/
function setupSchemaDefinition() {
  myConsole.log("<b>setupSchemaDefinition()</b> function called");
  appTableSchemaSetup("users",[
  {field:"emailAdr",type:"email",caption:"Email Address",minLength:5,sort:"asc"},
  {field:"userName",type:"text",size:50,caption:"User Name",listIndex:0,colWidth:300,minLength:2},
  {field:"phone",type:"text",size:50,caption:"Phone Number"},
  {field:"functionTags",type:"text",size:80,caption:"Function Tag Values",inputWidth:300},
  {field:"locStatusId",type:"fk",fkTable:"locStatuses",sys:true},
  {field:"statusSetDate",type:"datetime",sys:true}
  ],"Users", "User","user");
  
  appTableSchemaSetup("appointments",[
  {field:"appointmentTitle",type:"text",size:60,caption:"Appointment Name",colWidth:360,inputWidth:300,listIndex:0,minLength:4,sort:"asc"},
  {field:"descr",type:"memo",caption:"Details"},
  {field:"readyToGo",type:"number",caption:"Ready To Go Before (in hours)",defValue:1.25},
  {field:"atHome",type:"boolean",caption:"Appt is at Home"},
  {field:"visitorName",type:"text",size:80,caption:"Visitor Name",mobileCaption:"Visitor",inputWidth:300},
  {field:"visitRange",type:"number",caption:"Home Visit Range (in hours)",defValue:.5},
  {field:"approxInterval",type:"number",caption:"Approx Interval (in days)",defValue:30},
  {field:"remindOrville",type:"number",caption:"Remind Orville Before (in hours)",defValue:2},
  {field:"needCar",type:"boolean",caption:"Need Car for Appointment",mobileCaption:"Need Car"},
  {field:"comments",type:"text",size:80,caption:"Appointment Comments",mobileCaption:"Comments",inputWidth:300},
  {field:"important",type:"text",size:80,caption:"Important Info",mobileCaption:"Important",inputWidth:300},
  {field:"seatCushion",type:"boolean",caption:"Bring Seat Cushion",mobileCaption:"Cushion"}
  ],"Appointments","Appointment","appointment");
  
  appTableSchemaSetup("appointmentDates",[
  {field:"appointmentId",type:"fk",caption:"Appointment With",colWidth:180,fkTable:"appointments",listIndex:0,displayFields:["appointmentTitle"]},
  {field:"prevAppointmentDateId",type:"id"},
  {field:"appointmentDate",type:"datetime",caption:"Appointment At",colWidth:300,mobileListFontSize:12,
          pickDateCaption:"Select the Date of the Appointment",listIndex:1,pickTimeCaption:"At Time"},
  {field:"results",type:"memo"},
  {field:"comments",type:"entries",caption:"Comments"}
  ],"Appointment Dates","Appointment Date","appointmentDate");
  
  appTableSchemaSetup("locStatuses",[
  {field:"locStatusText",type:"text",caption:"Location Status Text",listIndex:0,minLength:6,colWidth:400,inputWidth:300,sort:"asc"},
  {field:"isGlobal",type:"boolean",caption:"Global"},
  {field:"forUserId",type:"fk",fkTable:"users",fkField:"userId",listIndex:1,caption:"For User",displayFields:["userName"]},
  {field:"minutesToCancel",type:"number",caption:"Cancel in (n) minutes",defValue:90},
  {field:"extraInfo",type:"text",caption:"Extra Info",inputWidth:400}
  ],"Location Statuses","Location Status","locStatus");
  
  appTableSchemaSetup("weeklyReminders",[
  {field:"reminderText",type:"text",caption:"Weekly Reminder",listIndex:0,colWidth:400,inputWidth:300,minLength:2},
  {field:"dayOfWeek",type:"weekday",caption:"Day of Week",listIndex:1,colWidth:250}
  ],"Weekly Reminders","Weekly Reminder","weeklyReminder");
  
  appTableSchemaSetup("shoppingLists",[
  {field:"lstTitle",type:"text",caption:"List Title",listIndex:0,minLength:6},
  {field:"shoppingListDate",type:"date"}
  ],"Shopping Lists","Shopping List","shoppingList");
  
  appTableSchemaSetup("listItems",[
  {field:"itemName",type:"text",caption:"Item Name",colWidth:400,inputWidth:300,listIndex:0,minLength:4,sort:"asc"},
  {field:"uom",type:"text",caption:"Unit of Measure",mobileCaption:"UOM",size:15,colWidth:200,listIndex:0,minLength:2},
  {field:"inRoom",type:"text",caption:"In Room",mobileCaption:"Room",size:15,minLength:2},
  {field:"locInRoom",type:"text",caption:"Location In Room",mobileCaption:"Location",size:15,minLength:2},
  {field:"locInRoom2",type:"text",caption:"Location In Room 2",mobileCaption:"Location",size:15}
  ],"List Items","List Item","listItem");
  
  appTableSchemaSetup("shoppingListItems",[
  {field:"shoppingListId",type:"fk",fkTable:"shoppingLists"},
  {field:"listItemId",type:"fk",fkTable:"listItems"},
  {field:"qty",type:"number",caption:"Item Name",minLength:1}
  ],"Shopping List Items","Shopping List Item","shoppingListItem");
  
  appTableSchemaSetup("listItemLocations",[
  {field:"listItemId",type:"fk",fkTable:"listItems"},
  {field:"storeId",type:"fk",fkTable:"stores"},
  {field:"aisle",type:"text",caption:"Aisle",minLength:1},
  {field:"aisleSection",type:"text",caption:"Aisle",minLength:1}
  ],"List Item Locations","List Item Location","listItemLocation");
  
  appTableSchemaSetup("stores",[
  {field:"storeName",type:"text",caption:"Store Name",colWidth:400,inputWidth:300,listIndex:0,minLength:2,sort:"asc"}
  ],"Stores","Store","store");
  
  //shoppingListItems
  
  //groceryReceipts
  
  //bankAccts
  
  // +++++++++++++++++++++++++++++++++++++
  setupAdditionalRecTypes();
} // end of function setupSchemaDefinition() 





/*************************************************************************
  return Every object in the database regardless!
  
 *************************************************************************/
function dumpDb(response) {
  
  return; // un-comment out when done debugging!!
  
  myConsole.log("<b>dumpDb()</b> called");
  const rData = {};
  
  rData.originalCmd = "dump";
  
  myConsole.log("about to call: <b>db.find({})</b> ...");
  db.find({ }, function (err, docs) {
    myConsole.log("<b>db.find({})</b> ... called");
    if (err) {
      myConsole.log("<b>db.find({})</b> ... called ... oops! got an error!");
      rData.result = "error";
      rData.serverLogInfo = myConsoleLogEntriesByIndex;
      response.json(rData);
      myConsoleLogEntriesByIndex = []; // cleared out any previous data AFTER data sent!
      return;
    } // end if
    
    rData.returnPayload = docs;
    rData.result = "ok";
    rData.serverLogInfo = myConsoleLogEntriesByIndex;
    
    response.json(rData);
    
    // Clearing the array AFTER the data has been sent!!!
    //                    -----
    myConsoleLogEntriesByIndex = []; // cleared out any previous data
    
  }); // end of 'find' block
} // end of function dumpDb()





/*************************************************************************
 ff
 *************************************************************************/
function setupAdditionalRecTypes() {
  console.log(" ");
  myConsole.log("<b>setupAdditionalRecTypes()</b> called");
  const nMax1 = appSchemaDataByIndex.length;
  
  for (let n=0;n<nMax1;n++) {
    const schema = appSchemaDataByIndex[n];
    const nMax2 = schema.fields.length;
    const sRecTypes = [];
    
    sRecTypes.push(schema.recordType);
    
    for (let n2=0;n2< nMax2;n2++) {
      const fld = schema.fields[n2];

      if (typeof fld.fkTable === "string") {
        console.log("          --- found an fkTable property!");
        const schema2 = appSchemaDataByTableName[fld.fkTable];
        sRecTypes.push(schema2.recordType);
      } // end if
            
    } // next n2
    
    schema.queryRecordTypes = sRecTypes.join(",");
  } // next n
  
  myConsole.log("*** <b>setupAdditionalRecTypes()</b> completed");
  console.log(" ");
} // end of function setupAdditionalRecTypes() 




/*************************************************************************

 *************************************************************************/
function appTableSchemaSetup(sTableName, fields, sLabelPlural, sLabelSingular,sRecordType) {
  let schema = {};
  let sPk = sTableName;
  
  myConsole.log("Running <b>appTableSchemaSetup()</b> for the <b>"+sTableName+"</b> table");
  
  if (sPk.substr(sPk.length-1,1) === "s") {
    console.log("table name ends with 's'");
    sPk = sPk.substr(0,sPk.length-1);    
  } // end if
  
  schema.tableName = sTableName;
  schema.fields = fields;
  schema.labelPlural = sLabelPlural;
  schema.labelSingular = sLabelSingular;
  schema.recordType = sRecordType;
  schema.pkField = sPk+"Id";
  console.log("pk="+schema.pkField);
  
  appSchemaDataByIndex.push(schema);
  appSchemaDataByTableName[sTableName] = schema;
  
  console.log(" --- added table schema: "+sTableName);
  
} // end of function appTableSchemaSetup()



/*************************************************************************

 *************************************************************************/
function deleteRecsForIds(dataInput, response) {
  
   return;  // un-comment this line out after debugging is done!!!
  myConsole.log("<b>deleteRecsForIds()</b> called");
  
  const rData = {};
  rData.originalCmd = "deleteIds"
  
  const aIdsToDelete = dataInput.idsToDelete;
  const query = {_id:{ $in:aIdsToDelete}};
  db.remove(query, { multi: true }, function (err, numRemoved) {
    if (err) {
      myConsole.log("<b>db.remove({})</b> ... called ... oops! got an error!");
      rData.result = "error";
      rData.serverLogInfo = myConsoleLogEntriesByIndex;
      response.json(rData);
      myConsoleLogEntriesByIndex = []; // cleared out any previous data AFTER data sent!
      return;
    } // end if
    
    rData.result = "ok";
    const returnInfo = {};
    returnInfo.numToRemove = aIdsToDelete.length;
    returnInfo.recsRemoved = numRemoved;
    rData.returnPayload = returnInfo;
    rData.serverLogInfo = myConsoleLogEntriesByIndex;
    response.json(rData);
    myConsoleLogEntriesByIndex = []; // cleared out any previous data AFTER sending
    
  }); // end of db.remove call-back
  
} // end of function deleteRecsForIds()




/*************************************************************************

 *************************************************************************/
function deviceRegistered(dataInput) {
  myConsole.log("<b>deviceRegistered()</b> called");
  
  //              function to perform,  tag
  dbTaskProc.addTask(deviceRegistered2,"deviceRegistered");
  dbTaskProc.performTasks(dataInput);
  
  return;
} // end of function deviceRegistered()



/*************************************************************************

 *************************************************************************/
function deviceRegistered2(dataInput,doneTaskFunction) {
  myConsole.log("<b>deviceRegistered2()</b> called");
  
  let returnPayload = {};
 
  returnPayload.payloadStatus = "success";
  
  
  doneTaskFunction(returnPayload);
} // end of function deviceRegistered2()



/*************************************************************************

*************************************************************************/
function formattedDate(dt) {

  let sMonth = (dt.getMonth()+1)+"";

  if (sMonth.length ===1) {
    sMonth = "0" + sMonth;
  } // end if

  let sDay = (dt.getDate())+"";

  if (sDay.length ===1) {
    sDay = "0" + sDay;
  } // end if

  let sDate = sMonth + "/" + sDay + "/"+dt.getFullYear();
  return sDate;
} // end of function formattedDate()



   /****************************************************************************
     
    ****************************************************************************/      
    function formattedDateTime(sDateValue) {
      let sDate = "";
      
      if (sDateValue === "") {
        return "";
      } // end if
      
      const dt = new Date(sDateValue);
      
      sDate = formattedDate(dt);
           
      sDate = sDate + " @ " + formattedTime(dt);
     
      return sDate;
    } // end of function formattedDateTime()




  /****************************************************************************
      Nicely formatted time (hours and minutes... no seconds)!

    ****************************************************************************/     
    function formattedTime(dt) {
      let sAMPM = " AM";
      let nHour = dt.getHours()+1;
      
      if (nHour > 12) {
        nHour = nHour - 12;
        sAMPM = " PM";
      } // end if
      
      let sMinutes = dt.getMinutes()+"";
      if (sMinutes.length ===1) {
        sMinutes = "0" + sMinutes;
      } // end if
      
      let sTime = (nHour)+":"+sMinutes+sAMPM;
      
      return sTime;
    } // end of function formattedTime()





/*************************************************************************
  does not return a regular payload to client
  
  checks if there is a default admin user in the database,
  if there is Not one, it creates a new one and adds it to the db.
 *************************************************************************/
function handleAdminUser() {
  myConsole.log("<b>handleAdminUser()</b> called");
  db.find({ recordType: 'user',emailAdr: defAdminEmailAdr}, function (err, docs) {
    if (err) {
      
    } // end if
    
    if (docs.length ===0) {
      // no default admin user yet, so create one!
      myConsole.log("no default admin user found... creating one...");
      let adminUser = {};
      adminUser.recordType = "user";
      adminUser.emailAdr = defAdminEmailAdr; // value from .env file
      adminUser.userName = defAdminUserName; // value from .env file
      adminUser.functionTags = "admin";
      adminUser.locStatusId = 0;
      
      // insert default admin user into db...
      db.insert(adminUser, function(err2, newDoc) {
        if (err2) {
          myConsole.log("error when trying to create an admin user.");
          return;
        } // end if
        myConsole.log("admin user created.");
      }); // end of db.insert call-back block
      
      
      // do mom user too!
      myConsole.log("and making a mom user !...");
      let momUser = {};
      momUser.recordType = "user";
      momUser.emailAdr = defMomEmailAdr; // value from .env file
      momUser.userName = "Mom"; 
      momUser.functionTags = "mom";
      momUser.locStatusId = 0;
      
      db.insert(momUser, function(err2, newDoc) {
        if (err2) {
          myConsole.log("error when trying to create a 'mom' user.");
          return;
        } // end if
        
        myConsole.log("'mom' user created.");
      }); // end of db.insert call-back block
      
    } // end if
    
  }); // end of db.find()
} // end of function handleAdminUser





/*************************************************************************

   called as a result of: dataInput.needCurrentUserInfo  being set to [true]!
   
   doneTaskFunction maps to the Actual function:  doneTask()
   taskFailedFunction maps to the Actual function:  taskFailed()
 *************************************************************************/
function getCurrentUserInfoProc(dataInput,doneTaskFunction, taskFailedFunction) {
  myConsole.log("<b>getCurrentUserInfoProc()</b> called");
  
  let returnPayload = {};
  returnPayload.currentUserInfo = {};
  
  
  
  if (typeof dataInput.userEmailAdr !== "string"){
    myConsole.log(" --- Problem: dataInput.userEmailAdr should be a 'string'. Instead it is: '"+typeof dataInput.userEmailAdr+"'");
  } else {
    if (dataInput.userEmailAdr.indexOf("@") === -1){
      myConsole.log(" --- Problem: dataInput.userEmailAdr is not a valid email address. Instead it is set to: '"+dataInput.userEmailAdr+"'");
    } // end if
  } // end if / else
  
  myConsole.log("about to do db.find()...");
  db.find({ recordType: 'user',emailAdr: dataInput.userEmailAdr}, function (err, docs) {
    myConsole.log("current user Find query completed... Recs Returned: "+docs.length);
    
    if (err) {
      console.log(" ")
      console.log("######")
      console.log(err)
      console.log("######")
      myConsole.log("<b>db.find()</b> returned an error.");
      returnPayload.payloadStatus = "error";
      returnPayload.errorOrigin = "server";
      returnPayload.attemptedOperation = "db.find on user record type";
      returnPayload.jsFunctionName = "getCurrentUserInfo()";
      taskFailedFunction(returnPayload);
      return;
    } // end if
    
    if (docs.length === 0) {
      myConsole.log(" ❗❗❗ --- Problem: no records returned!");
      myConsole.log("dataInput.userEmailAdr = '"+dataInput.userEmailAdr+"'");
      returnPayload.payloadStatus = "error";
      returnPayload.attemptedOperation = "db.find on user record type";
      returnPayload.jsFunctionName = "getCurrentUserInfo()";
      taskFailedFunction(returnPayload);
      return;
    } else {
      console.log(docs.length+" user records were returned");
      returnPayload.payloadStatus = "success";
      returnPayload.currentUserInfo = docs[0]; // return current user object   
      doneTaskFunction(returnPayload);
      return;
    } // end if / else
    
    
    
    return;
  }); // end of db.find()
  
} // end of function getCurrentUserInfoProc(dataInput)





/*************************************************************************

   called from "getLatestImportantInfo" command
   
   Note that there could already be some Other tasks in the queue!
   
 *************************************************************************/
function getLatestImportantInfo(dataInput) {
  myConsole.log("<b>getLatestImportantInfo(dataInput)</b> called");
    
  dbTaskProc.addTask(expireOutdatedUserStatusesProc, "expireOutdatedUserStatusesProc"); // Jan 6, 2020  
  dbTaskProc.addTask(getLatestImportantInfoProc,"getLatestImportantInfo");
  dbTaskProc.performTasks(dataInput);
    
} // end of function getLatestImportantInfo() 




/*************************************************************************

   called from "getLatestImportantInfo" command
   will return records with the record types of: 
       "appointment", 
       "appointmentDate",
       "locStatus",
       "user",
       "weeklyReminder"
       
   will think about adding to the query later to Actually limit
   it further to appointment dates that are in the future.
   
 *************************************************************************/
function getLatestImportantInfoProc(dataInput, doneTaskFunction, taskFailedFunction) {
  console.log(" ");
  console.log("============================");
  myConsole.log("<b>getLatestImportantInfoProc()</b> called");
  let returnPayload = {};
  
  // #future_appt_query1    
  db.find({ $or: [{recordType: 'appointment'},{recordType: 'appointmentDate'},{recordType: 'weeklyReminder'},{recordType: 'user'},{recordType: 'locStatus'}]}, function (err, docs) {
    myConsole.log("  --- call-back returned from db.find()...");
    if (err) {
      returnPayload.payloadStatus = "error";
      returnPayload.errorOrigin = "server";
      returnPayload.attemptedOperation = "db.find on appointment OR appointmentDate";
      returnPayload.jsFunctionName = "getLatestImportantInfoProc()";
      taskFailedFunction(returnPayload);
      return;
    } // end if
    
    myConsole.log("  --- records returned: "+docs.length);
    returnPayload.payloadStatus = "success";
    returnPayload.data = docs;
    doneTaskFunction(returnPayload);  // doneTaskFunction() is a function passed in as a parameter
    return;
  }); // end of db.find() call-back block
  
} // end of function getLatestImportantInfoProc() 





/*************************************************************************
 kick off getting records based on query and return them to the client...
 *************************************************************************/
function getRecs(dataInput) {
  myConsole.log("<b>getRecs()</b> called");
    
  dbTaskProc.addTask(getRecsProc, "getRecs");
  dbTaskProc.performTasks(dataInput);
} // end of function getRecs()



/*************************************************************************
 get records based on query and return them to the client...
 *************************************************************************/
function getRecsProc(dataInput,doneTaskFunction, taskFailedFunction) {
  myConsole.log("<b>getRecsProc()</b> called");
  let returnPayload = {};
  let sRecordType;
  let queryObj;
  
  if (typeof dataInput.queryRecordTypes === "string") {
    const sRecordTypes = dataInput.queryRecordTypes.split(",");
    sRecordType = dataInput.recordType;
   // queryObj = {recordType:sRecordType}; // return all records for record type
    queryObj = {$or:[]};
    const nMax = sRecordTypes.length;
    for (let n=0;n<nMax;n++) {
      const qryParam = {recordType:sRecordTypes[n]}; 
      queryObj["$or"].push(qryParam);
    } // next n
  } else {
    
  } // end if
  
  if (typeof dataInput.queryParams === "object") {
    // filter some more...
    console.log("--- filtering more...");
  } // end if
  
  myConsole.log("about to do db.find()...");
  db.find(queryObj, function (err, docs) {
    myConsole.log("db.find() completed");
    if (err) {
      myConsole.log("db.find() returned an error.");
      returnPayload.payloadStatus = "error";
      returnPayload.errorOrigin = "server";
      returnPayload.attemptedOperation = "db.find for record type: "+sRecordType;
      returnPayload.jsFunctionName = "getRecsProc()";
      taskFailedFunction(returnPayload);
      return;
    } // end if
    
    returnPayload.payloadStatus = "success";
    returnPayload.data = docs;
    doneTaskFunction(returnPayload);
    return;
  }); // end of db.find() call-back block
  
} // end of function getRecsProc()




/*************************************************************************

 *************************************************************************/
function getUsers(dataInput) {
  myConsole.log("<b>getUsers()</b> called");
  
  dbTaskProc.addTask(getUsersProc, "getUsers");
  dbTaskProc.performTasks(dataInput);
} // end of function getUsers()




/*************************************************************************

 *************************************************************************/
function getUsersProc(dataInput,doneTaskFunction, taskFailedFunction) {
  myConsole.log("<b>getUsersProc()</b> called");
  let returnPayload = {};
  
  db.find({ recordType: 'user'}, function (err, docs) {
    if (err) {
      returnPayload.payloadStatus = "error";
      returnPayload.errorOrigin = "server";
      returnPayload.attemptedOperation = "db.find on user";
      returnPayload.jsFunctionName = "getUsersProc()";
      taskFailedFunction(returnPayload);
      return;
    } // end if
    
    returnPayload.payloadStatus = "success";
    returnPayload.data = docs;
    doneTaskFunction(returnPayload);
    return;
  }); // end of db.find() call-back block
} // end of function getUsers()






/*************************************************************************
   expires outdated User Statuses 
 *************************************************************************/
function expireOutdatedUserStatusesProc(dataInput, doneTaskFunction, taskFailedFunction) {
  myConsole.log("⭐⭐<b>expireOutdatedUserStatusesProc()</b>  called");
  
  let returnPayload = {};
  const aLocStatusesById = [];
  const aUsersByIndex = [];
  const aIdsToReset = [];
  let nResetCount = 0;
  const now = new Date();
  
  // look for potential records to expire... as well as all the locStatus records...
  myConsole.log("about to do a <b>db.find()</b>...");
  db.find({ $or: [{ $and: [{recordType: 'user'},{locStatusId: {$ne:''}}]},{recordType: 'locStatus'}]}, function (err, recs) {
    //            (recordType == 'user'   AND   locStatusId !== '')  OR  recordType = 'locStatus' 
    myConsole.log("  --- call-back returned from <b>db.find()</b>...");
    if (err) {
      myConsole.log("<b>db.find()</b>. returned an error");
      returnPayload.payloadStatus = "error";
      returnPayload.errorOrigin = "server";
      returnPayload.attemptedOperation = "";
      returnPayload.jsFunctionName = "getUserStatusesProc()";
      taskFailedFunction(returnPayload);
      return;
    } // end if
    
    const nMax1 = recs.length;
    myConsole.log("  --- records returned: "+nMax1);
    let nLocStatusCount = 0;
    
    // build our work data...
    // build our locStatus lookup
    for (let n=0;n<nMax1;n++) {
      const rec = recs[n];
      if (rec.recordType === "locStatus") {
        aLocStatusesById[rec._id] = rec;
        nLocStatusCount = nLocStatusCount + 1;
      } // end if
      
      if (rec.recordType === "user") {
        aUsersByIndex.push(rec);
      } // end if
    } // next n
    
    myConsole.log("✅✅--- Potential User Records returned that may need resetting: "+aUsersByIndex.length);
    myConsole.log("✅✅--- Total User Location Status Records: "+nLocStatusCount);
    console.log(" ");
    console.log("=============================================");
    const nMax2 = aUsersByIndex.length;
    
    myConsole.log("About to process through the "+nMax2+" user records...")
    for (let n=0;n<nMax2;n++) {
      const usrRec = aUsersByIndex[n];

      const locStatRec = aLocStatusesById[usrRec.locStatusId];
      
      if (typeof locStatRec !== "undefined") {
        const nExpiryMinutes = locStatRec.minutesToCancel;
        const dt = new Date(usrRec.statusSetDate+"");
        
        myConsole.log("🌶🌶LOCATION STATUS RECORD FOUND!🌶🌶  key: "+usrRec.locStatusId)
        myConsole.log("   nExpiryMinutes="+nExpiryMinutes);
        myConsole.log("   dt="+dt);
        myConsole.log("   now="+now);
        if (nExpiryMinutes > 0) {
          let nNumMinutesBetweenDates = numberOfMinutesBetweenDates(dt, now);
          myConsole.log("   ⏰⏰ nNumMinutesBetweenDates="+nNumMinutesBetweenDates);
          
          if (nNumMinutesBetweenDates >= nExpiryMinutes) {
            aIdsToReset.push(usrRec._id); // add to our list of ids needing resetting
            myConsole.log("😬😬😬 found expired status for user id:<b>"+usrRec._id+"</b>")
          } // end if
        } // end if
      } else {
        // bad id so clear out to fix
        myConsole.log("😜😜😜 found bad user location status id in user record...<b>"+usrRec._id+"</b> fixing...")
        aIdsToReset.push(usrRec._id);
      } // end if / else
      
    } // next n
    
    /*
      https://github.com/louischatriot/nedb#updating-documents
      
      db.update(query, update, options, callback)
      
    */
    myConsole.log("building neDb query...");
    const query = {$and:[{_id:{ $in:aIdsToReset}},{recordType: 'user'}]};
    myConsole.log("building neDb update instructions...");
    const update = {locStatusId:"",statusSetDate:"",updateDate:now};
    
    /*
    myConsole.log("about to perform <b>db.update()</b>...");
    db.update(query, update, function (err2, numReplaced) {
    myConsole.log("<b>db.update()</b> completed. Number of records updated: "+numReplaced);
      if (err2) {
        myConsole.log("<b>db.update()</b> operation returned an error");
        returnPayload.payloadStatus = "error";
        returnPayload.errorOrigin = "server";
        returnPayload.attemptedOperation = "db.update - resetExpiredStatuses";
        returnPayload.jsFunctionName = "getUserStatusesProc()";
        taskFailedFunction(returnPayload);
        return;
      } // end if
      
      myConsole.log("<b>db.update()</b> operation was successful");
      returnPayload.payloadStatus = "success";
      returnPayload.operation = "resetExpiredStatuses";
      returnPayload.rowsUpdated = numReplaced;
      
      doneTaskFunction(returnPayload);
      return;
    });// end of db.update call-back block
    */
    
     // temp!! =====
    returnPayload.payloadStatus = "success";
    returnPayload.operation = "resetExpiredStatuses";
    returnPayload.rowsUpdated = 0;
    doneTaskFunction(returnPayload); // temp!!
    return;
    // temp!! =====
    
  }); // end of db.find() call-back block ... users
  
} // end of function expireOutdatedUserStatusesProc()



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
 *************************************************************************/
function numberOfMinutesBetweenDates(date1, date2) {
  const diffMs = (date1 - date2);
  const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
  return Math.abs(diffMins);
} // end of function numberOfMinutesBetweenDates();





/*************************************************************************

   called from "resetApp" command
   used while testing
 *************************************************************************/
function resetApp(dataInput, returnPayload) {
  myConsole.log("called <b>resetApp()</b> function");
  dbTaskProc.addTask(resetAppProc, "resetApp");
  dbTaskProc.performTasks(dataInput);
} // end of function resetApp()





/*************************************************************************

   called from "resetApp" command
   used while testing
 *************************************************************************/
function resetAppProc(dataInput,doneTaskFunction, taskFailedFunction) {
  console.log("called <b>resetAppProc()</b> function");
  
  let returnPayload = {};
  
  // fall back values:
  returnPayload.payloadStatus = "error";
  returnPayload.info = "invalid API call";
  // doneTaskFunction(returnPayload);
  // return;
  // uncomment line above when done testing!!
  
  // delete database file
  fs.unlinkSync(sDbFileName);
  myConsole.log("just deleted neDb database file.");
  
  // create a new database file to replace old one:
  db = new Datastore(sDbFileName); 
  myConsole.log("just re-created neDb database file.");
  db.loadDatabase(); 
  myConsole.log("just loaded the new neDb database file into memory.");
  
  
  handleAdminUser(); 
  
  returnPayload.payloadStatus = "success";
  doneTaskFunction(returnPayload);
} // end of function resetAppProc()



/*************************************************************************

 *************************************************************************/
function saveRec(dataInput) {
  console.log("saveRec() called");
  
  dbTaskProc.addTask(saveRecProc, "saveRec");
  dbTaskProc.performTasks(dataInput);
} // end of function saveRec(dataInput)




/*************************************************************************

 *************************************************************************/
function saveRecProc(dataInput,doneTaskFunction, taskFailedFunction) {
  console.log("<b>saveRecProc()</b> called");
  
  
  const saveObj = dataInput.recData;
  
  
  
  const returnPayload = {};
  
  
  // Jan 15, 2020
  if (typeof saveObj.recordType !== "string") {
    returnPayload.payloadStatus = "error";
    returnPayload.errorOrigin = "server";
    returnPayload.jsFunctionName = "saveRecProc()";
    returnPayload.errorInfo = "Invalid recordType";
    taskFailedFunction(returnPayload);
    return;
  } // end if
  
  
  
  if (typeof saveObj["_id"] === "undefined") {
    // save new record:
    
    saveObj.createDate = new Date();
    saveObj.createDateMs = saveObj.createDate.getTime();
    saveObj.updateDate = saveObj.createDate;
    saveObj.updateDateMs = saveObj.updateDate.getTime();
    
    console.log("inserting new record");
    db.insert(saveObj, function(err2, newDoc) {
      if (err2) {
        returnPayload.payloadStatus = "error";
        returnPayload.errorOrigin = "server";
        returnPayload.attemptedOperation = "db.insert ";
        returnPayload.jsFunctionName = "saveRecProc()";
        taskFailedFunction(returnPayload);
        return;
      } // end if
      
      returnPayload.newId = newDoc["_id"];
      returnPayload.payloadStatus = "success";
      returnPayload.saveOperation = "insert";
      returnPayload.savedRec = newDoc;
      
      doneTaskFunction(returnPayload);
      return;
    }); // end of db.insert call-back block
  } else {
    // update existing record:
    const sId = saveObj["_id"];
    
    if (typeof saveObj.createDate === "string") {
      if (isDate(saveObj.createDate)) {
        saveObj.createDate = new Date(saveObj.createDate+""); // fix old rec that might need fixing
      } else {
        saveObj.createDate = new Date(); // fix old rec that might need fixing
      } // end if / else
    } // end if
    
    if (typeof saveObj.createDate === "undefined") {
      saveObj.createDate = new Date(); // fix old rec that might need fixing
    } // end if
    
    if (typeof saveObj.createDateMs === "undefined") {
      saveObj.createDateMs = saveObj.createDate.getTime(); // fix old rec that might need fixing
    } // end if
    
    saveObj.updateDate = new Date();
    saveObj.updateDateMs = saveObj.updateDate.getTime();
    
    myConsole.log("updating existing record with an id of: "+sId);
    db.update({ '_id': sId }, saveObj, function (err2, numReplaced) {
      myConsole.log("updating existing record with an id of: "+sId);
      if (err2) {
        myConsole.log("updating operation returned an error.");
        returnPayload.payloadStatus = "error";
        returnPayload.errorOrigin = "server";
        returnPayload.attemptedOperation = "db.update ";
        returnPayload.jsFunctionName = "saveRecProc()";
        taskFailedFunction(returnPayload);
        return;
      } // end if
      
      returnPayload.payloadStatus = "success";
      returnPayload.saveOperation = "update";
      returnPayload.savedRec = saveObj;
      
      doneTaskFunction(returnPayload);
      return;
    });// end of db.update call-back block
  } // end if/else
  
  
  
} // end of function saveRecProc(dataInput)





/*************************************************************************

   uses 'new' keyword like:
   const dbTaskProc = new DbTaskProcessor() 
 *************************************************************************/
function DbTaskProcessor() {
  myConsole.log("called <b>DbTaskProcessor()</b> factory function");
  const taskPrc = this;
  let taskQueueByIndex = [];
  let tasksCompletedByIndex = [];
  let dataInput,returnPayload,lastDbTask;
  let bErrorsOccurred = false;
  let bATaskStarted = false;
  let response,cmd;
  
  let eventNameList = ['apirequestbegun','taskadded','performtasks','begintask','taskcompleted','taskfailed','taskscompleted','processingstopped','responsesent','clearqueue'];
  let eventHandlersByEventName = [];
  
  lastDbTask = undefined;
  
  
    
  /*************************************************************************
  *************************************************************************/
  taskPrc.addEventListener = function(siEventName, fn) {
    let sEventName = siEventName.toLowerCase();
    
    if (eventNameList[sEventName]) {
      // valid event name
      eventHandlersByEventName[sEventName] = fn;
    } // end if
    
  } // end of addEventListener method
  
  
  
  /*************************************************************************
  *************************************************************************/
  function eventTriggered(siEventName, event) {
    let sEventName = siEventName.toLowerCase();
    
    const fn = eventHandlersByEventName[sEventName];
    
    if (typeof fn === "function") {
      event.eventName = sEventName;
      event.eventTime = new Date();
      fn(event); // run the event handler passing in event object
    } // end if
  } // end of function eventTriggered
  
  
  
  
  /*************************************************************************
  *************************************************************************/
  taskPrc.addTask = function(taskFunction, sTaskTag) {
    myConsole.log("<b>taskPrc.addTask()</b> method called");
    const dbTask = {};
    dbTask.taskFunction = taskFunction;
    dbTask.taskTag = sTaskTag;
    console.log(" --- taskTag added: "+sTaskTag);
    
    dbTask.taskAdded = new Date();
    
    dbTask.continueOnError = false; // if true, it will not stop processing tasks if an error occurs   
    taskQueueByIndex.push(dbTask);
    
    let evt = {};
    evt.dbTask = dbTask;
    eventTriggered("taskadded", evt);    
    return dbTask;
  } // end of addTask() method
  
  
  
  /*************************************************************************
  *************************************************************************/
  taskPrc.performTasks = function(inpDataInput) {
    myConsole.log("<b>taskPrc.performTasks()</b> method called");
    dataInput = inpDataInput;
    returnPayload = [];
    
    let eventInfo = {};
    eventInfo.queue = taskQueueByIndex;
    eventTriggered("performTasks", eventInfo);    
    
    performTask();    
    
  } // end of performTasks method
  
  
  
  /*************************************************************************
  
    
  *************************************************************************/
  function performTask() {
    myConsole.log("<b>performTask()</b> method called");
    
    if (typeof lastDbTask === "object") {
      lastDbTask.endDate = new Date();
      tasksCompletedByIndex.push(lastDbTask);
    } // end if
    
    if (taskQueueByIndex.length>0) {
      // ##############################################
      //  A TASK TO PROCESS... SO PROCESS IT!
      // ##############################################
      myConsole.log("popping a <i>dbTask</i> off the Top of the queue (FIFO)");
      const dbTask = taskQueueByIndex.shift();
      

      myConsole.log("  -- 💬Task Tag: "+dbTask.taskTag);
      const taskFunction = dbTask.taskFunction;
      
      
      dbTask.taskStarted = new Date();
      lastDbTask = dbTask;
      bATaskStarted = true;
      
      let evt = {};
      evt.dbTask = dbTask;
      eventTriggered("beginTask", evt);
      
      
      
      // taskFunction() PARAMS:
      //  dataInput           - data from API client request (most likely)
      //  doneTask            - this is the function that is called when the task is done successfully
      //                        (declared below)
      //  taskFailed          - this is the function that is called if the task fails
      //                        (declared below)
      taskFunction(dataInput, doneTask, taskFailed);      
      
    } else {
      // ##############################################
      //  NO MORE TASKS, SO SEND BACK THE RESULTS!
      
      // DO NOT use the myConsole.log() method in this else block below!
      
      // ##############################################
      myConsole.log("db task queue is empty");
      // No more tasks on the Queue, so send back to the client 
      // anything that needs sending back!
      if (response) {
        myConsole.log("about to send a response back to the client");
        let rData = {};
        rData.result = "ok";
        rData.originalCmd = cmd;
        rData.returnPayload = returnPayload;


        // is client requesting schema info?
        if (dataInput.needSchemaInfo) {
          myConsole.log("returning schema info to the client");
          rData.schemaInfoByIndex = appSchemaDataByIndex;
        } // end if

        // let client know about server's log entries
        rData.serverLogInfo = myConsoleLogEntriesByIndex;
        
        response.json(rData);
        console.log("response sent - all done processing db tasks and sending back any results");
        console.log("############################################################################################");
        
        // Clearing the array AFTER the data has been sent!!!
        //                    -----
        myConsoleLogEntriesByIndex = []; // cleared out any previous data
        
        // put in these two lines below so we could track it with these items Themselves being cleared!
        myConsole.log("response data sent back to the client.");
        myConsole.log("myConsoleLogEntriesByIndex[] cleared.")
      } // end if (response)

    } // end if
  } // end of function performTask()
  
  
  
  
  /*************************************************************************
  *************************************************************************/
  function doneTask(inpTaskResults) {
    myConsole.log("📌 doneTask() function called");
    
    inpTaskResults.resultTimestamp = new Date();    
    inpTaskResults.taskTag = lastDbTask.taskTag;
    
    let evt = {};
    evt.dbTask = lastDbTask;
    eventTriggered("taskCompleted", evt);
    
    // add to our return payload:
    returnPayload.push(inpTaskResults);
    
    performTask(); // go try and do the next db task...
  } // end of function doneTask()
  
  
  
  /*************************************************************************
  
  *************************************************************************/
  function taskFailed(inpTaskResults) {
    myConsole.log("😭😭😭 🌶🌶🌶 <b>taskFailed()</b> function called 🌶🌶🌶");
    

    bErrorsOccurred = true;    
    inpTaskResults.taskTag = lastDbTask.taskTag;
    
    // add to our return payload: any info about the failure
    returnPayload.push(inpTaskResults);
    

    let evt = {};
    evt.dbTask = lastDbTask;
    eventTriggered("taskFailed", evt);
    
    if (!lastDbTask.continueOnError) {
      let evt = {};
      evt.taskWithError = lastDbTask;
      eventTriggered("processingStopped", evt);       
      taskPrc.clearQueue({fromBeginApiRequest:true}); // don't process any tasks that might remain
    } // end if
    
    performTask(); // should result in what was accumulated to be sent back to the client
  } // end of function taskFailed()
  
  
  
  /*************************************************************************
  *************************************************************************/
  taskPrc.beginApiRequestTasksForCmd = function(sCmd, responseObj) {
    myConsole.log("<b>taskPrc.beginApiRequestForCmd()</b> method called");
    
    let evt = {};
    evt.apiCmd = sCmd;
    eventTriggered("apiRequestBegun", evt);
    
    cmd = sCmd; // keep track of API request command (cmd)
    response = responseObj;
    taskPrc.clearQueue({fromBeginApiRequest:true}); // start fresh
  } // end of beginApiRequestTasksForCmd method
  
  
  
  /*************************************************************************
  *************************************************************************/
  taskPrc.clearQueue = function(optParam) {
    myConsole.log("<b>taskPrc.clearQueue()</b> method called");
    taskQueueByIndex = [];
    tasksCompletedByIndex = [];
    bATaskStarted = false;
    lastDbTask = undefined;
    
    if (typeof optParam === "undefined") {
      let evt = {};      
      eventTriggered("clearQueue", evt);
    } // end if
    
  } // end of clearQueue method
  
  
} // end of DbTaskProcessor() factory function
