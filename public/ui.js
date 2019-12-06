
let currDomEl;
let currEditObj;
let bUnsavedChanges = false;
const dateSel = {};
const dtCtrl = new DateTimeCtrl();




/*************************************************************************
 
 Called by:
    - applyFormUiInputsSuccess()  from this file
*************************************************************************/
function addRecDataToModel(recData) {
  console.log("addRecDataToModel() function called");
  const appObj = app;
  let sSpot = "";
  let oldRecData; // just for reference if we need it for debugging
  
  if (typeof recData === "undefined") {
    alert("recData variable undefined!\nFile:  ui.js\nFunction:addRecDataToModel()");
    debugger;
    return false;
  } // end if

  
  let sRecType = "";
  
  try {
    if (typeof recData.recordType !== "undefined") {
      sRecType = recData.recordType;
    } else {
      if (typeof recData.savedRec !== "undefined") {
        if (typeof recData.savedRec.recordType !== "undefined") {
          sRecType = recData.savedRec.recordType;
          oldRecData = recData;
          recData = recData.savedRec; // move down into... (a real HACK (I know)!)
        } // end if
      } // end if
    } // end if

    if (sRecType==="") {
      debugger;
    } // end if
    
    const tblSchema = appObj.schemaInfoByRecordType[sRecType];
    const sTableName = tblSchema.tableName;
    const sId = recData['_id'];

    if (typeof appObj[sTableName+"ByIndex"] === "undefined") {
      appObj[sTableName+"ByIndex"] = [];      
    } // end if

    if (typeof appObj[sTableName+"ByServerId"] === "undefined") {
      appObj[sTableName+"ByServerId"] = [];  // server's Id ["_id"]
    } // end if

    const appRecsByIndex = appObj[sTableName+"ByIndex"];
    const appRecsById = appObj[sTableName+"ByServerId"];



    if (typeof recData[tblSchema.pkField] === "undefined") {
      recData[tblSchema.pkField] = sId;
    } // end if

    recData = fixUpRecObj(recData); // this function is in this JS file

    // merge data in app data
    if (typeof appRecsById[sId] === "undefined") {
      // data not in app data yet... add it
      recData.arrIdx = appRecsByIndex.length;
      appRecsByIndex.push(recData);
    } else {
      if (typeof recData.arrIdx === "number") {
        appRecsByIndex[recData.arrIdx] = recData; // replace previous object
      } // end if
    } // end if

    appRecsById[sId] = recData; // add/replace by Id
    return true;
  } catch(err) {
    let returnedData = {};
    returnedData.result = "jsError";
    returnedData.jsFunctionName = "addRecDataToModel()";
    returnedData.errorOrigin = "client";
    returnedData.message = err.message;
    returnedData.fileName = err.fileName;
    returnedData.lineNumber = err.line;
    returnedData.spotInCode = sSpot;
    
    console.log(err);
    
    displayErrorInfo(returnedData);
    return false;
  } // end of try/catch
  
} // end of function addRecDataToModel()




/*************************************************************************
 data returned from Ajax call is added to the client data model...
*************************************************************************/
function addReturnedDataToModel(data) {
  console.log("addReturnedDataToModel() function called");
  const nMax = data.length;
  
  for (let n=0;n<nMax;n++) {
    const rowData = data[n];
    addRecDataToModel(rowData); // this function is in this file 
  } // next n
  
} // end of function addReturnedDataToModel()



