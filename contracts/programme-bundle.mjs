// Review-only bridge. Deliberately not a publisher or an acceptance writer.
// Every member retains its own native identity; a bundle never supersedes it.
import {createHash} from 'node:crypto';
const HASH=/^[a-f0-9]{64}$/, ID=/^[a-z][a-z0-9-]{0,99}$/;
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
const exact=(v,keys)=>{if(!v||Array.isArray(v)||Object.keys(v).sort().join('|')!==[...keys].sort().join('|'))throw Error('bundle_shape');};
const plain=v=>typeof v==='string'&&v.trim().length>0&&v.length<=1600&&!/[<>\u0000-\u001f\u007f]/u.test(v);
const bilingual=v=>{exact(v,['ar','en']);if(!plain(v.ar)||!plain(v.en))throw Error('bundle_copy');};
const time=v=>{if(typeof v!=='string'||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v)throw Error('bundle_time');return Date.parse(v);};
const url=v=>{try{const u=new URL(v);return u.href===v&&u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.port&&['www.whitecase.com','whitecase.grad.allhires.com'].includes(u.hostname);}catch{return false;}};
export function validateProgrammeBundle(input,{now=Date.now(),historical=false}={}){
 if(!Number.isSafeInteger(now))throw Error('bundle_clock');
 const b=structuredClone(input);exact(b,['schema','id','employerKey','checkedAt','expiresAt','title','overview','constraint','metadata','deadline','audience','members']);
 if(b.schema!=='saudilaw-programme-bundle/v1'||!ID.test(b.id)||b.employerKey!=='white-case')throw Error('bundle_identity');
 if((!historical&&(time(b.checkedAt)>now||time(b.expiresAt)<=now))||time(b.expiresAt)<=time(b.checkedAt)||time(b.expiresAt)-time(b.checkedAt)>12*3600000)throw Error('bundle_stale');
 for(const k of ['title','overview','constraint','metadata','deadline','audience'])bilingual(b[k]);
 if(!Array.isArray(b.members)||![2,3].includes(b.members.length))throw Error('bundle_members');
 const ids=new Set(),identities=new Set(),records=new Set();
 for(const m of b.members){
  exact(m,['id','recordHash','identityHash','contentSha256','sourceUrl','applicationUrl','sourceBodySha256','heading','summary','eligibility']);
  if(!ID.test(m.id)||ids.has(m.id)||!HASH.test(m.recordHash)||!HASH.test(m.identityHash)||!HASH.test(m.contentSha256)||!HASH.test(m.sourceBodySha256)||identities.has(m.identityHash)||records.has(m.recordHash))throw Error('bundle_member_identity');
  ids.add(m.id);identities.add(m.identityHash);records.add(m.recordHash);
  if(!url(m.sourceUrl)||!url(m.applicationUrl))throw Error('bundle_source');
  for(const k of ['heading','summary','eligibility'])bilingual(m[k]);
 }
 if(Buffer.byteLength(canonical(b))>24000)throw Error('bundle_budget');
 return b;
}
