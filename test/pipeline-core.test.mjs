import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {WHITE_CASE} from '../scripts/pipeline/catalogue.mjs';
import {createWhiteCaseFactsCheck} from '../scripts/whitecase-verification.mjs';
import {canonical, digest, compilePipeline, validateEnvelope, renderBilingual, translationDigest, isTranslationApproved, verifySupported} from '../scripts/pipeline/core.mjs';

const NOW = Date.parse('2026-11-09T16:00:00Z');
const at = new Date(NOW).toISOString();
function record() {
  return {...structuredClone(WHITE_CASE.reviewedRecord),last_verified_at:at,last_reviewed_at:at,application_check:{checked_at:at,result:'login_required'}};
}
const feed = (records=[record()]) => ({generated_at:at,verification_window_hours:168,records});
const evidence = url => ({request_url:url,final_url:url,status:200,checked_at:at,body_sha256:'a'.repeat(64),body_bytes:12});
const verified = async () => ({ok:true,checked_at:at,application_result:'login_required',review_due_at:WHITE_CASE.facts.deadline.editorial_cutoff,
  evidence:[evidence(WHITE_CASE.reviewedRecord.source_url),evidence(WHITE_CASE.reviewedRecord.firm_careers_url)]});
const compile = options => compilePipeline({feed:feed(),now:NOW,verify:verified,...options});