/*************************************************************************
 called when user clicks/taps "Save Changes" button
*************************************************************************/
function applyFormUiInputs(params) {
  console.log("applyFormUiInputs() function called");
  const sTableName = params.forTable;
  const tblSchema = app.schemaInfoByTableName[sTableName];
  const nMax = tblSchema.fields.length;
  const target = {};
  const updatedObj = Object.assign(target, currEditObj);
  const sMsgs = [];
  let bChangesMade = false;
  const frmMsgsNd = $("#frmMsgs")[0];
  let fld,n;
  
  frmMsgsNd.innerHTML = "";
  
  for(n=0;n<nMax;n++) {
    fld = tblSchema.fields[n];
    
    if (fld.type === "text" || fld.type === "memo" || fld.type === "number" || fld.type === "email" || fld.type === "weekday" || fld.type === "datetime" || fld.type === "fk") {
    
      console.log("validating input field id: #frmItm"+fld.field);
      const inp = $("#frmItm"+fld.field)[0];
      let sCaption = fld.field;

      if (typeof fld.caption === "string") {
        sCaption = fld.caption;
      } // end if

      const currObjFieldValue = currEditObj[fld.field];
      
      if (inp.value !== currObjFieldValue) {
        bChangesMade = true;

        if (!inp.reportValidity()) {
          sMsgs.push("- "+sCaption+" contains an invalid value."); // 
          inp.style.background = "#ff6699";
        } else {
          
          // handle if input is at least the minimum length:
          // do before that is a possibility of updating updated object with value...
          if (typeof fld.minLength === "number" && inp.value !== "") {
            
            if (inp.value.length < fld.minLength) {
              inp.style.background = "#ff6699";
              sMsgs.push("- "+sCaption+" needs to be at least "+(fld.minLength)+" characters long.");
              break;
            } // end if minLength value
            
          } // end if minLength exists


          
          // note: a type of "fk" is an NeDb key value (which is a stringaddReturnedDataToModel)
          if (fld.type === "text" || fld.type === "fk") {
            updatedObj[fld.field] = inp.value;
          } // end if
          
         if ((fld.type === "date" || fld.type === "datetime") && typeof inp.value === "string") {
           // when a date or datetime field type, the type attribute for inp is "hidden"
           if (inp.value !== "") {
              updatedObj[fld.field] = new Date(inp.value); // make string value of date and time into an actual date object!
           } // end if
          } // end if
                    
          if (fld.type === "number") {          
            updatedObj[fld.field] = inp.value - 0; // update property value casting to a numeric value
          } // end if
          
        } // end if (inp.reportValidity())  else ...

      } // end if input value different than current object value
    
    } // end if an editable field type (using "value" attribute on INPUT or SELECT tags)
    
    
    // save checkbox values:
    if (fld.type === "boolean") {
      console.log("validating input (checked) field id: #frmItm"+fld.field);
      const inp = $("#frmItm"+fld.field)[0];
      
      if (inp.checked) {
        if (updatedObj[fld.field] !== "Y") {
          updatedObj[fld.field] = "Y";
          bChangesMade = true;
        } // end if
      } else {
        if (updatedObj[fld.field] !== "N") {
          updatedObj[fld.field] = "N";
          bChangesMade = true;
        } // end if
      } // end if/else
      
    } // end if (save checkbox values)
    
    
  } // next n
  
  if (!bChangesMade) {
    sMsgs.push("No unsaved changes were made.");
  } // end if
  
  if (sMsgs.length>0) {
    frmMsgsNd.style.color = "red";
    sMsgs.push("Record not saved.");
    frmMsgsNd.innerHTML = sMsgs.join("<br>");
    return;
  } // end if
  
  frmMsgsNd.style.color = "green";
  frmMsgsNd.innerHTML = "Saving Changes...";
  const saveBtnNd = $("#saveBtn")[0];
  saveBtnNd.disabled = true;
  saveBtnNd.innerHTML = "Working...";
  
 // if (typeof updatedObj["_id"] === "undefined") {
//    updatedObj["_id"] = ""; // new record
 // } // end if
  
  const iData = {};
  iData.tableName = sTableName;
  iData.recData = updatedObj;
  
  if (typeof params.thenRun === "function") {
    iData.thenRun = params.thenRun;
    
    if (typeof params.runParams === "object") {
      iData.runParams = params.runParams;
    } // end if
  } // end if
  
  apiCall("saveRec", iData, applyFormUiInputsSuccess, applyFormUiInputsFailure);
  
} // end of function applyFormUiInputs()







/*************************************************************************
 if "saveRec" API call was successful, this function runs...
*************************************************************************/
function applyFormUiInputsSuccess(dataPosted, dataReturned) {
  console.log("saveFormUiInputsSuccess() function called");
  const saveBtnNd = $("#saveBtn")[0];
  let sSpot = "";
  
  saveBtnNd.disabled = false;
  saveBtnNd.innerHTML = "Save Changes";
  
  const frmMsgsNd = $("#frmMsgs")[0];
  frmMsgsNd.innerHTML = "Changes Saved Successfully...";
  
  try {
     // currEditObj = dataReturned.returnPayload[0].savedRec;
    sSpot = "trying to get object from: dataReturned.returnPayloadByTagName['saveRec']";
    currEditObj = dataReturned.returnPayloadByTagName["saveRec"];
    //debugger;
    sSpot = "about to call:  addRecDataToModel(currEditObj)";
    addRecDataToModel(currEditObj);
    sSpot = "done calling: addRecDataToModel()";
    bUnsavedChanges = false;
    console.log(currEditObj);

    // is there a thenRun param???
    if (typeof dataPosted.thenRun === "function") {
      console.log("about to do a thenRun operation...");
      let fn = dataPosted.thenRun;

      if (typeof dataPosted.runParams === "object") {
        let params = dataPosted.runParams;
        fn(params);
      } else {
        fn();
      } // end if/else
    } // end if
    return true;
    
  } catch(err) {
    let returnedData = {};
    returnedData.result = "jsError";
    returnedData.jsFunctionName = "applyFormUiInputsSuccess()";
    returnedData.errorOrigin = "client";
    returnedData.message = err.message;
    returnedData.fileName = err.fileName;
    returnedData.lineNumber = err.lineNumber;
    returnedData.spotInCode = sSpot;
    
    console.log(err);
    
    displayErrorInfo(returnedData);
    return false;
  } // end of try/catch()
  
} // end of function saveFormUiInputsSuccess() 




