// Explicit operator-run intake of previously retrieved, reviewed public sources.
// Never calls a network endpoint, changes a timestamp, or writes a live feed.
import {readFile,stat,realpath,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {digest,timestamp} from '../contracts/reviewed-content.mjs';
import {compileOwnerBundleRecordedFeed} from './pipeline/owner-bundle-feed.mjs';
const INPUT='config/saudilaw-owner-bundles.json';
export const RECORDED_RECEIPT_PATH='docs/wc-programme-source-review-2026-11-15.json';
const capturedTime=v=>{if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(Date.parse(v)).toISOString().slice(0,19)!==v.slice(0,19))throw Error('recorded_timestamp');return Date.parse(v);};
export async function checkRecordedOwnerBundles(directory,captureDirectory,{root=process.cwd(),clock=Date.now}={}){
 if(!directory||!captureDirectory)throw Error('recorded_directories_required');
 const captureRoot=await realpath(captureDirectory),inputBytes=await readFile(join(root,INPUT),'utf8');
 if(Buffer.byteLength(inputBytes)>400000)throw Error('recorded_input_budget');
 const input=JSON.parse(inputBytes);
 if(input.schema!=='saudilaw-owner-bundle-input/v1'||Object.keys(input).sort().join(',')!=='bundles,schema'||!Array.isArray(input.bundles))throw Error('recorded_input_schema');
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'});
 const sourceCommit=git(['rev-parse','HEAD']).trim(),trustedBytes=git(['show',sourceCommit+':'+RECORDED_RECEIPT_PATH]),trusted=JSON.parse(trustedBytes);
 if(git(['show',sourceCommit+':'+INPUT])!==inputBytes||trusted.schema!=='saudilaw-programme-source-review/v1'||trusted.inputSha256!==digest(input)||!Array.isArray(trusted.sources)||trusted.sources.length>8)throw Error('recorded_trusted_binding');
 const manifestBytes=await readFile(join(captureRoot,'retrieval.json'),'utf8');
 if(Buffer.byteLength(manifestBytes)>64000)throw Error('recorded_manifest_budget');
 const manifest=JSON.parse(manifestBytes);
 if(!manifest||Array.isArray(manifest)||Object.keys(manifest).length>8)throw Error('recorded_manifest');
 const approved=new Set(input.bundles.flatMap(b=>b.jobs.flatMap(j=>j.sources.map(s=>s.url)))),sources=new Map(),provenance=[];
 for(const [name,r] of Object.entries(manifest)){
  if(!approved.has(r.url))continue; // Historical context evidence is not live source proof.
  const known=trusted.sources.find(p=>p.url===r.url);
  if(!known||['url','finalUrl','status','checkedAt','bodySha256','bodyBytes'].some(k=>known[k]!==r[k]))throw Error('recorded_untrusted_receipt');
  if(!/^[a-z][a-z0-9-]{0,30}$/.test(name)||sources.has(r.url)||r.status!==200||r.finalUrl!==r.url||capturedTime(r.checkedAt)>clock()||capturedTime(r.checkedAt)<=clock()-43200000)throw Error('recorded_receipt');
  const file=await realpath(join(captureRoot,name+'.html'));
  if(!file.startsWith(captureRoot+sep)||(await stat(file)).size>2000000)throw Error('recorded_body_budget');
  const body=await readFile(file,'utf8');
  if(createHash('sha256').update(body).digest('hex')!==r.bodySha256||Buffer.byteLength(body)!==r.bodyBytes)throw Error('recorded_body_integrity');
  sources.set(r.url,{url:r.url,status:200,contentType:'text/html',body,body_sha256:r.bodySha256,body_bytes:r.bodyBytes,checkedAt:new Date(capturedTime(r.checkedAt)).toISOString()});
  provenance.push({url:r.url,status:200,originalCheckedAt:r.checkedAt,checkedAt:new Date(capturedTime(r.checkedAt)).toISOString(),rawBodySha256:r.bodySha256,rawBodyBytes:r.bodyBytes});
 }
 if([...approved].some(url=>!sources.has(url)))throw Error('recorded_source_missing');
 const feed=await compileOwnerBundleRecordedFeed({bundles:input.bundles,retrieve:async url=>sources.get(url),clock});
 const report={schema:'saudilaw-owner-bundle-recorded-check/v1',sourceCommit,provenanceTrust:'operator_reviewed_committed_capture',trustedReceiptPath:RECORDED_RECEIPT_PATH,trustedReceiptSha256:createHash('sha256').update(trustedBytes).digest('hex'),inputPath:INPUT,inputSha256:digest(input),feedSha256:feed.sha256,generatedAt:feed.generatedAt,publicationEnabled:false,evidenceMode:'recorded_public_source',networkCheckPerformed:false,provenance,bundles:feed.bundles.map(b=>({id:b.id,members:b.members.map(m=>({id:m.job.id,sourceStatus:m.sourceStatus,checkedAt:m.checkedAt,expiresAt:m.expiresAt,reason:m.reason}))}))};
 await mkdir(directory,{recursive:true});await writeFile(join(directory,'owner-bundles.json'),JSON.stringify(feed,null,2)+'\n');await writeFile(join(directory,'owner-bundle-recorded-check.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)checkRecordedOwnerBundles(process.argv[2],process.argv[3]).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error('Recorded bundle intake stopped: '+e.message);process.exitCode=1;});
