import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createOperations } from '../reddit-bot/operations.mjs';
import { getLedgerStatus } from '../reddit-bot/lib/ledger.mjs';
import { RELEASE_POLICY } from '../reddit-bot/release-policy.mjs';
const feed = JSON.parse(await readFile(new URL('../dist/opportunities.json', import.meta.url)));
const now = Date.parse(feed.generated_at);
function fixture({community='saudilaw_jobs_dev',policy={productionPosting:true,privateTestPosting:true,bootstrapEmptyLedger:true},moderator=true,uncertain=false}={}) {
  const data=new Map(),posts=new Map(),jobs=[];const calls={submit:0,fetch:0,delete:0};
  const storage={get:async k=>data.get(k),set:async(k,v)=>{data.set(k,v);return 'OK'},compareAndSet:async(k,old,next)=>{if(data.get(k)!==old)return false;data.set(k,next);return true}};
  const context={subredditName:community,subredditId:'t5_private',userId:'t2_mod'};
  const scheduler={runJob:async job=>{jobs.push({...job,id:'job1'});return 'job1'},listJobs:async()=>jobs,cancelJob:async()=>{}};
  const ops=createOperations({policy,getContext:()=>context,authorizeModerator:async()=>moderator,
    getSetting:async key=>key!=='dryRun',storage,scheduler,readFeed:async()=>{calls.fetch++;return {feed:structuredClone(feed)}},clock:()=>now,
    getAppAuthorId:async()=> 't2_app',fetchPost:async id=>posts.get(id),
    submitVerified:async post=>{calls.submit++;posts.set('t3_test',{id:'t3_test',subredditName:community,authorId:'t2_app',text:post.text});if(uncertain)throw Error('accepted, reply lost');return {id:'t3_test'}},
    deleteOwnedPost:async id=>{calls.delete++;const state=await getLedgerStatus({storage,subreddit:community==='saudilaw'?'SaudiLaw':community,mode:community==='saudilaw'?'production':'private-test'});assert.equal(state.suppressedCount,1);posts.delete(id)}});
  return {ops,storage,calls,posts,jobs,context,data};
}
const initialize = ops => ops.form('jobsInitialize',{confirmation:'INITIALIZE NEW LEDGER'});
test('default release policy and caller fields cannot unlock posting or initialization',async()=>{
  const f=fixture({policy:RELEASE_POLICY});
  assert.match((await f.ops.form('jobsInitialize',{confirmation:'INITIALIZE NEW LEDGER',productionPosting:true})).showToast,/locked/);
  assert.match((await f.ops.form('jobsPrivateTest',{confirmation:'POST ONE PRIVATE TEST',privateTestPosting:true})).showToast,/locked/);
  assert.equal(f.data.size,0);assert.equal(f.calls.submit,0);
});
test('unauthorized member and foreign community cannot invoke any operation, even with exact confirmations',async()=>{
  for(const f of [fixture({moderator:false}),fixture({community:'saudilaw.evil'})]){
    for(const action of ['status','initialize','publish','start','stop','private-test','reconcile','remove','cancel-reservation'])assert.match((await f.ops.menu(action)).showToast,/moderator/);
    for(const name of ['jobsInitialize','jobsStart','jobsPrivateTest','jobsRemove','jobsReconcile'])assert.match((await f.ops.form(name,{confirmation:'POST ONE PRIVATE TEST'})).showToast,/moderator/);
    assert.equal(f.data.size,0);assert.equal(f.calls.submit+f.calls.delete,0);
  }
});
test('private test requires separate initialization and exact confirmation, ignores feed and posts at most once',async()=>{
  const f=fixture();
  assert.match((await f.ops.form('jobsPrivateTest',{confirmation:'POST ONE PRIVATE TEST'})).showToast,/uninitialized/);
  assert.match((await initialize(f.ops)).showToast,/initialized/);
  assert.match((await f.ops.form('jobsPrivateTest',{confirmation:'yes'})).showToast,/did not match/);
  await Promise.all(Array.from({length:25},()=>f.ops.form('jobsPrivateTest',{confirmation:'POST ONE PRIVATE TEST'})));
  assert.equal(f.calls.submit,1);assert.equal(f.calls.fetch,0);assert.equal(f.jobs.length,0);
  assert.match(f.posts.get('t3_test').text,/not a vacancy/);
  await f.ops.form('jobsPrivateTest',{confirmation:'POST ONE PRIVATE TEST'});assert.equal(f.calls.submit,1);
});
test('lost post reply pauses, positive reconciliation records it, and deletion suppresses before API call',async()=>{
  const f=fixture({uncertain:true});await initialize(f.ops);
  assert.match((await f.ops.form('jobsPrivateTest',{confirmation:'POST ONE PRIVATE TEST'})).showToast,/submission-uncertain/);
  const state=await getLedgerStatus({storage:f.storage,subreddit:'saudilaw_jobs_dev',mode:'private-test'});
  assert.equal(state.status,'paused');
  assert.match((await f.ops.form('jobsReconcile',{confirmation:'RECONCILE',attemptId:`SLJ2-${state.active.attemptId}`,postId:'t3_test'})).showToast,/posted/);
  assert.match((await f.ops.form('jobsRemove',{confirmation:'DELETE BOT POST',postId:'t3_test'})).showToast,/Deletion requested/);
  assert.equal(f.calls.delete,1);await f.ops.form('jobsPrivateTest',{confirmation:'POST ONE PRIVATE TEST'});assert.equal(f.calls.submit,1);
});
test('manual production form pins selected reviewed draft; altered fingerprints never submit',async()=>{
  const f=fixture({community:'saudilaw'});await initialize(f.ops);
  const form=(await f.ops.menu('publish')).showForm.form;
  const values=Object.fromEntries(form.fields.filter(x=>x.defaultValue).map(x=>[x.name,x.defaultValue]));
  assert.match((await f.ops.form('jobsPublish',{...values,digest:'0'.repeat(64),confirmation:`POST ${values.recordId}`})).showToast,/review-changed/);
  assert.equal(f.calls.submit,0);
  assert.match((await f.ops.form('jobsPublish',{...values,confirmation:`POST ${values.recordId}`})).showToast,/posted/);
  await f.ops.form('jobsPublish',{...values,confirmation:`POST ${values.recordId}`});assert.equal(f.calls.submit,1);
});
test('scheduling requires initialized state, does not post immediately, and rejects stale callbacks after Stop',async()=>{
  const f=fixture({community:'saudilaw'});
  assert.match((await f.ops.form('jobsStart',{confirmation:'START DAILY JOBS'})).showToast,/Initialize/);
  await initialize(f.ops);assert.match((await f.ops.form('jobsStart',{confirmation:'START DAILY JOBS'})).showToast,/scheduled/);
  assert.equal(f.calls.submit,0);const token=f.jobs[0].data.token;
  assert.equal((await f.ops.scheduled({token:'x'})).status,'schedule-paused');
  await f.ops.menu('stop');assert.equal((await f.ops.scheduled({token})).status,'schedule-paused');assert.equal(f.calls.submit,0);
});

