// Execute the real workflow entrypoint with an empty local input. This verifies
// its full import graph without network, browser tooling or remote writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
test('actual owner-check CLI loads its production dependencies and emits an empty nonpublishing feed',async()=>{
  const base=resolve(tmpdir()),root=await mkdtemp(join(base,'saudilaw-owner-cli-'));
  try{
    const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    git(['init','--quiet']);git(['-c','user.name=OwnerCLI-Test','-c','user.email=fixture@example.invalid','commit','--allow-empty','--quiet','-m','Synthetic local fixture']);
    await mkdir(join(root,'config'));await writeFile(join(root,'config','saudilaw-owner-bundles.json'),JSON.stringify({schema:'saudilaw-owner-bundle-input/v1',bundles:[]}));
    const output=join(root,'result'),stdout=execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/check-owner-bundles.mjs',import.meta.url)),output],{cwd:root,encoding:'utf8',env:{...process.env,PLAYWRIGHT_MODULE:'',GITHUB_SHA:''}});
    assert.equal(JSON.parse(stdout.trim()).publicationEnabled,false);
    const feed=JSON.parse(await readFile(join(output,'owner-bundles.json'),'utf8')),report=JSON.parse(await readFile(join(output,'owner-bundle-check.json'),'utf8'));
    assert.deepEqual(feed.bundles,[]);assert.equal(feed.publicationEnabled,false);assert.equal(report.sourceCommit,git(['rev-parse','HEAD']).trim());assert.equal(report.feedSha256,feed.sha256);
  }finally{if(!resolve(root).startsWith(base+sep))throw Error('Unsafe fixture cleanup');await rm(root,{recursive:true,force:true});}
});
test('nonempty checker uses valid bounded transport settings and records concrete failure without publication',async()=>{
 const {runOwnerBundleCheck}=await import('../scripts/check-owner-bundles.mjs');
 const {bundleFixture}=await import('./owner-bundle-fixture.mjs');
 const {PRODUCER_NOW}=await import('./owner-job-producer-fixture.mjs');
 const {createTransport}=await import('../scripts/pipeline/transport.mjs');
 const root=await mkdtemp(join(tmpdir(),'saudilaw-owner-cli-nonempty-'));
 try{
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  git(['init','--quiet']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','--quiet','-m','Synthetic fixture']);
  await mkdir(join(root,'config'));await writeFile(join(root,'config/saudilaw-owner-bundles.json'),JSON.stringify({schema:'saudilaw-owner-bundle-input/v1',bundles:bundleFixture().bundles}));
  const report=await runOwnerBundleCheck(join(root,'out'),{root,env:{},clock:()=>PRODUCER_NOW,transportFactory:settings=>{
   createTransport(settings); // Validate the actual production settings without issuing a request.
   return async url=>({url,status:null,error:'synthetic_timeout'});
  }});
  assert.ok(report.bundles[0].members.every(m=>m.sourceStatus==='attention_required'));
  assert.equal(report.transportFailures.length,6);assert.equal(report.transportFailures[0].reason,'synthetic_timeout');assert.equal(report.publicationEnabled,false);
 }finally{if(!resolve(root).startsWith(resolve(tmpdir())+sep))throw Error('Unsafe cleanup');await rm(root,{recursive:true,force:true});}
});