/*************************************************************************

*************************************************************************/
function applyFormUiInputsFailure(dataPosted, dataReturned) {
  console.log("saveFormUiInputsFailure() function called");
  const frmMsgsNd = $("#frmMsgs")[0];
  frmMsgsNd.style.color = "red";
  frmMsgsNd.innerHTML = "There was a problem when trying to save...";
  debugger;
} // end of function saveFormUiInputsFailure() 


    
        






/*************************************************************************
  Builds HTML markup for user input form for doing 
  maintenance on a data set's new or existing record,
  and adds it to the DOM.
  
*************************************************************************/
function buildFormUi(params) {
  let s=[];
  const sTableName = params.forTable;
  let sId = "";
  let sOperation = "Add";
  let recData,n,fld;
  const Q = '"';
  const appObj = app;
  const tblSchema = appObj.schemaInfoByTableName[sTableName];
  const nMax = tblSchema.fields.length;
  const dataById = appObj[sTableName+"ByServerId"];
  bUnsavedChanges = false;
  
  gblDateCtrlInfoByIndex = []; // clear from any previous form builds
  
  if (typeof params.id === "string") {
    sId = params.id;
    sOperation = "Update";
    recData = dataById[sId];
  } else {
    recData = createNewRecObj(sTableName);
  } // end if
  
  currEditObj = recData;
  
  // exit (back out) of view button:
  s.push("<button ");
  s.push("class='exitEditBtn' ");
  s.push(" onclick="+Q);
  s.push("exitRecEdit({forTable:'"+sTableName+"'})");      
  s.push(Q);
  s.push(">&lt;");
  s.push("</button>");
  
  
  // Edit Title:
  s.push("<div ");
  s.push("class='editTitle' ");
  s.push("style='");
  s.push("width:"+(w-48-55)+"px;");
  s.push("'");
  s.push(">");
  s.push(sOperation);
  s.push(" ");
  s.push(tblSchema.labelSingular);
  s.push("</div>");
  
  
  s.push("<div id='frmPanel'>");
  
  s.push("<table>");
  
  for (n=0;n<nMax;n++) {
    fld = tblSchema.fields[n];
    let sCaption;
    
    // is this a kind of field editable in the UI?
    if (fld.type === "text" || fld.type === "number" || fld.type === "fk" ||
        fld.type==="memo" || fld.type === "boolean" || fld.type === "datetime" || 
        fld.type === "email" || fld.type === "date" || fld.type==="weekday") {
      
      s.push("<tr>");
      s.push("<td nowrap ");
      
      if (app.mobileDevice) {
        s.push("style='border-bottom:solid gray 1px;' ");
      } // end if
      
      s.push(">");
      sCaption = fld.field;
      
      if (typeof fld.caption === "string") {
        sCaption = fld.caption;
      } // end if
      
      if (app.mobileDevice && typeof fld.mobileCaption === "string") {
          sCaption = fld.mobileCaption;
        } // end if
      
      s.push(sCaption+":");
      
      if (app.mobileDevice) {
        s.push("<br>");
      } else {
        s.push("</td><td nowrap>");
      } // end if
      
      // INPUT tag related UI:
      
      if (fld.type==="text" || fld.type==="number" || fld.type==="email") {
        s.push("<input ");
        s.push("id='frmItm"+fld.field+"' ");
        s.push("type='"+fld.type+"' ");
        
        
        if (fld.type === "number") {
          s.push("class='numberInput' ");
          let nMin = 0;
          let nMax = 1000;
          let nStep = .05;
          
          if (typeof fld.min === "number") {
            nMin = fld.min;
          } // end if
          
          if (typeof fld.max === "number") {
            nMax = fld.max;
          } // end if
          
          if (typeof fld.step === "number") {
            nStep = fld.step;
          } // end if
          
          s.push("min='"+nMin+"' ");
          s.push("max='"+nMax+"' ");
          
          if (nStep>0) {
            s.push("step='"+nStep+"' ");
          } else {
            s.push("step='any' ");
          } // end if / else
          
        } // end if (fld.type === "number")
        
        
        s.push("style="+Q);

        if (fld.type === "email") {
          s.push("width:300px;");
        } // end if

        if (typeof fld.inputWidth === "number") {
          s.push("width:"+fld.inputWidth+"px;");
        } // end if

        s.push(Q);
        s.push(">");
      } // end if -- for input tag related UI...
      
      if (fld.type==="boolean") {
        s.push("<input ");
        s.push("id='frmItm"+fld.field+"' ");
        s.push("type='checkbox' ");
        s.push("style="+Q);
        
        if (typeof fld.inputWidth === "number") {
          s.push("width:"+fld.inputWidth+"px;");
        } // end if

        s.push(Q);
        s.push(">");
      } // end if
      
      if (fld.type==="memo") {
        s.push("<textarea rows='10' cols='60' ");
        s.push("id='frmItm"+fld.field+"' ");
        s.push(">");
        s.push("</textarea>");
      } // end if - memo
      
      if (fld.type==="datetime") {
        const sDate = recData[fld.field]+""; // hopefully cast it as a string
        s.push(dtCtrl.newCtrlMarkup({field:fld.field,pickDateCaption:"Pick Appointment Date",editTime:true,dateValue:sDate}));
      } // end if - datetime
      
      
      if (fld.type==="weekday") {
        s.push("<select ");
        s.push("id='frmItm"+fld.field+"' ");
        s.push(">");
        
        s.push("<option value=''>** Pick Day of Week **</option>");
          s.push("<option value='Sunday'>Sunday</option>");
          s.push("<option value='Monday'>Monday</option>");
          s.push("<option value='Tuesday'>Tuesday</option>");
          s.push("<option value='Wednesday'>Wednesday</option>");
          s.push("<option value='Thursday'>Thursday</option>");
          s.push("<option value='Friday'>Friday</option>");
          s.push("<option value='Saturday'>Saturday</option>");
        s.push("</select>");
      } // end if - weekday
      
      
      if (fld.type==="fk") {
        s.push("<select ");
        s.push("id='frmItm"+fld.field+"' ");
        s.push(">");
        
        s.push("<option value=''>** Pick **</option>");
        
        let sTableName = fld.fkTable;
        let tblData = appObj[sTableName+"ByIndex"];
        let nMax = tblData.length;
        let sDisplayFieldName = fld.displayFields[0];  // for now...
        
        for (let n=0;n<nMax;n++) {
          let rec = tblData[n];
          s.push("<option value="+Q);
          s.push(rec[fld.field]);
          s.push(Q+">");
          s.push(rec[sDisplayFieldName]);
          s.push("</option>");
        } // next n
        
        s.push("</select>");
      } // end if - "fk"
      
      s.push("</td>");
      
      s.push("</tr>");
    } // end if
    
  } // next n
  
  s.push("</table>");
  
  s.push("<hr>");
    
  // *** SAVE BUTTON:
  s.push("<button ");
  s.push(" id='saveBtn' ");
  s.push("' onclick="+Q);
  s.push("saveFormUiInputs({");
  s.push("forTable:'"+sTableName+"',");
  s.push("id:'"+sId+"'");
  s.push("})");
  s.push(Q);
  
  s.push(">");
  
  s.push("Save Changes</button>");
  
  s.push("&nbsp;&nbsp;");
  
  // *** APPLY BUTTON:
  s.push("<button ");
  s.push(" id='saveBtn' ");
  s.push("' onclick="+Q);
  s.push("applyFormUiInputs({");
  s.push("forTable:'"+sTableName+"',");
  s.push("id:'"+sId+"'");
  s.push("})");
  s.push(Q);
  
  s.push(">");
  
  s.push("Apply</button>");
  
  
  
  s.push("&nbsp;<br>&nbsp;<br><div id='frmMsgs'>");
  s.push("</div>");
  
  s.push("</div>"); // closing frmPanel div tag
  
  currDomEl.innerHTML = s.join("");
  
  const frmPanelNd = $("#frmPanel")[0];
  
  frmPanelNd.style.width = (w-10)+"px";
  let bAValueLoaded = false;
  
  for (n=0;n<nMax;n++) {
    fld = tblSchema.fields[n];
    
    if (fld.type === "text"|| fld.type === "memo"  || fld.type === "number" || fld.type === "email" || fld.type === "weekday" || fld.type === "memo" || fld.type === "fk") {
      console.log("populating input field id: #frmItm"+fld.field);
      const inp = $("#frmItm"+fld.field)[0];
      inp.value = recData[fld.field];
      inp.addEventListener("mouseup",clearFieldWarning);
      
      if (!bAValueLoaded) {
        inp.focus();
      } // end if
      
      bAValueLoaded = true;
    } // end if ()
    
    if (fld.type === "boolean") {
      const inp = $("#frmItm"+fld.field)[0];
      if (recData[fld.field] === "Y") {
        inp.checked = true;
      } else {
        inp.checked = false;
      } // end if
      inp.addEventListener("mouseup",clearFieldWarning);
    } // end if
    
  } // next n
  
  
  dtCtrl.activateControls();
} // end of function buildFormUi()




