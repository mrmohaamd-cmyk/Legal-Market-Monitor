import { createHash, randomBytes } from 'node:crypto';

// A single CAS record makes day/identity reservations and the global pause atomic.
// No TTL, automatic reset, content cache, or absent-post retry exists.
export const MAX_LEDGER_BYTES = 1_000_000;
export const MAX_LEDGER_ATTEMPTS = 2000;
const MAX_CAS_RETRIES = 8;
const hash = value => createHash('sha256').update(value).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;
const attemptPattern = /^[a-f0-9]{32}$/;
const postPattern = /^t3_[a-z0-9]+$/;
const isDigest = value => typeof value === 'string' && digestPattern.test(value);
const isAttemptId = value => typeof value === 'string' && attemptPattern.test(value);
const isPostId = value => typeof value === 'string' && postPattern.test(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isoDay = now => new Date(now).toISOString().slice(0, 10);
const timeOK = now => Number.isSafeInteger(now) && now >= 0;
const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, ' ').trim();
const keysExactly = (value, allowed) => object(value) && Object.keys(value).every(key => allowed.includes(key));

export function ledgerScope(subreddit = 'SaudiLaw', mode = 'production') {
  if ((mode === 'production' && subreddit === 'SaudiLaw') || (mode === 'private-test' && subreddit === 'saudilaw_jobs_dev')) {
    return { community: subreddit.toLowerCase(), mode, key: `saudilaw-jobs:v2:${mode}:${subreddit.toLowerCase()}:ledger` };
  }
  throw new Error('Unsupported posting mode/community pair.');
}
export function recordHashes(record) {
  if (![record?.id, record?.firm_name, record?.role_title, record?.location].every(value => typeof value === 'string' && value.length > 0 && value.length <= 5000)) throw new Error('Invalid deduplication identity.');
  return {
    recordHash: hash(`record:${record.id}`),
    identityHash: hash(`identity:${[record.firm_name, record.role_title, record.location].map(normalize).join('|')}`)
  };
}
export const postHash = postId => { if (!isPostId(postId)) throw new Error('Invalid Reddit post ID.'); return hash(`post:${postId}`); };
export const newAttemptId = () => randomBytes(16).toString('hex');
export function attemptMarker(attemptId) {
  if (!isAttemptId(attemptId)) throw new Error('Invalid attempt ID.');
  return `SaudiLaw Jobs attempt: SLJ2-${attemptId}`;
}

function validate(raw, scope) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > MAX_LEDGER_BYTES) throw new Error('Invalid or oversized ledger.');
  const value = JSON.parse(raw);
  if (!keysExactly(value, ['schema', 'community', 'mode', 'revision', 'active', 'halt', 'attempts', 'deletions']) ||
      value.schema !== 2 || value.community !== scope.community || value.mode !== scope.mode ||
      !Number.isSafeInteger(value.revision) || value.revision < 0 || !object(value.attempts) || !object(value.deletions) ||
      Object.keys(value.attempts).length > MAX_LEDGER_ATTEMPTS || Object.keys(value.deletions).length > MAX_LEDGER_ATTEMPTS ||
      (value.active !== null && !isAttemptId(value.active)) ||
      (value.halt !== null && (!keysExactly(value.halt, ['code', 'attemptId']) || !['conflicting-receipt', 'deletion-capacity'].includes(value.halt.code) || !isAttemptId(value.halt.attemptId)))) throw new Error('Invalid ledger schema.');
  const recordIds = new Set(); const identities = new Set(); const days = new Set(); const posts = new Set(); let pending = 0;
  for (const [attemptId, attempt] of Object.entries(value.attempts)) {
    if (!isAttemptId(attemptId) || !keysExactly(attempt, ['recordHash', 'identityHash', 'day', 'startedAt', 'state', 'submittedAt', 'postHash', 'postId']) ||
        !isDigest(attempt.recordHash) || !isDigest(attempt.identityHash) ||
        !timeOK(attempt.startedAt) || attempt.day !== isoDay(attempt.startedAt) ||
        !['reserved', 'submitting', 'posted', 'suppressed', 'deleted'].includes(attempt.state) ||
        (attempt.submittedAt !== undefined && (!timeOK(attempt.submittedAt) || attempt.submittedAt < attempt.startedAt || isoDay(attempt.submittedAt) !== attempt.day)) ||
        (attempt.postHash !== undefined && !isDigest(attempt.postHash)) ||
        (attempt.postId !== undefined && (!isPostId(attempt.postId) || attempt.postHash !== postHash(attempt.postId))) ||
        (attempt.state === 'posted' && (!attempt.postId || attempt.submittedAt === undefined)) ||
        (attempt.state === 'deleted' && (!attempt.postHash || attempt.submittedAt === undefined)) ||
        (attempt.state === 'suppressed' && attempt.postHash !== undefined && attempt.submittedAt === undefined) ||
        (attempt.state === 'reserved' && (attempt.submittedAt !== undefined || attempt.postHash !== undefined || attempt.postId !== undefined)) ||
        (attempt.state === 'submitting' && (attempt.postHash !== undefined || attempt.postId !== undefined)) ||
        (['deleted', 'suppressed'].includes(attempt.state) && attempt.postId !== undefined) ||
        (attempt.state === 'submitting' && attempt.submittedAt === undefined) ||
        (attempt.postHash !== undefined && posts.has(attempt.postHash)) || recordIds.has(attempt.recordHash) || identities.has(attempt.identityHash) || days.has(attempt.day)) throw new Error('Invalid or conflicting ledger attempt.');
    recordIds.add(attempt.recordHash); identities.add(attempt.identityHash); days.add(attempt.day);
    if (attempt.postHash) posts.add(attempt.postHash);
    if (['reserved', 'submitting'].includes(attempt.state)) {
      pending++;
      if (value.active !== attemptId) throw new Error('Pending attempt is not globally paused.');
    }
  }
  if ((value.active === null && pending !== 0) || (value.active !== null && pending !== 1)) throw new Error('Invalid global pause.');
  if (value.halt && !Object.hasOwn(value.attempts, value.halt.attemptId)) throw new Error('Halt refers to an unknown attempt.');
  for (const [key, deleted] of Object.entries(value.deletions)) if (!isDigest(key) || deleted !== true) throw new Error('Invalid deletion tombstone.');
  return value;
}

