import { sendJson } from './http.mjs';

// These destinations are fixed release-policy links, never supplied by a request.
const destinations = Object.freeze({
  terms: 'https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-terms.md',
  privacy: 'https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-privacy.md',
  support: 'https://www.reddit.com/message/compose?to=r/SaudiLaw'
});
const actions = Object.freeze({
  '/internal/menu/jobs-about': 'about',
  '/internal/menu/jobs-terms': 'terms',
  '/internal/menu/jobs-privacy': 'privacy',
  '/internal/menu/jobs-support': 'support'
});

/**
 * Information is available even when feed checks are disabled. The community
 * comes only from the trusted Devvit context supplied by the server entry point.
 * @param {string | undefined} subredditName
 * @param {'about' | 'terms' | 'privacy' | 'support'} action
 * @returns {import('@devvit/web/shared').UiResponse}
 */
export function menuInfoResponse(subredditName, action) {
  const community = typeof subredditName === 'string' ? subredditName.toLowerCase() : '';
  if (community !== 'saudilaw' && community !== 'saudilaw_jobs_dev') {
    return { showToast: 'SaudiLaw Jobs information is unavailable in this community.' };
  }
  if (action === 'about') {
    return { showToast: "SaudiLaw Jobs is preview only; it does not publish jobs or accept applications. See Terms, Privacy or Contact moderators." };
  }
  if (!Object.hasOwn(destinations, action)) {
    return { showToast: 'SaudiLaw Jobs information action was not recognized.' };
  }
  // Navigation happens only after the user selects this particular link action.
  return { navigateTo: destinations[action] };
}

/**
 * Handle only the four registered information actions. No settings, request body,
 * feed, Redis, Reddit API, form, or submission callback is involved.
 * @param {{method?: string, url?: string}} request
 * @param {import('node:http').ServerResponse} response
 * @param {string | undefined} subredditName
 * @returns {boolean} Whether this dispatcher handled the request.
 */
export function dispatchInfoMenu(request, response, subredditName) {
  if (typeof request.url !== 'string' || !Object.hasOwn(actions, request.url)) return false;
  if (request.method !== 'POST') {
    sendJson(response, 404, { error: 'Not found' });
    return true;
  }
  sendJson(response, 200, menuInfoResponse(subredditName, actions[request.url]));
  return true;
}
