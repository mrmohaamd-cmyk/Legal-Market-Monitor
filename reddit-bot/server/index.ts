import { context, createServer, getServerPort, reddit, redis, settings } from '@devvit/web/server';
import type { UiResponse } from '@devvit/web/shared';
import { checkInstallation, previewInstallation, previewMessage, runLog } from '../runtime.mjs';
import { sendJson } from './http.mjs';
import { dispatchInfoMenu } from './menu-info.mjs';

// No public endpoint, startup post, install trigger, or cron is registered.
createServer(async (req, res) => {
  if (dispatchInfoMenu(req, res, context.subredditName)) return;
  const isPreview = req.url === '/internal/menu/preview-jobs';
  if (req.method !== 'POST' || (!isPreview && req.url !== '/internal/scheduler/check-jobs')) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }
  const previewContext = {
    subredditName: context.subredditName,
    getSetting: (name: string) => settings.get(name)
  };
  const result = isPreview ? await previewInstallation(previewContext) : await checkInstallation({
    subredditName: context.subredditName,
    getSetting: (name: string) => settings.get(name),
    storage: {
      get: (key: string) => redis.get(key),
      set: (key: string, value: string, options?: { nx?: boolean }) => redis.set(key, value, options)
    },
    submit: (post: { subredditName: string; title: string; text: string; runAs: 'APP' }) =>
      reddit.submitPost({ ...post, runAs: 'APP', sendreplies: false })
  });
  console.log(JSON.stringify(runLog(result, isPreview)));
  // The registered moderator menu returns feedback, never a post-creation effect.
  const response: UiResponse | { status: 'ok'; result: string } = isPreview
    ? { showToast: previewMessage(result) }
    : { status: 'ok', result: result.status };
  // Terminal safety states are acknowledged; the core controls retries, not HTTP retry loops.
  sendJson(res, 200, response);
}).listen(getServerPort());
