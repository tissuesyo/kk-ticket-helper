const seller = 'kktix';

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
  console.log(' === execute buy ticket ===', ticketInfo);
  const { price, ticketNum, captchaAnswer } = ticketInfo;
  const expectPrices = price.split(',');

  // Step 1: 檢查是不是還有票，有票的話會填入數量
  let isFindPosotion = checkTicketExisted(expectPrices, ticketNum);
  if (!isFindPosotion) {
    console.log('想買的區域都沒票囉! 趕快重新選擇了');
    const remainingStorageKey = getRemainingStorageId(seller, tabId);
    const registerRefreshAction = (data) => {
      if (data) {
        setTimeout(() => window.location.reload(true), parseInt(data.interval, 10) * 1000);
      }
    };
    getAndExecuteFromLocalStorage(remainingStorageKey, registerRefreshAction, tabId);
  }

  // step 2: 如果有問問題的話，可帶入答案
  const captchaInput = document.querySelectorAll("input[name='captcha_answer']")[0];
  if (captchaInput) {
    captchaInput.value = captchaAnswer;
    captchaInput.dispatchEvent(new Event('change'));
    // TODO: Send notification for captcha
    if (!captchaAnswer) {
      sendCaptchaNotice();
    }
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
    const intervalid = setInterval(() => submit(), 200);
    setTimeout(() => clearInterval(intervalid), 10000);
  }
}

function submit() {
  const buttonEles = Array.from(document.getElementsByClassName('btn-primary'));
  let [place] = buttonEles.filter((btn) => btn.textContent.includes('電腦配位'));
  place?.click();
  
  let [next] = buttonEles.filter((btn) => btn.textContent.includes('下一步'));
  next?.click();
}

function checkIsCaptchaExisted() {
  const captchaDiv = document.getElementsByClassName('event-captcha-info');
  return captchaDiv && captchaDiv[0] && captchaDiv[0].childElementCount > 0;
}

function triggerRefresh(tabId) {
  const refeshStorageKey = getRefreshStorageId(seller, tabId);
  const refreshAction = ({ hour, minute, second }) => refreshPage(hour, minute, second);
  getAndExecuteFromLocalStorage(refeshStorageKey, refreshAction);
}

function triggerIntervalRefresh(tabId) {
  const remainingStorageKey = getRemainingStorageId(seller, tabId);
  const checkBuyAction = (itervalData) => {
    console.log(' triggerIntervalRefresh - itervalData...', itervalData);
    if (itervalData?.interval) {
      triggerBuyTicket(tabId);
    }
  };
  getAndExecuteFromLocalStorage(remainingStorageKey, checkBuyAction, tabId);
}

function triggerBuyTicket(tabId) {
  const ticketStorageKey = getTicketStorageId(seller, tabId);
  const buyTicketAction = (ticketInfo) => buyTicket(ticketInfo, tabId);
  getAndExecuteFromLocalStorage(ticketStorageKey, buyTicketAction, tabId);
}

function triggerAutoNext(tabId) {
  const ticketStorageKey = getAutoNextStorageId(seller, tabId);
  
  getAndExecuteFromLocalStorage(ticketStorageKey, (isAutoNext)=> {
    if(isAutoNext) {
      setInterval(() => submit(), 300);
    }
  }, tabId);
}

function addStorageChangeListener(tabId) {
  chrome.storage.local.onChanged.addListener((changes) => {
    console.log(' === storage change === ', changes);
    if (changes[getRefreshStorageId(seller, tabId)]) {
      triggerRefresh(tabId);
    }

    if (changes[getTicketStorageId(seller, tabId)]) {
      triggerBuyTicket(tabId);
    }

    if (changes[getRemainingStorageId(seller, tabId)]) {
      triggerIntervalRefresh(tabId);
    }

    if (changes[getAutoNextStorageId(seller, tabId)]) {
      triggerAutoNext(tabId);
    }
  });
}

function injectScript() {
  console.log('injectScript successfully to replace window alert');
  sessionStorage.setItem('replaceAlert', 'window.alert = (message) => console.log("KKTIX message:", message); ');
  const url = chrome.runtime.getURL('js/inject.js');
  const script = document.createElement("script");
  script.src = url;
  document.head.appendChild(script);
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log(' !!! DOMContentLoaded !!! ');
    getTabIdAndExecute((tabId) => {
      console.log(' Page Load Tab ID', tabId);
      // triggerBuyTicket(tabId);
      injectScript();
      triggerRefresh(tabId);
      setTimeout(() => triggerIntervalRefresh(tabId));
      addStorageChangeListener(tabId);
      triggerAutoNext(tabId);
    });
  } catch (error) {
    console.error('Error during DOMContentLoaded:', error);
  }
});

// TODO: 這段需要嗎? 忘記一開始為什麼要搭配這個了???
onElementLoaded("span[ng-if='purchasableAndSelectable']")
  .then(() => {
    console.log('onElementLoaded.....');
    getTabIdAndExecute((tabId) => triggerBuyTicket(tabId));
  })
  .catch((err) => console.error('some error', err));

onElementLoaded('iframe[title="reCAPTCHA 驗證問題將在兩分鐘後失效"]')
.then(() => {
  console.log('reCAPTCHA iframe occur');
  setTimeout(() => subscribeCaptcha(), 1000);
})
.catch((err) => console.error('some error', err));

function subscribeCaptcha() {
  // 找到包含 Captcha iframe 的父層 div
  const parentDivsWithCaptcha = document.querySelectorAll(
    'div:has(iframe[title="reCAPTCHA 驗證問題將在兩分鐘後失效"])'
  );
  console.log(' --- subscribeCaptcha --- ', parentDivsWithCaptcha);
  const observer = new MutationObserver((mutationsList) => {
    console.log(' --- parentDivsWithCaptcha MutationObserver--- ', mutationsList);
    const hasCaptcha = mutationsList.some((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        return mutation.target.style.visibility === 'visible';
      }
      return false;
    });

    if (hasCaptcha) {
      console.log('出現圖形驗證的 captcha');
      submit();
      sendCaptchaNotice();
    }
  });

  // 開始觀察每個包含 iframe 的父層 div
  parentDivsWithCaptcha.forEach((parentDiv) => {
    observer.observe(parentDiv, { attributes: true });
  });
}