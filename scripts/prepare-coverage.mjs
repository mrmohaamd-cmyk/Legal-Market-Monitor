// One-off exact-anchor migration on a review branch. Preserve every existing record and verification timestamp.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const save = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
const replace = (text, before, after) => { assert(text.includes(before), 'Missing migration anchor: ' + before.slice(0, 100)); return text.replace(before, after); };
const expansion = await json('coverage-additions.json');
const pinsent = await json('pinsent-record.json');
const config = await json('dist/task-config.json');
const feed = await json('dist/opportunities.json');
const originalRecords = JSON.stringify(feed.records.filter((record) => record.id !== pinsent.id));
if (!config.coverage_expansion_at) {
  config.coverage_expansion_at = expansion.reviewed_at;
  config.sourceTitle = 'Saudi commercial-law employer registry: original 33 targets plus verified additions';
  config.target_firms.push(...expansion.firms.map(({ name, search_terms }) => ({ name, search_terms })));
  config.prompt += '\n\nAdditional Saudi-employer search targets: ' + expansion.firms.map((firm) => firm.name).join('; ') + '. Search current and former names and Saudi associated employers without treating separate legal entities as one employer.\nSearch official Saudi programme indexes, individual programme pages, employer-linked recruitment portals and employer-authored announcements, not just global careers landing pages. Include internship/internship programme, COOP/co-op/cooperative training, graduate programme/program, trainee associate, junior lawyer, NQ, legal analyst, paralegal and Arabic equivalents. Require an actual Saudi role location; a Saudi navigation link is not evidence. Verify ambiguous associate seniority rather than assuming it is junior.\nPinsent Masons: check https://www.pinsentmasons.com/careers/early-talent/saudi-arabia and its internship-programme and co-op-training-programme child pages separately. An open internship does not make the COOP programme open. Follow the employer page to the actual application destination.\nAdditional first-party discovery routes: ' + expansion.firms.map((firm) => firm.name + ' — ' + firm.careers_url + (firm.additional_url ? ' ; ' + firm.additional_url : '')).join('\n') + '\nBlocked sources, JavaScript-only portals, general CV forms and unreviewed sources must be disclosed as coverage limitations, not reported as no vacancies. Review the employer universe for additions, name changes, associations and Saudi departures; do not claim the target list is exhaustive. Distinguish new vacancies from evergreen recruitment routes, and preserve human review before public publication.';
  await save('dist/task-config.json', config);
}
if (!feed.records.some((record) => record.id === pinsent.id)) feed.records.push(pinsent);
const audit = feed.coverage_audit;
audit.original_backfill_at ??= audit.backfill_at;
audit.expansion_reviewed_at = expansion.reviewed_at;
audit.target_firm_count = config.target_firms.length;
for (const firm of expansion.firms) {
  if (!audit.firms.some((entry) => entry.firm_name === firm.name)) audit.firms.push({ firm_name: firm.name, review_state: 'no_record_displayed', record_ids: [], reviewed_at: expansion.reviewed_at, presence_url: firm.presence_url, coverage_type: firm.coverage_type });
}
const pinsentLedger = audit.firms.find((firm) => firm.firm_name === 'Pinsent Masons');
pinsentLedger.review_state = 'current_route'; pinsentLedger.record_ids = [pinsent.id]; pinsentLedger.reviewed_at = pinsent.last_verified_at;
audit.current_record_count = feed.records.length;
audit.current_route_firm_count = audit.firms.filter((firm) => firm.review_state === 'current_route').length;
audit.closed_programme_count = audit.firms.filter((firm) => firm.review_state === 'closed_programme').length;
audit.no_record_displayed_count = audit.firms.filter((firm) => firm.review_state === 'no_record_displayed').length;
audit.scope_note = 'The registry retains the original 33 targets and adds eight Saudi-employer targets reviewed on 30 September 2026. Original backfill: 21 September; Pinsent internship verified separately on 30 September. Published-route bookkeeping is not a claim of current freshness: check each card. No record displayed does not mean no vacancy. Configured targets, readable sources and complete vacancy discovery are different; some sources require manual review.';
feed.coverage = '41-firm target registry, not an exhaustive market census or 41 fully automated vacancy feeds. Public roles require first-party verification and review. Individual verification timestamps control freshness.';
feed.generated_at = pinsent.last_verified_at;
assert.equal(JSON.stringify(feed.records.filter((record) => record.id !== pinsent.id)), originalRecords, 'Existing records must remain unchanged.');
await save('dist/opportunities.json', feed);
await save('dist/coverage-audit.json', { reviewed_at: expansion.reviewed_at, original_target_count: 33, expanded_target_count: 41,
  scope: audit.scope_note, additions: expansion.firms, research_backlog: expansion.research_backlog,
  pinsent: { source_url: pinsent.source_url, application_url: pinsent.application_url, verified_at: pinsent.last_verified_at, internship_status: 'open', separate_coop_status: 'closed', verification_method: 'Employer programme index and detail fetched successfully; Apply Now destination extracted from employer HTML. No application was submitted.' },
  targets: audit.firms });
