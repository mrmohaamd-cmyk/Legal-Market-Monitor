import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { IncomingMessage, ServerResponse } from 'node:http';
import { once } from 'node:events';
import { Duplex } from 'node:stream';
import { dispatchInfoMenu, menuInfoResponse } from '../reddit-bot/server/menu-info.mjs';

const urls = {
  '/internal/menu/jobs-terms': 'https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-terms.md',
  '/internal/menu/jobs-privacy': 'https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-privacy.md',
  '/internal/menu/jobs-support': 'https://www.reddit.com/message/compose?to=r/SaudiLaw'
};
const endpoints = ['/internal/menu/jobs-about', ...Object.keys(urls)];
const forbidden = () => { throw new Error('Information actions must not access this capability.'); };

async function dispatch(url, subredditName, method = 'POST') {
  const chunks = [];
  const socket = new Duplex({ read() {}, write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
  const request = new IncomingMessage(socket);
  request.url = url;
  request.method = method;
  // A caller-controlled body cannot replace destinations or trusted community context.
  Object.defineProperties(request, {
    body: { get: forbidden }, settings: { get: forbidden }, feed: { get: forbidden },
    redis: { get: forbidden }, reddit: { get: forbidden }
  });
  const response = new ServerResponse(request);
  response.assignSocket(socket);
  const finished = once(response, 'finish');
  assert.equal(dispatchInfoMenu(request, response, subredditName), true);
  await finished;
  const wire = Buffer.concat(chunks);
  socket.destroy();
  const split = wire.indexOf('\r\n\r\n');
  const headers = wire.subarray(0, split).toString('ascii');
  const body = wire.subarray(split + 4);
  assert.match(headers, new RegExp(`\\r\\ncontent-length: ${body.length}\\r\\n`, 'i'));
  return {status: Number(headers.split(' ')[1]), value: JSON.parse(body.toString('utf8'))};
}

test('information menu is available to users while the preview action remains moderator-only', async () => {
  const config = JSON.parse(await readFile(new URL('../reddit-bot/devvit.json', import.meta.url)));
  const items = config.menu.items.filter(item => endpoints.includes(item.endpoint));
  assert.deepEqual(items.map(item => item.endpoint).sort(), [...endpoints].sort());
  for (const item of items) {
    assert.equal(item.forUserType, 'user'); assert.equal(item.location, 'subreddit');
    assert.match(item.label, /^SaudiLaw Jobs: /);
  }
  for (const item of config.menu.items.filter(item => !endpoints.includes(item.endpoint))) assert.equal(item.forUserType, 'moderator');
  assert.equal(config.menu.items.find(item => item.endpoint === '/internal/menu/preview-jobs').forUserType, 'moderator');
  assert.equal(config.settings.subreddit.enabled.defaultValue, false);
  assert.equal(config.settings.subreddit.dryRun.defaultValue, true);
  assert.equal(config.settings.subreddit.privateTestEnabled.defaultValue, false);
});

test('About displays preview-only information without navigation, forms, or settings access', async () => {
  for (const community of ['SaudiLaw', 'saudilaw_jobs_dev', 'SAUDILAW']) {
    const result = await dispatch('/internal/menu/jobs-about', community);
    assert.equal(result.status, 200);
    assert.deepEqual(Object.keys(result.value), ['showToast']);
    assert.match(result.value.showToast, /preview only/);
    assert.match(result.value.showToast, /does not publish jobs or accept applications/);
    assert.match(result.value.showToast, /Terms, Privacy or Contact moderators/);
  }
});

test('each explicitly selected link action navigates only to its fixed destination', async () => {
  for (const community of ['SaudiLaw', 'saudilaw_jobs_dev']) {
    for (const [endpoint, url] of Object.entries(urls)) {
      const result = await dispatch(endpoint, community);
      assert.equal(result.status, 200);
      assert.deepEqual(result.value, {navigateTo: url});
    }
  }
});

test('missing, unrelated, and lookalike communities cannot obtain navigation effects', async () => {
  for (const community of [undefined, null, '', 'menajobs', 'saudilaw_jobs_dev_extra', 'saudilaw.evil', ' SaudiLaw', 'SaudiLaw ']) {
    for (const endpoint of endpoints) {
      const result = await dispatch(endpoint, community);
      assert.equal(result.status, 200);
      assert.deepEqual(Object.keys(result.value), ['showToast']);
      assert.match(result.value.showToast, /unavailable in this community/);
    }
  }
});

test('information routes require POST and do not treat query or path input as a destination', async () => {
  for (const method of ['GET', 'PUT', 'DELETE']) {
    for (const endpoint of endpoints) {
      assert.deepEqual(await dispatch(endpoint, 'SaudiLaw', method), {status: 404, value: {error: 'Not found'}});
    }
  }
  const response = new Proxy({}, {get: forbidden});
  for (const endpoint of [undefined, '/internal/menu/jobs-terms?url=https://evil.example', '/internal/menu/jobs-support/extra',
    '/internal/menu/preview-jobs', '/internal/scheduler/check-jobs', 'https://evil.example', '__proto__']) {
    assert.equal(dispatchInfoMenu({method: 'POST', url: endpoint}, response, 'SaudiLaw'), false);
  }
  assert.deepEqual(Object.keys(menuInfoResponse('SaudiLaw', 'https://evil.example')), ['showToast']);
});
