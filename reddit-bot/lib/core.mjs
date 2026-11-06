// No network or Reddit calls here. Only the reviewed publication adapter may supply a feed.
export const VERIFICATION_WINDOW_MS = 168 * 60 * 60 * 1000;
export const REVIEWED_SOURCES = Object.freeze({
  'ao-shearman-winter-2026-coop': {
    firm: 'A&O Shearman', title: 'Co-op Scheme – Winter 2026', location: 'Riyadh, Saudi Arabia',
    source: 'https://careers.aoshearman.com/en/job/riyadh/co-op-scheme-winter-2026/3392/44638109504',
    application: 'https://jobs.aoshearman.com/TGnewUI/Search/home/HomeWithPreLoad?PageType=JobDetails&partnerid=30147&siteid=5040&jobid=98119',
    // Early editorial recheck at the start of the advertised date in Riyadh, NOT an employer closing instant.
    reviewBy: '2026-11-29T21:00:00Z'
  },
  'segal-riyadh-student-intern-2026': {
    firm: 'Segal Law Firm', title: 'Student Intern', location: 'Riyadh, Saudi Arabia',
    source: 'https://www.segal.com.sa/en/careers/jobs/student-intern',
    application: 'https://www.segal.com.sa/en/careers/apply?job=student-intern'
  },
  'white-case-saudi-law-trainee-2027': {
    firm: 'White & Case', title: 'Saudi Law Trainee Program 2027', location: 'Riyadh, Saudi Arabia',
    source: 'https://whitecase.grad.allhires.com/app/', application: 'https://whitecase.grad.allhires.com/app/',
    reviewBy: '2027-01-07T21:00:00Z'
  }
});

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unsafeText = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const string = (value, max = 5000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !unsafeText.test(value);
const list = value => Array.isArray(value) && value.length <= 30 && value.every(item => string(item, 2000));
export function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return NaN;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value.replace(/(?<!\.\d{3})Z$/, '.000Z')) return NaN;
  return time;
}
const fresh = (value, now) => Number.isFinite(timestamp(value)) && timestamp(value) <= now && now - timestamp(value) < VERIFICATION_WINDOW_MS;
const safeURL = value => {
  if (!string(value, 2048) || /[\s<>"`\\]/u.test(value)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash && url.hostname.includes('.'); } catch { return false; }
};
function recordErrors(record, now) {
  if (!object(record)) return ['Record must be an object.'];
  const errors = [];
  if (!string(record.id, 150) || !/^[a-z0-9][a-z0-9-]*$/.test(record.id)) errors.push('Invalid record id.');
  for (const field of ['firm_name', 'role_title', 'location', 'source_domain', 'source_type', 'source_summary', 'eligibility_summary']) if (!string(record[field])) errors.push(`Invalid ${field}.`);
  if (!['advertised_opening', 'recruitment_route'].includes(record.record_kind)) errors.push('Invalid record_kind.');
  if (!['open', 'closed', 'expired', 'verification_pending'].includes(record.status)) errors.push('Invalid status.');
  if (!['verified', 'unverified', 'verification_pending'].includes(record.source_status)) errors.push('Invalid source_status.');
  if (!['confirmed', 'partly_stated', 'unknown'].includes(record.eligibility_state)) errors.push('Invalid eligibility_state.');
  if (!safeURL(record.source_url)) errors.push('Invalid source_url.');
  if (record.application_url !== null && !safeURL(record.application_url)) errors.push('Invalid application_url.');
  if (!list(record.responsibilities) || !list(record.qualifications)) errors.push('Invalid role details or requirements.');
  for (const field of ['offer_summary', 'availability_note', 'deadline_source_text']) if (record[field] != null && !string(record[field])) errors.push(`Invalid ${field}.`);
  for (const field of ['last_verified_at', 'last_reviewed_at']) if (!Number.isFinite(timestamp(record[field])) || timestamp(record[field]) > now) errors.push(`Invalid or future ${field}.`);
  for (const field of ['deadline_at', 'review_due_at']) if (record[field] != null && !Number.isFinite(timestamp(record[field]))) errors.push(`Invalid ${field}.`);
  if (!object(record.application_check) || !Number.isFinite(timestamp(record.application_check.checked_at)) || timestamp(record.application_check.checked_at) > now || !['form_available', 'login_required', 'email_route', 'unverified'].includes(record.application_check.result) || !string(record.application_check.note)) errors.push('Invalid or future application_check.');
  if (record.work_model != null && (!['On-site', 'Hybrid', 'Remote'].includes(record.work_model) || !string(record.work_model_source_text) || record.work_model_source_url !== record.source_url)) errors.push('Work model lacks reviewed source evidence.');
  return errors;
}

export function eligibility(record, {now = Date.now(), registry = REVIEWED_SOURCES} = {}) {
  const reasons = recordErrors(record, now);
  if (!Number.isFinite(now)) reasons.push('Invalid evaluation time.');
  if (reasons.length) return {eligible: false, reasons};
  if (record.record_kind !== 'advertised_opening') reasons.push('Standing recruitment route, not an advertised vacancy.');
  if (record.status !== 'open') reasons.push(`Status is ${record.status}.`);
  if (record.source_status !== 'verified') reasons.push('Source is not verified.');
  if (!fresh(record.last_verified_at, now)) reasons.push('Source verification is due.');
  if (!fresh(record.last_reviewed_at, now)) reasons.push('Editorial review is due.');
  if (!fresh(record.application_check.checked_at, now)) reasons.push('Application evidence is due.');
  if (!['form_available', 'login_required'].includes(record.application_check.result)) reasons.push('Current application entry is not verified.');
  for (const field of ['deadline_at', 'review_due_at']) if (record[field] && timestamp(record[field]) <= now) reasons.push(`${field} has passed; review required.`);
  const rule = Object.hasOwn(registry, record.id) ? registry[record.id] : null;
  if (!rule) reasons.push('No reviewed vacancy/source registry entry.');
  else {
    if (record.firm_name !== rule.firm || record.role_title !== rule.title || record.location !== rule.location) reasons.push('Employer, role or Saudi location differs from reviewed identity.');
    if (record.source_url !== rule.source || record.application_url !== rule.application || !safeURL(rule.source) || !safeURL(rule.application)) reasons.push('Source or application destination differs from reviewed links.');
    if (rule.reviewBy && (!Number.isFinite(timestamp(rule.reviewBy)) || timestamp(rule.reviewBy) <= now)) reasons.push('Registry editorial recheck is due.');
  }
  if (!/\bSaudi Arabia\b/.test(record.location)) reasons.push('Saudi location is not explicit.');
  try { if (new URL(record.source_url).hostname !== record.source_domain) reasons.push('Source domain does not match source URL.'); } catch { reasons.push('Source URL is invalid.'); }
  if (!reasons.length) {
    try { renderPost(record); } catch (error) { reasons.push(error.message); }
  }
  return {eligible: reasons.length === 0, reasons};
}

export function evaluateFeed(feed, {now = Date.now(), registry = REVIEWED_SOURCES} = {}) {
  const errors = [];
  if (!object(feed) || !Number.isFinite(now)) return {valid: false, errors: ['Invalid feed or evaluation time.'], candidates: [], skipped: []};
  if (feed.verification_window_hours !== 168) errors.push('Feed must use the reviewed 168-hour verification window.');
  if (!fresh(feed.generated_at, now)) errors.push('Feed publication timestamp is invalid, future or stale.');
  if (!Array.isArray(feed.records) || feed.records.length > 250) return {valid: false, errors: [...errors, 'Invalid records array or over 250 records.'], candidates: [], skipped: []};
  const ids = new Set();
  for (const record of feed.records) {
    for (const error of recordErrors(record, now)) errors.push(`${record?.id ?? 'unknown'}: ${error}`);
    if (ids.has(record?.id)) errors.push(`Duplicate record id: ${record?.id}.`);
    ids.add(record?.id);
  }
  if (errors.length) return {valid: false, errors, candidates: [], skipped: []};
  const candidates = []; const skipped = [];
  for (const record of feed.records) {
    const check = eligibility(record, {now, registry});
    if (check.eligible) candidates.push(record); else skipped.push({id: record.id, reasons: check.reasons});
  }
  return {valid: true, errors: [], candidates, skipped};
}

// Escape all record prose; only the separately validated destination URLs become links.
export const escapeMarkdown = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+.!|~-]/g, '\\$&');
const plain = value => String(value).replace(/\s+/gu, ' ').trim();
const bullets = values => values.length ? values.map(value => `- ${escapeMarkdown(value)}`).join('\n') : '- Not stated in the reviewed source.';
export function renderPost(record) {
  if (!safeURL(record.source_url) || !safeURL(record.application_url)) throw new Error('Cannot render invalid source/application links.');
  const title = `[Job] ${plain(record.firm_name)} — ${plain(record.role_title)} | ${plain(record.location)}`;
  if (title.length > 300) throw new Error('Post title exceeds 300 characters.');
  const lines = [
    `**Employer:** ${escapeMarkdown(record.firm_name)}`,
    `**Location:** ${escapeMarkdown(record.location)}`,
    `**Work model:** ${record.work_model ? escapeMarkdown(record.work_model) : 'Not stated in the reviewed feed.'}`,
    '', '**Role details**', escapeMarkdown(record.source_summary),
    ...(record.offer_summary ? ['', escapeMarkdown(record.offer_summary)] : []),
    '', '**Responsibilities**', bullets(record.responsibilities),
    '', '**Requirements**', bullets(record.qualifications),
    '', `**Eligibility:** ${escapeMarkdown(record.eligibility_summary)}${record.eligibility_state === 'confirmed' ? '' : ' Some eligibility details remain unstated; confirm with the employer.'}`,
    '', `**Deadline:** ${record.deadline_source_text ? escapeMarkdown(record.deadline_source_text) : record.deadline_at ? escapeMarkdown(record.deadline_at) : 'Not stated in the reviewed source.'}`,
    '', `[Application entry](<${record.application_url}>) | [Official source](<${record.source_url}>)`,
    '', `**Source last verified:** ${escapeMarkdown(record.last_verified_at)}`,
    `**Application entry checked:** ${escapeMarkdown(record.application_check.checked_at)}`,
    escapeMarkdown(record.application_check.note),
    ...(record.availability_note ? ['', escapeMarkdown(record.availability_note)] : []),
    ...(record.work_model ? ['', `Work-model evidence: ${escapeMarkdown(record.work_model_source_text)}`] : []),
    '', 'Automated summary of a reviewed advertised opportunity. Availability can change after verification. Apply directly to the employer; this bot does not accept applications or collect applicant information.',
    `Reference: ${escapeMarkdown(record.id)}`
  ];
  const text = lines.join('\n\n');
  if (text.length > 35000) throw new Error('Post body exceeds the conservative 35,000-character limit.');
  return {title, text};
}

