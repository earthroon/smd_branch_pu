/**
 * SMD-HOME-R2-VISUAL-RESTORE B1: a deterministic SOURCE -> Scene compiler.
 * Does not modify original Figma files. It is intentionally strict about
 * operations, text UTF-16 ranges and raw SVG bytes.
 *
 *   node scripts/figma-r2/build-render-scene.mjs
 *   node scripts/figma-r2/build-render-scene.mjs --verify
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {dirname,resolve,join,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSourceFreeze, SOURCE_SNAPSHOT_DIGEST, SOURCE_WITNESS_DIGEST, FROZEN_PARENT_SOURCE} from '../lib/home-r2-source.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const originalDir=resolve(root,FROZEN_PARENT_SOURCE);
const outRoot=resolve(root,'app/data');
const publicDir=resolve(root,'public/figma-r2/assets');
const docsDir=resolve(root,'docs/migration/smd-home-r2/visual-restore');
const verify=process.argv.includes('--verify');
const sha=b=>createHash('sha256').update(b).digest('hex');
const assert=(v,m)=>{if(!v)throw new Error(`SMD_FIGMA_SCENE_INVALID: ${m}`);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const strictInside=(candidate,base)=>{const rel=relative(base,candidate);return rel!==''&&!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel);};
const write=(target,buffer)=>{if(verify){assert(existsSync(target),`GENERATED_MISSING ${target}`);assert(Buffer.compare(readFileSync(target),buffer)===0,`GENERATED_DRIFT ${target}`);return;}
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,buffer)};
const mapUnique=(rows,key,kind)=>{const out={};for(const obj of rows){const id=obj[key];assert(typeof id==='string' && !(id in out),`DUPLICATE ${kind} ${id}`);out[id]=obj}return out;};

buildSourceFreeze(root); // also verifies original SHA-256, metadata and media owners.
const records=readFileSync(join(originalDir,'skin.jsonl'),'utf8').trimEnd().split(/\r?\n/).map(JSON.parse);
const ofKind=kind=>records.filter(r=>r.kind===kind);
const nodeRecords=ofKind('node');
const nodeRefs=mapUnique(nodeRecords,'nodeKey','node');
const renderRefs=mapUnique(ofKind('render-case'),'target','render-case');
const clipRefs=mapUnique(ofKind('clip-case'),'target','clip-case');
const textRefs=mapUnique(ofKind('native-text'),'target','native-text');
const assetRefs=mapUnique(ofKind('asset'),'id','asset');
const paintRecords=ofKind('node-paint-source-v9-r2a');
const paintRefs=mapUnique(paintRecords,'target','node-paint-source');
const shapeRefs=mapUnique(ofKind('frame-shape-v9-r2a'),'target','frame-shape');
const childClips=mapUnique(ofKind('frame-child-clip-v9-r2a'),'ownerKey','frame-child-clip');
const lineRefs=mapUnique(ofKind('line-stroke-source-v9-r2b'),'target','line-stroke');
const scope=ofKind('paint-scope-v9-r2a');
const auth=ofKind('authority-v9-r2a')[0];
assert(scope.length===1 && scope[0].operations.length===165,'PAINT_SCOPE_165');
assert(nodeRecords.length===272 && Object.keys(renderRefs).length===272,'NODES_272');
assert(Object.keys(textRefs).length===76 && Object.keys(assetRefs).length===31,'TEXT_76_ASSET_31');
assert(Object.keys(childClips).length===38&&Object.keys(shapeRefs).length===38,'FRAME_CLIP_38');
assert(Object.keys(lineRefs).length===15,'LINES_15');
assert(auth?.physicalParity==='NOT_RUN'&&auth?.renderQualification==='BLOCKED'&&auth?.productCommitAllowed===false,'ORIGINAL_AUTHORITY');

const children=Object.fromEntries(nodeRecords.map(n=>[n.nodeKey,[]]));
for(const n of nodeRecords)if(n.parent!==null){assert(n.parent in nodeRefs,`UNKNOWN_PARENT ${n.nodeKey}`);children[n.parent].push(n.nodeKey);}
for(const ids of Object.values(children))ids.sort((a,b)=>nodeRefs[a].order-nodeRefs[b].order||a.localeCompare(b));
const visits=new Set();function visit(nodeKey,chain=new Set()){
  assert(!chain.has(nodeKey),`CYCLE ${nodeKey}`);const next=new Set(chain);next.add(nodeKey); visits.add(nodeKey);
  for(const child of children[nodeKey])visit(child,next);
}
visit('node-1:3'); assert(visits.size===272,'DISCONNECTED_NODE');

const paintByNode=mapUnique(scope[0].operations,'nodeKey','paint-operation');
assert(scope[0].operations.length===Object.keys(paintByNode).length,'PAINT_1_TO_1');
const graphOrder=[];function paintOrder(k,rootOrder=[]){
  if(k in paintByNode)graphOrder.push(paintByNode[k].nodeKey);
  for(const child of children[k])paintOrder(child);
}paintOrder('node-1:3');
const declaredOrder=scope[0].operations.map(x=>x.nodeKey);
assert(same(graphOrder,declaredOrder),'PAINT_ORDER_GRAPH_MISMATCH');
for(const op of scope[0].operations){
  assert(op.nodeKey in nodeRefs,`PAINT_NODE_MISSING ${op.nodeKey}`);
  const r=renderRefs[op.nodeKey];
  assert(r?.status!=='blocked',`BLOCKED_PAINTED ${op.nodeKey}`);
  if(op.kind==='asset'){
    assert(r.case==='svg-asset'&&r.assetId===op.sourceRef&&op.sourceRef in assetRefs,`PAINT_ASSET_INVALID ${op.nodeKey}`);
  } else if(op.kind==='text'){
    assert(r.case==='native-text'&&textRefs[op.nodeKey]?.textDigest===op.sourceRef,`PAINT_TEXT_INVALID ${op.nodeKey}`);
  } else if(op.kind==='self-paint'){
    assert(op.sourceRef===op.nodeKey && op.nodeKey in paintRefs,`PAINT_SELF_INVALID ${op.nodeKey}`);
  } else assert(false,`UNKNOWN_PAINT ${op.kind}`);
  for(const key of op.effectiveClipScopeKeys){const ownerKey=key.slice(0,-':child-clip'.length);assert(key.endsWith(':child-clip')&&childClips[ownerKey]?.scopeKey===key,`CLIP_SCOPE_INVALID ${op.nodeKey}`);}
}
const renderCases=Object.values(renderRefs);
const blockers=renderCases.filter(r=>r.status==='blocked').map(r=>({nodeKey:r.target,reasonCode:r.reasonCode||'BLOCKED',clipCase:clipRefs[r.target]?.case}));
assert(blockers.length===32 && blockers.filter(x=>x.reasonCode==='FNS_CLIP_WITNESS_MISSING').length===2,'BLOCKERS_32');

// The header is a semantic Vue navigation replacing the Figma text instances.
// Its vector logomark is restored independently using the exact asset refs.
const headerKey='node-1:6';const footerKey='node-36:8';
function rootOf(k){let n=nodeRefs[k];while(n?.parent&&n.parent!=='node-1:3')n=nodeRefs[n.parent];return n?.nodeKey;}
const headerTextKeys=Object.keys(textRefs).filter(k=>rootOf(k)===headerKey);
const pendingFaq=new Set(['node-1:30','node-1:31','node-1:32','node-1:33']);
const owners=scope[0].operations.map((o,i)=>{
  const rootKey=rootOf(o.nodeKey);
  let owner='figma-scene';let note='';
  if(rootKey===headerKey){owner='semantic-header';note='SiteHeader renders menu, SVG logomark restored via FigmaBrandMark';}
  else if(rootKey===footerKey){owner='semantic-footer';note='Published SiteFooter preserved; Figma self paint accounted separately';}
  else if(pendingFaq.has(o.nodeKey)){owner='cms-faq-pending';note='Figma ==== is not public FAQ copy';}
  return {operationIndex:i,nodeKey:o.nodeKey,paintKind:o.kind,sourceRef:o.sourceRef,orderPath:o.orderPath,effectiveClipScopeKeys:o.effectiveClipScopeKeys,owner,note};
});
const ownerCounts=owners.reduce((m,o)=>(m[o.owner]=(m[o.owner]??0)+1,m),{});
assert(owners.length===165 && new Set(owners.map(x=>x.nodeKey)).size===165,'OWNER_165');
assert(headerTextKeys.length===7,'HEADER_TEXT_7');

const assets={};for(const asset of Object.values(assetRefs)){
  assert(/^asset-[a-f0-9]{64}$/.test(asset.id)&&asset.sha256===asset.id.slice(6),'ASSET_ID');
  const target=resolve(originalDir,asset.path);
  assert(strictInside(target,originalDir)&&target.endsWith('.svg'),'ASSET_PATH_ESCAPE');
  const raw=readFileSync(target);
  assert(sha(raw)===asset.sha256,`ASSET_HASH_MISMATCH ${asset.id}`);
  const text=raw.toString('utf8');
  assert(/^<svg\b/.test(text)&& /<\/svg>\s*$/.test(text)&& !/<script\b|onload\s*=|javascript:/i.test(text),'SVG_DISALLOWED_CONTENT '+asset.id);
  const name=`${asset.id}.svg`;write(join(publicDir,name),raw);
  assets[asset.id]={src:`/figma-r2/assets/${name}`,sha256:asset.sha256};
}

function runStyle(run){
 const weight=run.fontWeight;assert(Number.isFinite(weight)&&weight>=100&&weight<=900,`TEXT_WEIGHT ${weight}`);
 const ls=run.letterSpacing;
 const letterSpacing=(ls?.unit==='PERCENT'?`${run.fontSize * ls.value/100}px`:ls?.unit==='PIXELS'?`${ls.value}px`:'normal');
 const lh=run.lineHeight;
 const lineHeight=lh?.unit==='PIXELS'?`${lh.value}px`:lh?.unit==='PERCENT'?`${lh.value}%`:'normal';
 const solid=(run.fills||[]).find(x=>x.kind==='solid');
 const rgba=solid?.rgba??[0,0,0,1];
 return {fontFamily:'"Pretendard Variable", Pretendard, sans-serif',fontSize:`${run.fontSize}px`,fontWeight:weight,letterSpacing,lineHeight,color:`rgba(${rgba.slice(0,3).map(n=>Math.round(n*255)).join(',')},${rgba[3]})`};
}
const textEntries={};let totalRuns=0;
for(const t of Object.values(textRefs)){
  let joined='',offset=0;
  const runs=t.runs.map(r=>{assert(r.start===offset&&r.end===r.start+r.characters.length,`TEXT_UTF16 ${t.target}`);joined+=r.characters;offset=r.end;totalRuns++;return {characters:r.characters,start:r.start,end:r.end,style:runStyle(r)};});
  assert(joined===t.characters&&offset===t.characters.length,`TEXT_CONTENT ${t.target}`);
  assert(t.runs.every(r=>r.font?.family==='Pretendard'),`FONT_FAMILY ${t.target}`);
  const n=nodeRefs[t.target];assert(n.nodeKind==='TEXT','TEXT_TARGET_KIND');
  textEntries[t.target]={characters:t.characters,digest:t.textDigest,layout:t.layout,properties:{autoResize:t.nodeProperties.textAutoResize,opacity:t.nodeProperties.opacity},runs};
}
assert(totalRuns===89,'TEXT_RUN_89');
const sections=[
  ['header','node-1:6'],['hero','node-1:4'],['info-bar','node-1:134'],['special-start','node-1:123'],
  ['training-track','node-1:93'],['benefits','node-1:77'],['methods','node-1:51'],
  ['location','node-1:46'],['faq','node-1:22'],['consultation-cta','node-1:20'],['footer','node-36:8'],
].map(([id,nodeKey])=>({id,nodeKey,top:nodeRefs[nodeKey].rectLocal[1],height:nodeRefs[nodeKey].rectLocal[3],width:nodeRefs[nodeKey].rectLocal[2]}));
assert(sections.every((s,i)=>i===0||s.top>=sections[i-1].top),'SECTION_VISUAL_ORDER');
const nodes={};for(const n of nodeRecords){
  nodes[n.nodeKey]={key:n.nodeKey,name:n.name,kind:n.nodeKind,parent:n.parent,order:n.order,rect:n.rectLocal,affine:n.transformLocal,
    visible:n.visible,blendMode:n.blendMode,childKeys:children[n.nodeKey],renderCase:renderRefs[n.nodeKey].case,
    renderStatus:renderRefs[n.nodeKey].status,reasonCode:renderRefs[n.nodeKey].reasonCode??null,
    clipCase:clipRefs[n.nodeKey].case,clippedChildren:!!childClips[n.nodeKey]?.clipsChildren,
    clipScopeKey:childClips[n.nodeKey]?.scopeKey??null,radii:shapeRefs[n.nodeKey]?.radii??n.clipSource?.radii??[0,0,0,0]};
}
const operationByNode=Object.fromEntries(scope[0].operations.map(op=>[op.nodeKey,op]));
const fills={};for(const [key,v] of Object.entries(paintRefs)){
  if(operationByNode[key]?.kind==='self-paint')fills[key]={fills:v.fills,strokes:v.strokes,opacity:v.opacity};
}
const lines=Object.fromEntries(Object.entries(lineRefs).map(([k,v])=>[k,{status:v.status,stroke:v.stroke,exportEvidence:v.exportEvidence,conservativeInkBounds:v.geometry?.conservativeInkBoundsLocal}]));
const scene={
  contract:'SMD_FIGMA_SCENE_VR1',sourceSnapshotDigest:SOURCE_SNAPSHOT_DIGEST,sourceWitnessDigest:SOURCE_WITNESS_DIGEST,
  viewport:[1920,1080],fullFrame:[1920,9967],originalQualification:auth.renderQualification,originalPhysicalParity:auth.physicalParity,
  productCommitAllowed:false,sections,nodes,assets,operations:scope[0].operations,operationByNode,texts:textEntries,selfPaints:fills,lines,
  blockers,ownership:owners,ownerCounts,
};
const data='/* SOURCE-GENERATED. DO NOT EDIT. node scripts/figma-r2/build-render-scene.mjs */\n'+
  'import type { FigmaSceneV1 } from "./figma-r2-types";\n'+
  'export const figmaScene: FigmaSceneV1 = '+JSON.stringify(scene,null,2)+';\n';
