import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {figmaScene} from '../../../app/data/figma-r2-scene.generated.ts';
const root=resolve(import.meta.dirname,'../../..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const nodes=figmaScene.nodes;
function top(nodeKey){let k=nodeKey;while(nodes[k].parent && nodes[k].parent!=='node-1:3')k=nodes[k].parent;return k}
const operations=figmaScene.operations;
const sourceBase=join(root,'docs/migration/smd-home-r2/cf1/figma-source');

test('source identity and qualification are immutable',()=>{
 assert.equal(figmaScene.contract,'SMD_FIGMA_SCENE_VR1');
 assert.equal(figmaScene.sourceSnapshotDigest,'5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f');
 assert.equal(figmaScene.originalPhysicalParity,'NOT_RUN');
 assert.equal(figmaScene.originalQualification,'BLOCKED');
 assert.equal(figmaScene.productCommitAllowed,false);
});
test('272 nodes, 272 cases, 11 ordered sections and 38 clips remain connected',()=>{
 assert.equal(Object.keys(nodes).length,272);
 assert.equal(figmaScene.sections.length,11);
 assert.deepEqual(figmaScene.sections.map(s=>s.id),['header','hero','info-bar','special-start','training-track','benefits','methods','location','faq','consultation-cta','footer']);
 assert.equal(Object.values(nodes).filter(n=>n.clippedChildren).length,38);
 for(const n of Object.values(nodes)){
  assert.equal(n.key=== 'node-1:3' ? n.parent === null : n.parent in nodes,true,`parent: ${n.key}`);
  for(const child of n.childKeys) assert.equal(nodes[child].parent,n.key);
 }
});
test('all 165 source paint operations have exactly one owner and source',()=>{
 assert.equal(operations.length,165);
 assert.equal(figmaScene.ownership.length,165);
 assert.equal(Object.keys(figmaScene.operationByNode).length,165);
 for(const [index,op] of operations.entries()){
  const owner=figmaScene.ownership[index];
  assert.equal(owner.nodeKey,op.nodeKey);
  assert.deepEqual(owner.orderPath,op.orderPath);
  assert.deepEqual(owner.effectiveClipScopeKeys,op.effectiveClipScopeKeys);
  assert.ok(['figma-scene','semantic-header','semantic-footer','cms-faq-pending'].includes(owner.owner));
 }
 assert.equal(figmaScene.ownerCounts['cms-faq-pending'],4);
 assert.equal(figmaScene.ownerCounts['semantic-header'],11);
 assert.equal(figmaScene.ownerCounts['semantic-footer'],1);
 assert.equal(figmaScene.ownerCounts['figma-scene'],149);
});
test('31 original SVG assets keep identical SHA-256 bytes and stable public URLs',()=>{
 assert.equal(Object.keys(figmaScene.assets).length,31);
 for(const [id,a] of Object.entries(figmaScene.assets)){
  assert.equal(a.src,`/figma-r2/assets/${id}.svg`);
  const original=readFileSync(join(sourceBase,'assets',`${id}.svg`));
  const delivered=readFileSync(join(root,'public',a.src.slice(1)));
  assert.equal(sha(original),a.sha256,id);
  assert.equal(Buffer.compare(original,delivered),0,id);
 }
});
test('68 SVG paint instances retain original node/asset relations',()=>{
 const svg=operations.filter(o=>o.kind==='asset');assert.equal(svg.length,68);
 assert.equal(svg.filter(o=>top(o.nodeKey)==='node-1:93').length,39);
 const logo=svg.filter(o=>['node-1:9','node-1:10'].includes(o.nodeKey));assert.equal(logo.length,2);
 for(const op of svg){assert.ok(figmaScene.assets[op.sourceRef],op.nodeKey);assert.equal(figmaScene.nodes[op.nodeKey].renderCase,'svg-asset')}
});
test('76 Pretendard text nodes, 89 original UTF-16 runs',()=>{
 const ts=Object.values(figmaScene.texts);assert.equal(ts.length,76);
 assert.equal(ts.reduce((s,t)=>s+t.runs.length,0),89);
 for(const t of ts){
  assert.equal(t.runs.map(r=>r.characters).join(''),t.characters);
  let end=0;for(const r of t.runs){assert.equal(end,r.start);assert.equal(r.end,r.start+r.characters.length);assert.match(String(r.style.fontFamily),/Pretendard/);end=r.end;}
  assert.equal(end,t.characters.length);
 }
});
test('4 FAQ Figma ==== strings have pending-cms owners and cannot be public text',()=>{
 for(let n=30;n<=33;n++){
  const key=`node-1:${n}`;assert.match(figmaScene.texts[key].characters,/^=+$/);
  assert.equal(figmaScene.ownership.find(o=>o.nodeKey===key).owner,'cms-faq-pending');
 }
});
test('original mask/witness blocking remains 2 roots + 30 descendant blocks',()=>{
 assert.equal(figmaScene.blockers.length,32);
 const roots=figmaScene.blockers.filter(b=>b.reasonCode==='FNS_CLIP_WITNESS_MISSING');
 assert.deepEqual(roots.map(b=>b.nodeKey).sort(),['node-18:25','node-18:57']);
});
test('source dark training paint and white title are not replaced by gray CSS',()=>{
 const bg=figmaScene.operationByNode['node-1:94'];
 assert.equal(bg.kind,'asset');
 assert.equal(figmaScene.sections.find(s=>s.id==='training-track').nodeKey,'node-1:93');
 const svg=readFileSync(join(root,'public',figmaScene.assets[bg.sourceRef].src.slice(1)),'utf8');
 assert.match(svg,/#323232/i);
 const title=figmaScene.texts['node-1:103'];assert.match(title.characters,/정규 교육 트랙/);
 assert.ok(title.runs.some(r=>String(r.style.color).includes('255,255,255')));
});
test('V5/V6 interfaces untouched and scene replaces visual contents only on home route',()=>{
 const idx=readFileSync(join(root,'app/pages/index.vue'),'utf8');
 assert.match(idx,/smd-home--figma-scene/);assert.match(idx,/smd-home--semantic-reflow/);
 assert.match(idx,/<HomeBodyStage\b[^>]*\/>/);assert.match(idx,/HomeFaq/);
 const body=readFileSync(join(root,'app/components/home/HomeBodyStage.vue'),'utf8');
 assert.match(body,/<FigmaSceneSection :section-id="row.id" \/>/);
 const symbol=readFileSync(join(root,'app/components/feature/HeaderBrandSymbol.vue'),'utf8');
 assert.match(symbol,/FigmaBrandMark v-if="route.path === '\/'"/);
 assert.match(symbol,/resolvePublishedBrandSymbol/);
});
