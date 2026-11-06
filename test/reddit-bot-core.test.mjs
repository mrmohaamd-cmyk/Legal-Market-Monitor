import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {REVIEWED_SOURCES, VERIFICATION_WINDOW_MS, timestamp, evaluateFeed, eligibility, renderPost, runBot, claimKeys} from '../reddit-bot/lib/core.mjs';

// Synthetic records exercise policy; these are never evidence of real employer facts.
const NOW = Date.parse('2026-11-07T00:00:00Z');
const VERIFIED = '2026-11-06T12:00:00Z';
function record(id = 'segal-riyadh-student-intern-2026') {
  const rule = REVIEWED_SOURCES[id];
  return {id, firm_name: rule.firm, role_title: rule.title, location: rule.location,
    source_url: rule.source, source_domain: new URL(rule.source).hostname, source_type: 'Official firm careers',
    application_url: rule.application, source_summary: 'Synthetic role description.', offer_summary: 'Duration and pay not stated.',
    responsibilities: ['Research and supervised work.'], qualifications: ['See employer requirements.'],
    eligibility_state: 'partly_stated', eligibility_summary: 'Requirements partly stated.',
    record_kind: 'advertised_opening', source_status: 'verified', status: 'open',
    last_verified_at: VERIFIED, last_reviewed_at: VERIFIED, deadline_at: null,
    application_check: {checked_at: VERIFIED, result: 'form_available', note: 'Synthetic test evidence only.'}};
}
const feed = (...records) => ({generated_at: VERIFIED, verification_window_hours: 168, records: records.length ? records : [record()]});
function storage() {
  const data = new Map();
  return {data, writes: [], async get(key) {return data.get(key);}, async set(key, value, options = {}) {
    this.writes.push({key, value, options});
    if (options.nx && data.has(key)) return undefined;
    data.set(key, value); return 'OK';
  }};
}
const live = (extra = {}) => ({feed: feed(), now: NOW, clock: () => NOW, enabled: true, dryRun: false, storage: storage(), submit: async () => ({id: 't3_test123'}), ...extra});

test('actual published-format feed has three reviewed candidates at the recorded audit time', async () => {
  const actual = JSON.parse(await readFile(new URL('../dist/opportunities.json', import.meta.url), 'utf8'));
  // Use its publication time, not wall time: this is a schema/integration fixture, not fresh employer evidence.
  const report = evaluateFeed(actual, {now: Date.parse(actual.generated_at)});
  assert.equal(report.valid, true, report.errors.join('\n'));
  assert.deepEqual(report.candidates.map(item => item.id).sort(), Object.keys(REVIEWED_SOURCES).sort());
  assert.equal(report.skipped.length, 5);
});

test('timestamp parser rejects missing timezone, impossible dates and noncanonical timestamps', () => {
  for (const value of ['2026-11-07', '2026-02-30T00:00:00Z', '2026-11-07T24:00:00Z', '2026-11-07T00:00:00', null, 0]) assert.ok(Number.isNaN(timestamp(value)), String(value));
  assert.equal(timestamp('2026-11-07T00:00:00Z'), NOW);
  assert.equal(timestamp('2026-11-07T00:00:00.000Z'), NOW);
});

test('standing recruitment routes cannot become vacancies despite fresh verified status', () => {
  const item = record(); item.record_kind = 'recruitment_route';
  assert.equal(eligibility(item, {now: NOW}).eligible, false);
  assert.match(eligibility(item, {now: NOW}).reasons.join(' '), /Standing recruitment/);
});

test('closed, expired, pending and unverified application entries are withheld', () => {
  for (const status of ['closed', 'expired', 'verification_pending']) assert.equal(eligibility({...record(), status}, {now: NOW}).eligible, false);
  for (const result of ['email_route', 'unverified']) {
    const item = record(); item.application_check.result = result;
    assert.equal(eligibility(item, {now: NOW}).eligible, false);
  }
});

