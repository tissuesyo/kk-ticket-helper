function refreshPage(hours, minutes, seconds) {
  console.log(' === register refresh timer ===');
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

function buyTicket(preferPositions) {
  console.log(' === execute buy ticket === ');
  // 所有還有剩餘位置的 heperlink
  const allPositions = Array.from(document.querySelectorAll("ul[class='area-list'] a"));
  const [matchPosition] = allPositions.filter(
    (ele) => preferPositions.filter((prefer) => ele.innerText.includes(prefer)).length > 0
  );
  console.log('matchPosition', matchPosition);
  matchPosition?.click();
  setTimeout(() => matchPosition?.click(), 300);
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
  return `tixcraft-${tabId}`;
}

function getRefreshStorageId(tabId) {
  return `tixcraft-refresh-${tabId}`;
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
      const { position } = resp[ticketStorageKey];
      const preferPositions = position.split(',');
      buyTicket(preferPositions);
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
  console.log(' !!! DOMContentLoaded !!! ');
  chrome.runtime.sendMessage({ text: 'getTabId' }, ({ tabId }) => {
    triggerRefresh(getRefreshStorageId(tabId));
    addStorageChangeListener(tabId);
    triggerBuyTicket(getTicketStorageId(tabId));
  });
});

onElementLoaded("div[id='selectseat']")
  .then(() => {
    chrome.runtime.sendMessage({ text: 'getTabId' }, ({ tabId }) => {
      triggerBuyTicket(getTicketStorageId(tabId));
    });
  })
  .catch((err) => console.error('some error', err));
