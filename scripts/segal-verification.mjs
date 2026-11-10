// The public vacancy and the live selected role in its form must agree.
// JavaScript shell HTML, URL parameters and hidden templates do not suffice.
import {find, textOf} from './html-evidence.mjs';
import {sha256, unavailable, enabled, sameUrl, inspectProof} from './coverage-proof.mjs';

export const SEGAL_SOURCE_URL = 'https://www.segal.com.sa/en/careers/jobs/student-intern';
export const SEGAL_APPLICATION_URL = 'https://www.segal.com.sa/en/careers/apply?job=student-intern';
const recordId = 'segal-riyadh-student-intern-2026';
const reviewedDescriptionHash = '2f14fdb123858c5f4099221e284f29bb96a23225675cbd57002f86f3f4767410';
const classSuffix = (node, suffix) => (node.attrs.class || '').split(/\s+/).some(value => value.endsWith(`__${suffix}`));
export const supportsSegal = record => record?.id === recordId;

// Synthetic fixtures may bind their own complete descriptions through this
// factory. The production export below accepts no per-call hash override.
export function createSegalReviewer({descriptionHash = reviewedDescriptionHash} = {}) {
  return async function reviewSegal(record, {sourceProof, applicationProof, now = Date.now()} = {}) {
    const evidence = [];
    const pending = (reason, extra={}) => ({outcome:'verification_pending', result:'unverified', reason, evidence, ...extra});
    if (!supportsSegal(record) || !Number.isFinite(now)) return pending('Unknown Segal record or invalid check time.');
    if (record.record_kind !== 'advertised_opening' || record.role_title !== 'Student Intern' || !sameUrl(record.source_url,SEGAL_SOURCE_URL) || !sameUrl(record.application_url,SEGAL_APPLICATION_URL)) return pending('The Segal vacancy identity, destination or classification changed; editorial review is required.');
    const source = inspectProof(sourceProof,SEGAL_SOURCE_URL,SEGAL_SOURCE_URL,now,evidence);
    if (source.issue) return pending(`Segal source: ${source.issue}`);
    const mains = find(source.doc,node => node.tag === 'main' && node.attrs.id === 'main-content');
    if (mains.length !== 1) return pending('The Segal vacancy main content was absent or ambiguous.');
    const main = mains[0];
    const titles = find(main,node => node.tag === 'h1' && classSuffix(node,'jobTitle'));
    const articles = find(main,node => node.tag === 'article' && classSuffix(node,'jobMain'));
    const asides = find(main,node => node.tag === 'aside');
    if (titles.length !== 1 || textOf(titles[0]) !== 'Student Intern' || articles.length !== 1 || asides.length !== 1) return pending('The exact Segal vacancy title, body or metadata was absent or ambiguous.');
    const expected = {'Job Reference':'SG-JOB-2026-0002','Location':'Riyadh','Employment type':'Internship'};
    for (const [label,value] of Object.entries(expected)) {
      const rows = find(asides[0],node => node.tag === 'div' && find(node,child => child.tag === 'h2' && textOf(child) === label).length === 1 && find(node,child => child.tag === 'p' && textOf(child) === value).length === 1);
      if (rows.length !== 1 || textOf(rows[0]) !== `${label} ${value}`) return pending('The Segal job reference, Riyadh location or internship type changed.');
    }
    const description = textOf(articles[0]);
    const materials = [
      'You’ll need to be a strong English and Arabic speaker, reader, and writer.',
      'You’ll be a current law student at a recognised university.',
      'You’ll have a consistently strong academic record.',
      'You’ll have the right to work in Saudi Arabia for the duration of the internship.'
    ];
    if (materials.some(value => !description.includes(value)) || sha256(description) !== descriptionHash) return pending('The complete Segal vacancy body or material eligibility facts changed; editorial review is required.');
    if (unavailable.test(textOf(main))) return pending('The Segal vacancy contains an availability warning requiring review.');
    const apply = find(main,node => node.tag === 'a' && /^Apply now$/i.test(textOf(node)));
    if (!apply.length || apply.some(node => !enabled(node) || !sameUrl(node.attrs.href,SEGAL_APPLICATION_URL,SEGAL_SOURCE_URL))) return pending('The exact Segal Apply action was absent, disabled or changed.');
    const application = inspectProof(applicationProof,SEGAL_APPLICATION_URL,SEGAL_APPLICATION_URL,now,evidence);
    if (application.issue) return pending(`Segal application entry: ${application.issue}`);
    if (unavailable.test(textOf(application.doc))) return pending('The Segal application entry contains an availability warning requiring review.');
    const applicationMains = find(application.doc,node => node.tag === 'main' && node.attrs.id === 'main-content');
    if (applicationMains.length !== 1) return pending('The public Segal application main content was absent or ambiguous.');
    const sections = find(applicationMains[0],node => node.tag === 'section' && node.attrs.id === 'apply');
    if (sections.length !== 1) return pending('The public Segal application section was absent or ambiguous.');
    const forms = find(sections[0],node => node.tag === 'form' && classSuffix(node,'form'));
    if (forms.length !== 1 || !enabled(forms[0])) return pending('The public Segal application form was absent, disabled or ambiguous.');
    const form = forms[0];
    // This React form has no HTML action. If an action is introduced, review it
    // instead of treating controls as proof of a newly changed submission target.
    if ('action' in form.attrs) return pending('The public Segal form submission destination changed; review is required.');
    const selectors = find(form,node => node.tag === 'select' && node.attrs.id === 'career-job' && node.attrs.name === 'job' && enabled(node));
    if (selectors.length !== 1 || 'multiple' in selectors[0].attrs) return pending('The live Segal job selector was absent, disabled or ambiguous.');
    const selected = find(selectors[0],node => node.tag === 'option' && 'selected' in node.attrs);
    if (selected.length !== 1 || !enabled(selected[0]) || selected[0].attrs.value !== 'student-intern' || textOf(selected[0]) !== 'Student Intern') return pending('The live selected Segal vacancy is not Student Intern; the URL alone is insufficient.');
    const roleSections = find(form,node => node.tag === 'section' && find(node,child => child === selectors[0]).length === 1);
    if (roleSections.length !== 1) return pending('The selected Segal vacancy has no unambiguous role section.');
    const roleLinks = find(roleSections[0],node => node.tag === 'a' && textOf(node) === 'Student Intern');
    if (!/Applying for/.test(textOf(roleSections[0])) || roleLinks.length !== 1 || !enabled(roleLinks[0]) || !sameUrl(roleLinks[0].attrs.href,SEGAL_SOURCE_URL,SEGAL_APPLICATION_URL)) return pending('The selected Segal role is not linked back to the audited vacancy.');
    for (const [id,name,type] of [['career-firstName','firstName','text'],['career-lastName','lastName','text'],['career-email','email','email']]) {
      const inputs = find(form,node => node.tag === 'input' && node.attrs.id === id && node.attrs.name === name && (node.attrs.type || 'text') === type && enabled(node));
      if (inputs.length !== 1) return pending('The required public Segal name, email or CV controls were not available together.');
    }
    const resumeControls=find(form,node=>node.attrs.id==='career-cv'&&enabled(node)&&(
      node.tag==='input'&&node.attrs.type==='file'||
      (node.tag==='button'||node.tag==='label'||node.attrs.role==='button')&&/Upload your resume/i.test(textOf(node))
    ));
    if(resumeControls.length!==1){
      const uploadDiagnostic=find(form,node=>['button','input','label'].includes(node.tag)||node.attrs.role==='button')
        .filter(node=>node.attrs.id==='career-cv'||node.attrs.for==='career-cv'||/resume/i.test(node.attrs['aria-label']||'')||/Upload your resume/i.test(textOf(node)))
        .slice(0,8).map(node=>({tag:node.tag,id:node.attrs.id||null,for:node.attrs.for||null,role:node.attrs.role||null,type:node.attrs.type||null,hasResumeLabel:/Upload your resume/i.test(textOf(node)),enabled:enabled(node)}));
      return pending('The visible Segal resume-upload control was absent, disabled or ambiguous.',{uploadDiagnostic});
    }
    const submits = find(form,node => node.tag === 'button' && (node.attrs.type || 'submit') === 'submit' && textOf(node) === 'Submit application' && enabled(node));
    if (submits.length !== 1) return pending('The public Segal Submit application control was absent, disabled or ambiguous.');
    return {outcome:'verified', result:'form_available', evidence,
      reason:'Segal vacancy SG-JOB-2026-0002 retains its reviewed Student Intern body, Riyadh location and eligibility facts. Its public form has Student Intern selected in the live DOM, links back to that exact vacancy and exposes editable name/email, CV upload and submit controls. No form values, consent or application were submitted. No deadline, duration or compensation is inferred.'};
  };
}
export const reviewSegal = createSegalReviewer();
