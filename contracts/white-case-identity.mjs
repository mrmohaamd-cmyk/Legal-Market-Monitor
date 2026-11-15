// Fixed, reviewed identity mapping for the three 2027/2029 programmes.
// This maps first-party wording to stable native identities; it grants no
// authority to supersede suppressions, publish, or change a historical hash.
export const WHITE_CASE_IDENTITY_PROFILE='white-case-programmes-2027-2029/v1';
const APPLICATION='https://whitecase.grad.allhires.com/app/';
const SAUDI='https://www.whitecase.com/careers/locations/saudi-arabia/saudi-law-trainee-program';
const GCC='https://www.whitecase.com/careers/locations/saudi-arabia/gcc-english-law';
export const WHITE_CASE_PROGRAMMES=Object.freeze({
 'white-case-saudi-law-trainee-2027':Object.freeze({
  roleTitleEn:'Saudi Law Trainee Program 2027',sourceUrl:SAUDI,
  programmeHeading:'Saudi Law Trainee Program overview',
  applicationText:'Saudi Law Trainee Program 2027 March 2027 08/01/2027',
  retainSuppression:true,
 }),
 'white-case-gcc-english-law-trainee-2029':Object.freeze({
  roleTitleEn:'GCC English Law Trainee Program 2029',sourceUrl:GCC,
  programmeHeading:'GCC English Law Trainee Program overview',
  applicationText:'GCC English Law Trainee Program 2029 08/01/2027',
  retainSuppression:false,
 }),
 'white-case-gcc-spring-vacation-scheme-2027':Object.freeze({
  roleTitleEn:'GCC English Law Trainee Program – Spring Vacation Scheme',sourceUrl:GCC,
  programmeHeading:'Vacation Scheme – Spring 2027',
  applicationText:'GCC English Law Trainee Program – Spring Vacation Scheme 4-16 April 2027 08/01/2027',
  retainSuppression:false,
 }),
});
export function whiteCaseIdentityProfileFor(job){
 if(job.identityEvidenceProfile===undefined)return null;
 const p=WHITE_CASE_PROGRAMMES[job.id];
 if(job.identityEvidenceProfile!==WHITE_CASE_IDENTITY_PROFILE||job.employerKey!=='white-case'||!p||job.sourceIdentity?.roleTitleEn!==p.roleTitleEn||job.sourceIdentity?.locationEn!=='Riyadh, Saudi Arabia'||job.sourceIdentity.intakeStartOn!==undefined||job.weekly?.source_url!==p.sourceUrl||job.weekly?.application_url!==APPLICATION)throw Error('owner_job_identity_profile');
 return p;
}
export function validateWhiteCaseIdentitySources(job){
 const p=whiteCaseIdentityProfileFor(job);if(!p)return null;
 const programme=job.sources.find(s=>s.role==='programme'&&s.url===p.sourceUrl);
 const application=job.sources.find(s=>s.role==='application'&&s.url===APPLICATION);
 if(!programme?.requiredText.includes(p.programmeHeading)||!programme.requiredText.includes('Riyadh')||!application?.requiredText.includes(p.applicationText))throw Error('owner_job_identity_profile_sources');
 return p;
}
