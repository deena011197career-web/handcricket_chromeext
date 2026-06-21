'use strict';
// Service worker — required by MV3.
// Hand Cricket is a stateless popup game; no background work needed.
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Hand Cricket] Extension installed.');
});
