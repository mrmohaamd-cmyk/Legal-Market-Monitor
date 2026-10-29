import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {deriveStatus, partitionRecords, getPrimaryAction, filterRecords} from '../dist/app.js';
const {chromium, webkit} = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const base = process.env.AUDIT_URL || 'http://127.0.0.1:4173/Legal-Market-Monitor/';
const origin = new URL(base).origin;
const feed = JSON.parse(await readFile('dist/opportunities.json', 'utf8'));
const received = await (await fetch(new URL('opportunities.json', base))).json();
assert.deepEqual(received, feed, 'The persistent preview must serve the actual edited feed.');
for (const path of ['/', '/__qa', '/Legal-Market-Monitor/', '/Legal-Market-Monitor/app.js', '/Legal-Market-Monitor/style.css', '/Legal-Market-Monitor/tokens.css', '/Legal-Market-Monitor/setup-instructions.txt']) {
  assert.equal((await fetch(origin+path)).status, 200, path);
}
assert.equal((await fetch(origin+'/Legal-Market-Monitor',{redirect:'manual'})).status,302);
assert.equal((await fetch(origin+'/%2e%2e%5cpackage.json')).status,403,'Encoded traversal is rejected.');
assert.equal((await fetch(origin+'/does-not-exist')).status,404);
await mkdir('acceptance-results',{recursive:true});
const results=[];
for(const [name,type,viewport] of [['chromium-desktop',chromium,{width:1280,height:900}],['chromium-mobile',chromium,{width:390,height:844}],['webkit-mobile',webkit,{width:390,height:844}]]){
  const browser=await type.launch();
  try{
    const page=await browser.newPage({viewport});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);
    await page.waitForFunction(() => !document.getElementById('opportunity-count').textContent.includes('Loading'));
    const groups = partitionRecords(feed.records, feed.verification_window_hours);
    const current = groups.current;
    assert.equal(await page.locator('#opportunity-list article').count(), current.length);
    assert.equal(await page.locator('#opportunity-watch-list article').count(), groups.watch.length + groups.archive.length);
    if (groups.watch.length + groups.archive.length) await page.locator('#opportunity-watch').evaluate(el => { el.open = true; });
    for (const record of feed.records) {
      const card = page.locator('#opportunity-' + record.id);
      assert(await card.isVisible());
      const facts = await card.locator('.opportunity-facts').textContent();
      assert(facts.includes(record.eligibility_summary));
      assert(facts.includes(record.offer_summary));
      if (record.deadline_source_text) assert(facts.includes(record.deadline_source_text));
      await card.locator('details').evaluate(el => { el.open = true; });
      if (deriveStatus(record, feed.verification_window_hours) !== 'closed' && deriveStatus(record, feed.verification_window_hours) !== 'expired') {
        const links = await card.locator('a').evaluateAll(els => els.map(el => el.href));
        assert(links.includes(record.source_url), 'Official source remains accessible: ' + record.id);
      }
      const expected = getPrimaryAction(record, deriveStatus(record, feed.verification_window_hours));
      assert.equal(await card.locator('.source-link').count(), expected ? 1 : 0);
      if (expected) {
        assert.equal(await card.locator('.source-link').getAttribute('href'), expected.href);
        assert.equal(await card.locator('.source-link').getAttribute('target'), '_top');
      }
    }
    if (current.length) {
      await page.locator('#filter-disclosure').evaluate(el => { el.open = true; });
      const selected = current[0];
      await page.selectOption('#filter-firm', selected.firm_name);
      await page.selectOption('#filter-stage', selected.career_stage);
      const matches = filterRecords(feed.records, {firm:selected.firm_name, stage:selected.career_stage}, feed.verification_window_hours);
      assert.equal(await page.locator('#opportunity-list article').count(), matches.length);
      await page.locator('#clear-filters').click();
      assert.equal(await page.locator('#opportunity-list article').count(), current.length);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'acceptance-results/'+name+'.png',fullPage:true});
    results.push({browser:name,passed:true,current:current.length,watch:groups.watch.length,archive:groups.archive.length,errors,checked_at:new Date().toISOString()});
  }finally{await browser.close();}
}
await writeFile('acceptance-results/results.json',JSON.stringify({base,fixture_interception:false,routes:'passed',source_links:'exact href and same-tab target verified; no application submitted',results},null,2));
console.log('PASS persistent-preview acceptance: routes/assets, exact feed, actual current/watch/archive partitions, authorized application links, no actions on unsupported records and responsive layout.');
