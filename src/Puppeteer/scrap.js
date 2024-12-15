/**
 *
 * PUPPETEER_WS_ENDPOINT='xxx' node packages/google/src/Puppeteer/scrap.js https://www.google.fr/search?q=pied+web
 */
const { Page } = require('puppeteer');
const { connectBrowserPage } = require('./connectBrowserPage');

const url = process.argv[2];
get(url).then((source) => {
  console.log(source);
  process.exit(0);
});

/** @param {int} ms */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**  @param {Page} page */
async function manageCookie(page) {
  const selectors = [
    "::-p-xpath(//div[text()='Tout accepter']/ancestor::button)",
    'input[type="submit"][value="Tout accepter"]',
  ];

  for (let selector of selectors) {
    let cookieAcceptBtns = await page.$$(selector);
    for (let cookieAcceptBtn of cookieAcceptBtns) {
      if (cookieAcceptBtn) {
        await cookieAcceptBtn.scrollIntoView();
        if (cookieAcceptBtn.isVisible()) {
          await sleep(350);
          await cookieAcceptBtn.tap(cookieAcceptBtn);
        }
      }
    }
  }
}

/**  @param {Page} page */
async function manageLoadMoreResultsViaInfiniteScroll(page) {
  let i = 0;
  while (true) {
    let scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(350);
    const isHeighten = await page.evaluate((scrollHeight) => {
      return document.body.scrollHeight > scrollHeight;
    }, scrollHeight);
    if (!isHeighten || i > 10) break;
    i++;
  }
}

/**  @param {Page} page */
async function manageLoadMoreResultsViaBtn(page, clicked = 0) {
  let navigationBlock = await page.$('h1 ::-p-text(Page Navigation)');
  if (navigationBlock === null) return;
  await navigationBlock.scrollIntoView();
  await sleep(250);

  let moreBtn = await page.$('a[aria-label="Autres résultats de recherche"]');
  if (null === moreBtn) return console.log('Pas de boutons `Autres résultats`');

  await moreBtn.scrollIntoView(moreBtn);
  await sleep(750);
  if (!(await moreBtn.isVisible())) return;

  moreBtn.tap();
  clicked++;
  if (clicked <= 4) return await manageLoadMoreResultsViaBtn(page, clicked);
}

/**  @param {string} url */
async function get(url) {
  const page = await connectBrowserPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  await manageCookie(page);
  await manageLoadMoreResultsViaInfiniteScroll(page);
  await manageLoadMoreResultsViaBtn(page);
  return await page.content();
}