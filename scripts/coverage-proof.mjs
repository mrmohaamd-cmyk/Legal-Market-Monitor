// Pure validation of a bounded DOM projection from the audited browser runner.
// A proof is observed evidence, not an approval or an externally signed token.
import {createHash} from 'node:crypto';
import {readHtml} from './html-evidence.mjs';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const hasClass = (node, name) => (node.attrs.class || '').split(/\s+/).includes(name);
export const unavailable = /no longer (?:available|accepting applications)|(?:job|position|vacancy) (?:has been |is )?(?:closed|filled|expired)|applications (?:are closed|have closed)|not accepting applications/i;
export const enabled = node => {
  for (let ancestor = node; ancestor; ancestor = ancestor.parent) {
    if (ancestor.hidden || 'disabled' in ancestor.attrs || 'inert' in ancestor.attrs || ancestor.attrs['aria-disabled']?.toLowerCase() === 'true' || hasClass(ancestor,'disabled')) return false;
  }
  return !('readonly' in node.attrs) && node.attrs.type !== 'hidden';
};
export function sameUrl(value, expected, base) {
  try {
    if (typeof value !== 'string' || !value.trim()) return false;
    const url = new URL(value, base), target = new URL(expected);
    if (url.username || url.password || url.origin !== target.origin || url.pathname !== target.pathname || url.hash !== target.hash) return false;
    const actual = [...url.searchParams], wanted = [...target.searchParams];
    return actual.length === wanted.length && actual.every(([key,val]) => url.searchParams.getAll(key).length === 1 && target.searchParams.get(key) === val);
  } catch { return false; }
}
export function inspectProof(proof, requestedUrl, finalUrl, now, evidence) {
  if (!proof || proof.schema !== 'saudilaw-browser-dom-proof/v1' || proof.http_status !== 200) return {issue:'A successful rendered browser proof is required.'};
  if (!sameUrl(proof.requested_url,requestedUrl) || !sameUrl(proof.final_url,finalUrl)) return {issue:'The browser proof changed destination, role or parameters.'};
  const checkedAt = typeof proof.checked_at === 'string' ? Date.parse(proof.checked_at) : NaN;
  if (!Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt > 5 * 60 * 1000) return {issue:'The rendered proof is stale, future-dated or missing its check time.'};
  if (typeof proof.visible_html !== 'string' || !proof.visible_html || proof.visible_html.length > 500000 || sha256(proof.visible_html) !== proof.visible_html_sha256) return {issue:'The rendered DOM fingerprint is missing or inconsistent.'};
  if (/<(?:script|style|template|head|noscript|iframe)\b|\{\{|\}\}/i.test(proof.visible_html)) return {issue:'The proof contains unprojected or unresolved template content.'};
  evidence.push({request_url:requestedUrl, final_url:finalUrl, status:200, checked_at:new Date(checkedAt).toISOString(), visible_html_sha256:proof.visible_html_sha256, visible_html_bytes:Buffer.byteLength(proof.visible_html)});
  return {doc:readHtml(proof.visible_html)};
}
