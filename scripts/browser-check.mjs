// Browser regression checks. Playwright is test-only, installed in a temporary runner directory.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium, webkit } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root = resolve('dist');
const prefix = '/Legal-Market-Monitor/';
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.txt':'text/plain' };
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (!path.startsWith(prefix)) { res.writeHead(404); res.end('Not found'); return; }
    const file = resolve(root, path.slice(prefix.length) || 'index.html');
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const local = `http://127.0.0.1:${server.address().port}${prefix}`;
const base = process.env.AUDIT_URL || local;
const feed = process.env.AUDIT_URL ? await (await fetch(new URL('opportunities.json', base))).json() : JSON.parse(await readFile('dist/opportunities.json', 'utf8'));
const pinned = feed.records.find((r) => r.id === 'pinsent-masons-riyadh-internship-2026');
assert(pinned, 'Reviewed Pinsent record must exist.');
await mkdir('browser-results', { recursive: true });
try {
  for (const [name, browserType, viewport] of [['chromium-mobile',chromium,{width:390,height:844}], ['webkit-mobile',webkit,{width:390,height:844}], ['chromium-desktop',chromium,{width:1280,height:900}]]) {
    const browser = await browserType.launch();
    try {
      const context = await browser.newContext({ viewport });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'share', { configurable:true, value: async (value) => { window.__shared = value; } });
        Object.defineProperty(navigator, 'clipboard', { configurable:true, value: { writeText: async () => { throw new Error('Controlled clipboard denial'); } } });
      });
      const page = await context.newPage();
      const errors = []; const missing = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => { if (response.status() >= 400 && /\.(css|js|json)(\?|$)/.test(response.url())) missing.push({url:response.url(),status:response.status()}); });
      await page.goto(base + '?audit=1#opportunities');
      await page.waitForFunction(() => !document.getElementById('opportunity-count').textContent.includes('Loading'));
      await page.locator('#share-page').click();
      const shared = await page.evaluate(() => window.__shared?.url);
      const theme = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--eds-color-text-primary').trim());
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      console.log(JSON.stringify({phase:process.env.EXPECT_BASELINE ? 'baseline' : 'verification', browser:name, base, theme_loaded:!!theme, shared_url:shared, missing, overflow, errors}));
      await page.screenshot({path:`browser-results/${process.env.EXPECT_BASELINE ? 'baseline-' : ''}${name}.png`,fullPage:true});
      if (process.env.EXPECT_BASELINE) continue;
      assert.equal(shared, base, 'Sharing must retain repository subpath and remove query/hash.');
      assert(theme, 'Design tokens must load.');
      assert.equal(overflow, false, 'No horizontal page overflow.');
      assert.deepEqual(missing, []); assert.deepEqual(errors, []);
      // Exercise a controlled fresh record, independent of the wall clock or editorial feed age.
      await page.route('**/opportunities.json', (route) => route.fulfill({json:{...feed,records:[{...pinned,last_verified_at:new Date().toISOString()}]}}));
      await page.reload();
      await page.locator('#opportunity-list .source-link').waitFor();
      const action = page.locator('#opportunity-list .source-link');
      assert.equal(await action.getAttribute('href'), pinned.application_url);
      assert.equal(await action.getAttribute('target'), '_top');
      assert.equal((await action.textContent()).trim(), 'Apply to Pinsent Masons');
      await page.locator('#filter-disclosure').evaluate((el) => { el.open = true; });
      await page.selectOption('#filter-firm','Pinsent Masons');
      await page.locator('#clear-filters').click();
      assert.equal(await page.locator('#filter-firm').inputValue(),'');
      assert.equal(await page.locator('#opportunity-list article').count(),1);
      const box = await action.boundingBox(); assert(box.width > 0 && box.x >= 0 && box.x + box.width <= viewport.width);
      await page.route(pinned.application_url, (route) => route.fulfill({body:'Controlled external-navigation check',contentType:'text/html'}));
      await action.click(); await page.waitForURL(pinned.application_url); assert.equal(context.pages().length,1);
      await page.goto(base);
      await page.unroute('**/opportunities.json');
      await page.route('**/opportunities.json', (route) => route.fulfill({json:{...feed,records:[{...pinned,last_verified_at:new Date(Date.now()-48*3600000).toISOString()}]}}));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#opportunity-watch')?.open === true);
      assert.equal(await page.locator('#opportunity-list .source-link').count(),0);
      const reviewLink=page.locator('#opportunity-watch-list .opportunity-actions a');
      assert.equal(await reviewLink.getAttribute('href'),pinned.source_url);
      assert((await reviewLink.textContent()).startsWith('Check Pinsent Masons'));
      assert((await page.locator('.verification-line').textContent()).includes('Last source review:'));
      assert((await page.locator('#opportunity-empty-copy').textContent()).includes('does not establish'));
      // Share cancellation stays silent; unsupported sharing exposes a selected copy fallback.
      await page.evaluate(() => Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancelled','AbortError');}}));
      await page.locator('#share-page').click(); assert.equal(await page.locator('#share-status').textContent(),'');
      await page.evaluate(() => Object.defineProperty(navigator,'share',{configurable:true,value:undefined}));
      await page.locator('#share-page').click();
      assert.equal(await page.locator('#share-url').inputValue(),base);
      assert.equal(await page.locator('#share-url').isVisible(),true);
      await page.unroute('**/opportunities.json');
      await page.route('**/opportunities.json', (route) => route.fulfill({status:503,body:'Controlled feed failure'}));
      await page.reload(); await page.locator('#opportunity-error').waitFor();
      assert.equal(await page.locator('#opportunity-list .source-link').count(),0);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${name}: theme, share/cancel/copy fallback, filter reset, same-tab application handoff, dated overdue links, honest expiry and feed failure.`);
      await context.close();
    } finally { await browser.close(); }
  }
} finally { await new Promise((resolve) => server.close(resolve)); }
