import { runBot } from './lib/core.mjs';
import { readPublishedFeed } from './transport.mjs';

// Deliberate code-review gate. Neither settings nor environment variables bypass it.
// A separate owner-approved change and Reddit integration testing are needed to unlock.
export const LIVE_POSTING_ALLOWED = false;

export async function checkInstallation({ subredditName, getSetting, readFeed = readPublishedFeed, storage, submit }) {
  if (typeof subredditName !== 'string' || subredditName.toLowerCase() !== 'saudilaw') {
    return { status: 'blocked', reason: 'Installation is outside the reviewed community.' };
  }
  try {
    const [enabled, dryRun] = await Promise.all([getSetting('enabled'), getSetting('dryRun')]);
    if (enabled !== true) return { status: 'disabled' };
    const { feed, provenance } = await readFeed();
    const result = await runBot({ feed, enabled: true,
      dryRun: !LIVE_POSTING_ALLOWED || dryRun !== false, subreddit: 'SaudiLaw', storage, submit });
    return { ...result, provenance, livePostingAllowed: LIVE_POSTING_ALLOWED };
  } catch {
    return { status: 'blocked', reason: 'Settings or published feed could not be read safely; no posting.' };
  }
}
