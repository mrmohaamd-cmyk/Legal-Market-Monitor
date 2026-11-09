import {createHash} from 'node:crypto';
import {WHITE_CASE, CATALOGUE_VERSION, EVIDENCE_KEYS} from './catalogue.mjs';
import {evaluateSource} from '../reverify-opportunities.mjs';
import {verifyWhiteCaseProgrammeFacts} from '../whitecase-verification.mjs';

export const POLICY = Object.freeze({
  version: 'saudilaw-pipeline-v1', publication_enabled: false,
  source_max_age_hours: 168, snapshot_max_age_hours: 12,
  max_records: 100, max_candidates: 1000, max_output_bytes: 256000,
  max_attempts_per_utc_day: 1
});
const hour = 3600000;
const shaPattern = /^[a-f0-9]{64}$/;
const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
export function timestamp(value) {
  if (typeof value !== 'string' || !isoPattern.test(value)) throw new Error('invalid_timestamp');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().replace('.000Z','Z') !== value.replace('.000Z','Z')) throw new Error('invalid_timestamp');
  return ms;
}
export function canonical(value) {
  // Inputs cross a JSON boundary; reject unusual JS values instead of silently
  // dropping them from the semantic or bilingual binding.
  let nodes = 0;
  function visit(v, depth) {
    if (++nodes > 20000 || depth > 24) throw new Error('object_budget');
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (typeof v !== 'object') throw new Error('non_json_value');
    if (Array.isArray(v)) {
      if (Reflect.ownKeys(v).length !== v.length + 1 || !Array.from({length:v.length},(_,i) => Object.getOwnPropertyDescriptor(v,String(i))).every(d => d && d.enumerable && 'value' in d)) throw new Error('non_json_array');
      return '[' + v.map(x => visit(x, depth + 1)).join(',') + ']';
    }
    if (![Object.prototype, null].includes(Object.getPrototypeOf(v))) throw new Error('non_json_object');
    const descriptors = Object.getOwnPropertyDescriptors(v);
    if (Reflect.ownKeys(v).length !== Object.keys(v).length || Object.values(descriptors).some(x => !('value' in x))) throw new Error('non_json_property');
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + visit(v[k],depth + 1)).join(',') + '}';
  }
  const output = visit(value, 0);
  if (Buffer.byteLength(output) > 1000000) throw new Error('object_budget');
  return output;
}
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
export const semanticRecord = record => Object.fromEntries(Object.entries(record).filter(([k]) => !EVIDENCE_KEYS.includes(k)));
export function translationDigest(entry = WHITE_CASE) {
  return digest({catalogue:CATALOGUE_VERSION,identity:entry.identity,reviewedRecord:entry.reviewedRecord,facts:entry.facts,pairs:entry.pairs});
}
export function renderBilingual(entry, checkedAt) {
  timestamp(checkedAt);
  if (!Array.isArray(entry.pairs) || new Set(entry.pairs.map(x => x.id)).size !== entry.pairs.length) throw new Error('duplicate_fact_id');
  const pairs = new Map(entry.pairs.map(x => {
    if (!x.id || typeof x.ar !== 'string' || !x.ar.trim() || typeof x.en !== 'string' || !x.en.trim() || /https?:|\[|\]|<|>|[\u202a-\u202e\u2066-\u2069]/.test(x.ar + x.en)) throw new Error('invalid_bilingual_pair');
    return [x.id,x];
  }));
  const order = ['intake','work','llb','gpa','language','llm','unknown','deadline','entry','notice'];
  if (pairs.size !== order.length + 2 || !pairs.has('role') || !pairs.has('location')) throw new Error('bilingual_fact_coverage');
  const section = language => order.map(id => {
    if (!pairs.has(id)) throw new Error('bilingual_fact_coverage');
    return '- ' + pairs.get(id)[language];
  }).join('\n');
  const title = '[تدريب | Trainee] ' + entry.facts.employer + ' — ' + pairs.get('role').ar + ' / ' + pairs.get('role').en;
  const text = '**العربية**\n\n' + pairs.get('location').ar + '\n\n' + section('ar') +
    '\n\n**English**\n\n' + pairs.get('location').en + '\n\n' + section('en') +
    '\n\n[التقديم / Apply](' + entry.reviewedRecord.application_url + ') | [المصدر / Source](' + entry.reviewedRecord.firm_careers_url + ')' +
    '\n\nوقت التحقق / Checked: ' + checkedAt + '\n\nالمرجع / Reference: ' + entry.id;
  return {title,text,fact_ids:['role','location',...order],content_sha256:digest({title,text})};
}
export function isTranslationApproved(entry, now) {
  const review = entry.translationReview;
  try {
    return review?.status === 'approved' && typeof review.reviewer === 'string' &&
      review.reviewer.trim().length > 0 && timestamp(review.reviewed_at) <= now &&
      review.content_sha256 === translationDigest(entry);
  } catch { return false; }
}

