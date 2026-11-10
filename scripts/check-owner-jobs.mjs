// Existing workflow-only, bounded anonymous evidence capture. No GitHub writes.
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {digest} from '../contracts/reviewed-content.mjs';
import {validateOwnerJob} from '../contracts/owner-job.mjs';
import {compileOwnerJobFeed} from './pipeline/owner-job-feed.mjs';
import {createTransport} from './pipeline/transport.mjs';
const INPUT='config/saudilaw-owner-jobs.json';
export async function runOwnerJobCheck(directory,{root=process.cwd(),env=process.env,clock=Date.now}={}){
 if(!directory)throw new Error('owner_check_output_required');
 const inputFile=join(root,INPUT);if((await stat(inputFile)).size>400000)throw new Error('owner_input_budget');
 const inputBytes=await readFile(inputFile,'utf8'),input=JSON.parse(inputBytes);
 if(!input||Object.keys(input).sort().join(',')!=='jobs,schema'||input.schema!=='saudilaw-owner-job-input/v1'||!Array.isArray(input.jobs)||input.jobs.length>12)throw new Error('owner_input_schema');
 const jobs=input.jobs.map(job=>validateOwnerJob(job,{now:clock(),allowExpired:true}));
 let browser=null;
 if(jobs.some(job=>job.sources.some(source=>source.kind==='browser_dom'))){
  if(!env.PLAYWRIGHT_MODULE)throw new Error('existing_workflow_browser_required');
  const {chromium}=await import(pathToFileURL(resolve(env.PLAYWRIGHT_MODULE)));browser=await chromium.launch({headless:true});
 }
 // Reuse audited HTTP transport in bounded groups; each exact URL first passes
 // fixed employer/domain/path validation in validateOwnerJob.
 const transports=jobs.map(job=>createTransport({allowedUrls:job.sources.map(source=>source.url),maxRequests:5,totalMs:60000}));
 const retrieve=async url=>{const index=jobs.findIndex(job=>job.sources.some(source=>source.url===url));return index<0?{error:'unreviewed_destination'}:transports[index](url);};
 const evidence=[];
 try{
  const feed=await compileOwnerJobFeed({jobs,retrieve,browser,clock,onSourceObserved:proof=>evidence.push({...proof,visibleText:proof.visibleText.slice(0,50000),visibleTextTruncated:proof.visibleText.length>50000})});
  const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const report={schema:'saudilaw-owner-job-check/v1',sourceCommit,workflowSourceCommit:env.GITHUB_SHA??sourceCommit,inputPath:INPUT,inputSha256:digest(input),feedSha256:feed.sha256,generatedAt:feed.generatedAt,publicationEnabled:false,
   jobs:feed.jobs.map(item=>({id:item.job.id,sourceStatus:item.sourceStatus,reason:item.reason})),evidence};
  await mkdir(directory,{recursive:true});
  await writeFile(join(directory,'owner-jobs.json'),JSON.stringify(feed,null,2)+'\n');
  await writeFile(join(directory,'owner-job-check.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({schema:report.schema,feedSha256:feed.sha256,jobs:report.jobs,publicationEnabled:false}));return report;
 }finally{await browser?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)runOwnerJobCheck(process.argv[2]).catch(error=>{console.error('Owner job check stopped: '+error.message);process.exitCode=1;});
