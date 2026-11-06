import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { createSourceEvaluator, evaluateSource as productionEvaluator, reviewFeed, reportMarkdown } from '../scripts/reverify-opportunities.mjs';
import { checkReviewOwnership, proposeRefresh, PR_MARKER, REFRESH_BRANCH } from '../scripts/propose-refresh.mjs';
import { partitionRecords } from '../dist/app.js';

const now = Date.parse('2026-11-06T12:00:00Z');
const old = '2026-10-29T12:00:00Z';
const portal = 'https://whitecase.grad.allhires.com/app/';
const trainee = {id:'white-case-saudi-law-trainee-2027', source_url:portal, application_url:portal, source_status:'verified', record_kind:'advertised_opening', status:'open', last_verified_at:old, application_check:{checked_at:old,result:'login_required',note:'Previous evidence'}, last_reviewed_at:old};
const coop = {...trainee,id:'white-case-saudi-coop-2027'};
const row = (title,intake,deadline) => `<div class="d-flex justify-content-between text-sm fw-semibold py-1">${title}</div><div class="text-sm fw-semibold py-1"><ul><li><div class="row"><div>${intake}</div><div><span>${deadline}</span></div></div></li></ul></div>`;
const form = '<form action="/app/" method="post"><input name="LogonEmail" type="email"><button type="submit">Continue</button></form>';
const openRow = row('Saudi Law Trainee Program 2027','March 2027','08/01/2027');
const closedRow = row('Saudi COOP Internship 2027','January 2027','Deadline passed');
const html = `<main>${form}<div>${closedRow}${openRow}</div></main>`;
const response = body => ({url:portal,status:200,contentType:'text/html',body});
const feed = records => ({generated_at:old,verification_window_hours:168,records});
const kirklandText = 'Apply Now — Entry Level Email our entry-level legal recruiting team to apply for a position in our Riyadh office';
const evaluateSource = createSourceEvaluator({kirklandMainHash:createHash('sha256').update(kirklandText).digest('hex')});

test('shared AllHires page isolates the exact role before interpreting closure', () => {
  assert.equal(evaluateSource(trainee,response(html),now).outcome,'verified');
  assert.equal(evaluateSource(coop,response(html),now).outcome,'closed');
  assert.equal(evaluateSource(trainee,response(`<main>${form}${closedRow}</main>`),now).outcome,'verification_pending');
  assert.equal(evaluateSource(trainee,response(html + openRow),now).outcome,'verification_pending');
});

test('a public login shell, scripts or hidden programme templates cannot prove a role', () => {
  for (const body of [form, `${form}<script>${openRow}</script>`, `${form}<div hidden>${openRow}</div>`, `${form}<div class="d-none">${openRow}</div>`, `${form}<div aria-hidden="true">${openRow}</div>`, `${form}<div style="display:none">${openRow}</div>`]) {
    assert.equal(evaluateSource(trainee,response(body),now).outcome,'verification_pending');
  }
  assert.equal(evaluateSource(trainee,response(openRow),now).outcome,'verification_pending');
  assert.equal(evaluateSource(trainee,response(`${form}<div><script>const x="</div>"; const y='${openRow}';</script></div>`),now).outcome,'verification_pending');
  assert.equal(evaluateSource(trainee,response(`${form}<div><template></div>${openRow}</template></div>`),now).outcome,'verification_pending');
  assert.equal(evaluateSource(trainee,response(`${form}<div data-template='${openRow}'></div>`),now).outcome,'verification_pending');
  assert.equal(evaluateSource(trainee,response(`${form}<script>const stored = '<div data-value="';</script>${openRow}`),now).outcome,'verified','Raw-text quotes must not swallow the real closing script and subsequent visible programme.');
  for (const tag of ['textarea','xmp','iframe']) assert.equal(evaluateSource(trainee,response(`${form}<${tag}>${openRow}</${tag}>`),now).outcome,'verification_pending');
  for (const blocked of [form.replace('<input','<input disabled'),form.replace('<input','<input readonly'),form.replace('<form','<form inert'),form.replace('<button','<button disabled'),form.replace('<input','<input aria-disabled="true"'),form.replace('<input','<fieldset disabled><input').replace('</form>','</fieldset></form>')]) assert.equal(evaluateSource(trainee,response(`${blocked}${openRow}`),now).outcome,'verification_pending');
});

test('new dates, intake wording and unexpected layout require editorial review', () => {
  for (const body of [html.replace('08/01/2027','09/01/2027'),html.replace('March 2027','March 2028'),html.replace(openRow,openRow.replace('<ul>','<ul><li>Different opening</li>'))]) assert.equal(evaluateSource(trainee,response(body),now).outcome,'verification_pending');
  assert.equal(evaluateSource(trainee,response(html),Date.parse('2027-01-07T21:00:00Z')).outcome,'verification_pending');
});

