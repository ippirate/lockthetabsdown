let activeTabId = null;
let activeStartTime = null;
chrome.tabs.onCreated.addListener((tab) => {
  chrome.storage.local.get(["lockMode", "allowedTabs"], (data) => {
    if (!data.lockMode) return;

    if (!data.allowedTabs || !data.allowedTabs.includes(tab.id)) {
      chrome.tabs.remove(tab.id);
    }
  });
});

chrome.tabs.onActivated.addListener((tab) => {
  chrome.storage.local.get("lockMode", (data) => {
    if (!data.lockMode) return;

      activeTabId = tab.id;
     activeStartTime = Date.now();
      
    });
  });

function getActiveTabTime(){
  if (!activeStartTime) return;
  return Date.now() - activeStartTime;
}

chrome.windows.onCreated.addListener((window) => {
  chrome.storage.local.get("lockMode", (data) => {
    if (data.lockMode) {
      chrome.windows.remove(window.id);
    }
  });
});

