import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { evaluateFeed, renderPost } from './lib/core.mjs';
import { readPublishedFeed } from './transport.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--published')) throw new Error('Only --published is supported. No live-post mode exists.');
const now = Date.now();
const { feed, provenance } = args.includes('--published') ? await readPublishedFeed() : {
  feed: JSON.parse(await readFile(new URL('../dist/opportunities.json', import.meta.url), 'utf8')),
  provenance: { source: 'Local repository snapshot; not a new employer availability check.' }
};
const report = evaluateFeed(feed, { now });
const output = fileURLToPath(new URL('./preview-output/', import.meta.url));
await mkdir(output, { recursive: true });
const summary = {
  evaluatedAt: new Date(now).toISOString(), mode: 'dry-run', posted: 0, provenance,
  valid: report.valid, errors: report.errors,
  candidates: report.candidates.map(record => record.id), skipped: report.skipped
};
await writeFile(join(output, 'report.json'), JSON.stringify(summary, null, 2) + '\n');
const markdown = `# Reddit jobs preview — NOT POSTED\n\nEvaluated ${summary.evaluatedAt}. ` +
  'Each draft below would be a separate post. This preview does not reverify employers or update feed evidence. ' +
  'Live posting is locked; there is no recurring schedule.\n\n' +
  `Provenance: ${JSON.stringify(provenance)}\n\n` +
  (report.valid ? `${report.candidates.length} eligible drafts; ${report.skipped.length} excluded records.\n\n` : `Feed rejected: ${report.errors.join('; ')}\n\n`) +
  report.candidates.map(record => {
    const post = renderPost(record);
    return `---\n\n## ${post.title}\n\n${post.text}\n`;
  }).join('\n') + '\n## Excluded records\n\n' +
  report.skipped.map(item => `- ${item.id}: ${item.reasons.join(' ')}`).join('\n') + '\n';
await writeFile(join(output, 'posts.md'), markdown);
console.log(JSON.stringify({ ...summary, output }, null, 2));
if (!report.valid) process.exitCode = 1;
