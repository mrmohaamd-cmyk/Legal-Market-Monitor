import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('bundle refresh is serialized after owner job receipt without another schedule or credentials',async()=>{
 const y=await readFile(new URL('../.github/workflows/refresh-opportunities.yml',import.meta.url),'utf8');
 assert.ok(y.indexOf('run: node scripts/publish-owner-jobs.mjs')<y.indexOf('run: node scripts/check-owner-bundles.mjs'));
 assert.ok(y.indexOf('run: node scripts/check-owner-bundles.mjs')<y.indexOf('run: node scripts/publish-owner-bundles.mjs'));
 assert.match(y,/group: verified-opportunity-refresh\n  cancel-in-progress: false/);
 assert.equal((y.match(/cron:/g)||[]).length,1);
 assert.match(y,/'config\/saudilaw-owner-bundles.json'/);
 assert.match(y,/name: owner-bundle-evidence-/);
 assert.ok(!y.includes('REDDIT_TOKEN'));assert.ok(!y.includes('client_secret'));
});
test('recorded release is explicit manual-only with shared concurrency and data-only inputs',async()=>{
 const y=await readFile(new URL('../.github/workflows/release-recorded-owner-bundle.yml',import.meta.url),'utf8');
 assert.match(y,/workflow_dispatch:/);assert.doesNotMatch(y,/\n  (schedule|push):/);
 assert.match(y,/group: verified-opportunity-refresh/);
 assert.match(y,/RECORDED_FEED_JSON: \$\{\{ inputs.feed_json \}\}/);
 assert.match(y,/node scripts\/publish-owner-bundles-recorded.mjs/);
});
