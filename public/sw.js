/************************************************************************************************
  OFFICIAL_MOM_APP_FILE
  
  Service Worker
  
  Very informative web page:
     -  https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook/
 ************************************************************************************************/

const CACHE_VERSION_NUM = 2;
const CACHED_NAME = "mommy_app"+(CACHE_VERSION_NUM);

let sBaseUrl = "https://for-mom.glitch.me"; // hard coded for now

const CACHED_URL_INFO = [
                         {"url":"https://code.jquery.com/jquery-3.4.1.min.js", "loadMethod":"localFirst"},  
                         {"url":"/", "loadMethod":"localFirst"},
                         {"url":"/index.html",  "loadMethod":"localFirst"},
                         {"url":"/app.js",  "loadMethod":"localFirst"},
                         {"url":"/ui.js",  "loadMethod":"localFirst"},
                         {"url":"/logging.js", "loadMethod":"localFirst"},
                         {"url":"/style.css",  "loadMethod":"localFirst"},
                         {"url":"/manifest.json",  "loadMethod":"localFirst"},
                         {"url":"https://cdn.glitch.com/a2964a8f-6339-465f-8a8d-329fd8d12c43%2Ftouch-icon-iphone-retina.png?v=1565021690526", "loadMethod":"localFirst"},
                         {"url":"https://cdn.glitch.com/e3e30767-8986-4b3b-b433-68343d26f31e%2Fapp-icon-144.png?v=1563309390774", "loadMethod":"localFirst"}
                        ]; // end of CACHED_URL_INFO array definition

let CACHED_URLS = [];

let cachedUrlInfoByKey = [];
let cachedUrlsLocalFirst = [];
let cachedUrlsLocalFirstThenNetwork = [];
let cachedUrlsNetworkFirst = [];
let bUrlsWerePrepped = false;

prepCacheURLs(); // don't call this in the "install" event listener block or it won't get called every time that it should






/****************************************************************************
 The 'install' event runs right After the service worker has finished
 being registered.
 
 this event is about the Service Worker being installed for the web
 app to use, Not the web app being installed on the Home screen!
 
 This is where any files that need to be cached locally, are cached!
 
 ****************************************************************************/
self.addEventListener('install', function(event) {
  //lg("Service Worker 'install' event triggered");
  
  event.waitUntil(
    caches.open(CACHED_NAME).then(function(cache) {
     // lg('caches.open() ran');

      cache.addAll(CACHED_URLS)
     
      
     // lg('cache.addAll() request Submitted...');
     // return urlCache;
      
      /*
       if you get this far, it doesn't mean for sure that you are ok
       if one or more of the URLs is wrong, you will get this far...
       but... not much later you will get some sort of cryptic Promise error!
       So BE CAREFUL!!
       */
      
      
    }) // end of caches.open().then    
    
  ); // end of event.waitUntil(...) call
  
}); // end  of eventListener 'install'




/****************************************************************************
 ****************************************************************************/
self.addEventListener("activate", function(event) {
  lg("Service Worker 'activate' event triggered");
  
  
  event.waitUntil(deleteAnyOldCaches());
  
  // https://stackoverflow.com/questions/38168276/navigator-serviceworker-controller-is-null-until-page-refresh
  
  
}); // end of 'Activate' event listener



/****************************************************************************
  listens for messages sent from the main thread
 ****************************************************************************/
self.addEventListener('message', function(event) {
  lg("Service Worker 'message' event triggered");
  //console.log("Service Worker 'message' event listener");
  //console.log(event);
  const data = event.data;
  const nOpenPort = event.ports[0];
  const sCmd = data.cmd;
  const sClientId = event.source.id;
  
  if (sCmd==="init") {
    let ping = {};
    ping.cmd = "ping";
    ping.response = data.info;
    sendClientsMsg("ping", ping);
  } // end if
  
});// end of 'message' event listener



/****************************************************************************
 ****************************************************************************/
self.addEventListener('fetch', function(event) {
  lg("Service Worker 'fetch' event triggered");
  let sUrl = event.request.clone().url;
  
  lg('--- Fetch request for: <b>'+ sUrl +'</b>');
 
      
  const urlInfo = cachedUrlInfoByKey[sUrl];  

	if (urlInfo) {
		if (urlInfo.loadMethod === "localFirst") {
		  return getLocalFirst(event);
		} // end if

		if (urlInfo.loadMethod === "localFirstThenNetwork") {
		  return getLocalThenNetwork(event);
		} // end if

		if (urlInfo.loadMethod === "networkFirst") {
		  return getNetworkFirst(event);
		} // end if
	} else {
		lg('Could not find URL in my array');
  } // end if (urlInfo)  / else

  
  
});// end of 'fetch' event listener




