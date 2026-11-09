const DEFAULTS = {
  "schema_version": 1,
  "mode": "proposal",
  "destination": "r/SaudiLaw",
  "publication_enabled": false,
  "schedule_enabled": false,
  "verification_interval_hours": 6,
  "snapshot_max_age_hours": 12,
  "source_max_age_hours": 168,
  "proposed_daily_post_cap": 1,
  "proposed_post_time": "09:00",
  "timezone": "Asia/Riyadh",
  "enabled_source_adapters": [
    "whitecase-programme-v1"
  ],
  "quarantine_policy": "hold",
  "unknown_submission_policy": "pause",
  "duplicate_policy": "suppress",
  "language": "ar-en"
};
export const MAX_RECEIPT_BYTES = 256000;
export const DEFAULT_SETTINGS = Object.freeze({...DEFAULTS,enabled_source_adapters:Object.freeze([...DEFAULTS.enabled_source_adapters])});
const sourceUrls = [
  'https://whitecase.grad.allhires.com/app/',
  'https://www.whitecase.com/careers/locations/saudi-arabia/saudi-law-trainee-program'
];
const shaPattern=/^[a-f0-9]{64}$/;
const hour=3600000;
export function canonical(value) {
  let count=0;
  function visit(v,depth) {
    if (++count>20000 || depth>24) throw new Error('Data exceeds inspection limits.');
    if (v===null || typeof v==='boolean' || typeof v==='string') return JSON.stringify(v);
    if (typeof v==='number' && Number.isFinite(v)) return JSON.stringify(v);
    if (typeof v!=='object') throw new Error('Only JSON data is supported.');
    if (Array.isArray(v)) {
      if (Reflect.ownKeys(v).length!==v.length+1 || !Array.from({length:v.length},(_,i)=>Object.getOwnPropertyDescriptor(v,String(i))).every(d=>d&&d.enumerable&&'value'in d)) throw new Error('Invalid JSON array.');
      return '['+v.map(x=>visit(x,depth+1)).join(',')+']';
    }
    if (![Object.prototype,null].includes(Object.getPrototypeOf(v))) throw new Error('Invalid JSON object.');
    if (Reflect.ownKeys(v).length!==Object.keys(v).length || Object.values(Object.getOwnPropertyDescriptors(v)).some(d=>!('value'in d))) throw new Error('Invalid JSON property.');
    return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+visit(v[k],depth+1)).join(',')+'}';
  }
  const result=visit(value,0);
  if (new TextEncoder().encode(result).length>1000000) throw new Error('Data exceeds inspection limits.');
  return result;
}
export async function digest(value) {
  if (!globalThis.crypto?.subtle) throw new Error('Integrity checks need a secure or localhost browser context.');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
export function timestamp(value) {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new Error('Invalid UTC timestamp.');
  const result=Date.parse(value);
  if (!Number.isFinite(result) || new Date(result).toISOString().replace('.000Z','Z')!==value.replace('.000Z','Z')) throw new Error('Invalid UTC timestamp.');
  return result;
}
function integer(value,min,max,label) {
  if (!Number.isSafeInteger(value)||value<min||value>max) throw new Error(label+' must be an integer from '+min+' to '+max+'.');
}
export function validateSettings(value) {
  canonical(value);
  if (!value || typeof value!=='object' || Array.isArray(value) ||
    canonical(Object.keys(value).sort())!==canonical(Object.keys(DEFAULT_SETTINGS).sort())) throw new Error('Settings fields do not match this proposal version.');
  const editable=['verification_interval_hours','snapshot_max_age_hours','source_max_age_hours','proposed_daily_post_cap','proposed_post_time','enabled_source_adapters'];
  for(const key of Object.keys(DEFAULT_SETTINGS)) if(!editable.includes(key)&&value[key]!==DEFAULT_SETTINGS[key]) throw new Error('Locked setting cannot change: '+key);
  integer(value.verification_interval_hours,6,12,'Check interval');
  integer(value.snapshot_max_age_hours,1,12,'Snapshot expiry');
  integer(value.source_max_age_hours,1,168,'Source evidence expiry');
  integer(value.proposed_daily_post_cap,0,1,'Daily posting cap');
  if(value.snapshot_max_age_hours<value.verification_interval_hours) throw new Error('Snapshot expiry must cover at least one proposed check interval.');
  if(value.snapshot_max_age_hours>value.source_max_age_hours) throw new Error('Snapshot expiry cannot outlast source evidence.');
  if(typeof value.proposed_post_time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.proposed_post_time)) throw new Error('Post time must use HH:MM.');
  if(!Array.isArray(value.enabled_source_adapters)||value.enabled_source_adapters.length>1||
    value.enabled_source_adapters.some(x=>x!=='whitecase-programme-v1')) throw new Error('Only the reviewed White & Case adapter can be proposed.');
  return JSON.parse(canonical(value));
}
export function parseReceiptText(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_RECEIPT_BYTES) throw new Error('Receipt exceeds the 256 KB limit.');
  return JSON.parse(text);
}
function nonempty(value,max=200) {return typeof value==='string'&&value.length>0&&value.length<=max;}
export async function inspectReceipt(receipt,{now=Date.now()}={}) {
  if(!Number.isSafeInteger(now)) throw new Error('Invalid inspection clock.');
  const serialized=canonical(receipt);
  if(new TextEncoder().encode(serialized).length>MAX_RECEIPT_BYTES) throw new Error('Receipt exceeds the 256 KB limit.');
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)) throw new Error('Invalid receipt.');
  const {sha256,...payload}=receipt;
  if(!shaPattern.test(sha256??'')||await digest(payload)!==sha256) throw new Error('Receipt integrity check failed.');
  if(receipt.schema_version!==1||receipt.policy_version!=='saudilaw-pipeline-v1'||receipt.catalogue_version!=='saudilaw-upstream-v1'||
    receipt.publication_enabled!==false||!Array.isArray(receipt.accepted)||receipt.accepted.length!==0) throw new Error('This page accepts disabled preview receipts only.');
  const generated=timestamp(receipt.generated_at),expires=timestamp(receipt.expires_at);
  if(generated>now||expires<=generated||expires-generated>12*hour) throw new Error('Invalid receipt freshness window.');
  if(!Array.isArray(receipt.previews)||receipt.previews.length>100||!Array.isArray(receipt.quarantine)||receipt.quarantine.length>1100) throw new Error('Invalid receipt collections.');
  const identities=new Set();
  for(const preview of receipt.previews) {
    if(preview.identity!=='white-case:saudi-law-trainee:2027-03'||preview.record_id!=='white-case-saudi-law-trainee-2027'||identities.has(preview.identity)) throw new Error('Unknown or duplicate preview identity.');
    identities.add(preview.identity);
    if(!shaPattern.test(preview.semantic_sha256??'')||!shaPattern.test(preview.translation_sha256??'')) throw new Error('Missing fact binding.');
    const checked=timestamp(preview.checked_at),until=timestamp(preview.expires_at);
    if(checked>generated||generated-checked>=168*hour||until>expires||until<=generated||until>checked+168*hour) throw new Error('Invalid source evidence freshness.');
    if(preview.application_result!=='login_required'||!Array.isArray(preview.provenance)||preview.provenance.length!==2) throw new Error('Invalid source provenance.');
    const sources=preview.provenance.map(p=>{
      if(p.request_url!==p.final_url||p.status!==200||p.checked_at!==preview.checked_at||!shaPattern.test(p.body_sha256??'')||!Number.isSafeInteger(p.body_bytes)||p.body_bytes<1||p.body_bytes>2000000) throw new Error('Invalid source receipt.');
      return p.request_url;
    }).sort();
    if(canonical(sources)!==canonical([...sourceUrls].sort())) throw new Error('Unexpected source destination.');
    const r=preview.rendered;
    if(!r||!nonempty(r.title,300)||!nonempty(r.text,10000)||/[\u202a-\u202e\u2066-\u2069]/.test(r.title+r.text)||await digest({title:r.title,text:r.text})!==r.content_sha256) throw new Error('Preview text integrity check failed.');
  }
  for(const q of receipt.quarantine) {
    if(!q||typeof q.reason!=='string'||!/^[a-z][a-z0-9_]{0,119}$/.test(q.reason)||!(typeof q.id==='string'&&/^[a-z0-9-]{1,100}$/.test(q.id)||Number.isSafeInteger(q.candidate_index)&&q.candidate_index>=0)) throw new Error('Invalid quarantine record.');
  }
  return {
    health:now>=expires?'expired_preview':'fresh_preview',
    fresh:now<expires,publishable:false,originVerified:false,publicationConnected:false,
    sha256,generated_at:receipt.generated_at,expires_at:receipt.expires_at,
    previews:receipt.previews,quarantine:receipt.quarantine,
    blockers:['No live Reddit connection.','No records accepted for publication.','An imported digest does not establish source authenticity or translation approval.'],
    next_action:receipt.previews.length?'Review exact bilingual wording and source evidence.':'Inspect quarantine reasons; do not renew evidence dates by hand.'
  };
}
export async function createSettingsExport(settings,{now=Date.now(),receiptSha256=null,audit=[]}={}) {
  if(!Number.isSafeInteger(now)) throw new Error('Invalid export time.');
  if(receiptSha256!==null&&!shaPattern.test(receiptSha256)) throw new Error('Invalid receipt reference.');
  if(!Array.isArray(audit)||audit.length>100) throw new Error('Audit limit exceeded.');
  const actions=['receipt_imported','settings_changed','draft_reset','export_requested'];
  const cleaned=audit.map(item=>{
    if(!item||canonical(Object.keys(item).sort())!==canonical(['action','at','detail'])||!actions.includes(item.action)||!nonempty(item.detail,180)||timestamp(item.at)>now) throw new Error('Invalid local audit entry.');
    return {at:item.at,action:item.action,detail:item.detail};
  });
  const payload={schema:'saudilaw-settings-proposal/v1',exported_at:new Date(now).toISOString(),applied:false,
    settings:validateSettings(settings),receipt_sha256:receiptSha256,
    audit_notice:'Local, unsigned activity record; not a server audit or proof of authorization.',audit:cleaned};
  return {...payload,sha256:await digest(payload)};
}
