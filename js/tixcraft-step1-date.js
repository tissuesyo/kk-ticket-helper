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
  
  setTimeout(() => {
    const pageUrl = window.location.pathname;
    // 拓元的快速購票方式是不要重新整理網頁, 直接按[立即購票]
    pageUrl.includes('/activity/detail/') && showConcertList();

    pageUrl.includes('/activity/game') && window.location.reload(true);
  }, timeout);
}

function buyTicket(showTime) {
  const allTdEles = Array.from(document.getElementsByTagName('td'));
  const [matchDateEle] = allTdEles.filter(ele => ele.innerText.includes(showTime));
  const buyBtn = matchDateEle?.parentElement?.lastChild?.querySelector('button');
  buyBtn?.click();
  setTimeout(() => buyBtn?.click(), 300);
}

function getTicketStorageId(tabId) {
  return `tixcraft-${tabId}`;
}

function getRefreshStorageId(tabId) {
  return `tixcraft-refresh-${tabId}`;
}

function triggerRefresh(refeshStorageKey) {
  console.log('triggerRefresh...');
  const refreshAction = ({ hour, minute, second }) => refreshPage(hour, minute, second);
  getAndExecuteFromLocalStorage(refeshStorageKey, refreshAction);
}

function triggerBuyTicket(ticketStorageKey) {
  console.log("triggerBuyTicket...", ticketStorageKey);
  const buyAction = ({ showTime }) => buyTicket(showTime);
  getAndExecuteFromLocalStorage(ticketStorageKey, buyAction);
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

function showConcertList(){
  document.getElementsByClassName('buy')[0]?.childNodes[0].click();
}

window.addEventListener('DOMContentLoaded', () => {
  console.log(" !!! Step 1: DOMContentLoaded !!! ");
  getTabIdAndExecute((tabId) => {
    triggerRefresh(getRefreshStorageId(tabId));
    addStorageChangeListener(tabId);
    showConcertList();
    triggerBuyTicket(getTicketStorageId(tabId));
  });
});

onElementLoaded("li[class='buy']")
  .then(() => showConcertList())
  .catch((err) => console.error('some error', err));

onElementLoaded("div[id='gameList']")
  .then(() => {
    console.group('concert list occur');
    getTabIdAndExecute((tabId) => triggerBuyTicket(getTicketStorageId(tabId)));
    console.groupEnd();
  })
  .catch((err) => console.error('some error', err));