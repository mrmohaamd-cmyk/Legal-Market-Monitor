import assert from 'node:assert/strict';
import {access, readFile, writeFile, mkdtemp, cp, rm} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
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
const coverageAudit = JSON.parse(await readFile('dist/coverage-audit.json', 'utf8'));
const additions = coverageAudit.additions;

for (const path of ['/style.css', '/tokens.css', '/app.js', '/task-config.json', '/opportunities.json', '/setup-instructions.txt', '/og.png']) {
  await access('dist' + path);
}

assert(html.includes('<script type="module" src="app.js"></script>'), 'The client script must remain a portable module reference.');
assert(html.includes('href="style.css"'), 'The stylesheet must remain portable for subpath hosting.');
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
assert(css.includes("@import url('tokens.css');"), 'The stylesheet must use the semantic token adapter.');
assert(!/#(?:[0-9a-f]{3}|[0-9a-f]{6})/i.test(css), 'Component CSS must not introduce raw colours.');
assert(css.includes('overflow-wrap: anywhere'), 'Long titles and source domains must reflow without clipping.');
for (const token of ['--eds-color-text-primary', '--eds-color-action-primary', '--eds-color-status-warning', '--eds-font-display', '--eds-space-section']) {
  assert(tokens.includes(token), 'Missing semantic token ' + token);
}
assert(!/target\s*=\s*['"]_blank['"]/.test(await readFile('dist/app.js', 'utf8')), 'External opportunity links must not require a new browsing context.');
assert((await readFile('dist/app.js', 'utf8')).includes("link.target = '_top'"), 'External opportunity links must request the host browsing context.');
assert(!(await readFile('dist/app.js', 'utf8')).includes("'/opportunities.json'"), 'The opportunity feed must use a portable relative path for subpath hosting.');
assert(!(await readFile('dist/app.js', 'utf8')).includes("'/task-config.json'"), 'The task configuration must use a portable relative path for subpath hosting.');
const app = await readFile('dist/app.js', 'utf8');
assert(!/copy official link|copy last recorded link/i.test(app), 'Opportunity records must not expose a copy-link action.');
assert(app.indexOf('card.append(top);') < app.indexOf('renderActions(record, status, card);'), 'The official action must follow the status and precede the opportunity facts.');
assert(app.indexOf('renderActions(record, status, card);') < app.indexOf("const facts = makeElement('dl', 'opportunity-facts');"), 'The official action must precede eligibility and supporting facts.');
assert(!css.includes('.copy-source-link'), 'The removed copy-link control must have no remaining component style.');
assert(css.includes('position: sticky'), 'The opportunity action must remain card-bounded and reachable during detail reading.');

assert.equal(opportunities.verification_window_hours, 24);
assert(opportunities.records.length >= 3, 'The feed must contain real records or be an honest zero state.');
const sourceHosts = new Set(['www.pinsentmasons.com', 'careers.aoshearman.com', 'eume-earlyassociatecareers-lw.icims.com', 'www.kirkland.com']);
const applicationHosts = new Set(['ehpy.fa.em5.oraclecloud.com', 'jobs.aoshearman.com']);
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

assert.equal(opportunities.coverage_audit.target_firm_count, config.target_firms.length, 'The backfill must cover the 33 mapped firms.');
assert.equal(opportunities.coverage_audit.firms.length, config.target_firms.length, 'Every mapped firm must be represented in the backfill ledger.');
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

// Behaviour tests use controlled fixtures, never current editorial dates, status or counts.
const testNow = Date.parse('2026-09-20T18:22:00+03:00');
const fixture = {
  role_title: 'Controlled test opportunity', firm_name: 'Latham & Watkins',
  location_group: 'Riyadh', career_stage: 'Graduate / COOP', practice_areas: ['Banking & finance'],
  status: 'open', source_status: 'verified', last_verified_at: new Date(testNow).toISOString(), deadline_at: null,
  source_url: 'https://eume-earlyassociatecareers-lw.icims.com/controlled-test-only', application_url: null,
  firm_careers_url: 'https://www.lwcareers.com/en/beginning-your-legal-career/saudi-arabia'
};
const aoRecord = {...fixture, id: 'fixture-ao', firm_name: 'A&O Shearman', career_stage: 'Internship / COOP', practice_areas: ['Other'], source_url: 'https://careers.aoshearman.com/controlled-test-only', application_url: 'https://jobs.aoshearman.com/controlled-test-only', deadline_at: '2026-11-30T17:00:00+03:00'};
const lathamGraduate = {...fixture, id: 'fixture-lw-graduate'};
const lathamTrainee = {...fixture, id: 'fixture-lw-trainee', career_stage: 'Trainee'};
const kirklandEntryLevel = {...fixture, id: 'fixture-kirkland', firm_name: 'Kirkland & Ellis', practice_areas: ['Other'], source_url: 'https://www.kirkland.com/controlled-test-only'};
const fixtureRecords = [aoRecord, lathamGraduate, lathamTrainee, kirklandEntryLevel];
assert.equal(deriveStatus(aoRecord, 24, testNow), 'open');
assert.equal(deriveStatus(lathamGraduate, 24, testNow), 'open_no_deadline');
assert.equal(deriveStatus(lathamTrainee, 24, testNow), 'open_no_deadline');
assert.equal(deriveStatus(kirklandEntryLevel, 24, testNow), 'open_no_deadline');
assert.equal(deriveStatus({...aoRecord, last_verified_at: '2026-09-19T18:00:00+03:00'}, 24, testNow), 'verification_pending');
assert.equal(deriveStatus({...aoRecord, source_status: 'unreachable'}, 24, testNow), 'verification_pending');
assert.equal(deriveStatus({...aoRecord, deadline_at: '2026-09-19T17:00:00+03:00'}, 24, testNow), 'expired');
assert.equal(deriveStatus({...aoRecord, status: 'closed'}, 24, testNow), 'closed');

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

assert.equal(filterRecords(fixtureRecords, {stage: 'Trainee', practice: '', firm: '', location: '', status: ''}, 24, testNow).length, 1);
assert.equal(filterRecords(fixtureRecords, {stage: '', practice: 'Banking & finance', firm: 'Latham & Watkins', location: 'Riyadh', status: ''}, 24, testNow).length, 2);
assert.equal(filterRecords(fixtureRecords, {stage: 'NQ / 0–2 PQE', practice: '', firm: '', location: '', status: ''}, 24, testNow).length, 0);

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
assert.equal(config.target_firms.length, riyadhMapFirms.length + additions.length, 'The target universe must include every mapped Riyadh firm exactly once.');
assert.deepEqual(config.target_firms.slice(0, riyadhMapFirms.length).map((firm) => firm.name), riyadhMapFirms, 'The target-firm universe must match the supplied Riyadh map.');
for (const firm of config.target_firms) {
  assert(Array.isArray(firm.search_terms) && firm.search_terms.length, 'Each target firm needs at least one usable search term.');
  assert(config.prompt.includes(firm.name), 'The copied monitoring prompt must name ' + firm.name + '.');
  assert(html.includes(firm.name.replaceAll('&', '&amp;')), 'The published coverage disclosure must name ' + firm.name + '.');
}
assert(html.includes('41-firm target registry'), 'The coverage disclosure must explain that the entire mapped universe is searched.');
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

assert.equal(additions.length, 8);
assert.equal(new Set(config.target_firms.map((firm) => firm.name)).size, 41);
for (const addition of additions) assert(config.target_firms.some((firm) => firm.name === addition.name));
const pinsentRecord = opportunities.records.find((record) => record.id === 'pinsent-masons-riyadh-internship-2026');
assert(pinsentRecord);
assert.equal(pinsentRecord.application_url, 'https://ehpy.fa.em5.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1004/jobs/preview/3672');
assert.equal(pinsentRecord.deadline_at, null);
assert.equal(pinsentRecord.posted_at, null);
assert.equal(pinsentRecord.programme_start_date, '2026-10-11');
assert.equal(pinsentRecord.programme_duration_months, 3);
const pinsentFixture = {...pinsentRecord, status: 'open', source_status: 'verified', last_verified_at: '2026-09-30T08:38:53Z'};
assert.equal(getPrimaryAction(pinsentFixture, 'open_no_deadline').label, 'Apply to Pinsent Masons');
assert.equal(deriveStatus(pinsentFixture, 24, Date.parse('2026-09-30T09:00:00Z')), 'open_no_deadline');
assert.equal(deriveStatus(pinsentFixture, 24, Date.parse('2026-10-01T09:00:00Z')), 'verification_pending');
assert.equal(coverageAudit.pinsent.separate_coop_status, 'closed');

console.log('PASS: semantic-token adapter, no-new-tab links, source-backed records, decision-order fields, combined filters, no-results logic, deadline expiry, verification watch, archive partitioning, application/action routing, source fallback, setup parity and unsafe URL rejection.');

const { sharePageUrl, getVerificationAction } = await import('./dist/app.js');
assert.equal(sharePageUrl('https://owner.github.io/Legal-Market-Monitor/?ref=share#opportunities'), 'https://owner.github.io/Legal-Market-Monitor/');
assert.equal(sharePageUrl('https://example.com/index.html#x'), 'https://example.com/');
assert.equal(sharePageUrl('https://example.com/'), 'https://example.com/');
assert.equal(getVerificationAction(pinsentRecord).href, pinsentRecord.source_url);
assert(!getVerificationAction(pinsentRecord).label.startsWith('Apply'));
assert(app.includes('Last source review: '));
assert(app.includes('watch.open = groups.current.length === 0 && groups.watch.length > 0'));
console.log('PASS: repository-subpath sharing, portable token import, dated verification links and honest overdue-record access.');

// Exercise the actual publication validator against isolated editorial changes.
// Nothing here modifies the repository feed or establishes source verification.
if (process.env.EDITORIAL_VALIDATION_FIXTURE !== '1') {
  const root = await mkdtemp(join(tmpdir(), 'legal-editorial-validation-'));
  const original = await readFile('dist/opportunities.json', 'utf8');
  try {
    await cp('dist', join(root, 'dist'), {recursive: true});
    await cp('validate.mjs', join(root, 'validate.mjs'));
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    const exercise = async (label, change, expectedStatus = 0) => {
      const data = JSON.parse(original);
      change(data);
      const audit = data.coverage_audit;
      audit.current_record_count = data.records.length;
      audit.current_route_firm_count = audit.firms.filter((firm) => firm.review_state === 'current_route').length;
      audit.closed_programme_count = audit.firms.filter((firm) => firm.review_state === 'closed_programme').length;
      audit.no_record_displayed_count = audit.firms.filter((firm) => firm.review_state === 'no_record_displayed').length;
      await writeFile(join(root, 'dist/opportunities.json'), JSON.stringify(data));
      const run = spawnSync(process.execPath, ['validate.mjs'], {cwd: root, encoding: 'utf8', timeout: 30000,
        env: {...process.env, EDITORIAL_VALIDATION_FIXTURE: '1'}});
      assert.equal(run.status, expectedStatus, label + '\n' + run.stderr);
      console.log('PASS: editorial validation — ' + label);
    };
    await exercise('reviewed timestamps can change', (data) => {
      for (const record of data.records) record.last_verified_at = '2026-09-30T12:00:00Z';
    });
    await exercise('confirmed closures can be published', (data) => {
      for (const record of data.records) record.status = 'closed';
      for (const firm of data.coverage_audit.firms) if (firm.record_ids.length) firm.review_state = 'closed_programme';
    });
    await exercise('a further trainee record can be added', (data) => {
      const source = data.records.find((record) => record.id === 'latham-riyadh-trainee-associate');
      assert(source);
      const extra = {...source, id: 'controlled-editorial-test-only'};
      data.records.push(extra);
      data.coverage_audit.firms.find((firm) => firm.firm_name === extra.firm_name).record_ids.push(extra.id);
    });
    await exercise('unsafe source URLs remain rejected', (data) => {
      data.records[0].source_url = 'http://careers.aoshearman.com/controlled-test-only';
    }, 1);
    assert.equal(await readFile('dist/opportunities.json', 'utf8'), original, 'Editorial tests must not modify the live source feed.');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
}
