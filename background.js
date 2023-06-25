chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension is Installed');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.text === 'getTabId') {
    sendResponse({ tabId: sender.tab.id });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('tab change event.tab...', tab);
  if (changeInfo.status === 'complete') {
    // 根據要不要選位置 url 有兩種 pattern
    // pattern 1: https://kktix.com/events/2023rc4everlove/registrations/131835863-a7a0e4de1e70226f20f501ac90dd0794#/booking
    // pattern 2: https://kktix.com/events/9aeed6c1/registrations/131835748-a108a75cdc9bf579c6cbe3208f5200be#/
    const { url, index } = tab;
    const splitUrl = url.split('https://kktix.com/events/');
    if (splitUrl.length === 2) {
      const withTicketUrlPattern = splitUrl[1].split('/');
      if (withTicketUrlPattern.length >= 3) {
        const regex = new RegExp(/\w-\w/);
        if (regex.test(withTicketUrlPattern[2])) {
          const notificationOptions = {
            type: 'basic',
            iconUrl: './img/logo_48x48.png',
            title: '買到票囉',
            message: `第 ${index + 1} 分頁有進入到選位畫面，快快 八粒~`,
            isClickable: true,
          };
          chrome.notifications.create(notificationOptions);

          chrome.notifications.onClicked.addListener((notificationId) => {
            chrome.tabs.update(tabId, {selected: true});
          });
        }
      }
    }
  }
});
