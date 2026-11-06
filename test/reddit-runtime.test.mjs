import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkInstallation, previewInstallation, previewMessage, runLog, LIVE_POSTING_ALLOWED } from '../reddit-bot/runtime.mjs';

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
  assert.deepEqual(config.menu.items.map(item => [item.forUserType, item.location, item.endpoint]),
    [['moderator', 'subreddit', '/internal/menu/preview-jobs']]);
});

test('manual moderator preview produces real drafts without any submit or storage capability', async () => {
  const feed = JSON.parse(await readFile(new URL('../dist/opportunities.json', import.meta.url)));
  const result = await previewInstallation({ subredditName: 'SaudiLaw', clock: () => Date.parse(feed.generated_at),
    getSetting: async name => name === 'enabled', readFeed: async () => ({feed}),
    submit: fail, storage: {get: fail, set: fail}, forceDryRun: false });
  assert.equal(result.status, 'dry-run');
  assert.equal(result.previews.length, 3);
  assert.match(previewMessage(result), /3 eligible, 5 excluded/);
  assert.match(previewMessage(result), /No posts or claims created/);
  assert.equal(runLog(result, true).draftTitles.length, 3);
  assert.deepEqual(Object.keys(runLog(result, true).draftTitles[0]), ['id', 'title']);
});

test('operational logs preserve uncertain post receipts and do not include complete drafts', () => {
  const log = runLog({status:'receipt-uncertain', id:'job', postId:'t3_example', reason:'Receipt write failed',
    previews:[{id:'job',title:'Public job title',text:'Full body'}]});
  assert.equal(log.postId, 't3_example');
  assert.equal(log.reason, 'Receipt write failed');
  assert.equal(log.draftTitles, undefined);
  assert.equal(JSON.stringify(log).includes('Full body'), false);
});

test('manual preview reports disabled, invalid and blocked states without claiming success', async () => {
  const disabled = await previewInstallation({subredditName: 'SaudiLaw', getSetting: async () => false, readFeed: fail});
  assert.match(previewMessage(disabled), /disabled/);
  const blocked = await previewInstallation({subredditName: 'unexpected', getSetting: fail, readFeed: fail});
  assert.match(previewMessage(blocked), /blocked/);
  const invalid = await previewInstallation({subredditName: 'SaudiLaw', getSetting: async () => true, readFeed: async () => ({feed:{}})});
  assert.match(previewMessage(invalid), /failed validation/);
});
