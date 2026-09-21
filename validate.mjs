import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';
import {
  deriveStatus,
  filterRecords,
  getFallbackAction,
  getPrimaryAction,
  partitionRecords,
  safeHttpsUrl,
  sourceValue,
  validTaskUrl
} from './dist/app.js';

const html = await readFile('dist/index.html', 'utf8');
const css = await readFile('dist/style.css', 'utf8');
const tokens = await readFile('dist/tokens.css', 'utf8');
const config = JSON.parse(await readFile('dist/task-config.json', 'utf8'));
const opportunities = JSON.parse(await readFile('dist/opportunities.json', 'utf8'));
const download = await readFile('dist/setup-instructions.txt', 'utf8');

for (const path of ['/style.css', '/tokens.css', '/app.js', '/task-config.json', '/opportunities.json', '/setup-instructions.txt', '/og.png']) {
  await access('dist' + path);
}

assert(html.includes('<script type="module" src="/app.js"></script>'), 'The client script must remain a module.');
assert(!/target\s*=\s*['"]_blank['"]/.test(html), 'Public HTML must not require a new browsing context.');
assert(!/opens in a new tab/i.test(html), 'Link labels must not promise a new tab.');
assert(html.includes('id="opportunities"'), 'The opportunity finder must remain addressable.');
assert(html.includes('id="opportunity-watch"'), 'The archive/watch surface must be present.');
assert(html.includes('id="coverage-audit"'), 'The 33-firm backfill coverage surface must be present.');
assert(html.includes('id="filter-disclosure"'), 'Compact screens must retain a keyboard-accessible filter disclosure.');
assert(!html.includes('PUBLICATION STANDARD'), 'The redundant publication-standard panel must remain removed.');
assert(!html.includes('id="copy-link"'), 'The redundant page-link copy control must remain removed.');
assert(!html.includes('Example firm'), 'The finder must not contain fictional opportunities.');
assert(!html.includes('NOT A LIVE VACANCY'), 'The finder must not present an illustrative vacancy.');
assert(css.includes("@import url('/tokens.css');"), 'The stylesheet must use the semantic token adapter.');
assert(!/#(?:[0-9a-f]{3}|[0-9a-f]{6})/i.test(css), 'Component CSS must not introduce raw colours.');
assert(css.includes('overflow-wrap: anywhere'), 'Long titles and source domains must reflow without clipping.');
for (const token of ['--eds-color-text-primary', '--eds-color-action-primary', '--eds-color-status-warning', '--eds-font-display', '--eds-space-section']) {
  assert(tokens.includes(token), 'Missing semantic token ' + token);
}
assert(!/target\s*=\s*['"]_blank['"]/.test(await readFile('dist/app.js', 'utf8')), 'External opportunity links must not require a new browsing context.');
assert((await readFile('dist/app.js', 'utf8')).includes("link.target = '_top'"), 'External opportunity links must request the host browsing context.');
const app = await readFile('dist/app.js', 'utf8');
assert(!/copy official link|copy last recorded link/i.test(app), 'Opportunity records must not expose a copy-link action.');
assert(app.indexOf('card.append(top);') < app.indexOf('renderActions(record, status, card);'), 'The official action must follow the status and precede the opportunity facts.');
assert(app.indexOf('renderActions(record, status, card);') < app.indexOf("const facts = makeElement('dl', 'opportunity-facts');"), 'The official action must precede eligibility and supporting facts.');
assert(!css.includes('.copy-source-link'), 'The removed copy-link control must have no remaining component style.');
assert(css.includes('position: sticky'), 'The opportunity action must remain card-bounded and reachable during detail reading.');

assert.equal(opportunities.verification_window_hours, 24);
assert(opportunities.records.length >= 3, 'The feed must contain real records or be an honest zero state.');
const sourceHosts = new Set(['careers.aoshearman.com', 'eume-earlyassociatecareers-lw.icims.com', 'www.kirkland.com']);
const applicationHosts = new Set(['jobs.aoshearman.com']);
const recordIds = new Set();
for (const record of opportunities.records) {
  for (const key of [
    'id', 'firm_name', 'firm_slug', 'role_title', 'location', 'location_group', 'career_stage',
    'practice_areas', 'source_url', 'source_type', 'source_title', 'source_domain', 'source_status',
    'source_summary', 'offer_summary', 'eligibility_state', 'eligibility_summary', 'eligibility_source_text',
    'editorial_assessment', 'first_seen_at', 'last_verified_at', 'status', 'provenance_notes'
  ]) {
    assert(record[key] !== undefined && record[key] !== null, 'Missing opportunity field ' + key + ' for ' + record.id);
  }
  assert(!recordIds.has(record.id), 'Duplicate opportunity id ' + record.id);
  recordIds.add(record.id);
  assert(Array.isArray(record.practice_areas) && record.practice_areas.length, 'Missing practice areas for ' + record.id);
  assert(Array.isArray(record.responsibilities), 'Missing responsibilities for ' + record.id);
  assert(Array.isArray(record.qualifications), 'Missing qualifications for ' + record.id);
  assert.equal(record.source_status, 'verified', 'A listed source must be verified.');
  const source = new URL(record.source_url);
  assert.equal(source.protocol, 'https:');
  assert(sourceHosts.has(source.hostname), 'Unapproved source host ' + source.hostname);
  assert.equal(source.hostname, record.source_domain, 'Source domain label must match the destination.');
  assert(Number.isFinite(Date.parse(record.last_verified_at)), 'Invalid verification timestamp for ' + record.id);
  if (record.deadline_at) assert(Number.isFinite(Date.parse(record.deadline_at)), 'Invalid deadline for ' + record.id);
  if (record.application_url) {
    const application = new URL(record.application_url);
    assert.equal(application.protocol, 'https:');
    assert(applicationHosts.has(application.hostname), 'Unapproved application host ' + application.hostname);
  }
}

assert.equal(opportunities.coverage_audit.target_firm_count, 33, 'The backfill must cover the 33 mapped firms.');
assert.equal(opportunities.coverage_audit.firms.length, 33, 'Every mapped firm must be represented in the backfill ledger.');
assert.deepEqual(
  opportunities.coverage_audit.firms.map((firm) => firm.firm_name).sort(),
  config.target_firms.map((firm) => firm.name).sort(),
  'The backfill ledger must exactly match the mapped firm universe.'
);
const ledgerCurrentRecords = opportunities.coverage_audit.firms.flatMap((firm) => firm.record_ids);
assert.equal(new Set(ledgerCurrentRecords).size, ledgerCurrentRecords.length, 'Backfill record IDs must not be duplicated.');
assert.deepEqual(
  ledgerCurrentRecords.sort(),
  opportunities.records.map((record) => record.id).sort(),
  'Every visible record must be linked from the 33-firm backfill ledger.'
);
assert.equal(opportunities.coverage_audit.current_record_count, ledgerCurrentRecords.length);
assert.equal(opportunities.coverage_audit.current_route_firm_count, opportunities.coverage_audit.firms.filter((firm) => firm.review_state === 'current_route').length);
assert.equal(opportunities.coverage_audit.closed_programme_count, opportunities.coverage_audit.firms.filter((firm) => firm.review_state === 'closed_programme').length);
assert.equal(opportunities.coverage_audit.no_record_displayed_count, opportunities.coverage_audit.firms.filter((firm) => firm.review_state === 'no_record_displayed').length);

const testNow = Date.parse('2026-09-20T18:22:00+03:00');
const [aoRecord, lathamGraduate, lathamTrainee, kirklandEntryLevel] = opportunities.records;
assert.equal(deriveStatus(aoRecord, 24, testNow), 'open');
assert.equal(deriveStatus(lathamGraduate, 24, testNow), 'open_no_deadline');
assert.equal(deriveStatus(lathamTrainee, 24, testNow), 'open_no_deadline');
assert.equal(deriveStatus(kirklandEntryLevel, 24, testNow), 'open_no_deadline');
assert.equal(deriveStatus({...aoRecord, last_verified_at: '2026-09-19T18:00:00+03:00'}, 24, testNow), 'verification_pending');
assert.equal(deriveStatus({...aoRecord, source_status: 'unreachable'}, 24, testNow), 'verification_pending');
assert.equal(deriveStatus({...aoRecord, deadline_at: '2026-09-19T17:00:00+03:00'}, 24, testNow), 'expired');

const groups = partitionRecords([
  aoRecord,
  {...lathamGraduate, source_status: 'unreachable'},
  {...lathamTrainee, deadline_at: '2026-09-19T17:00:00+03:00'}
], 24, testNow);
assert.equal(groups.current.length, 1, 'Only current records may remain in the default list.');
assert.equal(groups.watch.length, 1, 'Unreachable sources must enter verification watch.');
assert.equal(groups.archive.length, 1, 'Past-deadline records must enter the archive.');

const aoAction = getPrimaryAction(aoRecord, 'open');
assert.equal(aoAction.label, 'Apply to A&O Shearman');
assert.equal(new URL(aoAction.href).hostname, 'jobs.aoshearman.com');
assert.equal(aoAction.destinationLabel, 'Official application route');
assert.equal(aoAction.destinationHost, 'jobs.aoshearman.com');
const lathamAction = getPrimaryAction(lathamGraduate, 'open_no_deadline');
assert.equal(lathamAction.label, 'View Latham & Watkins posting');
assert.equal(lathamAction.href, lathamGraduate.source_url);
assert.equal(lathamAction.destinationLabel, 'Official job posting');
assert.equal(lathamAction.destinationHost, 'eume-earlyassociatecareers-lw.icims.com');
const kirklandAction = getPrimaryAction(kirklandEntryLevel, 'open_no_deadline');
assert.equal(kirklandAction.label, 'View Kirkland & Ellis posting');
assert.equal(new URL(kirklandAction.href).hostname, 'www.kirkland.com');
assert.equal(getPrimaryAction({...lathamGraduate, source_status: 'unreachable'}, 'verification_pending'), null);
const fallback = getFallbackAction({...lathamGraduate, source_status: 'unreachable'});
assert.equal(fallback.label, 'Browse firm careers');
assert.equal(fallback.href, lathamGraduate.firm_careers_url);
assert.equal(safeHttpsUrl('javascript:alert(1)'), null);
assert.equal(safeHttpsUrl('https://user@example.com/path'), null);
assert.equal(sourceValue(''), 'Not stated by source');
assert.equal(sourceValue(undefined), 'Not stated by source');

assert.equal(filterRecords(opportunities.records, {stage: 'Trainee', practice: '', firm: '', location: '', status: ''}, 24, testNow).length, 1);
assert.equal(filterRecords(opportunities.records, {stage: '', practice: 'Banking & finance', firm: 'Latham & Watkins', location: 'Riyadh', status: ''}, 24, testNow).length, 2);
assert.equal(filterRecords(opportunities.records, {stage: 'NQ / 0–2 PQE', practice: '', firm: '', location: '', status: ''}, 24, testNow).length, 0);

const setup = 'Create a separate daily monitoring task titled “' + config.title + '”. Check each morning using the Asia/Riyadh time zone. Notify me only for meaningful changes. Review any account limitations and confirm the actual schedule after creating it.\n\n' + config.prompt + '\n';
assert.equal(download, setup, 'Downloaded setup instructions must match the copy action.');
assert(config.prompt.includes('ONLY for roles based in Riyadh or elsewhere in Saudi Arabia'));
const riyadhMapFirms = [
  'A&O Shearman', 'Addleshaw Goddard', 'Akin Gump Strauss Hauer & Feld', 'AS&H Clifford Chance',
  'Baker Botts', 'Baker McKenzie', 'BCLP', 'Bird & Bird', 'Clyde & Co.', 'CMS',
  'DLA Piper Legal Consultants', 'Eversheds Sutherland', 'Freshfields', 'Ghazzaawi Gowling WLG',
  'Gibson, Dunn & Crutcher', 'Greenberg Traurig', 'Herbert Smith Freehills Kramer', 'Hogan Lovells',
  'King & Spalding', 'Kirkland & Ellis', 'Latham & Watkins', 'Linklaters', 'Morgan Lewis',
  'Norton Rose Fulbright', 'Pillsbury AlArfaj', 'Pinsent Masons', 'Quinn Emanuel Urquhart & Sullivan',
  'Reed Smith', 'Simmons & Simmons', 'Squire Patton Boggs', 'Stephenson Harwood', 'Trowers & Hamlins',
  'White & Case'
];
assert(Array.isArray(config.target_firms), 'The monitor must retain a machine-readable target-firm universe.');
assert.equal(config.target_firms.length, riyadhMapFirms.length, 'The target universe must include every mapped Riyadh firm exactly once.');
assert.deepEqual(config.target_firms.map((firm) => firm.name), riyadhMapFirms, 'The target-firm universe must match the supplied Riyadh map.');
for (const firm of config.target_firms) {
  assert(Array.isArray(firm.search_terms) && firm.search_terms.length, 'Each target firm needs at least one usable search term.');
  assert(config.prompt.includes(firm.name), 'The copied monitoring prompt must name ' + firm.name + '.');
  assert(html.includes(firm.name.replaceAll('&', '&amp;')), 'The published coverage disclosure must name ' + firm.name + '.');
}
assert(html.includes('complete 33-firm Riyadh target universe'), 'The coverage disclosure must explain that the entire mapped universe is searched.');
assert(!html.includes('chatgpt.com/share/'));
assert.equal(validTaskUrl('https://chatgpt.com/s/synthetic-test-only'), true);
for (const value of [
  'https://chatgpt.com/share/example',
  'https://chatgpt.com.evil.example/s/test',
  'javascript:alert(1)',
  'https://other.example/s/test',
  'https://chatgpt.com/s/test?next=evil',
  'https://user@chatgpt.com/s/test'
]) assert.equal(validTaskUrl(value), false, 'Task URL rejection failed for ' + value);

console.log('PASS: semantic-token adapter, no-new-tab links, source-backed records, decision-order fields, combined filters, no-results logic, deadline expiry, verification watch, archive partitioning, application/action routing, source fallback, setup parity and unsafe URL rejection.');