test('block responses and redirects fail closed without bypassing them', () => {
  for (const status of [301,302,403,404,429,500]) assert.equal(evaluateSource(trainee,{...response(html),status},now).outcome,'verification_pending');
  assert.equal(evaluateSource(trainee,{...response(html),url:'https://whitecase.grad.allhires.com/login'},now).outcome,'verification_pending');
  assert.equal(evaluateSource(trainee,{error:'Timed out'},now).outcome,'verification_pending');
  assert.equal(evaluateSource(trainee,{...response(html),contentType:'application/json'},now).outcome,'verification_pending');
  assert.equal(evaluateSource({...trainee,source_url:'https://example.com/'},response(html),now).outcome,'verification_pending');
});

test('Kirkland email is verified only in the exact standing Riyadh entry-level card', () => {
  const record = {...trainee,id:'kirkland-riyadh-entry-level',source_url:'https://www.kirkland.com/careers/asia/saudi-arabia',application_url:null,record_kind:'recruitment_route'};
  const body = '<main id="careers-detail-app"><a href="mailto:RY_Entry-Level_Legal_Recruiting@kirkland.com?subject=Apply"><h3>Apply Now — Entry Level</h3><p>Email our entry-level legal recruiting team to apply for a position in our Riyadh office</p></a></main>';
  const result = evaluateSource(record,{...response(body),url:record.source_url},now);
  assert.equal(result.outcome,'verified'); assert.equal(result.result,'email_route');
  assert.match(result.reason,/not immediate headcount or mailbox delivery/);
  for (const changed of [body.replace('Riyadh','London'),body.replace('RY_Entry-Level','RY_Experienced'),body.replace('</a>','Applications are closed</a>'),body.replace('</main>','New eligibility requirements</main>'),`<div hidden>${body}</div>`]) assert.equal(evaluateSource(record,{...response(changed),url:record.source_url},now).outcome,'verification_pending');
  assert.equal(evaluateSource(record,{...response(body+'<footer>Other role applications are closed</footer>'),url:record.source_url},now).outcome,'verified');
  assert.equal(productionEvaluator(record,{...response(body),url:record.source_url},now).outcome,'verification_pending','Production uses the full reviewed page hash, not the synthetic test digest.');
  assert.equal(evaluateSource({...record,record_kind:'advertised_opening'},{...response(body),url:record.source_url},now).outcome,'verification_pending');
  assert.equal(evaluateSource({...record,application_url:portal},{...response(body),url:record.source_url},now).outcome,'verification_pending');
});

test('end-to-end source evidence updates a proposal while failed/manual checks retain verification dates', async () => {
  let calls = 0;
  const manual = {...trainee,id:'manual-route',source_url:'https://manual.example/role'};
  const original = feed([trainee,coop,manual]);
  const result = await reviewFeed(original,{now,retrieve:async url => {calls++; return url===portal ? response(html) : {error:'Browser-only source'};},programmeFacts:async()=>({outcome:'verified',reason:'Controlled programme facts fixture.',evidence:[]})});
  assert.equal(calls,2,'Shared URL is fetched once per run.');
  assert.equal(result.feed.records[0].last_verified_at,new Date(now).toISOString());
  assert.equal(result.feed.records[0].application_check.checked_at,new Date(now).toISOString());
  assert.equal(result.feed.records[1].status,'closed');
  assert.equal(result.feed.records[1].last_verified_at,old,'Closure cannot renew open evidence.');
  assert.deepEqual(result.feed.records[2],manual,'Unsupported automatic check cannot erase human evidence.');
  assert.deepEqual(original,feed([trainee,coop,manual]),'Input feed is not mutated.');
  assert.equal(result.report.checks[2].applied,false);
  assert.match(reportMarkdown(result.report),/Draft proposal only/);
  assert.equal(result.feed.verification_window_hours,168);
  assert.equal(result.report.verification_window_hours,168);
  assert.match(reportMarkdown(result.report),/168 hours \(7 days\)/);
  const current = partitionRecords(result.feed.records,168,now);
  assert.equal(current.current.length,1); assert.equal(current.watch.length,1); assert.equal(current.archive.length,1);
  assert.equal(partitionRecords(result.feed.records,168,now+168*3600000).current.length,1,'A proposal remains current at exactly seven days.');
  assert.equal(partitionRecords(result.feed.records,168,now+168*3600000+1).current.length,0,'A proposal expires immediately after seven days.');
  const failed = await reviewFeed(feed([trainee]),{now,retrieve:async()=>({error:'HTTP transport unavailable'})});
  assert.equal(failed.feed.records[0].last_verified_at,old);
  assert.equal(failed.feed.records[0].status,'verification_pending');
  assert.equal(failed.feed.records[0].application_check.result,'unverified');
});

test('automatic source success cannot reopen an editorially closed record', async () => {
  const record = {...trainee,status:'closed'};
  const result = await reviewFeed(feed([record]),{now,retrieve:async()=>response(html)});
  assert.deepEqual(result.feed.records[0],record);
  assert.equal(result.report.checks[0].applied,false);
  assert.equal(result.report.checks[0].retained_status,'closed');
});