test('each evidence timestamp expires exactly at seven days, never revived by another fresh timestamp', () => {
  for (const field of ['last_verified_at', 'last_reviewed_at', 'application_check']) {
    const item = record(); const old = new Date(NOW - VERIFICATION_WINDOW_MS).toISOString();
    if (field === 'application_check') item.application_check.checked_at = old; else item[field] = old;
    assert.equal(eligibility(item, {now: NOW - 1}).eligible, true, field);
    assert.equal(eligibility(item, {now: NOW}).eligible, false, field);
  }
});

test('malformed or future evidence, duplicate IDs and malformed records invalidate the complete feed', () => {
  const cases = [];
  let data = feed(); data.records[0].last_verified_at = '2026-11-07T00:00:01Z'; cases.push(data);
  data = feed(); delete data.records[0].application_check.checked_at; cases.push(data);
  data = feed(); data.records.push(structuredClone(data.records[0])); cases.push(data);
  data = feed(); data.records.push(null); cases.push(data);
  data = feed(); data.records[0].qualifications = 'Unknown'; cases.push(data);
  data = feed(); data.records[0].deadline_at = 'Tomorrow'; cases.push(data);
  data = feed(); data.records[0].source_summary = 'hidden\u202eevil'; cases.push(data);
  for (const candidate of cases) {
    const result = evaluateFeed(candidate, {now: NOW});
    assert.equal(result.valid, false); assert.equal(result.candidates.length, 0);
  }
});

test('feed timestamp and seven-day configuration fail closed', () => {
  for (const patch of [{generated_at: '2026-11-07T00:00:01Z'}, {generated_at: new Date(NOW - VERIFICATION_WINDOW_MS).toISOString()}, {verification_window_hours: 720}, {records: new Array(251).fill(record())}]) assert.equal(evaluateFeed({...feed(), ...patch}, {now: NOW}).valid, false);
});

test('unreviewed identities and altered URLs are blocked, even on a known host', () => {
  for (const patch of [
    {id: 'unreviewed-job'}, {firm_name: 'Different Employer'}, {role_title: 'Different Role'},
    {location: 'Dubai, United Arab Emirates'}, {source_domain: 'attacker.example'},
    {source_url: 'https://www.segal.com.sa/en/careers/jobs/other'},
    {application_url: 'https://www.segal.com.sa/en/careers/apply?job=other'},
    {application_url: 'https://www.segal.com.sa.evil.example/apply'},
    {application_url: 'https://user:password@www.segal.com.sa/apply'},
    {application_url: 'http://www.segal.com.sa/apply'}, {application_url: 'javascript:alert(1)'},
    {application_url: 'https://www.segal.com.sa/en/careers/apply?job=student-intern#fragment'}
  ]) assert.equal(eligibility({...record(), ...patch}, {now: NOW}).eligible, false, JSON.stringify(patch));
});

test('exact deadlines and earlier editorial recheck limits suppress the record without inventing closure', () => {
  for (const field of ['deadline_at', 'review_due_at']) assert.equal(eligibility({...record(), [field]: new Date(NOW).toISOString()}, {now: NOW}).eligible, false);
  const item = record('ao-shearman-winter-2026-coop');
  const cutoff = timestamp(REVIEWED_SOURCES[item.id].reviewBy);
  for (const field of ['last_verified_at', 'last_reviewed_at']) item[field] = new Date(cutoff).toISOString();
  item.application_check.checked_at = new Date(cutoff).toISOString();
  const result = eligibility(item, {now: cutoff});
  assert.equal(result.eligible, false); assert.match(result.reasons.join(' '), /editorial recheck/);
  assert.equal(item.status, 'open');
});

test('post preserves unknown work model, deadline and qualification caveats', () => {
  const item = record(); item.application_check.result = 'login_required'; item.application_check.note = 'Login required; submission was not tested.';
  const rendered = renderPost(item);
  assert.match(rendered.text, /\*\*Work model:\*\* Not stated/);
  assert.match(rendered.text, /\*\*Deadline:\*\* Not stated/);
  assert.match(rendered.text, /Some eligibility details remain unstated/);
  assert.match(rendered.text, /Login required; submission was not tested/);
  assert.match(rendered.text, /\[Application entry\]/);
  assert.match(rendered.text, /does not accept applications/);
  assert.ok(!rendered.text.includes('**Work model:** On-site'));
});