function requireStorage(storage) {
  if (typeof storage?.get !== 'function' || typeof storage?.compareAndSet !== 'function') throw new Error('Atomic compareAndSet storage is required.');
}
async function read(storage, scope) {
  requireStorage(storage);
  const raw = await storage.get(scope.key);
  return { raw: raw ?? undefined, ledger: validate(raw, scope) };
}
async function change(storage, scope, operation) {
  for (let retry = 0; retry < MAX_CAS_RETRIES; retry++) {
    const {raw, ledger} = await read(storage, scope);
    if (!ledger) return {status: 'uninitialized'};
    const next = structuredClone(ledger);
    const result = operation(next);
    if (!result.write) return result.value;
    next.revision++;
    const encoded = JSON.stringify(next);
    validate(encoded, scope);
    const committed = await storage.compareAndSet(scope.key, raw, encoded);
    if (committed === true) return result.value;
    if (committed !== false) throw new Error('Ambiguous CAS response.');
  }
  return {status: 'contention', reason: 'Atomic update did not complete; no submission.'};
}
const unchanged = value => ({write: false, value});
const written = value => ({write: true, value});
const paused = ledger => ({status: 'paused', attemptId: ledger.active ?? ledger.halt?.attemptId, reason: ledger.halt?.code ?? 'Unresolved durable attempt; automatic posting is paused.'});
const noContent = error => ({status: 'storage-uncertain', reason: 'Ledger access or atomic commit was not confirmed. No automatic retry of a submission.', error: error instanceof SyntaxError ? 'invalid-json' : 'ledger-failure'});

/** Initialize only after an operator has established that all predecessor releases were hardlocked. */
export async function initializeLedger({storage, subreddit = 'SaudiLaw', mode = 'production', confirmedNoLegacyPosting = false, confirmedNoLostLedger = false} = {}) {
  try {
    const scope = ledgerScope(subreddit, mode);
    const existing = await read(storage, scope);
    if (existing.ledger) return {status: 'already-initialized'};
    if (confirmedNoLegacyPosting !== true || confirmedNoLostLedger !== true) return {status: 'blocked', reason: 'Explicit confirmation of no legacy posting and no prior/lost v2 ledger is required; missing state is not proof.'};
    const ledger = {schema: 2, community: scope.community, mode, revision: 0, active: null, halt: null, attempts: {}, deletions: {}};
    const result = await storage.compareAndSet(scope.key, undefined, JSON.stringify(ledger));
    if (result === true) return {status: 'initialized'};
    if (result === false) return {status: 'contention'};
    throw new Error('Ambiguous initialization response.');
  } catch (error) { return noContent(error); }
}

