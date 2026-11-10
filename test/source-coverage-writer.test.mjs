import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {publishSourceCoverage} from '../scripts/publish-source-coverage.mjs';
import {compileSourceCoverage,sourceCoverageTuple,SOURCE_COVERAGE_PATH} from '../contracts/source-coverage.mjs';
import {SOURCE_COVERAGE_CATALOGUE as catalogue,SOURCE_COVERAGE_DISPOSITIONS as reviewedDispositions} from '../scripts/pipeline/coverage-catalogue.mjs';

const NOW=Date.parse('2026-11-10T12:00:00.000Z');
const REPO='mrmohaamd-cmyk/Legal-Market-Monitor',REF='refs/heads/main';
const CANDIDATE='dist/saudilaw-publication-candidates.json';
const json=value=>JSON.stringify(value,null,2)+'\n';
function coverage(){
  // Writer tests use the real three-entry catalogue and real reviewed exclusions.
  // These synthetic proof hashes test the writer contract, not live employers.
  const at=new Date(NOW-1000).toISOString();
  const observations=Object.fromEntries(catalogue.map(entry=>[entry.id,{
    status:'verified',checkedAt:at,semanticSha256:sourceCoverageTuple(entry).semanticSha256,applicationResult:entry.applicationResult,
    proofs:entry.sources.map(source=>({url:source.url,finalUrl:source.permittedFinalUrls?.[0]??source.url,kind:source.kind,status:200,checkedAt:at,bodySha256:'a'.repeat(64),bodyBytes:1200}))
  }]));
  return compileSourceCoverage({catalogue,reviewedDispositions,observations,now:NOW});
}
async function fixture(t,{candidateChanged=true,candidateOutOfScope=false,existingCoverage=false}={}){
  const baseDirectory=resolve(tmpdir()),temporary=await mkdtemp(join(baseDirectory,'saudilaw-coverage-writer-'));
  t.after(async()=>{
    // Delete only the exact temporary directory allocated by this fixture.
    assert.equal(dirname(resolve(temporary)),baseDirectory);
    assert.ok(basename(temporary).startsWith('saudilaw-coverage-writer-'));
    await rm(temporary,{recursive:true,force:true});
  });
  const root=join(temporary,'checkout'),directory=join(temporary,'coverage'),candidateDirectory=join(temporary,'candidate');
  await Promise.all([mkdir(join(root,'dist'),{recursive:true}),mkdir(directory),mkdir(candidateDirectory)]);
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  git(['init','-q']);git(['config','user.name','Local fixture']);git(['config','user.email','fixture@example.invalid']);git(['config','core.autocrlf','false']);
  await writeFile(join(root,'README.md'),'Fixture repository\n');await writeFile(join(root,CANDIDATE),'original candidate\n');
  const artifact=coverage(),bytes=json(artifact);
  if(existingCoverage)await writeFile(join(root,SOURCE_COVERAGE_PATH),bytes);
  git(['add','.']);git(['commit','-qm','workflow source']);
  const workflowSha=git(['rev-parse','HEAD']).trim();
  if(candidateChanged){
    await writeFile(join(root,CANDIDATE),'confirmed new candidate\n');
    if(candidateOutOfScope)await writeFile(join(root,'README.md'),'unexpected preceding change\n');
    git(['add','.']);git(['commit','-qm','candidate renewal']);
  }
  const base=git(['rev-parse','HEAD']).trim();
  const receipt={status:candidateChanged?'confirmed':'unchanged',commit:base,publication_enabled:false,...(candidateChanged?{previous_commit:workflowSha}:{})};
  const report={schema:'saudilaw-source-coverage-check/v1',sourceCommit:base,workflowSourceCommit:workflowSha,coverageSha256:artifact.sha256,generatedAt:artifact.generated_at,publicationEnabled:false};
  await writeFile(join(candidateDirectory,'candidate-write-receipt.json'),json(receipt));
  await writeFile(join(directory,'source-coverage.json'),bytes);await writeFile(join(directory,'source-coverage-check.json'),json(report));
  const state={remote:base,url:`https://github.com/${REPO}.git`,lostAck:false,dropPush:false,wrongFetchedBytes:false,calls:[],remoteReads:0,before:null};
  const execute=(args,cwd)=>{
    assert.equal(cwd,root);state.calls.push([...args]);state.before?.(args);
    if(args[0]==='remote'){assert.deepEqual(args,['remote','get-url','origin']);return state.url+'\n';}
    if(args[0]==='ls-remote'){assert.deepEqual(args,['ls-remote','--heads','origin',REF]);state.remoteReads++;return state.remote+'\t'+REF+'\n';}
    if(args[0]==='push'){
      assert.equal(args.length,3);assert.equal(args[1],'origin');assert.match(args[2],/^[a-f0-9]{40}:refs\/heads\/main$/);
      if(!state.dropPush)state.remote=args[2].split(':')[0];
      if(state.lostAck||state.dropPush)throw new Error('simulated lost acknowledgement');
      return '';
    }
    if(args[0]==='fetch'){
      assert.deepEqual(args,['fetch','--no-tags','origin',REF]);
      writeFileSync(join(root,'.git','FETCH_HEAD'),state.remote+'\t\tbranch main of fixture\n');return '';
    }
    if(state.wrongFetchedBytes&&args[0]==='show'&&args[1]===`FETCH_HEAD:${SOURCE_COVERAGE_PATH}`)return 'changed remote bytes\n';
    // Only local Git commands are allowed through. There is no configured origin.
    assert.ok(['init','config','rev-parse','diff','status','add','commit','-c','show'].includes(args[0]),'unexpected command '+args[0]);
    return git(args);
  };
  const env={GITHUB_REPOSITORY:REPO,GITHUB_REF:REF,GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_SHA:workflowSha};
  const run=(overrides={})=>publishSourceCoverage(directory,{candidateDirectory,root,env,execute,clock:()=>NOW,...overrides});
  return {root,directory,candidateDirectory,git,base,workflowSha,artifact,bytes,report,receipt,state,env,run};
}
const pushes=f=>f.state.calls.filter(args=>args[0]==='push');

