function getTicketStorageId(seller, tabId) {
  return `${seller}-${tabId}`;
}

function getRefreshStorageId(seller, tabId) {
  return `${seller}-refresh-${tabId}`;
}

function getRemainingStorageId(seller, tabId) {
  return `${seller}-remaining-${tabId}`;
}
