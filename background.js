chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension is Installed');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.text === 'getTabId') {
    sendResponse({ tabId: sender.tab.id });
  }
});