/*************************************************************************
   buildBasicListUi() function.
   
                 Call Function             JS File
                 ===============           =========
   called by:    editApptDates()           app.js
   
*************************************************************************/
function buildBasicListUi(params) {
  console.log("buildBasicListUi() function called");
  let s=[];
  const sTableName = params.forTable;
  const domEl = params.containerDomEl;
  
  currDomEl = domEl;
  
  const tblSchema = app.schemaInfoByTableName[sTableName];
  let fld,n;
  
  const nMax = tblSchema.fields.length;
  const Q = '"';
  let bIsAddButton = false;
  let nListTop = 0;


  // build and display list box (starting empty) before query is done and list is populated
  s.push("<div "); // wrapping container (open)
  s.push("style='");
  s.push("position:relative;");
  s.push("overflow:hidden;");
  s.push("background:orange;");
  s.push("margin:0;");
  s.push("padding:0;");
  s.push("left:0px;");
  s.push("top:0px;");
  s.push("width:"+(w)+"px;");
  s.push("height:"+(h-90)+"px;");
  s.push("'>");
  
  if (typeof params.addButton === "boolean") {
    if (params.addButton === true) {
      
      // exit (back out) of view button:
      s.push("<button ");
      s.push("class='exitEditBtn' ");
      s.push(" onclick="+Q);
      s.push("exitListEdit()");      
      s.push(Q);
      s.push(">&lt;");
      s.push("</button>");
      
      s.push("<div ");
      s.push("class='editTitle' ");
      s.push("style='");
      s.push("width:"+(w-48-55)+"px;");
      s.push("'");
      s.push(">Edit ");
      s.push(tblSchema.labelPlural);
      s.push("</div>");
      
      // add item button:
      s.push("<button ");
      s.push("class='addBtn' ");
      s.push(" onclick="+Q);
      s.push("buildFormUi({");
      s.push("forTable:'"+sTableName+"'");
      s.push("})");
      s.push(Q);
      s.push(">+");
      s.push("</button>");
      bIsAddButton = true;
      nListTop = 50;
    } // end if
  } // end if
  
  if (!tblSchema.listFieldsByIndex) {
    let h=[];
    tblSchema.listFieldsByIndex = [];
    let nLeft = 0;
    
    h.push("<div "); // list header wrapper (open)
    h.push("class='lstHdr' ");
    h.push("style='");
    h.push("left:0px;");
    h.push("top:"+nListTop+"px;");
    h.push("width:"+w+"px;"); 
    h.push("'");
    h.push(">");
    
    
    for (n=0;n<nMax;n++) {
      fld = tblSchema.fields[n];
      if (typeof fld.listIndex === "number") {
        tblSchema.listFieldsByIndex.push(fld);
        let nWidth = 120;
        
        if (typeof fld.colWidth === "number") {
          nWidth = fld.colWidth;
        } // end if
        
        h.push("<div "); // col heading opening tag
        h.push("class='lstHdrCol' ");
        h.push("style=");
        h.push("'");
        h.push("top:1px;");
        h.push("left:"+nLeft+"px;");
        h.push("width:"+nWidth+"px;");
        h.push("'");
        h.push(">&nbsp;");
        let sCaption = fld.field;
        
        if (typeof fld.caption === "string") {
          sCaption = fld.caption;
        } // end if
        
        if (app.mobileDevice && typeof fld.mobileCaption === "string") {
          sCaption = fld.mobileCaption;
        } // end if
        
        if (fld.displayFields) {
          if (Array.isArray(fld.displayFields)) {
            
          } // end if
        } // end if
        
        h.push(sCaption); // col header text
        
        h.push("</div>"); // col heading closing tag
        nLeft = nLeft + nWidth;
      } // end if
    } // next n
    h.push("</div>"); // list header wrapper (closing tag)
    
    
    tblSchema.headerMarkup = h.join("");
  } // end if
  
  s.push(tblSchema.headerMarkup);
  
  nListTop = nListTop + 26;
  
  s.push("<div "); // list area opening tag
  s.push("id='lstArea' ");
  s.push("style=");
  s.push("'");
  s.push("top:"+nListTop+"px;");
  s.push("left:0px;");
  s.push("width:"+(w)+"px;");
  let nListAreaHeight = h-nListTop-25;
  s.push("height:"+(nListAreaHeight)+"px;");
  s.push("'");
  s.push(">");
  
  //spinnerImage
  s.push("<img id='spinner' ");
  s.push("style='");
  s.push("left:"+((w-130)/2)+"px;");
  s.push("top:"+((nListAreaHeight-(130*2))/2)+"px;");
  s.push("''>");
  
  
  s.push("</div>"); // end of list area closing tag
  
  s.push("</div>"); // wrapping container (closing tag)
  
  domEl.innerHTML = s.join("");
  domEl.style.display = "block";
  
  const spinnerImageNd = $("#spinnerImage")[0];
  const spinnerNd = $("#spinner")[0];
  spinnerNd.src = spinnerImageNd.src;
  
  /*
  i want to change this so we can request data from one or more tables
  i want to pass an array of table names
   */
  const iData = {};
  iData.tableName = sTableName;
  let sCmd = "getRecs";
  
  if (typeof params.cmd === "string") {
    sCmd = params.cmd;
  } // end if
  
  iData.recordType = tblSchema.recordType;
  iData.queryRecordTypes = tblSchema.queryRecordTypes;  // Oct 8, 2019

  apiCall(sCmd, iData, buildBasicListUiDataLoaded, buildBasicListUiDataLoadFailure);
} // end of function buildBasicListUi()