test('the configured seven-day policy accepts 168 hours and rejects the old 24-hour policy', async () => {
  let requests = 0;
  const retrieve = async()=>{ requests++; return {error:'Controlled transport failure'}; };
  const accepted = await reviewFeed(feed([trainee]),{now,retrieve});
  assert.equal(accepted.feed.verification_window_hours,168);
  assert.equal(accepted.report.verification_window_hours,168);
  assert.equal(accepted.feed.records[0].last_verified_at,old);
  assert.equal(requests,1);
  await assert.rejects(reviewFeed({...feed([trainee]),verification_window_hours:24},{now,retrieve}),/7-day \(168-hour\)/);
  assert.equal(requests,1,'Reject the wrong policy before retrieving sources or producing output.');
});

test('future or invalid evidence is rejected before output', async () => {
  await assert.rejects(reviewFeed(feed([{...trainee,last_verified_at:new Date(now+1).toISOString()}]),{now}),/future/);
  await assert.rejects(reviewFeed(feed([{...trainee,application_check:{checked_at:'invalid'}}]),{now}),/future/);
});

test('draft branch update refuses human work and leaves ready or unrelated PRs alone', () => {
  const pr = {isDraft:true,body:PR_MARKER};
  const bot = {email:'41898282+github-actions[bot]@users.noreply.github.com',subject:'chore: propose verified source refresh [automated]'};
  assert.doesNotThrow(()=>checkReviewOwnership(pr,[bot],['dist/opportunities.json','docs/latest-source-check.md']));
  assert.throws(()=>checkReviewOwnership({...pr,isDraft:false}),/refusing/);
  assert.throws(()=>checkReviewOwnership({...pr,body:'unrelated'}),/refusing/);
  assert.throws(()=>checkReviewOwnership(pr,[{...bot,email:'human@example.com'}]),/human/);
  assert.throws(()=>checkReviewOwnership(pr,[bot],['dist/app.js']),/outside/);
});

function proposalFixture({existing = false, validationFails = false, ready = false} = {}) {
  const calls = [];
  const execute = (command,args) => {
    calls.push({command,args});
    if (command === 'gh' && args[0] === 'pr' && args[1] === 'list') return JSON.stringify(args.includes('open') && existing ? [{number:23,isDraft:!ready,body:PR_MARKER}] : []);
    if (command === 'git' && args[0] === 'ls-remote') return existing ? `abcdef1234567890\trefs/heads/${REFRESH_BRANCH}` : '';
    if (command === 'git' && args[0] === 'log') return '41898282+github-actions[bot]@users.noreply.github.com\tchore: propose verified source refresh [automated]';
    if (command === 'git' && args[0] === 'diff') return 'dist/opportunities.json';
    if (command === 'node' && validationFails) throw new Error('Proposed feed failed validation');
    return '';
  };
  const files = {
    copyFile:async(...args)=>calls.push({command:'copyFile',args}),
    writeFile:async(...args)=>calls.push({command:'writeFile',args}),
    readFile:async()=>'Controlled source evidence'
  };
  const env = {GITHUB_REPOSITORY:'mrmohaamd-cmyk/Legal-Market-Monitor',GITHUB_REF:'refs/heads/main'};
  return {calls,options:{execute,files,env}};
}

test('new proposal validates first, uses an empty-branch lease and creates only a draft PR', async () => {
  const {calls,options} = proposalFixture();
  await proposeRefresh('controlled-results',options);
  const push = calls.findIndex(call=>call.command==='git' && call.args[0]==='push');
  const validation = calls.findIndex(call=>call.command==='node' && call.args[0]==='validate.mjs');
  assert(validation >= 0 && push > validation);
  assert.deepEqual(calls[push].args,['push',`--force-with-lease=refs/heads/${REFRESH_BRANCH}:`,'origin',`HEAD:refs/heads/${REFRESH_BRANCH}`]);
  const create = calls.find(call=>call.command==='gh' && call.args[1]==='create');
  assert(create.args.includes('--draft'));
  assert.equal(calls.filter(call=>call.args?.includes('merge') || call.args?.includes('deploy')).length,0);
});

test('existing draft is updated in place with the inspected remote SHA lease', async () => {
  const {calls,options} = proposalFixture({existing:true});
  await proposeRefresh('controlled-results',options);
  const push = calls.find(call=>call.command==='git' && call.args[0]==='push');
  assert(push.args.includes(`--force-with-lease=refs/heads/${REFRESH_BRANCH}:abcdef1234567890`));
  assert(calls.some(call=>call.command==='gh' && call.args[1]==='edit' && call.args[2]==='23'));
  assert(!calls.some(call=>call.command==='gh' && call.args[1]==='create'));
});

test('validation failure, ready-for-review or a fork prevents any remote mutation', async () => {
  for (const setting of [{validationFails:true},{existing:true,ready:true}]) {
    const {calls,options} = proposalFixture(setting);
    await assert.rejects(proposeRefresh('controlled-results',options));
    assert(!calls.some(call=>call.command==='git' && call.args[0]==='push'));
  }
  const {calls,options} = proposalFixture(); options.env.GITHUB_REPOSITORY='fork/Legal-Market-Monitor';
  await assert.rejects(proposeRefresh('controlled-results',options),/canonical/);
  assert.equal(calls.length,0);
});