test('work model requires explicit reviewed source evidence', () => {
  const item = {...record(), work_model: 'Remote'};
  assert.equal(eligibility(item, {now: NOW}).eligible, false);
  item.work_model_source_text = 'Synthetic source says remote.'; item.work_model_source_url = item.source_url;
  assert.equal(eligibility(item, {now: NOW}).eligible, true);
  assert.match(renderPost(item).text, /\*\*Work model:\*\* Remote/);
});

test('prose cannot inject Markdown links or HTML', () => {
  const item = record(); item.source_summary = '[Apply here](https://evil.example) <script>alert(1)</script> **fake**';
  const {text} = renderPost(item);
  assert.ok(!text.includes('[Apply here](https://evil.example)'));
  assert.ok(!text.includes('<script>')); assert.ok(!text.includes('**fake**'));
  assert.ok(text.includes('&lt;script&gt;'));
});

test('disabled defaults and non-boolean dryRun cannot call submit or storage', async () => {
  const forbidden = async () => {throw new Error('Must not call');};
  assert.deepEqual(await runBot(), {status: 'disabled'});
  assert.equal((await runBot({enabled: 'true', submit: forbidden})).status, 'disabled');
  for (const dryRun of [undefined, true, null, 'false', 0]) {
    const result = await runBot(live({dryRun, storage: {get: forbidden, set: forbidden}, submit: forbidden}));
    assert.equal(result.status, 'dry-run'); assert.equal(result.previews.length, 1);
  }
});

test('wrong subreddit, missing adapters and malformed feed cannot submit', async () => {
  assert.equal((await runBot(live({subreddit: 'Other'}))).status, 'blocked');
  assert.equal((await runBot(live({storage: undefined}))).status, 'blocked');
  let calls = 0;
  const result = await runBot(live({feed: {}, submit: async () => {calls++;}}));
  assert.equal(result.status, 'invalid-feed'); assert.equal(calls, 0);
});

test('confirmed posting writes permanent receipts then blocks repeats after midnight', async () => {
  const store = storage(); let calls = 0;
  const options = live({storage: store, submit: async params => {calls++; assert.equal(params.runAs, 'APP'); assert.equal(params.subredditName, 'SaudiLaw'); return {id: 't3_posted'};}});
  assert.equal((await runBot(options)).status, 'posted');
  assert.equal((await runBot({...options, now: NOW + 86400000})).status, 'nothing-to-post');
  assert.equal(calls, 1); assert.equal(store.data.size, 3);
  assert.ok(store.writes.every(({options}) => !('expiration' in options) && !('expire' in options)));
});

test('30 concurrent scheduler runs submit once and share an atomic daily limit', async () => {
  const store = storage(); let calls = 0;
  const options = live({storage: store, feed: feed(record(), record('ao-shearman-winter-2026-coop')), submit: async () => {calls++; await Promise.resolve(); return {id: 't3_one'};}});
  const results = await Promise.all(Array.from({length: 30}, () => runBot(options)));
  assert.equal(calls, 1); assert.equal(results.filter(item => item.status === 'posted').length, 1);
  assert.equal((await runBot(options)).status, 'daily-cap');
});

test('renamed record ID cannot bypass normalized identity deduplication', async () => {
  const store = storage(); let calls = 0;
  const original = record(); const alias = {...record(), id: 'segal-new-id', role_title: 'student  intern'};
  const registry = {...REVIEWED_SOURCES, [alias.id]: {...REVIEWED_SOURCES[original.id], title: alias.role_title}};
  const options = live({storage: store, registry, submit: async () => {calls++; return {id: 't3_one'};}});
  assert.equal((await runBot(options)).status, 'posted');
  assert.equal((await runBot({...options, now: NOW + 86400000, feed: feed(alias)})).status, 'nothing-to-post');
  assert.equal(calls, 1);
});