/*************************************************************************

*************************************************************************/
function buildBasicListUiDataLoaded(dataPosted, dataReturned) {
  console.log("buildBasicListUiDataLoaded() function called");
  const appObj = app;
  
  


  try {
    const getRecsDataReturned = dataReturned.returnPayloadByTagName["getRecs"];
    let data = getRecsDataReturned.data;
    // addReturnedDataToModel() function is in this JS file
    addReturnedDataToModel(data); // def a little sketchy... but for now...

    const s=[];
    const sTableName = dataPosted.tableName;
    data = filterDataForTable(data,sTableName);
    const nMax = data.length;
    const tblSchema = appObj.schemaInfoByTableName[sTableName];
    const nMax2 = tblSchema.listFieldsByIndex.length;
    const lstAreaNd = $("#lstArea")[0];
    const Q = '"';
    let nTop = 0;
    let nRow,nLeft,n,fld;

    
    for (nRow=0;nRow<nMax;nRow++) {
      const rowData = data[nRow];
      const sId = rowData['_id'];
           
      nLeft = 0;
      
      // ** Build a row in the list...
      s.push("<div "); // list row opening tag
      
      // handle user clicking/tapping on row:
      s.push("onclick="+Q);
      s.push("buildFormUi({");
      s.push("forTable:'"+sTableName+"',");
      s.push("id:'"+sId+"'");
      s.push("})");
      s.push(Q);
      
      s.push(" class='lstRow' ");
      s.push("style="+Q);
      s.push("top:"+(nTop)+"px;");
      s.push("width:"+(w)+"px;");
      s.push("left:0px;");
      s.push(Q);
      s.push(">");
 
      // ** Build the cells in the row...
      for (n=0;n<nMax2;n++) {
        let nColWidth = 120;
        fld = tblSchema.listFieldsByIndex[n];
        
        if (typeof fld.colWidth === "number") {
          nColWidth = fld.colWidth;
        } // end if

        s.push("<div "); // field row cell opening tag 
        s.push("class='lstCell' ");
      
        s.push("style="+Q);
        s.push("top:0px;");
        s.push("left:"+(nLeft)+"px;");
        s.push("width:"+(nColWidth)+"px;");
        
        if (typeof fld.mobileListFontSize === "number" && appObj.mobileDevice===true) {
          s.push("fontSize:"+(fld.mobileListFontSize)+"pt;");
        } // end if
        
        s.push(Q);
        let sFieldValue = "";
        let sFieldType;
        let bField = false;
        let retValue;
        
        if (typeof rowData[fld.field] !== "undefined") {
          sFieldValue = rowData[fld.field];
          sFieldType = fld.type;
          bField = true;
          
          if (typeof fld.fkTable === "string") {
            if (sFieldValue !== "") {
              retValue = getFkFieldValueAndType(sFieldValue,fld);
              sFieldValue = retValue.value;
              sFieldType = retValue.type;
            } // end if
          } // end if
          
          
          if (sFieldType === "datetime") {            
            sFieldValue = formattedDateTime(sFieldValue);
          } // end if
          
          s.push(" title="+Q+" "+sFieldValue+Q);
        } // end if (is a field)
        
        s.push(">&nbsp;"); // closing char of opening DIV tag and a hard space

        if (bField) {          
            s.push(sFieldValue);           
        } // end if

        s.push("</div>"); // end of field row cell ... closing tag
        nLeft = nLeft + nColWidth;
      } // next n

      s.push("</div>"); // end of list row  ... closing tag
      nTop = nTop + 55;
    } // next nRow

    lstAreaNd.innerHTML = s.join("");
    console.log("*** Markup Generated:");
    console.log(lstAreaNd.innerHTML);
  } catch(err) {
    console.log("*** JS error in: buildBasicListUiDataLoaded() !!");
    console.log(err);
  } // end of try/catch block
  
  console.log("buildBasicListUiDataLoaded() function finished");
} // end of function buildBasicListUiDataLoaded()





