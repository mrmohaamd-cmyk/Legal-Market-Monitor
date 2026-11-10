import {createHash} from 'node:crypto';
import {WHITE_CASE, CATALOGUE_VERSION} from './catalogue.mjs';
import {evaluateSource} from '../reverify-opportunities.mjs';
import {verifyWhiteCaseProgrammeFacts} from '../whitecase-verification.mjs';

import {POLICY} from '../../contracts/pipeline-policy.mjs';
export {POLICY} from '../../contracts/pipeline-policy.mjs';
const hour = 3600000;
const shaPattern = /^[a-f0-9]{64}$/;
import {canonical,digest,timestamp,semanticRecord,translationDigest,renderBilingual,isTranslationApproved} from '../../contracts/reviewed-content.mjs';
export {canonical,digest,timestamp,semanticRecord,translationDigest,renderBilingual,isTranslationApproved} from '../../contracts/reviewed-content.mjs';

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
