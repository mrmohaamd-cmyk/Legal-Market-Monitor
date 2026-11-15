import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {digest} from '../contracts/reviewed-content.mjs';
import {compileOwnerBundleFeed} from '../scripts/pipeline/owner-bundle-feed.mjs';
import {publishOwnerBundles} from '../scripts/publish-owner-bundles.mjs';
import {PRODUCER_NOW} from './owner-job-producer-fixture.mjs';
import {bundleFixture} from './owner-bundle-fixture.mjs';
async function setup(t,{pushMode='normal'}={}){
 const root=await mkdtemp(join(tmpdir(),'saudilaw-owner-publish-'));
 t.after(async()=>{const absolute=resolve(root),parent=resolve(tmpdir())+sep;if(!absolute.startsWith(parent)||!absolute.slice(parent.length).startsWith('saudilaw-owner-publish-'))throw Error('unsafe_cleanup');await rm(absolute,{recursive:true});});
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}),input={schema:'saudilaw-owner-bundle-input/v1',bundles:bundleFixture().bundles};
 git(['init','-b','main']);git(['remote','add','origin','https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor.git']);
 await mkdir(join(root,'config'));await writeFile(join(root,'config/saudilaw-owner-bundles.json'),JSON.stringify(input,null,2)+'\n');git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','Synthetic fixture only']);
 const base=git(['rev-parse','HEAD']).trim();let remote=base,fetched=null,pushes=0;
 const execute=args=>{
  if(args[0]==='ls-remote')return `${remote}\trefs/heads/main\n`;
  if(args[0]==='push'){pushes++;if(pushMode!=='unconfirmed')remote=args[2].split(':')[0];if(pushMode!=='normal')throw Error('simulated lost acknowledgement');return '';}
  if(args[0]==='fetch'){fetched=remote;return '';}
  if(args[0]==='rev-parse'&&args[1]==='FETCH_HEAD')return fetched+'\n';
  if(args[0]==='show'&&args[1].startsWith('FETCH_HEAD:'))return git(['show',args[1].replace('FETCH_HEAD:',fetched+':')]);
  return git(args);
 };
 const directory=join(root,'check'),ownerJobDirectory=join(root,'coverage');await mkdir(directory);await mkdir(ownerJobDirectory);
 const {retrieve}=bundleFixture(),feed=await compileOwnerBundleFeed({bundles:input.bundles,retrieve,clock:()=>PRODUCER_NOW});
 const report={schema:'saudilaw-owner-bundle-check/v1',sourceCommit:base,workflowSourceCommit:base,inputPath:'config/saudilaw-owner-bundles.json',inputSha256:digest(input),feedSha256:feed.sha256,generatedAt:feed.generatedAt,publicationEnabled:false};
 await writeFile(join(directory,'owner-bundles.json'),JSON.stringify(feed,null,2)+'\n');await writeFile(join(directory,'owner-bundle-check.json'),JSON.stringify(report,null,2)+'\n');
 await writeFile(join(ownerJobDirectory,'owner-jobs-write-receipt.json'),JSON.stringify({status:'unchanged',commit:base,publicationEnabled:false}));
 const env={GITHUB_REPOSITORY:'mrmohaamd-cmyk/Legal-Market-Monitor',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'schedule',GITHUB_SHA:base};
 return {root,directory,ownerJobDirectory,env,execute,git,base,report,feed,getPushes:()=>pushes,setRemote:value=>remote=value};
}
test('workflow writer changes only fixed nonpublishing data and independently confirms remote bytes',async t=>{
 const s=await setup(t),receipt=await publishOwnerBundles(s.directory,{...s,clock:()=>PRODUCER_NOW});
 assert.equal(receipt.status,'confirmed');assert.equal(receipt.publicationEnabled,false);assert.equal(s.getPushes(),1);assert.equal(s.git(['diff','--name-only',s.base,receipt.commit]).trim(),'dist/saudilaw-owner-bundles.json');
 const publicFeed=JSON.parse(await readFile(join(s.root,'dist/saudilaw-owner-bundles.json'),'utf8'));assert.equal(publicFeed.publicationEnabled,false);assert.equal(publicFeed.bundles[0].members[0].sourceStatus,'verified');
});
test('main input-change event retains the same fixed nonpublishing write boundary',async t=>{
 const s=await setup(t);s.env.GITHUB_EVENT_NAME='push';
 const receipt=await publishOwnerBundles(s.directory,{...s,clock:()=>PRODUCER_NOW});
 assert.equal(receipt.status,'confirmed');assert.equal(receipt.publicationEnabled,false);assert.equal(s.getPushes(),1);
});
test('lost push acknowledgement is accepted only after positive remote confirmation; no retry',async t=>{
 for(const pushMode of ['lost-ack','unconfirmed']){
  const s=await setup(t,{pushMode});
  if(pushMode==='lost-ack'){const receipt=await publishOwnerBundles(s.directory,{...s,clock:()=>PRODUCER_NOW});assert.equal(receipt.pushAcknowledged,false);assert.equal(receipt.status,'confirmed');}
  else await assert.rejects(()=>publishOwnerBundles(s.directory,{...s,clock:()=>PRODUCER_NOW}),/push_unconfirmed_no_retry/);
  assert.equal(s.getPushes(),1);
 }
});
test('wrong workflow, source digest mismatch and moved main reject before publication',async t=>{
 for(const condition of ['workflow','input','remote']){
  const s=await setup(t);
  if(condition==='workflow')s.env.GITHUB_EVENT_NAME='pull_request';
  if(condition==='input'){s.report.inputSha256='0'.repeat(64);await writeFile(join(s.directory,'owner-bundle-check.json'),JSON.stringify(s.report));}
  if(condition==='remote')s.setRemote('a'.repeat(40));
  await assert.rejects(()=>publishOwnerBundles(s.directory,{...s,clock:()=>PRODUCER_NOW}));assert.equal(s.getPushes(),0);
 }
});
test('unrelated workflow parent code changes and stale evidence reject without push',async t=>{
 const s=await setup(t);await writeFile(join(s.root,'changed-code.mjs'),'// unrelated\n');s.git(['add','changed-code.mjs']);s.git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','Unrelated synthetic change']);const changed=s.git(['rev-parse','HEAD']).trim();s.setRemote(changed);
 await writeFile(join(s.ownerJobDirectory,'owner-jobs-write-receipt.json'),JSON.stringify({status:'confirmed',commit:changed,publicationEnabled:false}));
 await assert.rejects(()=>publishOwnerBundles(s.directory,{...s,clock:()=>PRODUCER_NOW}),/unexpected_workflow_parent/);assert.equal(s.getPushes(),0);
 const fresh=await setup(t);await assert.rejects(()=>publishOwnerBundles(fresh.directory,{...fresh,clock:()=>PRODUCER_NOW+13*3600000}),/owner_job_feed_freshness/);assert.equal(fresh.getPushes(),0);
});
test('unrelated owner-job check failure permits only unchanged positively confirmed coverage base',async t=>{
 const s=await setup(t);
 await rm(join(s.ownerJobDirectory,'owner-jobs-write-receipt.json'));
 const coverageDirectory=join(s.root,'coverage-fallback');await mkdir(coverageDirectory);
 await writeFile(join(coverageDirectory,'coverage-write-receipt.json'),JSON.stringify({status:'confirmed',commit:s.base,publicationEnabled:false}));
 const receipt=await publishOwnerBundles(s.directory,{...s,coverageDirectory,clock:()=>PRODUCER_NOW});
 assert.equal(receipt.status,'confirmed');assert.equal(s.getPushes(),1);
});
test('missing owner-job receipt never authorizes replacing an uncertain moved main',async t=>{
 const s=await setup(t);
 await rm(join(s.ownerJobDirectory,'owner-jobs-write-receipt.json'));
 const coverageDirectory=join(s.root,'coverage-fallback');await mkdir(coverageDirectory);
 await writeFile(join(coverageDirectory,'coverage-write-receipt.json'),JSON.stringify({status:'confirmed',commit:s.base,publicationEnabled:false}));
 s.setRemote('b'.repeat(40));
 await assert.rejects(()=>publishOwnerBundles(s.directory,{...s,coverageDirectory,clock:()=>PRODUCER_NOW}),/main_moved_or_dirty/);assert.equal(s.getPushes(),0);
});