/*************************************************************************

*************************************************************************/
function buildBasicListUiDataLoadFailure(dataPosted, dataReturned) {
  console.log("buildBasicListUiDataLoadFailure() function called");
  debugger;
} // end of function buildBasicListUiDataLoadFailure()







/*************************************************************************
s.push("buildCalendarCtlPopup({'id':'frmItm"+fld.field+"'})");
*************************************************************************/
function calHome() {
  let currentDate = new Date();
  let nMonth = currentDate.getMonth();
  let nYear = currentDate.getFullYear();
  
  
  
  let sId = dateSel.ctrlId;
  let params = {};
  params.id = sId;
  params.navYear = nYear;
  params.navMonth = nMonth;
  buildCalendarCtlPopup(params);
} // end of function calPrev



/*************************************************************************
s.push("buildCalendarCtlPopup({'id':'frmItm"+fld.field+"'})");
*************************************************************************/
function calNext() {
  let nMonth = dateSel.currentMonth + 1;
  let nYear = dateSel.currentYear;
  
  if (nMonth > 11) {
    nMonth = 0;
    nYear = nYear + 1;
  } // end if
  
  let sId = dateSel.ctrlId;
  let params = {};
  params.id = sId;
  params.navYear = nYear;
  params.navMonth = nMonth;
  buildCalendarCtlPopup(params);
} // end of function calNext



