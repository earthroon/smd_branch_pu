/** R4 SOURCE/STATIC evidence gate. No browser, no Cloudflare, no source mutations. */
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { SMD_HOME_R2_VISUAL_R4 as R4 } from '../../app/data/figma-r2-visual-r4.ts';

const root=resolve(import.meta.dirname,'../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=rel=>readFileSync(join(root,rel));
const text=rel=>file(rel).toString('utf8');
const skin=text('docs/migration/smd-home-r2/cf1/figma-source/skin.jsonl')
  .trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const nodes=new Map(skin.filter(x=>x.kind==='node').map(x=>[x.nodeKey,x]));
assert.equal(nodes.size,272);
assert.equal(R4.contract,'SMD_HOME_R2_VISUAL_REPAIR_R4');
const frame=nodes.get(R4.userFile.ownerNodeKey);
const group=nodes.get(R4.userFile.parentNodeKey);
const section=nodes.get(R4.userFile.sectionNodeKey);
assert.equal(frame?.parent,R4.userFile.parentNodeKey);
assert.equal(frame.name,'4_file');
assert.equal(group?.parent,R4.userFile.sectionNodeKey);
assert.deepEqual(frame.rectLocal,[891,32,98,98]);
assert.deepEqual(group.rectLocal.slice(0,2),[430,46]);
assert.equal(section?.rectLocal?.[1],940);
const blocker=skin.find(x=>x.kind==='render-case'&&x.target===R4.userFile.originalBlockedNodeKey);
assert.equal(blocker?.status,'blocked');
assert.equal(blocker.reasonCode,'FNS_CLIP_WITNESS_MISSING');
const svg=file('public/figma-r2/user/file-01.svg');
assert.equal(sha(svg),R4.userFile.bytesSha256);
assert.match(svg.toString('utf8'),/viewBox="0 0 80 80"/);
assert.equal(R4.userFile.originalClipQualification,'BLOCKED_SOURCE_WITNESS');
assert.equal(R4.userFile.overrideQualification,'USER_SUPPLIED_DISPLAY_CANDIDATE');
const scene=text('app/data/figma-r2-scene.generated.ts');
assert.ok(scene.includes(R4.sourceSnapshotDigest));
assert.ok(scene.includes('node-18:57'));
assert.match(text('app/components/figma/FigmaSceneSection.vue'),/FigmaR4UserFileIcon v-if="sectionId === 'info-bar'"/);
assert.match(text('app/components/figma/FigmaSceneSection.vue'),/import FigmaR4UserFileIcon from '\.\/FigmaR4UserFileIcon\.vue'/);
assert.match(text('app/components/figma/FigmaR4UserFileIcon.vue'),/data-original-clip-qualification/);
assert.match(text('app/pages/index.vue'),/figma-r2-r4\.css/);
const css=text('app/assets/css/figma-r2-r4.css');
assert.match(css,/font-weight:\s*600\s*!important/);
assert.match(css,/translateY\(-28px\)/);
for(const k of R4.methods.bodyNodeKeys){
 assert.equal(nodes.get(k)?.parent,R4.methods.sectionNodeKey);
 assert.ok(css.includes(`foreignObject[data-figma-text-instance="${k}"]`));
}
assert.equal(nodes.get(R4.methods.headingNodeKey)?.parent,R4.methods.sectionNodeKey);
assert.ok(css.includes(`foreignObject[data-figma-text-instance="${R4.methods.headingNodeKey}"]`));
const allSvgAssets=skin.filter(x=>x.kind==='asset');
assert.equal(allSvgAssets.length,31);
for(const a of allSvgAssets){
 const path=`docs/migration/smd-home-r2/cf1/figma-source/assets/${a.id}.svg`;
 assert.equal(sha(file(path)),a.sha256);
 assert.equal(sha(file(`public/figma-r2/assets/${a.id}.svg`)),a.sha256);
}
console.log('PASS_R4_SOURCE_STATIC: 272 original nodes, 31 SVG original SHA, user icon SHA, header 600 and body -28px override');
console.log('R4_USER_ICON_DISPLAY=CANDIDATE; ORIGINAL_CLIP=BLOCKED_SOURCE_WITNESS; NUXT_COMPILE_NOT_TESTED_BY_THIS_GATE');
