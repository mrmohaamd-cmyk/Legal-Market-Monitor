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
    await mkdir(join(root,'config'));await writeFile(join(root,'config','saudilaw-owner-jobs.json'),JSON.stringify({schema:'saudilaw-owner-job-input/v1',jobs:[]}));
    const output=join(root,'result'),stdout=execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/check-owner-jobs.mjs',import.meta.url)),output],{cwd:root,encoding:'utf8',env:{...process.env,PLAYWRIGHT_MODULE:'',GITHUB_SHA:''}});
    assert.equal(JSON.parse(stdout.trim()).publicationEnabled,false);
    const feed=JSON.parse(await readFile(join(output,'owner-jobs.json'),'utf8')),report=JSON.parse(await readFile(join(output,'owner-job-check.json'),'utf8'));
    assert.deepEqual(feed.jobs,[]);assert.equal(feed.publicationEnabled,false);assert.equal(report.sourceCommit,git(['rev-parse','HEAD']).trim());assert.equal(report.feedSha256,feed.sha256);
  }finally{if(!resolve(root).startsWith(base+sep))throw Error('Unsafe fixture cleanup');await rm(root,{recursive:true,force:true});}
});
