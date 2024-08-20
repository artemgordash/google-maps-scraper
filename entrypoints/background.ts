export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  chrome.action.onClicked.addListener(async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  });
});