test('supported verified source produces bilingual preview but no publishable record', async () => {
  const result = await compile();
  assert.equal(result.previews.length,1);
  assert.equal(result.accepted.length,0);
  assert.equal(result.publication_enabled,false);
  assert.equal(result.quarantine[0].reason,'translation_review_pending');
  assert.equal(result.previews[0].facts.work_model,null);
  assert.equal(result.previews[0].facts.pay,null);
  assert.equal(validateEnvelope(result,{now:NOW}).publishable,false);
});
test('existing six-hour evidence may refresh without changing semantic or translation binding', async () => {
  const before = await compile();
  const changed = record();
  changed.last_verified_at = '2026-11-01T10:00:00Z';
  changed.last_reviewed_at = '2026-11-01T10:00:00Z';
  changed.application_check.checked_at = '2026-11-01T10:00:00Z';
  changed.provenance_notes = 'Old check; live verification must still run.';
  const after = await compile({feed:feed([changed])});
  assert.equal(before.previews[0].semantic_sha256,after.previews[0].semantic_sha256);
  assert.equal(before.previews[0].translation_sha256,after.previews[0].translation_sha256);
});
test('changed facts, unknown new properties and substituted links quarantine', async () => {
  for (const change of [
    x => { x.qualifications[0] = 'Invented requirement'; },
    x => { x.new_eligibility_rule = 'invented'; },
    x => { x.application_url = 'https://unapproved.example/apply'; },
    x => { x.role_title += ' Senior'; }
  ]) {
    const r = record(); change(r);
    let requests = 0;
    const result = await compile({feed:feed([r]),verify:async () => { requests++; return verified(); }});
    assert.equal(result.previews.length,0);
    assert.equal(result.quarantine[0].reason,'reviewed_semantics_changed');
    assert.equal(requests,0);
  }
});
test('recruitment routes, closed roles, unsupported sources and discovered leads are not vacancies', async () => {
  const records = [
    {...record(),id:'standing-route',record_kind:'recruitment_route'},
    {...record(),id:'unsupported-role'},
    {...record(),status:'closed'}
  ];
  let requests = 0;
  const result = await compile({feed:feed(records),discoveryCandidates:[{score:100,verified:true,translated:'pretend'}],
    verify:async () => { requests++; return verified(); }});
  assert.equal(result.previews.length,0);
  assert.equal(requests,0);
  assert.equal(result.quarantine.length,4);
  assert.equal(JSON.stringify(result).includes('pretend'),false);
});
test('duplicate identities block all copies before verification', async () => {
  let requests = 0;
  const result = await compile({feed:feed([record(),record()]),verify:async () => { requests++; return verified(); }});
  assert.equal(requests,0);
  assert.deepEqual(result.quarantine.map(x => x.reason),['duplicate_identity','duplicate_identity']);
});
test('uncertain verification, future or stale evidence and wrong receipt domains fail closed', async () => {
  const cases = [
    {ok:false,reason:'application_uncertain'},
    {...await verified(),checked_at:'2026-11-10T00:00:00Z'},
    {...await verified(),checked_at:'2026-11-01T00:00:00Z'},
    {...await verified(),evidence:[evidence('https://unapproved.example/a'),evidence(WHITE_CASE.reviewedRecord.firm_careers_url)]},
    {...await verified(),application_result:'email_route'},
    {...await verified(),review_due_at:'2027-01-09T00:00:00Z'}
  ];
  for (const value of cases) assert.equal((await compile({verify:async () => value})).previews.length,0);
  assert.equal((await compile({verify:async () => { throw new Error('source failure'); }})).previews.length,0);
});
test('invalid existing evidence, future feed and elapsed editorial cutoff fail closed', async () => {
  const r = record(); r.application_check.checked_at = '2026-02-30T00:00:00Z';
  assert.equal((await compile({feed:feed([r])})).quarantine[0].reason,'invalid_existing_evidence');
  await assert.rejects(compile({feed:{...feed(),generated_at:'2026-11-10T00:00:00Z'}}),/future_feed/);
  const result = await compile({now:Date.parse(WHITE_CASE.facts.deadline.editorial_cutoff)});
  assert.equal(result.quarantine[0].reason,'editorial_deadline_cutoff');
});
test('translation approval binds every reviewed fact and both exact language pairs', () => {
  const entry = structuredClone(WHITE_CASE);
  entry.translationReview = {status:'approved',reviewer:'fixture-reviewer',reviewed_at:at,content_sha256:translationDigest(entry)};
  assert.equal(isTranslationApproved(entry,NOW),true);
  entry.pairs.find(x => x.id === 'gpa').ar += ' غير صحيح';
  assert.equal(isTranslationApproved(entry,NOW),false);
  assert.equal(isTranslationApproved(WHITE_CASE,NOW),false);
  const output = renderBilingual(WHITE_CASE,at);
  assert.equal(output.fact_ids.length,new Set(output.fact_ids).size);
  assert.equal((output.text.match(/3\.5/g) || []).length,2);
  assert.equal((output.text.match(/4\.5/g) || []).length,2);
});
test('snapshot digest and two-cycle expiry reject tamper and stale results', async () => {
  const result = await compile();
  assert.throws(() => validateEnvelope({...result,publication_enabled:true},{now:NOW}),/digest/);
  assert.throws(() => validateEnvelope(result,{now:NOW+12*3600000}),/fresh/);
  const modified = {...result,accepted:[result.previews[0]]};
  delete modified.sha256; modified.sha256 = digest(modified);
  assert.throws(() => validateEnvelope(modified,{now:NOW}),/publication_state/);
});
test('canonical form rejects non-JSON, getters, sparse arrays and excessive input', async () => {
  for (const x of [undefined,NaN,new Date(),{get x(){throw new Error('getter executed');}},[,1],Object.assign([1],{extra:true})]) assert.throws(() => canonical(x));
  const weird = [1]; Object.defineProperty(weird,'0',{get(){throw new Error('getter executed');}});
  assert.throws(() => canonical(weird),/non_json_array/);
  await assert.rejects(compile({discoveryCandidates:Array(1001).fill({})}),/budget/);
});
const portal = '<div><div class="d-flex justify-content-between fw-semibold">Saudi Law Trainee Program 2027</div><div><ul><li>March 2027 08/01/2027</li></ul></div></div><form action="/app/" method="post"><input type="email" name="LogonEmail"><button type="submit">Continue</button></form>';
const articleText = 'Synthetic reviewed programme facts for a fixture only.';
const article = '<article class="section-landing-page">' + articleText + '</article>';
const hash = text => createHash('sha256').update(text).digest('hex');
const reply = (url,body) => ({url,status:200,contentType:'text/html',body,body_sha256:hash(body),body_bytes:Buffer.byteLength(body)});
test('supported adapter requires exact programme row, active form and reviewed article', async () => {
  const factsCheck = createWhiteCaseFactsCheck({articleHash:hash(articleText)});
  const retrieve = async url => reply(url,url === WHITE_CASE.reviewedRecord.source_url ? portal : article);
  assert.equal((await verifySupported(record(),{retrieve,now:NOW,factsCheck})).ok,true);
  for (const changed of [portal.replace('08/01/2027','09/01/2027'),portal.replace('type="email"','disabled type="email"'),portal.replace('March 2027 08/01/2027','March 2027 Deadline passed')]) {
    assert.equal((await verifySupported(record(),{retrieve:async url => reply(url,url === WHITE_CASE.reviewedRecord.source_url ? changed : article),now:NOW,factsCheck})).ok,false);
  }
  assert.equal((await verifySupported(record(),{retrieve:async url => reply(url,url === WHITE_CASE.reviewedRecord.source_url ? portal : article.replace('facts','changed facts')),now:NOW,factsCheck})).ok,false);
});
test('forged or absent HTTP digest receipts cannot verify employer facts', async () => {
  const result = await verifySupported(record(),{now:NOW,retrieve:async url => ({...reply(url,portal),body_sha256:'0'.repeat(64)})});
  assert.equal(result.ok,false);
});
