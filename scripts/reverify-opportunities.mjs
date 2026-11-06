// Evidence-producing draft refresh, never a publisher. No credentials or form submission.
import { createHash } from 'node:crypto';
import { readHtml, textOf, find } from './html-evidence.mjs';
import { supportsLatham, reviewLatham } from './latham-verification.mjs';
import { verifyWhiteCaseProgrammeFacts } from './whitecase-verification.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const USER_AGENT = 'Legal-Market-Monitor/1.0 (+https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor)';
const VERIFICATION_WINDOW_HOURS = 168;
const allHires = 'https://whitecase.grad.allhires.com/app/';
const kirkland = 'https://www.kirkland.com/careers/asia/saudi-arabia';
const rules = {
  'white-case-saudi-coop-2027': {url: allHires, title: 'Saudi COOP Internship 2027', intake: 'January 2027', deadline: '30/10/2026'},
  'white-case-saudi-law-trainee-2027': {url: allHires, title: 'Saudi Law Trainee Program 2027', intake: 'March 2027', deadline: '08/01/2027'},
  'kirkland-riyadh-entry-level': {url: kirkland}
};
const elements = node => node.children.filter(child => typeof child !== 'string');
function enabled(node) {
  for (let current = node; current; current = current.parent) if ('disabled' in current.attrs || 'inert' in current.attrs || 'readonly' in current.attrs || current.attrs['aria-disabled'] === 'true' || (current.attrs.class || '').split(/\s+/).includes('disabled')) return false;
  return true;
}
const pending = reason => ({outcome:'verification_pending', result:'unverified', reason});

export function createSourceEvaluator({kirklandMainHash = '7bcd58310b4c0f08c9cdea8334262e80eb59f875f4c6b85fd75eadd663d18f9e'} = {}) {
return function evaluateSource(record, response, now = Date.now()) {
  const rule = rules[record.id];
  if (!rule) return {outcome:'manual_review', reason:'No audited automatic application checker for this source. Human verification remains unchanged; the browser still expires it after 7 days (168 hours).'};
  if (record.source_url !== rule.url || (rule.url === allHires && record.application_url !== allHires)) return pending('Record destination changed; adapter requires editorial review.');
  if (!response || response.error) return pending(response?.error || 'No response was obtained.');
  if (response.status !== 200) return pending(`HTTP ${response.status}; availability was not verified.`);
  if (response.url !== rule.url) return pending('Unexpected redirect or destination; availability was not verified.');
  if (!/text\/html/i.test(response.contentType || '')) return pending('Expected HTML was not returned.');
  const doc = readHtml(response.body);
  if (rule.url === kirkland) {
    if (record.record_kind !== 'recruitment_route' || record.application_url !== null) return pending('The entry-level email route must remain classified as a recruitment route with no substituted application destination.');
    const sections = find(doc,node => node.tag === 'main' && node.attrs.id === 'careers-detail-app');
    if (sections.length !== 1 || createHash('sha256').update(textOf(sections[0])).digest('hex') !== kirklandMainHash) return pending('Kirkland recruitment page facts changed from the reviewed first-party evidence; editorial review is required.');
    const anchors = find(doc, node => node.tag === 'a' && (node.attrs.href || '').split('?')[0].toLowerCase() === 'mailto:ry_entry-level_legal_recruiting@kirkland.com');
    if (anchors.length !== 1 || !/apply now\s*[—–-]?\s*entry level/i.test(textOf(anchors[0])) || !/entry-level legal recruiting team to apply for a position in our riyadh office/i.test(textOf(anchors[0]))) return pending('Exact Riyadh entry-level recruiting email and its application wording were not found together.');
    if (/not accepting applications|no longer accepting applications|applications? (?:are |is )?closed|(?:position|vacancy|role) (?:has been |is )?(?:closed|filled|expired)/i.test(textOf(anchors[0]))) return pending('The entry-level recruiting card contains an availability warning requiring editorial review.');
    return {outcome:'verified', result:'email_route', reason:'The first-party Riyadh page still publishes its entry-level legal recruiting email inside the Apply Now — Entry Level card. This verifies a standing email route, not immediate headcount or mailbox delivery.'};
  }
  const headings = find(doc, node => node.tag === 'div' && ['d-flex','justify-content-between','fw-semibold'].every(name => (node.attrs.class || '').split(/\s+/).includes(name)) && textOf(node) === rule.title);
  if (headings.length !== 1) return pending('The exact programme heading was absent or ambiguous.');
  const siblings = elements(headings[0].parent);
  const section = siblings[siblings.indexOf(headings[0]) + 1];
  if (!section || section.tag !== 'div' || find(section, node => node.tag === 'li').length !== 1) return pending('The programme deadline layout changed; manual review is required.');
  const row = textOf(section);
  if (row === `${rule.intake} Deadline passed`) return {outcome:'closed', result:'unverified', reason:`The first-party portal explicitly marks ${rule.title} (${rule.intake}) “Deadline passed”. Other programmes on the page do not affect this finding.`};
  if (row !== `${rule.intake} ${rule.deadline}`) return pending('Programme intake or source deadline wording changed or is unrecognized; no dates were inferred.');
  // AllHires uses DD/MM/YYYY (other current rows contain days above 12). This is
  // an early editorial recheck at the start of that Saudi date, not a closing time.
  const [day, month, year] = rule.deadline.split('/').map(Number);
  const reviewDue = Date.UTC(year, month - 1, day) - 3 * 3600000;
  if (now >= reviewDue) return pending('The source closing date has begun in Riyadh; a fresh editorial availability check is required.');
  const forms = find(doc, node => node.tag === 'form' && node.attrs.action === '/app/' && node.attrs.method?.toLowerCase() === 'post');
  if (!forms.some(form => find(form, node => node.tag === 'input' && node.attrs.type === 'email' && node.attrs.name === 'LogonEmail' && enabled(node)).length === 1 && find(form, node => node.tag === 'button' && node.attrs.type === 'submit' && enabled(node)).length > 0)) return pending('The public application email-entry form was not found with enabled controls alongside the programme.');
  return {outcome:'verified', result:'login_required', reviewDueAt:new Date(reviewDue).toISOString(), reason:`The exact ${rule.title} row shows ${rule.intake} and ${rule.deadline}, and the public email-entry form is available. Authentication, programme selection after login and submission were not tested. The review cutoff is editorial, not an employer closing instant.`};
};
}
export const evaluateSource = createSourceEvaluator();

