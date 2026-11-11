import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {curriculumR1Source} from '../../app/data/curriculum-r1-manifest.ts';
import {curriculumSourceText} from '../../app/data/curriculum-r1-copy.generated.ts';
import {curriculumSourceShapes} from '../../app/data/curriculum-r1-shapes.generated.ts';
import {curriculumSourceAssets} from '../../app/data/curriculum-r1-assets.generated.ts';
import {assertCurriculumR1Source} from '../../app/utils/curriculumR1Admission.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
export function verifyCurriculumSource(project=root) {
  assertCurriculumR1Source();
  const raw=readFileSync(resolve(project,'docs/migration/smd-curriculum-r1/source-manifest.json'));
  assert.equal(sha(raw),'8fb11f0fcf0a0c08582ccc233fc382c3c95c1e7ddef582dfda0b9c150286fdaf','source witness changed');
  const frozen=JSON.parse(raw);
  assert.deepEqual(frozen.manifest,curriculumR1Source);
  assert.deepEqual(frozen.text,curriculumSourceText);assert.deepEqual(frozen.shapes,curriculumSourceShapes);
  assert.deepEqual(frozen.assets,curriculumSourceAssets);
  for(const photo of Object.values(curriculumSourceAssets.photos)) {
    const b=readFileSync(resolve(project,'public/curriculum',photo.fileName));
    assert.equal(sha(b),photo.sha256,photo.fileName);assert.equal(b.length,photo.byteLength);
    assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(b.readUInt32BE(16),photo.sourceWidth);assert.equal(b.readUInt32BE(20),photo.sourceHeight);
  }
  const arrow=curriculumSourceAssets.arrow;
  assert.equal(sha(readFileSync(resolve(project,'public/curriculum',arrow.fileName))),arrow.sha256);
  const css=readFileSync(resolve(project,'app/assets/css/main.css'),'utf8');
  for(const [name,value] of Object.entries({'smd-action-orange':'#D95E22','smd-brand-navy':'#172C57',
    'smd-surface-panel':'#F2F6FF','smd-surface-alternate':'#F2F2F2','smd-footer-background':'#2E2E2E'})) {
    const matches=[...css.matchAll(new RegExp('--'+name+'\\s*:\\s*([^;]+);','g'))];
    assert.equal(matches.length,1,name+' must have one owner');assert.equal(matches[0][1].trim(),value);
  }
  assert.doesNotMatch(readFileSync(resolve(project,'app/assets/css/curriculum-r1.css'),'utf8'),/#[a-f0-9]{3,8}\b/i);
  assert.match(readFileSync(resolve(project,'app/components/about/AboutBodyStage.vue'),'utf8'),/var\(--smd-brand-navy\)/);
  return {status:'PASS',tier:'SOURCE_STATIC',texts:95,photos:5,shapes:31,sharedTokenOwner:'app/assets/css/main.css'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(verifyCurriculumSource()));
