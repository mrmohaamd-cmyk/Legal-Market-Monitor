import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeLedger, getLedgerStatus, ledgerScope, reserveAttempt, beginSubmission, finishSubmission,
  reconcileAttempt, suppressAttempt, suppressPost, processPostDeletion, chooseUnclaimedRecord, attemptMarker, MAX_LEDGER_BYTES, MAX_LEDGER_ATTEMPTS} from '../reddit-bot/lib/ledger.mjs';

const NOW = Date.parse('2026-11-07T12:00:00Z');
const DAY = 86400000;
const A = 'a'.repeat(32); const B = 'b'.repeat(32); const C = 'c'.repeat(32);
const item = id => ({id, firm_name: `Employer ${id}`, role_title: `Role ${id}`, location: 'Riyadh'});
const ownPost = (attemptId = A, id = 't3_posted') => ({id, subredditName: 'SaudiLaw', authorId: 't2_app', text: `Ephemeral content must not be retained.\n\n${attemptMarker(attemptId)}`});
function memory() {
  const data = new Map();
  return {data, calls: 0, async get(key) {return data.get(key);}, async compareAndSet(key, previous, next) {
    this.calls++;
    if (data.get(key) !== previous) return false;
    data.set(key, next); return true;
  }};
}
async function ready(extra = {}) {
  const scope = {storage: memory(), ...extra};
  assert.equal((await initializeLedger({...scope, confirmedNoLegacyPosting: true, confirmedNoLostLedger: true})).status, 'initialized');
  return scope;
}
async function pending(scope, {attemptId = A, now = NOW, record = item('one'), begin = true} = {}) {
  assert.equal((await reserveAttempt({...scope, attemptId, record, now})).status, 'reserved');
  if (begin) assert.equal((await beginSubmission({...scope, attemptId, now})).status, 'submitting');
}
const raw = scope => [...scope.storage.data.values()].join('');
const recover = (scope, extra = {}) => reconcileAttempt({...scope, attemptId: A, postId: 't3_posted', expectedAuthorId: 't2_app', fetchPost: async id => {assert.equal(id, 't3_posted'); return ownPost();}, ...extra});

test('initialization requires explicit no-legacy and no-lost-state attestations; it never replaces state', async () => {
  const scope = {storage: memory()};
  for (const flags of [{}, {confirmedNoLegacyPosting: true}, {confirmedNoLostLedger: true}]) assert.equal((await initializeLedger({...scope, ...flags})).status, 'blocked');
  assert.equal(scope.storage.data.size, 0);
  assert.equal((await initializeLedger({...scope, confirmedNoLegacyPosting: true, confirmedNoLostLedger: true})).status, 'initialized');
  await pending(scope);
  const before = raw(scope);
  assert.equal((await initializeLedger({...scope, confirmedNoLegacyPosting: true, confirmedNoLostLedger: true})).status, 'already-initialized');
  assert.equal(raw(scope), before);
});

test('30 concurrent reservations yield one complete atomic attempt and no partial claims', async () => {
  const scope = await ready();
  const results = await Promise.all(Array.from({length: 30}, (_, n) => reserveAttempt({...scope, now: NOW, record: item(String(n)), attemptId: n.toString(16).padStart(32, '0')})));
  assert.equal(results.filter(result => result.status === 'reserved').length, 1);
  assert.equal(results.filter(result => result.status === 'paused').length, 29);
  assert.equal((await getLedgerStatus(scope)).attemptCount, 1);
  assert.equal(scope.storage.data.size, 1);
  assert.doesNotMatch(raw(scope), /Employer|Role|Riyadh/);
});

