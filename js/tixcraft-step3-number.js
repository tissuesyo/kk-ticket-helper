function buyTicket(ticketNum) {
  console.log(' === execute buy ticket === ');
  document.querySelectorAll("select[id*='TicketForm_ticketPrice']")[0].value = ticketNum;
  document.getElementById('TicketForm_agree').checked = true;
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

function triggerBuyTicket(ticketStorageKey) {
  chrome.storage.local.get(ticketStorageKey, (resp) => {
    if (resp[ticketStorageKey]) {
      const { ticketNum } = resp[ticketStorageKey];
      buyTicket(ticketNum);
    }
  });
}

function addStorageChangeListener(tabId) {
  chrome.storage.local.onChanged.addListener((changes) => {
    console.log(' === storage change === ', changes);
    const ticketStorageKey = getTicketStorageId(tabId);
    if (changes[ticketStorageKey]) {
      triggerBuyTicket(ticketStorageKey);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  console.log(' !!! DOMContentLoaded !!! ');
  chrome.runtime.sendMessage({ text: 'getTabId' }, ({ tabId }) => {
    addStorageChangeListener(tabId);
    triggerBuyTicket(getTicketStorageId(tabId));
  });
});

onElementLoaded("table[id='ticketPriceList']")
  .then(() => {
    chrome.runtime.sendMessage({ text: 'getTabId' }, ({ tabId }) => {
      triggerBuyTicket(getTicketStorageId(tabId));
    });
  })
  .catch((err) => console.error('some error', err));
