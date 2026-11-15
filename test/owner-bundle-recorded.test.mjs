import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {digest} from '../contracts/reviewed-content.mjs';
import {checkRecordedOwnerBundles} from '../scripts/check-owner-bundles-recorded.mjs';
import {bundleFixture} from './owner-bundle-fixture.mjs';
import {PRODUCER_NOW} from './owner-job-producer-fixture.mjs';
async function setup(t){
 const root=await mkdtemp(join(tmpdir(),'wc-recorded-test-'));
 t.after(async()=>{if(!resolve(root).startsWith(resolve(tmpdir())+sep))throw Error('cleanup');await rm(root,{recursive:true,force:true});});
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 git(['init','--quiet']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','--quiet','-m','Synthetic fixture']);
 const f=bundleFixture(),capture=join(root,'capture'),out=join(root,'out');await mkdir(capture);await mkdir(join(root,'config'));
 await writeFile(join(root,'config/saudilaw-owner-bundles.json'),JSON.stringify({schema:'saudilaw-owner-bundle-input/v1',bundles:f.bundles}));
 const urls=[...new Set(f.bundles.flatMap(b=>b.jobs.flatMap(j=>j.sources.map(s=>s.url))))],manifest={};
 for(const [i,url] of urls.entries()){
  const body=f.bodies[url],key='source'+i;manifest[key]={url,finalUrl:url,status:200,checkedAt:new Date(PRODUCER_NOW-3600000-i*1000).toISOString(),bodySha256:f.hash(body),bodyBytes:Buffer.byteLength(body)};
  await writeFile(join(capture,key+'.html'),body);
 }
 await writeFile(join(capture,'retrieval.json'),JSON.stringify(manifest));
 await mkdir(join(root,'docs'));await writeFile(join(root,'docs/wc-programme-source-review-2026-11-15.json'),JSON.stringify({schema:'saudilaw-programme-source-review/v1',inputSha256:digest({schema:'saudilaw-owner-bundle-input/v1',bundles:f.bundles}),sources:Object.values(manifest)}));
 git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Reviewed synthetic capture']);
 return {root,capture,out,manifest,run:()=>checkRecordedOwnerBundles(out,capture,{root,clock:()=>PRODUCER_NOW})};
}
test('recorded intake preserves original source time and caps expiry, never labels a network check',async t=>{
 const s=await setup(t),report=await s.run(),feed=JSON.parse(await readFile(join(s.out,'owner-bundles.json'),'utf8'));
 assert.equal(report.networkCheckPerformed,false);assert.equal(report.evidenceMode,'recorded_public_source');
 for(const m of feed.bundles[0].members){assert.ok(Date.parse(m.checkedAt)<PRODUCER_NOW);assert.equal(Date.parse(m.expiresAt),Date.parse(m.checkedAt)+43200000);for(const p of m.proofs)assert.ok(Object.values(s.manifest).some(r=>r.url===p.url&&r.checkedAt===p.checkedAt));}
});
test('recorded intake rejects changed body, missing source, future and expired captures',async t=>{
 for(const kind of ['body','missing','future','expired']){
  const s=await setup(t);
  if(kind==='body')await writeFile(join(s.capture,'source0.html'),'changed');
  if(kind==='missing')delete s.manifest.source0;
  if(kind==='future')s.manifest.source0.checkedAt=new Date(PRODUCER_NOW+1).toISOString();
  if(kind==='expired')s.manifest.source0.checkedAt=new Date(PRODUCER_NOW-43200000).toISOString();
  await writeFile(join(s.capture,'retrieval.json'),JSON.stringify(s.manifest));
  await assert.rejects(s.run,/recorded_/);
 }
});

test('local receipt cannot refresh its own date even with a matching body hash',async t=>{
 const s=await setup(t);s.manifest.source0.checkedAt=new Date(PRODUCER_NOW-1).toISOString();
 await writeFile(join(s.capture,'retrieval.json'),JSON.stringify(s.manifest));
 await assert.rejects(s.run,/recorded_untrusted_receipt/);
});
test('manual recorded release preserves feed/receipt atomically and confirms remote bytes',async t=>{
 const {publishRecordedOwnerBundles}=await import('../scripts/publish-owner-bundles-recorded.mjs');
 const s=await setup(t);await s.run();
 const git=args=>execFileSync('git',args,{cwd:s.root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 git(['remote','add','origin','https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor.git']);
 const base=git(['rev-parse','HEAD']).trim();let remote=base,fetched='',pushes=0;
 const execute=args=>{if(args[0]==='ls-remote')return remote+'\trefs/heads/main\n';if(args[0]==='push'){pushes++;remote=args[2].split(':')[0];return '';}if(args[0]==='fetch'){fetched=remote;return '';}if(args[0]==='rev-parse'&&args[1]==='FETCH_HEAD')return fetched+'\n';if(args[0]==='show'&&args[1].startsWith('FETCH_HEAD:'))return git(['show',args[1].replace('FETCH_HEAD:',fetched+':')]);return git(args);};
 const env={GITHUB_REPOSITORY:'mrmohaamd-cmyk/Legal-Market-Monitor',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_SHA:base};
 const receipt=await publishRecordedOwnerBundles(s.out,{root:s.root,env,execute,clock:()=>PRODUCER_NOW});
 assert.equal(receipt.status,'confirmed');assert.equal(receipt.evidenceMode,'recorded_public_source');assert.equal(pushes,1);
 assert.deepEqual(git(['diff','--name-only',base,receipt.commit]).trim().split('\n'),['dist/saudilaw-owner-bundles-recorded-receipt.json','dist/saudilaw-owner-bundles.json']);
});
test('recorded release validation rejects timestamp laundering and unexpected report fields',async t=>{
 const {validateRecordedRelease}=await import('../scripts/publish-owner-bundles-recorded.mjs');
 const s=await setup(t),report=await s.run(),feed=JSON.parse(await readFile(join(s.out,'owner-bundles.json'),'utf8'));
 const input=JSON.parse(await readFile(join(s.root,'config/saudilaw-owner-bundles.json'),'utf8')),trustedBytes=await readFile(join(s.root,'docs/wc-programme-source-review-2026-11-15.json'),'utf8'),opts={base:report.sourceCommit,now:PRODUCER_NOW};
 assert.equal(validateRecordedRelease(feed,report,input,trustedBytes,opts),true);
 const altered=structuredClone(report);altered.provenance[0].checkedAt=new Date(PRODUCER_NOW).toISOString();
 assert.throws(()=>validateRecordedRelease(feed,altered,input,trustedBytes,opts),/provenance/);
 assert.throws(()=>validateRecordedRelease(feed,{...report,rawHtml:'must not be copied'},input,trustedBytes,opts),/shape/);
 await assert.rejects(()=>import('../scripts/publish-owner-bundles-recorded.mjs').then(m=>m.publishRecordedOwnerBundles(s.out,{env:{GITHUB_EVENT_NAME:'schedule'}})),/manual_workflow_required/);
});
