// Independent read-only coverage contract. This never authorizes publication or
// changes the existing W&C publication-candidate/v1 consumer.
import {canonical,digest,timestamp} from './reviewed-content.mjs';

export const SOURCE_COVERAGE_SCHEMA='saudilaw-source-coverage/v1';
export const SOURCE_COVERAGE_PATH='dist/saudilaw-source-coverage.json';
export const MAX_SOURCE_COVERAGE_BYTES=256000;
const HOUR=3600000,HASH=/^[a-f0-9]{64}$/,ID=/^[a-z0-9-]{1,100}$/;
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const code=v=>typeof v==='string'&&/^[a-z][a-z0-9_-]{0,119}$/.test(v);
const same=(a,b)=>canonical(a)===canonical(b);
function requireExact(value,keys,reason){if(!exact(value,keys))throw new Error(reason);}
function url(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.href===value&&!/[\s\u0000-\u001f\u007f]/.test(value);}catch{return false;}}
function nowMs(now){if(!Number.isSafeInteger(now)||now<0)throw new Error('coverage_clock');return now;}
function draft(value){
  requireExact(value,['title','text'],'coverage_draft_shape');
  if(typeof value.title!=='string'||!value.title.trim()||value.title.length>500||typeof value.text!=='string'||!value.text.trim()||Buffer.byteLength(value.text)>36000||/[\u202a-\u202e\u2066-\u2069]/.test(value.title+value.text))throw new Error('coverage_draft_invalid');
  return JSON.parse(canonical(value));
}
function catalogueEntries(catalogue){
  if(!Array.isArray(catalogue)||catalogue.length<1||catalogue.length>3)throw new Error('coverage_catalogue_count');
  const ids=new Set(),identities=new Set();
  for(const e of catalogue){
    requireExact(e,['id','identity','record','facts','translationSha256','renderingVersion','renderDraft','sources','applicationResult','editorialCutoffAt'],'coverage_catalogue_shape');
    if(!ID.test(e.id??'')||typeof e.identity!=='string'||!e.identity||e.identity.length>200||ids.has(e.id)||identities.has(e.identity)||e.record?.id!==e.id||!HASH.test(e.translationSha256??'')||typeof e.renderingVersion!=='string'||!/^[a-z0-9][a-z0-9_/-]{0,119}$/.test(e.renderingVersion)||typeof e.renderDraft!=='function')throw new Error('coverage_catalogue_identity');
    canonical(e.record);canonical(e.facts);ids.add(e.id);identities.add(e.identity);
    if(!['login_required','form_available'].includes(e.applicationResult)||!Array.isArray(e.sources)||e.sources.length<2||e.sources.length>5)throw new Error('coverage_catalogue_sources');
    if(e.editorialCutoffAt!==null)timestamp(e.editorialCutoffAt);
    const urls=new Set();
    for(const s of e.sources){
      if(!exact(s,['url','role','kind'])&&!exact(s,['url','role','kind','permittedFinalUrls']))throw new Error('coverage_source_shape');
      if(!url(s.url)||urls.has(s.url)||!['vacancy','programme','application'].includes(s.role)||!['http_html','browser_dom'].includes(s.kind))throw new Error('coverage_source_descriptor');
      urls.add(s.url);
      if(s.permittedFinalUrls!==undefined&&(!Array.isArray(s.permittedFinalUrls)||s.permittedFinalUrls.length>5||new Set(s.permittedFinalUrls).size!==s.permittedFinalUrls.length||s.permittedFinalUrls.some(x=>!url(x))))throw new Error('coverage_redirect_allowlist');
    }
    if(!e.sources.some(s=>s.role==='application')||!e.sources.some(s=>s.role==='vacancy'||s.role==='programme'))throw new Error('coverage_source_roles');
  }
  return catalogue;
}
export function sourceCoverageTuple(entry){return {semanticSha256:digest({record:entry.record,facts:entry.facts}),translationSha256:entry.translationSha256,renderingVersion:entry.renderingVersion};}
function validateProofs(proofs,entry,checkedAt,generatedAt,now){
  if(!Array.isArray(proofs)||proofs.length!==entry.sources.length)throw new Error('coverage_source_proof_count');
  const seen=new Set(),times=[];
  for(const p of proofs){
    requireExact(p,['url','finalUrl','kind','status','checkedAt','bodySha256','bodyBytes'],'coverage_proof_shape');
    const source=entry.sources.find(s=>s.url===p.url),at=timestamp(p.checkedAt);
    if(!source||seen.has(p.url)||p.kind!==source.kind||!(p.status===200||p.kind==='browser_dom'&&p.status===null)||p.finalUrl!==source.url&&!source.permittedFinalUrls?.includes(p.finalUrl)||!HASH.test(p.bodySha256??'')||!Number.isSafeInteger(p.bodyBytes)||p.bodyBytes<1||p.bodyBytes>2000000||at>generatedAt||at>now||now-at>=168*HOUR)throw new Error('coverage_source_proof');
    seen.add(p.url);times.push(at);
  }
  if(timestamp(checkedAt)!==Math.min(...times))throw new Error('coverage_evidence_time_binding');
}
function validateDispositions(dispositions,now,catalogue,reviewedDispositions){
  if(!Array.isArray(dispositions)||dispositions.length>100||!Array.isArray(reviewedDispositions)||reviewedDispositions.length>100)throw new Error('coverage_disposition_count');
  const trustedIds=new Set();
  for(const reviewed of reviewedDispositions){
    if(trustedIds.has(reviewed?.id)||!['excluded_route','excluded_closed'].includes(reviewed?.disposition))throw new Error('coverage_reviewed_disposition');
    trustedIds.add(reviewed.id);
  }
  const ids=new Set(catalogue.map(e=>e.id));
  for(const d of dispositions){
    requireExact(d,['id','disposition','recordSha256','observedAt','reason','proofs'],'coverage_disposition_shape');
    if(!ID.test(d.id??'')||ids.has(d.id)||!['excluded_route','excluded_closed','verification_pending','unknown'].includes(d.disposition)||!HASH.test(d.recordSha256??'')||!code(d.reason)||d.observedAt!==null&&timestamp(d.observedAt)>now||!Array.isArray(d.proofs)||d.proofs.length>5)throw new Error('coverage_disposition_invalid');
    // A reason must preserve the actual state; pending verification is not closure.
    const expected={excluded_route:'not_advertised_opening',excluded_closed:'closed_no_automatic_reopening',verification_pending:'verification_pending_no_automatic_reopening'};
    if(d.disposition!=='unknown'&&(d.observedAt===null||d.reason!==expected[d.disposition]))throw new Error('coverage_disposition_state_mismatch');
    const times=[];
    for(const p of d.proofs){
      requireExact(p,['url','finalUrl','kind','status','checkedAt','bodySha256','bodyBytes'],'coverage_disposition_proof_shape');
      const at=timestamp(p.checkedAt);
      if(!url(p.url)||!url(p.finalUrl)||!['http_html','browser_dom'].includes(p.kind)||!(p.status===200||p.kind==='browser_dom'&&p.status===null)||!HASH.test(p.bodySha256??'')||!Number.isSafeInteger(p.bodyBytes)||p.bodyBytes<1||p.bodyBytes>2000000||at>now)throw new Error('coverage_disposition_proof');
      times.push(at);
    }
    if(times.length&&timestamp(d.observedAt)!==Math.min(...times))throw new Error('coverage_disposition_time');
    if(d.disposition.startsWith('excluded_')){
      const trusted=reviewedDispositions.find(x=>x.id===d.id);
      if(!times.length||!trusted||!same(d,trusted))throw new Error('coverage_disposition_review_binding');
    }
    ids.add(d.id);
  }
  if(reviewedDispositions.some(d=>!dispositions.some(x=>x.id===d.id)))throw new Error('coverage_disposition_missing');
}

