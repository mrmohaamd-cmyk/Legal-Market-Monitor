import { context, createServer, getServerPort, reddit, redis, scheduler, settings } from '@devvit/web/server';
import type { IncomingMessage } from 'node:http';
import { previewInstallation, previewMessage, runLog } from '../runtime.mjs';
import { createStorage } from '../storage.mjs';
import { createRedditAdapters } from '../reddit-adapters.mjs';
import { createOperations } from '../operations.mjs';
import { readPublishedFeed } from '../transport.mjs';
import { RELEASE_POLICY } from '../release-policy.mjs';
import { sendJson } from './http.mjs';
import { dispatchInfoMenu } from './menu-info.mjs';

const { allowed, authorizeModerator, getAppAuthorId, fetchPost, submitVerified, deleteOwnedPost } = createRedditAdapters({ reddit, getContext: () => context });
const operations = createOperations({ policy: RELEASE_POLICY, getContext: () => context, authorizeModerator,
  getSetting: (name: string) => settings.get(name), storage: createStorage(redis), scheduler,
  readFeed: readPublishedFeed, submitVerified, fetchPost, deleteOwnedPost, getAppAuthorId });

const menuActions = new Set(['status', 'initialize', 'publish', 'start', 'stop', 'private-test', 'reconcile', 'remove', 'cancel-reservation']);
const forms = new Set(['jobsStatus', 'jobsInitialize', 'jobsPublish', 'jobsStart', 'jobsPrivateTest', 'jobsReconcile', 'jobsRemove', 'jobsCancelReservation']);
async function readJson(req: IncomingMessage, limit = 8192): Promise<Record<string, any>> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > limit) throw new Error('Request too large'); chunks.push(bytes); }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request');
  return body;
}

// No public endpoint, startup post, install trigger, or automatic cron is registered.
createServer(async (req, res) => {
  if (dispatchInfoMenu(req, res, context.subredditName)) return;
  if (req.method !== 'POST' || !allowed()) { sendJson(res, 404, { error: 'Not found' }); return; }
  try {
    if (req.url === '/internal/menu/preview-jobs') {
      if (!await authorizeModerator()) { sendJson(res, 403, { showToast: 'Moderator post permission is required.' }); return; }
      const result = await previewInstallation({ subredditName: context.subredditName, getSetting: (name: string) => settings.get(name) });
      console.log(JSON.stringify(runLog(result, true)));
      sendJson(res, 200, { showToast: previewMessage(result) }); return;
    }
    const menu = req.url?.startsWith('/internal/menu/jobs-') ? req.url.slice('/internal/menu/jobs-'.length) : '';
    if (menuActions.has(menu)) { sendJson(res, 200, await operations.menu(menu)); return; }
    const form = req.url?.startsWith('/internal/form/') ? req.url.slice('/internal/form/'.length) : '';
    if (forms.has(form)) { sendJson(res, 200, await operations.form(form, await readJson(req))); return; }
    if (req.url === '/internal/scheduler/check-jobs') {
      const event = await readJson(req); const result = await operations.scheduled(event.data);
      console.log(JSON.stringify(runLog(result))); sendJson(res, 200, { status: 'ok', result: result.status }); return;
    }
    if (req.url === '/internal/triggers/post-delete') {
      const result = await operations.deleted(await readJson(req, 131072));
      // Temporary failure is retriable for idempotent cleanup, never for posting.
      sendJson(res, ['storage-uncertain', 'contention'].includes(result.status) ? 503 : 200, { result: result.status }); return;
    }
    sendJson(res, 404, { error: 'Not found' });
  } catch {
    sendJson(res, req.url === '/internal/triggers/post-delete' ? 503 : 400,
      { error: 'Request could not be processed safely. No automatic posting retry.' });
  }
}).listen(getServerPort());
