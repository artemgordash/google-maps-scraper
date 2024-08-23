export default defineBackground(() => {
  browser.action.onClicked.addListener(async () => {
    await browser.tabs.create({
      url: 'page.html',
    });
  });
});
