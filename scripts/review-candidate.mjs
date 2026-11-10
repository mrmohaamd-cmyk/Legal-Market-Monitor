// A public evidence producer, never a Reddit publisher or translation approver.
// The reviewed template is derived only from already-public main-branch records.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {evaluateSource,retrieveSource} from './reverify-opportunities.mjs';
import {verifyWhiteCaseProgrammeFacts} from './whitecase-verification.mjs';

export const CANDIDATE_PATH='dist/saudilaw-publication-candidates.json';
export const ID='white-case-saudi-law-trainee-2027';
export const HOUR=3600000;
export const CUTOFF=Date.parse('2027-01-07T21:00:00.000Z');
const dynamic=new Set(['last_verified_at','last_reviewed_at','provenance_notes','application_check','availability_note','review_due_at']);
const holdReasons=new Set(['duplicate_identity','not_advertised_opening','not_open_no_automatic_reopening','unsupported_source','reviewed_semantics_changed','invalid_existing_evidence','editorial_deadline_cutoff','employer_closed','application_uncertain','source_facts_changed_or_uncertain','retrieval_or_receipt_failed','verification_uncertain','translation_review_pending']);
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export const stable=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export const digest=value=>createHash('sha256').update(stable(value)).digest('hex');
const bytesHash=value=>createHash('sha256').update(value).digest('hex');
const template=JSON.parse(readFileSync(new URL('./review-candidate-template.json',import.meta.url),'utf8'));
if(digest(template)!=='cf7b4ab443b7d01eb87eae2b330069777e3250abd0509f8339cf4412c6603023')throw new Error('Reviewed public template changed; review the source and copy before changing the binding.');
const portal=template.record.source_url,programme=template.record.firm_careers_url;
const same=(a,b)=>stable(a)===stable(b);
const semantic=record=>Object.fromEntries(Object.entries(record).filter(([key])=>!dynamic.has(key)));
function time(value){const n=Date.parse(value);if(typeof value!=='string'||!Number.isFinite(n)||new Date(n).toISOString()!==value)throw new Error('Invalid canonical evidence timestamp.');return n;}
function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||!same(Object.keys(value).sort(),[...keys].sort()))throw new Error('Unexpected candidate fields.');}
function render(checkedAt){
  const content=structuredClone(template.candidate.content);
  const previous=`\n\nوقت التحقق / Checked: ${template.candidate.evidence.checked_at}\n\n`;
  if(content.text.split(previous).length!==2)throw new Error('Reviewed checked-at marker is not unique.');
  content.text=content.text.replace(previous,`\n\nوقت التحقق / Checked: ${checkedAt}\n\n`);
  content.content_sha256=digest({title:content.title,text:content.text});
  return content;
}

