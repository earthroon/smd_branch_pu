import { fileURLToPath } from 'node:url';
import { sourceArgs, loadSources, generateManifests, freezeArtifacts, verifyArtifacts } from './lib/cf00-manifest.mjs';

try {
  const options = sourceArgs(process.argv.slice(2));
  const manifests = generateManifests(loadSources(options));
  const target = fileURLToPath(new URL('../docs/migration/cf00/', import.meta.url));
  freezeArtifacts(target, manifests);
  verifyArtifacts(target, manifests);
  console.log('PASS_SMD_NUXT_R2_CF00_SOURCE_BASELINE_FREEZE');
  console.log(JSON.stringify({ sourceFileCount: manifests['source-manifest.json'].files.length, exportCount: manifests['content-baseline.json'].exports.length, routeCount: manifests['route-section-manifest.json'].routeCount, browserReference: 'UNKNOWN' }));
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