const assetData='/* SOURCE-GENERATED: SHA-pinned original Figma SVG assets */\n'+
  'export const figmaSvgAssets: Readonly<Record<string, {src:string;sha256:string}>> = '+JSON.stringify(assets,null,2)+';\n';
const ownerData='/* SOURCE-GENERATED: 1:1 Paint operation ownership */\n'+
  'export const figmaPaintOwners = '+JSON.stringify(owners,null,2)+' as const;\n';
write(join(outRoot,'figma-r2-scene.generated.ts'),Buffer.from(data));
write(join(outRoot,'figma-r2-assets.generated.ts'),Buffer.from(assetData));
write(join(outRoot,'figma-r2-ownership.generated.ts'),Buffer.from(ownerData));
const receipt={contract:'SMD_FIGMA_SCENE_VR1_RECEIPT',sourceSnapshotDigest:SOURCE_SNAPSHOT_DIGEST,
 sourceWitnessDigest:SOURCE_WITNESS_DIGEST,sourceOriginalsChanged:false,nodes:nodeRecords.length,cases:renderCases.length,
 paints:owners.length,ownerCounts,assets:Object.keys(assets).length,svgInstanceCount:owners.filter(x=>x.paintKind==='asset').length,
 nativeTextCount:Object.keys(textEntries).length,nativeTextRunCount:totalRuns,frameShapeCount:Object.keys(shapeRefs).length,
 childClipCount:Object.keys(childClips).length,blockedCount:blockers.length,blockedRootKeys:blockers.filter(x=>x.reasonCode==='FNS_CLIP_WITNESS_MISSING').map(x=>x.nodeKey),
 physicalParity:'NOT_RUN',renderQualification:'BLOCKED',productCommitAllowed:false};
write(join(docsDir,'scene-receipt.json'),Buffer.from(JSON.stringify(receipt,null,2)+'\n'));
write(join(docsDir,'paint-owner-ledger.json'),Buffer.from(JSON.stringify(owners,null,2)+'\n'));
write(join(docsDir,'mask-blocker-ledger.json'),Buffer.from(JSON.stringify(blockers,null,2)+'\n'));
console.log(`SMD FIGMA SCENE ${verify?'VERIFY':'GENERATE'} PASS: ${nodeRecords.length} nodes, ${owners.length} paints, ${Object.keys(assets).length} SVG assets, ${totalRuns} text runs; ${blockers.length} original blockers remain`);
