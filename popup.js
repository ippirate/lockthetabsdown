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
  chrome.runtime.sendMessage(
    { type: "GET_ACTIVE_TAB_TIME"},
    (response) => {
      if (!response) return;
      document.getElementById("time").textContent = 
      formatTime(response.time)
    }
  )
}


setInterval(updateTime, 1000);
updateTime();
