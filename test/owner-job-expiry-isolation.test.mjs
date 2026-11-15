import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compileOwnerJobFeed} from '../scripts/pipeline/owner-job-feed.mjs';
import {validateOwnerJob,validateOwnerJobFeed} from '../contracts/owner-job.mjs';
import {digest} from '../contracts/reviewed-content.mjs';
const input=JSON.parse(await readFile(new URL('../config/saudilaw-owner-jobs.json',import.meta.url)));
const pinsent=()=>structuredClone(input.jobs.find(j=>j.employerKey==='pinsent-masons'));
const boundary=Date.parse('2026-11-14T21:00:00.000Z');
const hash=s=>createHash('sha256').update(s).digest('hex');
function healthySegal(){
 const job=structuredClone(input.jobs.find(j=>j.employerKey==='segal')),bodies={};
 for(const s of job.sources){
  const body=`<main><h1>${job.sourceIdentity.roleTitleEn}</h1><p>Riyadh, Saudi Arabia</p><p>${s.requiredText.join(' ')}</p>`+(s.role==='application'?'<form><input type="email"><input type="file"><button type="submit">Submit</button></form>':'')+'</main>';
  s.kind='http_html';s.bodySha256=hash(body);s.bodyBytes=Buffer.byteLength(body);bodies[s.url]=body;
 }
 return {job,bodies};
}
test('expired upcoming Pinsent is held without reads while independent Segal evidence renews',async()=>{
 const expired=pinsent(),before=structuredClone(expired),{job,bodies}=healthySegal(),reads=[];
 const feed=await compileOwnerJobFeed({jobs:[expired,job],clock:()=>boundary,retrieve:async url=>{reads.push(url);assert.ok(bodies[url]);return {url,status:200,contentType:'text/html',body:bodies[url],body_sha256:hash(bodies[url]),body_bytes:Buffer.byteLength(bodies[url])};}});
 assert.equal(feed.publicationEnabled,false);assert.equal(feed.jobs[0].sourceStatus,'attention_required');assert.equal(feed.jobs[0].reason,'upcoming_requires_reverification');
 assert.deepEqual(feed.jobs[0].job,before);assert.deepEqual(feed.jobs[0].proofs,[]);for(const k of ['checkedAt','expiresAt','applicationResult'])assert.equal(feed.jobs[0][k],null);
 assert.equal(feed.jobs[1].sourceStatus,'verified');assert.equal(feed.jobs[1].proofs.length,2);assert.equal(reads.length,2);validateOwnerJobFeed(feed,{now:boundary});
 const forged=structuredClone(feed);forged.jobs[0].sourceStatus='verified';const {sha256,...payload}=forged;forged.sha256=digest(payload);
 assert.throws(()=>validateOwnerJobFeed(forged,{now:boundary}),/owner_job_upcoming_date/);
});
test('strict content admission retains opening-date cutoff; structural expiry allowance is explicit',()=>{
 assert.doesNotThrow(()=>validateOwnerJob(pinsent(),{now:boundary-1}));
 for(const now of [boundary,boundary+1]){
  assert.throws(()=>validateOwnerJob(pinsent(),{now}),/owner_job_upcoming_date/);
  assert.doesNotThrow(()=>validateOwnerJob(pinsent(),{now,allowExpired:true}));
 }
});
test('malformed upcoming data still fails closed before any source read',async()=>{
 for(const mutate of [j=>j.availability.opensOn='not-a-date',j=>j.availability.status='open',j=>j.sources[0].url='https://example.com/unapproved']){
  const job=pinsent();mutate(job);let reads=0;
  await assert.rejects(compileOwnerJobFeed({jobs:[job],clock:()=>boundary,retrieve:async()=>{reads++;throw Error('unexpected');}}));assert.equal(reads,0);
 }
});
