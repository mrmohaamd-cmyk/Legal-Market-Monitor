import { createHash } from 'node:crypto';

// Main is this repository's reviewed publication boundary. No draft branch, arbitrary
// URL, GitHub credential, redirect, or per-record "published" flag is accepted.
export const FEED_API = 'https://api.github.com/repos/mrmohaamd-cmyk/Legal-Market-Monitor/contents/dist/opportunities.json?ref=main';
const MAX_JSON_BYTES = 2_000_000;
const MAX_FEED_BYTES = 1_000_000;

export async function readPublishedFeed(fetcher = fetch) {
  const response = await fetcher(FEED_API, {
    redirect: 'manual', signal: AbortSignal.timeout(20_000),
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'SaudiLaw-Jobs-Prototype/0.1' }
  });
  if (response.status !== 200 || response.redirected || response.url !== FEED_API) {
    throw new Error('Published feed request failed or changed destination; no posting.');
  }
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) {
    throw new Error('Expected GitHub contents JSON; no posting.');
  }
  if (Number(response.headers.get('content-length')) > MAX_JSON_BYTES || !response.body) {
    throw new Error('Feed response absent or too large.');
  }
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) throw new Error('Feed response exceeds byte limit.');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (envelope.type !== 'file' || envelope.path !== 'dist/opportunities.json' ||
      envelope.encoding !== 'base64' || !/^[a-f0-9]{40}$/.test(envelope.sha ?? '') ||
      !Number.isSafeInteger(envelope.size) || envelope.size < 1 || envelope.size > MAX_FEED_BYTES ||
      typeof envelope.content !== 'string') {
    throw new Error('Invalid published feed envelope.');
  }
  const encoded = envelope.content.replace(/\n/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error('Invalid base64 feed content.');
  }
  const bytes = Buffer.from(encoded, 'base64');
  const blobSha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (bytes.length !== envelope.size || blobSha !== envelope.sha || bytes.toString('base64') !== encoded) {
    throw new Error('Feed blob identity or size mismatch.');
  }
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return {
    feed: JSON.parse(source),
    provenance: { api: FEED_API, branch: 'main', blobSha, retrievedAt: new Date().toISOString() }
  };
}