test('a reserved crash pauses all jobs indefinitely and can only be cancelled without releasing its identity/day', async () => {
  const scope = await ready(); await pending(scope, {begin: false});
  assert.equal((await reserveAttempt({...scope, record: item('two'), attemptId: B, now: NOW + DAY})).status, 'paused');
  assert.equal((await suppressAttempt({...scope, attemptId: A})).status, 'blocked');
  assert.equal((await suppressAttempt({...scope, attemptId: A, confirm: true})).status, 'suppressed');
  assert.equal((await reserveAttempt({...scope, record: item('one'), attemptId: B, now: NOW + DAY})).status, 'duplicate');
  assert.equal((await reserveAttempt({...scope, record: item('two'), attemptId: B, now: NOW})).status, 'daily-cap');
  assert.equal((await reserveAttempt({...scope, record: item('two'), attemptId: B, now: NOW + DAY})).status, 'reserved');
  assert.equal((await beginSubmission({...scope, attemptId: A, now: NOW + DAY})).status, 'paused');
  assert.equal((await getLedgerStatus(scope)).active.attemptId, B);
});

test('once submitting, a missing post, elapsed time or a bare suppression confirmation cannot unpause', async () => {
  const scope = await ready(); await pending(scope);
  assert.equal((await suppressAttempt({...scope, attemptId: A, confirm: true})).status, 'recovery-rejected');
  assert.equal((await recover(scope, {fetchPost: async () => null})).status, 'recovery-rejected');
  assert.equal((await recover(scope, {fetchPost: async () => {throw new Error('Not found');}})).status, 'recovery-rejected');
  assert.equal((await reserveAttempt({...scope, attemptId: B, record: item('two'), now: NOW + 1000 * DAY})).status, 'paused');
  assert.equal((await getLedgerStatus(scope)).active.state, 'submitting');
});

test('recovery requires independently fetched exact ID, community, owned APP author and one exact marker', async () => {
  const scope = await ready(); await pending(scope);
  const original = raw(scope);
  const mismatches = [
    {id: 't3_other'}, {subredditName: 'saudilaw_jobs_dev'}, {subredditName: 'SaudiLaw.evil'},
    {authorId: 't2_human'}, {authorId: undefined}, {deleted: true}, {removed: true}, {text: undefined},
    {text: attemptMarker(B)}, {text: `> ${attemptMarker(A)}`}, {text: ` ${attemptMarker(A)}`},
    {text: `${attemptMarker(A)}\n${attemptMarker(A)}`}, {text: `${attemptMarker(A)}\nSaudiLaw Jobs attempt: fake`}
  ];
  for (const patch of mismatches) {
    assert.equal((await recover(scope, {fetchPost: async () => ({...ownPost(), ...patch})})).status, 'recovery-rejected');
    assert.equal(raw(scope), original);
  }
  assert.equal((await recover(scope, {expectedAuthorId: 'u/app'})).status, 'recovery-rejected');
  assert.equal((await recover(scope)).status, 'posted');
  assert.equal((await getLedgerStatus(scope)).status, 'ready');
  assert.doesNotMatch(raw(scope), /Ephemeral|t2_app|https?:/);
});

test('late recovery/completion cannot clear a newer active attempt or create a second daily attempt', async () => {
  const scope = await ready(); await pending(scope); await recover(scope);
  assert.equal((await reserveAttempt({...scope, attemptId: B, record: item('two'), now: NOW})).status, 'daily-cap');
  await pending(scope, {attemptId: B, now: NOW + DAY, record: item('two')});
  assert.equal((await recover(scope)).status, 'already-resolved');
  assert.equal((await finishSubmission({...scope, attemptId: A, postId: 't3_posted'})).status, 'already-resolved');
  assert.equal((await getLedgerStatus(scope)).active.attemptId, B);
});

test('conflicting receipts produce a durable halt rather than replacing evidence or clearing another attempt', async () => {
  const scope = await ready(); await pending(scope); await recover(scope);
  await pending(scope, {attemptId: B, now: NOW + DAY, record: item('two'), begin: false});
  assert.equal((await finishSubmission({...scope, attemptId: A, postId: 't3_different'})).status, 'paused');
  const status = await getLedgerStatus(scope);
  assert.equal(status.halt.code, 'conflicting-receipt'); assert.equal(status.active.attemptId, B);
  assert.equal((await beginSubmission({...scope, attemptId: B, now: NOW + DAY})).status, 'paused');
});

