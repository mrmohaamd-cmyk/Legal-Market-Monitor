import {canonical,digest,timestamp} from './reviewed-content.mjs';
import {validateOwnerJobFeed,ownerJobDigest,ownerJobRecord,OWNER_JOB_FEED_SCHEMA} from './owner-job.mjs';
import {recordHashes} from './owner-job.mjs';
import {validateProgrammeBundle} from './programme-bundle.mjs';
export const OWNER_BUNDLE_FEED_PATH='dist/saudilaw-owner-bundles.json';
export const OWNER_BUNDLE_FEED_SCHEMA='saudilaw-owner-bundle-feed/v1';
const exact=(x,k)=>{if(!x||Array.isArray(x)||Object.keys(x).sort().join(',')!==[...k].sort().join(','))throw Error('owner_bundle_shape');};
export function validateOwnerBundleFeed(input,{now=Date.now()}={}){
 const f=JSON.parse(canonical(input));exact(f,['schema','generatedAt','expiresAt','publicationEnabled','bundles','sha256']);const {sha256,...payload}=f;
 if(f.schema!==OWNER_BUNDLE_FEED_SCHEMA||f.publicationEnabled!==false||digest(payload)!==sha256||!Array.isArray(f.bundles)||f.bundles.length>4||Buffer.byteLength(canonical(f))>500000)throw Error('owner_bundle_feed');
 const ids=new Set();
 for(const b of f.bundles){
  exact(b,['id','employerKey','title','overview','constraint','metadata','deadline','audience','members']);
  for(const key of ['title','overview','constraint','metadata','deadline','audience']){exact(b[key],['ar','en']);if(['ar','en'].some(lang=>typeof b[key][lang]!=='string'||!b[key][lang].trim()||b[key][lang].length>1600||/[<>\u0000-\u001f\u007f]/u.test(b[key][lang])))throw Error('owner_bundle_copy');}
  if(!/^[a-z][a-z0-9-]{0,99}$/.test(b.id))throw Error('owner_bundle_id');
  if(ids.has(b.id)||b.employerKey!=='white-case'||!Array.isArray(b.members)||b.members.length!==3)throw Error('owner_bundle_members');ids.add(b.id);
  const p={schema:OWNER_JOB_FEED_SCHEMA,generatedAt:f.generatedAt,expiresAt:f.expiresAt,publicationEnabled:false,jobs:b.members};
  validateOwnerJobFeed({...p,sha256:digest(p)},{now});
  if(b.members.some(x=>x.job.employerKey!==b.employerKey))throw Error('owner_bundle_employer');
  // Derive all claims from official source identities, never from incoming hashes.
  // Failed sources remain visible but cannot become a publication model.
  if(b.members.every(x=>x.sourceStatus==='verified'))ownerBundleModel(b,{now,generatedAt:f.generatedAt,expiresAt:f.expiresAt});
 }
 if(timestamp(f.generatedAt)>now||timestamp(f.expiresAt)<=now||timestamp(f.expiresAt)-timestamp(f.generatedAt)>43200000)throw Error('owner_bundle_expired');
 return f;
}
export function ownerBundleModel(b,{now=Date.now(),generatedAt,expiresAt}={}){
 if(b.members.some(x=>x.sourceStatus!=='verified'))throw Error('owner_bundle_source_held');
 const members=b.members.map(({job})=>{const hashes=recordHashes(ownerJobRecord(job));return {id:job.id,...hashes,contentSha256:ownerJobDigest(job),sourceBodySha256:job.sources.find(s=>s.url===job.weekly.source_url).bodySha256,sourceUrl:job.weekly.source_url,applicationUrl:job.weekly.application_url,heading:job.weekly.role,summary:job.weekly.opportunity_summary,eligibility:{ar:job.weekly.eligibility_points.ar.join(' • '),en:job.weekly.eligibility_points.en.join(' • ')}};});
 return validateProgrammeBundle({schema:'saudilaw-programme-bundle/v1',id:b.id,employerKey:b.employerKey,checkedAt:generatedAt,expiresAt:new Date(Math.min(timestamp(expiresAt),...b.members.map(x=>timestamp(x.expiresAt)))).toISOString(),title:b.title,overview:b.overview,constraint:b.constraint,metadata:b.metadata,deadline:b.deadline,audience:b.audience,members},{now});
}
