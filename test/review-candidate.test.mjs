import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,sep,basename} from 'node:path';
import {createReviewCandidateProducer,produceReviewCandidate,validateReviewCandidate,digest,ID,CANDIDATE_PATH,CUTOFF} from '../scripts/review-candidate.mjs';
import {createWhiteCaseFactsCheck} from '../scripts/whitecase-verification.mjs';
import {publishReviewCandidate} from '../scripts/publish-review-candidate.mjs';
import {proposeRefresh,REFRESH_BRANCH} from '../scripts/propose-refresh.mjs';

const now=Date.parse('2026-11-10T07:00:00.000Z'),stamp=new Date(now).toISOString();
// Use the immutable public reference, not live evidence that future renewals may
// move past the deterministic test clock or temporarily withhold altogether.
const template=JSON.parse(readFileSync(new URL('../scripts/review-candidate-template.json',import.meta.url),'utf8'));
const old=new Date(now-60000).toISOString();
const record={...structuredClone(template.record),last_verified_at:old,last_reviewed_at:old,application_check:{checked_at:old,result:'login_required'}};
const original={generated_at:old,verification_window_hours:168,records:[record]};
const historicalPayload={schema:'saudilaw-publication-candidate/v1',catalogue_version:'saudilaw-upstream-v1',publication_enabled:false,accepted:[],upstream_sha256:'0'.repeat(64),generated_at:template.candidate.evidence.checked_at,expires_at:template.candidate.evidence.expires_at,candidates:[template.candidate],quarantine:[{id:ID,reason:'translation_review_pending'}]};
const historical={...historicalPayload,sha256:digest(historicalPayload)};
const portal=record.source_url,programme=record.firm_careers_url;
const programmeText='Synthetic programme facts for an isolated evidence test.';
const programmeHtml=`<article class="section-landing-page">${programmeText}</article>`;
const portalHtml='<form action="/app/" method="post"><input name="LogonEmail" type="email"><button type="submit">Continue</button></form><div><div class="d-flex justify-content-between fw-semibold">Saudi Law Trainee Program 2027</div><div><ul><li>March 2027 08/01/2027</li></ul></div></div>';
const response=(url,body)=>({url,status:200,contentType:'text/html; charset=utf-8',body,body_sha256:createHash('sha256').update(body).digest('hex'),body_bytes:Buffer.byteLength(body)});
const retrieve=async url=>response(url,url===portal?portalHtml:programmeHtml);
const verifyFacts=createWhiteCaseFactsCheck({articleHash:createHash('sha256').update(programmeText).digest('hex')});
const produce=createReviewCandidateProducer({verifyFacts});
const valid=options=>produce(structuredClone(original),{retrieve,clock:()=>now,...options});

test('unchanged official evidence renews only pending review copy with no publication approval',async()=>{
  const calls=[];
  const {candidate:c,report}=await valid({retrieve:async url=>{calls.push(url);return retrieve(url);},sourceCommit:'a'.repeat(40)});
  assert.deepEqual(calls,[portal,programme]);assert.equal(c.publication_enabled,false);assert.deepEqual(c.accepted,[]);
  assert.equal(c.candidates.length,1);assert.equal(c.candidates[0].translation_status,'pending');
  assert.equal(c.candidates[0].evidence.checked_at,stamp);assert.equal(report.source_commit,'a'.repeat(40));
  assert.equal(report.requests,2);assert.equal(c.upstream_sha256,digest(report));
  assert.equal(c.candidates[0].semantic_sha256,historical.candidates[0].semantic_sha256);
  assert.equal(c.candidates[0].translation_sha256,historical.candidates[0].translation_sha256);
  const normalized=c.candidates[0].content.text.replace(stamp,historical.candidates[0].evidence.checked_at);
  assert.equal(normalized,historical.candidates[0].content.text);
  assert.equal(c.candidates[0].content.title,historical.candidates[0].content.title);
  assert.equal(c.candidates[0].evidence.provenance.length,2);
  assert(c.candidates[0].evidence.provenance.every(p=>p.body_bytes>0&&/^[a-f0-9]{64}$/.test(p.body_sha256)));
  assert.equal(validateReviewCandidate(c,{now}),c);
});