test('shared application portals do not collapse distinct advertised programme identities', () => {
  const item = record('white-case-saudi-law-trainee-2027');
  const other = {...item, id: 'white-case-other-programme', role_title: 'Other advertised programme'};
  assert.notEqual(claimKeys(item).identity, claimKeys(other).identity);
});

test('same record ID remains deduplicated when an editorial title change alters its identity', async () => {
  const store = storage(); let calls = 0;
  const original = record(); const revised = {...original, role_title: 'Revised Student Intern title'};
  const options = live({storage: store, submit: async () => {calls++; return {id: 't3_one'};}});
  assert.equal((await runBot(options)).status, 'posted');
  const registry = {...REVIEWED_SOURCES, [revised.id]: {...REVIEWED_SOURCES[revised.id], title: revised.role_title}};
  assert.equal((await runBot({...options, now: NOW + 86400000, feed: feed(revised), registry})).status, 'nothing-to-post');
  assert.equal(calls, 1);
});

test('evidence expiring during async storage operations is rechecked before submission', async () => {
  const item = record(); item.last_verified_at = new Date(NOW - VERIFICATION_WINDOW_MS + 1).toISOString();
  let calls = 0;
  const store = storage();
  const result = await runBot(live({feed: feed(item), clock: () => NOW + 1, storage: store, submit: async () => {calls++;}}));
  assert.equal(result.status, 'eligibility-changed'); assert.equal(calls, 0); assert.equal(store.data.size, 3);
});

test('crossing UTC midnight during claim writes cannot use yesterday\'s daily slot', async () => {
  let calls = 0;
  const result = await runBot(live({now: NOW - 1, clock: () => NOW, submit: async () => {calls++;}}));
  assert.equal(result.status, 'eligibility-changed'); assert.equal(calls, 0);
});

test('submission timeout retains permanent claims and is never automatically retried', async () => {
  const store = storage(); let calls = 0;
  const options = live({storage: store, submit: async () => {calls++; throw new Error('Timeout after Reddit accepted');}});
  assert.equal((await runBot(options)).status, 'submission-uncertain');
  assert.equal((await runBot({...options, now: NOW + 86400000})).status, 'nothing-to-post');
  assert.equal(calls, 1); assert.equal(store.data.size, 3);
  assert.ok([...store.data.values()].every(value => JSON.parse(value).state === 'pending'));
});

test('missing or malformed post receipt is uncertain and never triggers automatic retry', async () => {
  for (const response of [undefined, {}, {id: '123'}, {id: ''}]) {
    const options = live({submit: async () => response});
    assert.equal((await runBot(options)).status, 'submission-uncertain');
    assert.equal((await runBot({...options, now: NOW + 86400000})).status, 'nothing-to-post');
  }
});

test('ambiguous Redis claim response, storage failure and partial claims prevent submission', async () => {
  for (const failAt of [1, 2, 3]) {
    const store = storage(); const set = store.set.bind(store); let writes = 0; let calls = 0;
    store.set = async (...args) => {writes++; const result = await set(...args); if (writes === failAt) throw new Error('Reply lost'); return result;};
    const result = await runBot(live({storage: store, submit: async () => {calls++; return {id: 't3_one'};}}));
    assert.equal(result.status, 'storage-uncertain'); assert.equal(calls, 0);
    assert.equal(store.data.size, failAt);
  }
  let calls = 0;
  const result = await runBot(live({storage: {get: async () => undefined, set: async () => true}, submit: async () => {calls++;}}));
  assert.equal(result.status, 'daily-cap'); assert.equal(calls, 0);
});

test('failure saving a confirmed Reddit receipt retains duplicate protection', async () => {
  const store = storage(); const set = store.set.bind(store); let calls = 0;
  store.set = async (...args) => {if (!args[2]?.nx) throw new Error('Receipt storage failed'); return set(...args);};
  const options = live({storage: store, submit: async () => {calls++; return {id: 't3_known'};}});
  const result = await runBot(options);
  assert.equal(result.status, 'receipt-uncertain'); assert.equal(result.postId, 't3_known');
  assert.equal((await runBot({...options, now: NOW + 86400000})).status, 'nothing-to-post'); assert.equal(calls, 1);
});