export async function getLedgerStatus({storage, subreddit = 'SaudiLaw', mode = 'production'} = {}) {
  try {
    const {ledger} = await read(storage, ledgerScope(subreddit, mode));
    if (!ledger) return {status: 'uninitialized'};
    const attempts = Object.entries(ledger.attempts);
    const active = ledger.active ? ledger.attempts[ledger.active] : null;
    return {status: ledger.active || ledger.halt ? 'paused' : 'ready', revision: ledger.revision,
      active: active ? {attemptId: ledger.active, state: active.state, day: active.day, marker: attemptMarker(ledger.active)} : null,
      halt: ledger.halt, attemptCount: attempts.length,
      lastAttemptDay: attempts.length ? attempts.map(([, attempt]) => attempt.day).sort().at(-1) : null,
      receipts: attempts.filter(([, attempt]) => attempt.state === 'posted').map(([attemptId, attempt]) => ({attemptId, postId: attempt.postId, day: attempt.day})),
      suppressedCount: attempts.filter(([, attempt]) => ['deleted', 'suppressed'].includes(attempt.state)).length};
  } catch (error) { return noContent(error); }
}

/** Read-only queue selection. Pass only records already accepted by evaluateFeed. */
export async function chooseUnclaimedRecord({storage, subreddit = 'SaudiLaw', mode = 'production', records, now = Date.now()} = {}) {
  try {
    if (!Array.isArray(records) || records.length > 250 || !timeOK(now)) return {status: 'blocked', reason: 'A bounded validated candidate list and evaluation time are required.'};
    const candidates = records.map(record => ({recordId: record.id, ...recordHashes(record)}));
    const {ledger} = await read(storage, ledgerScope(subreddit, mode));
    if (!ledger) return {status: 'uninitialized'};
    if (ledger.active || ledger.halt) return paused(ledger);
    const attempts = Object.values(ledger.attempts);
    const candidate = candidates.find(record => !attempts.some(attempt => attempt.recordHash === record.recordHash || attempt.identityHash === record.identityHash));
    if (!candidate) return {status: 'nothing-to-post'};
    if (attempts.some(attempt => attempt.day >= isoDay(now))) return {status: 'daily-cap'};
    if (attempts.length >= MAX_LEDGER_ATTEMPTS) return {status: 'capacity-blocked'};
    return {status: 'candidate', recordId: candidate.recordId};
  } catch (error) { return noContent(error); }
}

export async function reserveAttempt({storage, subreddit = 'SaudiLaw', mode = 'production', record, now = Date.now(), attemptId = newAttemptId()} = {}) {
  try {
    if (!timeOK(now) || !isAttemptId(attemptId)) throw new Error('Invalid attempt reservation.');
    const hashes = recordHashes(record);
    return await change(storage, ledgerScope(subreddit, mode), ledger => {
      if (ledger.active || ledger.halt) return unchanged(paused(ledger));
      const attempts = Object.values(ledger.attempts);
      if (attempts.some(attempt => attempt.recordHash === hashes.recordHash || attempt.identityHash === hashes.identityHash)) return unchanged({status: 'duplicate'});
      if (attempts.some(attempt => attempt.day >= isoDay(now))) return unchanged({status: 'daily-cap'});
      if (attempts.length >= MAX_LEDGER_ATTEMPTS) return unchanged({status: 'capacity-blocked'});
      if (Object.hasOwn(ledger.attempts, attemptId)) return unchanged({status: 'blocked', reason: 'Attempt token collision.'});
      ledger.attempts[attemptId] = {...hashes, day: isoDay(now), startedAt: now, state: 'reserved'};
      ledger.active = attemptId;
      return written({status: 'reserved', attemptId, marker: attemptMarker(attemptId)});
    });
  } catch (error) { return noContent(error); }
}

export async function beginSubmission({storage, subreddit = 'SaudiLaw', mode = 'production', attemptId, now = Date.now()} = {}) {
  try {
    if (!isAttemptId(attemptId)) return {status: 'blocked', reason: 'A valid string attempt ID is required.'};
    return await change(storage, ledgerScope(subreddit, mode), ledger => {
      const attempt = ledger.attempts[attemptId];
      if (ledger.halt || ledger.active !== attemptId || attempt?.state !== 'reserved') return unchanged({status: 'paused', reason: 'Attempt is not exclusively reserved.'});
      if (!timeOK(now) || now < attempt.startedAt || isoDay(now) !== attempt.day) return unchanged({status: 'eligibility-changed'});
      attempt.state = 'submitting'; attempt.submittedAt = now;
      return written({status: 'submitting', attemptId});
    });
  } catch (error) { return noContent(error); }
}

