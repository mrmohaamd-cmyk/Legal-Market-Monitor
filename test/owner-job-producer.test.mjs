import test from 'node:test';
import assert from 'node:assert/strict';
import {compileOwnerJobFeed} from '../scripts/pipeline/owner-job-feed.mjs';
import {producerFixture,PRODUCER_NOW} from './owner-job-producer-fixture.mjs';
const clock=()=>PRODUCER_NOW;
test('new structured vacancy gets independent source receipts without any publication grant',async()=>{
 const {job,retrieve}=producerFixture(),feed=await compileOwnerJobFeed({jobs:[job],retrieve,clock});
 assert.equal(feed.publicationEnabled,false);assert.equal(feed.jobs[0].sourceStatus,'verified');assert.equal(feed.jobs[0].proofs.length,2);assert.equal(feed.jobs[0].job.id,job.id);assert.equal(feed.jobs[0].expiresAt,'2026-11-11T12:00:00.000Z');
});
test('changed source body is held and observed diagnostics cannot authorize it',async()=>{
 const {job,retrieve,bodies,source}=producerFixture();bodies[source]+='<p>Additional requirement</p>';const evidence=[];
 const feed=await compileOwnerJobFeed({jobs:[job],retrieve,clock,onSourceObserved:proof=>evidence.push(proof)});
 assert.equal(feed.jobs[0].reason,'source_fingerprint_changed');assert.equal(feed.jobs[0].checkedAt,null);assert.deepEqual(feed.jobs[0].proofs,[]);assert.equal(evidence.length,2);assert.notEqual(evidence[0].bodySha256,job.sources[0].bodySha256);
});
test('resealing a hash cannot substitute for required source text',async()=>{
 const {job,retrieve,bodies,source,hash}=producerFixture();bodies[source]=bodies[source].replace('Law degree required.','No qualifications shown.');job.sources[0].bodySha256=hash(bodies[source]);job.sources[0].bodyBytes=Buffer.byteLength(bodies[source]);
 const feed=await compileOwnerJobFeed({jobs:[job],retrieve,clock});assert.equal(feed.jobs[0].reason,'source_text_changed');
});
test('a generic employer page cannot verify an advertised role absent from its visible source',async()=>{
 const {job,retrieve,bodies,source,hash}=producerFixture();bodies[source]='<main>General careers information. Riyadh, Saudi Arabia. Law degree required.</main>';
 job.sources[0].bodySha256=hash(bodies[source]);job.sources[0].bodyBytes=Buffer.byteLength(bodies[source]);
 const feed=await compileOwnerJobFeed({jobs:[job],retrieve,clock});assert.equal(feed.jobs[0].reason,'source_text_changed');assert.deepEqual(feed.jobs[0].proofs,[]);
});
test('official title needs a full visible heading match and the official Saudi location',async()=>{
 for(const condition of ['paragraph','prefixed-heading','missing-location']){
  const {job,retrieve,bodies,source,hash}=producerFixture();
  if(condition==='paragraph')bodies[source]=bodies[source].replace('<h1>','<p>').replace('</h1>','</p>');
  if(condition==='prefixed-heading')bodies[source]=bodies[source].replace('<h1>Saudi','<h1>Senior Saudi');
  if(condition==='missing-location'){bodies[source]=bodies[source].replace('Riyadh, Saudi Arabia','London');job.sources[0].requiredText=['Saudi trainee 2027','Law degree required.'];}
  job.sources[0].bodySha256=hash(bodies[source]);job.sources[0].bodyBytes=Buffer.byteLength(bodies[source]);
  const feed=await compileOwnerJobFeed({jobs:[job],retrieve,clock});assert.equal(feed.jobs[0].reason,'source_text_changed');assert.deepEqual(feed.jobs[0].proofs,[]);
 }
});
test('the fixed Saudi city can appear without a country suffix but must be a whole word',async()=>{
 for(const city of ['Riyadh','NewRiyadh']){
  const {job,retrieve,bodies,source,hash}=producerFixture();bodies[source]=bodies[source].replace('Riyadh, Saudi Arabia',city);job.sources[0].requiredText=['Saudi trainee 2027','Law degree required.'];job.sources[0].bodySha256=hash(bodies[source]);job.sources[0].bodyBytes=Buffer.byteLength(bodies[source]);
  const feed=await compileOwnerJobFeed({jobs:[job],retrieve,clock});assert.equal(feed.jobs[0].sourceStatus,city==='Riyadh'?'verified':'attention_required');
 }
});
test('withdrawn White & Case programme is held independently of incoming aliases',async()=>{
 for(const heading of ['Saudi Law Trainee Program — 2027','Saudi Law Trainee Program']){
  const {job,retrieve,bodies,source,hash}=producerFixture();bodies[source]+=`<h2>${heading}</h2><p>March 2027 intake</p>`;
  job.sources[0].bodySha256=hash(bodies[source]);job.sources[0].bodyBytes=Buffer.byteLength(bodies[source]);job.id='white-case-another-editorial-alias';
  const feed=await compileOwnerJobFeed({jobs:[job],retrieve,clock});assert.equal(feed.jobs[0].reason,'withdrawn_listing_suppressed');assert.deepEqual(feed.jobs[0].proofs,[]);
 }
});
test('disabled application controls and explicit closure each hold the vacancy',async()=>{
 for(const condition of ['disabled','closed']){
  const {job,retrieve,bodies,application,source,hash}=producerFixture();const url=condition==='disabled'?application:source;
  bodies[url]=condition==='disabled'?bodies[url].replace('<form','<form disabled'):bodies[url]+'<p>Applications are closed</p>';
  const descriptor=job.sources.find(item=>item.url===url);descriptor.bodySha256=hash(bodies[url]);descriptor.bodyBytes=Buffer.byteLength(bodies[url]);
  const feed=await compileOwnerJobFeed({jobs:[job],retrieve,clock});assert.equal(feed.jobs[0].reason,condition==='disabled'?'application_controls_unverified':'source_closed');assert.deepEqual(feed.jobs[0].proofs,[]);
 }
});
test('redirects and unapproved domains cannot produce positive evidence',async()=>{
 const {job,retrieve}=producerFixture();let calls=0;
 const feed=await compileOwnerJobFeed({jobs:[job],retrieve:async url=>({...await retrieve(url),url:url+'?redirect=1'}),clock});assert.equal(feed.jobs[0].sourceStatus,'attention_required');
 job.sources[0].url='https://example.com/jobs';await assert.rejects(()=>compileOwnerJobFeed({jobs:[job],retrieve:async()=>{calls++;},clock}),/owner_job_source/);assert.equal(calls,0);
});
test('async caller mutation cannot replace the inspected job or approved source hash',async()=>{
 const {job,retrieve}=producerFixture(),id=job.id;
 const feed=await compileOwnerJobFeed({jobs:[job],retrieve:async url=>{job.id='replacement-id';job.weekly.role.en='Replacement copy';return retrieve(url);},clock});
 assert.equal(feed.jobs[0].job.id,id);assert.equal(feed.jobs[0].job.weekly.role.en,'Saudi trainee 2027');assert.equal(feed.jobs[0].sourceStatus,'verified');
});
test('browser DOM verification uses fixed projection without form interaction and always closes context',async()=>{
 const {job,retrieve,bodies}=producerFixture();job.sources.forEach(source=>source.kind='browser_dom');let closed=0,navigations=0,evaluations=0,current;
 const page={setDefaultTimeout(){},setDefaultNavigationTimeout(){},async goto(url){current=url;navigations++;return {status:()=>200};},url:()=>current,locator:selector=>{assert.equal(selector,'body');return {waitFor:async()=>{}};},async waitForFunction(fn,arg){assert.equal(fn.name,'waitForRequiredSourceText');assert.ok(Array.isArray(arg.phrases));},async evaluate(fn){assert.equal(fn.name,'projectVisibleHtml');evaluations++;return bodies[current];}};
 const browser={newContext:async()=>({newPage:async()=>page,close:async()=>{closed++;}})};
 const feed=await compileOwnerJobFeed({jobs:[job],retrieve,browser,clock});assert.equal(feed.jobs[0].sourceStatus,'verified');assert.equal(navigations,2);assert.equal(evaluations,2);assert.equal(closed,2);
});
test('only the existing A&O ATS fragment derived from the exact job query is accepted',async()=>{
 for(const fragment of ['#jobDetails=98119_5040','#jobDetails=99999_5040']){
  const {job,bodies,hash}=producerFixture(),oldSource=job.weekly.source_url,oldApplication=job.weekly.application_url;
  const source='https://careers.aoshearman.com/en/job/riyadh/synthetic-trainee/3392/123456',application='https://jobs.aoshearman.com/TGnewUI/Search/home/HomeWithPreLoad?PageType=JobDetails&partnerid=30147&siteid=5040&jobid=98119';
  job.employerKey='ao-shearman';job.id='ao-shearman-synthetic-fragment-fixture';job.weekly.employer={ar:'A&O Shearman',en:'A&O Shearman'};job.weekly.source_url=source;job.weekly.application_url=application;job.context.evidence[0].url=source;
  const normalized=value=>value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu,' ').trim();job.context.opportunityIdentity=hash('identity:'+['A&O Shearman',job.sourceIdentity.roleTitleEn,job.sourceIdentity.locationEn].map(normalized).join('|'));
  bodies[source]=bodies[oldSource];bodies[application]=bodies[oldApplication];job.sources[0].url=source;job.sources[1].url=application;job.sources.forEach(s=>s.kind='browser_dom');let current;
  const page={setDefaultTimeout(){},setDefaultNavigationTimeout(){},async goto(url){current=url;return {status:()=>200};},url:()=>current===application?application+fragment:current,locator:()=>({waitFor:async()=>{}}),waitForFunction:async()=>{},evaluate:async()=>bodies[current]};
  const browser={newContext:async()=>({newPage:async()=>page,close:async()=>{}})};
  const feed=await compileOwnerJobFeed({jobs:[job],retrieve:async()=>{throw Error('unexpected HTTP');},browser,clock});assert.equal(feed.jobs[0].sourceStatus,fragment==='#jobDetails=98119_5040'?'verified':'attention_required');
 }
});
test('expired editorial deadline and run budget produce attention rather than stale success',async()=>{
 const {job,retrieve}=producerFixture();let calls=0;
 const feed=await compileOwnerJobFeed({jobs:[job],retrieve,clock:()=>PRODUCER_NOW+(calls++>1?7*60000:0)});
 assert.equal(feed.jobs[0].reason,'run_budget');assert.deepEqual(feed.jobs[0].proofs,[]);
});