test('changed deadline, explicit closure, changed article and retrieval failures withhold the candidate',async()=>{
  const cases=[
    {url:portal,r:response(portal,portalHtml.replace('08/01/2027','09/01/2027')),reason:'application_uncertain'},
    {url:portal,r:response(portal,portalHtml.replace('08/01/2027','Deadline passed')),reason:'employer_closed'},
    {url:programme,r:response(programme,programmeHtml.replace('facts','changed facts')),reason:'source_facts_changed_or_uncertain'},
    {url:programme,r:{error:'network failed'},reason:'retrieval_or_receipt_failed'},
    {url:portal,r:{...response(portal,portalHtml),url:portal+'other'},reason:'retrieval_or_receipt_failed'},
    {url:portal,r:{...response(portal,portalHtml),body_sha256:'0'.repeat(64)},reason:'retrieval_or_receipt_failed'},
    {url:portal,r:{...response(portal,portalHtml),body_bytes:1},reason:'retrieval_or_receipt_failed'},
    {url:portal,r:response(portal,'x'.repeat(2000001)),reason:'retrieval_or_receipt_failed'}
  ];
  for(const c of cases){
    const {candidate,report}=await valid({retrieve:async url=>url===c.url?c.r:retrieve(url)});
    assert.deepEqual(candidate.candidates,[]);assert.equal(report.status,'withheld');assert.equal(report.reason,c.reason);
    assert.deepEqual(candidate.accepted,[]);assert.equal(candidate.publication_enabled,false);
    assert.equal(candidate.quarantine.find(q=>q.id===ID).reason,c.reason);
  }
  const production=await produceReviewCandidate(original,{retrieve,clock:()=>now});
  assert.equal(production.report.reason,'source_facts_changed_or_uncertain','Synthetic article cannot satisfy the production binding.');
});

test('editorial closure, changed reviewed feed facts, duplicate target and future evidence cannot be refreshed',async()=>{
  for(const [change,reason] of [
    [r=>{r.status='closed';},'not_open_no_automatic_reopening'],
    [r=>{r.qualifications[0]='Different eligibility';},'reviewed_semantics_changed'],
    [r=>{r.last_verified_at=new Date(now+1).toISOString();},'invalid_existing_evidence']
  ]){
    const feed=structuredClone(original);change(feed.records.find(r=>r.id===ID));let calls=0;
    const result=await produce(feed,{clock:()=>now,retrieve:async()=>{calls++;throw new Error('must not retrieve');}});
    assert.equal(calls,0);assert.equal(result.report.reason,reason);assert.equal(result.candidate.candidates.length,0);
  }
  const doubled=structuredClone(original);doubled.records.push(structuredClone(record));
  assert.equal((await produce(doubled,{clock:()=>now,retrieve})).report.reason,'duplicate_identity');
  const refreshed=structuredClone(original);refreshed.records.find(r=>r.id===ID).last_verified_at=new Date(now-1000).toISOString();
  assert.equal((await produce(refreshed,{clock:()=>now,retrieve})).candidate.candidates.length,1,'Evidence refresh does not change reviewed semantics.');
});

test('deadline cutoff, source-proof completeness and preparation elapsed time fail closed',async()=>{
  const before=await valid({clock:()=>CUTOFF-1000});assert.equal(Date.parse(before.candidate.expires_at),CUTOFF);
  const after=await valid({clock:()=>CUTOFF});assert.equal(after.report.reason,'editorial_deadline_cutoff');assert.equal(after.candidate.candidates.length,0);
  const fake=createReviewCandidateProducer({verifyFacts:async()=>({outcome:'verified'})});
  await assert.rejects(fake(original,{retrieve,clock:()=>now}),/Both independent/);
  let ticks=0;await assert.rejects(valid({clock:()=>now+(ticks++?60001:0)}),/one-minute/);
});