// The production call below fixes the public programme verifier. Tests may build
// an isolated instance using synthetic article text; CLI/input JSON cannot inject one.
export function createReviewCandidateProducer({verifyFacts=verifyWhiteCaseProgrammeFacts}={}){
  return async function produce(feed,{retrieve=retrieveSource,clock=Date.now,sourceCommit=null}={}){
    const started=clock();if(!Number.isSafeInteger(started))throw new Error('Invalid producer clock.');
    if(sourceCommit!==null&&!/^[a-f0-9]{40}$/.test(sourceCommit))throw new Error('Invalid producer source commit.');
    if(!feed||feed.verification_window_hours!==168||!Array.isArray(feed.records)||feed.records.length>1000)throw new Error('Unexpected public feed.');
    const checkedAt=new Date(started).toISOString(),evidence=[],requests=new Map();
    const matching=feed.records.filter(r=>r?.id===ID),record=matching[0];
    const quarantine=[];
    for(const r of feed.records){
      if(!r||typeof r.id!=='string'||!/^[a-z0-9-]{1,100}$/.test(r.id))throw new Error('Invalid public record identity.');
      if(r.id===ID||quarantine.some(q=>q.id===r.id))continue;
      quarantine.push({id:r.id,reason:r.record_kind!=='advertised_opening'?'not_advertised_opening':r.status!=='open'?'not_open_no_automatic_reopening':'unsupported_source'});
    }
    let reason=null;
    if(matching.length!==1)reason='duplicate_identity';
    else if(record.status!=='open')reason='not_open_no_automatic_reopening';
    else if(!same(semantic(record),template.record))reason='reviewed_semantics_changed';
    else if(started>=CUTOFF)reason='editorial_deadline_cutoff';
    else for(const stamp of [record.last_verified_at,record.last_reviewed_at,record.application_check?.checked_at]){
      if(stamp&&(!Number.isFinite(Date.parse(stamp))||Date.parse(stamp)>started)){reason='invalid_existing_evidence';break;}
    }
    async function fixedRead(url){
      if(![portal,programme].includes(url))throw new Error('Unexpected evidence destination.');
      if(!requests.has(url))requests.set(url,(async()=>{
        const r=await retrieve(url);
        if(!r||r.error||r.status!==200||r.url!==url||!/^text\/html(?:\s*;|$)/i.test(r.contentType??'')||typeof r.body!=='string')throw new Error('Source retrieval not verified.');
        const bytes=Buffer.from(r.body,'utf8');
        if(bytes.length<1||bytes.length>2000000)throw new Error('Source evidence exceeds bounds.');
        const bodyHash=bytesHash(bytes);
        if(r.body_sha256!==bodyHash||r.body_bytes!==bytes.length)throw new Error('Decoded body does not match the transport byte receipt.');
        const proof={request_url:url,final_url:url,status:200,checked_at:checkedAt,body_sha256:bodyHash,body_bytes:bytes.length};
        evidence.push(proof);
        return {...r,body_sha256:proof.body_sha256,body_bytes:proof.body_bytes};
      })());
      return requests.get(url);
    }
    if(!reason){
      try{
        const app=evaluateSource(record,await fixedRead(portal),started);
        if(app.outcome==='closed')reason='employer_closed';
        else if(app.outcome!=='verified'||app.result!=='login_required')reason='application_uncertain';
        else if((await verifyFacts(record,{retrieve:fixedRead})).outcome!=='verified')reason='source_facts_changed_or_uncertain';
      }catch{reason='retrieval_or_receipt_failed';}
    }
    const finished=clock();
    if(!Number.isSafeInteger(finished)||finished<started||finished-started>60000)throw new Error('Source check exceeded its one-minute preparation window.');
    if(!reason&&finished>=CUTOFF)reason='editorial_deadline_cutoff';
    const generatedAt=new Date(finished).toISOString();
    const envelopeUntil=finished+12*HOUR;
    const candidates=[];
    if(!reason){
      if(evidence.length!==2)throw new Error('Both independent official pages are required.');
      candidates.push({...structuredClone(template.candidate),content:render(checkedAt),evidence:{checked_at:checkedAt,expires_at:new Date(Math.min(started+12*HOUR,CUTOFF)).toISOString(),application_result:'login_required',provenance:evidence}});
    }
    quarantine.push({id:ID,reason:reason??'translation_review_pending'});
    const report={schema:'saudilaw-public-source-check/v1',source_commit:sourceCommit,checked_at:checkedAt,generated_at:generatedAt,status:reason?'withheld':'review_only',reason:reason??'translation_review_pending',record_id:ID,requests:requests.size,evidence,publication_enabled:false,accepted_count:0};
    const payload={schema:'saudilaw-publication-candidate/v1',catalogue_version:'saudilaw-upstream-v1',publication_enabled:false,accepted:[],upstream_sha256:digest(report),generated_at:generatedAt,expires_at:new Date(candidates.length?Math.min(started+12*HOUR,CUTOFF):envelopeUntil).toISOString(),candidates,quarantine};
    const candidate={...payload,sha256:digest(payload)};
    validateReviewCandidate(candidate,{now:finished});
    return {candidate,report};
  };
}
export const produceReviewCandidate=createReviewCandidateProducer();

