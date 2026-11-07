import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../reddit-bot/storage.mjs';

// This model implements WATCH conflicts; the bundled SDK Redis mock does not.
// It proves adapter behavior, not the hosted Redis service's wire contract.
function redisModel({ initial, missing, reply = ['OK'], fail = {}, beforeExec, afterRead } = {}) {
  const values = new Map(Object.entries(initial ?? {}));
  const versions = new Map();
  const calls = [];
  const put = (key, value) => {
    values.set(key, value);
    versions.set(key, (versions.get(key) ?? 0) + 1);
  };
  const check = name => { if (fail[name]) throw fail[name]; };
  const redis = {
    async get(key) {
      calls.push(['get', key]);
      check('get');
      const result = values.has(key) ? values.get(key) : missing;
      if (afterRead) await afterRead();
      return result;
    },
    async set(key, value, options) {
      calls.push(['set', key, value, options]);
      if (options?.nx && values.has(key)) return '';
      put(key, value);
      return 'OK';
    },
    async watch(key) {
      calls.push(['watch', key]);
      check('watch');
      const version = versions.get(key) ?? 0;
      let queued;
      return {
        async get() { throw new Error('tx.get must not be used as a read'); },
        async multi() { calls.push(['multi']); check('multi'); },
        async set(setKey, value) {
          calls.push(['tx.set', setKey, value]);
          check('queue');
          queued = [setKey, value];
        },
        async exec() {
          calls.push(['exec']);
          if (beforeExec) await beforeExec({ put, values });
          check('exec');
          if ((versions.get(key) ?? 0) !== version) return null;
          put(...queued);
          check('afterCommit');
          return reply;
        },
        async unwatch() { calls.push(['unwatch']); check('unwatch'); },
        async discard() { calls.push(['discard']); check('discard'); }
      };
    }
  };
  return { redis, values, calls, put };
}

test('storage normalizes missing null and undefined without losing empty strings', async () => {
  for (const missing of [undefined, null]) {
    const model = redisModel({ missing });
    const store = createStorage(model.redis);
    assert.equal(await store.get('missing'), undefined);
    assert.equal(await store.compareAndSet('missing', undefined, ''), true);
    assert.equal(await store.get('missing'), '');
    assert.equal(await store.compareAndSet('missing', null, 'wrong'), false);
  }
});

test('CAS watches, reads normally, queues and confirms exactly one SET', async () => {
  const model = redisModel({ initial: { state: 'before' } });
  assert.equal(await createStorage(model.redis).compareAndSet('state', 'before', 'after'), true);
  assert.deepEqual(model.calls, [['watch', 'state'], ['get', 'state'], ['multi'],
    ['tx.set', 'state', 'after'], ['exec']]);
  assert.equal(model.values.get('state'), 'after');
});

test('CAS mismatch unwatches without queuing a write', async () => {
  const model = redisModel({ initial: { state: 'newer' } });
  assert.equal(await createStorage(model.redis).compareAndSet('state', 'older', 'wrong'), false);
  assert.deepEqual(model.calls, [['watch', 'state'], ['get', 'state'], ['unwatch']]);
  assert.equal(model.values.get('state'), 'newer');
});

test('a watched-key change aborts without overwriting the winner', async () => {
  const model = redisModel({ beforeExec: ({ put }) => put('state', 'winner') });
  assert.equal(await createStorage(model.redis).compareAndSet('state', null, 'loser'), false);
  assert.equal(model.values.get('state'), 'winner');
  assert.equal(model.calls.filter(([name]) => name === 'exec').length, 1);
});

test('concurrent adapter instances cannot both acquire the same state', async () => {
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  let reads = 0;
  const model = redisModel({ afterRead: async () => { if (++reads === 2) release(); await barrier; } });
  const first = createStorage(model.redis);
  const second = createStorage(model.redis);
  const results = await Promise.all([
    first.compareAndSet('state', null, 'first'), second.compareAndSet('state', null, 'second')
  ]);
  assert.deepEqual(results.sort(), [false, true]);
  assert.ok(['first', 'second'].includes(model.values.get('state')));
});

test('same key in separate installation stores does not share state', async () => {
  const first = redisModel();
  const second = redisModel();
  assert.deepEqual(await Promise.all([
    createStorage(first.redis).compareAndSet('state', null, 'a'),
    createStorage(second.redis).compareAndSet('state', null, 'b')
  ]), [true, true]);
});

test('unknown EXEC replies throw even if the write committed', async () => {
  for (const reply of [[], [null], ['QUEUED'], ['OK', 'OK'], undefined, false, 'OK']) {
    const model = redisModel({ reply });
    // The default parameter only applies to omitted/undefined values.
    if (reply === undefined) {
      const originalWatch = model.redis.watch.bind(model.redis);
      model.redis.watch = async key => {
        const tx = await originalWatch(key);
        const exec = tx.exec.bind(tx);
        tx.exec = async () => { await exec(); return undefined; };
        return tx;
      };
    }
    await assert.rejects(createStorage(model.redis).compareAndSet('state', null, 'committed'), /uncertain/);
    assert.equal(model.values.get('state'), 'committed');
    assert.equal(model.calls.filter(([name]) => name === 'exec').length, 1);
  }
});