test('write-boundary validation rejects approval flags, changed copy, false evidence and stale artifacts',async()=>{
  const {candidate}=await valid();
  const mutate=change=>{const c=structuredClone(candidate);change(c);const {sha256,...payload}=c;c.sha256=digest(payload);return c;};
  for(const c of [
    mutate(c=>{c.publication_enabled=true;}),mutate(c=>{c.accepted=[ID];}),
    mutate(c=>{c.candidates[0].translation_status='approved';}),
    mutate(c=>{c.candidates[0].content.text+='Extra claim';}),
    mutate(c=>{c.candidates[0].evidence.provenance[1].request_url='https://example.com/';}),
    mutate(c=>{c.candidates[0].evidence.checked_at=new Date(now+1000).toISOString();}),
    mutate(c=>{c.candidates[0].evidence.expires_at=new Date(CUTOFF+1).toISOString();})
  ])assert.throws(()=>validateReviewCandidate(c,{now}));
  assert.throws(()=>validateReviewCandidate(candidate,{now:now+15*60000+1}),/freshly/);
});

async function repository(t){
  const base=await mkdtemp(join(tmpdir(),'candidate-publisher-test-')),root=join(base,'checkout'),remote=join(base,'remote.git'),evidence=join(base,'evidence');
  t.after(async()=>{assert(resolve(base).startsWith(resolve(tmpdir())+sep)&&basename(base).startsWith('candidate-publisher-test-'));await rm(base,{recursive:true,force:true});});
  await mkdir(root);await mkdir(evidence);await mkdir(join(root,'dist'));await mkdir(join(root,'docs'));
  const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  git(['init','--bare',remote],base);git(['init','-b','main']);
  git(['config','user.name','Test']);git(['config','user.email','test@example.invalid']);git(['config','core.autocrlf','false']);
  await writeFile(join(root,CANDIDATE_PATH),JSON.stringify(historical,null,2)+'\n');await writeFile(join(root,'sentinel.txt'),'Preserve this file.\n');
  await writeFile(join(root,'dist/opportunities.json'),JSON.stringify(original)+'\n');await writeFile(join(root,'docs/latest-source-check.md'),'Historical evidence.\n');
  git(['add','.']);git(['commit','-m','Initial public fixture']);git(['remote','add','origin',remote]);git(['push','-u','origin','main']);
  const initial=git(['rev-parse','HEAD']).trim();
  const result=await valid({sourceCommit:initial});
  await writeFile(join(evidence,'saudilaw-publication-candidates.json'),JSON.stringify(result.candidate,null,2)+'\n');
  await writeFile(join(evidence,'candidate-source-check.json'),JSON.stringify(result.report,null,2)+'\n');
  const execute=(args,cwd)=>args.join(' ')==='remote get-url origin'?'https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor.git\n':git(args,cwd);
  const env={GITHUB_REPOSITORY:'mrmohaamd-cmyk/Legal-Market-Monitor',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'schedule',GITHUB_SHA:initial};
  return {root,remote,evidence,initial,git,execute,env,result};
}

test('Git write changes exactly the fixed candidate file and independently confirms the remote commit/blob',async t=>{
  const r=await repository(t);const receipt=await publishReviewCandidate(r.evidence,{...r,clock:()=>now});
  assert.equal(receipt.status,'confirmed');assert.equal(receipt.previous_commit,r.initial);
  assert.equal(r.git(['diff','--name-only',r.initial,receipt.commit]).trim(),CANDIDATE_PATH);
  assert.equal(await readFile(join(r.root,'sentinel.txt'),'utf8'),'Preserve this file.\n');
  assert.equal(r.git(['show',`FETCH_HEAD:${CANDIDATE_PATH}`]),await readFile(join(r.evidence,'saudilaw-publication-candidates.json'),'utf8'));
});

test('lost push acknowledgement is reconciled without retry; rejected push is never retried',async t=>{
  for(const persisted of [true,false])await t.test(String(persisted),async t=>{
    const r=await repository(t);let pushes=0;
    const execute=(args,cwd)=>{if(args[0]==='push'){pushes++;if(persisted)r.execute(args,cwd);throw new Error('Lost or rejected response');}return r.execute(args,cwd);};
    if(persisted){const receipt=await publishReviewCandidate(r.evidence,{...r,execute,clock:()=>now});assert.equal(receipt.status,'confirmed');assert.equal(receipt.push_acknowledged,false);}
    else await assert.rejects(publishReviewCandidate(r.evidence,{...r,execute,clock:()=>now}),/unconfirmed/);
    assert.equal(pushes,1);
  });
});