/** Compile only trusted adapter observations, never browser form fields. Source
 * receipts attest checks; neither checksums nor incoming flags approve a draft. */
export function compileSourceCoverage({catalogue,observations,reviewedDispositions=[],dispositions=reviewedDispositions,now=Date.now()}={}){
  nowMs(now);const entries=catalogueEntries(catalogue);
  if(!observations||Array.isArray(observations)||typeof observations!=='object'||Object.keys(observations).some(id=>!entries.some(e=>e.id===id)))throw new Error('coverage_observation_identity');
  canonical(observations);validateDispositions(dispositions,now,entries,reviewedDispositions);
  const generatedAt=new Date(now).toISOString(),expiresAt=new Date(now+12*HOUR).toISOString();
  const reports=entries.map(e=>{
    const tuple=sourceCoverageTuple(e),o=observations[e.id]??{status:'attention_required',reason:'source_observation_missing'};
    const base={id:e.id,identity:e.identity,semantic_sha256:tuple.semanticSha256,translation_sha256:tuple.translationSha256,rendering_version:tuple.renderingVersion,translation_status:'pending'};
    if(o.status==='attention_required'){
      requireExact(o,['status','reason'],'coverage_failed_observation_shape');if(!code(o.reason))throw new Error('coverage_observation_reason');
      return {...base,source_status:'attention_required',reason:o.reason,checked_at:null,expires_at:null,application_result:null,draft:null,draft_sha256:null,proofs:[]};
    }
    requireExact(o,['status','checkedAt','semanticSha256','applicationResult','proofs'],'coverage_verified_observation_shape');
    if(o.status!=='verified'||o.semanticSha256!==tuple.semanticSha256||o.applicationResult!==e.applicationResult)throw new Error('coverage_verified_observation_binding');
    validateProofs(o.proofs,e,o.checkedAt,now,now);
    const until=Math.min(now+12*HOUR,timestamp(o.checkedAt)+168*HOUR,e.editorialCutoffAt===null?Infinity:timestamp(e.editorialCutoffAt));
    if(until<=now)throw new Error('coverage_editorial_expiry');
    const rendered=draft(e.renderDraft(o.checkedAt));
    return {...base,source_status:'verified',reason:null,checked_at:o.checkedAt,expires_at:new Date(until).toISOString(),application_result:o.applicationResult,draft:rendered,draft_sha256:digest(rendered),proofs:JSON.parse(canonical(o.proofs))};
  });
  const payload={schema:SOURCE_COVERAGE_SCHEMA,generated_at:generatedAt,expires_at:expiresAt,publication_enabled:false,accepted:[],entries:reports,dispositions:JSON.parse(canonical(dispositions))};
  const artifact={...payload,sha256:digest(payload)};validateSourceCoverage(artifact,{catalogue,reviewedDispositions,now});return artifact;
}