/****************************************************************************

  called from "install" event listener?  ... NO!
 ****************************************************************************/
function prepCacheURLs() {
  if (bUrlsWerePrepped) return;
  
  //lg("prepCacheURLs() called");
  cachedUrlInfoByKey = [];
  cachedUrlsLocalFirst = [];
  cachedUrlsLocalFirstThenNetwork = [];
  cachedUrlsNetworkFirst = [];
  CACHED_URLS = [];
  
  let n;
  const nMax = CACHED_URL_INFO.length;
  
  for(n=0;n<nMax;n++) {
    const urlInfo = CACHED_URL_INFO[n];
    
    if (urlInfo.url.substr(0,1)==="/") {
      urlInfo.fullUrl = sBaseUrl + urlInfo.url;
    } else {
      urlInfo.fullUrl = urlInfo.url;
    } // end if/else
    
    cachedUrlInfoByKey[urlInfo.fullUrl] = urlInfo;
    const sLoadMethod = urlInfo.loadMethod;
    
    if (sLoadMethod === "localFirst") {
      cachedUrlsLocalFirst.push(urlInfo.fullUrl);
    } // end if
    
    if (sLoadMethod === "localFirstThenNetwork") {
      cachedUrlsLocalFirstThenNetwork.push(urlInfo.fullUrl);
    } // end if
    
    if (sLoadMethod === "networkFirst") {
      cachedUrlsNetworkFirst.push(urlInfo.fullUrl);
    } // end if
    
    //CACHED_URLS.push(urlInfo.fullUrl);
    CACHED_URLS.push(urlInfo.url);
  } // next n
  
  console.log(CACHED_URLS);
  
  bUrlsWerePrepped = true;
} // end of function prepCacheURLs()





/****************************************************************************
  called from activate event
  https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker-slides
  2:17 into first video:
 ****************************************************************************/
function deleteAnyOldCaches() {
  lg("Service Worker: deleteAnyOldCaches() called");
  lg("-- called from 'Activate' event listener code");
  caches.keys().then(keyList => {
    return Promise.all(keyList.map(key => {
      if (key !== CACHED_NAME) {
        lg("cache name: "+key+" deleted");
        return caches.delete(key);
      } // end if
    })) // end of Promise.all(keyList.map)
  }) // end of caches.keys.then
  
  self.clients.claim();
  lg("just called:  self.clients.claim()");
} // end of function deleteAnyOldCaches()




/****************************************************************************
  called from fetch event
  if we have local copy in cache, get that first, otherwise get it from the network
  
  https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker-slides
  2:37 into first video:
  
  - get local first
  - if successful, we're done
  - if not, get from network
  - if network fails, gen some sort of error (gracefully I hope)
 ****************************************************************************/
function getLocalFirst(event) {
  lg("Service Worker: <b>getLocalFirst()</b> called");
  
  event.respondWith(
  	caches.match(event.request).then(function(response) {
		lg("--- performed match on cache");
    //   get local value (if it exists), otherwise fetch the resource from the network!
      
      
		//     local       network    
		return response || fetch(event.request);
    }) // end of caches.match 'then' block
  ); // end of respondWith block
  
} // end of function getLocalFirst()




/****************************************************************************
   called from fetch event
   
 - get local first
 - if we got local use right away
 - if local does not exist, get network
 - even IF local exists, Still get network!
 - if we got network, replace any local!
 - if we got local but cannot get network, use local
 ****************************************************************************/
function getLocalThenNetwork(event) {
  lg("Service Worker: <b>getLocalThenNetwork()</b> called");
} // end of function getLocalThenNetwork()



/****************************************************************************
  called from fetch event
- get network first
- if it fails, get local
- if local fails, gen some sort of error (gracefully I hope)
 ****************************************************************************/
function getNetworkFirst(event) {
  lg("Service Worker: <b>getNetworkFirst()</b> called");
  
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
} // end of function getNetworkFirst()






/****************************************************************************

 don't call lg() function from inside the 
 function below
 ****************************************************************************/
function sendClientsMsg(sCmd, msg) {
  console.log("sendClientsMsg() called");
  let data = {};
  data.cmd = sCmd;
  data.msg = msg;
  console.log("msg object 'data' set up...");
  console.log(data);
  clients.matchAll({
    includeUncontrolled:true,
    type:"window"
  }).then(clients => {
    clients.forEach(client => {
      console.log("about to post msg to client...");
      client.postMessage(data);
    })
  })
} // end of function sendClientsMsg()




/****************************************************************************

 ****************************************************************************/
function lg(sMsg) {
  let msg = {};
  msg.entry = sMsg;
  sendClientsMsg("lg", msg);
} // end of function lg()