test('main movement, producer edits, artifact mutation and source-commit mismatch prevent any push',async t=>{
  for(const mode of ['main_moved','producer_edit','artifact_change','wrong_source','target_at_add','head_moved'])await t.test(mode,async t=>{
    const r=await repository(t);let pushes=0,reads=0;
    if(mode==='wrong_source'){
      const c=r.result.candidate,report={...r.result.report,source_commit:'a'.repeat(40)};c.upstream_sha256=digest(report);const {sha256,...payload}=c;c.sha256=digest(payload);
      await writeFile(join(r.evidence,'saudilaw-publication-candidates.json'),JSON.stringify(c)+'\n');await writeFile(join(r.evidence,'candidate-source-check.json'),JSON.stringify(report)+'\n');
    }
    const execute=(args,cwd)=>{
      if(args[0]==='push')pushes++;
      if(args[0]==='ls-remote'){
        reads++;
        if(reads===2&&mode==='main_moved')return 'b'.repeat(40)+'\trefs/heads/main\n';
        if(reads===3&&mode==='head_moved')r.git(['commit','--allow-empty','-m','Unexpected local revision']);
      }
      if(args.join(' ')==='diff --name-only'&&mode==='artifact_change')writeFileSync(join(r.evidence,'candidate-source-check.json'),'{}\n');
      if(args[0]==='add'&&mode==='target_at_add')writeFileSync(join(r.root,CANDIDATE_PATH),'{}\n');
      const answer=r.execute(args,cwd);
      if(args.includes('commit')&&mode==='producer_edit')writeFileSync(join(r.root,'sentinel.txt'),'Unexpected producer edit\n');
      return answer;
    };
    await assert.rejects(publishReviewCandidate(r.evidence,{...r,execute,clock:()=>now}));assert.equal(pushes,0);
  });
});

test('publisher rejects non-main scope and old evidence without changing the checkout',async t=>{
  const r=await repository(t);
  await assert.rejects(publishReviewCandidate(r.evidence,{...r,env:{...r.env,GITHUB_REF:'refs/heads/draft'},clock:()=>now}),/canonical main/);
  await assert.rejects(publishReviewCandidate(r.evidence,{...r,clock:()=>now+16*60000}),/freshly/);
  assert.equal(r.git(['status','--porcelain']).trim(),'');
});

test('general feed draft still starts at the positively confirmed candidate commit',async t=>{
  const r=await repository(t),receipt=await publishReviewCandidate(r.evidence,{...r,clock:()=>now});
  const proposed={...structuredClone(original),generated_at:stamp};
  await writeFile(join(r.evidence,'proposed-opportunities.json'),JSON.stringify(proposed)+'\n');
  await writeFile(join(r.evidence,'source-check.md'),'Fresh general feed evidence for separate manual review.\n');
  let draftRequests=0;
  const execute=(name,args)=>{
    if(name==='git')return r.git(args).trim();
    if(name==='node'&&args[0]==='validate.mjs')return '';
    if(name==='gh'&&args[0]==='pr'&&args[1]==='list')return '[]';
    if(name==='gh'&&args[0]==='pr'&&args[1]==='create'){assert(args.includes('--draft'));draftRequests++;return '';}
    throw new Error('Unexpected draft operation.');
  };
  // The existing function uses the checkout cwd for its fixed destination files.
  const files={
    copyFile:async(from,to)=>writeFile(join(r.root,to),await readFile(from)),
    readFile,
    writeFile
  };
  await proposeRefresh(r.evidence,{execute,files,env:r.env});
  assert.equal(draftRequests,1);
  assert.equal(r.git(['merge-base',receipt.commit,REFRESH_BRANCH]).trim(),receipt.commit);
  assert.deepEqual(r.git(['diff','--name-only',receipt.commit,REFRESH_BRANCH]).trim().split('\n').sort(),['dist/opportunities.json','docs/latest-source-check.md']);
  assert.equal(r.git(['show',`${REFRESH_BRANCH}:${CANDIDATE_PATH}`]),await readFile(join(r.evidence,'saudilaw-publication-candidates.json'),'utf8'));
});
