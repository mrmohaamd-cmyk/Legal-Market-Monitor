// Data-only review candidates. Re-fetch exact approved public sources; no login,
// form fills, arbitrary scripts, redirects or Reddit publication are supported.
import {createHash} from 'node:crypto';
import {canonical,digest,timestamp} from '../../contracts/reviewed-content.mjs';
import {OWNER_JOB_FEED_SCHEMA,validateOwnerJob,validateOwnerJobFeed,ownerSourceFinalUrlAllowed} from '../../contracts/owner-job.mjs';
import {readHtml,textOf,find} from '../html-evidence.mjs';
import {enabled,unavailable} from '../coverage-proof.mjs';
import {projectVisibleHtml} from '../coverage-browser-dom.mjs';
import {AO_SOURCE_URL} from '../ao-verification.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const HOUR=3600000,MAX_JOBS=12,MAX_REQUESTS=40,MAX_RUN_MS=6*60*1000;
const reason=error=>['source_fingerprint_changed','source_text_changed','source_unavailable','application_controls_unverified','source_closed','withdrawn_listing_suppressed','run_budget','source_destination_changed'].includes(error?.message)?error.message:'source_evidence_unavailable';
function checkClock(clock){const now=clock();if(!Number.isSafeInteger(now)||now<0)throw new Error('producer_clock');return now;}
function positiveReceipt(response,source){
 if(response?.error||response?.status!==200||response?.url!==source.url||!/^text\/html(?:\s*;|$)/i.test(response?.contentType??'')||typeof response.body!=='string'||response.body_bytes!==Buffer.byteLength(response.body)||response.body_sha256!==sha(response.body))throw new Error('source_unavailable');
 return {body:response.body,status:200,finalUrl:response.url};
}
function canonicalEvidenceBody(source,body){
 if(source.kind!=='browser_dom'||source.role!=='vacancy'||source.url!==AO_SOURCE_URL)return body;
 // The employer regenerates the ten-hex ID on this Related content wrapper.
 // Preserve its presence, heading, contents and every other projected byte.
 const relatedContentId=/(<div id="data-content-feed-)[a-f0-9]{10}(" class="js-hub hub__wrapper content-feed initialized">\s*<h2 class="hub-item__heading">Related content<\/h2>)/;
 return body.replace(relatedContentId,(_,prefix,suffix)=>`${prefix}0000000000${suffix}`);
}
function verifyBody(source,body){
 if(sha(body)!==source.bodySha256||Buffer.byteLength(body)!==source.bodyBytes)throw new Error('source_fingerprint_changed');
 const doc=readHtml(body),normalize=value=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim(),visible=normalize(textOf(doc));
 if(source.requiredText.some(value=>!visible.includes(normalize(value))))throw new Error('source_text_changed');
 // A changed employer message requires review even if an applicant form remains.
 if(source.role!=='programme'&&unavailable.test(visible))throw new Error('source_closed');
 return doc;
}
function verifyApplication(doc,result,resumeUploadConfirmed=false){
 const forms=find(doc,node=>node.tag==='form'&&enabled(node));
 const live=(form,predicate)=>find(form,node=>enabled(node)&&predicate(node));
 const submit=form=>live(form,node=>node.tag==='button'&&(node.attrs.type??'submit').toLowerCase()==='submit'||node.tag==='input'&&node.attrs.type?.toLowerCase()==='submit').length>0;
 const email=form=>live(form,node=>node.tag==='input'&&node.attrs.type?.toLowerCase()==='email'||node.tag==='input'&&/email|login|username/i.test(node.attrs.name??node.attrs.id??'')).length>0;
 // Anonymous entry controls only. This never establishes successful login or submission.
 const suitable=forms.some(form=>submit(form)&&email(form)&&(result==='login_required'||resumeUploadConfirmed&&forms.length===1||live(form,node=>node.tag==='input'&&node.attrs.type?.toLowerCase()==='file'||node.tag==='button'&&/upload.*resume|upload.*cv/i.test(textOf(node))).length>0));
 if(!suitable)throw new Error('application_controls_unverified');
}
async function settledVisibleHtml(page,remaining){
 // CSS and hydration can temporarily expose navigation controls. Capture the
 // same whole visible projection only after load and three stable samples;
 // never drop changed content or silently replace a reviewed fingerprint.
 await page.waitForLoadState('load',{timeout:Math.max(1,Math.min(10000,remaining()))});
 let previous=null,unchanged=0;
 for(let sample=0;sample<20;sample++){
  remaining();
  const body=await page.evaluate(projectVisibleHtml);
  if(typeof body!=='string'||Buffer.byteLength(body)>2000000)throw new Error('source_unavailable');
  unchanged=body===previous?unchanged+1:0;
  if(unchanged===2)return body;
  previous=body;
  await page.waitForTimeout(Math.max(1,Math.min(250,remaining())));
 }
 throw new Error('source_evidence_unavailable');
}
async function browserReceipt(browser,source,job,remaining){
 if(!browser||typeof browser.newContext!=='function')throw new Error('source_evidence_unavailable');
 const context=await browser.newContext({viewport:{width:1365,height:900},locale:'en-US'});
 try{
  const page=await context.newPage(),timeout=Math.max(1,Math.min(45000,remaining()));
  page.setDefaultTimeout(timeout);page.setDefaultNavigationTimeout(timeout);
  const response=await page.goto(source.url,{waitUntil:'domcontentloaded'});
  if(response?.status()!==200)throw new Error('source_unavailable');
  if(!ownerSourceFinalUrlAllowed(source.url,page.url(),job.employerKey))throw new Error('source_destination_changed');
  // Native live DOM only, after initial content is visible. No arbitrary owner-supplied selector or JS.
  await page.locator('body').waitFor({state:'visible',timeout});
  // Wait for fixed plaintext assertions, not an owner-supplied selector or code.
  // This accommodates the existing client-rendered employer pages.
  await page.waitForFunction(function waitForRequiredSourceText({phrases}){
   const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim(),visible=normalize(document.body?.innerText??'');
   return phrases.every(phrase=>visible.includes(normalize(phrase)));
  },{phrases:source.requiredText},{timeout});
  const body=await settledVisibleHtml(page,remaining);
  if(typeof body!=='string'||Buffer.byteLength(body)>2000000)throw new Error('source_unavailable');
  let resumeUploadConfirmed=false;
  if(source.role==='application'&&job.employerKey==='segal'&&source.url==='https://www.segal.com.sa/en/careers/apply?job=student-intern'){
   // Reuse the existing Segal reviewer’s actual accessible upload control.
   // The transparent file input is intentionally absent from visible HTML.
   const form=page.locator('#main-content #apply form');
   const upload=form.getByRole('button',{name:'Upload your resume',exact:true});
   resumeUploadConfirmed=await form.count()===1&&await upload.count()===1&&await upload.getAttribute('id')==='career-cv'&&await upload.isVisible()&&await upload.isEnabled();
  }
  if(!ownerSourceFinalUrlAllowed(source.url,page.url(),job.employerKey))throw new Error('source_destination_changed');
  return {body,status:200,finalUrl:page.url(),resumeUploadConfirmed};
 }finally{await context.close();}
}
/** Inject retrieve/browser only from the fixed audited workflow, never an HTTP
 * request. Approved source fingerprints make all content drift a hold.
 * Human copy review remains independent from fresh source proof. */