test('lost EXEC acknowledgement preserves uncertainty and never retries', async () => {
  const original = new Error('reply lost after commit');
  const model = redisModel({ fail: { afterCommit: original, discard: new Error('already closed') } });
  await assert.rejects(createStorage(model.redis).compareAndSet('state', null, 'committed'), error => error === original);
  assert.equal(model.values.get('state'), 'committed');
  assert.deepEqual(model.calls.at(-1), ['discard']);
  assert.equal(model.calls.filter(([name]) => name === 'exec').length, 1);
});

test('read, MULTI, queue and EXEC failures release transactions and preserve original errors', async () => {
  for (const stage of ['get', 'multi', 'queue', 'exec']) {
    const original = new Error(stage);
    const cleanup = stage === 'get' ? 'unwatch' : 'discard';
    const model = redisModel({ fail: { [stage]: original, [cleanup]: new Error('cleanup failed') } });
    await assert.rejects(createStorage(model.redis).compareAndSet('state', null, 'wrong'), error => error === original);
    assert.deepEqual(model.calls.at(-1), [cleanup]);
    assert.equal(model.values.has('state'), false);
  }
});

test('cleanup failure on an ordinary mismatch is surfaced once', async () => {
  const failure = new Error('unwatch failed');
  const model = redisModel({ initial: { state: 'other' }, fail: { unwatch: failure } });
  await assert.rejects(createStorage(model.redis).compareAndSet('state', null, 'wrong'), error => error === failure);
  assert.equal(model.calls.filter(([name]) => name === 'unwatch').length, 1);
});

test('WATCH failure has no unsafe fallback or retry', async () => {
  const original = new Error('watch unavailable');
  const model = redisModel({ fail: { watch: original } });
  await assert.rejects(createStorage(model.redis).compareAndSet('state', null, 'wrong'), error => error === original);
  assert.deepEqual(model.calls, [['watch', 'state']]);
  assert.throws(() => createStorage({ get() {}, set() {} }), /WATCH/);
});

test('invalid values fail before queuing writes', async () => {
  const model = redisModel({ initial: { state: 42 } });
  const store = createStorage(model.redis);
  await assert.rejects(store.get('state'), /non-string/);
  await assert.rejects(store.compareAndSet('state', null, 'wrong'), /non-string/);
  await assert.rejects(store.compareAndSet('', null, 'wrong'), /key/);
  await assert.rejects(store.compareAndSet('state', {}, 'wrong'), /non-string/);
  await assert.rejects(store.compareAndSet('state', null, {}), /strings/);
  assert.equal(model.calls.some(([name]) => name === 'multi'), false);
});

test('legacy SET forwards NX without presenting it as CAS', async () => {
  const model = redisModel();
  const store = createStorage(model.redis);
  assert.equal(await store.set('legacy', 'first', { nx: true }), 'OK');
  assert.equal(await store.set('legacy', 'second', { nx: true }), '');
  assert.equal(await store.get('legacy'), 'first');
});

let TxClient;
let runWithContext;
try {
  ({ TxClient } = await import('../reddit-bot/node_modules/@devvit/redis/RedisClient.js'));
  ({ runWithContext } = await import('../reddit-bot/node_modules/@devvit/server/context.js'));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

test('installed SDK wire decoding accepts OK and rejects ambiguous empty/nil EXEC replies',
  { skip: !TxClient && 'Install reddit-bot dependencies for the pinned SDK wire check' }, async () => {
    for (const response of [[{ str: 'OK' }], [], [{ nil: {} }]]) {
      const calls = [];
      const metadata = {};
      const plugin = {
        async Multi(id) { calls.push(['Multi', id.id]); },
        async Set(request) { calls.push(['Set', request]); },
        async Exec(id) { calls.push(['Exec', id.id]); return { response }; },
        async Unwatch() { throw new Error('unexpected Unwatch'); },
        async Discard() { throw new Error('unexpected Discard'); }
      };
      const store = createStorage({
        async watch(key) { calls.push(['Watch', key]); return new TxClient(plugin, { id: 'tx-one' }, metadata); },
        async get(key) { calls.push(['Get', key]); return null; },
        async set() { throw new Error('unsafe direct SET'); }
      });
      await runWithContext({ metadata }, async () => {
        if (response[0]?.str === 'OK') assert.equal(await store.compareAndSet('state', null, 'next'), true);
        else await assert.rejects(store.compareAndSet('state', null, 'next'), /uncertain/);
      });
      assert.deepEqual(calls.map(([name]) => name), ['Watch', 'Get', 'Multi', 'Set', 'Exec']);
      assert.equal(calls[3][1].transactionId.id, 'tx-one');
      assert.equal(calls[3][1].key, 'state');
      assert.equal(calls[3][1].value, 'next');
    }
  });
