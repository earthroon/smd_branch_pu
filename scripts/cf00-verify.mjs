import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sourceArgs, loadSources, generateManifests, verifyArtifacts } from './lib/cf00-manifest.mjs';
import { CF01_CHANGED, CF01_NEW, sha256 } from './lib/cf00-reference.mjs';

try {
  const args = sourceArgs(process.argv.slice(2));
  const manifests = generateManifests(loadSources(args));
  const target = fileURLToPath(new URL('../docs/migration/cf00/', import.meta.url));
  verifyArtifacts(target, manifests);
  const root = fileURLToPath(new URL('../', import.meta.url));
  const exempt = new Set([...CF01_CHANGED, ...CF01_NEW]);
  const violations = [];
  for (const [path, digest] of Object.entries(manifests['receipt.json'].parentFileHashes)) {
    if (exempt.has(path)) continue;
    let actual;
    try { actual = sha256(readFileSync(join(root, path))); } catch { actual = 'MISSING'; }
    if (actual !== digest) violations.push(path);
  }
  if (violations.length) throw new Error(`CF00_UNAUTHORIZED_PARENT_DRIFT: ${violations.join(', ')}`);
  if (sha256(readFileSync(join(root, 'app/assets/css/main.css'))) !== manifests['style-asset-manifest.json'].sourceCssSha256) {
    throw new Error('CF00_STYLE_TOKEN_DRIFT: CSS byte identity broken');
  }
  console.log('PASS_SMD_NUXT_R2_CF00_SOURCE_BASELINE_FREEZE');
  console.log(JSON.stringify({ verifiedOriginalFiles: manifests['source-manifest.json'].files.length, unmodifiedParentFilesChecked: Object.keys(manifests['receipt.json'].parentFileHashes).length - CF01_CHANGED.length, unexpectedDrifts: 0 }));
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