/** Re-derive exact semantics, every draft and each source destination against the
 * compiled catalogue. Added approval flags and resealed copy changes reject. */
export function validateSourceCoverage(input,{catalogue,reviewedDispositions=[],now=Date.now()}={}){
  nowMs(now);const entries=catalogueEntries(catalogue),encoded=canonical(input);
  if(Buffer.byteLength(encoded)>MAX_SOURCE_COVERAGE_BYTES)throw new Error('coverage_byte_budget');
  const s=JSON.parse(encoded);requireExact(s,['schema','generated_at','expires_at','publication_enabled','accepted','entries','dispositions','sha256'],'coverage_schema');
  const {sha256,...payload}=s;if(!HASH.test(sha256??'')||digest(payload)!==sha256)throw new Error('coverage_integrity');
  const generated=timestamp(s.generated_at),expires=timestamp(s.expires_at);
  if(s.schema!==SOURCE_COVERAGE_SCHEMA||s.publication_enabled!==false||!Array.isArray(s.accepted)||s.accepted.length)throw new Error('coverage_publication_locked');
  if(generated>now||expires<=now||expires<=generated||expires-generated>12*HOUR)throw new Error('coverage_not_fresh');
  if(!Array.isArray(s.entries)||s.entries.length!==entries.length)throw new Error('coverage_entry_count');
  const ids=new Set();
  for(const r of s.entries){
    requireExact(r,['id','identity','semantic_sha256','translation_sha256','rendering_version','translation_status','source_status','reason','checked_at','expires_at','application_result','draft','draft_sha256','proofs'],'coverage_entry_shape');
    const e=entries.find(entry=>entry.id===r.id);if(!e||ids.has(r.id))throw new Error('coverage_entry_identity');ids.add(r.id);
    const tuple=sourceCoverageTuple(e);
    if(r.identity!==e.identity||r.semantic_sha256!==tuple.semanticSha256||r.translation_sha256!==tuple.translationSha256||r.rendering_version!==tuple.renderingVersion||r.translation_status!=='pending')throw new Error('coverage_entry_binding');
    if(r.source_status==='attention_required'){
      if(!code(r.reason)||[r.checked_at,r.expires_at,r.application_result,r.draft,r.draft_sha256].some(v=>v!==null)||!Array.isArray(r.proofs)||r.proofs.length)throw new Error('coverage_failed_entry');
      continue;
    }
    if(r.source_status!=='verified'||r.reason!==null||r.application_result!==e.applicationResult)throw new Error('coverage_verified_entry');
    validateProofs(r.proofs,e,r.checked_at,generated,now);
    const until=timestamp(r.expires_at),cutoff=e.editorialCutoffAt===null?Infinity:timestamp(e.editorialCutoffAt);
    if(until<=now||until>Math.min(expires,timestamp(r.checked_at)+168*HOUR,cutoff))throw new Error('coverage_entry_expired');
    const rendered=draft(e.renderDraft(r.checked_at));
    if(!same(r.draft,rendered)||r.draft_sha256!==digest(rendered))throw new Error('coverage_draft_binding');
  }
  validateDispositions(s.dispositions,generated,entries,reviewedDispositions);return s;
}
