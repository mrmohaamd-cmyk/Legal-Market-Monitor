// Explicit manual release of reviewed recorded evidence, never a scheduler or
// network-check substitute. Requires a clean exact main SHA and one nonforce push.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {canonical,digest,timestamp} from '../contracts/reviewed-content.mjs';
import {validateOwnerBundleFeed,OWNER_BUNDLE_FEED_PATH} from '../contracts/owner-bundle.mjs';
import {RECORDED_RECEIPT_PATH} from './check-owner-bundles-recorded.mjs';
const REPO='mrmohaamd-cmyk/Legal-Market-Monitor',REF='refs/heads/main',INPUT='config/saudilaw-owner-bundles.json';
export const RECORDED_RELEASE_RECEIPT='dist/saudilaw-owner-bundles-recorded-receipt.json';
const command=(args,cwd)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
export function validateRecordedRelease(feed,report,input,trustedBytes,{base,now=Date.now()}={}){
 validateOwnerBundleFeed(feed,{now});
 const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.sort().join(','))throw Error('recorded_report_shape');};
 exact(report,['schema','sourceCommit','provenanceTrust','trustedReceiptPath','trustedReceiptSha256','inputPath','inputSha256','feedSha256','generatedAt','publicationEnabled','evidenceMode','networkCheckPerformed','provenance','bundles']);
 const trusted=JSON.parse(trustedBytes);
 if(report.schema!=='saudilaw-owner-bundle-recorded-check/v1'||report.sourceCommit!==base||report.provenanceTrust!=='operator_reviewed_committed_capture'||report.trustedReceiptPath!==RECORDED_RECEIPT_PATH||report.trustedReceiptSha256!==createHash('sha256').update(trustedBytes).digest('hex')||report.inputPath!==INPUT||report.inputSha256!==digest(input)||report.feedSha256!==feed.sha256||report.generatedAt!==feed.generatedAt||report.publicationEnabled!==false||report.evidenceMode!=='recorded_public_source'||report.networkCheckPerformed!==false||trusted.inputSha256!==digest(input)||trusted.schema!=='saudilaw-programme-source-review/v1')throw Error('recorded_release_binding');
 if(canonical(feed.bundles.map(({members,...b})=>({...b,jobs:members.map(m=>m.job)})))!==canonical(input.bundles)||!Array.isArray(report.provenance)||report.provenance.length>8)throw Error('recorded_release_input');
 const summary=feed.bundles.map(b=>({id:b.id,members:b.members.map(m=>({id:m.job.id,sourceStatus:m.sourceStatus,checkedAt:m.checkedAt,expiresAt:m.expiresAt,reason:m.reason}))}));
 if(canonical(summary)!==canonical(report.bundles))throw Error('recorded_report_summary');
 const urls=new Set(feed.bundles.flatMap(b=>b.members.flatMap(m=>m.proofs.map(p=>p.url)))),seen=new Set();
 for(const r of report.provenance){exact(r,['url','status','originalCheckedAt','checkedAt','rawBodySha256','rawBodyBytes']);if(!urls.has(r.url)||seen.has(r.url))throw Error('recorded_provenance_scope');seen.add(r.url);}
 if(seen.size!==urls.size)throw Error('recorded_provenance_scope');
 for(const b of feed.bundles)for(const m of b.members){
  if(m.sourceStatus!=='verified')throw Error('recorded_release_held');
  for(const p of m.proofs){
   const r=report.provenance.find(r=>r.url===p.url),t=trusted.sources.find(t=>t.url===p.url);
   if(!r||!t||r.status!==200||t.status!==200||t.finalUrl!==p.url||r.originalCheckedAt!==t.checkedAt||r.checkedAt!==p.checkedAt||Date.parse(t.checkedAt)!==timestamp(p.checkedAt)||r.rawBodySha256!==t.bodySha256||r.rawBodyBytes!==t.bodyBytes||timestamp(p.checkedAt)>now||timestamp(p.checkedAt)<=now-43200000||timestamp(m.expiresAt)>timestamp(p.checkedAt)+43200000)throw Error('recorded_release_provenance');
  }
 }
 return true;
}
export async function publishRecordedOwnerBundles(directory,{root=process.cwd(),env=process.env,execute=command,clock=Date.now}={}){
 if(env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!==REF||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')||!directory)throw Error('recorded_manual_workflow_required');
 const git=args=>execute(args,root),one=args=>git(args).trim(),base=env.GITHUB_SHA,remote=()=>one(['ls-remote','--heads','origin',REF]).split(/\s+/)[0];
 if(!['https://github.com/'+REPO,'https://github.com/'+REPO+'.git'].includes(one(['remote','get-url','origin'])))throw Error('wrong_remote');
 const clean=()=>{if(one(['rev-parse','HEAD'])!==base||remote()!==base||one(['status','--porcelain','--untracked-files=no']))throw Error('recorded_main_moved_or_dirty');};clean();
 const feedFile=join(directory,'owner-bundles.json'),reportFile=join(directory,'owner-bundle-recorded-check.json');
 if((await stat(feedFile)).size>500000||(await stat(reportFile)).size>64000)throw Error('recorded_release_budget');
 const feedBytes=await readFile(feedFile,'utf8'),reportBytes=await readFile(reportFile,'utf8'),feed=JSON.parse(feedBytes),report=JSON.parse(reportBytes),inputBytes=await readFile(join(root,INPUT),'utf8'),trustedBytes=git(['show',base+':'+RECORDED_RECEIPT_PATH]);
 const verify=()=>{if(git(['show',base+':'+INPUT])!==inputBytes)throw Error('recorded_input_changed');validateRecordedRelease(feed,report,JSON.parse(inputBytes),trustedBytes,{base,now:clock()});};verify();
 const output=new Map([[OWNER_BUNDLE_FEED_PATH,feedBytes],[RECORDED_RELEASE_RECEIPT,reportBytes]]);
 let different=false;
 for(const [path,bytes] of output){try{if(await readFile(join(root,path),'utf8')!==bytes)different=true;}catch(e){if(e.code!=='ENOENT')throw e;different=true;}}
 if(!different)return {status:'unchanged',commit:base,feedSha256:feed.sha256,evidenceMode:'recorded_public_source',publicationEnabled:false};
 const stable=async()=>{verify();if(await readFile(feedFile,'utf8')!==feedBytes||await readFile(reportFile,'utf8')!==reportBytes||await readFile(join(root,INPUT),'utf8')!==inputBytes)throw Error('recorded_evidence_changed');};
 await stable();clean();
 for(const [path,bytes] of output){await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),bytes);}
 if(one(['rev-parse','HEAD'])!==base||remote()!==base||one(['diff','--cached','--name-only']))throw Error('recorded_main_or_index_changed');
 const changed=one(['diff','--name-only']).split('\n').filter(Boolean);if(changed.some(p=>!output.has(p)))throw Error('recorded_unrelated_changes');
 await stable();git(['add','--',...output.keys()]);
 const staged=one(['diff','--cached','--name-only']).split('\n').filter(Boolean);if(!staged.length||staged.some(p=>!output.has(p))||one(['diff','--name-only']))throw Error('recorded_staged_scope');
 git(['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','chore: release reviewed recorded programme evidence [manual]']);
 const proposed=one(['rev-parse','HEAD']);
 if(one(['rev-parse','HEAD^'])!==base||one(['diff','--name-only',base,proposed]).split('\n').some(p=>!output.has(p)))throw Error('recorded_commit_scope');
 for(const [path,bytes] of output)if(git(['show',proposed+':'+path])!==bytes)throw Error('recorded_commit_bytes');
 await stable();if(one(['rev-parse','HEAD'])!==proposed||remote()!==base||one(['status','--porcelain','--untracked-files=no']))throw Error('recorded_changed_before_push');
 let pushAcknowledged=true;try{git(['push','origin',proposed+':'+REF]);}catch{pushAcknowledged=false;}
 if(remote()!==proposed)throw Error('recorded_push_unconfirmed_no_retry');
 git(['fetch','--no-tags','origin',REF]);
 if(one(['rev-parse','FETCH_HEAD'])!==proposed)throw Error('recorded_remote_unconfirmed');
 for(const [path,bytes] of output)if(git(['show','FETCH_HEAD:'+path])!==bytes)throw Error('recorded_remote_bytes');
 return {status:'confirmed',commit:proposed,previousCommit:base,pushAcknowledged,feedSha256:feed.sha256,evidenceMode:'recorded_public_source',publicationEnabled:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)publishRecordedOwnerBundles(process.env.OWNER_BUNDLE_DIRECTORY).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error('Recorded bundle release stopped: '+e.message);process.exitCode=1;});
