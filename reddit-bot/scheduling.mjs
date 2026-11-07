import { randomBytes } from 'node:crypto';

export const SCHEDULE_KEY = 'saudilaw-jobs:v2:schedule';
export const JOB_NAME = 'check-jobs';
export const DAILY_CRON = '0 6 * * *'; // Proposed 09:00 Saudi time; only created by an approved Start action.
const tokenPattern = /^[a-f0-9]{32}$/;
const paused = () => ({ version: 1, state: 'paused' });
function parse(raw) {
  if (raw === undefined) return paused();
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !['paused', 'starting', 'active'].includes(data.state) ||
      (data.state !== 'paused' && !tokenPattern.test(data.token)) ||
      (data.state === 'active' && (typeof data.jobId !== 'string' || !data.jobId || data.jobId.length > 200))) throw new Error('Invalid schedule state');
  return data;
}
export async function inspectSchedule({ storage }) {
  try { return parse(await storage.get(SCHEDULE_KEY)); }
  catch { return { state: 'unknown', reason: 'Schedule storage is unavailable or invalid; callbacks are blocked.' }; }
}
export async function isScheduledRunAllowed({ storage, token }) {
  if (!tokenPattern.test(token ?? '')) return false;
  const state = await inspectSchedule({ storage });
  return state.state === 'active' && state.token === token;
}
export async function startSchedule({ storage, scheduler, subredditName, permitted = false }) {
  if (permitted !== true || subredditName?.toLowerCase() !== 'saudilaw') return { status: 'locked' };
  let pendingRaw;
  let jobId;
  try {
    const raw = await storage.get(SCHEDULE_KEY);
    const existing = parse(raw);
    if (existing.state !== 'paused') return { status: existing.state === 'active' ? 'already-active' : 'schedule-uncertain' };
    const pending = { version: 1, state: 'starting', token: randomBytes(16).toString('hex') };
    pendingRaw = JSON.stringify(pending);
    if (await storage.compareAndSet(SCHEDULE_KEY, raw, pendingRaw) !== true) return { status: 'schedule-conflict' };
    // Until the receipt is committed, even an already-created scheduler job cannot post.
    jobId = await scheduler.runJob({ name: JOB_NAME, cron: DAILY_CRON, data: { token: pending.token } });
    if (typeof jobId !== 'string' || !jobId || jobId.length > 200) throw new Error('Unknown scheduler receipt');
    if (await storage.compareAndSet(SCHEDULE_KEY, pendingRaw, JSON.stringify({ ...pending, state: 'active', jobId })) !== true) {
      try { await scheduler.cancelJob(jobId); } catch { /* Its token cannot match the stopped/new state. */ }
      return { status: 'schedule-superseded' };
    }
    return { status: 'scheduled', cron: DAILY_CRON, jobId };
  } catch {
    // A create/commit timeout may have succeeded: never repeat it automatically.
    return { status: 'schedule-uncertain', reason: 'The schedule may already be active. Inspect status and use Stop before another Start; an in-flight post cannot be recalled.' };
  }
}
export async function stopSchedule({ storage, scheduler }) {
  let persisted = false;
  try {
    for (let tries = 0; tries < 8; tries++) {
      const raw = await storage.get(SCHEDULE_KEY);
      // Stop can replace malformed state safely; it cannot enable anything.
      if (await storage.compareAndSet(SCHEDULE_KEY, raw, JSON.stringify(paused())) === true) { persisted = true; break; }
    }
    if (!persisted) return { status: 'stop-uncertain', reason: 'Could not confirm the persistent stop; disable feed checks in installation settings.' };
    const jobs = await scheduler.listJobs();
    let failed = 0;
    for (const job of jobs) if (job.name === JOB_NAME) {
      const latest = await inspectSchedule({ storage });
      // A later Start has its own generation. Stop's cleanup must never cancel it.
      if (latest.state === 'unknown') return { status: 'stop-uncertain', reason: 'Schedule state could not be rechecked during cleanup.' };
      if (['starting', 'active'].includes(latest.state) && job.data?.token === latest.token) continue;
      try { await scheduler.cancelJob(job.id); } catch { failed++; }
    }
    const latest = await inspectSchedule({ storage });
    if (latest.state !== 'paused') return { status: 'stop-superseded', reason: 'A newer Start or uncertain state superseded this Stop. Check current status.' };
    return { status: failed ? 'stopped-cancellation-pending' : 'stopped', reason: 'Callbacks are blocked. A submission already in flight cannot be recalled.' };
  } catch {
    return { status: persisted ? 'stopped-cancellation-pending' : 'stop-uncertain',
      reason: persisted ? 'Persistent stop confirmed; scheduler cleanup remains uncertain.' : 'Disable feed checks in installation settings; persistent stop could not be confirmed.' };
  }
}
