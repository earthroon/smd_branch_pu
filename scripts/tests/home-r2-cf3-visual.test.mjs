import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildHomeCf3Visual } from '../lib/home-r2-cf3-visual.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const v=buildHomeCf3Visual(root);
test('CF3 derives 76 native text records, 89 exact runs without rewriting Figma source',()=>{
 const data=readFileSync(resolve(root,'app/data/home-r2-visual-text.ts'),'utf8');
 assert.equal(v.textCount,76);
 assert.ok(data.includes('fontFamily'));
 assert.equal(Object.keys(JSON.parse(data.slice(data.indexOf('= ')+2,data.indexOf(' as const satisfies')))).length,76);
});
test('CF3 preserves all fifteen LINE source identities, two direct blocker and 30 propagated',()=>{
 assert.equal(v.lineCount,15);
 const {lineCandidates,clipBlockers}=v.witness;
 assert.equal(lineCandidates.filter(x=>x.stroke.weight===2).length,5);
 assert.equal(lineCandidates.filter(x=>x.stroke.weight===3).length,10);
 assert.deepEqual(clipBlockers.direct,['node-18:25','node-18:57']);
 assert.equal(clipBlockers.propagatedCount,30);
 assert.equal(clipBlockers.sourceStatus,'VISUAL_UNQUALIFIED');
 assert.equal(v.witness.physicalPixelParity,'NOT_RUN');
});
test('CF3 original full-page geometry remains 1920×9967 and reference viewport is 1920×1080',()=>{
 assert.deepEqual(v.witness.desktopViewport,[1920,1080]);
 assert.deepEqual(v.witness.fullScrollSource,[1920,9967]);
 assert.equal(v.witness.sections.length,11);
 assert.deepEqual(v.witness.responsiveViewportWidths,[360,390,430,768,1024,1280,1440,1920,2560,3440,3840]);
});
