// Checks only the audited public vacancy and employer-linked sign-in entry.
// Browser proofs come from the bounded read-only runner, not supplied status flags.
import {sha256, hasClass, unavailable, enabled, sameUrl, inspectProof} from './coverage-proof.mjs';
import {find, textOf} from './html-evidence.mjs';

export const AO_SOURCE_URL = 'https://careers.aoshearman.com/en/job/riyadh/co-op-scheme-winter-2026/3392/44638109504';
export const AO_APPLICATION_URL = 'https://jobs.aoshearman.com/TGnewUI/Search/home/HomeWithPreLoad?PageType=JobDetails&partnerid=30147&siteid=5040&jobid=98119';
const recordId = 'ao-shearman-winter-2026-coop';
const reviewedDescriptionHash = '3e6deb77a6b17f65e3b7f8407e6905b4fa7caeb6950f87db5b03934fd4b91ed0';
// This is an early editorial stop at the beginning of the stated closing day
// in Riyadh, not an inferred timezone for the employer's unspecified "5pm".
const reviewDueAt = '2026-11-29T21:00:00.000Z';
export const supportsAO = record => record?.id === recordId;

// The production export is bound to the reviewed complete description. Only
// isolated fixture tests should create reviewers with synthetic body hashes.
export function createAOReviewer({descriptionHash = reviewedDescriptionHash} = {}) {
  return async function reviewAO(record, {sourceProof, applicationProof, now = Date.now()} = {}) {
    const evidence = [];
    const pending = reason => ({outcome:'verification_pending', result:'unverified', reason, evidence});
    if (!supportsAO(record) || !Number.isFinite(now)) return pending('Unknown A&O record or invalid check time.');
    if (record.record_kind !== 'advertised_opening' || record.role_title !== 'Co-op Scheme – Winter 2026' || !sameUrl(record.source_url, AO_SOURCE_URL) || !sameUrl(record.application_url, AO_APPLICATION_URL)) return pending('The A&O vacancy identity, destination or classification changed; editorial review is required.');
    if (now >= Date.parse(reviewDueAt)) return pending('The conservative editorial cutoff for the stated A&O closing day has arrived; no employer deadline timezone has been inferred.');
    const source = inspectProof(sourceProof, AO_SOURCE_URL, AO_SOURCE_URL, now, evidence);
    if (source.issue) return pending(`A&O source: ${source.issue}`);
    const mains = find(source.doc, node => node.tag === 'main' && node.attrs.id === 'content');
    if (mains.length !== 1) return pending('The A&O vacancy main content was absent or ambiguous.');
    const main = mains[0];
    const titles = find(main, node => node.tag === 'h1' && hasClass(node,'hero-banner__headline'));
    const jobs = find(main, node => node.tag === 'section' && hasClass(node,'job-description') && node.attrs['data-job-id'] === '44638109504' && node.attrs['data-org-id'] === '3392');
    if (titles.length !== 1 || textOf(titles[0]) !== 'Co-op Scheme - Winter 2026' || jobs.length !== 1) return pending('The exact A&O vacancy heading or public job identity was not found.');
    const job = jobs[0];
    const details = {'job-detail-job-id':'11180BR','job-detail-location':'Riyadh, Saudi Arabia','job-detail-job-type':'Vacation programme/internship','job-detail-working-arrangement':'Office based'};
    for (const [name, value] of Object.entries(details)) {
      const rows = find(job, node => node.tag === 'dd' && hasClass(node,name));
      if (rows.length !== 1 || textOf(rows[0]) !== value) return pending('The A&O requisition, Saudi location, type or working arrangement changed.');
    }
    const descriptions = find(job, node => node.tag === 'div' && hasClass(node,'ats-description'));
    if (descriptions.length !== 1) return pending('The complete A&O vacancy description was absent or ambiguous.');
    const description = textOf(descriptions[0]);
    const materials = [
      'The Co-op internship will last for a period of 7 months with intakes in January and August.',
      'Currently enrolled as an undergraduate student in Law.',
      'A strong cumulative GPA that demonstrates academic excellence.',
      'Fluent in English and Arabic (spoken and written).',
      'COOP training should be a graduation requirement by the University or College.',
      'Monthly expense allowance.',
      'Applications open 14 September 2026 and close on 30 November 2026 at 5pm.'
    ];
    if (materials.some(value => !description.includes(value))) return pending('A&O material eligibility or deadline wording changed; editorial review is required.');
    const observedDescriptionSha256=sha256(description);
    if (observedDescriptionSha256 !== descriptionHash) return {...pending('The complete A&O source-text fingerprint changed; editorial review is required.'),observedDescriptionSha256};
    if (unavailable.test(textOf(main))) return pending('The A&O vacancy contains an availability warning requiring review.');
    const apply = find(job, node => node.tag === 'a' && hasClass(node,'job-apply'));
    if (!apply.length || apply.some(node => !enabled(node) || node.attrs['data-job-id'] !== '44638109504' || textOf(node) !== 'Apply' || !sameUrl(node.attrs.href,AO_APPLICATION_URL,AO_SOURCE_URL))) return pending('The exact employer-linked A&O Apply action was absent, disabled or changed.');
    const application = inspectProof(applicationProof, AO_APPLICATION_URL, `${AO_APPLICATION_URL}#jobDetails=98119_5040`, now, evidence);
    if (application.issue) return pending(`A&O application entry: ${application.issue}`);
    if (unavailable.test(textOf(application.doc))) return pending('The A&O application entry contains an availability warning requiring review.');
    const forms = find(application.doc, node => node.tag === 'form' && node.attrs.name === 'signInForm' && hasClass(node,'loginBox'));
    if (forms.length !== 1 || !enabled(forms[0])) return pending('The visible A&O sign-in form was absent or ambiguous.');
    const form = forms[0];
    if ('action' in form.attrs) return pending('The public A&O sign-in form destination changed; review is required.');
    const user = find(form,node => node.tag === 'input' && node.attrs.id === 'loginField' && node.attrs.name === 'loginField' && ['text','email'].includes(node.attrs.type || 'text') && enabled(node));
    const password = find(form,node => node.tag === 'input' && node.attrs.id === 'password' && node.attrs.name === 'password' && node.attrs.type === 'password' && enabled(node));
    const submit = find(form,node => node.tag === 'button' && node.attrs.id === 'btnLogin' && (node.attrs.type || 'submit') === 'submit' && enabled(node));
    if (user.length !== 1 || password.length !== 1 || submit.length !== 1 || !/Sign In/i.test(textOf(submit[0])) || !/E-Mail Address/i.test(textOf(form))) return pending('The public A&O sign-in controls were not available together.');
    return {outcome:'verified', result:'login_required', evidence, reviewDueAt,
      reason:'A&O requisition 11180BR retains its reviewed Riyadh vacancy body and material facts. The exact employer Apply link reaches the public sign-in entry bound to ATS job 98119. This proves the public entry only; selection after login was not inspected. No credentials, consent or application were submitted. The stated 5pm deadline has no published timezone; the review cutoff is an earlier editorial safeguard.'};
  };
}
export const reviewAO = createAOReviewer();