export async function finishSubmission({storage, subreddit = 'SaudiLaw', mode = 'production', attemptId, postId} = {}) {
  try {
    if (!isAttemptId(attemptId)) return {status: 'blocked', reason: 'A valid string attempt ID is required.'};
    const receiptHash = postHash(postId);
    return await change(storage, ledgerScope(subreddit, mode), ledger => {
      const attempt = ledger.attempts[attemptId];
      if (!attempt) return unchanged({status: 'blocked', reason: 'Unknown attempt.'});
      if ((attempt.postHash && attempt.postHash !== receiptHash) ||
          (attempt.state === 'suppressed' && !attempt.postHash) ||
          Object.entries(ledger.attempts).some(([id, other]) => id !== attemptId && other.postHash === receiptHash)) {
        ledger.halt = {code: 'conflicting-receipt', attemptId};
        return written({status: 'paused', reason: 'Conflicting post receipts require investigation.'});
      }
      if (['posted', 'suppressed', 'deleted'].includes(attempt.state)) return unchanged({status: 'already-resolved', attemptId, ...(attempt.postId ? {postId: attempt.postId} : {})});
      if (ledger.halt || ledger.active !== attemptId || attempt.state !== 'submitting') return unchanged({status: 'paused', reason: 'Attempt is not an active submission.'});
      attempt.postHash = receiptHash;
      if (ledger.deletions[receiptHash]) {attempt.state = 'deleted'; delete attempt.postId;}
      else {attempt.state = 'posted'; attempt.postId = postId;}
      ledger.active = null;
      return written({status: attempt.state === 'deleted' ? 'deleted' : 'posted', attemptId, ...(attempt.postId ? {postId} : {})});
    });
  } catch (error) { return noContent(error); }
}

function matchesPost(post, {postId, expectedAuthorId, community, attemptId}) {
  if (typeof expectedAuthorId !== 'string' || !/^t2_[a-z0-9]+$/.test(expectedAuthorId) || !object(post) || post.id !== postId ||
      typeof post.subredditName !== 'string' || post.subredditName.toLowerCase() !== community ||
      post.authorId !== expectedAuthorId || post.deleted === true || post.removed === true ||
      typeof post.text !== 'string' || post.text.length > 40000) return false;
  const markerLines = post.text.split(/\r?\n/).filter(line => line.includes('SaudiLaw Jobs attempt:'));
  return markerLines.length === 1 && markerLines[0] === attemptMarker(attemptId);
}

/** fetchPost must read Reddit by the nominated ID; never pass request-supplied post assertions. */
export async function reconcileAttempt({storage, subreddit = 'SaudiLaw', mode = 'production', attemptId, postId, expectedAuthorId, fetchPost} = {}) {
  try {
    const scope = ledgerScope(subreddit, mode);
    if (!isAttemptId(attemptId) || !isPostId(postId) || typeof fetchPost !== 'function') return {status: 'blocked', reason: 'A valid attempt, post ID and independent Reddit read are required.'};
    const {ledger} = await read(storage, scope);
    if (!ledger) return {status: 'uninitialized'};
    const attempt = ledger.attempts[attemptId];
    if (!attempt || attempt.state === 'reserved') return {status: 'blocked', reason: 'No submitted attempt matches this recovery request.'};
    const post = await fetchPost(postId);
    if (!matchesPost(post, {postId, expectedAuthorId, community: scope.community, attemptId})) return {status: 'recovery-rejected', reason: 'Owned APP author, community, exact post ID and unique attempt marker were not all verified. Absence never permits retry.'};
    return await finishSubmission({storage, subreddit, mode, attemptId, postId});
  } catch { return {status: 'recovery-rejected', reason: 'Independent post verification failed; the durable pause remains.'}; }
}

