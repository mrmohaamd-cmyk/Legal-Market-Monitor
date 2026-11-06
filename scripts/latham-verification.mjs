// Read-only checks of two audited employer-provided iCIMS application journeys.
import {createHash} from 'node:crypto';
import {readHtml, find, textOf} from './html-evidence.mjs';

const origin = 'https://eume-earlyassociatecareers-lw.icims.com';
const rules = {
  'latham-riyadh-graduate-coop': {
    id:'11016', slug:'general-opportunity%3A-graduate-training-program-%28coop%29---riyadh',
    title:'General Opportunity: Graduate Training Program (COOP) - Riyadh',
    descriptionHash:'699b9e17ba9ce6b215e9fe84a73435d0a1e8a03ee8efa4856424d71f9bbf7435'
  },
  'latham-riyadh-trainee-associate': {
    id:'11015', slug:'general-opportunity%3A-trainee-associate---riyadh',
    title:'General Opportunity: Trainee Associate - Riyadh',
    descriptionHash:'af96a8d65ed97bbeff1010007e54f45171b3ee3186b03145d02e8e7c007adf2e'
  }
};
const hasClass = (node, name) => (node.attrs.class || '').split(/\s+/).includes(name);
const hash = value => createHash('sha256').update(value).digest('hex');
export const supportsLatham = record => Object.hasOwn(rules, record.id);
const enabled = node => {
  for (let ancestor = node; ancestor; ancestor = ancestor.parent) {
    if (ancestor.hidden || 'disabled' in ancestor.attrs || 'inert' in ancestor.attrs ||
        ancestor.attrs['aria-disabled'] === 'true' || hasClass(ancestor,'disabled')) return false;
  }
  return !('readonly' in node.attrs);
};

function allowedUrl(value, rule, page, params, base = origin) {
  try {
    const url = new URL(value, base);
    if (url.origin !== origin || url.username || url.password || url.port || url.hash) return null;
    if (decodeURIComponent(url.pathname) !== decodeURIComponent(`/jobs/${rule.id}/${rule.slug}/${page}`)) return null;
    const entries = [...url.searchParams];
    if (entries.length !== Object.keys(params).length) return null;
    if (!entries.every(([key, val]) => Object.hasOwn(params, key) && url.searchParams.getAll(key).length === 1 &&
      (params[key] instanceof RegExp ? params[key].test(val) : params[key] === val))) return null;
    return url.href;
  } catch { return null; }
}

function responseIssue(response, expectedUrl) {
  if (!response || response.error) return response?.error || 'No response';
  if (response.status !== 200) return `HTTP ${response.status}`;
  if (!/text\/html/i.test(response.contentType || '') || typeof response.body !== 'string') return 'Expected HTML was not returned';
  if (response.url !== expectedUrl) return 'An unrequested redirect was followed';
  return null;
}

