import { createHash } from 'node:crypto';
import { runBot, evaluateFeed, renderPost } from './lib/core.mjs';
import { initializeLedger, getLedgerStatus, chooseUnclaimedRecord, reconcileAttempt, suppressAttempt, suppressPost, processPostDeletion } from './lib/ledger.mjs';
import { inspectSchedule, isScheduledRunAllowed, startSchedule, stopSchedule } from './scheduling.mjs';

const communities = new Set(['saudilaw', 'saudilaw_jobs_dev']);
const postIdPattern = /^t3_[a-z0-9]+$/;
const attemptPattern = /^(?:SLJ2-)?[a-f0-9]{32}$/;
const matches = (pattern, value) => typeof value === 'string' && pattern.test(value);
const toast = message => ({ showToast: message });
const digest = post => createHash('sha256').update(JSON.stringify(post)).digest('hex');
const field = (name, label, defaultValue) => ({ type: 'string', name, label, required: true, ...(defaultValue ? { defaultValue } : {}) });
function confirmationForm(name, title, description, fields, confirmation) {
  return { showForm: { name, form: { title, description, acceptLabel: 'Confirm', cancelLabel: 'Cancel', fields: [
    ...fields, field('confirmation', `Type ${confirmation} to confirm`)
  ] } } };
}
const resultToast = result => toast(`${result.status}${result.postId ? `: ${result.postId}` : ''}${result.reason ? `. ${result.reason}` : ''}`);

