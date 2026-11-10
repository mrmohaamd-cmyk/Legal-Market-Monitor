// The existing cloud workflow may renew only this nonpublishing coverage file.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,stat,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SOURCE_COVERAGE_PATH,validateSourceCoverage} from '../contracts/source-coverage.mjs';
import {SOURCE_COVERAGE_CATALOGUE as catalogue,SOURCE_COVERAGE_DISPOSITIONS as reviewedDispositions} from './pipeline/coverage-catalogue.mjs';
const REPO='mrmohaamd-cmyk/Legal-Market-Monitor',REF='refs/heads/main',CANDIDATE_PATH='dist/saudilaw-publication-candidates.json';
const command=(args,cwd)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const hash=x=>/^[a-f0-9]{40}$/.test(x??'');
export async function publishSourceCoverage(directory,{candidateDirectory,root=process.cwd(),env=process.env,execute=command,clock=Date.now}={}){
 if(env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!==REF||!['schedule','workflow_dispatch','push'].includes(env.GITHUB_EVENT_NAME)||!hash(env.GITHUB_SHA)||!directory||!candidateDirectory)throw new Error('canonical_workflow_required');
 const git=args=>execute(args,root),one=args=>git(args).trim(),head=()=>one(['rev-parse','HEAD']),remote=()=>one(['ls-remote','--heads','origin',REF]).split(/\s+/)[0];
 if(![`https://github.com/${REPO}`,`https://github.com/${REPO}.git`].includes(one(['remote','get-url','origin'])))throw new Error('wrong_remote');
 const receipt=JSON.parse(await readFile(join(candidateDirectory,'candidate-write-receipt.json'),'utf8'));
 const base=receipt.commit;
 if(!hash(base)||receipt.publication_enabled!==false||!['confirmed','unchanged'].includes(receipt.status)||receipt.status==='confirmed'&&receipt.previous_commit!==env.GITHUB_SHA||receipt.status==='unchanged'&&base!==env.GITHUB_SHA)throw new Error('candidate_parent_not_confirmed');
 if(base!==env.GITHUB_SHA&&(one(['rev-parse',base+'^'])!==env.GITHUB_SHA||one(['diff','--name-only',env.GITHUB_SHA,base])!==CANDIDATE_PATH))throw new Error('unexpected_candidate_parent');
 if(head()!==base||remote()!==base||one(['status','--porcelain','--untracked-files=no']))throw new Error('main_moved_or_dirty');
 const file=join(directory,'source-coverage.json'),reportFile=join(directory,'source-coverage-check.json');
 for(const p of [file,reportFile])if((await stat(p)).size>256000)throw new Error('coverage_budget');
 const bytes=await readFile(file,'utf8'),reportBytes=await readFile(reportFile,'utf8'),artifact=JSON.parse(bytes),report=JSON.parse(reportBytes);
 const validate=()=>validateSourceCoverage(artifact,{catalogue,reviewedDispositions,now:clock()});validate();
 if(report.schema!=='saudilaw-source-coverage-check/v1'||report.sourceCommit!==base||report.workflowSourceCommit!==env.GITHUB_SHA||report.coverageSha256!==artifact.sha256||report.generatedAt!==artifact.generated_at||report.publicationEnabled!==false)throw new Error('source_binding_mismatch');
 const target=join(root,SOURCE_COVERAGE_PATH);let old=null;try{old=await readFile(target,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 if(old===bytes)return {status:'unchanged',commit:base,coverageSha256:artifact.sha256,publicationEnabled:false};
 const unchanged=async()=>{validate();if(await readFile(file,'utf8')!==bytes||await readFile(reportFile,'utf8')!==reportBytes)throw new Error('coverage_evidence_changed');};
 await unchanged();await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
 if(head()!==base||remote()!==base||one(['diff','--cached','--name-only']))throw new Error('main_or_index_changed');
 const changed=one(['diff','--name-only']);
 if(changed&&changed!==SOURCE_COVERAGE_PATH)throw new Error('unrelated_changes');
 if(await readFile(target,'utf8')!==bytes)throw new Error('target_changed');
 await unchanged();git(['add','--',SOURCE_COVERAGE_PATH]);
 if(one(['diff','--cached','--name-only'])!==SOURCE_COVERAGE_PATH||one(['diff','--name-only']))throw new Error('unexpected_staged_scope');
 git(['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','chore: renew verified source coverage and pending review drafts [automated]']);
 const proposed=head();
 if(!hash(proposed)||one(['rev-parse','HEAD^'])!==base||one(['diff','--name-only',base,proposed])!==SOURCE_COVERAGE_PATH||git(['show',`${proposed}:${SOURCE_COVERAGE_PATH}`])!==bytes)throw new Error('unexpected_coverage_commit');
 await unchanged();if(head()!==proposed||remote()!==base||one(['status','--porcelain','--untracked-files=no']))throw new Error('changed_before_push');
 let pushAcknowledged=true;try{git(['push','origin',`${proposed}:${REF}`]);}catch{pushAcknowledged=false;}
 if(remote()!==proposed)throw new Error('push_unconfirmed_no_retry');
 git(['fetch','--no-tags','origin',REF]);
 if(one(['rev-parse','FETCH_HEAD'])!==proposed||git(['show',`FETCH_HEAD:${SOURCE_COVERAGE_PATH}`])!==bytes||head()!==proposed)throw new Error('remote_bytes_unconfirmed');
 return {status:'confirmed',commit:proposed,previousCommit:base,workflowSourceCommit:env.GITHUB_SHA,pushAcknowledged,coverageSha256:artifact.sha256,publicationEnabled:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const receipt=await publishSourceCoverage(process.env.SOURCE_COVERAGE_DIRECTORY,{candidateDirectory:process.env.SOURCE_CANDIDATE_DIRECTORY});await writeFile(join(process.env.SOURCE_COVERAGE_DIRECTORY,'coverage-write-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
 catch(error){console.error('Coverage write stopped: '+error.message);process.exitCode=1;}
}
