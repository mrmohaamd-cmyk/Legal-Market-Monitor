import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {reviewLatham, createLathamReviewer, supportsLatham} from '../scripts/latham-verification.mjs';

const origin = 'https://eume-earlyassociatecareers-lw.icims.com';
const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function fixture(id = '11016') {
  const coop = id === '11016';
  const slug = coop ? 'general-opportunity%3A-graduate-training-program-%28coop%29---riyadh' : 'general-opportunity%3A-trainee-associate---riyadh';
  const title = coop ? 'General Opportunity: Graduate Training Program (COOP) - Riyadh' : 'General Opportunity: Trainee Associate - Riyadh';
  const prefix = `${origin}/jobs/${id}/${slug}`;
  const record = {id:coop ? 'latham-riyadh-graduate-coop' : 'latham-riyadh-trainee-associate', source_url:`${prefix}/job`,application_url:null,record_kind:'recruitment_route'};
  const frame = `${prefix}/job?in_iframe=1`;
  const apply = `${prefix}/job?mode=apply&apply=yes&in_iframe=1&hashed=-1834384612`;
  const login = `${prefix}/login?in_iframe=1`;
  const action = `${prefix}/login?step=email&in_iframe=1&hashed=-625915638`;
  const sections = ['Synthetic employer section.', 'Synthetic Saudi office section.', 'Synthetic role for talented students and graduates.', 'Synthetic recruiting contact.', 'Synthetic additional information.'];
  const testReview = createLathamReviewer({descriptionHashes:{[record.id]:createHash('sha256').update(JSON.stringify(sections)).digest('hex')}});
  const html = (url, body) => ({url,status:200,contentType:'text/html; charset=utf-8',body});
  const sourceResponse = html(record.source_url,`<noscript><iframe id="noscript_icims_content_iframe" src="${escape(frame)}"></iframe></noscript>`);
  const responses = new Map([
    [frame, html(frame, `<h1 class="iCIMS_Header">${escape(title)}</h1><div class="header left">Job Locations <span>| SA-Riyadh</span></div>${sections.map(section=>`<div class="iCIMS_InfoMsg iCIMS_InfoMsg_Job">${escape(section)}</div>`).join('')}<a class="iCIMS_ApplyOnlineButton" title="Apply" href="${escape(apply)}">Apply</a>`)],
    [apply, {url:apply,status:302,location:login,body:''}],
    [login, html(login, `<h1>Let's get started</h1><p>Enter your email to see if you have a Latham &amp; Watkins profile.</p><form id="enterEmailForm" class="iCIMS_SignIn" method="post" action="${escape(action)}"><input type="email" id="email" name="css_loginName"><input type="submit" id="enterEmailSubmitButton" value="Next"></form>`)]
  ]);
  const requests = [];
  const retrieve = async url => {requests.push(url); assert(responses.has(url),`Unexpected network destination: ${url}`); return responses.get(url);};
  const options = {sourceResponse,retrieve,now:Date.parse('2026-11-06T12:00:00Z')};
  const run = () => testReview(record,options);
  return {record,sourceResponse,responses,frame,apply,login,requests,run,options};
}

for (const id of ['11015','11016']) test(`audited ${id} wrapper → same-role Apply → email entry verifies recruitment route`, async () => {
  const f = fixture(id);
  assert(supportsLatham(f.record));
  const result = await f.run();
  assert.equal(result.outcome,'verified');
  assert.equal(result.result,'login_required');
  assert.deepEqual(f.requests,[f.frame,f.apply,f.login]);
  assert.equal(result.evidence.length,4);
  assert(result.evidence.every(item=>/^[a-f0-9]{64}$/.test(item.body_sha256)));
  assert.match(result.reason,/not immediate headcount/);
});

