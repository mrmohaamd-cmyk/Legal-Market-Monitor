// Structured content only. These data contracts cannot select code, templates,
// credentials, request destinations or runtime permissions.
import {canonical,digest,timestamp} from './reviewed-content.mjs';
import {createHash} from 'node:crypto';
const normalizeIdentity=value=>value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu,' ').trim();
const recordHashes=record=>({recordHash:createHash('sha256').update('record:'+record.id).digest('hex'),identityHash:createHash('sha256').update('identity:'+[record.firm_name,record.role_title,record.location].map(normalizeIdentity).join('|')).digest('hex')});

export const OWNER_JOB_SCHEMA='saudilaw-owner-job/v1';
export const OWNER_JOB_FEED_SCHEMA='saudilaw-owner-job-feed/v1';
export const OWNER_JOB_FEED_PATH='dist/saudilaw-owner-jobs.json';
export const MAX_OWNER_JOB_FEED_BYTES=800000;
export const OWNER_EMPLOYERS=Object.freeze({
  'white-case':Object.freeze({name:'White & Case',arabicName:'White & Case',hosts:Object.freeze(['www.whitecase.com','whitecase.grad.allhires.com']),fixtureId:'white-case-saudi-law-trainee-2027'}),
  'ao-shearman':Object.freeze({name:'A&O Shearman',arabicName:'A&O Shearman',hosts:Object.freeze(['www.aoshearman.com','careers.aoshearman.com','jobs.aoshearman.com']),fixtureId:'ao-shearman-winter-2026-coop'}),
  'pinsent-masons':Object.freeze({name:'Pinsent Masons',arabicName:'Pinsent Masons',hosts:Object.freeze(['www.pinsentmasons.com']),fixtureId:'pinsent-masons-riyadh-coop-2027-01'}),
  segal:Object.freeze({name:'Segal Law Firm',arabicName:'سجال للمحاماة',hosts:Object.freeze(['www.segal.com.sa']),fixtureId:'segal-riyadh-student-intern-2026'})
});
const HOUR=3600000,HASH=/^[a-f0-9]{64}$/,ID=/^[a-z][a-z0-9-]{0,99}$/;
const clone=value=>JSON.parse(canonical(value));
const same=(a,b)=>canonical(a)===canonical(b);
function exact(value,required,optional=[]){if(!value||typeof value!=='object'||Array.isArray(value)||required.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>![...required,...optional].includes(key)))throw Error('owner_job_shape');}
function clock(now){if(!Number.isSafeInteger(now)||now<0)throw Error('owner_job_clock');}
function plain(value,max=1200){return typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=max&&!/[<>\[\]\r\n\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]|https?:|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u.test(value);}
function pair(value,max=1200){exact(value,['ar','en']);if(!plain(value.ar,max)||!plain(value.en,max))throw Error('owner_job_copy');}
export function ownerEmployerUrl(value,employerKey){try{const u=new URL(value),employer=OWNER_EMPLOYERS[employerKey];return Boolean(employer&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&u.href===value&&employer.hosts.includes(u.hostname)&&!/[()\s\u0000-\u001f\u007f]/.test(value));}catch{return false;}}
export function ownerSourceFinalUrlAllowed(sourceUrl,finalUrl,employerKey){
  if(!ownerEmployerUrl(sourceUrl,employerKey))return false;
  if(finalUrl===sourceUrl)return true;
  // The existing A&O Saudi ATS adds its own exact job fragment after loading.
  // This is the same resource, not an arbitrary redirect or destination grant.
  if(employerKey!=='ao-shearman')return false;
  const u=new URL(sourceUrl),params=u.searchParams;
  if(u.hostname!=='jobs.aoshearman.com'||u.pathname!=='/TGnewUI/Search/home/HomeWithPreLoad'||[...params.keys()].sort().join(',')!=='PageType,jobid,partnerid,siteid'||params.get('PageType')!=='JobDetails'||params.get('partnerid')!=='30147'||params.get('siteid')!=='5040'||!/^[1-9]\d{0,11}$/.test(params.get('jobid')??''))return false;
  return finalUrl===sourceUrl+'#jobDetails='+params.get('jobid')+'_'+params.get('siteid');
}
function date(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function validateDeadline(d){
  exact(d,['date','at','time_zone','published']);
  if(typeof d.published!=='boolean'||!d.published&&(d.date!==null||d.at!==null||d.time_zone!==null)||d.published&&!date(d.date))throw Error('owner_job_deadline');
  if(d.at===null){if(d.time_zone!==null)throw Error('owner_job_deadline');return;}
  if(!d.published||typeof d.time_zone!=='string'||!plain(d.time_zone,100))throw Error('owner_job_deadline');
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:d.time_zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(timestamp(d.at));
  if(['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-')!==d.date)throw Error('owner_job_deadline');
}
export function ownerJobCutoff(deadline){validateDeadline(deadline);return !deadline.published?null:deadline.at??new Date(Date.parse(deadline.date+'T00:00:00Z')-3*HOUR).toISOString();}
function validateContext(job,now){
  const c=job.context,lease=job.contextLease,identity=recordHashes(ownerJobRecord(job)).identityHash;
  if(!c||c.opportunityIdentity!==identity||c.reviewContext?.fixtureOnly!==false||c.reviewContext?.suppressed!==false||c.cohort!==null&&c.cohort!==undefined)throw Error('owner_job_context');
  if(timestamp(c.researchedAt)>now||!Array.isArray(c.evidence)||c.evidence.some(e=>!ownerEmployerUrl(e.url,job.employerKey)))throw Error('owner_job_context_origin');
  exact(lease,['schema','kind','reviewedAt','validUntil','claimIds','reason']);
  const reviewed=timestamp(lease.reviewedAt),until=timestamp(lease.validUntil),ids=[...(c.firm?.sentences??[]),...(c.saudiDeal?.facts??[])].map(x=>x.id).sort();
  if(lease.schema!=='saudilaw-historical-context-lease/v1'||lease.kind!=='reviewed_historical_context'||reviewed>now||reviewed<timestamp(c.researchedAt)||until<=reviewed||until-reviewed>28*24*HOUR||!plain(lease.reason,1000)||!Array.isArray(lease.claimIds)||!same([...lease.claimIds].sort(),ids))throw Error('owner_job_context_lease');
  exact(c,['schema','opportunityIdentity','researchedAt','reviewContext','evidence','firm','saudiDeal'],['cohort','opportunityNotes']);
  if(c.schema!=='saudilaw-opportunity-context-review/v1')throw Error('owner_job_context');
  exact(c.reviewContext,['fixtureOnly','suppressed','note']);if(!plain(c.reviewContext.note,1000))throw Error('owner_job_context');
  exact(c.firm,['sentences']);if(!Array.isArray(c.firm.sentences)||c.firm.sentences.length!==2)throw Error('owner_job_context');
  if(c.saudiDeal!==null){exact(c.saudiDeal,['facts']);if(!Array.isArray(c.saudiDeal.facts)||c.saudiDeal.facts.length<1||c.saudiDeal.facts.length>2)throw Error('owner_job_context');}
  if(c.opportunityNotes!==undefined&&(!Array.isArray(c.opportunityNotes)||c.opportunityNotes.length>2))throw Error('owner_job_context');
  const claims=[...c.firm.sentences,...(c.saudiDeal?.facts??[]),...(c.opportunityNotes??[])],claimMap=new Map(),evidenceMap=new Map();
  const claimId=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(value);
  const list=value=>Array.isArray(value)&&value.length>0&&value.length<=8&&new Set(value).size===value.length&&value.every(claimId);
  for(const claim of claims){exact(claim,['id','ar','en','evidenceIds']);if(!claimId(claim.id)||claimMap.has(claim.id)||!plain(claim.ar,700)||!plain(claim.en,700)||!list(claim.evidenceIds))throw Error('owner_job_context_claim');claimMap.set(claim.id,claim);}
  if(c.evidence.length>24)throw Error('owner_job_context');
  for(const evidence of c.evidence){exact(evidence,['id','url','publisher','checkedAt','claimIds','locator','reviewStatus'],['bodySha256','sourceCategory']);
    if(!claimId(evidence.id)||evidenceMap.has(evidence.id)||!plain(evidence.publisher,150)||!plain(evidence.locator,700)||evidence.reviewStatus!=='inspected_primary'||timestamp(evidence.checkedAt)>timestamp(c.researchedAt)||!list(evidence.claimIds)||evidence.bodySha256!==undefined&&!HASH.test(evidence.bodySha256)||evidence.sourceCategory!==undefined&&!['organization_primary','public_aggregate'].includes(evidence.sourceCategory))throw Error('owner_job_context_evidence');evidenceMap.set(evidence.id,evidence);}
  if(claims.some(claim=>claim.evidenceIds.some(id=>!evidenceMap.get(id)?.claimIds.includes(claim.id)))||c.evidence.some(evidence=>evidence.claimIds.some(id=>!claimMap.get(id)?.evidenceIds.includes(evidence.id))))throw Error('owner_job_context_binding');
  for(const language of ['ar','en']){
    const count=items=>items.map(x=>x[language]).join(' ').trim().split(/\s+/u).filter(Boolean).length;
    if(count(c.firm.sentences)>40||count(c.saudiDeal?.facts??[])>40||count(c.opportunityNotes??[])>60||count([...c.firm.sentences,...(c.saudiDeal?.facts??[])])>120)throw Error('owner_job_context_budget');
  }

}
export function ownerJobRecord(job){const e=OWNER_EMPLOYERS[job.employerKey];return {id:job.id,firm_name:e.name,firm_slug:job.employerKey,role_title:job.sourceIdentity.roleTitleEn+(job.sourceIdentity.intakeStartOn?' — intake '+job.sourceIdentity.intakeStartOn:''),location:job.sourceIdentity.locationEn,source_url:job.weekly.source_url,application_url:job.weekly.application_url,firm_careers_url:job.weekly.source_url};}
export function validateOwnerJob(input,{now=Date.now()}={}){
  clock(now);const j=clone(input);if(Buffer.byteLength(canonical(j))>65000)throw Error('owner_job_budget');
  exact(j,['schema','id','employerKey','sourceIdentity','weekly','context','contextLease','sources','applicationResult','editorialCutoffAt'],['availability']);
  const employer=OWNER_EMPLOYERS[j.employerKey];
  const upcoming=j.availability?.status==='upcoming';
  if(j.availability!==undefined){exact(j.availability,['status','opensOn']);if(!upcoming||!date(j.availability.opensOn)||Date.parse(j.availability.opensOn+'T00:00:00Z')-3*HOUR<=now)throw Error('owner_job_upcoming_date');}
  if(j.schema!==OWNER_JOB_SCHEMA||!ID.test(j.id??'')||!employer)throw Error('owner_job_identity');
  const w=j.weekly;exact(w,['employer','role','location','category','eligibility_points','deadline','application_url','source_url'],['opportunity_summary','deadline_copy']);
  pair(w.employer,150);pair(w.role,250);pair(w.location,200);
  if(w.employer.en!==employer.name||w.employer.ar!==employer.arabicName||!['trainee','graduate','junior','internship','coop'].includes(w.category))throw Error('owner_job_employer');
  // Official source identity is independent of editorial wording. Rephrasing a
  // role or changing a local candidate ID cannot reset its historical claims.
  exact(j.sourceIdentity,['roleTitleEn','locationEn'],['intakeStartOn']);
  if(j.sourceIdentity.intakeStartOn!==undefined&&(!date(j.sourceIdentity.intakeStartOn)||upcoming&&j.sourceIdentity.intakeStartOn<j.availability.opensOn))throw Error('owner_job_intake_date');
  if(!plain(j.sourceIdentity.roleTitleEn,250)||!plain(j.sourceIdentity.locationEn,200))throw Error('owner_job_source_identity');
  // Saudi offices only; no data-controlled geographic or employer expansion.
  if(!/^(Riyadh|Jeddah|Dhahran|Al Khobar|Dammam), Saudi Arabia$/.test(j.sourceIdentity.locationEn)||w.location.en!==j.sourceIdentity.locationEn)throw Error('owner_job_location');
  exact(w.eligibility_points,['ar','en']);
  if(!['ar','en'].every(language=>Array.isArray(w.eligibility_points[language])&&w.eligibility_points[language].length>0&&w.eligibility_points[language].length<=12&&w.eligibility_points[language].every(p=>plain(p))))throw Error('owner_job_eligibility');
  if(w.eligibility_points.ar.length!==w.eligibility_points.en.length)throw Error('owner_job_eligibility_parity');
  for(const key of ['opportunity_summary','deadline_copy'])if(w[key]!==undefined)pair(w[key],key==='deadline_copy'?600:1600);
  if(!ownerEmployerUrl(w.application_url,j.employerKey)||!ownerEmployerUrl(w.source_url,j.employerKey))throw Error('owner_job_source_origin');
  validateDeadline(w.deadline);if(j.editorialCutoffAt!==ownerJobCutoff(w.deadline))throw Error('owner_job_cutoff');
  if(!(upcoming?j.applicationResult==='not_open_yet':['login_required','form_available'].includes(j.applicationResult))||upcoming&&w.application_url!==w.source_url||!Array.isArray(j.sources)||j.sources.length<(upcoming?1:2)||j.sources.length>5)throw Error('owner_job_sources');
  const urls=new Set();for(const s of j.sources){
    exact(s,['url','role','kind','bodySha256','bodyBytes','requiredText']);
    if(s.kind==='http_visible_text'&&s.role!=='programme'||!ownerEmployerUrl(s.url,j.employerKey)||urls.has(s.url)||!['application','vacancy','programme'].includes(s.role)||!['http_html','browser_dom','http_visible_text'].includes(s.kind)||!HASH.test(s.bodySha256??'')||!Number.isSafeInteger(s.bodyBytes)||s.bodyBytes<1||s.bodyBytes>2000000||!Array.isArray(s.requiredText)||s.requiredText.length<1||s.requiredText.length>24||s.requiredText.some(p=>!plain(p,500)))throw Error('owner_job_source');urls.add(s.url);
  }
  if(!upcoming&&!j.sources.some(s=>s.role==='application'&&s.url===w.application_url)||!j.sources.some(s=>['vacancy','programme'].includes(s.role)&&s.url===w.source_url))throw Error('owner_job_source_roles');
  if(!j.sources.some(s=>['vacancy','programme'].includes(s.role)&&s.url===w.source_url&&s.requiredText.includes(j.sourceIdentity.roleTitleEn)))throw Error('owner_job_source_identity_assertion');
  if(upcoming&&(!j.sources.some(s=>s.role==='programme'&&s.url===w.source_url)||w.deadline.date!==null&&j.availability.opensOn>=w.deadline.date))throw Error('owner_job_upcoming_source');
  validateContext(j,now);return j;
}
export function ownerJobDigest(job){return digest(job);}
export function validateOwnerJobFeed(input,{now=Date.now()}={}){
  clock(now);const feed=clone(input);if(Buffer.byteLength(canonical(feed))>MAX_OWNER_JOB_FEED_BYTES)throw Error('owner_job_feed_budget');
  exact(feed,['schema','generatedAt','expiresAt','publicationEnabled','jobs','sha256']);const {sha256,...payload}=feed;
  if(feed.schema!==OWNER_JOB_FEED_SCHEMA||feed.publicationEnabled!==false||!HASH.test(sha256??'')||digest(payload)!==sha256)throw Error('owner_job_feed_integrity');
  const generated=timestamp(feed.generatedAt),expires=timestamp(feed.expiresAt);if(generated>now||expires<=now||expires<=generated||expires-generated>12*HOUR||!Array.isArray(feed.jobs)||feed.jobs.length>100)throw Error('owner_job_feed_freshness');
  const ids=new Set(),identities=new Set();
  for(const item of feed.jobs){
    exact(item,['job','sourceStatus','checkedAt','expiresAt','applicationResult','proofs','reason']);
    const job=validateOwnerJob(item.job,{now}),identity=recordHashes(ownerJobRecord(job)).identityHash;
    if(ids.has(job.id)||identities.has(identity))throw Error('owner_job_feed_duplicate');ids.add(job.id);identities.add(identity);
    if(item.sourceStatus==='attention_required'){
      if(!/^[a-z][a-z0-9_-]{0,119}$/.test(item.reason??'')||item.checkedAt!==null||item.expiresAt!==null||item.applicationResult!==null||!Array.isArray(item.proofs)||item.proofs.length)throw Error('owner_job_failed_evidence');continue;
    }
    if(item.sourceStatus!=='verified'||item.reason!==null||item.applicationResult!==job.applicationResult||!Array.isArray(item.proofs)||item.proofs.length!==job.sources.length)throw Error('owner_job_verified_evidence');
    const seen=new Set(),times=[];
    for(const proof of item.proofs){
      exact(proof,['url','finalUrl','kind','status','checkedAt','bodySha256','bodyBytes']);const source=job.sources.find(s=>s.url===proof.url),at=timestamp(proof.checkedAt);
      if(!source||seen.has(proof.url)||!ownerSourceFinalUrlAllowed(source.url,proof.finalUrl,job.employerKey)||proof.kind!==source.kind||!(proof.status===200||source.kind==='browser_dom'&&proof.status===null)||proof.bodySha256!==source.bodySha256||proof.bodyBytes!==source.bodyBytes||at>generated||now-at>=168*HOUR)throw Error('owner_job_proof');seen.add(proof.url);times.push(at);
    }
    const checked=timestamp(item.checkedAt),until=timestamp(item.expiresAt);
    if(checked!==Math.min(...times)||until<=now||until>Math.min(expires,checked+168*HOUR,...(job.availability?[Date.parse(job.availability.opensOn+'T00:00:00Z')-3*HOUR]:[]),job.editorialCutoffAt===null?Infinity:timestamp(job.editorialCutoffAt)))throw Error('owner_job_evidence_expiry');
  }
  return feed;
}