/*************************************************************************
s.push("buildCalendarCtlPopup({'id':'frmItm"+fld.field+"'})");
*************************************************************************/
function calPrev() {
  let nMonth = dateSel.currentMonth - 1;
  let nYear = dateSel.currentYear;
  
  if (nMonth < 0) {
    nMonth = 11;
    nYear = nYear - 1;
  } // end if
  
  let sId = dateSel.ctrlId;
  let params = {};
  params.id = sId;
  params.navYear = nYear;
  params.navMonth = nMonth;
  buildCalendarCtlPopup(params);
} // end of function calPrev





/*************************************************************************

*************************************************************************/
function calSelDate(nMonth, nDay, nYear) {
  
  dateSel.valueControl.value = pickDate;
} // end of function calSelDate()





/*************************************************************************

*************************************************************************/
function clearFieldWarning(event) {
  const ctrl = event.target;
  ctrl.style.background = "white";
  const frmMsgsNd = $("#frmMsgs")[0];
  frmMsgsNd.innerHTML = "";
} // end of function clearFieldWarning()




/*************************************************************************

*************************************************************************/
function createNewRecObj(sTableName) {
  console.log("createNewRecObj() function called");
  const tblSchema = app.schemaInfoByTableName[sTableName];  
  let newRec = {};
  
  // having this actually Might cause problems for the db
  //
  //newRec["_id"] = ""; // no server-sided id... yet...
  
  newRec.recordType = tblSchema.recordType;
  newRec = fixUpRecObj(newRec);
  
  
  return newRec;
} // end of function createNewRecObj()



/*************************************************************************
 display a dialog showing JS Error info...
*************************************************************************/
function displayErrorInfo(returnedData) {
  const dia = document.createElement("div");  
  const splashNd = document.getElementById("splash");
  const s = [];
  
  // hide splash screen... in case it was blocking something
  // when the error occurred!
  splashNd.style.display = "none"; 
  
  dia.id="jsErrInfo";
  dia.style.position = "absolute";
  dia.style.width = "400px";
  dia.style.height = "300px";
  dia.style.background = "silver";
  dia.style.zIndex = "910";
  dia.style.overflow = "auto";
  dia.style.left = ((w - 400) / 2) + "px";
  dia.style.top = ((h - 300) / 2) + "px";
  
  s.push("<h2>Caught JS Error!</h2>");
  
  s.push("JS Function: "+returnedData.jsFunctionName+"<br>");
  s.push("Error Origin: "+returnedData.errorOrigin+"<br>");
  s.push("Error Message: "+returnedData.message+"<br>");
  s.push("JS File Name: "+returnedData.fileName+"<br>");
  s.push("Line#: "+returnedData.lineNumber+"<br>");
  s.push("Spot in Code#: "+returnedData.spotInCode+"<br>");

  s.push("<center>");
  s.push("<button id='jsErrInfoCloseBtn'>Close</button>");
  s.push("</center>");
  
  dia.innerHTML = s.join("");
  document.body.appendChild(dia); 
  tintNd.style.display = "block";
  
  const jsErrInfoCloseBtnNd = document.getElementById("jsErrInfoCloseBtn");
  jsErrInfoCloseBtnNd.addEventListener("click", displayErrorInfoClose);
} // end of function displayErrorInfo()


/*************************************************************************
 close dialog showing JS Error info...
*************************************************************************/
function displayErrorInfoClose() {
  const jsErrInfoNd = document.getElementById("jsErrInfo");
  jsErrInfoNd.style.display = "none";
  tintNd.style.display = "none";
  jsErrInfoNd.parentNode.removeChild(jsErrInfoNd);
} // end of function displayErrorInfoClose()


/*************************************************************************
called when user clicks/taps the Back button on an edit list view
*************************************************************************/
function exitListEdit() {
  console.log("exitListEdit() function called");
  currDomEl.style.display = "none";
  menuNd.style.display = "block";
} // end of function exitListEdit() 




/*************************************************************************
called when user clicks/taps the Back button on an edit form view
*************************************************************************/
function exitRecEdit(params1) {
  console.log("exitRecEdit() function called");
  
  if (bUnsavedChanges) {
    const frmMsgsNd = $("#frmMsgs")[0];
    frmMsgsNd.innerHTML = "You've made changes that you have not saved";
    return;
  } // end if
  
  const params2 = {};
  params2.forTable = params1.forTable;
  params2.containerDomEl = currDomEl;
  params2.addButton = true;
  
  buildBasicListUi(params2);


} // end of function exitRecEdit() 



/*************************************************************************

*************************************************************************/
function filterDataForTable(idata,sTableName) {
  const appObj = app;
  const schema = appObj.schemaInfoByTableName[sTableName];
  const sRecordType = schema.recordType
  const data = [];
  const nMax = idata.length;
  
  for (let i=0;i<nMax;i++) {
    const recData = idata[i];
    
    if (recData.recordType === sRecordType) {
      data.push(recData);
    } // end if
    
  } // next i
  
  return data;
  
} // end of function filterDataForTable()





