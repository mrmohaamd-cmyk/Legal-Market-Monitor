// Existing workflow-only, bounded anonymous evidence capture. No GitHub writes.
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {digest} from '../contracts/reviewed-content.mjs';
import {validateOwnerJob} from '../contracts/owner-job.mjs';
import {compileOwnerBundleFeed} from './pipeline/owner-bundle-feed.mjs';
import {createTransport} from './pipeline/transport.mjs';
const INPUT='config/saudilaw-owner-bundles.json';
export async function runOwnerBundleCheck(directory,{root=process.cwd(),env=process.env,clock=Date.now,transportFactory=createTransport}={}){
 if(!directory)throw new Error('owner_check_output_required');
 const inputFile=join(root,INPUT);if((await stat(inputFile)).size>400000)throw new Error('owner_input_budget');
 const inputBytes=await readFile(inputFile,'utf8'),input=JSON.parse(inputBytes);
 if(!input||Object.keys(input).sort().join(',')!=='bundles,schema'||input.schema!=='saudilaw-owner-bundle-input/v1'||!Array.isArray(input.bundles)||input.bundles.length>4)throw new Error('owner_input_schema');
 const jobs=input.bundles.flatMap(b=>b.jobs).map(job=>validateOwnerJob(job,{now:clock(),allowExpired:true}));
 let browser=null;
 if(jobs.some(job=>job.sources.some(source=>source.kind==='browser_dom'))){
  if(!env.PLAYWRIGHT_MODULE)throw new Error('existing_workflow_browser_required');
  const {chromium}=await import(pathToFileURL(resolve(env.PLAYWRIGHT_MODULE)));browser=await chromium.launch({headless:true});
 }
 // Reuse audited HTTP transport in bounded groups; each exact URL first passes
 // fixed employer/domain/path validation in validateOwnerJob.
 const transports=new Map(),transportFailures=[];
 const retrieve=async url=>{
  const index=jobs.findIndex(job=>job.sources.some(source=>source.url===url));
  if(index<0)return {error:'unreviewed_destination'};
  if(!transports.has(index))transports.set(index,transportFactory({allowedUrls:jobs[index].sources.map(source=>source.url),maxRequests:8,totalMs:60000}));
  const result=await transports.get(index)(url);
  if(result.error)transportFailures.push({url,status:result.status??null,reason:result.error});
  return result;
 };
 const evidence=[];
 try{
  const feed=await compileOwnerBundleFeed({bundles:input.bundles,retrieve,browser,clock,onSourceObserved:proof=>evidence.push({...proof,visibleText:proof.visibleText.slice(0,50000),visibleTextTruncated:proof.visibleText.length>50000})});
  const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const report={schema:'saudilaw-owner-bundle-check/v1',sourceCommit,workflowSourceCommit:env.GITHUB_SHA??sourceCommit,inputPath:INPUT,inputSha256:digest(input),feedSha256:feed.sha256,generatedAt:feed.generatedAt,publicationEnabled:false,
   bundles:feed.bundles.map(b=>({id:b.id,members:b.members.map(item=>({id:item.job.id,sourceStatus:item.sourceStatus,reason:item.reason}))})),evidence,transportFailures};
  await mkdir(directory,{recursive:true});
  await writeFile(join(directory,'owner-bundles.json'),JSON.stringify(feed,null,2)+'\n');
  await writeFile(join(directory,'owner-bundle-check.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({schema:report.schema,feedSha256:feed.sha256,bundles:report.bundles,publicationEnabled:false}));return report;
 }finally{await browser?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)runOwnerBundleCheck(process.argv[2]).catch(error=>{console.error('Owner job check stopped: '+error.message);process.exitCode=1;});
