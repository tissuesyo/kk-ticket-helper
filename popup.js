// 票券資訊 Field Element
const priceEle = document.getElementById('price');
const ticketNumEle = document.getElementById('ticketNum');
const showTimeEle = document.getElementById('showTime');
const positionEle = document.getElementById('position');
const captchaAnswerEle = document.getElementById('captchaAnswer');

// 票券資訊 Div container
const dateContainer = document.getElementById('dateContainer');
const positionContainer = document.getElementById('positionContainer');
const priceContainer = document.getElementById('priceContainer');
const captchaAnswerContainer = document.getElementById('captchaContainer');

// 時間資訊 Field Element
const hourEle = document.getElementById('hour');
const minuteEle = document.getElementById('minute');
const secondEle = document.getElementById('second');

// 搶清票 Field Element
const intervalEle = document.getElementById('intervalInput');

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveTicketBtn').addEventListener('click', saveTicketConfig);
document.getElementById('saveRefreshBtn').addEventListener('click', saveRefreshConfig);
document.getElementById('clearTabStorageBtn').addEventListener('click', clearTabStorage);
document.getElementById('clearAllStorageBtn').addEventListener('click', clearAllStorage);
document.getElementById('refreshTicketBtn').addEventListener('click', saveRemainingConfig);
document.getElementById('stopRefreshTicketBtn').addEventListener('click', stopChecking);

function getTicketStorageId(seller, tabId) {
  return `${seller}-${tabId}`;
}

function getRefreshStorageId(seller, tabId) {
  return `${seller}-refresh-${tabId}`;
}

function getRemainingStorageId(seller, tabId) {
  return `${seller}-remaining-${tabId}`;
}

function getAutoNextStorageId(seller, tabId) {
  return `${seller}-autoNext-${tabId}`;
}

function saveTicketConfig() {
  const requiredEles = [priceEle, ticketNumEle, showTimeEle, positionEle].filter((ele) => ele.required);

  if (!isFieldValid(requiredEles)) {
    alert('請填寫票券資訊');
    document.getElementById('ticketForm').classList.add('was-validated');
    return;
  }

  getTabAndExecute(({ id, url }) => {
    const seller = getSeller(url);
    const storageKey = getTicketStorageId(seller, id);
    const price = priceEle.value;
    const showTime = showTimeEle.value;
    const position = positionEle.value;
    const ticketNum = ticketNumEle.options[ticketNumEle.selectedIndex].value;
    const captchaAnswer = captchaAnswerEle.value;

    chrome.storage.local.set({ [storageKey]: { price, ticketNum, showTime, position, captchaAnswer } }, () =>
      alert('儲存成功 - 票券設定')
    );
  });
}

function saveRefreshConfig() {
  if (!isFieldValid([hourEle, minuteEle, secondEle])) {
    alert('請填寫時間資訊');
    document.getElementById('refreshForm').classList.add('was-validated');
    return;
  }

  getTabInfoAndExecute(({ id, url }) => {
    const seller = getSeller(url);
    const storageKey = getRefreshStorageId(seller, id);
    chrome.storage.local.set(
      { [storageKey]: { hour: hourEle.value, minute: minuteEle.value, second: secondEle.value } },
      () => alert('儲存成功 - 時間設定')
    );
    console.log('refresh setting', chrome.storage.local.get(storageKey));
  });
}

function saveRemainingConfig() {
  if (!isFieldValid([intervalEle])) {
    alert('請填寫間隔的時間');
    document.getElementById('intervalForm').classList.add('was-validated');
    return;
  }

  getTabInfoAndExecute(({ id, url }) => {
    console.group('save remaining ticket Config...');
    const seller = getSeller(url);
    const storageKey = getRemainingStorageId(seller, id);
    chrome.storage.local.set(
      { [storageKey]: { interval: intervalEle.value } },
      () => alert('儲存成功 - 間隔時間設定')
    );
    console.groupEnd();
  });
}