/** Cancel reserved work, or suppress a positively verified APP post; never reopen dedupe/day claims. */
export async function suppressAttempt({storage, subreddit = 'SaudiLaw', mode = 'production', attemptId, postId, expectedAuthorId, fetchPost, confirm = false} = {}) {
  try {
    if (confirm !== true || !isAttemptId(attemptId)) return {status: 'blocked', reason: 'Explicit suppression confirmation and a valid attempt are required.'};
    const scope = ledgerScope(subreddit, mode);
    const {ledger} = await read(storage, scope);
    if (!ledger) return {status: 'uninitialized'};
    const attempt = ledger.attempts[attemptId];
    if (!attempt) return {status: 'blocked', reason: 'Unknown attempt.'};
    if (['suppressed', 'deleted'].includes(attempt.state)) return {status: 'already-suppressed', attemptId};
    let verifiedHash;
    if (attempt.state !== 'reserved') {
      if (!isPostId(postId) || typeof fetchPost !== 'function') return {status: 'recovery-rejected', reason: 'An uncertain submission cannot be cleared from absence; verify its owned APP post.'};
      const post = await fetchPost(postId);
      if (!matchesPost(post, {postId, expectedAuthorId, community: scope.community, attemptId})) return {status: 'recovery-rejected', reason: 'Post ownership, community and unique reference were not verified.'};
      verifiedHash = postHash(postId);
    }
    return await change(storage, scope, current => {
      const target = current.attempts[attemptId];
      if (!target || current.halt) return unchanged({status: 'paused', reason: 'Suppression state changed; investigate the ledger.'});
      if (['suppressed', 'deleted'].includes(target.state)) return unchanged({status: 'already-suppressed', attemptId});
      if (verifiedHash && target.postHash && target.postHash !== verifiedHash) return unchanged({status: 'recovery-rejected', reason: 'Post receipt differs from the verified post.'});
      if (!verifiedHash && (target.state !== 'reserved' || current.active !== attemptId)) return unchanged({status: 'paused', reason: 'Reservation advanced before cancellation; verify the post.'});
      if (verifiedHash) {target.postHash = verifiedHash; current.deletions[verifiedHash] = true;}
      target.state = 'suppressed'; delete target.postId;
      if (current.active === attemptId) current.active = null;
      return written({status: 'suppressed', attemptId});
    });
  } catch (error) { return noContent(error); }
}

/** Establish a verified suppression tombstone before an operator deletes an APP post. */
export async function suppressPost({storage, subreddit = 'SaudiLaw', mode = 'production', postId, expectedAuthorId, fetchPost, confirm = false} = {}) {
  try {
    const {ledger} = await read(storage, ledgerScope(subreddit, mode));
    if (!ledger) return {status: 'uninitialized'};
    const receiptHash = postHash(postId);
    const found = Object.entries(ledger.attempts).find(([, attempt]) => attempt.postHash === receiptHash);
    if (!found) return {status: 'blocked', reason: 'No existing owned-post receipt maps to this post.'};
    return suppressAttempt({storage, subreddit, mode, attemptId: found[0], postId, expectedAuthorId, fetchPost, confirm});
  } catch (error) { return noContent(error); }
}

/** Supply only trusted event context and postId. Event bodies/titles/URLs/authors are never retained. */
export async function processPostDeletion({storage, subreddit = 'SaudiLaw', mode = 'production', postId} = {}) {
  try {
    const deletedHash = postHash(postId);
    return await change(storage, ledgerScope(subreddit, mode), ledger => {
      const found = Object.entries(ledger.attempts).find(([, attempt]) => attempt.postHash === deletedHash);
      // Unknown events are relevant only during a submit/receipt race; avoid storing unrelated history.
      if (!found && (!ledger.active || ledger.attempts[ledger.active].state !== 'submitting')) return unchanged({status: 'ignored'});
      if (ledger.deletions[deletedHash] && (!found || found[1].state === 'deleted')) return unchanged({status: 'already-deleted'});
      if (Object.keys(ledger.deletions).length >= MAX_LEDGER_ATTEMPTS && !ledger.deletions[deletedHash]) {
        if (!found) {
          // Never drop a submit/deletion race and later retain its deleted post ID.
          ledger.halt = {code: 'deletion-capacity', attemptId: ledger.active};
          return written({status: 'paused', reason: 'Deletion tombstone capacity reached; receipt finalization is halted.'});
        }
        // A known attempt already retains its post hash, so its deleted state is a
        // sufficient permanent tombstone even when the race-tombstone map is full.
      } else ledger.deletions[deletedHash] = true;
      if (found) {found[1].state = 'deleted'; delete found[1].postId;}
      // A deletion without an existing receipt cannot prove which uncertain attempt succeeded.
      return written({status: found ? 'deleted' : 'deletion-recorded'});
    });
  } catch (error) { return noContent(error); }
}
