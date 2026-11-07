import test from 'node:test';
import assert from 'node:assert/strict';
import { startSchedule, stopSchedule, inspectSchedule, isScheduledRunAllowed, SCHEDULE_KEY } from '../reddit-bot/scheduling.mjs';
const memory = () => {
  const data = new Map();
  return { data, get: async key => data.get(key), compareAndSet: async (key, expected, next) => {
    if (data.get(key) !== expected) return false; data.set(key, next); return true;
  } };
};
test('schedule is locked by default and never allowed in the private community', async () => {
  const fail = () => { throw new Error('No effects'); };
  for (const input of [{subredditName:'SaudiLaw'}, {subredditName:'saudilaw_jobs_dev',permitted:true}]) {
    assert.equal((await startSchedule({...input,storage:{get:fail},scheduler:{runJob:fail}})).status,'locked');
  }
});
test('concurrent Start actions create one job and only matching callbacks are admitted', async () => {
  const storage = memory(); let calls=0; let token;
  const scheduler={runJob:async job=>{calls++;token=job.data.token;return 'job1'},cancelJob:async()=>{}};
  const results=await Promise.all(Array.from({length:20},()=>startSchedule({storage,scheduler,subredditName:'SaudiLaw',permitted:true})));
  assert.equal(calls,1);assert.equal(results.filter(x=>x.status==='scheduled').length,1);
  assert.equal(await isScheduledRunAllowed({storage,token}),true);
  assert.equal(await isScheduledRunAllowed({storage,token:'a'.repeat(32)}),token==='a'.repeat(32));
});
test('Stop wins against a delayed scheduler creation and stale callback never becomes active', async () => {
  const storage=memory(); let resolve; let token;const cancelled=[];
  const scheduler={runJob:job=>{token=job.data.token;return new Promise(r=>resolve=r)},listJobs:async()=>[],cancelJob:async id=>cancelled.push(id)};
  const starting=startSchedule({storage,scheduler,subredditName:'SaudiLaw',permitted:true});
  while(!resolve) await Promise.resolve();
  assert.equal((await stopSchedule({storage,scheduler})).status,'stopped');
  resolve('late-job');assert.equal((await starting).status,'schedule-superseded');
  assert.deepEqual(cancelled,['late-job']);assert.equal(await isScheduledRunAllowed({storage,token}),false);
});
test('unknown creation remains blocked until explicit Stop, and cancellation failure remains stopped',async()=>{
  const storage=memory();const scheduler={runJob:async()=>{throw Error('created but response lost')},listJobs:async()=>[{id:'unknown',name:'check-jobs'}],cancelJob:async()=>{throw Error('timeout')}};
  assert.equal((await startSchedule({storage,scheduler,subredditName:'SaudiLaw',permitted:true})).status,'schedule-uncertain');
  const pending=await inspectSchedule({storage});assert.equal(pending.state,'starting');
  assert.equal(await isScheduledRunAllowed({storage,token:pending.token}),false);
  assert.equal((await stopSchedule({storage,scheduler})).status,'stopped-cancellation-pending');
  assert.equal((await inspectSchedule({storage})).state,'paused');
});
test('malformed storage and unconfirmed stop are never reported as safe success',async()=>{
  const storage=memory();storage.data.set(SCHEDULE_KEY,'invalid');assert.equal((await inspectSchedule({storage})).state,'unknown');
  storage.compareAndSet=async()=>{throw Error('unavailable')};
  assert.equal((await stopSchedule({storage,scheduler:{listJobs:async()=>[]}})).status,'stop-uncertain');
});

test('Stop cleanup cannot cancel a new generation started after its pause was committed',async()=>{
  const storage=memory();const jobs=[];const cancelled=[];let releaseList;let listStarted;
  const reachedList=new Promise(r=>listStarted=r);
  const scheduler={runJob:async job=>{const id=`job${jobs.length+1}`;jobs.push({...job,id});return id},cancelJob:async id=>cancelled.push(id),
    listJobs:()=>{listStarted();return new Promise(r=>releaseList=r)}};
  await startSchedule({storage,scheduler,subredditName:'SaudiLaw',permitted:true});
  const stopping=stopSchedule({storage,scheduler});await reachedList;
  await startSchedule({storage,scheduler,subredditName:'SaudiLaw',permitted:true});releaseList([...jobs]);
  assert.equal((await stopping).status,'stop-superseded');assert.deepEqual(cancelled,['job1']);
  assert.equal(await isScheduledRunAllowed({storage,token:jobs[1].data.token}),true);
});
