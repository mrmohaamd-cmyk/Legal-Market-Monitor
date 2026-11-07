/** Normalize Redis's two missing-key representations without accepting bad data. */
function storedValue(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') throw new TypeError('Redis returned a non-string value');
  return value;
}

function requireKey(key) {
  if (typeof key !== 'string' || key.length === 0) throw new TypeError('A Redis key is required');
}

/**
 * Installation-scoped Devvit Redis adapter. Callers own serialization and retries.
 * A thrown CAS error can mean the write committed: reconcile, never blindly retry.
 */
export function createStorage(redis) {
  if (!redis || ['get', 'set', 'watch'].some(name => typeof redis[name] !== 'function')) {
    throw new TypeError('Storage requires Redis GET, SET and WATCH transactions');
  }

  return {
    async get(key) {
      requireKey(key);
      return storedValue(await redis.get(key));
    },

    // Compatibility only. Read/check/write callers must use compareAndSet.
    async set(key, value, options) {
      requireKey(key);
      if (typeof value !== 'string') throw new TypeError('Redis values must be strings');
      return redis.set(key, value, options);
    },

    async compareAndSet(key, expected, value) {
      requireKey(key);
      const previous = storedValue(expected);
      if (typeof value !== 'string') throw new TypeError('Redis values must be strings');
      let tx;
      let multiAttempted = false;
      let execReturned = false;
      let failed = false;
      try {
        tx = await redis.watch(key);
        // SDK 0.15.2 tx.get() queues a command and returns tx, not the value.
        // WATCH observes changes made between this ordinary GET and EXEC.
        if (storedValue(await redis.get(key)) !== previous) return false;
        multiAttempted = true;
        await tx.multi();
        await tx.set(key, value);
        const result = await tx.exec();
        execReturned = true; // EXEC releases WATCH/MULTI, including an abort.
        if (result === null) return false; // Explicit Redis WATCH abort.
        if (Array.isArray(result) && result.length === 1 && result[0] === 'OK') return true;
        // The SDK's empty result is not a documented, distinguishable abort.
        // Do not convert unknown replies into permission to retry a side effect.
        throw new Error('Redis CAS outcome is uncertain: unexpected EXEC response');
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        if (tx && !execReturned) {
          try {
            if (multiAttempted) await tx.discard();
            else await tx.unwatch();
          } catch (cleanupError) {
            // Preserve the original failure, including a lost EXEC response.
            if (!failed) throw cleanupError;
          }
        }
      }
    }
  };
}
