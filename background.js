browser.browserAction.onClicked.addListener(openSettings);

function openSettings() {
  browser.runtime.openOptionsPage();
}