// Validate again at the write boundary. Input checksums never grant posting approval.
export function validateReviewCandidate(input,{now=Date.now()}={}){
  if(!Number.isSafeInteger(now)||Buffer.byteLength(JSON.stringify(input))>256000)throw new Error('Candidate budget/clock invalid.');
  exact(input,['schema','catalogue_version','publication_enabled','accepted','upstream_sha256','generated_at','expires_at','candidates','quarantine','sha256']);
  const {sha256,...payload}=input;
  if(!sha(sha256)||digest(payload)!==sha256||!sha(input.upstream_sha256))throw new Error('Candidate digest mismatch.');
  if(input.schema!=='saudilaw-publication-candidate/v1'||input.catalogue_version!=='saudilaw-upstream-v1'||input.publication_enabled!==false||!Array.isArray(input.accepted)||input.accepted.length)throw new Error('Publication must remain disabled.');
  const generated=time(input.generated_at),expiry=time(input.expires_at);
  if(generated>now||now-generated>15*60000||expiry<=now||expiry<=generated||expiry-generated>12*HOUR)throw new Error('Candidate was not freshly prepared.');
  if(!Array.isArray(input.candidates)||input.candidates.length>1||!Array.isArray(input.quarantine)||input.quarantine.length>1100)throw new Error('Candidate count invalid.');
  for(const q of input.quarantine){exact(q,['id','reason']);if(typeof q.id!=='string'||!/^[a-z0-9-]{1,100}$/.test(q.id)||!holdReasons.has(q.reason))throw new Error('Unsupported hold.');}
  const holds=input.quarantine.filter(q=>q.id===ID);if(holds.length!==1)throw new Error('Exactly one target hold is required.');
  for(const c of input.candidates){
    exact(c,['record_id','identity','semantic_sha256','translation_sha256','translation_status','content','evidence']);
    for(const key of ['record_id','identity','semantic_sha256','translation_sha256','translation_status'])if(c[key]!==template.candidate[key])throw new Error('Reviewed identity/copy changed.');
    exact(c.evidence,['checked_at','expires_at','application_result','provenance']);
    const checked=time(c.evidence.checked_at),until=time(c.evidence.expires_at);
    if(checked>generated||now-checked>15*60000||until<=now||until>Math.min(expiry,checked+12*HOUR,CUTOFF)||c.evidence.application_result!=='login_required')throw new Error('Invalid source evidence time/result.');
    if(!same(c.content,render(c.evidence.checked_at)))throw new Error('Approved public wording changed.');
    const proofs=c.evidence.provenance;
    if(!Array.isArray(proofs)||proofs.length!==2||!same(proofs.map(p=>p.request_url).sort(),[portal,programme].sort()))throw new Error('Missing official evidence.');
    for(const p of proofs){exact(p,['request_url','final_url','status','checked_at','body_sha256','body_bytes']);if(p.request_url!==p.final_url||p.status!==200||p.checked_at!==c.evidence.checked_at||!sha(p.body_sha256)||!Number.isSafeInteger(p.body_bytes)||p.body_bytes<1||p.body_bytes>2000000)throw new Error('Invalid official evidence.');}
    if(holds[0].reason!=='translation_review_pending')throw new Error('Preview must remain withheld pending consumer review.');
  }
  if(!input.candidates.length&&holds[0].reason==='translation_review_pending')throw new Error('Empty evidence cannot claim a verified review preview.');
  return input;
}

export async function run(input='dist/opportunities.json',output='review-candidate-results'){
  if((await stat(input)).size>2000000)throw new Error('Public feed exceeds byte limit.');
  const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  const {candidate,report}=await produceReviewCandidate(JSON.parse(await readFile(input,'utf8')),{sourceCommit});
  await mkdir(output,{recursive:true});
  await writeFile(join(output,'saudilaw-publication-candidates.json'),JSON.stringify(candidate,null,2)+'\n');
  await writeFile(join(output,'candidate-source-check.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({generated_at:candidate.generated_at,preview_count:candidate.candidates.length,reason:report.reason,publication_enabled:false,output:resolve(output)}));
  return {candidate,report};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await run(process.argv[2],process.argv[3]);