/*************************************************************************

*************************************************************************/
function fixUpRecObj(recObj) {
  const appObj = app;
  const tblSchema = appObj.schemaInfoByRecordType[recObj.recordType];
  const nMax = tblSchema.fields.length;
  let fld,n;
  
  for(n=0;n<nMax;n++) {
    fld = tblSchema.fields[n];
    
    console.log("    field: "+fld.field);
    
    if (typeof recObj[fld.field] === "undefined") {
      if (typeof fld.defValue === "undefined") {    
        if (typeof fld.type === "number") {
          recObj[fld.field] = 0; 
        } else if (fld.type === "comments") {
          recObj[fld.field] = []; 
        } else if (fld.type === "boolean") {
          recObj[fld.field] = "N"; 
        } else {
          recObj[fld.field] = ""; 
        } // end if/else if/else
      } else {
        recObj[fld.field] = fld.defValue;
      } // end if/else
    } else {
      // field HAS a value.... make sure that it is the right type!
      if (fld.type === "string" || fld.type === "comments" || fld.type === "boolean") {
        recObj[fld.field] = recObj[fld.field] + "";
      } // end if
      
      if (fld.type === "number") {
        recObj[fld.field] = recObj[fld.field] - 0;
      } // end if
      
      if ((fld.type === "date" || fld.type === "datetime" ) && typeof recObj[fld.field] === "string") {
        recObj[fld.field] = new Date(recObj[fld.field]);
      } // end if
      
    } // end if
    
  } // next n
  
  // handle implied fields that are not explicitely defined in the schema...
  if (typeof recObj["createDate"] === "string") {
    recObj["createDate"] = new Date(recObj["createDate"]);
  } // end if
  
  if (typeof recObj["updateDate"] === "string") {
    recObj["updateDate"] = new Date(recObj["updateDate"]);
  } // end if
  
  return recObj;
} // end of function fixUpRecObj()



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

*************************************************************************/
function getFkFieldValueAndType(siFkValue,fld) {
  const appObj = app;
  const sTableName = fld.fkTable;
  const schema = appObj.schemaInfoByTableName[sTableName];
  const retValue = {};
  const appRecsById = appObj[sTableName+"ByServerId"];
  
  const rec = appRecsById[siFkValue];
  const displayFields = fld.displayFields;
  const sFFieldName = displayFields[0];  // only doing 1 field for now
  const fld2 = schema.fieldsByFieldName[sFFieldName];
  
  retValue.value = rec[sFFieldName];
  retValue.type = fld2.type;
  
  return retValue;
} // end of function  getFkFieldValueAndType()



 

/*************************************************************************

*************************************************************************/
function getFullMonthName(dt) {
  let nMonth = dt.getMonth();
  const sMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  
  return sMonthNames[nMonth];
} // end of function getFullMonthName(dt)



/*************************************************************************

*************************************************************************/
function getTotalDaysInMonth(dt) {
  let nYear = dt.getFullYear();
  let nMonth = dt.getMonth()+1;
  
  if (nMonth>11) {
    nMonth = 1;
    nYear = nYear + 1;
  } // end if
  
  let firstDateOfNextMonth = new Date();
  firstDateOfNextMonth.setFullYear(nYear);
  firstDateOfNextMonth.setDate(1);
  firstDateOfNextMonth.setMonth(nMonth);
  const nMsInDay = 1000 * 60 * 60 * 24;
  let lastDateOfCurrentMonth = new Date();
  lastDateOfCurrentMonth.setTime(firstDateOfNextMonth.getTime()-nMsInDay);
  
  return lastDateOfCurrentMonth.getDate();
}// end of function getTotalDaysInMonth()



/*************************************************************************
 for views other than the main menu (the Back button)
*************************************************************************/
function getViewTitleBarBackButtonMarkup(params) {
  const s = [];
  
  
  
  return s.join("");
} // end of function getViewTitleBarMarkup()


/*************************************************************************
 for views other than the main menu
*************************************************************************/
function getViewTitleBarMarkup(params) {
  const s = [];
  
  s.push(getViewTitleBarBackButtonMarkup());
  s.push(params.caption);
  
  return s.join("");
} // end of function getViewTitleBarMarkup()




/*************************************************************************

*************************************************************************/
function hideCalendarCtl() {
  const calPopupNd = $("#calPopup")[0];
  calPopupNd.innerHTML = "";
  calPopupNd.style.display = "none";
  tintNd.style.display = "none";
} // end of function hideCalendarCtl() 





/*************************************************************************
 called when user clicks/taps "Save Changes" button
*************************************************************************/
function saveFormUiInputs(params) {
  params.thenRun = exitRecEdit;
  
  const params2 = {};
  params2.forTable = params.forTable;
  params.runParams = params2;
  
  applyFormUiInputs(params);
} // end of function saveFormUiInputs()






