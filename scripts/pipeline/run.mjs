// Explicit local/cloud CLI. No scheduler, GitHub writes, Reddit access or credentials.
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compilePipeline,validateEnvelope,POLICY} from './core.mjs';
import {WHITE_CASE} from './catalogue.mjs';
import {createTransport} from './transport.mjs';

async function readJson(file,maxBytes) {
  if ((await stat(file)).size > maxBytes) throw new Error('input_file_budget');
  const bytes = await readFile(file);
  if (bytes.length > maxBytes) throw new Error('input_file_budget');
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function summarize(snapshot,now=Date.now()) {
  let health;
  try { validateEnvelope(snapshot,{now}); health='fresh_preview'; }
  catch (error) { health=error.message; }
  return {
    schema_version:1,health,publication_enabled:false,
    snapshot_sha256:snapshot.sha256,
    generated_at:snapshot.generated_at,expires_at:snapshot.expires_at,
    verified_previews:snapshot.previews?.length ?? 0,
    accepted_for_publication:0,quarantine:snapshot.quarantine ?? [],
    next_action:snapshot.run?.next_action ?? 'Inspect failed run; do not publish.',
    reddit:{observed:false,note:'This command does not connect to Reddit or change Job bot status, Start or Stop.'}
  };
}
export async function run(args=process.argv.slice(2)) {
  if (args[0] === '--status' && args.length === 2) {
    const snapshot = await readJson(args[1],POLICY.max_output_bytes);
    const status = summarize(snapshot);
    console.log(JSON.stringify(status,null,2));
    if (status.health !== 'fresh_preview') process.exitCode=2;
    return status;
  }
  if (args[0] !== '--check-live' || args.length > 2)
    throw new Error('Usage: node scripts/pipeline/run.mjs --check-live [input-feed.json] OR --status snapshot.json');
  const feed = await readJson(args[1] || 'dist/opportunities.json',1000000);
  const retrieve = createTransport({allowedUrls:[
    WHITE_CASE.reviewedRecord.source_url,WHITE_CASE.reviewedRecord.firm_careers_url
  ],maxRequests:2,totalMs:45000});
  const snapshot = await compilePipeline({feed,retrieve});
  const outputDir=resolve('pipeline-results');
  await mkdir(outputDir,{recursive:true});
  const output=join(outputDir,snapshot.sha256+'.json');
  const body=JSON.stringify(snapshot,null,2)+'\n';
  try { await writeFile(output,body,{flag:'wx',mode:0o600}); }
  catch (error) {
    if (error.code !== 'EEXIST' || await readFile(output,'utf8') !== body) throw error;
  }
  console.log(JSON.stringify({...summarize(snapshot),output,transport:retrieve.stats},null,2));
  return snapshot;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  run().catch(error => {
    console.error(JSON.stringify({health:'run_failed',publication_enabled:false,error:error.message}));
    process.exitCode=1;
  });