test('one post cannot become the receipt for two separate attempts', async () => {
  const scope = await ready(); await pending(scope); await recover(scope);
  await pending(scope, {attemptId: B, now: NOW + DAY, record: item('two')});
  assert.equal((await finishSubmission({...scope, attemptId: B, postId: 't3_posted'})).status, 'paused');
  const status = await getLedgerStatus(scope);
  assert.equal(status.receipts.length, 1); assert.equal(status.active.attemptId, B);
  assert.equal(status.halt.code, 'conflicting-receipt');
});

test('CAS response loss before/after receipt commit is recoverable without another submission', async () => {
  for (const commitFirst of [false, true]) {
    const scope = await ready(); await pending(scope);
    const compare = scope.storage.compareAndSet.bind(scope.storage);
    scope.storage.compareAndSet = async (...args) => {if (commitFirst) await compare(...args); throw new Error('Reply lost');};
    assert.equal((await finishSubmission({...scope, attemptId: A, postId: 't3_posted'})).status, 'storage-uncertain');
    scope.storage.compareAndSet = compare;
    assert.equal((await getLedgerStatus(scope)).status, commitFirst ? 'ready' : 'paused');
    assert.equal((await recover(scope)).status, commitFirst ? 'already-resolved' : 'posted');
    assert.equal((await getLedgerStatus(scope)).attemptCount, 1);
  }
});

test('recovery CAS loss remains safely repeatable using the same positive post evidence', async () => {
  const scope = await ready(); await pending(scope);
  const compare = scope.storage.compareAndSet.bind(scope.storage);
  scope.storage.compareAndSet = async (...args) => {await compare(...args); throw new Error('Reply lost after commit');};
  assert.equal((await recover(scope)).status, 'storage-uncertain');
  scope.storage.compareAndSet = compare;
  assert.equal((await recover(scope)).status, 'already-resolved');
});

test('a deletion racing ahead of receipt is permanent and cannot be undone by late completion', async () => {
  const scope = await ready(); await pending(scope);
  assert.equal((await processPostDeletion({...scope, postId: 't3_posted'})).status, 'deletion-recorded');
  assert.equal((await getLedgerStatus(scope)).status, 'paused');
  assert.equal((await finishSubmission({...scope, attemptId: A, postId: 't3_posted'})).status, 'deleted');
  assert.equal((await getLedgerStatus(scope)).status, 'ready');
  assert.equal((await recover(scope)).status, 'already-resolved');
  assert.equal((await getLedgerStatus(scope)).receipts.length, 0);
  assert.doesNotMatch(raw(scope), /t3_posted|Ephemeral|Employer|Role|Riyadh|t2_app/);
  assert.equal((await reserveAttempt({...scope, attemptId: B, record: item('one'), now: NOW + DAY})).status, 'duplicate');
});

test('deletion after receipt scrubs post IDs and never persists event content or personal data', async () => {
  const scope = await ready(); await pending(scope); await recover(scope);
  const event = {...scope, postId: 't3_posted', title: 'SECRET TITLE', body: 'SECRET BODY', url: 'https://private.example', user: 'Private User'};
  assert.equal((await processPostDeletion(event)).status, 'deleted');
  assert.equal((await processPostDeletion(event)).status, 'already-deleted');
  assert.doesNotMatch(raw(scope), /SECRET|private|Private|t3_posted|t2_app/);
  assert.equal((await getLedgerStatus(scope)).suppressedCount, 1);
});

test('unknown deletion events outside a submission do not create unrelated Reddit-content history', async () => {
  const scope = await ready(); const before = raw(scope);
  assert.equal((await processPostDeletion({...scope, postId: 't3_unrelated'})).status, 'ignored');
  assert.equal(raw(scope), before);
});

