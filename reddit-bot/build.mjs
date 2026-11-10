import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { parseAppConfig } from '@devvit/shared-types/schemas/config-file.v1.js';
parseAppConfig(await readFile('devvit.json', 'utf8'), false);
console.log('Devvit configuration passes the pinned 0.15.2 SDK schema.');
// Bundles locally only. No Devvit CLI, credentials, upload, playtest or installation.
await build({
  entryPoints: ['server/index.ts'], bundle: true, platform: 'node',
  target: 'node24', format: 'cjs', outfile: 'build/server/index.cjs',
  sourcemap: true, logLevel: 'info'
});
