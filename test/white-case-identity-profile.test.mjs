import test from 'node:test';
import assert from 'node:assert/strict';
import {producerFixture,PRODUCER_NOW} from './owner-job-producer-fixture.mjs';
import {bundleFixture} from './owner-bundle-fixture.mjs';
import {WHITE_CASE_IDENTITY_PROFILE,WHITE_CASE_PROGRAMMES} from '../contracts/white-case-identity.mjs';
import {ownerJobRecord,recordHashes,validateOwnerJob} from '../contracts/owner-job.mjs';
import {compileOwnerJobFeed,projectHttpVisibleText} from '../scripts/pipeline/owner-job-feed.mjs';
import {compileOwnerBundleFeed} from '../scripts/pipeline/owner-bundle-feed.mjs';
function profileFixture(){
 const f=producerFixture(),bundle=bundleFixture().bundles[0],bodies={};
 const profiles=Object.entries(WHITE_CASE_PROGRAMMES);
 for(const [,p] of profiles)bodies[p.sourceUrl]=(bodies[p.sourceUrl]??'')+'<main><h3>'+p.programmeHeading+'</h3><p>Riyadh</p><p>Law degree required.</p></main>';
 const app=f.application;bodies[app]='<main><form><input type="hidden" value="rotating-nonce"><input type="email"><button type="submit">Continue</button></form>'+profiles.map(([,p])=>'<div>'+p.applicationText+'</div>').join('')+'</main>';
 bundle.jobs=profiles.map(([id,p])=>{
  const job=structuredClone(f.job);job.id=id;job.identityEvidenceProfile=WHITE_CASE_IDENTITY_PROFILE;
  job.sourceIdentity.roleTitleEn=p.roleTitleEn;job.weekly.role.en=p.roleTitleEn;job.weekly.source_url=p.sourceUrl;
  job.weekly.opportunity_summary={ar:'تفاصيل تجريبية للبرنامج.',en:'Synthetic programme evidence fixture.'};
  job.context.opportunityIdentity=recordHashes(ownerJobRecord(job)).identityHash;
  job.context.reviewContext.suppressed=p.retainSuppression;
  job.context.evidence[0].url=p.sourceUrl;
  job.sources=[{url:p.sourceUrl,role:'programme',kind:'http_visible_text',requiredText:[p.programmeHeading,'Riyadh']},{url:app,role:'application',kind:'http_visible_text',requiredText:[p.applicationText]}].map(s=>({...s,bodySha256:f.hash(projectHttpVisibleText(bodies[s.url])),bodyBytes:Buffer.byteLength(projectHttpVisibleText(bodies[s.url]))}));
  return job;
 });
 const retrieve=async url=>({url,status:200,contentType:'text/html',body:bodies[url],body_sha256:f.hash(bodies[url]),body_bytes:Buffer.byteLength(bodies[url])});
 return {bundles:[bundle],bodies,retrieve,clock:()=>PRODUCER_NOW,hash:f.hash};
}
test('fixed profile proves each canonical identity from paired official programme and portal without clearing suppression',async()=>{
 const f=profileFixture(),feed=await compileOwnerBundleFeed(f);
 assert.ok(feed.bundles[0].members.every(m=>m.sourceStatus==='verified'));
 assert.equal(feed.bundles[0].members[0].job.context.reviewContext.suppressed,true);
 assert.equal(recordHashes(ownerJobRecord(feed.bundles[0].members[0].job)).identityHash,recordHashes({id:'white-case-saudi-law-trainee-2027',firm_name:'White & Case',role_title:'Saudi Law Trainee Program 2027',location:'Riyadh, Saudi Arabia'}).identityHash);
 const legacy=await compileOwnerJobFeed({...f,jobs:f.bundles[0].jobs});
 assert.equal(legacy.jobs[0].reason,'withdrawn_listing_suppressed');
});
test('profile never admits invented identity, source, intake, evidence or unrelated suppression',()=>{
 for(const mutate of [j=>j.id+='-new',j=>j.sourceIdentity.roleTitleEn+=' changed',j=>j.sourceIdentity.intakeStartOn='2027-03-01',j=>j.weekly.source_url+='-new',j=>j.sources[1].requiredText=['Continue'],j=>delete j.identityEvidenceProfile]){
  const j=profileFixture().bundles[0].jobs[0];mutate(j);assert.throws(()=>validateOwnerJob(j,{now:PRODUCER_NOW}));
 }
 const other=profileFixture().bundles[0].jobs[1];other.context.reviewContext.suppressed=true;
 assert.throws(()=>validateOwnerJob(other,{now:PRODUCER_NOW}),/suppression/);
 const saudi=profileFixture().bundles[0].jobs[0];saudi.context.reviewContext.suppressed=false;assert.throws(()=>validateOwnerJob(saudi,{now:PRODUCER_NOW}),/suppression/);
});
test('rotating hidden form nonce is ignored but live controls must still exist',async()=>{
 const f=profileFixture(),app=f.bundles[0].jobs[0].weekly.application_url;
 f.bodies[app]=f.bodies[app].replace('rotating-nonce','next-nonce');
 let feed=await compileOwnerBundleFeed(f);assert.ok(feed.bundles[0].members.every(m=>m.sourceStatus==='verified'));
 f.bodies[app]=f.bodies[app].replace('type="email"','type="hidden"');
 feed=await compileOwnerBundleFeed(f);assert.ok(feed.bundles[0].members.every(m=>m.reason==='application_controls_unverified'));
});
test('changed exact portal row holds every affected member even if profile programme headings remain',async()=>{
 const f=profileFixture(),app=f.bundles[0].jobs[0].weekly.application_url;
 f.bodies[app]=f.bodies[app].replace('March 2027','April 2027');
 const feed=await compileOwnerBundleFeed(f);assert.ok(feed.bundles[0].members.every(m=>m.reason==='source_fingerprint_changed'));
});
