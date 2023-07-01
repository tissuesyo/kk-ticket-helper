// 票券資訊 Field Element
const priceEle = document.getElementById('price');
const ticketNumEle = document.getElementById('ticketNum');
const showTimeEle = document.getElementById('showTime');
const positionEle = document.getElementById('position');

// 票券資訊 Div container
const dateContainer = document.getElementById('dateContainer');
const positionContainer = document.getElementById('positionContainer');
const priceContainer = document.getElementById('priceContainer');

// 時間資訊 Field Element
const hourEle = document.getElementById('hour');
const minuteEle = document.getElementById('minute');
const secondEle = document.getElementById('second');

function getTicketStorageId(seller, tabId) {
  return `${seller}-${tabId}`;
}

function getRefreshStorageId(seller, tabId) {
  return `${seller}-refresh-${tabId}`;
}

function isFieldValid(elements) {
  return elements.every((ele) => ele && ele.value != null && ele.value.length > 0);
}

function saveTicketConfig() {
  const requiredEles = [priceEle, ticketNumEle, showTimeEle, positionEle].filter((ele) => ele.required);
  console.log('requiredEles', requiredEles);

  if (!isFieldValid(requiredEles)) {
    alert('請填寫票券資訊');
    document.getElementById('ticketForm').classList.add('was-validated');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.group('save Ticket Config...');
    const currTab = tabs[0];

    if (currTab) {
      const { id, url } = currTab;
      const seller = getSeller(url);
      const storageKey = getTicketStorageId(seller, id);
      const price = priceEle.value;
      const showTime = showTimeEle.value;
      const position = positionEle.value;
      const ticketNum = ticketNumEle.options[ticketNumEle.selectedIndex].value;
      chrome.storage.local.set({ [storageKey]: { price, ticketNum, showTime, position } }, () =>
        alert('儲存成功 - 票券設定')
      );
    }
    console.groupEnd();
  });
}

function saveRefreshConfig() {
  if (!isFieldValid([hourEle, minuteEle, secondEle])) {
    alert('請填寫時間資訊');
    document.getElementById('refreshForm').classList.add('was-validated');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.group('save refresh Config...');
    const currTab = tabs[0];

    if (currTab) {
      const { id, url } = currTab;
      const seller = getSeller(url);
      const storageKey = getRefreshStorageId(seller, id);
      chrome.storage.local.set(
        { [storageKey]: { hour: hourEle.value, minute: minuteEle.value, second: secondEle.value } },
        () => alert('儲存成功 - 時間設定')
      );

      console.log('refresh setting', chrome.storage.local.get(storageKey));
    }
    console.groupEnd();
  });
}

function clearTabStorage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.group('save refresh Config...');
    const currTab = tabs[0];
    if (currTab) {
      const { id, url } = currTab;
      const seller = getSeller(url);
      const storageKeys = [getRefreshStorageId(seller, id), getTicketStorageId(seller, id)];
      
      chrome.storage.local.remove(storageKeys, () => alert('這分頁的票券 & 時間設定已清除'));
    }
    console.groupEnd();
  });
}

function clearAllStorage() {
  chrome.storage.local.clear(() => alert('所有分頁的票券 & 時間設定已清除'));
}

function restoreOptions() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currTab = tabs[0];
    if (currTab) {
      const { id, url } = currTab;
      // step 1: initial seller
      const seller = getSeller(url);
      document.getElementById('seller').value = seller;
      if (seller === 'kktix') {
        // TODO: kktix 價格相同的區域處理
        hideUnnecessaryField([dateContainer, positionContainer], [showTimeEle, positionEle]);
      } else {
        hideUnnecessaryField([priceContainer], [priceEle, positionEle]);
      }

      // step 2: restore ticket information
      const ticketKey = getTicketStorageId(seller, id);
      chrome.storage.local.get(ticketKey, (resp) => {
        if (resp[ticketKey]) {
          const { price, ticketNum, showTime, position } = resp[ticketKey];
          priceEle.value = price;
          ticketNumEle.selectedIndex = ticketNum - 1;
          showTimeEle.value = showTime;
          positionEle.value = position;
        }
      });

      // step 3: restore Refresh information
      const refreshKey = getRefreshStorageId(seller, id);
      chrome.storage.local.get(refreshKey, (resp) => {
        if (resp[refreshKey]) {
          const { hour, minute, second } = resp[refreshKey];
          hourEle.value = hour;
          minuteEle.value = minute;
          secondEle.value = second;
        }
      });
    }
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

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveTicketBtn').addEventListener('click', saveTicketConfig);
document.getElementById('saveRefreshBtn').addEventListener('click', saveRefreshConfig);
document.getElementById('clearTabStorageBtn').addEventListener('click', clearTabStorage);
document.getElementById('clearAllStorageBtn').addEventListener('click', clearAllStorage);
