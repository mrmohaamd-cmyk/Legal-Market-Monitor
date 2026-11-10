import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAOReviewer, reviewAO, supportsAO, AO_SOURCE_URL, AO_APPLICATION_URL} from '../scripts/ao-verification.mjs';

const now = Date.parse('2026-11-10T10:00:00Z');
const hash = value => createHash('sha256').update(value).digest('hex');
const description = [
  'The Co-op internship will last for a period of 7 months with intakes in January and August.',
  'Currently enrolled as an undergraduate student in Law.',
  'A strong cumulative GPA that demonstrates academic excellence.',
  'Fluent in English and Arabic (spoken and written).',
  'COOP training should be a graduation requirement by the University or College.',
  'Monthly expense allowance.',
  'Applications open 14 September 2026 and close on 30 November 2026 at 5pm.'
].join(' ');
const sourceHtml = `<main id="content"><h1 class="hero-banner__headline">Co-op Scheme - Winter 2026</h1><section class="job-description" data-job-id="44638109504" data-org-id="3392"><dl><dd class="job-detail-job-id">11180BR</dd><dd class="job-detail-location">Riyadh, Saudi Arabia</dd><dd class="job-detail-job-type">Vacation programme/internship</dd><dd class="job-detail-working-arrangement">Office based</dd></dl><div class="ats-description">${description}</div><a class="job-apply" data-job-id="44638109504" href="${AO_APPLICATION_URL}">Apply</a></section></main>`;
const applicationHtml = '<body><form name="signInForm" class="loginBox"><label for="loginField">E-Mail Address</label><input id="loginField" name="loginField" type="text"><input id="password" name="password" type="password"><button id="btnLogin" type="submit">Sign In</button></form></body>';
const record = {id:'ao-shearman-winter-2026-coop',record_kind:'advertised_opening',role_title:'Co-op Scheme – Winter 2026',source_url:AO_SOURCE_URL,application_url:AO_APPLICATION_URL};
const proof = (url,html,final=url) => ({schema:'saudilaw-browser-dom-proof/v1',requested_url:url,final_url:final,http_status:200,checked_at:new Date(now).toISOString(),visible_html:html,visible_html_sha256:hash(html)});
const options = (source=sourceHtml,application=applicationHtml) => ({now,sourceProof:proof(AO_SOURCE_URL,source),applicationProof:proof(AO_APPLICATION_URL,application,`${AO_APPLICATION_URL}#jobDetails=98119_5040`)});
const review = createAOReviewer({descriptionHash:hash(description)});
const pending = async (opts,rec=record) => assert.equal((await review(rec,opts)).outcome,'verification_pending');

