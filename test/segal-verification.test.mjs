import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSegalReviewer, reviewSegal, supportsSegal, SEGAL_SOURCE_URL, SEGAL_APPLICATION_URL} from '../scripts/segal-verification.mjs';

const now=Date.parse('2026-11-10T10:00:00Z');
const hash=value=>createHash('sha256').update(value).digest('hex');
const description=[
  'You’ll need to be a strong English and Arabic speaker, reader, and writer.',
  'You’ll be a current law student at a recognised university.',
  'You’ll have a consistently strong academic record.',
  'You’ll have the right to work in Saudi Arabia for the duration of the internship.'
].join(' ');
const sourceHtml=`<main id="main-content"><h1 class="detail__abc__jobTitle">Student Intern</h1><article class="detail__abc__jobMain">${description}</article><aside><div><h2>Job Reference</h2><p>SG-JOB-2026-0002</p></div><div><h2>Location</h2><p>Riyadh</p></div><div><h2>Employment type</h2><p>Internship</p></div></aside><a href="/en/careers/apply?job=student-intern">Apply now</a></main>`;
const applicationHtml='<main id="main-content"><section id="apply"><form class="apply__abc__form"><section><input id="career-firstName" name="firstName"><input id="career-lastName" name="lastName"><input id="career-email" name="email" type="email"></section><section><select id="career-job" name="job"><option selected value="student-intern">Student Intern</option></select><p>Applying for <a href="/en/careers/jobs/student-intern">Student Intern</a></p></section><section><input id="career-cv" type="file"></section><button>Submit application</button></form></section></main>';
const record={id:'segal-riyadh-student-intern-2026',record_kind:'advertised_opening',role_title:'Student Intern',source_url:SEGAL_SOURCE_URL,application_url:SEGAL_APPLICATION_URL};
const proof=(url,html)=>({schema:'saudilaw-browser-dom-proof/v1',requested_url:url,final_url:url,http_status:200,checked_at:new Date(now).toISOString(),visible_html:html,visible_html_sha256:hash(html)});
const options=(source=sourceHtml,application=applicationHtml)=>({now,sourceProof:proof(SEGAL_SOURCE_URL,source),applicationProof:proof(SEGAL_APPLICATION_URL,application)});
const review=createSegalReviewer({descriptionHash:hash(description)});
const pending=async(opts,rec=record)=>assert.equal((await review(rec,opts)).outcome,'verification_pending');

test('Segal requires full body, exact job reference and live selected same-role form',async()=>{
  const before=JSON.stringify(record);
  assert.equal(supportsSegal(record),true);
  const result=await review(record,options());
  assert.equal(result.outcome,'verified');assert.equal(result.result,'form_available');assert.equal(result.evidence.length,2);
  assert.match(result.reason,/No deadline, duration or compensation is inferred/);
  assert.equal(JSON.stringify(record),before);
});
test('Segal source/app proofs must be fresh successful projections, not JS shells',async()=>{
  for(const which of ['sourceProof','applicationProof']){
    for(const delta of [undefined,{schema:'unknown'},{http_status:403},{checked_at:'invalid'},{checked_at:new Date(now+1).toISOString()},{checked_at:new Date(now-300001).toISOString()},{visible_html_sha256:'0'.repeat(64)},{requested_url:''},{final_url:SEGAL_APPLICATION_URL+'&fallback=1'}]){
      const opts=options();opts[which]=delta===undefined?undefined:{...opts[which],...delta};await pending(opts);
    }
  }
  await pending(options('<main id="main-content">Loading</main>'));
  await pending({now,sourceResponse:{status:200,body:sourceHtml}});
});
test('Segal record identity and exact URLs cannot drift',async()=>{
  for(const delta of [{id:'other'},{record_kind:'recruitment_route'},{role_title:'Student Lawyer'},{source_url:SEGAL_SOURCE_URL+'?all=1'},{application_url:SEGAL_APPLICATION_URL+'&job=student-intern'}])await pending(options(),{...record,...delta});
});
test('Segal title, metadata, full body and specific Apply are all independently necessary',async()=>{
  for(const [before,after] of [['>Student Intern<','>Associate<'],['SG-JOB-2026-0002','SG-JOB-2026-0003'],['>Riyadh<','>Dubai<'],['>Internship<','>Full time<'],['academic record.','academic record or equivalent.'],['?job=student-intern','?job=other-role'],['>Apply now<','>Careers<'],['<article ','<article hidden '],['<a href=','<a aria-disabled="true" href=']])await pending(options(sourceHtml.replace(before,after)));
  await pending(options(sourceHtml.replace('</main>','<p>This job is no longer available.</p></main>')));
});
test('Segal material requirements are checked beyond matching a synthetic body hash',async()=>{
  const changed=description.replace('current law student','qualified lawyer');
  const custom=createSegalReviewer({descriptionHash:hash(changed)});
  assert.equal((await custom(record,options(sourceHtml.replace(description,changed)))).outcome,'verification_pending');
});
test('Segal URL-selected vacancy alone does not count: live option and backlink must agree',async()=>{
  for(const html of [
    applicationHtml.replace(' selected',''),
    applicationHtml.replace('value="student-intern"','value=""'),
    applicationHtml.replace('value="student-intern"','value="other-role"'),
    applicationHtml.replace('</select>','<option selected value="other">Other</option></select>'),
    applicationHtml.replace('name="job"','name="job" multiple'),
    applicationHtml.replace('name="job"','name="job" disabled'),
    applicationHtml.replace('/en/careers/jobs/student-intern','/en/careers/jobs/other'),
    applicationHtml.replace('Applying for','Related roles'),
    applicationHtml.replace('</select>','</select></section><section>')
  ])await pending(options(sourceHtml,html));
});
test('Segal all editable inputs and submit must be in the same visible form',async()=>{
  for(const html of [
    `<template>${applicationHtml}</template>`,
    applicationHtml.replace('<form ','<form hidden '),
    applicationHtml.replace('<form ','<form inert '),
    applicationHtml.replace('name="firstName"','name="firstName" readonly'),
    applicationHtml.replace('name="lastName"','name="lastName" disabled'),
    applicationHtml.replace('name="email" type="email"','name="email" type="hidden"'),
    applicationHtml.replace('id="career-cv"','id="career-cv" disabled'),
    applicationHtml.replace('id="career-cv"','id="other-upload"'),
    applicationHtml.replace('type="file"','type="hidden"'),
    applicationHtml.replace('<button>','<button disabled>'),
    applicationHtml.replace('<button>','</form><form><button>'),
    applicationHtml.replace('<form ','<form action="https://other.example/" '),
    applicationHtml.replace('</main>','<p>Applications are closed.</p></main>')
  ])await pending(options(sourceHtml,html));
});
test('Segal resume proof accepts the live file control or its visible upload-button projection',async()=>{
  const buttonProjection=applicationHtml.replace('<input id="career-cv" type="file">','<button type="button" id="career-cv">Upload your resume</button>');
  for(const html of [applicationHtml,buttonProjection])assert.equal((await review(record,options(sourceHtml,html))).outcome,'verified');
});
test('Segal production export ignores per-call body hash override',async()=>{
  assert.equal((await reviewSegal(record,{...options(),descriptionHash:hash(description)})).outcome,'verification_pending');
});
