import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FEED_API, readPublishedFeed } from '../reddit-bot/transport.mjs';

function envelope(value = { records: [] }) {
  const bytes = Buffer.from(JSON.stringify(value));
  return { type: 'file', path: 'dist/opportunities.json', encoding: 'base64', size: bytes.length,
    content: bytes.toString('base64'), sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') };
}
function response(body, { status = 200, url = FEED_API, type = 'application/json' } = {}) {
  const result = new Response(JSON.stringify(body), { status, headers: { 'content-type': type } });
  Object.defineProperty(result, 'url', { value: url });
  return result;
}
test('transport uses only reviewed main and verifies Git blob identity without credentials', async () => {
  const result = await readPublishedFeed(async (url, options) => {
    assert.equal(url, FEED_API);
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.authorization, undefined);
    return response(envelope());
  });
  assert.deepEqual(result.feed, { records: [] });
  assert.equal(result.provenance.branch, 'main');
  assert.match(result.provenance.blobSha, /^[a-f0-9]{40}$/);
});
test('transport rejects redirects, rate limits, non-JSON and substituted destinations', async () => {
  for (const options of [{ status: 302 }, { status: 403 }, { status: 429 },
    { type: 'text/html' }, { url: 'https://evil.example/feed.json' }]) {
    await assert.rejects(readPublishedFeed(async () => response(envelope(), options)));
  }
});
test('transport rejects tampered, malformed, oversized and non-file envelopes', async () => {
  for (const patch of [{ type: 'dir' }, { path: 'draft.json' }, { encoding: 'none' },
    { sha: '0'.repeat(40) }, { size: 1_000_001 }, { size: 1 }, { content: '!!!!' }, { content: 'e30=' }]) {
    await assert.rejects(readPublishedFeed(async () => response({ ...envelope(), ...patch })));
  }
});
test('transport bounds streamed response bytes and propagates retrieval failure', async () => {
  await assert.rejects(readPublishedFeed(async () => response('x'.repeat(2_000_001))), /byte limit/);
  await assert.rejects(readPublishedFeed(async () => { throw new Error('Timeout'); }), /Timeout/);
});
