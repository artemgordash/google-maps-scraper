import {
  connect,
  ExtensionTransport,
} from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';

export async function connectTab(tabId: number) {
  const pbrowser = await connect({
    transport: await ExtensionTransport.connectTab(tabId),
  });
  const [page] = await pbrowser.pages();
  page.setViewport({ width: 0, height: 0, deviceScaleFactor: 0 });
  return page;
}
