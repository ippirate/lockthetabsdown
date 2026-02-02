document.getElementById("lock").addEventListener("click", () => {
  chrome.tabs.query({}, (tabs) => {
    const allowedTabs = tabs.map(tab => tab.id);

    chrome.storage.local.set({
      lockMode: true,
      allowedTabs: allowedTabs
    });
  });
});



document.getElementById("unlock").addEventListener("click", () => {
  chrome.storage.local.set({
    lockMode: false,
    allowedTabs: []
  });
});

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor (seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function updateTime(){
  // get live session time + origin
  chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB_TIME" }, (active) => {
    const origin = active && active.origin ? active.origin : null;
    const activeTime = (active && active.time) || 0;

    // get stored totals
    chrome.runtime.sendMessage({ type: 'getTimes' }, (res) => {
      const times = (res && res.times) || {};
      const base = origin ? (times[origin] || 0) : 0;
      const total = base + activeTime;
      const originLabel = origin || 'No active site';
      document.getElementById("time").textContent = `${originLabel} — ${formatTime(total)} (session ${formatTime(activeTime)})`;
    });
  });
}


setInterval(updateTime, 1000);
updateTime();

function setStatus(isOn){
  const dot = document.getElementById('status-indicator');
  const text = document.getElementById('status-text');
  if (isOn){
    dot.style.background = '#2ecc71';
    text.textContent = 'ON';
  } else {
    dot.style.background = '#e74c3c';
    text.textContent = 'OFF';
  }
}

// initialize status from storage
chrome.storage.local.get('lockMode', (data) => {
  setStatus(!!data.lockMode);
});

// listen for live changes (e.g., service worker toggles lockMode)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.lockMode) {
    setStatus(!!changes.lockMode.newValue);
  }
});
