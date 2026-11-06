// Native GitHub CLI + git. This only changes the dedicated draft-review branch.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REFRESH_BRANCH = 'automation/source-refresh-review';
export const PR_MARKER = '<!-- legal-monitor-verified-refresh:v1 -->';
const BOT_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com';
const COMMIT_MESSAGE = 'chore: propose verified source refresh [automated]';
const run = (command, args) => execFileSync(command, args, {encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();

export function checkReviewOwnership(pr, commits = [], files = []) {
  if (pr && (!pr.isDraft || !pr.body?.includes(PR_MARKER))) throw new Error('Existing PR is ready for review or is not owned by this workflow; refusing to overwrite it.');
  if (commits.some(commit => commit.email !== BOT_EMAIL || commit.subject !== COMMIT_MESSAGE)) throw new Error('The review branch has human or unrecognized commits. Preserve them and resolve the branch manually.');
  if (files.some(file => !['dist/opportunities.json','docs/latest-source-check.md'].includes(file))) throw new Error('The review branch contains files outside the generated feed and evidence report.');
}

export async function proposeRefresh(directory = process.env.SOURCE_CHECK_DIRECTORY, {execute = run, files = {copyFile,readFile,writeFile}, env = process.env} = {}) {
  const command = execute;
  if (env.GITHUB_REPOSITORY !== 'mrmohaamd-cmyk/Legal-Market-Monitor' || env.GITHUB_REF !== 'refs/heads/main') throw new Error('Draft refresh may run only in the canonical repository on main.');
  if (!directory) throw new Error('SOURCE_CHECK_DIRECTORY is required.');
  const prs = JSON.parse(command('gh', ['pr','list','--head',REFRESH_BRANCH,'--state','open','--json','number,isDraft,body']));
  if (prs.length > 1) throw new Error('More than one open refresh PR; manual review is required.');
  const pr = prs[0];
  checkReviewOwnership(pr);
  const previous = command('git', ['ls-remote','--heads','origin',`refs/heads/${REFRESH_BRANCH}`]).split(/\s/)[0] || '';
  if (previous) {
    command('git', ['fetch','origin',`refs/heads/${REFRESH_BRANCH}`]);
    const commits = command('git', ['log','--format=%ae%x09%s','origin/main..FETCH_HEAD']).split('\n').filter(Boolean).map(line => {const [email,subject] = line.split('\t'); return {email,subject};});
    const files = command('git', ['diff','--name-only','origin/main...FETCH_HEAD']).split('\n').filter(Boolean);
    checkReviewOwnership(pr, commits, files);
  }
  // Closing an unmerged proposal is a human decision, not a request to recreate it.
  if (!pr) {
    const prior = JSON.parse(command('gh', ['pr','list','--head',REFRESH_BRANCH,'--state','closed','--limit','1','--json','number,mergedAt']));
    if (prior[0] && !prior[0].mergedAt) throw new Error('The previous proposal was closed without merging. Reopen it before automatic updates; evidence artifacts are retained.');
  }
  await files.copyFile(join(directory, 'proposed-opportunities.json'), 'dist/opportunities.json');
  await files.copyFile(join(directory, 'source-check.md'), 'docs/latest-source-check.md');
  command('node', ['validate.mjs']);
  command('git', ['checkout','-b',REFRESH_BRANCH]);
  command('git', ['config','user.name','github-actions[bot]']);
  command('git', ['config','user.email',BOT_EMAIL]);
  command('git', ['add','--','dist/opportunities.json','docs/latest-source-check.md']);
  if (!command('git', ['diff','--cached','--name-only'])) { console.log('No generated changes.'); return; }
  command('git', ['commit','-m',COMMIT_MESSAGE]);
  // The lease prevents a simultaneous human edit from being lost after inspection.
  command('git', ['push',`--force-with-lease=refs/heads/${REFRESH_BRANCH}:${previous}`,'origin',`HEAD:refs/heads/${REFRESH_BRANCH}`]);
  const bodyFile = join(directory, 'pull-request-body.md');
  await files.writeFile(bodyFile, `${PR_MARKER}\n\nFresh source evidence and proposed availability updates for review. This is a draft; merging publishes through the existing Pages workflow and requires owner authorization. No merge or deployment is performed by the source checker.\n\nThe generated branch is owned by this workflow. Mark the PR ready for review to pause automatic replacement before editing it. All checks below ran against public first-party routes without logging in or submitting forms.\n\nValidation: automated checker tests and site validation run before proposing changes. GITHUB_TOKEN-created PRs do not trigger ordinary pull_request workflows; the proposed feed is also browser-tested in this workflow before branch changes.\n\n${await files.readFile(join(directory, 'source-check.md'), 'utf8')}`);
  if (pr) command('gh', ['pr','edit',String(pr.number),'--title','Review verified opportunity refresh','--body-file',bodyFile]);
  else command('gh', ['pr','create','--draft','--base','main','--head',REFRESH_BRANCH,'--title','Review verified opportunity refresh','--body-file',bodyFile]);
  console.log(`Prepared draft review on ${REFRESH_BRANCH}; no merge or deployment requested.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await proposeRefresh();
