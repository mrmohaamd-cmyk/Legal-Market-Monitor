import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {deriveStatus} from '../dist/app.js';
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
    await page.locator('#opportunity-list article').first().waitFor();
    const current=feed.records.filter(r=>['open','open_no_deadline','closing_soon'].includes(deriveStatus(r,feed.verification_window_hours)));
    assert.equal(await page.locator('#opportunity-list article').count(),current.length);
    assert.equal(current.length,8,'Acceptance requires the eight independently reviewed records, including Segal and White & Case, to remain fresh.');
    for(const record of current){
      const card=page.locator('#opportunity-'+record.id);
      assert(await card.isVisible());
      const action=card.locator('.source-link');
      assert.equal(await action.getAttribute('href'),record.application_url||record.source_url);
      assert.equal(await action.getAttribute('target'),'_top');
      await card.locator('details').evaluate(el=>el.open=true);
      const sourceLinks=await card.locator('a').evaluateAll(els=>els.map(el=>el.href));
      assert(sourceLinks.includes(record.source_url),'First-party source link must be accessible: '+record.id);
    }
    const ao=page.locator('#opportunity-ao-shearman-winter-2026-coop');
    const aoText=await ao.innerText();
    assert(aoText.includes('30 November 2026 at 5pm (timezone not stated by source)'));
    assert(aoText.includes('14 Sept 2026'));
    assert(!aoText.includes('No deadline stated by source'));
    const pinsent=await page.locator('#opportunity-pinsent-masons-riyadh-internship-2026').innerText();
    for(const fact of ['11 October 2026','three months','shortlisted candidates','future full-time opportunities','compatibility with concurrent employment are unknown'])assert(pinsent.includes(fact),fact);
    await page.locator('#filter-disclosure').evaluate(el=>el.open=true);
    await page.selectOption('#filter-firm','White & Case');
    assert.equal(await page.locator('#opportunity-list article').count(),2);
    const coop=page.locator('#opportunity-white-case-saudi-coop-2027');
    const trainee=page.locator('#opportunity-white-case-saudi-law-trainee-2027');
    assert((await coop.innerText()).includes('30/10/2026 (source wording; closing time and timezone not stated)'));
    assert((await trainee.innerText()).includes('08/01/2027 (source wording; closing time and timezone not stated)'));
    assert((await coop.innerText()).includes('city not separately stated'));
    assert((await trainee.innerText()).includes('3.5/4.0 or 4.5/5.0'));
    assert((await trainee.innerText()).includes('1 Sept 2026'));
    await page.selectOption('#filter-location','Riyadh');
    assert.equal(await page.locator('#opportunity-list article').count(),1);
    assert(await trainee.isVisible());
    await page.locator('#clear-filters').click();
    await page.selectOption('#filter-firm','Latham & Watkins');
    assert.equal(await page.locator('#opportunity-list article').count(),2);
    await page.selectOption('#filter-stage','Trainee');
    assert.equal(await page.locator('#opportunity-list article').count(),1);
    assert(await page.locator('#opportunity-latham-riyadh-trainee-associate').isVisible());
    await page.selectOption('#filter-firm','Segal Law Firm');
    assert.equal(await page.locator('#opportunity-list article').count(),0);
    assert(await page.locator('#opportunity-empty').isVisible());
    await page.locator('#clear-filters').click();
    assert.equal(await page.locator('#opportunity-list article').count(),8);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'acceptance-results/'+name+'.png',fullPage:true});
    results.push({browser:name,passed:true,records:8,errors,checked_at:new Date().toISOString()});
  }finally{await browser.close();}
}
await writeFile('acceptance-results/results.json',JSON.stringify({base,fixture_interception:false,routes:'passed',source_links:'exact href and same-tab target verified; no application submitted',results},null,2));
console.log('PASS persistent-preview acceptance: root/subpath/QA/assets, traversal rejection, actual eight-record feed, White & Case programme dates/eligibility/location distinction, A&O date precision, Pinsent facts, all source/application links, combined filters/no-results/reset; Chromium desktop/mobile and WebKit mobile.');