test('coverage writer commits only the exact coverage path after a confirmed candidate parent and independently verifies remote bytes',async t=>{
  const f=await fixture(t),candidateBefore=await readFile(join(f.root,CANDIDATE),'utf8');
  const result=await f.run();
  assert.equal(result.status,'confirmed');assert.equal(result.previousCommit,f.base);assert.equal(result.workflowSourceCommit,f.workflowSha);assert.equal(result.pushAcknowledged,true);
  assert.equal(result.publicationEnabled,false);assert.equal(result.coverageSha256,f.artifact.sha256);
  assert.equal(pushes(f).length,1);assert.equal(f.git(['rev-parse','HEAD^']).trim(),f.base);
  assert.equal(f.git(['diff','--name-only',f.base,result.commit]).trim(),SOURCE_COVERAGE_PATH);
  assert.equal(f.git(['show',`${result.commit}:${SOURCE_COVERAGE_PATH}`]),f.bytes);
  assert.equal(f.git(['show',`FETCH_HEAD:${SOURCE_COVERAGE_PATH}`]),f.bytes);
  assert.equal(await readFile(join(f.root,CANDIDATE),'utf8'),candidateBefore);
  assert.equal(f.git(['status','--porcelain']).trim(),'');
});
test('coverage writer accepts an unchanged preceding candidate and never pushes identical coverage',async t=>{
  const f=await fixture(t,{candidateChanged:false,existingCoverage:true});
  const result=await f.run();assert.equal(result.status,'unchanged');assert.equal(result.commit,f.workflowSha);assert.equal(pushes(f).length,0);
  assert.equal(f.git(['rev-parse','HEAD']).trim(),f.base);
});
test('coverage writer resolves a lost push acknowledgement by independent hash and byte readback without retry',async t=>{
  const f=await fixture(t);f.state.lostAck=true;
  const result=await f.run();assert.equal(result.status,'confirmed');assert.equal(result.pushAcknowledged,false);assert.equal(pushes(f).length,1);assert.equal(f.state.remote,result.commit);
});
test('coverage writer does not retry an unconfirmed push or claim changed remote bytes as confirmed',async t=>{
  const f=await fixture(t);f.state.dropPush=true;
  await assert.rejects(f.run(),/push_unconfirmed_no_retry/);assert.equal(pushes(f).length,1);assert.equal(f.state.remote,f.base);
  const g=await fixture(t);g.state.wrongFetchedBytes=true;
  await assert.rejects(g.run(),/remote_bytes_unconfirmed/);assert.equal(pushes(g).length,1);
});
test('coverage writer rejects wrong workflow, branch or remote before any push',async t=>{
  const f=await fixture(t);
  for(const delta of [{GITHUB_REPOSITORY:'other/repo'},{GITHUB_REF:'refs/heads/review'},{GITHUB_EVENT_NAME:'pull_request'},{GITHUB_SHA:'not-a-sha'}])await assert.rejects(f.run({env:{...f.env,...delta}}),/canonical_workflow_required/);
  f.state.url='https://github.com/other/repo.git';await assert.rejects(f.run(),/wrong_remote/);assert.equal(pushes(f).length,0);
});
test('coverage writer rejects dirty checkout or moved remote main',async t=>{
  const f=await fixture(t);await writeFile(join(f.root,'README.md'),'dirty\n');await assert.rejects(f.run(),/main_moved_or_dirty/);assert.equal(pushes(f).length,0);
  const g=await fixture(t);g.state.remote='b'.repeat(40);await assert.rejects(g.run(),/main_moved_or_dirty/);assert.equal(pushes(g).length,0);
});
test('coverage writer rejects unconfirmed candidate receipt and a preceding commit that touches another path',async t=>{
  const f=await fixture(t);
  for(const delta of [{status:'uncertain'},{publication_enabled:true},{previous_commit:'b'.repeat(40)},{commit:'not-a-sha'}]){
    await writeFile(join(f.candidateDirectory,'candidate-write-receipt.json'),json({...f.receipt,...delta}));await assert.rejects(f.run(),/candidate_parent_not_confirmed/);
  }
  assert.equal(pushes(f).length,0);
  const g=await fixture(t,{candidateOutOfScope:true});await assert.rejects(g.run(),/unexpected_candidate_parent/);assert.equal(pushes(g).length,0);
});
test('coverage writer rejects evidence bound to another source or artifact and publication-bearing artifacts',async t=>{
  const f=await fixture(t);
  for(const delta of [{sourceCommit:f.workflowSha},{workflowSourceCommit:f.base},{coverageSha256:'b'.repeat(64)},{generatedAt:'2026-11-10T12:01:00.000Z'},{publicationEnabled:true}]){
    await writeFile(join(f.directory,'source-coverage-check.json'),json({...f.report,...delta}));await assert.rejects(f.run(),/source_binding_mismatch/);
  }
  await writeFile(join(f.directory,'source-coverage-check.json'),json(f.report));
  await writeFile(join(f.directory,'source-coverage.json'),json({...f.artifact,publication_enabled:true}));await assert.rejects(f.run(),/coverage_integrity|coverage_publication_locked/);assert.equal(pushes(f).length,0);
});
test('coverage writer refuses an unexpected staged path or remote movement immediately before push',async t=>{
  const f=await fixture(t);let inserted=false;
  f.state.before=args=>{if(args[0]==='ls-remote'&&f.state.remoteReads===1&&!inserted){inserted=true;writeFileSync(join(f.root,'README.md'),'raced staged change\n');f.git(['add','README.md']);}};
  await assert.rejects(f.run(),/main_or_index_changed/);assert.equal(pushes(f).length,0);
  const g=await fixture(t);g.state.before=args=>{if(args[0]==='ls-remote'&&g.state.remoteReads===2)g.state.remote='b'.repeat(40);};
  await assert.rejects(g.run(),/changed_before_push/);assert.equal(pushes(g).length,0);
});
test('coverage writer rechecks evidence bytes after target creation and stops if the checked report changes',async t=>{
  const f=await fixture(t);let changed=false;
  f.state.before=args=>{if(args[0]==='ls-remote'&&f.state.remoteReads===1&&!changed){changed=true;writeFileSync(join(f.directory,'source-coverage-check.json'),json({...f.report,extra:'changed during publication'}));}};
  await assert.rejects(f.run(),/coverage_evidence_changed/);assert.equal(pushes(f).length,0);
});
