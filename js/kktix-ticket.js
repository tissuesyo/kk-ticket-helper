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

function buyTicket(expectPrices, tickectNumber, tabId) {
  console.log(" === execute buy ticket ===");
  // Step 1: 檢查是不是還有票，有票的話會填入數量
  let isFindPosotion = checkTicketExisted(expectPrices, tickectNumber);
  // isFindPosotion || console.log('想買的區域都沒票囉! 趕快重新選擇了');
  if (!isFindPosotion) {
    console.log('想買的區域都沒票囉! 趕快重新選擇了');
    const remainingStorageKey = getRemainingStorageId(tabId);

    chrome.storage.local.get(remainingStorageKey, (resp) => {
      const { interval } = resp[remainingStorageKey];
      if (interval && !isFindPosotion) {
        console.log('Should trigge Refresh with interval', interval);
        setTimeout(() => window.location.reload(true), parseInt(interval, 10) * 1000);
      }
    });
  }
 
  // step 2: 同意服務條款
  const agreeChkbox = document.getElementById('person_agree_terms');
  if (agreeChkbox) {
    agreeChkbox.checked || agreeChkbox.click();
  }

  // step 3: 送出
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

function getTicketStorageId(tabId) {
  return `kktix-${tabId}`;
}

function getRefreshStorageId(tabId) {
  return `kktix-refresh-${tabId}`;
}

function getRemainingStorageId(tabId) {
  return `kktix-remaining-${tabId}`;
}

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
  const ticketStorageKey = getTicketStorageId(tabId);
  const remainingStorageKey = getRemainingStorageId(tabId);

  chrome.storage.local.get(remainingStorageKey, (resp) => {
    const { interval } = resp[remainingStorageKey];
    chrome.storage.local.get(ticketStorageKey, (resp) => {
      if (resp[ticketStorageKey] && interval) {
        triggerBuyTicket(tabId);
      }
    });
  });
}

function triggerBuyTicket(tabId) {
  const ticketStorageKey = getTicketStorageId(tabId);
  chrome.storage.local.get(ticketStorageKey, (resp) => {
    if (resp[ticketStorageKey]) {
      const { price, ticketNum } = resp[ticketStorageKey];
      const preferPrice = price.split(',');
      buyTicket(preferPrice, ticketNum, tabId);
    }
  });
}

function addStorageChangeListener(tabId) {
  chrome.storage.local.onChanged.addListener((changes) => {
    console.log(' === storage change === ', changes);
    const refreshStorageKey = getRefreshStorageId(tabId);
    const remainingStorageKey = getRemainingStorageId(tabId);

    if (changes[refreshStorageKey]) {
      triggerRefresh(refreshStorageKey);
    }

    if (changes[ticketStorageKey]) {
      triggerBuyTicket(tabId);
    }

    if (changes[remainingStorageKey]) {
      triggerIntervalRefresh(tabId);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  console.log(" !!! DOMContentLoaded !!! ");
  chrome.runtime.sendMessage({ text: 'getTabId' }, ({ tabId }) => {
    triggerRefresh(getRefreshStorageId(tabId));
    setTimeout(() => {
      triggerIntervalRefresh(tabId);
    });
    addStorageChangeListener(tabId);
  });
});

// TODO: captcha timing
window.addEventListener('load', () => {
  if (checkIsCaptchaExisted()) {
    submit();
  }
});

onElementLoaded("span[ng-if='purchasableAndSelectable']")
  .then(() => {
    console.log('onElementLoaded.....');
    chrome.runtime.sendMessage({ text: 'getTabId' }, ({ tabId }) => {
      triggerBuyTicket(tabId);
    });
  })
  .catch((err) => console.error('some error', err));


// TODO: 驗證碼, 自動答題 自動更新
/// document.getElementsByName('captcha_answer')[0].value = 'OSN'
