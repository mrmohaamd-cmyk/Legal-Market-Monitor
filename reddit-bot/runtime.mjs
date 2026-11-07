import { runBot } from './lib/core.mjs';
import { readPublishedFeed } from './transport.mjs';
import { RELEASE_POLICY } from './release-policy.mjs';

// Deliberate code-review gate. Neither settings nor environment variables bypass it.
// A separate owner-approved change and Reddit integration testing are needed to unlock.
export const LIVE_POSTING_ALLOWED = RELEASE_POLICY.productionPosting;

export async function checkInstallation({ subredditName, getSetting, readFeed = readPublishedFeed, storage, submit, forceDryRun = false, clock = Date.now }) {
  const forcedPreview = forceDryRun === true;
  const community = typeof subredditName === 'string' ? subredditName.toLowerCase() : '';
  // The private development installation can only preview. Scheduled checks retain
  // the production-community restriction even while the separate posting lock is on.
  const privatePreview = forcedPreview && community === 'saudilaw_jobs_dev';
  if (community !== 'saudilaw' && !privatePreview) {
    return { status: 'blocked', reason: 'Installation is outside the reviewed community.' };
  }
  try {
    const [enabled, dryRun] = await Promise.all([getSetting('enabled'), getSetting('dryRun')]);
    if (enabled !== true) return { status: 'disabled' };
    const { feed, provenance } = await readFeed();
    const result = await runBot({ feed, enabled: true, now: clock(), clock,
      dryRun: forcedPreview || !LIVE_POSTING_ALLOWED || dryRun !== false, subreddit: 'SaudiLaw',
      // Forced previews never receive write capabilities, including direct calls.
      ...(forcedPreview ? {} : { storage, submit }) });
    return { ...result, provenance, livePostingAllowed: LIVE_POSTING_ALLOWED };
  } catch {
    return { status: 'blocked', reason: 'Settings or published feed could not be read safely; no posting.' };
  }
}

// The moderator menu never receives a submit/storage adapter, and retains its own
// forced preview gate even if a later approved version unlocks scheduled posting.
export function previewInstallation({ subredditName, getSetting, readFeed = readPublishedFeed, clock = Date.now }) {
  return checkInstallation({ subredditName, getSetting, readFeed, clock, forceDryRun: true });
}

export function previewMessage(result) {
  if (result.status === 'dry-run') return `Preview only: ${result.report.candidates.length} eligible, ${result.report.skipped.length} excluded. No posts or claims created. See app logs for draft titles.`;
  if (result.status === 'disabled') return 'Feed checks are disabled. Enable feed checks in app settings to preview; posting remains locked.';
  if (result.status === 'invalid-feed') return 'Preview stopped: the feed failed validation. No posts or claims created; see app logs.';
  return 'Preview blocked: check installation, settings and feed access. No posts or claims created.';
}

export function runLog(result, preview = false) {
  return { status: result.status, id: result.id, postId: result.postId, reason: result.reason,
    candidateCount: result.report?.candidates.length,
    draftTitles: preview ? result.previews?.map(post => ({ id: post.id, title: post.title })) : undefined,
    skipped: result.report?.skipped, errors: result.report?.errors, provenance: result.provenance };
}
