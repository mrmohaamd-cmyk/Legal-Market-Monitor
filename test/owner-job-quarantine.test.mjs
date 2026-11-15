import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {partitionOwnerJobs,validateOwnerJob,validateOwnerJobFeed} from '../contracts/owner-job.mjs';
import {digest} from '../contracts/reviewed-content.mjs';
import {compileOwnerJobFeed} from '../scripts/pipeline/owner-job-feed.mjs';
import {producerFixture} from './owner-job-producer-fixture.mjs';
const pinsent=JSON.parse(readFileSync(new URL('../config/saudilaw-owner-jobs.json',import.meta.url))).jobs.find(j=>j.id==='pinsent-masons-riyadh-coop-2027-01');
const boundary=Date.parse('2026-11-14T21:00:00Z');
test('Riyadh midnight boundary quarantines exact original without relaxing strict consumer',()=>{
 assert.equal(partitionOwnerJobs([pinsent],{now:boundary-1}).eligible.length,1);
 for(const now of [boundary,boundary+3600000]){
  const {eligible,quarantined}=partitionOwnerJobs([pinsent],{now});
  assert.equal(eligible.length,0);assert.deepEqual(quarantined[0].job,pinsent);
  assert.equal(quarantined[0].sha256,digest(pinsent));
  assert.throws(()=>validateOwnerJob(pinsent,{now}),/owner_job_upcoming_date/);
 }
});
test('malformed expired records and duplicate IDs still fail closed',()=>{
 const bad=structuredClone(pinsent);bad.sources[0].bodySha256='invalid';
 assert.throws(()=>partitionOwnerJobs([bad],{now:boundary}),/owner_job_source/);
 assert.throws(()=>partitionOwnerJobs([pinsent,pinsent],{now:boundary}),/producer_duplicate_job/);
});
test('mixed batch verifies independent item and retains expired item only in diagnostics',async()=>{
 const {job,retrieve}=producerFixture(),receipts=[];
 const feed=await compileOwnerJobFeed({jobs:[pinsent,job],retrieve,clock:()=>boundary,onQuarantined:q=>receipts.push(q)});
 assert.equal(feed.jobs.length,1);assert.equal(feed.jobs[0].sourceStatus,'verified');
 assert.equal(receipts.length,1);assert.deepEqual(receipts[0].job,pinsent);
 assert.equal(validateOwnerJobFeed(feed,{now:boundary}).jobs.length,1);
});
test('all quarantined yields valid empty feed with durable-sink requirement and no fetch',async()=>{
 const args={jobs:[pinsent],retrieve:()=>assert.fail('must not fetch'),clock:()=>boundary};
 await assert.rejects(compileOwnerJobFeed(args),/owner_job_upcoming_date/);
 const receipts=[],feed=await compileOwnerJobFeed({...args,onQuarantined:q=>receipts.push(q)});
 assert.deepEqual(feed.jobs,[]);assert.equal(receipts.length,1);
 assert.equal(validateOwnerJobFeed(feed,{now:boundary}).publicationEnabled,false);
});
test('crossing opening time during check cannot seal obsolete upcoming item',async()=>{
 let ticks=0;const receipts=[];
 const feed=await compileOwnerJobFeed({jobs:[pinsent],clock:()=>++ticks<3?boundary-1:boundary,retrieve:async()=>({error:'unavailable'}),onQuarantined:q=>receipts.push(q)});
 assert.deepEqual(feed.jobs,[]);assert.equal(receipts.length,1);
});
test('quarantine callback failure prevents a successful feed result',async()=>{
 await assert.rejects(compileOwnerJobFeed({jobs:[pinsent],retrieve:async()=>{},clock:()=>boundary,onQuarantined:()=>{throw Error('receipt_write_failed')}}),/receipt_write_failed/);
});