const cases = [
  ['different published URL',f=>{f.record.source_url+='?unreviewed=1';}],
  ['vacancy relabelling',f=>{f.record.record_kind='advertised_opening';}],
  ['wrapper failure',f=>{f.sourceResponse.status=503;}],
  ['cross-origin iframe',f=>{f.sourceResponse.body=f.sourceResponse.body.replace(origin,'https://example.com');}],
  ['other-job iframe',f=>{f.sourceResponse.body=f.sourceResponse.body.replaceAll('11016','99999');}],
  ['hidden iframe',f=>{f.sourceResponse.body=`<div hidden>${f.sourceResponse.body}</div>`;}],
  ['duplicate iframe',f=>{f.sourceResponse.body+=f.sourceResponse.body;}],
  ['frame failure',f=>{f.responses.get(f.frame).status=403;}],
  ['wrong role title',f=>{f.responses.get(f.frame).body=f.responses.get(f.frame).body.replace('General Opportunity: Graduate Training Program (COOP) - Riyadh','Different opportunity');}],
  ['wrong role location',f=>{f.responses.get(f.frame).body=f.responses.get(f.frame).body.replace('SA-Riyadh','AE-Dubai');}],
  ['changed description or eligibility',f=>{f.responses.get(f.frame).body=f.responses.get(f.frame).body.replace('talented students and graduates','qualified experienced partners');}],
  ['visible closure warning',f=>{f.responses.get(f.frame).body+='<p>This job is no longer available.</p>';}],
  ['closed-application warning',f=>{f.responses.get(f.frame).body+='<p>Applications are closed.</p>';}],
  ['hidden Apply button',f=>{f.responses.get(f.frame).body=f.responses.get(f.frame).body.replace('<a class=','<a hidden class=');}],
  ['cross-origin Apply action',f=>{f.responses.get(f.frame).body=f.responses.get(f.frame).body.replace(escape(f.apply),escape(f.apply.replace(origin,'https://example.com')));}],
  ['unexpected Apply parameter',f=>{f.responses.get(f.frame).body=f.responses.get(f.frame).body.replace('hashed=-1834384612','hashed=-1834384612&amp;redirect=external');}],
  ['off-origin redirect',f=>{f.responses.get(f.apply).location='https://example.com/login';}],
  ['generic login redirect',f=>{f.responses.get(f.apply).location=origin+'/jobs/login?in_iframe=1';}],
  ['other-job login redirect',f=>{f.responses.get(f.apply).location=f.login.replace('11016','99999');}],
  ['silent redirect following',f=>{f.responses.set(f.apply,{...f.responses.get(f.login)});}],
  ['login failure',f=>{f.responses.get(f.login).status=429;}],
  ['generic form action',f=>{f.responses.get(f.login).body=f.responses.get(f.login).body.replace('/jobs/11016/general-opportunity%3A-graduate-training-program-%28coop%29---riyadh/login','/jobs/login');}],
  ['hidden email form',f=>{f.responses.get(f.login).body=f.responses.get(f.login).body.replace('<form id=','<form hidden id=');}],
  ['disabled email field',f=>{f.responses.get(f.login).body=f.responses.get(f.login).body.replace('<input type="email"','<input disabled type="email"');}],
  ['disabled ancestor fieldset',f=>{f.responses.get(f.login).body=f.responses.get(f.login).body.replace('<input type="email"','<fieldset disabled><input type="email"').replace('</form>','</fieldset></form>');}],
  ['aria-disabled form',f=>{f.responses.get(f.login).body=f.responses.get(f.login).body.replace('<form id=','<form aria-disabled="true" id=');}],
  ['inert form ancestor',f=>{f.responses.get(f.login).body=`<div inert>${f.responses.get(f.login).body}</div>`;}],
  ['readonly email field',f=>{f.responses.get(f.login).body=f.responses.get(f.login).body.replace('<input type="email"','<input readonly type="email"');}],
  ['missing submit control',f=>{f.responses.get(f.login).body=f.responses.get(f.login).body.replace('enterEmailSubmitButton','wrongButton');}],
  ['disabled submit control',f=>{f.responses.get(f.login).body=f.responses.get(f.login).body.replace('<input type="submit"','<input disabled type="submit"');}],
  ['visible login closure warning',f=>{f.responses.get(f.login).body+='<p>The position has been filled.</p>';}]
];
for (const [name,change] of cases) test(`${name} cannot renew Latham evidence`,async()=>{
  const f=fixture(); change(f);
  const result=await f.run();
  assert.equal(result.outcome,'verification_pending');
  assert.equal(result.result,'unverified');
});

test('hidden and script-only closure templates do not overrule actual route evidence',async()=>{
  const f=fixture();
  f.responses.get(f.frame).body+='<div hidden>This job is no longer available.</div><script>const message="The position has been filled";</script>';
  assert.equal((await f.run()).outcome,'verified');
});

test('production reviewer rejects synthetic descriptions even if passed a hash override',async()=>{
  const f=fixture();
  const result=await reviewLatham(f.record,{...f.options,descriptionHashes:{[f.record.id]:'test-only'}});
  assert.equal(result.outcome,'verification_pending');
  assert.match(result.reason,/description changed/);
});
