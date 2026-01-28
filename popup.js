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
