// Writes one review-only JSON artifact on the existing main branch. No force,
// no automatic merge, no Reddit transport, and no persistent credential.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {CANDIDATE_PATH,validateReviewCandidate,digest,stable} from './review-candidate.mjs';
const REPO='mrmohaamd-cmyk/Legal-Market-Monitor';
const ref='refs/heads/main';
const command=(args,cwd)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const oneLine=value=>value.trim();
export async function publishReviewCandidate(directory,{root=process.cwd(),env=process.env,execute=command,clock=Date.now}={}){
  if(env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!==ref||!['schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??''))throw new Error('Candidate write requires the existing canonical main workflow.');
  if(!directory)throw new Error('Candidate evidence directory required.');
  const expected=env.GITHUB_SHA,git=args=>execute(args,root),head=()=>oneLine(git(['rev-parse','HEAD']));
  const remote=()=>oneLine(git(['ls-remote','--heads','origin',ref])).split(/\s+/)[0];
  const origin=oneLine(git(['remote','get-url','origin']));
  if(![`https://github.com/${REPO}`,`https://github.com/${REPO}.git`].includes(origin))throw new Error('Unexpected candidate remote.');
  if(head()!==expected||remote()!==expected)throw new Error('Main moved; rerun verification from its new reviewed source.');
  if(oneLine(git(['status','--porcelain','--untracked-files=no'])))throw new Error('Tracked checkout must be clean before artifact preparation.');
  const candidateFile=join(directory,'saudilaw-publication-candidates.json'),reportFile=join(directory,'candidate-source-check.json');
  for(const path of [candidateFile,reportFile])if((await stat(path)).size>256000)throw new Error('Candidate evidence file too large.');
  const candidateBytes=await readFile(candidateFile,'utf8'),reportBytes=await readFile(reportFile,'utf8');
  const candidate=JSON.parse(candidateBytes),report=JSON.parse(reportBytes);
  validateReviewCandidate(candidate,{now:clock()});
  if(report.schema!=='saudilaw-public-source-check/v1'||report.source_commit!==expected||report.publication_enabled!==false||report.accepted_count!==0||digest(report)!==candidate.upstream_sha256||report.generated_at!==candidate.generated_at)throw new Error('Producer source/evidence binding mismatch.');
  if(candidate.candidates.length&&(report.status!=='review_only'||report.reason!=='translation_review_pending'||!stable(report.evidence)||stable(report.evidence)!==stable(candidate.candidates[0].evidence.provenance)))throw new Error('Source proof and candidate do not agree.');
  if(!candidate.candidates.length&&(report.status!=='withheld'||report.reason!==candidate.quarantine.find(q=>q.id===report.record_id)?.reason))throw new Error('Withheld source reason missing.');
  const target=join(root,CANDIDATE_PATH);
  if(await readFile(target,'utf8')===candidateBytes)return {status:'unchanged',commit:expected,publication_enabled:false};
  const unchangedInputs=async()=>{
    if(await readFile(candidateFile,'utf8')!==candidateBytes||await readFile(reportFile,'utf8')!==reportBytes)throw new Error('Candidate evidence changed during preparation.');
    validateReviewCandidate(candidate,{now:clock()});
  };
  await unchangedInputs();
  await writeFile(target,candidateBytes,'utf8');
  if(head()!==expected||remote()!==expected)throw new Error('Main changed before commit; no push attempted.');
  const changed=oneLine(git(['diff','--name-only']));
  if(changed!==CANDIDATE_PATH||oneLine(git(['diff','--cached','--name-only'])))throw new Error('Only the fixed candidate file may change.');
  if(await readFile(target,'utf8')!==candidateBytes)throw new Error('Candidate target changed.');
  await unchangedInputs();
  git(['add','--',CANDIDATE_PATH]);
  if(oneLine(git(['diff','--cached','--name-only']))!==CANDIDATE_PATH||oneLine(git(['diff','--name-only'])))throw new Error('Unexpected staged or unstaged changes.');
  git(['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','chore: renew unchanged review-only candidate evidence [automated]']);
  const proposed=head();
  if(!/^[a-f0-9]{40}$/.test(proposed)||oneLine(git(['rev-parse','HEAD^']))!==expected||oneLine(git(['diff','--name-only',expected,proposed]))!==CANDIDATE_PATH)throw new Error('Unexpected publication commit.');
  if(git(['show',`${proposed}:${CANDIDATE_PATH}`])!==candidateBytes)throw new Error('Committed candidate bytes differ from the reviewed artifact; no push attempted.');
  await unchangedInputs();
  if(oneLine(git(['status','--porcelain','--untracked-files=no']))||remote()!==expected||head()!==proposed)throw new Error('Main or producer files changed before push; no push attempted.');
  let pushAcknowledged=true;
  try{git(['push','origin',`${proposed}:${ref}`]);}catch{pushAcknowledged=false;}
  // Independently inspect after both success and uncertainty. Never retry a push.
  if(remote()!==proposed)throw new Error('Candidate push is unconfirmed or superseded; no retry attempted.');
  git(['fetch','--no-tags','origin',ref]);
  if(oneLine(git(['rev-parse','FETCH_HEAD']))!==proposed||git(['show',`FETCH_HEAD:${CANDIDATE_PATH}`])!==candidateBytes||head()!==proposed)throw new Error('Remote candidate commit/blob or local producer state could not be confirmed.');
  return {status:'confirmed',commit:proposed,previous_commit:expected,push_acknowledged:pushAcknowledged,candidate_sha256:candidate.sha256,preview_count:candidate.candidates.length,reason:report.reason,publication_enabled:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const directory=process.env.SOURCE_CANDIDATE_DIRECTORY;
  try{
    const receipt=await publishReviewCandidate(directory);
    await writeFile(join(directory,'candidate-write-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
    console.log(JSON.stringify(receipt));
  }catch(error){console.error(`Review candidate write stopped: ${error.message}`);process.exitCode=1;}
}
