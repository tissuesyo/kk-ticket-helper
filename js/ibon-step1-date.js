function refreshPage(hours, minutes, seconds) {
  console.log(" === register refresh timer ===");
  const now = new Date();
  const expectTime = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentSec = now.getSeconds();

  if (
    currentHour > hours ||
    (currentHour == hours && currentMin > minutes) ||
    (currentHour == hours && currentMin == minutes && currentSec >= seconds)
  ) {
    expectTime.setDate(now.getDate() + 1);
  }
  expectTime.setHours(hours);
  expectTime.setMinutes(minutes);
  expectTime.setSeconds(seconds);

  const timeout = expectTime.getTime() - now.getTime();
  
  setTimeout(() => window.location.reload(true), timeout);
}

function buyTicket(showTime) {
  const allDateEles = Array.from(document.querySelectorAll("p[class*='date']"));
  const [matchDateEle] = allDateEles.filter((ele) => ele.innerText.includes(showTime));
  console.log('matchDateEle', matchDateEle);
  const [buyBtn] = matchDateEle?.parentElement?.querySelectorAll("button");
  buyBtn?.click();
  // TODO:
  // setTimeout(() => buyBtn?.click(), 300);
}

function onElementLoaded(elementToObserve, parentStaticElement) {
  const promise = new Promise((resolve, reject) => {
    try {
      if (document.querySelector(elementToObserve)) {
        resolve(true);
        return;
      }
      const parentElement = parentStaticElement ? document.querySelector(parentStaticElement) : document;
      const observer = new MutationObserver((mutationList, obsrvr) => {
        const divToCheck = document.querySelector(elementToObserve);
        if (divToCheck) {
          obsrvr.disconnect(); // stop observing
          resolve(true);
        }
      });

      // start observing for dynamic div
      observer.observe(parentElement, {
        childList: true,
        subtree: true,
      });
    } catch (e) {
      console.error(e);
      reject(Error('some issue... promise rejected'));
    }
  });
  return promise;
}

function getTicketStorageId(tabId) {
  return `ibon-${tabId}`;
}

function getRefreshStorageId(tabId) {
  return `ibon-refresh-${tabId}`;
}

function triggerRefresh(refeshStorageKey) {
  chrome.storage.local.get(refeshStorageKey, (resp) => {
    if (resp[refeshStorageKey]) {
      const { hour, minute, second } = resp[refeshStorageKey];
      refreshPage(hour, minute, second);
    }
  });
}

function triggerBuyTicket(ticketStorageKey) {
  chrome.storage.local.get(ticketStorageKey, (resp) => {
    if (resp[ticketStorageKey]) {
      console.log("find storage", resp[ticketStorageKey]);
      const { showTime } = resp[ticketStorageKey];
      buyTicket(showTime);
    }
  });
}

function addStorageChangeListener(tabId) {
  chrome.storage.local.onChanged.addListener((changes) => {
    console.log(' === storage change === ', changes);
    const refreshStorageKey = getRefreshStorageId(tabId);
    const ticketStorageKey = getTicketStorageId(tabId);

    if (changes[refreshStorageKey]) {
      triggerRefresh(refreshStorageKey);
    }

    if (changes[ticketStorageKey]) {
      triggerBuyTicket(ticketStorageKey);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  console.log(" !!! Step 1: DOMContentLoaded !!! ");
  chrome.runtime.sendMessage({ text: 'getTabId' }, ({ tabId }) => {
    triggerRefresh(getRefreshStorageId(tabId));
    addStorageChangeListener(tabId);
    // triggerBuyTicket(getTicketStorageId(tabId));
  });
});

onElementLoaded("p[class='flex-fill date']")
  .then(() => {
    console.group('concert list occur');
    chrome.runtime.sendMessage({ text: 'getTabId' }, ({ tabId }) => {
      triggerBuyTicket(getTicketStorageId(tabId));
    });
    console.groupEnd();
  })
  .catch((err) => console.error('some error', err));