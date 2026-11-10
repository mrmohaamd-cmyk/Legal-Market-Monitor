// Bounded cloud verification. Fresh anonymous browser contexts; no form fills,
// credentials, uploads, consent acceptance, application submissions or Reddit API.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {SOURCE_COVERAGE_CATALOGUE as catalogue,SOURCE_COVERAGE_DISPOSITIONS as reviewedDispositions} from './pipeline/coverage-catalogue.mjs';
import {compileSourceCoverage,sourceCoverageTuple} from '../contracts/source-coverage.mjs';
import {canonical,digest,semanticRecord} from '../contracts/reviewed-content.mjs';
import {verifySupported} from './pipeline/core.mjs';
import {retrieveSource} from './reverify-opportunities.mjs';
import {reviewAO} from './ao-verification.mjs';
import {reviewSegal} from './segal-verification.mjs';
import {projectVisibleHtml} from './coverage-browser-dom.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const safeReason=outcome=>outcome==='closed'?'employer_closed':'source_or_application_review_required';
export async function checkSourceCoverage({feed,browser,clock=Date.now}={}){
 if(feed?.verification_window_hours!==168||!Array.isArray(feed.records)||feed.records.length>1000)throw new Error('invalid_feed');
 for(const reviewed of reviewedDispositions){const records=feed.records.filter(r=>r.id===reviewed.id);if(records.length!==1||digest(semanticRecord(records[0]))!==reviewed.recordSha256)throw new Error('reviewed_exclusion_changed');}
 const known=new Set([...catalogue.map(e=>e.id),...reviewedDispositions.map(e=>e.id)]);
 const dispositions=[...reviewedDispositions,...feed.records.filter(r=>!known.has(r.id)).map(r=>({id:r.id,disposition:'unknown',recordSha256:digest(semanticRecord(r)),observedAt:null,reason:'unreviewed_catalogue_record',proofs:[]}))];
 const observations={},checks=[];
 for(const entry of catalogue){
  const matches=feed.records.filter(r=>r.id===entry.id),record=matches[0];
  if(matches.length!==1||canonical(semanticRecord(record))!==canonical(entry.record)){
   observations[entry.id]={status:'attention_required',reason:'reviewed_semantics_changed'};checks.push({id:entry.id,outcome:'attention_required',reason:'reviewed_semantics_changed'});continue;
  }
  if(entry.id==='white-case-saudi-law-trainee-2027'){
   const result=await verifySupported(record,{retrieve:retrieveSource,now:clock()});
   if(result.ok){observations[entry.id]={status:'verified',checkedAt:result.checked_at,semanticSha256:sourceCoverageTuple(entry).semanticSha256,applicationResult:result.application_result,
     proofs:result.evidence.map(p=>({url:p.request_url,finalUrl:p.final_url,kind:'http_html',status:p.status,checkedAt:p.checked_at,bodySha256:p.body_sha256,bodyBytes:p.body_bytes}))};}
   else observations[entry.id]={status:'attention_required',reason:result.reason};
   checks.push({id:entry.id,outcome:result.ok?'verified':'attention_required',reason:result.reason??null});continue;
  }
  const context=await browser.newContext({viewport:{width:1365,height:900},locale:'en-US'});
  try{
   const proofs=[];
   for(const source of entry.sources){
    const page=await context.newPage();
    page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(45000);
    const response=await page.goto(source.url,{waitUntil:'domcontentloaded'});
    if(source.role==='vacancy'){
     await page.getByRole('heading',{name:entry.id.startsWith('ao-')?'Co-op Scheme - Winter 2026':'Student Intern',exact:true}).waitFor({state:'visible'});
     await page.locator(entry.id.startsWith('ao-')?'.ats-description':'main#main-content article').waitFor({state:'visible'});
    }else if(entry.id.startsWith('ao-')){
     for(const id of ['#loginField','#password','#btnLogin'])await page.locator(id).waitFor({state:'visible'});
    }else{
     await page.locator('#career-job').waitFor({state:'visible'});
     await page.waitForFunction(()=>document.querySelector('#career-job')?.value==='student-intern'&&[...document.querySelectorAll('a')].some(a=>a.href==='https://www.segal.com.sa/en/careers/jobs/student-intern'&&a.textContent.trim()==='Student Intern'));
    }
    const visible_html=await page.evaluate(projectVisibleHtml),checked_at=new Date(clock()).toISOString();
    const proof={schema:'saudilaw-browser-dom-proof/v1',requested_url:source.url,final_url:page.url(),checked_at,http_status:response?.status()??null,visible_html,visible_html_sha256:sha(visible_html)};
    proofs.push(proof);await page.close();
   }
   const result=await (entry.id.startsWith('ao-')?reviewAO:reviewSegal)(record,{sourceProof:proofs[0],applicationProof:proofs[1],now:clock()});
   checks.push({id:entry.id,outcome:result.outcome,reason:result.reason,...(result.observedDescriptionSha256?{observedDescriptionSha256:result.observedDescriptionSha256}:{}),proofs:proofs.map(({visible_html,...p})=>({...p,visible_html_bytes:Buffer.byteLength(visible_html)}))});
   observations[entry.id]=result.outcome==='verified'?{status:'verified',checkedAt:new Date(Math.min(...proofs.map(p=>Date.parse(p.checked_at)))).toISOString(),semanticSha256:sourceCoverageTuple(entry).semanticSha256,applicationResult:result.result,
    proofs:proofs.map(p=>({url:p.requested_url,finalUrl:p.final_url,kind:'browser_dom',status:p.http_status,checkedAt:p.checked_at,bodySha256:p.visible_html_sha256,bodyBytes:Buffer.byteLength(p.visible_html)}))}:{status:'attention_required',reason:safeReason(result.outcome)};
  }catch(error){observations[entry.id]={status:'attention_required',reason:'browser_evidence_unavailable'};checks.push({id:entry.id,outcome:'attention_required',reason:'browser_evidence_unavailable',errorClass:['TimeoutError','Error'].includes(error?.name)?error.name:'verification_error'});}
  finally{await context.close();}
 }
 const artifact=compileSourceCoverage({catalogue,observations,reviewedDispositions,dispositions,now:clock()});
 return {artifact,checks};
}
export async function runCoverage(directory){
 if(!directory||!process.env.PLAYWRIGHT_MODULE)throw new Error('Bounded coverage output and installed Playwright module required');
 const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)));
 const browser=await chromium.launch({headless:true});
 try{
  const feed=JSON.parse(await readFile('dist/opportunities.json','utf8'));
  const {artifact,checks}=await checkSourceCoverage({feed,browser});
  const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const report={schema:'saudilaw-source-coverage-check/v1',sourceCommit,workflowSourceCommit:process.env.GITHUB_SHA??sourceCommit,coverageSha256:artifact.sha256,generatedAt:artifact.generated_at,publicationEnabled:false,checks};
  await mkdir(directory,{recursive:true});
  await writeFile(join(directory,'source-coverage.json'),JSON.stringify(artifact,null,2)+'\n');
  await writeFile(join(directory,'source-coverage-check.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({coverageSha256:artifact.sha256,entries:artifact.entries.map(e=>({id:e.id,status:e.source_status,reason:e.reason})),publicationEnabled:false}));
  return report;
 }finally{await browser.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)runCoverage(process.argv[2]).then(report=>{if(process.argv.includes('--require-verified')&&report.checks.some(c=>c.outcome!=='verified'))process.exitCode=2;}).catch(()=>{console.error('Bounded coverage check failed; no publication approval or fallback.');process.exitCode=1;});
