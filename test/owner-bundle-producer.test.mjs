import test from 'node:test';
import assert from 'node:assert/strict';
import {producerFixture,PRODUCER_NOW} from './owner-job-producer-fixture.mjs';
import {recordHashes,ownerJobRecord} from '../contracts/owner-job.mjs';
import {compileOwnerBundleFeed} from '../scripts/pipeline/owner-bundle-feed.mjs';
import {compileOwnerJobFeed} from '../scripts/pipeline/owner-job-feed.mjs';
import {ownerBundleModel} from '../contracts/owner-bundle.mjs';
import {bundleFixture as fixture} from './owner-bundle-fixture.mjs';
const options=f=>({...f,clock:()=>PRODUCER_NOW});
test('three source-proven members compile only to independent review feed',async()=>{
 const f=fixture(),feed=await compileOwnerBundleFeed(options(f));
 assert.equal(feed.publicationEnabled,false);assert.equal(feed.bundles[0].members.length,3);
 const model=ownerBundleModel(feed.bundles[0],{now:PRODUCER_NOW,generatedAt:feed.generatedAt,expiresAt:feed.expiresAt});
 assert.equal(model.members[0].identityHash,f.bundles[0].jobs[0].context.opportunityIdentity);
 assert.equal(model.members.length,3);
 const legacy=await compileOwnerJobFeed({...options(f),jobs:f.bundles[0].jobs});
 assert.equal(legacy.jobs[0].reason,'withdrawn_listing_suppressed');
});
test('source drift preserves all members and holds publication model',async()=>{
 const f=fixture();f.bodies[f.bundles[0].jobs[1].weekly.source_url]+='changed';
 const feed=await compileOwnerBundleFeed(options(f));
 assert.equal(feed.bundles[0].members[1].reason,'source_fingerprint_changed');
 assert.throws(()=>ownerBundleModel(feed.bundles[0],{now:PRODUCER_NOW,generatedAt:feed.generatedAt,expiresAt:feed.expiresAt}),/source_held/);
});
test('incomplete and duplicate jobs fail before fetching',async()=>{
 const f=fixture();let fetched=0;f.retrieve=async()=>{fetched++;throw Error('unexpected');};
 f.bundles[0].jobs.pop();await assert.rejects(()=>compileOwnerBundleFeed(options(f)),/members/);assert.equal(fetched,0);
});
test('duplicate canonical identities cannot be laundered by bundle',async()=>{
 const f=fixture();f.bundles[0].jobs[2]=structuredClone(f.bundles[0].jobs[1]);f.bundles[0].jobs[2].id='other-id';
 await assert.rejects(()=>compileOwnerBundleFeed(options(f)));
});
test('caller mutation during evidence capture cannot change reviewed copy',async()=>{
 const f=fixture(),retrieve=f.retrieve;f.retrieve=async url=>{f.bundles[0].title.en='mutated';return retrieve(url);};
 const feed=await compileOwnerBundleFeed(options(f));assert.equal(feed.bundles[0].title.en,'Synthetic test only.');
});
test('duplicate source definitions reject before redundant requests',async()=>{
 const f=fixture(),base=f.bundles[0];f.bundles=[];
 for(let i=0;i<4;i++){
  const b=structuredClone(base);b.id+='-'+i;
  for(const j of b.jobs){j.id+='-'+i;j.sources.push(structuredClone(j.sources[0]),structuredClone(j.sources[0]));}
  f.bundles.push(b);
 }
 // Duplicate per-job source definitions are rejected by the canonical contract,
 // rather than allowing redundant source requests to evade the bounded budget.
 await assert.rejects(()=>compileOwnerBundleFeed(options(f)));
});
test('five bundles are rejected before a source request',async()=>{
 const f=fixture();f.bundles=Array.from({length:5},(_,i)=>({...structuredClone(f.bundles[0]),id:'bundle-'+i}));
 let calls=0;f.retrieve=async()=>{calls++;throw Error('unexpected');};
 await assert.rejects(()=>compileOwnerBundleFeed(options(f)),/input/);assert.equal(calls,0);
});
