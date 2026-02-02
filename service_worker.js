let activeTabId = null;
let activeStartTime = null;
let activeTabOrigin = null;
// track tabs removed by the extension so we can distinguish manual closes
const removedByExtension = new Set();

chrome.tabs.onCreated.addListener((tab) => {
  chrome.storage.local.get(["lockMode", "allowedTabs"], (data) => {
    if (!data.lockMode) return;

    if (!data.allowedTabs || !data.allowedTabs.includes(tab.id)) {
      removedByExtension.add(tab.id);
      chrome.tabs.remove(tab.id);
    }
  });
});

function getOrigin(url){
  try{
    return new URL(url).origin;
  }catch(e){
    return null;
  }
}

function recordActiveTime(callback){
  if (!activeTabId || !activeStartTime || !activeTabOrigin) {
    activeTabId = null;
    activeStartTime = null;
    activeTabOrigin = null;
    if (callback) callback();
    return;
  }

  const delta = Date.now() - activeStartTime;
  chrome.storage.local.get('times', (data) => {
    const times = data.times || {};
    times[activeTabOrigin] = (times[activeTabOrigin] || 0) + delta;
    chrome.storage.local.set({ times }, () => {
      activeTabId = null;
      activeStartTime = null;
      activeTabOrigin = null;
      if (callback) callback();
    });
  });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.storage.local.get("lockMode", (data) => {
    if (!data.lockMode) return;

    // If there was a previously active tab, record its time first
    if (activeTabId && activeStartTime && activeTabOrigin) {
      recordActiveTime(() => {
        // now start tracking the newly activated tab
        chrome.tabs.get(activeInfo.tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) return;
          activeTabId = activeInfo.tabId;
          activeTabOrigin = getOrigin(tab.url);
          activeStartTime = Date.now();
        });
      });
    } else {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        activeTabId = activeInfo.tabId;
        activeTabOrigin = getOrigin(tab.url);
        activeStartTime = Date.now();
      });
    }
  });
});

function getActiveTabTime(){
  if (!activeStartTime) return;
  return Date.now() - activeStartTime;
}

// When a tab is removed, if it was active record its time
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const removedProgrammatically = removedByExtension.has(tabId);
  if (removedProgrammatically) removedByExtension.delete(tabId);

  if (tabId === activeTabId) {
    // if the user manually closed the active tab (not window closing and not extension),
    // turn off lockMode so the extension goes off
    if (!removedProgrammatically && !removeInfo.isWindowClosing) {
      recordActiveTime(() => {
        chrome.storage.local.set({ lockMode: false });
      });
    } else {
      // either closed by extension or window closed; just record time
      recordActiveTime();
    }
  }
});

// When the active tab navigates to a new URL, attribute elapsed time
// to the previous origin and start counting for the new origin
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId !== activeTabId) return;
  if (!changeInfo.url) return; // not a navigation event

  // record time for previous origin, then start new timer for new origin
  const previousOrigin = activeTabOrigin;
  const delta = Date.now() - activeStartTime;
  if (previousOrigin && delta > 0) {
    chrome.storage.local.get('times', (data) => {
      const times = data.times || {};
      times[previousOrigin] = (times[previousOrigin] || 0) + delta;
      chrome.storage.local.set({ times }, () => {
        activeTabOrigin = getOrigin(changeInfo.url) || getOrigin(tab.url);
        activeStartTime = Date.now();
      });
    });
  } else {
    activeTabOrigin = getOrigin(changeInfo.url) || getOrigin(tab.url);
    activeStartTime = Date.now();
  }
});

// Allow other extension parts (popup) to request recorded times
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'getTimes') {
    chrome.storage.local.get('times', (data) => {
      sendResponse({ times: data.times || {} });
    });
    return true; // keep channel open for async response
  }

  if (message.type === 'GET_ACTIVE_TAB_TIME') {
    const elapsed = activeStartTime ? (Date.now() - activeStartTime) : 0;
    sendResponse({ time: elapsed, origin: activeTabOrigin || null });
    return false;
  }
});



