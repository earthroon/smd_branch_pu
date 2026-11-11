/** R3 node-local source + static gate. CF7 remains blocked without original mask witness. */
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {figmaScene} from '../../app/data/figma-r2-scene.generated.ts';
import {r3MethodsTextSizes,r3Svg,r3ClipRecovery} from '../../app/data/figma-r2-visual-r3.ts';
const root=resolve(import.meta.dirname,'../..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const text=x=>readFileSync(join(root,x),'utf8');
const source=figmaScene;
const nodes=source.nodes;
const asset=id=>text(`public/figma-r2/assets/${id}.svg`);
const derived=name=>text(`public/figma-r2/derived/${name}.svg`);
const instance=(k,kind,id)=>{
 const op=source.operationByNode[k];assert.equal(op?.kind,kind,k);assert.equal(op.sourceRef,id,k);
 assert.equal(source.assets[id].sha256,sha(Buffer.from(asset(id))),k);
};
assert.equal(source.originalQualification,'BLOCKED');
assert.equal(source.productCommitAllowed,false);
assert.equal(source.sourceSnapshotDigest,'5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f');
assert.equal(source.operations.length,165);
assert.equal(Object.keys(source.assets).length,31);
for(const [id,a] of Object.entries(source.assets)){
 const original=readFileSync(join(root,'docs/migration/smd-home-r2/cf1/figma-source/assets',`${id}.svg`));
 const delivered=readFileSync(join(root,'public',a.src.slice(1)));
 assert.equal(sha(original),a.sha256,id);assert.equal(Buffer.compare(original,delivered),0,id);
}
// CF7: do NOT manufacture an icon or lift a blocked subtree without an original witness.
assert.equal(nodes[r3ClipRecovery.nodeKey].renderStatus,'blocked');
assert.equal(nodes[r3ClipRecovery.nodeKey].reasonCode,r3ClipRecovery.reasonCode);
assert.equal(source.operationByNode[r3ClipRecovery.nodeKey],undefined);
assert.equal(r3ClipRecovery.status,'BLOCKED_SOURCE_WITNESS');
console.log('CF7_BLOCKED_SOURCE_WITNESS node-18:57: original Figma SVG+clip/mask required');
// CF8: six explicit presentation-only sizes. Original run text, digest and geometry frozen.
assert.deepEqual(Object.keys(r3MethodsTextSizes).sort(),
 ['node-18:114','node-1:61','node-18:116','node-18:115','node-1:62','node-18:117'].sort());
for(const [nodeKey,ov] of Object.entries(r3MethodsTextSizes)){
 const t=source.texts[nodeKey];assert.equal(source.operationByNode[nodeKey].sourceRef,t.digest);
 assert.equal(t.runs.length,1);
 const sourceSize=parseFloat(t.runs[0].style.fontSize);
 assert.equal(sourceSize,ov.kind==='heading'?46:32,nodeKey);
 assert.equal(ov.fontSize,ov.kind==='heading'?36:24,nodeKey);
 assert.equal(ov.letterSpacing,ov.kind==='heading'?-0.72:-0.48,nodeKey);
}
instance('node-1:52','asset',r3Svg['node-1:52'].sourceAsset);
assert.equal(nodes['node-1:52'].rect[1],10);
const svgVue=text('app/components/figma/FigmaSvgAsset.vue');
assert.match(svgVue,/visual\?\.kind==='methods-seam'/);
assert.match(svgVue,/:height="props\.height\+10"/);
assert.match(svgVue,/y="-10"/);
const nativeVue=text('app/components/figma/FigmaNativeText.vue');
assert.match(nativeVue,/v-for="\(run,i\) in visibleRuns"/);
assert.match(nativeVue,/data-user-visual-override/);
console.log('CF8_SOURCE_STATIC_PASS: six user text sizes, methods-only seam; SOURCE untouched');
// CF9: full source d attribute retained; fill inset candidate explicitly labelled derived.
const helm=r3Svg['node-1:482'];
instance('node-1:482','asset',helm.sourceAsset);
assert.equal(helm.qualification,'PENDING_VISUAL_APPROVAL');
const originalHelmet=asset(helm.sourceAsset);
const adjustedHelmet=derived('helmet-weight-r3');
const path=s=>s.match(/<path\s+d="([^"]+)"/s)?.[1];
assert.ok(path(originalHelmet));assert.equal(path(adjustedHelmet),path(originalHelmet));
assert.match(adjustedHelmet,/operator="erode" radius="0\.65"/);
assert.equal(helm.derivedSha256,sha(Buffer.from(adjustedHelmet)));
assert.match(svgVue,/visual\?\.kind==='helmet-weight'/);
console.log('CF9_DERIVED_SOURCE_STATIC_PASS: original path preserved; visual weight pending approval');
// CF10: same source used by both, one padded derived viewport, no path coordinate changes.
for(const key of ['node-1:501','node-1:555']){
 const ov=r3Svg[key];instance(key,'asset',ov.sourceAsset);
 const arrow=derived('chevron-ink-r3');
 assert.equal(path(arrow),path(asset(ov.sourceAsset)),key);
 assert.match(arrow,/viewBox="-1\.5 -1\.5 23\.5 44"/);
 assert.match(arrow,/stroke-width="3"/);
 assert.equal(ov.derivedSha256,sha(Buffer.from(arrow)));
}
assert.match(svgVue,/visual\?\.kind==='chevron-ink'/);
assert.match(svgVue,/width="23\.5" height="44"/);
console.log('CF10_SOURCE_STATIC_PASS: 2 padded chevrons, same original path');
console.log('PASS_SMD_R3_SOURCE_STATIC_CF8_CF9_CF10; CF7 BLOCKED; COMPILE/RUNTIME/VISUAL NOT IMPLIED');
