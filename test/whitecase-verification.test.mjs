import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createWhiteCaseFactsCheck,verifyWhiteCaseProgrammeFacts,WHITE_CASE_PROGRAMME_URL} from '../scripts/whitecase-verification.mjs';
const text = 'Controlled Saudi trainee programme facts and eligibility.';
const body = `<article class="section-landing-page">${text}</article>`;
const response = {url:WHITE_CASE_PROGRAMME_URL,status:200,contentType:'text/html',body};
const record = {firm_careers_url:WHITE_CASE_PROGRAMME_URL};
const checker = createWhiteCaseFactsCheck({articleHash:createHash('sha256').update(text).digest('hex')});
test('programme facts check requires the whole reviewed article, not a working portal alone',async()=>{
  assert.equal((await checker(record,{retrieve:async()=>response})).outcome,'verified');
  for(const r of [{...response,status:403},{...response,url:'https://example.com/'},{...response,body:body.replace('eligibility','changed eligibility')},{...response,body:`<div hidden>${body}</div>`},{...response,body:body+body},{...response,body:'<form>Email entry</form>'}]) assert.equal((await checker(record,{retrieve:async()=>r})).outcome,'verification_pending');
});
test('production programme checker cannot accept synthetic facts or an injected hash',async()=>{
  assert.equal((await verifyWhiteCaseProgrammeFacts(record,{retrieve:async()=>response,articleHash:createHash('sha256').update(text).digest('hex')})).outcome,'verification_pending');
});
