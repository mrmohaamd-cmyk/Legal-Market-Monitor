// Pure content bindings shared by producer and preview-only Devvit consumer.
import {createHash} from 'node:crypto';
import {WHITE_CASE, CATALOGUE_VERSION, EVIDENCE_KEYS} from '../scripts/pipeline/catalogue.mjs';
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

