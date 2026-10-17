/**
 * Screenshots of the app's pages for the guides (docs/images), taken with
 * Playwright against the stand-in HubSpot and Supertext APIs, which return
 * real translations of the sample account (tests/standin/samples.json).
 *
 *   npm run docs:screenshots
 *
 * Chromium: Playwright's own (npx playwright install chromium), or CHROME=/path.
 */
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { mkdirSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { chromium, type Locator, type Page } from 'playwright';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { MemoryStore } from '../../src/store/store.js';
import { createHubSpotStandin } from '../standin/hubspot.js';
import { createSupertextStandin } from '../standin/supertext.js';

const out = new URL('../../docs/images/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const listen = (fetch: (request: Request) => Response | Promise<Response>, port = 0) =>
  new Promise<string>((resolve) => {
    const server = serve({ fetch, port, hostname: '127.0.0.1' }, () => {
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    });
  });

async function main() {
  const hubspot = createHubSpotStandin();
  const supertext = createSupertextStandin();
  const hubspotUrl = await listen((request) => hubspot.handle(request));
  const supertextUrl = await listen((request) => supertext.handle(request));
  const port = 8790;
  const appUrl = `http://127.0.0.1:${port}`;
  const app = createApp({
    config: loadConfig({
      APP_URL: appUrl,
      HUBSPOT_CLIENT_ID: 'screenshots',
      HUBSPOT_CLIENT_SECRET: 'screenshots-secret',
      HUBSPOT_APP_BASE: hubspotUrl,
      HUBSPOT_API_BASE: hubspotUrl,
      SUPERTEXT_API_ENDPOINT: `${supertextUrl}/v1/`,
      // Version reports go to the stand-in, never to the live Commando Center.
      SUPERTEXT_REPORT_URL: `${supertextUrl}/report`,
    }),
    store: new MemoryStore(),
  });
  app.use('/static/*', serveStatic({ root: new URL('../../public/', import.meta.url).pathname, rewriteRequestPath: (path) => path.replace(/^\/static/, '') }));
  await listen(app.fetch, port);

  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await browser.newPage({ viewport: { width: 1120, height: 900 }, deviceScaleFactor: 1, locale: 'en-US' });
  const shot = async (name: string, target: Locator | Page = page) => {
    await target.screenshot({ path: `${out}${name}.png`, animations: 'disabled' });
    console.log(`docs/images/${name}.png`);
  };

  // Start page, then connect (the stand-in approves at once and the app opens its settings).
  await page.goto(appUrl);
  await shot('connect', page.locator('.connect'));
  await page.click('text=Connect HubSpot');
  await page.waitForURL(`${appUrl}/settings`);

  // Settings: key, languages (each dropdown preselects its suggestion; German is set to de-DE explicitly), and a connection test.
  await page.fill('input[name="apiKey"]', 'Supertext-Auth-Key 0123456789abcdef');
  await page.selectOption('select[name="sourceLanguage"]', 'en');
  for (const code of ['de-ch', 'fr-ch', 'it-ch', 'de']) await page.check(`#t-${code}`);
  await page.selectOption('select[name="code:de"]', 'de-DE');
  await page.click('button.primary');
  await page.waitForSelector('.notice.success');
  await page.click('#test-button');
  await page.waitForSelector('#test-result.ok');
  // Only the chosen languages and a few others: the full table of languages is long.
  await page.evaluate(() => {
    document.querySelectorAll('#targets tr.other').forEach((row, i) => {
      if (i > 2) (row as HTMLElement).style.display = 'none';
    });
  });
  await shot('settings', page.locator('main'));

  // Translate page: the About us page, Swiss German and French.
  await page.goto(`${appUrl}/?kind=site-page`);
  await page.check('input[name="item"][value="101"]');
  await page.uncheck('input[name="language"][value="it-ch"]');
  await page.uncheck('input[name="language"][value="de"]');
  await shot('translate-page', page.locator('#translate-form'));

  // Results after translating.
  await page.click('#translate-button');
  await page.waitForURL(/item=101/, { timeout: 30_000 });
  await page.waitForSelector('.job .notice.success');
  await shot('translate-results', page.locator('.job'));
  await shot('translated-state', page.locator('table.items'));

  // Updating existing versions: the warning.
  // Update existing versions is ticked by default, with its warning.
  await shot('overwrite-warning', page.locator('#translate-form'));

  // A marketing email, translated into three languages.
  await page.goto(`${appUrl}/?kind=email`);
  await page.check('input[name="item"][value="401"]');
  await page.uncheck('input[name="language"][value="de"]');
  await page.click('#translate-button');
  await page.waitForURL(/item=401/, { timeout: 30_000 });
  await page.waitForSelector('.job .notice.success');
  await shot('email-results', page.locator('main'));

  // The blog posts in German.
  await page.goto(`${appUrl}/?kind=blog-post&lang=de`);
  await page.check('input[name="item"][value="301"]');
  await page.uncheck('input[name="language"][value="de"]');
  await shot('translate-page-de', page.locator('#translate-form'));

  // Phones: every page must fit a 390 px wide screen (wide tables scroll inside their card).
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await phone.context().addCookies(await page.context().cookies());
  for (const path of ['/?lang=en', '/?kind=email', '/settings']) {
    await phone.goto(`${appUrl}${path}`);
    const width = await phone.evaluate(() => document.documentElement.scrollWidth);
    if (width > 390) throw new Error(`${path} is ${width}px wide on a phone (390px screen)`);
  }
  await phone.click('form.settings button.primary', { trial: true });
  console.log('phone layout: all pages fit 390px');

  await browser.close();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