export async function retrieveSource(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return {error:'Unsafe or non-HTTPS source URL.'};
    const response = await fetch(url, {headers:{'user-agent':USER_AGENT, accept:'text/html'}, redirect:'manual', signal:AbortSignal.timeout(20000)});
    if (!response.ok) return {url, status:response.status, location:response.headers.get('location'), contentType:response.headers.get('content-type'), body:''};
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) { await reader.cancel(); return {error:'Source exceeds the 2 MB evidence limit; manual review required.'}; }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    return {url:response.url, status:response.status, contentType:response.headers.get('content-type'), body:buffer.toString('utf8'), body_sha256:createHash('sha256').update(buffer).digest('hex'), body_bytes:buffer.byteLength};
  } catch (error) { return {error:`Source request failed (${error.name}): ${error.message}`}; }
}

export async function reviewFeed(feed, {now = Date.now(), retrieve = retrieveSource, programmeFacts = verifyWhiteCaseProgrammeFacts} = {}) {
  if (!Number.isFinite(now) || feed.verification_window_hours !== VERIFICATION_WINDOW_HOURS) throw new Error('A valid check time and the configured 7-day (168-hour) safeguard are required.');
  const proposed = structuredClone(feed);
  const checkedAt = new Date(now).toISOString();
  const cache = new Map(); const checks = [];
  for (const record of proposed.records) {
    for (const timestamp of [record.last_verified_at, record.application_check?.checked_at]) {
      if (timestamp && (!Number.isFinite(Date.parse(timestamp)) || Date.parse(timestamp) > now)) throw new Error(`Invalid or future evidence timestamp for ${record.id}`);
    }
    if (!cache.has(record.source_url)) cache.set(record.source_url, retrieve(record.source_url));
    const response = await cache.get(record.source_url);
    let evaluation = supportsLatham(record) ? await reviewLatham(record, {sourceResponse:response,retrieve,now}) : evaluateSource(record, response, now);
    if (record.id === 'white-case-saudi-law-trainee-2027' && evaluation.outcome === 'verified') {
      const facts = await programmeFacts(record,{retrieve});
      evaluation = facts.outcome === 'verified' ? {...evaluation,evidence:facts.evidence,reason:`${evaluation.reason} ${facts.reason}`} : facts;
    }
    const retainedClosed = ['closed','expired'].includes(record.status) && evaluation.outcome !== 'closed';
    checks.push({id:record.id, source_url:record.source_url, checked_at:checkedAt, http_status:response.status ?? null, final_url:response.url ?? null, response_body_sha256:response.body_sha256 ?? null, response_body_bytes:response.body_bytes ?? null, retrieval_error:response.error ?? null, ...evaluation, applied:evaluation.outcome !== 'manual_review' && !retainedClosed, ...(retainedClosed ? {retained_status:record.status, application_note:'Editorially closed records cannot be reopened by automation.'} : {})});
    if (evaluation.outcome === 'manual_review') continue;
    // Never automatically resurrect an editorially closed or expired record.
    if (retainedClosed) continue;
    record.last_reviewed_at = checkedAt;
    record.application_check = {checked_at:checkedAt, result:evaluation.result, note:evaluation.reason};
    record.availability_note = evaluation.outcome === 'verified' ? (record.record_kind === 'recruitment_route' ? 'Standing recruitment route; this is not confirmation of immediate headcount.' : null) : evaluation.reason;
    record.status = evaluation.outcome === 'verified' ? 'open' : evaluation.outcome;
    if (evaluation.outcome === 'verified') {
      record.last_verified_at = checkedAt;
      record.provenance_notes = `Automatic first-party route check at ${checkedAt}. ${evaluation.reason}`;
      if (evaluation.reviewDueAt) record.review_due_at = evaluation.reviewDueAt;
    }
  }
  if (JSON.stringify(proposed) !== JSON.stringify(feed)) proposed.generated_at = checkedAt;
  return {feed:proposed, report:{checked_at:checkedAt, verification_window_hours:VERIFICATION_WINDOW_HOURS, publication:'Draft proposal only. A person must review and merge; this check cannot publish.', checks}};
}

