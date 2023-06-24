function getTicketStorageId(tabId) {
  return `kktix-${tabId}`;
}

function getRefreshStorageId(tabId) {
  return `kktix-refresh-${tabId}`;
}

function isFieldValid(elements) {
  return elements.every((ele) => ele && ele.value != null && ele.value.length > 0);
}

function saveTicketConfig() {
  const positionEle = document.getElementById('position');
  const selectEle = document.getElementById('ticketNum');

  if (!isFieldValid([positionEle, selectEle])) {
    alert('請填寫票券資訊');
    document.getElementById('ticketForm').classList.add('was-validated');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.group('save Ticket Config...');
    const currTab = tabs[0];

    if (currTab) {
      const storageKey = getTicketStorageId(currTab.id);
      const position = positionEle.value;
      const ticketNum = selectEle.options[selectEle.selectedIndex].value;
      chrome.storage.local.set({ [storageKey]: { position, ticketNum } }, () => alert('儲存成功 - 票券設定'));
    }
    console.groupEnd();
  });
}

function saveRefreshConfig() {
  const hourEle = document.getElementById('hour');
  const minuteEle = document.getElementById('minute');
  const secondEle = document.getElementById('second');

  if (!isFieldValid([hourEle, minuteEle, secondEle])) {
    alert('請填寫時間資訊');
    document.getElementById('refreshForm').classList.add('was-validated');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.group('save refresh Config...');
    const currTab = tabs[0];

    if (currTab) {
      const storageKey = getRefreshStorageId(currTab.id);
      chrome.storage.local.set(
        { [storageKey]: { hour: hourEle.value, minute: minuteEle.value, second: secondEle.value } },
        () => alert('儲存成功 - 時間設定')
      );
    }
    console.groupEnd();
  });
}

function clearTabStorage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.group('save refresh Config...');
    const currTab = tabs[0];
    if (currTab) {
      const storageKeys = [getRefreshStorageId(currTab.id), getTicketStorageId(currTab.id)];
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
      const { id } = currTab;
      // step 1: restore ticket information
      const ticketKey = getTicketStorageId(id);
      chrome.storage.local.get(ticketKey, (resp) => {
        if (resp[ticketKey]) {
          const { position, ticketNum } = resp[ticketKey];
          document.getElementById('position').value = position;
          document.getElementById('ticketNum').selectedIndex = ticketNum - 1;
        }
      });

      // step 2: restore Refresh information
      const refreshKey = getRefreshStorageId(id);
      chrome.storage.local.get(refreshKey, (resp) => {
        if (resp[refreshKey]) {
          const { hour, minute, second } = resp[refreshKey];
          document.getElementById('hour').value = hour;
          document.getElementById('minute').value = minute;
          document.getElementById('second').value = second;
        }
      });
    }
    console.groupEnd();
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveTicketBtn').addEventListener('click', saveTicketConfig);
document.getElementById('saveRefreshBtn').addEventListener('click', saveRefreshConfig);
document.getElementById('clearTabStorageBtn').addEventListener('click', clearTabStorage);
document.getElementById('clearAllStorageBtn').addEventListener('click', clearAllStorage);
