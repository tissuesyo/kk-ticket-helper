chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension is Installed');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.text === 'getTabId') {
    sendResponse({ tabId: sender.tab.id });
  }

  if (msg.text === 'getTicketWithCaptcha') {
    sendNotificaiotn('悲劇，有 Captcha 要處理', '有驗證碼要處理，快 八粒~', sender.tab.id, sender.tab.index);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('tab change event.tab...', tab);

  if (changeInfo.status === 'complete') {
    const { url, index } = tab;
    const seller = getSeller(url);
    const isNeedNotice = {
      kktix: isGetKktixTicket,
      ibon: isGetIbonTicket,
      tixcraft: isGetTixcraftTicket,
      NOT_SUPPORT: () => false,
    }[seller](url);

    if (isNeedNotice) {
      sendNotificaiotn('買到票囉', '進到選位畫面了，感人 八粒~', tabId, index);
    }
  }
});

function getSeller(url) {
  const sellerMapping = [
    { name: 'kktix', url: 'kktix.com' },
    { name: 'tixcraft', url: 'tixcraft.com' },
    { name: 'ibon', url: 'ibon.com' },
  ];
  const [seller] = sellerMapping.filter((sellerInfo) => url.includes(sellerInfo.url)).map((seller) => seller.name);
  return seller ?? 'NOT_SUPPORT';
}

function isGetKktixTicket(url) {
  // 根據要不要選位置 url 有兩種 pattern
  // pattern 1: https://kktix.com/events/2023rc4everlove/registrations/131835863-a7a0e4de1e70226f20f501ac90dd0794#/booking
  // pattern 2: https://kktix.com/events/9aeed6c1/registrations/131835748-a108a75cdc9bf579c6cbe3208f5200be#/
  const splitUrl = url.split('https://kktix.com/events/');
  if (splitUrl.length !== 2) {
    return false;
  }

  const withTicketUrlPattern = splitUrl[1].split('/');
  if (withTicketUrlPattern.length >= 3) {
    const regex = new RegExp(/\w-\w/);
    return regex.test(withTicketUrlPattern[2]);
  } else {
    return false;
  }
}

function isGetIbonTicket(url) { 
  // Example: https://orders.ibon.com.tw/application/UTK02/UTK0201_001.aspx?PERFORMANCE_ID=B058LE8P&GROUP_ID=12&PERFORMANCE_PRICE_AREA_ID=B058LNMI
  return url.startsWith('https://orders.ibon.com.tw/application/') && url.includes('PERFORMANCE_PRICE_AREA_ID');
}

function isGetTixcraftTicket(url) {
  // example: https://tixcraft.com/ticket/ticket/23_pennytp/14663/5/44
  return url.startsWith('https://tixcraft.com/ticket/ticket/');
}

function sendNotificaiotn(title, message, tabId, tabIndex) {
  const oneMinuteAsMs = 1 * 10 * 1000;
    const currentTimeAsMs = new Date().getTime();
    const notificationOptions = {
        type: 'basic',
        iconUrl: './img/logo_48x48.png',
        title,
        message: `第 ${tabIndex + 1} 分頁 - ${message}`,
        isClickable: true,
        priority: 2,
        eventTime: currentTimeAsMs + oneMinuteAsMs,
      };
      chrome.notifications.create(notificationOptions);

      chrome.notifications.onClicked.addListener((notificationId) => {
        chrome.tabs.update(tabId, { selected: true });
      });
}