test('an active scheduled generation uses the verified posting pipeline once under repeated concurrent callbacks',async()=>{
  const f=fixture({community:'saudilaw'});await initialize(f.ops);
  await f.ops.form('jobsStart',{confirmation:'START DAILY JOBS'});
  const token=f.jobs[0].data.token;
  const results=await Promise.all(Array.from({length:25},()=>f.ops.scheduled({token})));
  assert.equal(f.calls.submit,1);
  assert.equal(results.filter(result=>result.status==='posted').length,1);
  assert.equal((await f.ops.scheduled({token})).status,'daily-cap');
  assert.equal(f.calls.submit,1);
});
test('unrelated deletion events never persist or change the ledger',async()=>{
  const f=fixture();await initialize(f.ops);const before=[...f.data];
  assert.equal((await f.ops.deleted({type:'PostDelete',postId:'t3_other',author:{id:'t2_someone'}})).status,'ignored');
  assert.equal((await f.ops.deleted({type:'PostDelete',postId:'t3_other',author:{id:'t2_app'},subreddit:{id:'t5_wrong'}})).status,'ignored');
  assert.deepEqual([...f.data],before);
});

test('redacted deletion event retains retriable storage failure instead of silently acknowledging cleanup',async()=>{
  const f=fixture();f.storage.get=async()=>{throw Error('Redis unavailable')};
  assert.equal((await f.ops.deleted({type:'PostDelete',postId:'t3_test'})).status,'storage-uncertain');
});
