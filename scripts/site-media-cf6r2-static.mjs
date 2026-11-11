import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>readFileSync(resolve(root,f),'utf8');
const pin=JSON.parse(read('vendor/content-contracts/RELEASE.json'));
assert.equal(pin.version,'0.7.0');
const validator=read('server/utils/site-media-v5-render.ts');
for(const s of ['validatePagesDocumentV2','LEGACY_PAGE_IDS','canonicalSlots(selected.slots)',
  'CMS_RENDER_V5_CONTRACT_INVALID'])assert.ok(validator.includes(s),s);
const fixtures=read('scripts/tests/site-media-cf6r2-public.test.mjs');
for(const s of ['notice-alpha','unregistered CMS block','mismatched published selected slots'])
 assert.ok(fixtures.includes(s));
console.log('PASS_SMD_CF6R2_PUBLIC_STATIC');
