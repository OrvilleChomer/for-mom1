
let currDomEl;
let currEditObj;
let bUnsavedChanges = false;





/*************************************************************************
 
*************************************************************************/
function addRecDataToModel(recData) {
  console.log("addRecDataToModel() function called");
  const appObj = app;
  const tblSchema = appObj.schemaInfoByRecordType[recData.recordType];
  const sTableName = tblSchema.tableName;
  const sId = recData['_id'];
  
  if (typeof appObj[sTableName+"ByIndex"] === "undefined") {
    appObj[sTableName+"ByIndex"] = [];      
  } // end if

  if (typeof appObj[sTableName+"ById"] === "undefined") {
    appObj[sTableName+"ById"] = [];  // server's Id ["_id"]
  } // end if

  const appRecsByIndex = appObj[sTableName+"ByIndex"];
  const appRecsById = appObj[sTableName+"ById"];
  
  
      
  if (typeof recData[tblSchema.pkField] === "undefined") {
    recData[tblSchema.pkField] = sId;
  } // end if
  
  recData = fixUpRecObj(recData);
  
  // merge data in app data
  if (typeof appRecsById[sId] === "undefined") {
    // data not in app data yet... add it
    appRecsByIndex.push(recData);
  } // end if

  appRecsById[sId] = recData;
  
} // end of function addRecDataToModel()





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
    
    if (fld.type === "text" || fld.type === "number" || fld.type === "email" || fld.type === "date") {
    
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
          updatedObj[fld.field] = inp.value;

          if (typeof fld.minLength === "number") {
            if (inp.value.length < fld.minLength) {
              inp.style.background = "#ff6699";
              sMsgs.push("- "+sCaption+" needs to be at least "+(fld.minLength)+" characters long.");
            } // end if minLength value
          } // end if minLength exists

        } // end if (inp.reportValidity())  else ...

      } // end if input value different than current object value
    
    } // end if an editable field type
    
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
  saveBtnNd.disabled = false;
  saveBtnNd.innerHTML = "Save Changes";
  
  const frmMsgsNd = $("#frmMsgs")[0];
  frmMsgsNd.innerHTML = "Changes Saved Successfully...";
  
  currEditObj = dataReturned.returnPayload[0].savedRec;
  
  addRecDataToModel(currEditObj);
  
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
  const dataById = appObj[sTableName+"ById"];
  bUnsavedChanges = false;
  
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
    
    if (fld.type === "text" || fld.type === "number" || fld.type === "email" || fld.type === "date" || fld.type==="weekday") {
      s.push("<tr><td nowrap>");
      sCaption = fld.field;
      
      if (typeof fld.caption === "string") {
        sCaption = fld.caption;
      } // end if
      
      s.push(sCaption+":</td>");
      
      s.push("<td nowrap>");
      
      
      // INPUT tag related UI:
      
      if (fld.type==="text" || fld.type==="number" || fld.type==="email" || fld.type==="memo") {
        s.push("<input ");
        s.push("id='frmItm"+fld.field+"' ");
        s.push("type='"+fld.type+"' ");
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
      
      
      if (fld.type==="memo") {
        s.push("<textarea rows='10' cols='60' ");
        s.push("id='frmItm"+fld.field+"' ");
        s.push(">");
        s.push("</textarea>");
      } // end if - memo
      
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
    
    if (fld.type === "text" || fld.type === "number" || fld.type === "email" || fld.type === "date" || fld.type === "memo") {
      console.log("populating input field id: #frmItm"+fld.field);
      const inp = $("#frmItm"+fld.field)[0];
      inp.value = recData[fld.field];
      inp.addEventListener("mouseup",clearFieldWarning);
      
      if (!bAValueLoaded) {
        inp.focus();
      } // end if
      
      bAValueLoaded = true;
    } // end if
    
  } // next n
  
} // end of function buildFormUi()




/*************************************************************************

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


  // build and display list box before query is done and list is populated
  s.push("<div "); // wrapping container (open)
  s.push("style='");
  s.push("position:relative;");
  s.push("overflow:hidden;");
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
      s.push("style='");
      s.push("left:"+(w-48)+"px;");
      s.push("' onclick="+Q);
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
    h.push("position:absolute;");
    h.push("left:0px;");
    h.push("top:"+nListTop+"px;");
    h.push("width:"+w+"px;");
    h.push("height:26px;");    
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
  
  const iData = {};
  iData.tableName = sTableName;
  let sCmd = "getRecs";
  
  if (typeof params.cmd === "string") {
    sCmd = params.cmd;
  } // end if
  
  iData.recordType = tblSchema.recordType;
  
  apiCall(sCmd, iData, buildBasicListUiDataLoaded, buildBasicListUiDataLoadFailure);
} // end of function buildBasicListUi()



/*************************************************************************

*************************************************************************/
function buildBasicListUiDataLoaded(dataPosted, dataReturned) {
  console.log("buildBasicListUiDataLoaded() function called");
  const appObj = app;
  
  try {
    const data = dataReturned.returnPayload[0].data;
    const s=[];
    const sTableName = dataPosted.tableName;
    const nMax = data.length;
    const tblSchema = app.schemaInfoByTableName[sTableName];
    const nMax2 = tblSchema.listFieldsByIndex.length;
    const lstAreaNd = $("#lstArea")[0];
    const Q = '"';
    let nTop = 0;
    let nRow,nLeft,n,fld;

    
    for (nRow=0;nRow<nMax;nRow++) {
      const rowData = data[nRow];
      const sId = rowData['_id'];
      
      addRecDataToModel(rowData);
            
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
        s.push(Q);
        s.push(">&nbsp;");

        if (typeof rowData[fld.field] !== "undefined") {
          s.push(rowData[fld.field]);        
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
        } else {
          recObj[fld.field] = ""; 
        } // end if/else
      } else {
        recObj[fld.field] = fld.defValue;
      } // end if/else
    } // end if
    
  } // next n
  
  return recObj;
} // end of function fixUpRecObj()





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