function clearTabStorage() {
  getTabInfoAndExecute(({ id, url }) => {
    console.group('save refresh Config...');
    const seller = getSeller(url);
    const storageKeys = [getRefreshStorageId(seller, id), getTicketStorageId(seller, id)];
    chrome.storage.local.remove(storageKeys, () => alert('這分頁的票券 & 時間設定已清除'));
    console.groupEnd();
  });
}

function clearAllStorage() {
  chrome.storage.local.clear(() => alert('所有分頁的票券 & 時間設定已清除'));
}

function restoreOptions() {
  getTabInfoAndExecute(async ({ id, url }) => {
    console.group('restoreOptions...');
    const seller = getSeller(url);
    document.getElementById('seller').value = seller;
   
    // step 1: initial seller
    if (seller === 'kktix') {
      hideUnnecessaryField([dateContainer, positionContainer], [showTimeEle, positionEle]);
    } else {
      hideUnnecessaryField([priceContainer], [priceEle, positionEle]);
    }

    // step 2: restore ticket information
    await Promise.all([
      restoreData(getTicketStorageId(seller, id), [priceEle, ticketNumEle, showTimeEle, positionEle, captchaAnswerEle], restoreTicketInfo),
      restoreData(getRefreshStorageId(seller, id), [hourEle, minuteEle, secondEle], restoreRefreshInfo),
      restoreData(getRemainingStorageId(seller, id), [intervalEle], restoreIntervalInfo)
    ]);

    console.groupEnd();
  });
}

function hideUnnecessaryField(fieldContainers, fields) {
  fieldContainers.forEach((container) => (container.style.display = 'none'));
  fields.forEach((field) => (field.required = false));
}

function getSeller(url) {
  const sellers = ['tixcraft', 'kktix', 'ibon'];
  const [source] = sellers.filter((seller) => url.includes(seller));
  return source ?? 'kktix';
}

function stopChecking() {
  intervalEle.value = 0;
  intervalEle.dispatchEvent(new Event('change'));
  saveRemainingConfig();
}

// 從 storage 裡恢復 ticket 資訊
function restoreTicketInfo(data, elements) {
  const { price, ticketNum, showTime, position, captchaAnswer } = data;
  elements[0].value = price;
  elements[1].selectedIndex = ticketNum - 1;
  elements[2].value = showTime;
  elements[3].value = position;
  elements[4].value = captchaAnswer;
}

// 從 storage 裡恢復 定時 refresh 資訊
function restoreRefreshInfo(data, elements) {
  const { hour, minute, second } = data;
  elements[0].value = hour;
  elements[1].value = minute;
  elements[2].value = second;
}

// 從 storage 裡恢復 interval refresh 資訊
function restoreIntervalInfo(data, elements) {
  const { interval } = data;
  elements[0].value = interval;
}

async function getDataFromLocalStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] || null);
    });
  });
}

async function restoreData(key, elements, callback) {
  const data = await getDataFromLocalStorage(key);
  if (data) {
    callback(data, elements);
  }
}

async function getTabAndExecute(callback) {
  const currTab = await getActiveTab();
  if (currTab) {
    callback(currTab);
  }
}

async function getTabInfoAndExecute(callback) {
  const tabInfo = await getTabInfo();
  if (tabInfo) {
    callback(tabInfo);
  }
}

async function getTabInfo() {
  const currTab = await getActiveTab();
  return currTab ? { id: currTab.id, url: currTab.url } : null;
}

async function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

function isFieldValid(elements) {
  return elements.every((ele) => ele && ele.value != null && ele.value.length > 0);
}

function triggerNext() {
  console.log('click triggerNext...');
  getTabInfoAndExecute(({ id, url }) => {
    const seller = getSeller(url);
    const storageKey = getAutoNextStorageId(seller, id);
    chrome.storage.local.set(
      { [storageKey]: true },
      () => console.log('儲存成功 - auto next 設定')
    );
  });
}