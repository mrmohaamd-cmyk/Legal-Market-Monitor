import {producerFixture} from './owner-job-producer-fixture.mjs';
import {recordHashes,ownerJobRecord} from '../contracts/owner-job.mjs';
export function bundleFixture(){
 const f=producerFixture(),jobs=[];
 for(const [i,role] of ['Saudi Law Trainee Program 2027','GCC English Law Trainee Program 2029','GCC Spring Vacation Scheme'].entries()){
  const j=structuredClone(f.job);j.id='white-case-programme-'+i;
  j.sourceIdentity.roleTitleEn=role;j.weekly.role.en=role;
  j.weekly.opportunity_summary={ar:'تفاصيل البرنامج التجريبي.',en:'Synthetic programme detail.'};
  const url=f.source+'-'+i,body='<main><h1>'+role+'</h1><p>Riyadh, Saudi Arabia</p><p>Law degree required.</p></main>';
  f.bodies[url]=body;j.weekly.source_url=url;j.sources[0]={...j.sources[0],url,bodySha256:f.hash(body),bodyBytes:Buffer.byteLength(body),requiredText:[role,'Riyadh, Saudi Arabia','Law degree required.']};
  j.context.opportunityIdentity=recordHashes(ownerJobRecord(j)).identityHash;j.context.evidence[0].url=url;jobs.push(j);
 }
 const pair={ar:'بيانات تجريبية فقط.',en:'Synthetic test only.'};
 return {...f,bundles:[{id:'white-case-three-programmes',employerKey:'white-case',title:pair,overview:pair,constraint:pair,metadata:pair,deadline:pair,audience:pair,jobs}]};
}
