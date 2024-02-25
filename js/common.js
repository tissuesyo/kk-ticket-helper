function getTicketStorageId(seller, tabId) {
  return `${seller}-${tabId}`;
}

function getRefreshStorageId(seller, tabId) {
  return `${seller}-refresh-${tabId}`;
}

function getRemainingStorageId(seller, tabId) {
  return `${seller}-remaining-${tabId}`;
}

async function getTabId() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ text: 'getTabId' }, (result) => {
      if (result.tabId) {
        resolve(result.tabId);
      } else {
        reject(new Error('Unable to get tabId.'));
      }
    });
  });
}

function sendCaptchaNotice() {
  chrome.runtime.sendMessage({ text: 'getTicketWithCaptcha' });
}
  
async function getTabIdAndExecute(callback) {
  try {
    const tabId = await getTabId();
    callback(tabId);
  } catch (error) {
    console.error('Error getting tabId:', error);
  }
}

async function getFromLocalStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] || null);
    });
  });
}

async function getAndExecuteFromLocalStorage(key, callback, tabId) {
  try {
    const data = await getFromLocalStorage(key);
    if (data) {
      callback(data, tabId);
    }
  } catch (error) {
    console.error(`Error getting data for key ${key}:`, error);
  }
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