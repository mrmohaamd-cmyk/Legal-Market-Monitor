import { context, createServer, getServerPort, reddit, redis, settings } from '@devvit/web/server';
import { checkInstallation } from '../runtime.mjs';

// No public endpoint, startup post, install trigger, or cron is registered.
createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.method !== 'POST' || req.url !== '/internal/scheduler/check-jobs') {
    res.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  const result = await checkInstallation({
    subredditName: context.subredditName,
    getSetting: (name: string) => settings.get(name),
    storage: {
      get: (key: string) => redis.get(key),
      set: (key: string, value: string, options?: { nx?: boolean }) => redis.set(key, value, options)
    },
    submit: (post: { subredditName: string; title: string; text: string; runAs: 'APP' }) =>
      reddit.submitPost({ ...post, runAs: 'APP', sendreplies: false })
  });
  const report = 'report' in result ? result.report : undefined;
  console.log(JSON.stringify({ status: result.status,
    id: 'id' in result ? result.id : undefined,
    postId: 'postId' in result ? result.postId : undefined,
    reason: 'reason' in result ? result.reason : undefined,
    candidateCount: report?.candidates.length,
    skipped: report?.skipped, errors: report?.errors,
    provenance: 'provenance' in result ? result.provenance : undefined }));
  // Terminal safety states are acknowledged; the core controls retries, not HTTP retry loops.
  res.writeHead(200).end(JSON.stringify({ status: 'ok', result: result.status }));
}).listen(getServerPort());