export async function compileOwnerJobFeed({jobs,retrieve,browser,onSourceObserved,clock=Date.now}={}){
 if(!Array.isArray(jobs)||jobs.length>MAX_JOBS||typeof retrieve!=='function')throw new Error('producer_input');
 const started=checkClock(clock),reviewed=jobs.map(job=>validateOwnerJob(job,{now:started,allowExpired:true}));
 if(new Set(reviewed.map(job=>job.id)).size!==reviewed.length)throw new Error('producer_duplicate_job');
 let requests=0,lastNow=started;
 const remaining=()=>{lastNow=Math.max(lastNow,checkClock(clock));const left=started+MAX_RUN_MS-lastNow;if(left<=0)throw new Error('run_budget');return left;};
 const observations=[];
 for(const job of reviewed){
  const proofs=[];
  try{
   if(job.editorialCutoffAt!==null&&timestamp(job.editorialCutoffAt)<=checkClock(clock))throw new Error('source_closed');
   let evidenceProblem=null,roleObserved=false;
   for(const source of job.sources){
    try{
    remaining();if(++requests>MAX_REQUESTS)throw new Error('run_budget');
    const observed=source.kind==='browser_dom'?await browserReceipt(browser,source,job,remaining):positiveReceipt(await retrieve(source.url),source);
    const body=canonicalEvidenceBody(source,observed.body),bodySha256=sha(body),bodyBytes=Buffer.byteLength(body);
    remaining();
    if(onSourceObserved!==undefined){
     if(typeof onSourceObserved!=='function')throw new Error('producer_observer');
     // Detached diagnostics are private check artifacts; never part of the feed.
     await onSourceObserved({jobId:job.id,url:source.url,kind:source.kind,status:200,finalUrl:observed.finalUrl,checkedAt:new Date(checkClock(clock)).toISOString(),bodySha256,bodyBytes,...(body!==observed.body&&{rawBodySha256:sha(observed.body)}),visibleText:textOf(readHtml(observed.body))});
    }
    const doc=verifyBody(source,body);
    if(['vacancy','programme'].includes(source.role)){
     const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim(),visible=normalize(textOf(doc));
     const headings=find(doc,node=>['h1','h2','h3'].includes(node.tag)).map(node=>normalize(textOf(node)));
     const punctuationFold=value=>normalize(value).replace(/[^\p{L}\p{N}]/gu,'');
     if(job.employerKey==='white-case'&&(punctuationFold(visible).includes('saudilawtraineeprogram2027')||headings.some(title=>/^saudilawtraineeprogram(?:me)?/.test(punctuationFold(title)))&&/\b2027\b/.test(visible)))throw new Error('withdrawn_listing_suppressed');
     const city=normalize(job.sourceIdentity.locationEn.split(',')[0]).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),locationObserved=new RegExp(`(?:^|[^\\p{L}\\p{N}])${city}(?:$|[^\\p{L}\\p{N}])`,'u').test(visible);
     if(headings.includes(normalize(job.sourceIdentity.roleTitleEn))&&locationObserved)roleObserved=true;
    }
    if(source.role==='application')verifyApplication(doc,job.applicationResult,observed.resumeUploadConfirmed===true);
    const checkedAt=new Date(checkClock(clock)).toISOString();
    proofs.push({url:source.url,finalUrl:observed.finalUrl,kind:source.kind,status:200,checkedAt,bodySha256,bodyBytes});
    }catch(error){evidenceProblem??=error;}
   }
   if(evidenceProblem!==null)throw evidenceProblem;
   if(!roleObserved)throw new Error('source_text_changed');
   const checkedAt=new Date(Math.min(...proofs.map(proof=>timestamp(proof.checkedAt)))).toISOString();
   observations.push({job,sourceStatus:'verified',checkedAt,expiresAt:null,applicationResult:job.applicationResult,proofs,reason:null});
  }catch(error){observations.push({job,sourceStatus:'attention_required',checkedAt:null,expiresAt:null,applicationResult:null,proofs:[],reason:reason(error)});}
 }
 const generated=checkClock(clock),expires=generated+12*HOUR;
 for(const item of observations)if(item.sourceStatus==='verified')item.expiresAt=new Date(Math.min(expires,timestamp(item.checkedAt)+168*HOUR,item.job.editorialCutoffAt===null?Infinity:timestamp(item.job.editorialCutoffAt))).toISOString();
 const payload={schema:OWNER_JOB_FEED_SCHEMA,generatedAt:new Date(generated).toISOString(),expiresAt:new Date(expires).toISOString(),publicationEnabled:false,jobs:observations};
 const feed={...payload,sha256:digest(payload)};
 validateOwnerJobFeed(feed,{now:generated});return JSON.parse(canonical(feed));
}