test('full deletion storage durably halts unknown receipt races but still scrubs known deleted post IDs', async () => {
  for (const known of [false, true]) {
    const scope = await ready(); await pending(scope);
    if (known) await recover(scope);
    const key = ledgerScope().key; const ledger = JSON.parse(scope.storage.data.get(key));
    ledger.deletions = Object.fromEntries(Array.from({length: MAX_LEDGER_ATTEMPTS}, (_, n) => [n.toString(16).padStart(64, '0'), true]));
    scope.storage.data.set(key, JSON.stringify(ledger));
    const result = await processPostDeletion({...scope, postId: 't3_posted'});
    if (known) assert.equal(result.status, 'deleted');
    else {
      assert.equal(result.status, 'paused');
      assert.equal((await getLedgerStatus(scope)).halt.code, 'deletion-capacity');
      assert.equal((await finishSubmission({...scope, attemptId: A, postId: 't3_posted'})).status, 'paused');
    }
    assert.doesNotMatch(raw(scope), /t3_posted/);
  }
});

test('verified pre-delete suppression survives deletion failures and permits only other future jobs', async () => {
  const scope = await ready(); await pending(scope); await recover(scope);
  assert.equal((await suppressPost({...scope, postId: 't3_posted', expectedAuthorId: 't2_app', fetchPost: async () => ownPost(), confirm: true})).status, 'suppressed');
  assert.doesNotMatch(raw(scope), /t3_posted/);
  // No Reddit deletion is performed by this operation. Even if it fails later, no repost is possible.
  assert.equal((await reserveAttempt({...scope, attemptId: B, record: item('one'), now: NOW + DAY})).status, 'duplicate');
  assert.equal((await reserveAttempt({...scope, attemptId: B, record: item('two'), now: NOW + DAY})).status, 'reserved');
  assert.equal((await processPostDeletion({...scope, postId: 't3_posted'})).status, 'deleted');
  assert.equal((await getLedgerStatus(scope)).active.attemptId, B);
});

test('corrupt/oversized state and ambiguous CAS responses fail closed without resetting', async () => {
  const scope = await ready(); const key = ledgerScope().key;
  for (const bad of ['not JSON', JSON.stringify({schema: 99}), 'x'.repeat(MAX_LEDGER_BYTES + 1)]) {
    scope.storage.data.set(key, bad);
    assert.equal((await getLedgerStatus(scope)).status, 'storage-uncertain');
    assert.equal((await initializeLedger({...scope, confirmedNoLegacyPosting: true, confirmedNoLostLedger: true})).status, 'storage-uncertain');
    assert.equal(scope.storage.data.get(key), bad);
  }
  const clean = await ready(); clean.storage.compareAndSet = async () => 'OK';
  assert.equal((await reserveAttempt({...clean, record: item('one'), attemptId: A, now: NOW})).status, 'storage-uncertain');
});

test('phase-inconsistent receipts, duplicate post mappings and orphan halts fail closed as corrupt state', async () => {
  const scope = await ready(); await pending(scope); await recover(scope);
  const key = ledgerScope().key; const original = JSON.parse(scope.storage.data.get(key));
  const cases = [];
  let bad = structuredClone(original); delete bad.attempts[A].submittedAt; cases.push(bad);
  bad = structuredClone(original); bad.attempts[A].state = 'reserved'; bad.active = A; cases.push(bad);
  bad = structuredClone(original); bad.halt = {code: 'conflicting-receipt', attemptId: C}; cases.push(bad);
  bad = structuredClone(original); bad.attempts[B] = {...bad.attempts[A], recordHash: '1'.repeat(64), identityHash: '2'.repeat(64), day: '2026-11-08', startedAt: NOW + DAY, submittedAt: NOW + DAY}; cases.push(bad);
  for (const candidate of cases) {
    const encoded = JSON.stringify(candidate); scope.storage.data.set(key, encoded);
    assert.equal((await getLedgerStatus(scope)).status, 'storage-uncertain');
    assert.equal(scope.storage.data.get(key), encoded);
  }
});

