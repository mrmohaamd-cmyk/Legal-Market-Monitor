import test from 'node:test';
import assert from 'node:assert/strict';
import {createRedditAdapters} from '../reddit-bot/reddit-adapters.mjs';
function mock(){
  const context={appSlug:'saudilaw-jobs',subredditName:'saudilaw_jobs_dev',userId:'t2_mod'};let submits=0,deletes=0;
  const post={id:'t3_one',subredditName:'saudilaw_jobs_dev',authorId:'t2_app',title:'test',body:`SaudiLaw Jobs attempt: SLJ2-${'a'.repeat(32)}`,delete:async()=>deletes++};
  const reddit={getAppUser:async()=>({id:'t2_app',username:'saudilaw-jobs'}),getCurrentUser:async()=>({id:'t2_mod',username:'moderator',isModerator:true}),
    getModerators:()=>({get:async()=>[{id:'t2_mod',moderatorInfo:{modPermissions:['posts']}}]}),getPostById:async()=>post,
    submitPost:async p=>{submits++;assert.equal(p.runAs,'APP');assert.equal(p.sendreplies,false);return{id:'t3_one'}}};
  return{context,post,reddit,adapter:createRedditAdapters({reddit,getContext:()=>context}),counts:()=>({submits,deletes})};
}
test('current-community post permission required; being a moderator elsewhere is insufficient',async()=>{
  const f=mock();assert.equal(await f.adapter.authorizeModerator(),true);
  f.reddit.getModerators=()=>({get:async()=>[]});assert.equal(await f.adapter.authorizeModerator(),false);
  f.reddit.getModerators=()=>({get:async()=>[{id:'t2_mod',moderatorInfo:{modPermissions:['wiki']}}]});assert.equal(await f.adapter.authorizeModerator(),false);
  f.context.userId=undefined;assert.equal(await f.adapter.authorizeModerator(),false);
});
test('submission pins context, APP identity, title and body; readback failure is not retried',async()=>{
  const f=mock();const input={subredditName:'saudilaw_jobs_dev',runAs:'APP',title:'test',text:f.post.body};
  assert.deepEqual(await f.adapter.submitVerified(input),{id:'t3_one'});
  await assert.rejects(()=>f.adapter.submitVerified({...input,subredditName:'SaudiLaw'}));assert.equal(f.counts().submits,1);
  f.reddit.getPostById=async()=>{throw Error('hydration timeout')};await assert.rejects(()=>f.adapter.submitVerified(input));assert.equal(f.counts().submits,2);
});
test('deletion refuses foreign author/community/reference and deletes as app only after verification',async()=>{
  const f=mock();await f.adapter.deleteOwnedPost('t3_one');assert.equal(f.counts().deletes,1);
  f.post.authorId='t2_other';await assert.rejects(()=>f.adapter.deleteOwnedPost('t3_one'));
  f.post.authorId='t2_app';f.post.body='No marker';await assert.rejects(()=>f.adapter.deleteOwnedPost('t3_one'));assert.equal(f.counts().deletes,1);
});