test('AO binds complete reviewed vacancy, exact Apply target and public sign-in only',async () => {
  assert.equal(supportsAO(record),true);
  const before = JSON.stringify(record);
  const result = await review(record,options());
  assert.equal(result.outcome,'verified');
  assert.equal(result.result,'login_required');
  assert.equal(result.evidence.length,2);
  assert.equal(result.reviewDueAt,'2026-11-29T21:00:00.000Z');
  assert.match(result.reason,/selection after login was not inspected/);
  assert.equal(JSON.stringify(record),before);
});
test('AO normalizes query order without permitting extras or duplicate keys',async () => {
  const reordered = 'https://jobs.aoshearman.com/TGnewUI/Search/home/HomeWithPreLoad?jobid=98119&siteid=5040&partnerid=30147&PageType=JobDetails';
  const opts = options(sourceHtml.replace(AO_APPLICATION_URL,reordered));
  opts.applicationProof.requested_url = reordered;
  opts.applicationProof.final_url = `${reordered}#jobDetails=98119_5040`;
  assert.equal((await review({...record,application_url:reordered},opts)).outcome,'verified');
  for (const extra of ['&jobid=98119','&next=https://elsewhere.example/','&siteid=1']) await pending(options(sourceHtml.replace(AO_APPLICATION_URL,AO_APPLICATION_URL+extra)));
});
test('AO requires fresh HTTP-successful browser proofs with a consistent DOM hash',async () => {
  for (const which of ['sourceProof','applicationProof']) {
    for (const change of [undefined,{schema:'unknown'},{http_status:403},{checked_at:'invalid'},{checked_at:new Date(now+1).toISOString()},{checked_at:new Date(now-300001).toISOString()},{visible_html_sha256:'0'.repeat(64)},{requested_url:''},{final_url:'https://other.example/'}]) {
      const opts = options(); opts[which] = change === undefined ? undefined : {...opts[which],...change}; await pending(opts);
    }
  }
  await pending({now,sourceResponse:{status:200,body:sourceHtml}});
});
test('AO rejects wrong record role, source, application and classification',async () => {
  for (const delta of [{id:'other'},{record_kind:'recruitment_route'},{role_title:'Winter 2027'},{source_url:''},{source_url:AO_SOURCE_URL+'?view=all'},{application_url:AO_APPLICATION_URL.replace('98119','98120')}]) await pending(options(),{...record,...delta});
});
test('AO source identity, location, body and visible Apply must agree',async () => {
  for (const [before,after] of [['11180BR','11181BR'],['Riyadh, Saudi Arabia','Dubai'],['Office based','Remote'],['7 months','6 months'],['5pm','6pm'],['data-job-id="44638109504"','data-job-id="999"'],['>Apply<','>View jobs<'],['class="job-apply"','class="job-apply" aria-disabled="true"']]) await pending(options(sourceHtml.replace(before,after)));
  await pending(options(sourceHtml.replace('</main>','<p>This job is no longer available.</p></main>')));
  await pending(options(sourceHtml.replace('class="ats-description"','class="ats-description" hidden')));
});
test('AO material facts are required even with an intentionally matching synthetic hash',async () => {
  const changed = description.replace('undergraduate student in Law','qualified lawyer');
  const custom = createAOReviewer({descriptionHash:hash(changed)});
  assert.equal((await custom(record,options(sourceHtml.replace(description,changed)))).outcome,'verification_pending');
});
test('AO exposes only the observed body fingerprint when the exact reviewed text changes',async () => {
  const result=await reviewAO(record,options());assert.equal(result.outcome,'verification_pending');
  assert.match(result.reason,/fingerprint changed/);assert.equal(result.observedDescriptionSha256,hash(description));
});
test('AO cannot use hidden or unresolved template controls, unrelated forms or disabled controls',async () => {
  for (const html of [
    `<template>${applicationHtml}</template>`,
    applicationHtml.replace('name="signInForm"','name="signInForm" hidden'),
    applicationHtml.replace('id="loginField"','id="{{loginField}}"'),
    applicationHtml.replace('id="loginField"','id="loginField" readonly'),
    applicationHtml.replace('id="password"','id="password" disabled'),
    applicationHtml.replace('id="btnLogin"','id="btnLogin" aria-disabled="true"'),
    applicationHtml.replace('class="loginBox"','class="loginBox" action="https://other.example/"'),
    applicationHtml.replace('<input id="password"','</form><form><input id="password"'),
    applicationHtml.replace('</body>','<p>Applications are closed.</p></body>'),
    applicationHtml.replace('</form>','</form>'+applicationHtml),
  ]) await pending(options(sourceHtml,html));
});
test('AO exact ATS fragment is required; login availability is not post-login selection proof',async () => {
  for (const final of [AO_APPLICATION_URL,`${AO_APPLICATION_URL}#jobDetails=11180_5040`,`${AO_APPLICATION_URL}#jobDetails=98119_9999`]) {
    const opts=options(); opts.applicationProof.final_url=final; await pending(opts);
  }
});
test('AO production export cannot be overridden per call and cutoff is conservative',async () => {
  assert.equal((await reviewAO(record,{...options(),descriptionHash:hash(description)})).outcome,'verification_pending');
  await pending({...options(),now:Date.parse('2026-11-29T21:00:00.000Z')});
});
