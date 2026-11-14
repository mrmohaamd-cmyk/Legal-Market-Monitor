// Execute the real workflow entrypoint with an empty local input. This verifies
// its full import graph without network, browser tooling or remote writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
for(const quarantine of [false,true])test('actual owner-check CLI loads its production dependencies and emits an empty nonpublishing feed',async()=>{
  const base=resolve(tmpdir()),root=await mkdtemp(join(base,'saudilaw-owner-cli-'));
  try{
    const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    git(['init','--quiet']);git(['-c','user.name=OwnerCLI-Test','-c','user.email=fixture@example.invalid','commit','--allow-empty','--quiet','-m','Synthetic local fixture']);
    await mkdir(join(root,'config'));await writeFile(join(root,'config','saudilaw-owner-jobs.json'),JSON.stringify({schema:'saudilaw-owner-job-input/v1',jobs:quarantine?[JSON.parse(await readFile(new URL('../config/saudilaw-owner-jobs.json',import.meta.url),'utf8')).jobs.find(j=>j.employerKey==='pinsent-masons')]:[]}));
    const output=join(root,'result'),stdout=execFileSync(process.execPath,['--input-type=module','-e',`import {runOwnerJobCheck} from ${JSON.stringify(new URL('../scripts/check-owner-jobs.mjs',import.meta.url).href)};await runOwnerJobCheck(${JSON.stringify(output)},{clock:()=>Date.parse('2026-11-14T22:34:11Z')});`],{cwd:root,encoding:'utf8',env:{...process.env,PLAYWRIGHT_MODULE:'',GITHUB_SHA:''}});
    assert.equal(JSON.parse(stdout.trim()).publicationEnabled,false);
    const feed=JSON.parse(await readFile(join(output,'owner-jobs.json'),'utf8')),report=JSON.parse(await readFile(join(output,'owner-job-check.json'),'utf8'));
    assert.equal(report.quarantined.length,quarantine?1:0);if(quarantine){assert.equal(report.quarantined[0].reason,'owner_job_upcoming_date');assert.equal(report.quarantined[0].job.applicationResult,'not_open_yet');}assert.deepEqual(feed.jobs,[]);assert.equal(feed.publicationEnabled,false);assert.equal(report.sourceCommit,git(['rev-parse','HEAD']).trim());assert.equal(report.feedSha256,feed.sha256);
  }finally{if(!resolve(root).startsWith(base+sep))throw Error('Unsafe fixture cleanup');await rm(root,{recursive:true,force:true});}
});