const normalizeIdentity = value => value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, ' ').trim();
export function claimKeys(record, subreddit = 'SaudiLaw', now = Date.now()) {
  const prefix = `saudilaw-jobs:v1:${subreddit.toLowerCase()}`;
  return {
    id: `${prefix}:id:${record.id}`,
    identity: `${prefix}:identity:${encodeURIComponent([record.firm_name, record.role_title, record.location].map(normalizeIdentity).join('|'))}`,
    day: `${prefix}:day:${new Date(now).toISOString().slice(0, 10)}`
  };
}

export async function runBot({feed, clock = Date.now, now = clock(), enabled = false, dryRun = true, subreddit = 'SaudiLaw', storage, submit, registry = REVIEWED_SOURCES} = {}) {
  if (subreddit !== 'SaudiLaw') return {status: 'blocked', reason: 'This prototype is scoped to r/SaudiLaw.'};
  if (enabled !== true) return {status: 'disabled'};
  // Snapshot the input before awaiting storage: another caller cannot change the post after its claims.
  const snapshot = structuredClone(feed);
  const report = evaluateFeed(snapshot, {now, registry});
  if (!report.valid) return {status: 'invalid-feed', report};
  const previews = report.candidates.map(record => ({id: record.id, ...renderPost(record)}));
  // Missing, null, strings, or any value except literal false all retain dry-run behavior.
  if (dryRun !== false) return {status: 'dry-run', report, previews};
  if (!storage?.get || !storage?.set || typeof submit !== 'function') return {status: 'blocked', reason: 'Durable storage and submit adapter are required.'};
  for (const record of report.candidates) {
    const keys = claimKeys(record, subreddit, now);
    const attempt = JSON.stringify({state: 'pending', id: record.id, started_at: new Date(now).toISOString()});
    try {
      if (await storage.get(keys.id) || await storage.get(keys.identity)) continue;
      // Every claim is permanent. Partial writes, crashes and ambiguous responses require human reconciliation.
      // Claiming the day first atomically caps ALL submissions, including unknown outcomes, at one per UTC day.
      if (await storage.set(keys.day, attempt, {nx: true}) !== 'OK') return {status: 'daily-cap', id: record.id};
      if (await storage.set(keys.id, attempt, {nx: true}) !== 'OK') return {status: 'claimed', id: record.id};
      if (await storage.set(keys.identity, attempt, {nx: true}) !== 'OK') return {status: 'claimed', id: record.id};
    } catch {
      return {status: 'storage-uncertain', id: record.id, reason: 'No submission attempted; retain all claims and reconcile storage before retrying.'};
    }
    const submissionTime = clock();
    if (!Number.isFinite(submissionTime) || submissionTime < now || new Date(submissionTime).toISOString().slice(0, 10) !== new Date(now).toISOString().slice(0, 10) || !fresh(snapshot.generated_at, submissionTime) || !eligibility(record, {now: submissionTime, registry}).eligible) {
      return {status: 'eligibility-changed', id: record.id, reason: 'Evidence expired, the UTC day changed, or the clock changed before submission. No submission attempted; claims remain for reconciliation.'};
    }
    let posted;
    try {
      posted = await submit({subredditName: subreddit, ...renderPost(record), runAs: 'APP'});
      if (!posted || typeof posted.id !== 'string' || !/^t3_[a-z0-9]+$/.test(posted.id)) throw new Error('Missing confirmed post ID.');
    } catch {
      return {status: 'submission-uncertain', id: record.id, reason: 'Submission may have succeeded. Claims remain permanent; do not automatically retry.'};
    }
    const receipt = JSON.stringify({state: 'posted', id: record.id, post_id: posted.id, started_at: new Date(now).toISOString()});
    try {
      for (const key of [keys.id, keys.identity, keys.day]) if (await storage.set(key, receipt) !== 'OK') throw new Error('Receipt write unconfirmed.');
    } catch {
      return {status: 'receipt-uncertain', id: record.id, postId: posted.id, reason: 'Post ID was returned; pending claims remain protective. Reconcile receipt without reposting.'};
    }
    return {status: 'posted', id: record.id, postId: posted.id};
  }
  return {status: 'nothing-to-post', report};
}