// Injection exists for local tests. The deployed entry point supplies only the fixed release policy.
export function createOperations({ policy, getContext, authorizeModerator, getSetting, storage, scheduler,
  readFeed, submitVerified, fetchPost, deleteOwnedPost, getAppAuthorId, clock = Date.now }) {
  const scope = () => {
    const name = getContext().subredditName?.toLowerCase();
    return communities.has(name) ? { subreddit: name === 'saudilaw' ? 'SaudiLaw' : name,
      mode: name === 'saudilaw' ? 'production' : 'private-test' } : undefined;
  };
  async function authorized() {
    if (!scope()) return false;
    try { return await authorizeModerator() === true; } catch { return false; }
  }
  async function productionReady() {
    return policy.productionPosting === true && scope()?.mode === 'production' &&
      await getSetting('enabled') === true && await getSetting('dryRun') === false;
  }
  async function privateReady() {
    return policy.privateTestPosting === true && scope()?.mode === 'private-test' && await getSetting('privateTestEnabled') === true;
  }
  async function bootstrap() {
    return initializeLedger({ storage, ...scope(), confirmedNoLegacyPosting: policy.bootstrapEmptyLedger === true,
      confirmedNoLostLedger: true, now: clock() });
  }
  async function postSelected(recordId, expectedDigest, scheduleToken) {
    if (!await productionReady()) return { status: 'locked' };
    if (scheduleToken !== undefined && !await isScheduledRunAllowed({ storage, token: scheduleToken })) return { status: 'schedule-paused' };
    const { feed } = await readFeed();
    const report = evaluateFeed(feed, { now: clock() });
    if (!report.valid) return { status: 'invalid-feed' };
    const selected = recordId ? report.candidates.find(record => record.id === recordId) : undefined;
    if (recordId && (!selected || digest(renderPost(selected)) !== expectedDigest)) return { status: 'review-changed', reason: 'The selected opportunity changed or is no longer eligible. Preview it again.' };
    return runBot({ feed: selected ? { ...feed, records: [selected] } : feed, clock, now: clock(), enabled: true, dryRun: false,
      ...scope(), storage, submit: submitVerified,
      canSubmit: async () => await productionReady() && (scheduleToken === undefined || await isScheduledRunAllowed({ storage, token: scheduleToken })) });
  }
  return {
    async menu(action) {
      if (!await authorized()) return toast('A moderator with post permissions in this community is required.');
      try {
        if (action === 'status') {
          const [ledger, schedule] = await Promise.all([getLedgerStatus({ storage, ...scope() }), inspectSchedule({ storage })]);
          const summary = { ...ledger, receipts: ledger.receipts?.slice(-10) };
          return confirmationForm('jobsStatus', 'Job bot status', `Posting release: ${policy.productionPosting ? 'permitted' : 'locked'}. Schedule: ${schedule.state}. Latest ten receipts; status is read-only.`,
            [{ type: 'paragraph', name: 'status', label: 'Ledger status', defaultValue: JSON.stringify(summary, null, 2), disabled: true }], 'CLOSE');
        }
        if (action === 'stop') return resultToast(await stopSchedule({ storage, scheduler }));
        if (action === 'initialize') {
          if (!await privateReady() && !await productionReady()) return toast('Posting setup is locked in this release or installation.');
          return confirmationForm('jobsInitialize', 'Initialize a new posting ledger',
            'Only for the first setup, after verifying this community has never posted through this bot and no earlier ledger was lost. Never use this to recover missing or deleted storage. Existing ledgers are not replaced. Starting or posting never initializes storage automatically.', [], 'INITIALIZE NEW LEDGER');
        }
        if (action === 'private-test') {
          if (!await privateReady()) return toast('Private posting test is locked in this release or its installation setting is off.');
          return confirmationForm('jobsPrivateTest', 'One private test post',
            'Creates one clearly labelled synthetic NOT A JOB post in r/saudilaw_jobs_dev as u/saudilaw-jobs. No employer, application link or recurring schedule. The permanent test claim prevents a second post.', [], 'POST ONE PRIVATE TEST');
        }
        if (action === 'start') {
          if (!await productionReady()) return toast('Production posting is locked, feed checks are off, or preview-only is on.');
          return confirmationForm('jobsStart', 'Start daily jobs',
            'Check the reviewed feed daily at 09:00 Saudi time (06:00 UTC). Publish at most one eligible job per UTC day as u/saudilaw-jobs in r/SaudiLaw. Unknown submission outcomes pause posting. This does not post immediately.', [], 'START DAILY JOBS');
        }
        if (action === 'publish') {
          if (!await productionReady()) return toast('Production posting is locked, feed checks are off, or preview-only is on.');
          const { feed } = await readFeed(); const report = evaluateFeed(feed, { now: clock() });
          if (!report.valid || !report.candidates.length) return toast('No currently verified eligible opportunity is available.');
          const choice = await chooseUnclaimedRecord({ storage, ...scope(), records: report.candidates, now: clock() });
          if (choice.status !== 'candidate') return resultToast(choice);
          const record = report.candidates.find(candidate => candidate.id === choice.recordId);
          const post = renderPost(record);
          return confirmationForm('jobsPublish', 'Publish one reviewed job',
            `Publish as u/saudilaw-jobs in r/SaudiLaw: ${post.title}. The daily limit and permanent duplicate checks apply.`,
            [field('recordId', 'Reviewed reference', record.id), field('digest', 'Reviewed draft fingerprint', digest(post))], `POST ${record.id}`);
        }
        if (action === 'reconcile') return confirmationForm('jobsReconcile', 'Reconcile a bot post',
          'Match an existing post to an uncertain attempt using its author, community and exact reference. This records the existing post; it never posts again. Missing/deleted posts do not prove an attempt failed.',
          [field('attemptId', 'Attempt reference (SLJ2-...)'), field('postId', 'Existing Reddit post ID (t3_...)')], 'RECONCILE');
        if (action === 'cancel-reservation') return confirmationForm('jobsCancelReservation', 'Cancel reserved work',
          'Cancel only an attempt that is still reserved and has not entered submission. The job and daily claim stay consumed. An uncertain submitted attempt cannot be cleared this way.',
          [field('attemptId', 'Reserved attempt reference (SLJ2-...)')], 'CANCEL RESERVATION');
        if (action === 'remove') return confirmationForm('jobsRemove', 'Delete a bot post',
          'Permanently delete one verified post authored by this app in this community. Its duplicate-prevention tombstone remains, so deletion does not repost the opportunity. No other post or ledger is removed.',
          [field('postId', 'Exact Reddit post ID (t3_...)')], 'DELETE BOT POST');
        return toast('Unknown action.');
      } catch { return toast('The operation could not be verified. Nothing will be automatically retried; inspect status.'); }
    },
    async form(name, data) {
      if (!await authorized()) return toast('A moderator with post permissions in this community is required.');
      if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.confirmation !== 'string') return toast('Explicit confirmation is required.');
      try {
        if (name === 'jobsStatus') return toast('Status closed; no settings changed.');
        if (name === 'jobsInitialize' && data.confirmation === 'INITIALIZE NEW LEDGER') {
          if (!await privateReady() && !await productionReady()) return toast('Posting setup is locked.');
          return resultToast(await bootstrap());
        }
        if (name === 'jobsPrivateTest' && data.confirmation === 'POST ONE PRIVATE TEST') {
          if (!await privateReady()) return toast('Private posting test is locked.');
          return resultToast(await runBot({ ...scope(), enabled: true, dryRun: false, storage, submit: submitVerified,
            clock, now: clock(), canSubmit: privateReady }));
        }
        if (name === 'jobsStart' && data.confirmation === 'START DAILY JOBS') {
          if (!await productionReady()) return toast('Production posting is locked.');
          const ledger = await getLedgerStatus({ storage, ...scope() });
          if (ledger.status !== 'ready') return toast('Initialize or resolve the posting ledger before starting a schedule.');
          return resultToast(await startSchedule({ storage, scheduler, subredditName: scope().subreddit, permitted: true }));
        }
        if (name === 'jobsPublish' && typeof data.recordId === 'string' && /^[a-z0-9-]{1,150}$/.test(data.recordId) &&
            typeof data.digest === 'string' && /^[a-f0-9]{64}$/.test(data.digest) && data.confirmation === `POST ${data.recordId}`) {
          return resultToast(await postSelected(data.recordId, data.digest));
        }
        if (name === 'jobsReconcile' && data.confirmation === 'RECONCILE' && matches(attemptPattern, data.attemptId) && matches(postIdPattern, data.postId)) {
          return resultToast(await reconcileAttempt({ storage, ...scope(), attemptId: data.attemptId.replace(/^SLJ2-/, ''), postId: data.postId,
            expectedAuthorId: await getAppAuthorId(), fetchPost, now: clock() }));
        }
        if (name === 'jobsCancelReservation' && data.confirmation === 'CANCEL RESERVATION' && matches(attemptPattern, data.attemptId)) {
          return resultToast(await suppressAttempt({ storage, ...scope(), attemptId: data.attemptId.replace(/^SLJ2-/, ''), confirm: true }));
        }
        if (name === 'jobsRemove' && data.confirmation === 'DELETE BOT POST' && matches(postIdPattern, data.postId)) {
          const result = await suppressPost({ storage, ...scope(), postId: data.postId, expectedAuthorId: await getAppAuthorId(), fetchPost, confirm: true, now: clock() });
          if (!['suppressed', 'already-suppressed'].includes(result.status)) return resultToast(result);
          try { await deleteOwnedPost(data.postId); }
          catch { return toast('Deletion outcome is uncertain. The duplicate-prevention tombstone is retained; inspect the exact post before retrying deletion.'); }
          return toast(`Deletion requested for ${data.postId}; the tombstone is saved. Verify the post is deleted in Reddit.`);
        }
        return toast('Confirmation or identifiers did not match; no operation performed.');
      } catch { return toast('Outcome could not be verified. Inspect status before any further action; no automatic retry.'); }
    },
    async scheduled(data) {
      if (!scope() || scope().mode !== 'production' || typeof data?.token !== 'string') return { status: 'blocked' };
      try { return await postSelected(undefined, undefined, data.token); }
      catch { return { status: 'blocked', reason: 'Scheduled state, settings or feed could not be verified.' }; }
    },
    async deleted(data) {
      if (!scope() || data?.type !== 'PostDelete' || !matches(postIdPattern, data.postId) ||
          (data.subreddit?.id && data.subreddit.id !== getContext().subredditId)) return { status: 'ignored' };
      const status = await getLedgerStatus({ storage, ...scope() });
      if (['storage-uncertain', 'contention'].includes(status.status)) return status;
      const known = status.receipts?.some(receipt => receipt.postId === data.postId);
      if (!known && (!data.author?.id || data.author.id !== await getAppAuthorId())) return { status: 'ignored' };
      // Existing receipts need no author assertion. Unknown receipt races require trusted APP-author identity.
      return processPostDeletion({ storage, ...scope(), postId: data.postId, now: clock() });
    }
  };
}
