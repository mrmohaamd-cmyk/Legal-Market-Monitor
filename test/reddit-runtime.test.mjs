import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkInstallation, LIVE_POSTING_ALLOWED } from '../reddit-bot/runtime.mjs';

const fail = () => { throw new Error('Must not be called'); };
test('runtime rejects wrong/missing installation without reading settings or feed', async () => {
  for (const subredditName of [undefined, '', 'menajobs', 'SaudiLaw.evil', ' SaudiLaw']) {
    const result = await checkInstallation({ subredditName, getSetting: fail, readFeed: fail });
    assert.equal(result.status, 'blocked');
  }
});
test('runtime defaults disabled and does not fetch or write', async () => {
  for (const setting of [undefined, null, false, 'true', 1]) {
    const result = await checkInstallation({ subredditName: 'SaudiLaw', getSetting: async () => setting, readFeed: fail });
    assert.equal(result.status, 'disabled');
  }
});
test('runtime settings/retrieval failures are fail closed', async () => {
  for (const options of [{ getSetting: fail }, { getSetting: async () => true, readFeed: fail }]) {
    assert.equal((await checkInstallation({ subredditName: 'SaudiLaw', ...options })).status, 'blocked');
  }
});
test('runtime hard lock prevents live posts even when installation settings request them', async () => {
  assert.equal(LIVE_POSTING_ALLOWED, false);
  const result = await checkInstallation({ subredditName: 'saudilaw',
    getSetting: async name => name === 'enabled',
    readFeed: async () => ({ feed: { generated_at: new Date().toISOString(), verification_window_hours: 168, records: [] } }),
    storage: { get: fail, set: fail }, submit: fail });
  assert.equal(result.status, 'dry-run');
  assert.equal(result.livePostingAllowed, false);
});
test('prepared Devvit config has no automatic trigger, public endpoint, or recurring cron', async () => {
  const config = JSON.parse(await readFile(new URL('../reddit-bot/devvit.json', import.meta.url)));
  assert.equal(config.settings.subreddit.enabled.defaultValue, false);
  assert.equal(config.settings.subreddit.dryRun.defaultValue, true);
  assert.equal(config.triggers, undefined);
  assert.equal(config.server.externalEndpoints, undefined);
  assert.equal(config.permissions.reddit.asUser, undefined);
  assert.deepEqual(config.permissions.http.domains, ['api.github.com']);
  for (const task of Object.values(config.scheduler.tasks)) assert.equal(task.cron, undefined);
});
