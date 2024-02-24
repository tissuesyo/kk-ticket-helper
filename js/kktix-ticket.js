const seller = 'kktix';

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

function checkTicketExisted(expectPrices, tickectNumber) {
  const twdTransformer = new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const searchPrices = expectPrices.map((price) => twdTransformer.format(price));

  // step 1: 尋找價格
  const allPriceEles = Array.from(document.querySelectorAll("span[class='ticket-price']"));
  let isFindPosotion;
  searchPrices.every((price) => {
    if (isFindPosotion) {
      return false;
    }

    let [matchPriceEle] = allPriceEles.filter((span) => span.textContent.includes(price));
    // step 2: 輸入需求數量
    const numberEle = matchPriceEle?.parentElement
      .querySelector("span[ng-if='purchasableAndSelectable']")
      ?.querySelector("input[type='text']");
      
    if (numberEle) {
      numberEle.value = tickectNumber;
      numberEle.dispatchEvent(new Event('change'));
      isFindPosotion = true;
      console.log(`${price} - OMG 有票!!!`);
    } else {
      console.log(`${price} - 區域沒票了  殘念 T_T`);
    }
    return true;
  });

  return isFindPosotion;
}

function buyTicket(ticketInfo, tabId) {
  console.log(" === execute buy ticket ===", ticketInfo);
  const { price, ticketNum, captchaAnswer } = ticketInfo;
  const expectPrices = price.split(',');

  // Step 1: 檢查是不是還有票，有票的話會填入數量
  let isFindPosotion = checkTicketExisted(expectPrices, ticketNum);
  if (!isFindPosotion) {
    console.log('想買的區域都沒票囉! 趕快重新選擇了');
    const remainingStorageKey = getRemainingStorageId(seller, tabId);

    chrome.storage.local.get(remainingStorageKey, (resp) => {
      const interval = resp[remainingStorageKey]?.interval;
      if (interval && !isFindPosotion) {
        setTimeout(() => window.location.reload(true), parseInt(interval, 10) * 1000);
      }
    });
  }
  // step 2: 如果有問問題的話，可帶入答案
  const captchaInput = document.querySelectorAll("input[name='captcha_answer']")[0];
  if (captchaInput) {
    captchaInput.value = captchaAnswer;
    captchaInput.dispatchEvent(new Event('change'));
  }
 
  // step 3: 同意服務條款
  const agreeChkbox = document.getElementById('person_agree_terms');
  if (agreeChkbox) {
    agreeChkbox.checked || agreeChkbox.click();
  }

  // step 4: 送出
  submit();
  // TODO: Captcha timing
  if (checkIsCaptchaExisted()) {
    const intervalid = setInterval(() => submit(), 500);
    setTimeout(() => clearInterval(intervalid), 5000);
  }
}

function submit() {
  const buttonEles = Array.from(document.getElementsByClassName('btn-primary'));
  let [next] = buttonEles.filter((btn) => btn.textContent.includes('下一步'));
  next?.click();
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

function checkIsCaptchaExisted() {
  const captchaDiv = document.getElementsByClassName('event-captcha-info');
  return captchaDiv && captchaDiv[0] && captchaDiv[0].childElementCount > 0;
}

// function getTicketStorageId(tabId) {
//   return `kktix-${tabId}`;
// }

// function getRefreshStorageId(tabId) {
//   return `kktix-refresh-${tabId}`;
// }

// function getRemainingStorageId(tabId) {
//   return `kktix-remaining-${tabId}`;
// }

function triggerRefresh(refeshStorageKey) {
  chrome.storage.local.get(refeshStorageKey, (resp) => {
    if (resp[refeshStorageKey]) {
      const { hour, minute, second } = resp[refeshStorageKey];
      refreshPage(hour, minute, second);
      console.log('triggerRefresh...');
    }
  });
}

// TODO:
function triggerIntervalRefresh(tabId) {
  console.log('do triggerIntervalRefresh...');
  const remainingStorageKey = getRemainingStorageId(seller, tabId);
  console.log('remainingStorageKey', remainingStorageKey);
  getAndExecuteFromLocalStorage(remainingStorageKey, (itervalData) => {
    console.log('getAndExecuteFromLocalStorage');
    if (itervalData) {
      const { interval } = itervalData;
      const ticketStorageKey = getTicketStorageId(seller, tabId);
      chrome.storage.local.get(ticketStorageKey, (resp) => {
        if (resp[ticketStorageKey] && interval) {
          triggerBuyTicket(tabId);
        }
      });
    }
  }, tabId);
}

function triggerBuyTicket(tabId) {
  const ticketStorageKey = getTicketStorageId(seller, tabId);
  chrome.storage.local.get(ticketStorageKey, (resp) => {
    if (resp[ticketStorageKey]) {
      buyTicket(resp[ticketStorageKey], tabId);
    }
  });
}

function addStorageChangeListener(tabId) {
  chrome.storage.local.onChanged.addListener((changes) => {
    console.log(' === storage change === ', changes);
    if (changes[getRefreshStorageId(seller, tabId)]) {
      triggerRefresh(refreshStorageKey);
    }

    if (changes[getTicketStorageId(seller, tabId)]) {
      triggerBuyTicket(tabId);
    }

    if (changes[getRemainingStorageId(seller, tabId)]) {
      triggerIntervalRefresh(tabId);
    }
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log(" !!! DOMContentLoaded !!! ");

    getTabIdAndExecute((tabId) => {
      console.log(" Page Load Tab ID", tabId);
      triggerRefresh(getRefreshStorageId(seller, tabId));
      setTimeout(() => triggerIntervalRefresh(tabId));
      addStorageChangeListener(tabId);
    });
  } catch (error) {
    console.error('Error during DOMContentLoaded:', error);
  }
});

// TODO: captcha timing
window.addEventListener('load', () => {
  if (checkIsCaptchaExisted()) {
    submit();
  }
});

// TODO: 這段需要嗎? 忘記一開始為什麼要搭配這個了???
onElementLoaded("span[ng-if='purchasableAndSelectable']")
  .then(() => {
    console.log('onElementLoaded.....');
    getTabIdAndExecute((tabId) => triggerBuyTicket(tabId));
  })
  .catch((err) => console.error('some error', err));


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
  
async function getTabIdAndExecute(callback) {
  try {
    const tabId = await getTabId();
    callback(tabId);
  } catch (error) {
    console.error('Error getting tabId:', error);
  }
}

async function getFromLocalStorage(key) {
  console.log('getFromLocalStorage...');
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      console.log('chrome.storage.local result...', result);
      resolve(result[key] || null);
    });
  });
}

async function getAndExecuteFromLocalStorage(key, callback, tabId) {
  try {
    const data = await getFromLocalStorage(key);
    console.log('getAndExecuteFromLocalStorage data', data);
    if (data) {
      callback(data, tabId);
    }
  } catch (error) {
    console.error(`Error getting data for key ${key}:`, error);
  }
}