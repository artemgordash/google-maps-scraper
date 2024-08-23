export const waitForTabIdle = async (tabId: number) => {
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      const tab = await browser.tabs.get(tabId);
      if (tab.status === 'complete') {
        console.log('🚀 ~ interval ~ tab.status:', tab.status, tab.url);
        clearInterval(interval);
        resolve();
      }
    }, 300);

    setTimeout(() => {
      clearInterval(interval);
      reject('Timeout exceed');
    }, 10000);
  });
};
