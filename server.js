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
       
 *************************************************************************/
// init project
const express = require('express');
const process = require('process');
const Datastore = require('nedb');
const app = express();
const fs = require('fs');
require('dotenv').config();
let db;

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

let appSchemaDataByIndex = [];

console.log('logging on the server side');

app.use(express.json({limit:'1mb'}));

setupSchemaDefinition();

// placing database in .data directory so it is private
const sDbFileName = "./.data/"+process.env.dbFileName;

if (sDbFileName) {
  let bExists1 = fs.existsSync(sDbFileName);
  
  if (bExists1) {
    console.log("database file exists");
  } else {
    console.log("database file does not exist");
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
  db = new Datastore(sDbFileName); // (5:13)
  db.loadDatabase(); // (5:40)
  bDbOpen = true;
  
  
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
 *************************************************************************/
app.post('/api', (request, response) => {
  const dataInput = request.body;
  const cmd = dataInput.cmd;
  let returnPayload = {};
  
  console.log("/api called from client");
  
 
  if (!cmd) {
    console.log("cmd property missing");
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
    console.log("need to grab current user info");
    dbTaskProc.addTask(getCurrentUserInfoProc, "currentUserInfo");
    // it will be up to another bit of cod to call:   dbTaskProc.performTasks(dataInput);   later!
    
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
    case "getUsers":
      getUsers(dataInput);
      break;
    case "getRecs":
      getRecs(dataInput);
      break;
    case "saveRec":
      saveRec(dataInput);
      break;
    case "newUserSetup":
      break;
    case "updateUserInfo":
      break;
    case "delUserInfo":
      break;
    case "pingUser":
      break;
    case "getFutureAppts":
      getFutureAppts(dataInput, returnPayload);
      break;
    case "getPrevAppts":
      break;
    case "createAppt":
      break;
    case "updateAppt":
      break;
    case "delAppt":
      break;
    case "setNewApptDate":
      break;
    case "updateApptDate":
      break;
    case "updateApptResults":
      break;
    case "delApptDate":
      break;
    case "getLocStatuses":
      break;
    case "setLocStatus":
      break;
    case "addLocStatus":
      break;
    case "updateLocStatus":
      break;
    case "delLocStatus":
      break;
    case "createWeeklyReminder":
      break;
    case "updateWeeklyReminder":
      break;
    case "delWeeklyReminder":
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
  responses from successful API calls are sent in internal performTask() function
  */
  
}); // end of app.post('/api') block


function getBasicReturnObj() {
  let obj = {};
  
  obj.result = "???";
  obj.data = {};
  obj
  return obj;
} // end of function


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
  console.log('Your app is listening on port ' + listener.address().port);
});


function setupSchemaDefinition() {
  console.log("setupSchemaDefinition() function called");
  appTableSchemaSetup("users",[
  {field:"emailAdr",type:"email",caption:"Email Address",minLength:5},
  {field:"userName",type:"text",size:50,caption:"User Name",listIndex:0,colWidth:300,minLength:2},
  {field:"functionTags",type:"text",size:80,caption:"Function Tag Values",inputWidth:300},
  {field:"locStatusId",type:"fk",fkTable:"locStatuses"}
  ],"Users", "User","user");
  
  appTableSchemaSetup("appointments",[
  {field:"appointmentTitle",type:"text",size:60,caption:"Appointment Name",colWidth:360,inputWidth:300,listIndex:0,minLength:4},
  {field:"descr",type:"memo",caption:"Details"},
  {field:"readyToGo",type:"number",caption:"Ready To Go Before (in hours)",defValue:1.25},
  {field:"approxInterval",type:"number",caption:"Approx Interval (in days)",defValue:30},
  {field:"remindOrville",type:"number",caption:"Remind Orville Before (in hours)",defValue:2},
  {field:"needCar",type:"boolean",caption:"Need Car for Appointment",mobileCaption:"Need Car"},
  {field:"comments",type:"text",size:80,caption:"Appointment Comments",mobileCaption:"Comments",inputWidth:300},
  {field:"important",type:"text",size:80,caption:"Important Info",mobileCaption:"Important",inputWidth:300},
  {field:"seatCushion",type:"boolean",caption:"Bring Seat Cushion",mobileCaption:"Cushion"}
  ],"Appointments","Appointment","appointment");
  
  appTableSchemaSetup("appointmentDates",[
  {field:"appointmentId",type:"fk",fkTable:"appointments",displayFields:["appointmentTitle"]},
  {field:"prevAppointmentDateId",type:"id"},
  {field:"appointmentDate",type:"datetime",caption:"Appointment At"},
  {field:"results",type:"memo"},
  {field:"comments",type:"entries",caption:"Comments"}
  ],"Appointment Dates","Appointment Date","appointmentDate");
  
  appTableSchemaSetup("locStatuses",[
  {field:"locStatusText",type:"text",caption:"Location Status Text",listIndex:0,minLength:6},
  {field:"isGlobal",type:"boolean",caption:"Global"},
  {field:"forUserId",type:"fk",fkTable:"users"}
  ],"Location Statuses","Location Status");
  
  appTableSchemaSetup("weeklyReminders",[
  {field:"reminderText",type:"text",caption:"Weekly Reminder",listIndex:0,colWidth:400,inputWidth:300,minLength:2},
  {field:"dayOfWeek",type:"weekday",caption:"Day of Week",listIndex:1,colWidth:250}
  ],"Weekly Reminders","Weekly Reminder","weeklyReminder");
  
  appTableSchemaSetup("shoppingLists",[
  {field:"lstTitle",type:"text",caption:"List Title",listIndex:0,minLength:6},
  {field:"shoppingListDate",type:"date"}
  ],"Shopping Lists","Shopping List","shoppingList");
  
  appTableSchemaSetup("listItems",[
  {field:"itemName",type:"text",caption:"Item Name",colWidth:400,inputWidth:300,listIndex:0,minLength:4},
  {field:"uom",type:"text",caption:"Unit of Measure",mobileCaption:"UOM",size:15,colWidth:200,listIndex:0,minLength:2}
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
  {field:"storeName",type:"text",caption:"Store Name",colWidth:400,inputWidth:300,listIndex:0,minLength:2}
  ],"Stores","Store","store");
  
  //shoppingListItems
  
  //groceryReceipts
  
  //bankAccts
} // end of function setupSchemaDefinition() 





/*************************************************************************

 *************************************************************************/
function appTableSchemaSetup(sTableName, fields, sLabelPlural, sLabelSingular,sRecordType) {
  let schema = {};
  let sPk = sTableName;
  
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
  
  console.log(" --- added table schema: "+sTableName);
  
} // end of function appTableSchemaSetup()




/*************************************************************************

 *************************************************************************/
function deviceRegistered(dataInput) {
  console.log("deviceRegistered() called");
  
  
  dbTaskProc.addTask(deviceRegistered2,"deviceRegistered");
  dbTaskProc.performTasks(dataInput);
  
  return;
} // end of function deviceRegistered()



/*************************************************************************

 *************************************************************************/
function deviceRegistered2(dataInput,doneTaskFunction) {
  console.log("deviceRegistered2() called");
  
  let returnPayload = {};
 
  returnPayload.payloadStatus = "success";
  
  
  doneTaskFunction(returnPayload);
} // end of function deviceRegistered2()




/*************************************************************************
  does not return a regular payload to client
  
  checks if there is a default admin user in the database,
  if there is Not one, it creates a new one and adds it to the db.
 *************************************************************************/
function handleAdminUser() {
  console.log("handleAdminUser() called");
  db.find({ recordType: 'user',emailAdr: defAdminEmailAdr}, function (err, docs) {
    if (err) {
      
    } // end if
    
    if (docs.length ===0) {
      // no default admin user yet, so create one!
      console.log("no default admin user found... creating one...");
      let adminUser = {};
      adminUser.recordType = "user";
      adminUser.emailAdr = defAdminEmailAdr; // value from .env file
      adminUser.userName = defAdminUserName; // value from .env file
      adminUser.functionTags = "admin";
      adminUser.locStatusId = 0;
      
      // insert default admin user into db...
      db.insert(adminUser, function(err2, newDoc) {
        if (err2) {
          
          return;
        } // end if
        
      }); // end of db.insert call-back block
      
      
      // do mom user too!
      console.log("and making a mom user !...");
      let momUser = {};
      momUser.recordType = "user";
      momUser.emailAdr = defMomEmailAdr; // value from .env file
      momUser.userName = "Mom"; 
      momUser.functionTags = "mom";
      momUser.locStatusId = 0;
      
      db.insert(momUser, function(err2, newDoc) {
        if (err2) {
          
          return;
        } // end if
        
      }); // end of db.insert call-back block
      
    } // end if
    
  }); // end of db.find()
} // end of function handleAdminUser





/*************************************************************************

   called from "" command
 *************************************************************************/
function getCurrentUserInfoProc(dataInput,doneTaskFunction, taskFailedFunction) {
  console.log("getCurrentUserInfoProc() called");
  
  let returnPayload = {};
  returnPayload.currentUserInfo = {};
  
  db.find({ recordType: 'user',emailAdr: dataInput.userEmailAdr}, function (err, docs) {
    if (err) {
      returnPayload.payloadStatus = "error";
      returnPayload.errorOrigin = "server";
      returnPayload.attemptedOperation = "db.find on user record type";
      returnPayload.jsFunctionName = "getCurrentUserInfo()";
      taskFailedFunction(returnPayload);
      return;
    } // end if
    
    returnPayload.payloadStatus = "success";
    returnPayload.currentUserInfo = docs[0]; // return current user object
    doneTaskFunction(returnPayload);
    return;
  }); // end of db.find()
  
} // end of function getCurrentUserInfoProc(dataInput)


/*************************************************************************

   called from "getFutureAppts" command
 *************************************************************************/
function getFutureAppts(dataInput) {
  console.log("getFutureAppts() called");
    
  dbTaskProc.addTask(getFutureApptsProc,"getFutureAppts");
  dbTaskProc.performTasks(dataInput);
    
} // end of function getFutureAppts() 


/*************************************************************************

   called from "getFutureAppts" command
 *************************************************************************/
function getFutureApptsProc(dataInput,doneTaskFunction, taskFailedFunction) {
  console.log("getFutureApptsProc() called");
  let returnPayload = {};
  
  db.find({ recordType: 'appointment',apptDateMs: {$gt:0 }}, function (err, docs) {
    if (err) {
      returnPayload.payloadStatus = "error";
      returnPayload.errorOrigin = "server";
      returnPayload.attemptedOperation = "db.find on appointment";
      returnPayload.jsFunctionName = "getFutureApptsProc()";
      taskFailedFunction(returnPayload);
      return;
    } // end if
    
    returnPayload.payloadStatus = "success";
    returnPayload.data = docs;
    doneTaskFunction(returnPayload);
    return;
  }); // end of db.find() call-back block
  
} // end of function getFutureApptsProc() 





/*************************************************************************
 kick off getting records based on query and return them to the client...
 *************************************************************************/
function getRecs(dataInput) {
  console.log("getRecs() called");
    
  dbTaskProc.addTask(getRecsProc, "getRecs");
  dbTaskProc.performTasks(dataInput);
} // end of function getRecs()



/*************************************************************************
 get records based on query and return them to the client...
 *************************************************************************/
function getRecsProc(dataInput,doneTaskFunction, taskFailedFunction) {
  console.log("getRecsProc() called");
  let returnPayload = {};
  
  const sRecordType = dataInput.recordType;
  let queryObj = {recordType:sRecordType}; // return all records for record type
  
  if (typeof dataInput.queryParams === "object") {
    // filter some more...
    console.log("--- filtering more...");
  } // end if
  
  db.find(queryObj, function (err, docs) {
    if (err) {
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
  console.log("getUsers() called");
  
  dbTaskProc.addTask(getUsersProc, "getUsers");
  dbTaskProc.performTasks(dataInput);
} // end of function getUsers()




/*************************************************************************

 *************************************************************************/
function getUsersProc(dataInput,doneTaskFunction, taskFailedFunction) {
  console.log("getUsersProc() called");
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

   called from "resetApp" command
   used while testing
 *************************************************************************/
function resetApp(dataInput, returnPayload) {
  console.log("called resetApp() function");
  dbTaskProc.addTask(resetAppProc, "resetApp");
  dbTaskProc.performTasks(dataInput);
} // end of function resetApp()





/*************************************************************************

   called from "resetApp" command
   used while testing
 *************************************************************************/
function resetAppProc(dataInput,doneTaskFunction, taskFailedFunction) {
  console.log("called resetAppProc() function");
  
  let returnPayload = {};
  
  // fall back values:
  returnPayload.payloadStatus = "error";
  returnPayload.info = "invalid API call";
  // doneTaskFunction(returnPayload);
  // return;
  // uncomment line above when done testing!!
  
  // delete database file
  fs.unlinkSync(sDbFileName);
  
  // create a new database file to replace old one:
  db = new Datastore(sDbFileName); 
  db.loadDatabase(); 
  
  
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
  console.log("saveRecProc() called");
  const saveObj = dataInput.recData;
  const returnPayload = {};
  
  if (typeof saveObj["_id"] === "undefined") {
    // save new record:
    
    saveObj.createDate = new Date();
    saveObj.updateDate = saveObj.createDate;
    
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
    saveObj.updateDate = saveObj.createDate;
    
    console.log("updating existing record with an id of: "+sId);
    db.update({ '_id': sId }, saveObj, function (err2, numReplaced) {
      if (err2) {
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
  console.log("called DbTaskProcessor() factory function");
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
    console.log("taskPrc.addTask() method called");
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
    console.log("taskPrc.performTasks() method called");
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
    console.log("performTask() method called");
    
    if (typeof lastDbTask === "object") {
      lastDbTask.endDate = new Date();
      tasksCompletedByIndex.push(lastDbTask);
    } // end if
    
    if (taskQueueByIndex.length>0) {
      // ##############################################
      //  A TASK TO PROCESS... SO PROCESS IT!
      // ##############################################
      console.log("popping a dbTask off the Top of the queue (FIFO)");
      const dbTask = taskQueueByIndex.shift();
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
      // ##############################################
      console.log("db task queue is empty");
      // No more tasks on the Queue, so send back to the client 
      // anything that needs sending back!
      if (response) {
        console.log("about to send response back to the client");
        let rData = {};
        rData.result = "ok";
        rData.originalCmd = cmd;
        rData.returnPayload = returnPayload;


        // is client requesting schema info?
        if (dataInput.needSchemaInfo) {
          console.log("returning schema info to client");
          rData.schemaInfoByIndex = appSchemaDataByIndex;
        } // end if

        response.json(rData);
        console.log("response sent - all done processing db tasks and sending back any results");
        console.log("############################################################################################");
      } // end if (response)

    } // end if
  } // end of function performTask()
  
  
  
  
  /*************************************************************************
  *************************************************************************/
  function doneTask(inpTaskResults) {
    console.log("doneTask() function called");
    
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
    console.log("taskFailed() function called");
    

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
    console.log("taskPrc.beginApiRequestForCmd() method called");
    
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
    console.log("taskPrc.clearQueue() method called");
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
