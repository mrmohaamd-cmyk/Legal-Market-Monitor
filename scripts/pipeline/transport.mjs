import {createHash} from 'node:crypto';
import {isIP} from 'node:net';

const CAPS = {
  maxRequests: 8, maxBytes: 2_000_000, totalBytes: 4_000_000,
  timeoutMs: 15_000, totalMs: 60_000
};
const problem = code => Object.assign(new Error(code), {code});
function exactPublicHttps(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const u = new URL(value);
    const host = u.hostname.replace(/^\[|\]$/g, '');
    return u.href === value && u.protocol === 'https:' &&
      !u.username && !u.password && !u.port && !value.includes('#') &&
      host.includes('.') && !isIP(host) &&
      !/(^|\.)(localhost|local|internal)$/i.test(host);
  } catch { return false; }
}
function cancelQuietly(target) {
  try { Promise.resolve(target?.cancel()).catch(() => {}); } catch {}
}

/**
 * Only pass a code-reviewed static allowlist, never candidate-supplied URLs.
 * HTTPS/host checks do not independently attest employer ownership or DNS.
 * Failure results have no body hash and cannot be used as positive evidence.
 */
export function createTransport({
  allowedUrls, fetchImpl = globalThis.fetch, now = Date.now,
  maxRequests = CAPS.maxRequests, maxBytes = CAPS.maxBytes,
  totalBytes = CAPS.totalBytes, timeoutMs = CAPS.timeoutMs,
  totalMs = CAPS.totalMs
} = {}) {
  if (!Array.isArray(allowedUrls) || !allowedUrls.length ||
      allowedUrls.length > 64 || !allowedUrls.every(exactPublicHttps))
    throw new TypeError('A bounded, exact public HTTPS allowlist is required.');
  if (typeof fetchImpl !== 'function' || typeof now !== 'function')
    throw new TypeError('Invalid transport dependencies.');
  const limits = {maxRequests, maxBytes, totalBytes, timeoutMs, totalMs};
  for (const [key, value] of Object.entries(limits))
    if (!Number.isSafeInteger(value) || value < 1 || value > CAPS[key])
      throw new RangeError(`Invalid ${key}; hard maximum ${CAPS[key]}.`);
  let lastClock = Number(now());
  if (!Number.isFinite(lastClock)) throw new TypeError('Invalid clock.');
  const deadline = lastClock + totalMs;
  const remaining = () => {
    const value = Number(now());
    if (!Number.isFinite(value)) throw problem('clock_error');
    lastClock = Math.max(lastClock, value);
    return deadline - lastClock;
  };
  const allowed = new Set(allowedUrls), cache = new Map(), active = new Set();
  const counters = {requests: 0, bytes: 0, failures: 0, cacheHits: 0};
  const failure = (url, code, response, bytes = 0) => {
    counters.failures++;
    return {
      url, status: response?.status ?? null,
      contentType: response?.headers?.get('content-type') ?? null,
      body: '', body_bytes: bytes, error: code
    };
  };

  async function attempt(url) {
    const controller = new AbortController();
    let response, reader, received = 0, timer, rejectStop;
    const stopped = new Promise((_, reject) => { rejectStop = reject; });
    const cancel = code => {
      if (controller.signal.aborted) return;
      controller.abort();
      rejectStop(problem(code));
      cancelQuietly(reader ?? response?.body);
    };
    active.add(cancel);
    try {
      const left = remaining();
      if (left <= 0) throw problem('run_timeout');
      timer = setTimeout(
        () => cancel(left <= timeoutMs ? 'run_timeout' : 'request_timeout'),
        Math.min(left, timeoutMs)
      );
      const request = Promise.resolve().then(() => fetchImpl(url, {
        method: 'GET', redirect: 'manual', credentials: 'omit',
        referrerPolicy: 'no-referrer', cache: 'no-store',
        headers: {accept: 'text/html', 'user-agent': 'SaudiLaw-Pipeline/0.1'},
        signal: controller.signal
      }));
      // Dispose of a late response even if a defective fetch mock ignores abort.
      request.then(res => {
        if (controller.signal.aborted) cancelQuietly(res?.body);
      }, () => {});
      response = await Promise.race([request, stopped]);
      if (remaining() <= 0) throw problem('run_timeout');
      if (response.url !== url) throw problem('unexpected_destination');
      if (response.status !== 200) throw problem(`http_${response.status}`);
      const type = response.headers?.get('content-type') ?? '';
      if (!/^text\/html(?:\s*;|$)/i.test(type)) throw problem('content_type');
      const length = response.headers?.get('content-length');
      if (length && /^\d+$/.test(length) &&
          (Number(length) > maxBytes ||
           Number(length) > totalBytes - counters.bytes))
        throw problem('declared_body_limit');
      if (!response.body?.getReader) throw problem('missing_body');
      reader = response.body.getReader();
      const chunks = [];
      while (true) {
        if (remaining() <= 0) throw problem('run_timeout');
        const {done, value} = await Promise.race([reader.read(), stopped]);
        if (done) break;
        if (!(value instanceof Uint8Array)) throw problem('invalid_chunk');
        received += value.byteLength;
        counters.bytes += value.byteLength;
        if (counters.bytes > totalBytes) {
          for (const stop of active) stop('aggregate_body_limit');
          throw problem('aggregate_body_limit');
        }
        if (received > maxBytes) throw problem('body_limit');
        chunks.push(value);
      }
      if (remaining() <= 0) throw problem('run_timeout');
      const buffer = Buffer.concat(chunks, received);
      let body;
      try { body = new TextDecoder('utf-8', {fatal: true}).decode(buffer); }
      catch { throw problem('invalid_utf8'); }
      return {
        url, status: 200, contentType: type, body,
        body_sha256: createHash('sha256').update(buffer).digest('hex'),
        body_bytes: received
      };
    } catch (error) {
      return failure(url, error?.code ?? 'transport_error', response, received);
    } finally {
      clearTimeout(timer);
      active.delete(cancel);
      controller.abort();
      cancelQuietly(reader ?? response?.body);
      try { reader?.releaseLock(); } catch {}
    }
  }

  function retrieve(url) {
    if (!exactPublicHttps(url) || !allowed.has(url))
      return Promise.resolve(failure(null, 'url_not_allowed'));
    if (cache.has(url)) {
      counters.cacheHits++;
      return cache.get(url);
    }
    let result;
    try {
      if (remaining() <= 0) result = Promise.resolve(failure(url, 'run_timeout'));
      else if (counters.requests >= maxRequests)
        result = Promise.resolve(failure(url, 'request_budget'));
      else if (counters.bytes >= totalBytes)
        result = Promise.resolve(failure(url, 'aggregate_body_limit'));
      else {
        counters.requests++;
        result = attempt(url);
      }
    } catch (error) {
      result = Promise.resolve(failure(url, error?.code ?? 'transport_error'));
    }
    cache.set(url, result);
    return result;
  }
  Object.defineProperty(retrieve, 'stats', {
    get: () => Object.freeze({...counters, active: active.size, cached: cache.size})
  });
  return retrieve;
}
