import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createTransport} from '../scripts/pipeline/transport.mjs';

const A = 'https://careers.example.test/jobs/a';
const B = 'https://careers.example.test/jobs/b';
const bytes = text => new TextEncoder().encode(text);
function reply(url, {
  status = 200, type = 'text/html; charset=utf-8',
  chunks = [bytes('<p>example</p>')], length
} = {}) {
  const headers = new Headers({'content-type': type});
  if (length !== undefined) headers.set('content-length', String(length));
  return {
    url, status, headers,
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      }
    })
  };
}

test('one shared attempt; exact response digest; no auth or redirect', async () => {
  const calls = [];
  const get = createTransport({allowedUrls: [A], fetchImpl: async (...args) => {
    calls.push(args); return reply(A);
  }});
  const first = get(A), concurrent = get(A);
  assert.equal(first, concurrent);
  const result = await first;
  assert.equal(result.body, '<p>example</p>');
  assert.equal(result.body_sha256,
    createHash('sha256').update(result.body).digest('hex'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].redirect, 'manual');
  assert.equal(calls[0][1].credentials, 'omit');
  assert.equal(calls[0][1].method, 'GET');
  assert.equal(calls[0][1].headers.authorization, undefined);
  assert.equal(await get(A), result);
  assert.equal(get.stats.cacheHits, 2);
});

test('reject unsafe allowlists and any unlisted destination', async () => {
  for (const url of [
    'http://careers.example.test/job', 'https://user@careers.example.test/job',
    'https://careers.example.test:443/job', A + '#', 'https://127.0.0.1/job',
    'https://[::1]/job', 'https://localhost/job', ' https://careers.example.test/job'
  ]) assert.throws(() => createTransport({allowedUrls: [url]}));
  let calls = 0;
  const get = createTransport({allowedUrls: [A], fetchImpl: async () => { calls++; }});
  assert.equal((await get(B)).error, 'url_not_allowed');
  assert.equal(calls, 0);
});

test('redirects and access denials are final, cached failures', async () => {
  for (const status of [302, 403, 429]) {
    let calls = 0;
    const get = createTransport({allowedUrls: [A], fetchImpl: async () => {
      calls++; return reply(A, {status});
    }});
    assert.equal((await get(A)).error, `http_${status}`);
    assert.equal((await get(A)).error, `http_${status}`);
    assert.equal(calls, 1);
  }
});

test('unexpected destination, MIME and invalid UTF-8 fail closed', async () => {
  for (const [response, code] of [
    [reply(B), 'unexpected_destination'],
    [reply(A, {type: 'application/json'}), 'content_type'],
    [reply(A, {chunks: [new Uint8Array([0xc3, 0x28])]}), 'invalid_utf8']
  ]) {
    const get = createTransport({allowedUrls: [A], fetchImpl: async () => response});
    const result = await get(A);
    assert.equal(result.error, code);
    assert.equal(result.body, '');
    assert.equal(result.body_sha256, undefined);
  }
});

test('streamed and declared per-response limits reject excess evidence', async () => {
  const get = createTransport({
    allowedUrls: [A], maxBytes: 4,
    fetchImpl: async () => reply(A, {chunks: [bytes('abc'), bytes('def')]})
  });
  assert.equal((await get(A)).error, 'body_limit');
  assert.equal(get.stats.bytes, 6);
  const declared = createTransport({
    allowedUrls: [A], maxBytes: 4,
    fetchImpl: async () => reply(A, {length: 5})
  });
  assert.equal((await declared(A)).error, 'declared_body_limit');
  assert.equal(declared.stats.bytes, 0);
});

test('aggregate budget applies across concurrent requests', async () => {
  const get = createTransport({
    allowedUrls: [A, B], totalBytes: 5,
    fetchImpl: async url => reply(url, {chunks: [bytes('abc')]})
  });
  const results = await Promise.all([get(A), get(B)]);
  assert.ok(results.some(result => result.error === 'aggregate_body_limit'));
  assert.equal(get.stats.requests, 2);
  assert.equal(get.stats.bytes, 6);
});

test('attempt budget and elapsed run budget block further requests', async () => {
  let calls = 0, clock = 100;
  const get = createTransport({
    allowedUrls: [A, B], maxRequests: 1, totalMs: 20, now: () => clock,
    fetchImpl: async url => { calls++; return reply(url); }
  });
  await get(A);
  assert.equal((await get(B)).error, 'request_budget');
  assert.equal(calls, 1);
  const expired = createTransport({
    allowedUrls: [A], totalMs: 20, now: () => clock,
    fetchImpl: async () => { calls++; return reply(A); }
  });
  clock = 121;
  assert.equal((await expired(A)).error, 'run_timeout');
  assert.equal(calls, 1);
});

test('request timeout bounds a fetch that never settles', async () => {
  const get = createTransport({
    allowedUrls: [A], timeoutMs: 5,
    fetchImpl: () => new Promise(() => {})
  });
  assert.equal((await get(A)).error, 'request_timeout');
  assert.equal(get.stats.active, 0);
});

test('timeout covers body consumption and cancels its reader', async () => {
  let cancellations = 0;
  const get = createTransport({
    allowedUrls: [A], timeoutMs: 5,
    fetchImpl: async () => ({
      url: A, status: 200, headers: new Headers({'content-type': 'text/html'}),
      body: {getReader: () => ({
        read: () => new Promise(() => {}),
        cancel: () => { cancellations++; return Promise.resolve(); },
        releaseLock() {}
      })}
    })
  });
  assert.equal((await get(A)).error, 'request_timeout');
  assert.ok(cancellations >= 1);
  assert.equal(get.stats.active, 0);
});

test('retrieval exceptions are cached without leaking exception text', async () => {
  let calls = 0;
  const get = createTransport({allowedUrls: [A], fetchImpl: async () => {
    calls++; throw new Error('private transport detail');
  }});
  const result = await get(A);
  assert.equal(result.error, 'transport_error');
  assert.equal(JSON.stringify(result).includes('private transport detail'), false);
  await get(A);
  assert.equal(calls, 1);
});
