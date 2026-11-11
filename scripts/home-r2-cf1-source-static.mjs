import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildSourceFreeze, verifyUntouchedFiles, manifestOutputPath } from './lib/home-r2-source.mjs';
import { TEXT_HEADER_AUTHORIZED_DIGESTS } from './lib/home-r2-text-header-authority.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const frozen=buildSourceFreeze(root);
for(const [name,expected] of Object.entries(frozen.manifestFiles)) {
  assert.equal(readFileSync(manifestOutputPath(root,name),'utf8'),expected,`derived source drift: ${name}`);
}
assert.ok(verifyUntouchedFiles(root,TEXT_HEADER_AUTHORIZED_DIGESTS)>=21);
const receipt=JSON.parse(readFileSync(manifestOutputPath(root,'receipt.json'),'utf8'));
assert.equal(receipt.sourceStatus,'SOURCE_VALIDATED');
assert.equal(receipt.nativeTextCount,76);
assert.equal(receipt.productCommitAllowed,false);
assert.equal(receipt.physical,'NOT_RUN');
console.log('PASS_SMD_HOME_R2_CF1_SOURCE_FREEZE');