export function reportMarkdown(report) {
  return `# First-party source check\n\nChecked ${report.checked_at}. ${report.publication}\n\nThe verification window for this check is ${report.verification_window_hours} hours (${report.verification_window_hours / 24} days). Unsupported automatic checks leave human evidence untouched; elapsed evidence still expires in the browser. A working page or unchanged fingerprint alone cannot renew evidence.\n\n` + report.checks.map(check => `## ${check.id}\n\n- Outcome: ${check.outcome}${check.applied ? '' : ' (record unchanged)'}\n- Source: ${check.source_url}\n- HTTP: ${check.http_status ?? 'not available'}${check.retrieval_error ? ` (${check.retrieval_error})` : ''}\n- Response fingerprint: ${check.response_body_sha256 || 'not available'}\n- Evidence: ${check.reason}\n${check.retained_status ? `- Retained editorial status: ${check.retained_status}. ${check.application_note}\n` : ''}${(check.evidence || []).map(item => `- Route evidence: ${item.request_url} → HTTP ${item.status ?? 'unavailable'}; SHA-256 ${item.body_sha256 ?? 'unavailable'}\n`).join('')}`).join('\n') + '\nThe explicit AllHires programme rows, Kirkland entry-level email route and the two reviewed Latham same-role application journeys have automatic verification adapters. A&O Shearman, Pinsent Masons and Segal require browser or editorial review. The AllHires automatic check uses an early editorial cutoff at the start of the stated deadline date in Riyadh; this is not an inferred employer closing instant. No account login, application submission, email delivery test, paid provider or access-control bypass is performed.\n';
}

export async function run(input = 'dist/opportunities.json', outputDir = 'source-check-results') {
  const feed = JSON.parse(await readFile(input, 'utf8'));
  const result = await reviewFeed(feed);
  await mkdir(outputDir, {recursive:true});
  await writeFile(join(outputDir, 'proposed-opportunities.json'), JSON.stringify(result.feed, null, 2) + '\n');
  await writeFile(join(outputDir, 'source-check.json'), JSON.stringify(result.report, null, 2) + '\n');
  await writeFile(join(outputDir, 'source-check.md'), reportMarkdown(result.report));
  console.log(JSON.stringify({checked_at:result.report.checked_at, results:Object.fromEntries(result.report.checks.map(check => [check.id,check.outcome])), output_directory:resolve(outputDir)}));
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await run(process.argv[2], process.argv[3]);
