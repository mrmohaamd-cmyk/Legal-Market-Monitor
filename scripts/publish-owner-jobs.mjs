// Narrow fixed-main writer for nonpublishing data. Existing GitHub credential,
// cadence and concurrency group only. An unacknowledged push is never retried.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,stat,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {canonical,digest} from '../contracts/reviewed-content.mjs';
import {OWNER_JOB_FEED_PATH,MAX_OWNER_JOB_FEED_BYTES,validateOwnerJobFeed} from '../contracts/owner-job.mjs';
const REPO='mrmohaamd-cmyk/Legal-Market-Monitor',REF='refs/heads/main',INPUT='config/saudilaw-owner-jobs.json';
const PRECEDING=new Set(['dist/saudilaw-publication-candidates.json','dist/saudilaw-source-coverage.json']);
const hash=value=>/^[a-f0-9]{40}$/.test(value??'');
const command=(args,cwd)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
export async function publishOwnerJobs(directory,{coverageDirectory,root=process.cwd(),env=process.env,execute=command,clock=Date.now}={}){
 if(env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!==REF||!['schedule','workflow_dispatch','push'].includes(env.GITHUB_EVENT_NAME)||!hash(env.GITHUB_SHA)||!directory||!coverageDirectory)throw new Error('canonical_workflow_required');
 const git=args=>execute(args,root),one=args=>git(args).trim(),head=()=>one(['rev-parse','HEAD']),remote=()=>one(['ls-remote','--heads','origin',REF]).split(/\s+/)[0];
 if(![`https://github.com/${REPO}`,`https://github.com/${REPO}.git`].includes(one(['remote','get-url','origin'])))throw new Error('wrong_remote');
 const prior=JSON.parse(await readFile(join(coverageDirectory,'coverage-write-receipt.json'),'utf8')),base=prior.commit;
 if(!hash(base)||!['confirmed','unchanged'].includes(prior.status)||prior.publicationEnabled!==false)throw new Error('coverage_parent_unconfirmed');
 if(head()!==base||remote()!==base||one(['status','--porcelain','--untracked-files=no']))throw new Error('main_moved_or_dirty');
 // Only the two already-audited artifact writes may precede this step in the
 // same workflow; arbitrary intervening code or configuration changes reject.
 let cursor=base;const seenPaths=new Set();
 for(let i=0;cursor!==env.GITHUB_SHA&&i<2;i++){
  const parent=one(['rev-parse',cursor+'^']),changed=one(['diff','--name-only',parent,cursor]);
  if(!hash(parent)||!PRECEDING.has(changed)||seenPaths.has(changed))throw new Error('unexpected_workflow_parent');
  seenPaths.add(changed);cursor=parent;
 }
 if(cursor!==env.GITHUB_SHA)throw new Error('unexpected_workflow_parent');
 const file=join(directory,'owner-jobs.json'),reportFile=join(directory,'owner-job-check.json');
 if((await stat(file)).size>MAX_OWNER_JOB_FEED_BYTES||(await stat(reportFile)).size>5000000)throw new Error('owner_artifact_budget');
 const bytes=await readFile(file,'utf8'),reportBytes=await readFile(reportFile,'utf8'),feed=JSON.parse(bytes),report=JSON.parse(reportBytes),inputBytes=await readFile(join(root,INPUT),'utf8');
 const validate=()=>validateOwnerJobFeed(feed,{now:clock()});validate();
 if(report.schema!=='saudilaw-owner-job-check/v1'||report.sourceCommit!==base||report.workflowSourceCommit!==env.GITHUB_SHA||report.inputPath!==INPUT||report.inputSha256!==digest(JSON.parse(inputBytes))||report.feedSha256!==feed.sha256||report.generatedAt!==feed.generatedAt||report.publicationEnabled!==false)throw new Error('owner_source_binding');
 if(canonical(feed.jobs.map(item=>item.job))!==canonical(JSON.parse(inputBytes).jobs)||git(['show',`${env.GITHUB_SHA}:${INPUT}`])!==inputBytes)throw new Error('owner_input_changed');
 const target=join(root,OWNER_JOB_FEED_PATH);let old=null;try{old=await readFile(target,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(old===bytes)return {status:'unchanged',commit:base,feedSha256:feed.sha256,publicationEnabled:false};
 const unchanged=async()=>{validate();if(await readFile(file,'utf8')!==bytes||await readFile(reportFile,'utf8')!==reportBytes||await readFile(join(root,INPUT),'utf8')!==inputBytes)throw new Error('owner_evidence_changed');};
 await unchanged();await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
 if(head()!==base||remote()!==base||one(['diff','--cached','--name-only']))throw new Error('main_or_index_changed');
 const changed=one(['diff','--name-only']);if(changed&&changed!==OWNER_JOB_FEED_PATH)throw new Error('unrelated_changes');
 if(await readFile(target,'utf8')!==bytes)throw new Error('target_changed');
 await unchanged();git(['add','--',OWNER_JOB_FEED_PATH]);
 if(one(['diff','--cached','--name-only'])!==OWNER_JOB_FEED_PATH||one(['diff','--name-only']))throw new Error('unexpected_staged_scope');
 git(['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','chore: refresh owner-review job evidence [automated]']);
 const proposed=head();
 if(!hash(proposed)||one(['rev-parse','HEAD^'])!==base||one(['diff','--name-only',base,proposed])!==OWNER_JOB_FEED_PATH||git(['show',`${proposed}:${OWNER_JOB_FEED_PATH}`])!==bytes)throw new Error('unexpected_owner_job_commit');
 await unchanged();if(head()!==proposed||remote()!==base||one(['status','--porcelain','--untracked-files=no']))throw new Error('changed_before_push');
 let pushAcknowledged=true;try{git(['push','origin',`${proposed}:${REF}`]);}catch{pushAcknowledged=false;}
 if(remote()!==proposed)throw new Error('push_unconfirmed_no_retry');
 git(['fetch','--no-tags','origin',REF]);
 if(one(['rev-parse','FETCH_HEAD'])!==proposed||git(['show',`FETCH_HEAD:${OWNER_JOB_FEED_PATH}`])!==bytes||head()!==proposed)throw new Error('remote_bytes_unconfirmed');
 return {status:'confirmed',commit:proposed,previousCommit:base,workflowSourceCommit:env.GITHUB_SHA,pushAcknowledged,feedSha256:feed.sha256,publicationEnabled:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const receipt=await publishOwnerJobs(process.env.OWNER_JOB_DIRECTORY,{coverageDirectory:process.env.SOURCE_COVERAGE_DIRECTORY});await writeFile(join(process.env.OWNER_JOB_DIRECTORY,'owner-jobs-write-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
 catch(error){console.error('Owner job write stopped: '+error.message);process.exitCode=1;}
}
