// Independent, data-only full-bundle review channel. Never feeds legacy cards.
import {canonical,digest} from '../../contracts/reviewed-content.mjs';
import {OWNER_BUNDLE_FEED_SCHEMA,validateOwnerBundleFeed} from '../../contracts/owner-bundle.mjs';
import {compileOwnerBundleEvidence,compileOwnerBundleRecordedEvidence} from './owner-job-feed.mjs';
export function compileOwnerBundleFeed(options={}){return compileBundle(options,false);}
export function compileOwnerBundleRecordedFeed(options={}){return compileBundle(options,true);}
async function compileBundle({bundles,retrieve,browser,onSourceObserved,clock=Date.now}={},recorded){
 // Snapshot reviewed inputs before awaiting any untrusted source transport.
 const reviewed=JSON.parse(canonical(bundles));
 if(!Array.isArray(reviewed)||reviewed.length>4||Buffer.byteLength(canonical(reviewed))>400000)throw Error('bundle_producer_input');
 const ids=new Set();
 for(const b of reviewed){
  if(!b||Object.keys(b).sort().join(',')!=='audience,constraint,deadline,employerKey,id,jobs,metadata,overview,title'||b.employerKey!=='white-case'||!Array.isArray(b.jobs)||b.jobs.length!==3||ids.has(b.id)||b.jobs.some(j=>j.employerKey!=='white-case'))throw Error('bundle_producer_members');
  ids.add(b.id);
 }
 // One run budget and request budget shared across ALL members and bundles.
 const feed=await (recorded?compileOwnerBundleRecordedEvidence:compileOwnerBundleEvidence)({jobs:reviewed.flatMap(b=>b.jobs),retrieve,browser,onSourceObserved,clock});
 let offset=0;
 const payload={schema:OWNER_BUNDLE_FEED_SCHEMA,generatedAt:feed.generatedAt,expiresAt:feed.expiresAt,publicationEnabled:false,bundles:reviewed.map(({jobs,...b})=>({...b,members:feed.jobs.slice(offset,offset+=jobs.length)}))};
 return validateOwnerBundleFeed({...payload,sha256:digest(payload)},{now:clock()});
}