// Isolated tests can use synthetic description fixtures. The production export
// below is already bound to the audited hashes and accepts no hash override.
export function createLathamReviewer({descriptionHashes = {}} = {}) {
const approvedHashes = Object.fromEntries(Object.entries(rules).map(([id,rule]) => [id, descriptionHashes[id] ?? rule.descriptionHash]));
return async function reviewLatham(record, {sourceResponse, retrieve, now = Date.now()}) {
  const evidence = [];
  const pending = reason => ({outcome:'verification_pending', result:'unverified', reason, evidence});
  const noteResponse = (url, response) => evidence.push({
    request_url:url, final_url:response?.url ?? null, status:response?.status ?? null,
    body_sha256:response?.body_sha256 ?? (typeof response?.body === 'string' ? hash(response.body) : null),
    body_bytes:response?.body_bytes ?? (typeof response?.body === 'string' ? Buffer.byteLength(response.body) : null),
    ...(response?.error ? {error:response.error} : {})
  });
  const get = async url => {
    try { const response = await retrieve(url); noteResponse(url,response); return response; }
    catch (error) { const response = {error:`Request failed (${error.name})`}; noteResponse(url,response); return response; }
  };
  const rule = rules[record.id];
  if (!rule || !Number.isFinite(now)) return pending('Unknown Latham record or invalid check time.');
  if (record.record_kind !== 'recruitment_route' || record.application_url !== null ||
      record.source_url !== `${origin}/jobs/${rule.id}/${rule.slug}/job`) return pending('Latham destination or recruitment-route classification changed; editorial review is required.');
  noteResponse(record.source_url, sourceResponse);
  let problem = responseIssue(sourceResponse, record.source_url);
  if (problem) return pending(`Latham source wrapper: ${problem}.`);
  const wrapper = readHtml(sourceResponse.body);
  const frames = find(wrapper, node => node.tag === 'iframe' && node.attrs.id === 'noscript_icims_content_iframe');
  if (frames.length !== 1) return pending('The employer-provided public iCIMS iframe was absent or ambiguous.');
  const frameUrl = allowedUrl(frames[0].attrs.src, rule, 'job', {in_iframe:'1'});
  if (!frameUrl) return pending('The employer iframe changed origin, role or parameters.');
  const job = await get(frameUrl);
  problem = responseIssue(job, frameUrl);
  if (problem) return pending(`Latham role page: ${problem}.`);
  const jobDoc = readHtml(job.body);
  const headings = find(jobDoc, node => node.tag === 'h1' && hasClass(node,'iCIMS_Header') && textOf(node) === rule.title);
  const locations = find(jobDoc, node => node.tag === 'div' && hasClass(node,'header') && hasClass(node,'left') && textOf(node) === 'Job Locations | SA-Riyadh');
  if (headings.length !== 1 || locations.length !== 1) return pending('Exact role title and Saudi location were not found together.');
  // Freeze the reviewed role facts, including eligibility/other-information sections.
  // A changed description needs editorial review; an Apply link cannot certify it.
  const descriptions = find(jobDoc, node => node.tag === 'div' && hasClass(node,'iCIMS_InfoMsg_Job')).map(textOf);
  if (descriptions.length !== 5 || hash(JSON.stringify(descriptions)) !== approvedHashes[record.id]) return pending('Latham role description changed from the reviewed first-party evidence; no verification timestamp was renewed.');
  const unavailable = /no longer (?:available|accepting applications)|(?:job|position|vacancy) (?:has been |is )?(?:closed|filled|expired)|(?:job|position) has expired|applications (?:are closed|have closed)|not accepting applications/i;
  if (unavailable.test(textOf(jobDoc))) return pending('The role page contains an availability warning requiring review.');
  const apply = find(jobDoc, node => node.tag === 'a' && hasClass(node,'iCIMS_ApplyOnlineButton') && node.attrs.title === 'Apply');
  if (apply.length !== 1 || !enabled(apply[0])) return pending('The role-specific Apply action was absent, disabled or ambiguous.');
  const applyUrl = allowedUrl(apply[0].attrs.href, rule, 'job', {mode:'apply', apply:'yes', in_iframe:'1', hashed:/^-?\d+$/});
  if (!applyUrl) return pending('The discovered Apply action changed origin, role or parameters.');
  // GET only. The only allowed redirect is the same-role public login entry.
  let login = await get(applyUrl);
  let loginUrl;
  if ([301,302,303,307,308].includes(login.status)) {
    loginUrl = allowedUrl(login.location, rule, 'login', {in_iframe:'1'}, applyUrl);
    if (!loginUrl || login.url !== applyUrl) return pending('The Apply redirect did not lead to the expected same-role login entry.');
    login = await get(loginUrl);
  } else {
    // Fetch must not silently follow redirects: it would conceal intervening hosts.
    return pending(`The Apply step returned HTTP ${login.status ?? 'unknown'} instead of the audited same-role redirect.`);
  }
  problem = responseIssue(login, loginUrl);
  if (problem) return pending(`Latham public login entry: ${problem}.`);
  const loginDoc = readHtml(login.body);
  if (unavailable.test(textOf(loginDoc))) return pending('The application entry contains an availability warning requiring review.');
  const forms = find(loginDoc, node => node.tag === 'form' && node.attrs.id === 'enterEmailForm' && hasClass(node,'iCIMS_SignIn') && node.attrs.method?.toLowerCase() === 'post');
  if (forms.length !== 1 || !allowedUrl(forms[0].attrs.action,rule,'login',{step:'email',in_iframe:'1',hashed:/^-?\d+$/},loginUrl)) return pending('The public email form is not bound to the expected role.');
  const emails = find(forms[0], node => node.tag === 'input' && node.attrs.type === 'email' && node.attrs.id === 'email' && node.attrs.name === 'css_loginName' && enabled(node));
  const submits = find(forms[0], node => node.tag === 'input' && node.attrs.type === 'submit' && node.attrs.id === 'enterEmailSubmitButton' && enabled(node));
  if (emails.length !== 1 || submits.length !== 1 || !/Enter your email to see if you have a Latham & Watkins profile/.test(textOf(loginDoc))) return pending('The public email/profile entry controls were not available.');
  return {outcome:'verified',result:'login_required',evidence,
    reason:`Latham requisition ${rule.id} retains its reviewed general-recruitment description and Riyadh location. Its employer-provided iframe and exact Apply action reach a same-role public email/profile form. This verifies route availability, not immediate headcount. No login, consent, profile creation or application submission was performed.`};
};
}
export const reviewLatham = createLathamReviewer();