const setup = 'Create a separate daily monitoring task titled “' + config.title + '”. Check each morning using the Asia/Riyadh time zone. Notify me only for meaningful changes. Review any account limitations and confirm the actual schedule after creating it.\n\n' + config.prompt + '\n';
await writeFile('dist/setup-instructions.txt', setup);
let html = await readFile('dist/index.html', 'utf8');
const disclosure = '<details><summary>Which firms does the monitor search for?</summary>';
const start = html.indexOf(disclosure); assert(start >= 0);
const end = html.indexOf('</details>', start) + '</details>'.length; assert(end > start);
const escaped = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
html = html.slice(0, start) + disclosure + '<p class="detail-text">The 41-firm target registry retains all 33 original Riyadh-map firms and adds eight source-reviewed Saudi-employer targets: ' + config.target_firms.map((firm) => escaped(firm.name)).join('; ') + '.</p><p class="detail-text">This is a search target list, not a claim of 41 live vacancies or complete automated coverage. Programme pages, vacancy portals and general recruitment forms are distinguished; blocked and JavaScript-only routes require manual review. Each published role must independently satisfy the Saudi-location and source-verification requirements. ZH Partners is a separate Saudi employer; the Hourani recruitment channel does not establish a single legal entity or a current intake.</p><p class="detail-text"><a href="coverage-audit.json">Review the dated source-coverage ledger</a>.</p></details>' + html.slice(end);
html = html.replace('33-firm backfill coverage', '41-firm source coverage');
await writeFile('dist/index.html', html);
let app = await readFile('dist/app.js', 'utf8');
app = app.replace('Current source-verified route', 'Published route (check card freshness)').replace('No current record displayed', 'No source-verified record in this feed').replace("'-firm backfill coverage'", "'-firm source coverage'");
await writeFile('dist/app.js', app);
let validation = await readFile('validate.mjs', 'utf8');
if (!validation.includes('const coverageAudit =')) {
  validation = replace(validation, "const download = await readFile('dist/setup-instructions.txt', 'utf8');", "const download = await readFile('dist/setup-instructions.txt', 'utf8');\nconst coverageAudit = JSON.parse(await readFile('dist/coverage-audit.json', 'utf8'));\nconst additions = coverageAudit.additions;");
  validation = replace(validation, 'const sourceHosts = new Set([', "const sourceHosts = new Set(['www.pinsentmasons.com', ");
  validation = replace(validation, 'const applicationHosts = new Set([', "const applicationHosts = new Set(['ehpy.fa.em5.oraclecloud.com', ");
  validation = replace(validation, 'opportunities.coverage_audit.target_firm_count, 33,', 'opportunities.coverage_audit.target_firm_count, config.target_firms.length,');
  validation = replace(validation, 'opportunities.coverage_audit.firms.length, 33,', 'opportunities.coverage_audit.firms.length, config.target_firms.length,');
  validation = replace(validation, 'config.target_firms.length, riyadhMapFirms.length,', 'config.target_firms.length, riyadhMapFirms.length + additions.length,');
  validation = replace(validation, 'config.target_firms.map((firm) => firm.name), riyadhMapFirms,', 'config.target_firms.slice(0, riyadhMapFirms.length).map((firm) => firm.name), riyadhMapFirms,');
  validation = replace(validation, "html.includes('complete 33-firm Riyadh target universe')", "html.includes('41-firm target registry')");
  validation = replace(validation, "console.log('PASS:", "assert.equal(additions.length, 8);\nassert.equal(new Set(config.target_firms.map((firm) => firm.name)).size, 41);\nfor (const addition of additions) assert(config.target_firms.some((firm) => firm.name === addition.name));\nconst pinsentRecord = opportunities.records.find((record) => record.id === 'pinsent-masons-riyadh-internship-2026');\nassert(pinsentRecord);\nassert.equal(pinsentRecord.application_url, 'https://ehpy.fa.em5.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1004/jobs/preview/3672');\nassert.equal(pinsentRecord.deadline_at, null);\nassert.equal(pinsentRecord.posted_at, null);\nassert.equal(pinsentRecord.programme_start_date, '2026-10-11');\nassert.equal(pinsentRecord.programme_duration_months, 3);\nassert.equal(getPrimaryAction(pinsentRecord, 'open_no_deadline').label, 'Apply to Pinsent Masons');\nassert.equal(deriveStatus(pinsentRecord, 24, Date.parse('2026-09-30T09:00:00Z')), 'open_no_deadline');\nassert.equal(deriveStatus(pinsentRecord, 24, Date.parse('2026-10-01T09:00:00Z')), 'verification_pending');\nassert.equal(coverageAudit.pinsent.separate_coop_status, 'closed');\nfor (const oldRecord of opportunities.records.filter((record) => record.id !== pinsentRecord.id)) assert.equal(oldRecord.last_verified_at, '2026-09-21T00:40:38Z');\n\nconsole.log('PASS:");
  await writeFile('validate.mjs', validation);
}
console.log('Prepared 41 targets and source-verified Pinsent internship; original records and verification timestamps preserved.');