function proof(response, requested, checkedAt) {
  if (!response || response.error || response.status !== 200 || response.url !== requested ||
      !/^text\/html(?:;|$)/i.test(response.contentType ?? '') || typeof response.body !== 'string' ||
      !shaPattern.test(response.body_sha256 ?? '') ||
      createHash('sha256').update(response.body).digest('hex') !== response.body_sha256 ||
      Buffer.byteLength(response.body) !== response.body_bytes) throw new Error('invalid_source_receipt');
  return {request_url:requested,final_url:response.url,status:200,checked_at:checkedAt,
    body_sha256:response.body_sha256,body_bytes:response.body_bytes};
}
export async function verifySupported(record, {retrieve, now, factsCheck = verifyWhiteCaseProgrammeFacts}) {
  if (record.id !== WHITE_CASE.id) return {ok:false,reason:'unsupported_source'};
  const checkedAt = new Date(now).toISOString();
  try {
    const portal = await retrieve(WHITE_CASE.reviewedRecord.source_url);
    const portalProof = proof(portal, WHITE_CASE.reviewedRecord.source_url, checkedAt);
    const availability = evaluateSource(record, portal, now);
    if (availability.outcome !== 'verified') return {ok:false,reason:availability.outcome === 'closed' ? 'employer_closed' : 'application_uncertain'};
    const article = await retrieve(WHITE_CASE.reviewedRecord.firm_careers_url);
    const articleProof = proof(article, WHITE_CASE.reviewedRecord.firm_careers_url, checkedAt);
    const facts = await factsCheck(record,{retrieve:async url => url === articleProof.request_url ? article : {error:'unexpected_facts_url'}});
    if (facts.outcome !== 'verified') return {ok:false,reason:'source_facts_changed_or_uncertain'};
    return {ok:true,checked_at:checkedAt,review_due_at:availability.reviewDueAt,
      application_result:'login_required',evidence:[portalProof,articleProof]};
  } catch { return {ok:false,reason:'retrieval_or_receipt_failed'}; }
}
function validateVerification(result, now, entry) {
  const checked = timestamp(result.checked_at);
  if (checked > now || now - checked >= POLICY.source_max_age_hours * hour ||
      result.application_result !== 'login_required' || result.review_due_at !== entry.facts.deadline.editorial_cutoff ||
      timestamp(result.review_due_at) <= now || !Array.isArray(result.evidence) || result.evidence.length !== 2) throw new Error('invalid_verification');
  const expected = [entry.reviewedRecord.source_url, entry.reviewedRecord.firm_careers_url].sort();
  const actual = result.evidence.map(p => {
    if (p.request_url !== p.final_url || p.status !== 200 || p.checked_at !== result.checked_at ||
      !shaPattern.test(p.body_sha256 ?? '') || !Number.isSafeInteger(p.body_bytes) || p.body_bytes <= 0 || p.body_bytes > 2000000) throw new Error('invalid_provenance');
    return p.request_url;
  }).sort();
  if (canonical(expected) !== canonical(actual)) throw new Error('invalid_provenance_urls');
}
export async function compilePipeline({feed, discoveryCandidates = [], now = Date.now(), retrieve, verify = verifySupported} = {}) {
  if (!Number.isSafeInteger(now)) throw new Error('invalid_clock');
  if (!feed || feed.verification_window_hours !== 168 || !Array.isArray(feed.records) ||
      feed.records.length > POLICY.max_records || !Array.isArray(discoveryCandidates) || discoveryCandidates.length > POLICY.max_candidates) throw new Error('invalid_input_or_budget');
  canonical(feed); canonical(discoveryCandidates);
  if (timestamp(feed.generated_at) > now) throw new Error('future_feed');
  const quarantine = [], previews = [], receipts = [];
  const ids = new Map();
  for (const record of feed.records) {
    if (!record || typeof record.id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(record.id)) throw new Error('invalid_record_identity');
    ids.set(record.id, (ids.get(record.id) || 0) + 1);
  }
  for (const record of feed.records) {
    const hold = reason => quarantine.push({id:record.id,reason});
    if (ids.get(record.id) !== 1) { hold('duplicate_identity'); continue; }
    if (record.record_kind !== 'advertised_opening') { hold('not_advertised_opening'); continue; }
    if (record.status !== 'open') { hold('not_open_no_automatic_reopening'); continue; }
    if (record.id !== WHITE_CASE.id) { hold('unsupported_source'); continue; }
    if (canonical(semanticRecord(record)) !== canonical(WHITE_CASE.reviewedRecord)) { hold('reviewed_semantics_changed'); continue; }
    // A future/malformed historical receipt is never repaired silently.
    try {
      for (const value of [record.last_verified_at,record.last_reviewed_at,record.application_check?.checked_at]) {
        if (timestamp(value) > now) throw new Error('future');
      }
    } catch { hold('invalid_existing_evidence'); continue; }
    if (timestamp(WHITE_CASE.facts.deadline.editorial_cutoff) <= now) { hold('editorial_deadline_cutoff'); continue; }
    let result;
    try {
      result = await verify(record,{retrieve,now});
      if (!result?.ok) { hold(result?.reason || 'verification_uncertain'); continue; }
      validateVerification(result,now,WHITE_CASE);
    } catch { hold('verification_uncertain'); continue; }
    receipts.push({identity:WHITE_CASE.identity,adapter:WHITE_CASE.adapter,...result});
    const expiresAt = new Date(Math.min(
      now + POLICY.snapshot_max_age_hours * hour,
      timestamp(result.checked_at) + POLICY.source_max_age_hours * hour,
      timestamp(result.review_due_at)
    )).toISOString();
    const preview = {identity:WHITE_CASE.identity,record_id:record.id,
      semantic_sha256:digest({record:WHITE_CASE.reviewedRecord,facts:WHITE_CASE.facts}),
      translation_sha256:translationDigest(),facts:WHITE_CASE.facts,
      checked_at:result.checked_at,expires_at:expiresAt,provenance:result.evidence,
      application_result:result.application_result,rendered:renderBilingual(WHITE_CASE,result.checked_at),
      translation_approved:isTranslationApproved(WHITE_CASE,now)};
    previews.push(preview);
    hold(preview.translation_approved ? 'publication_disabled' : 'translation_review_pending');
  }
  // Discovery is a lead, never an eligibility assertion. Do not copy arbitrary
  // private text, URLs, contact details, scores or suggested translations.
  for (let i = 0; i < discoveryCandidates.length; i++) quarantine.push({candidate_index:i,reason:'discovery_requires_supported_source_review'});
  quarantine.sort((a,b) => canonical(a).localeCompare(canonical(b),'en'));
  const payload = {
    schema_version:1,policy_version:POLICY.version,catalogue_version:CATALOGUE_VERSION,
    generated_at:new Date(now).toISOString(),
    expires_at:new Date(now + POLICY.snapshot_max_age_hours * hour).toISOString(),
    publication_enabled:false,accepted:[],previews,quarantine,
    run:{status:quarantine.length ? 'attention_required' : 'preview_only',
      input_sha256:digest(feed),discovery_count:discoveryCandidates.length,
      source_receipts:receipts,next_action:previews.length ? 'Review exact bilingual catalogue; keep publication disabled.' : 'Inspect quarantine reasons and source evidence; never renew dates by hand.'}
  };
  const envelope = {...payload,sha256:digest(payload)};
  if (Buffer.byteLength(canonical(envelope)) > POLICY.max_output_bytes) throw new Error('output_budget');
  return envelope;
}
export function validateEnvelope(envelope,{now=Date.now()}={}) {
  const {sha256,...payload} = envelope;
  if (!shaPattern.test(sha256 ?? '') || digest(payload) !== sha256) throw new Error('snapshot_digest_mismatch');
  if (envelope.schema_version !== 1 || envelope.policy_version !== POLICY.version ||
      envelope.publication_enabled !== false || !Array.isArray(envelope.accepted) || envelope.accepted.length) throw new Error('unsupported_publication_state');
  if (timestamp(envelope.generated_at) > now || timestamp(envelope.expires_at) <= now ||
      timestamp(envelope.expires_at) - timestamp(envelope.generated_at) > POLICY.snapshot_max_age_hours * hour) throw new Error('snapshot_not_fresh');
  return {valid:true,publishable:false,reason:'preview_contract_only'};
}