test('ledger boundaries reject coercible IDs and hash fields instead of persisting array values', async () => {
  const scope = await ready(); await pending(scope);
  const before = raw(scope);
  const writes = scope.storage.calls;
  for (const postId of [['t3_posted'], new String('t3_posted'), {toString: () => 't3_posted'}]) {
    assert.equal((await finishSubmission({...scope, attemptId: A, postId})).status, 'storage-uncertain');
    assert.equal((await recover(scope, {postId})).status, 'blocked');
  }
  for (const attemptId of [[A], new String(A), {toString: () => A}]) {
    assert.equal((await beginSubmission({...scope, attemptId, now: NOW})).status, 'blocked');
    assert.equal((await finishSubmission({...scope, attemptId, postId: 't3_posted'})).status, 'blocked');
  }
  assert.equal(raw(scope), before);
  assert.equal(scope.storage.calls, writes);
  const key = ledgerScope().key; const ledger = JSON.parse(before);
  ledger.attempts[A].recordHash = [ledger.attempts[A].recordHash];
  scope.storage.data.set(key, JSON.stringify(ledger));
  assert.equal((await getLedgerStatus(scope)).status, 'storage-uncertain');
});

test('attempt tokens cannot be reused and backward clocks cannot bypass daily reservations', async () => {
  const scope = await ready(); await pending(scope); await recover(scope);
  assert.equal((await reserveAttempt({...scope, attemptId: B, record: item('two'), now: NOW - DAY})).status, 'daily-cap');
  assert.equal((await reserveAttempt({...scope, attemptId: A, record: item('two'), now: NOW + DAY})).status, 'blocked');
});

test('private test recovery and deletion use only the isolated private community scope', async () => {
  const scope = await ready({subreddit: 'saudilaw_jobs_dev', mode: 'private-test'}); await pending(scope);
  assert.equal((await recover(scope)).status, 'recovery-rejected');
  assert.equal((await recover(scope, {fetchPost: async () => ({...ownPost(), subredditName: 'saudilaw_jobs_dev'})})).status, 'posted');
  assert.equal((await processPostDeletion({...scope, postId: 't3_posted'})).status, 'deleted');
  assert.equal((await getLedgerStatus({storage: scope.storage})).status, 'uninitialized');
});

test('read-only queue selection skips all claimed IDs and identities and respects global/daily safety state', async () => {
  const scope = await ready(); const records = [item('one'), item('two')];
  const initialCalls = scope.storage.calls;
  assert.deepEqual(await chooseUnclaimedRecord({...scope, records, now: NOW}), {status: 'candidate', recordId: 'one'});
  assert.equal(scope.storage.calls, initialCalls);
  await pending(scope);
  assert.equal((await chooseUnclaimedRecord({...scope, records, now: NOW + DAY})).status, 'paused');
  await recover(scope);
  assert.equal((await chooseUnclaimedRecord({...scope, records, now: NOW})).status, 'daily-cap');
  const calls = scope.storage.calls;
  const changedId = {...item('one'), id: 'renamed-one'};
  const changedTitle = {...item('one'), role_title: 'Updated role title'};
  assert.deepEqual(await chooseUnclaimedRecord({...scope, records: [changedId, changedTitle, item('two')], now: NOW + DAY}), {status: 'candidate', recordId: 'two'});
  assert.equal((await chooseUnclaimedRecord({...scope, records: [changedId, changedTitle], now: NOW + DAY})).status, 'nothing-to-post');
  assert.equal(scope.storage.calls, calls);
  assert.equal((await chooseUnclaimedRecord({storage: memory(), records, now: NOW})).status, 'uninitialized');
  scope.storage.data.set(ledgerScope().key, 'corrupt');
  assert.equal((await chooseUnclaimedRecord({...scope, records, now: NOW})).status, 'storage-uncertain');
});
