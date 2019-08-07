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

// placing database in .data directory so it is private
const sDbFileName = "./.data/"+process.env.dbFileName;

if (sDbFileName) {
  let bExists1 = fs.existsSync(sDbFileName);
}

let bExists2;

const pin = process.env.PIN;
const defAdminEmailAdr = process.env.defAdminEmailAdr;
const defAdminUserName = process.env.defAdminUserName;
const defMomEmailAdr = process.env.defMomEmailAdr;

let dbTaskProc;

if (sDbFileName) {
  db = new Datastore(sDbFileName); // (5:13)
  db.loadDatabase(); // (5:40)
  
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
  
  returnPayload.payloadStatus = "unknown"; // default until over-ridden
  
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
  
  
  dbTaskProc.beginApiRequestTasksForCmd(cmd);
  
  switch(cmd) {
    case "getHash":
      break;
    case "resetApp":
      resetApp(dataInput, returnPayload);
      break;
    case "getCurrentUserInfo":
      getCurrentUserInfo(dataInput, returnPayload);
      break;
    case "registerDevice":
      deviceRegistered(dataInput, returnPayload);
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
  appTableSchemaSetup("users",[
  {field:"emailAdr",type:"email",caption:"Email Address"},
  {field:"userName",type:"text",size:50,caption:"User Name"},
  {field:"functionTags",type:"text",size:80,caption:"Function Tag Values"},
  {field:"locStatusId",type:"fk",fkTable:"locStatuses"}
  ]);
  
  appTableSchemaSetup("appointments",[
  {field:"appointmentTitle",type:"text",size:60,caption:"Appointment"},
  {field:"descr",type:"memo",caption:"Details"}
  ]);
  
  appTableSchemaSetup("appointmentDates",[
  {field:"appointmentId",type:"fk",fkTable:"appointments"},
  {field:"appointmentDate",type:"date",caption:"Appointment At"},
  {field:"results",type:"memo"},
  {field:"comments",type:"entries",caption:"Comments"}
  ]);
  
  appTableSchemaSetup("locStatuses",[
  {field:"locStatusText",type:"text",caption:"Location Status Text"},
  {field:"isGlobal",type:"boolean",caption:"Global"},
  {field:"forUserId",type:"fk",fkTable:"users"}
  ]);
  
  appTableSchemaSetup("weeklyReminders",[
  {field:"reminderText",type:"text",caption:"Weekly Reminder"},
  {field:"dayOfWeek",type:"weekday",caption:"Day of Week"}
  ]);
  
  appTableSchemaSetup("shoppingLists",[
  {field:"lstTitle",type:"text",caption:"List Title"}
  ]);
  
  appTableSchemaSetup("listItems",[
  {field:"itemName",type:"text",caption:"Item Name"}
  ]);
  
  appTableSchemaSetup("shoppingListItems",[
  {field:"shoppingListId",type:"fk",fkTable:"shoppingLists"},
  {field:"listItemId",type:"fk",fkTable:"listItems"},
  {field:"qty",type:"number",caption:"Item Name"}
  ]);
  
  appTableSchemaSetup("listItemLocation",[
  {field:"listItemId",type:"fk",fkTable:"listItems"},
  {field:"storeId",type:"fk",fkTable:"stores"},
  {field:"aisle",type:"text",caption:"Aisle"},
  {field:"aisleSection",type:"text",caption:"Aisle"}
  ]);
  
  appTableSchemaSetup("stores",[
  {field:"storeName",type:"text",caption:"Store Name"}
  ]);
  
  //shoppingListItems
  
  //groceryReceipts
  
  //bankAccts
} // end of function setupSchemaDefinition() 





/*************************************************************************

 *************************************************************************/
function appTableSchemaSetup(sTableName, fields) {
  let schema = {};
  
  schema.tableName = sTableName;
  schema.fields = fields;
  appSchemaDataByIndex.push(schema);
} // end of function appTableSchemaSetup()




/*************************************************************************

 *************************************************************************/
function deviceRegistered(dataInput, returnPayload) {
  console.log("deviceRegistered() called");
  
  returnPayload.payloadStatus = "success";
  
  
  return;
} // end of function deviceRegistered()





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
function getCurrentUserInfo(dataInput, returnPayload) {
  console.log("getCurrentUserInfo() called");
  
  returnPayload.currentUserInfo = {};
  returnPayload.returnContentList.push("currentUserInfo");
  
  db.find({ recordType: 'user',emailAdr: dataInput.userEmailAdr}, function (err, docs) {
    if (err) {
      returnPayload.currentUserInfo.payloadStatus = "error";
      return;
    } // end if
    
    returnPayload.payloadStatus = "success";
    returnPayload.data = docs;
    
    return;
  }); // end of db.find()
} // end of function getCurrentUserInfo(dataInput)


/*************************************************************************

   called from "getFutureAppts" command
 *************************************************************************/
function getFutureAppts(dataInput, returnPayload) {
  console.log("getFutureAppts() called");
  
  
  db.find({ recordType: 'appointment',apptDateMs: {$gt:0 }}, function (err, docs) {
    if (err) {
      returnPayload.futureAppointments.payloadStatus = "error";
      return;
    } // end if
    
    returnPayload.payloadStatus = "success";
    returnPayload.data = docs;
    
    return;
  }); // end of db.find() call-back block
  
} // end of function getFutureAppts() 


/*************************************************************************

   called from "getFutureAppts" command
 *************************************************************************/
function getFutureApptsProc(dataInput, returnPayload) {
  console.log("getFutureAppts() called");
  
  
  db.find({ recordType: 'appointment',apptDateMs: {$gt:0 }}, function (err, docs) {
    if (err) {
      returnPayload.futureAppointments.payloadStatus = "error";
      return;
    } // end if
    
    returnPayload.payloadStatus = "success";
    returnPayload.data = docs;
    
    return;
  }); // end of db.find() call-back block
  
} // end of function getFutureApptsProc() 



/*************************************************************************

   called from "resetApp" command
   used while testing
 *************************************************************************/
function resetApp(dataInput, returnPayload) {
  console.log("called resetApp() function");
  // fall back values:
  returnPayload.payloadStatus = "error";
  returnPayload.info = "invalid API call";
  // return;
  // uncomment line above when done testing!!
  
  // delete database file
  fs.unlinkSync(sDbFileName);
  
  // create a new database file to replace old one:
  db = new Datastore(sDbFileName); 
  db.loadDatabase(); 
  
  
  handleAdminUser(); 
  
  returnPayload.payloadStatus = "success";
} // end of function resetApp()



/*************************************************************************

   uses 'new' keyword like:
   const dbTaskProc = new DbTaskProcessor() 
 *************************************************************************/
function DbTaskProcessor(iDataInput) {
  console.log("called DbTaskProcessor() factory function");
  const taskPrc = this;
  let taskQueueByIndex = [];
  let tasksCompletedByIndex = [];
  let dataInput,returnPayload,lastDbTask;
  let bATaskStarted = false;
  let response,cmd;
  
  lastDbTask = undefined;
  
  /*
  */
  taskPrc.addTask = function(taskFunction) {
    console.log("taskPrc.addTask() method called");
    const dbTask = {};
    dbTask.taskFunction = taskFunction;
    dbTask.taskAdded = new Date();
    
    taskQueueByIndex.push(dbTask);
  } // end of addTask() method
  
  
  
  /*
  */
  taskPrc.performTasks = function(inpDataInput, responseObj) {
    console.log("taskPrc.performTasks() method called");
    dataInput = inpDataInput;
    returnPayload = [];
    response = responseObj;
    performTask();
  } // end of performTasks method
  
  
  
  /*
  */
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
      console.log("popping a dbTask off the queue");
      const dbTask = taskQueueByIndex.pop();
      const taskFunction = dbTask.taskFunction;
      
      dbTask.taskStarted = new Date();
      lastDbTask = dbTask;
      bATaskStarted = true;
      taskFunction(dataInput,returnPayload,doneTask);
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
      } // end if (response)

    } // end if
  } // end of function performTask()
  
  
  
  
  /*
  */
  function doneTask(inpTaskResults) {
    console.log("doneTask() method called");
    
    
    // add to our return payload:
    returnPayload.push(inpTaskResults);
    
    performTask(); // go try and do the next db task...
  } // end of function doneTask()
  
  
  
  
  /*
  */
  taskPrc.beginApiRequestTasksForCmd = function(sCmd) {
    console.log("taskPrc.beginApiRequestForCmd() method called");
    
    cmd = sCmd; // keep track of API request command (cmd)
    taskPrc.clearQueue(); // start fresh
  } // end of beginApiRequestTasksForCmd method
  
  
  
  /**
  */
  taskPrc.clearQueue = function() {
    console.log("taskPrc.clearQueue() method called");
    taskQueueByIndex = [];
    tasksCompletedByIndex = [];
    bATaskStarted = false;
    lastDbTask = undefined;
  } // end of clearQueue method
  
  
} // end of DbTaskProcessor() factory function
