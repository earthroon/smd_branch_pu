import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';

export const FROZEN_SHA = Object.freeze({
  'skin.jsonl': 'fe38ccb06dfc5be1755de0ebc289e9b469327066da1a358f8e94f33eb3a29c1a',
  'figma-reference.json': 'd3770060b861a0211c4dea1a5582f78ce97ea1040588324b10923ccddb824a3b',
  'export-session.json': 'a3c6ce020566cceb620f6ba348c2a46f7a28e876a2c485073982168fefeb547a',
});
export const SOURCE_SNAPSHOT_DIGEST = '5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f';
export const SOURCE_WITNESS_DIGEST = 'b81daf175c8ee9e590b1bc0b87cd74dbe7d0c75e121c412fc0cfa16367127cc1';
export const FROZEN_PARENT_SOURCE = 'docs/migration/smd-home-r2/cf1/figma-source';
export const GENERATED_ROOT = 'docs/migration/smd-home-r2/cf1';
export const SOURCE_CONTRACT = 'FNS-SCHEMA9-TREE-SSOT-R2B-LINE-STROKE-R1';
export const GENERATED_CONTRACT = 'SMD-HOME-R2-CF1';
export const GENERATOR_VERSION = 'SMD_HOME_R2_CF1_GEN_V1';

const HEADER_FOOTER_AND_BODY = [
  ['header', 'node-1:6'],
  ['hero', 'node-1:4'],
  ['info-bar', 'node-1:134'],
  ['special-start', 'node-1:123'],
  ['training-track', 'node-1:93'],
  ['benefits', 'node-1:77'],
  ['methods', 'node-1:51'],
  ['location', 'node-1:46'],
  ['faq', 'node-1:22'],
  ['consultation-cta', 'node-1:20'],
  ['footer', 'node-36:8'],
];

// Explicit render-owner mapping. Ancestor/overlaid Figma frames are not image upload slots.
export const MEDIA_OWNER = Object.freeze([
  ['home.special-start.photo','node-1:126','special-start'],
  ['home.benefits.01.image','node-1:86','benefits'],
  ['home.benefits.02.image','node-18:145','benefits'],
  ['home.benefits.03.image','node-18:126','benefits'],
  ['home.benefits.04.image','node-18:132','benefits'],
  ['home.methods.01.image','node-1:54','methods'],
  ['home.methods.02.image','node-1:56','methods'],
  ['home.methods.03.image','node-1:58','methods'],
]);
const NON_SLOTS = ['node-18:87','node-1:57','node-1:59'];
const FAQ_PLACEHOLDERS = ['node-1:30','node-1:31','node-1:32','node-1:33'];
const KNOWN_DIRECT_BLOCKERS = ['node-18:25','node-18:57'];
const EXPECTED_COUNTS = {node:272,'native-text':76,asset:31,'line-stroke-source-v9-r2b':15,'render-case':272};
export function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function fail(code, detail='') { throw new Error(`${code}${detail ? ` ${detail}` : ''}`); }
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const canonicalJson = value => `${JSON.stringify(value, null, 2)}\n`;
// Cross-platform path containment: Windows paths use backslashes, not '/'.
// Keep the original Figma asset SHA verification unchanged.
const within = (candidate,base) => {
  const rel = relative(base,candidate);
  return rel==='' || (rel!=='..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};

export function buildSourceFreeze(root) {
  const source = resolve(root,FROZEN_PARENT_SOURCE);
  const bytes = {};
  for(const [name,wanted] of Object.entries(FROZEN_SHA)) {
    const raw=readFileSync(join(source,name));
    const observed=sha256(raw);
    if(observed!==wanted) fail('SMD_HOME_R2_SOURCE_DIGEST_MISMATCH',name);
    bytes[name] = raw;
  }
  const records=bytes['skin.jsonl'].toString('utf8').trimEnd().split('\n').map(x=>JSON.parse(x));
  const ref=JSON.parse(bytes['figma-reference.json'].toString('utf8'));
  const session=JSON.parse(bytes['export-session.json'].toString('utf8'));
  const meta=records[0],end=records.at(-1);
  const count={}; for(const r of records)count[r.kind]=(count[r.kind]??0)+1;
  for(const [kind,n] of Object.entries(EXPECTED_COUNTS)) {
    if(count[kind]!==n) fail('SMD_HOME_R2_IDENTITY_DRIFT',`${kind} ${count[kind]}!=${n}`);
  }
  if(end?.kind!=='end'||end.recordCount!==records.length-1||end.digest!==SOURCE_SNAPSHOT_DIGEST) fail('SMD_HOME_R2_IDENTITY_DRIFT','end');
  if(meta?.kind!=='meta'||meta.schema!==9||meta.documentUid!==ref.documentUid||meta.documentUid!==session.documentUid||
     meta.rootFrameId!==ref.rootFrameId||meta.rootFrameId!==session.frameNodeId||
     meta.treeContract!==session.contract||meta.treeContract!==SOURCE_CONTRACT||
     meta.skinId!==session.skinId||meta.skinId!=='personal-home'||
     !equal(meta.referenceViewport,[1920,9967])||!equal(meta.referenceViewport,ref.referenceViewport)||
     ref.snapshotDigest!==end.digest||session.snapshotDigest!==end.digest||
     session.sourceWitnessDigest!==SOURCE_WITNESS_DIGEST||session.referenceDigest!==FROZEN_SHA['figma-reference.json']||
     session.productCommitAllowed!==false||session.physicalParity!=='NOT_RUN'||ref.physicalParity!=='NOT_RUN') {
    fail('SMD_HOME_R2_IDENTITY_DRIFT','meta/reference/session');
  }
  const nodes=records.filter(x=>x.kind==='node');
  const byKey=new Map(nodes.map(x=>[x.nodeKey,x]));
  if(byKey.size!==nodes.length||byKey.get('node-1:3')?.parent!==null) fail('SMD_HOME_R2_NODE_GRAPH_INVALID','duplicate/root');
  for(const n of nodes){
    if(n.nodeKey!=='node-1:3'&&!byKey.has(n.parent))fail('SMD_HOME_R2_NODE_GRAPH_INVALID',n.nodeKey);
    const seen=new Set([n.nodeKey]); let parent=n.parent;
    while(parent!==null){if(seen.has(parent))fail('SMD_HOME_R2_NODE_GRAPH_INVALID','cycle');seen.add(parent);parent=byKey.get(parent)?.parent??null;}
  }
  const texts=records.filter(x=>x.kind==='native-text');
  const textByKey=new Map();
  for(const t of texts){
    if(textByKey.has(t.target)||!byKey.has(t.target)||byKey.get(t.target).nodeKind!=='TEXT'||
       byKey.get(t.target).figmaNodeId!==t.sourceNodeId||t.offsetUnit!=='utf16')fail('SMD_HOME_R2_TEXT_RUN_INVALID',t.target);
    let next=0,joined='';
    for(const run of t.runs){
      if(run.start!==next||run.end-run.start!==run.characters.length||run.font.family!=='Pretendard')fail('SMD_HOME_R2_TEXT_RUN_INVALID',t.target);
      next=run.end;joined+=run.characters;
    }
    if(joined!==t.characters||next!==t.characters.length)fail('SMD_HOME_R2_TEXT_RUN_INVALID',t.target);
    textByKey.set(t.target,t);
  }
  for(const a of records.filter(x=>x.kind==='asset')) {
    const assetPath=resolve(source,a.path);
    if(!within(assetPath,source)||!a.path.startsWith('assets/')||!a.path.endsWith('.svg'))fail('SMD_HOME_R2_ASSET_HASH_MISMATCH',a.path);
    try{if(sha256(readFileSync(assetPath))!==a.sha256||a.id!==`asset-${a.sha256}`) fail('SMD_HOME_R2_ASSET_HASH_MISMATCH',a.path);}catch(e){fail('SMD_HOME_R2_ASSET_HASH_MISMATCH',a.path);}
  }
  const sections=HEADER_FOOTER_AND_BODY.map(([id,nodeKey],visualIndex)=>{
    const n=byKey.get(nodeKey);
    if(n?.parent!=='node-1:3')fail('SMD_HOME_R2_SECTION_MAPPING_INVALID',nodeKey);
    const allText=texts.filter(t=>{
      let p=byKey.get(t.target);
      while(p?.parent){if(p.parent===nodeKey)return true;p=byKey.get(p.parent);}
      return false;
    }).map(t=>t.target);
    return {id,sourceNodeKey:nodeKey,sourceNodeName:n.name,visualIndex,originalOrder:n.order,rectLocal:n.rectLocal,contentTextRefs:allText,
      mediaSlotRefs:MEDIA_OWNER.filter(x=>x[2]===id).map(x=>x[0])};
  });
  const keys=sections.map(s=>s.sourceNodeKey),orders=sections.map(s=>s.originalOrder);
  if(new Set(keys).size!==11||sections.some((s,i)=>s.visualIndex!==i||(i>0&&s.rectLocal[1]<sections[i-1].rectLocal[1]))||
    !equal(orders,[10,9,8,7,6,5,4,3,2,1,0]))fail('SMD_HOME_R2_SECTION_MAPPING_INVALID','visual/original order');
  const imagePaints=new Map(records.filter(x=>x.kind==='node-paint-source-v9-r2a').map(x=>[x.target,x]));
  const slots=MEDIA_OWNER.map(([slotId,nodeKey,sectionId])=>{
    const n=byKey.get(nodeKey);
    if(!n||n.name!=='1_image-box'||n.nodeKind!=='FRAME'||n.clipSource?.radii.length!==4||n.clipSource?.radii.some(r=>r!==30)||
      !n.clipSource?.clipsContent)fail('SMD_HOME_R2_MEDIA_SLOT_AMBIGUOUS',nodeKey);
    let parent=n;let section=null;
    while(parent?.parent){parent=byKey.get(parent.parent);if(parent?.parent==='node-1:3'){section=sections.find(x=>x.sourceNodeKey===parent.nodeKey)?.id;break;}}
    if(section!==sectionId)fail('SMD_HOME_R2_MEDIA_SLOT_AMBIGUOUS',nodeKey);
    const paints=imagePaints.get(nodeKey)?.fills?.filter(x=>x.paintType==='SOLID');
    if(paints?.length!==1)fail('SMD_HOME_R2_MEDIA_SLOT_AMBIGUOUS',`${nodeKey}:paint`);
    return {slotId,sourceNodeKey:nodeKey,sectionId,sourceFrameRect:n.rectLocal,sourceRadii:n.clipSource.radii,placeholderRgba:paints[0].rgba,
      mediaState:'unbound',assetId:null};
  });
  if(new Set(slots.map(x=>x.slotId)).size!==slots.length||new Set(slots.map(x=>x.sourceNodeKey)).size!==slots.length||slots.length!==8||
    slots.some(x=>NON_SLOTS.includes(x.sourceNodeKey))) fail('SMD_HOME_R2_MEDIA_SLOT_AMBIGUOUS','duplicate/children');
  const copy=texts.map(t=>({target:t.target,sourceNodeId:t.sourceNodeId,characters:t.characters,textDigest:t.textDigest,offsetUnit:t.offsetUnit,
    runs:t.runs,layout:t.layout,nodeProperties:t.nodeProperties,usage:FAQ_PLACEHOLDERS.includes(t.target)?'pending-cms-copy':
      sections.find(s=>s.contentTextRefs.includes(t.target))?.id==='footer'?'source-only':'copy'}));
  const holders=copy.filter(t=>t.usage==='pending-cms-copy');
  if(holders.length!==4||holders.some(t=>t.characters!=='=====================')) fail('SMD_HOME_R2_TEXT_RUN_INVALID','FAQ placeholders');
  const renderCases=records.filter(x=>x.kind==='render-case');
  const renderCounts=Object.fromEntries(['candidate','admitted','blocked'].map(status=>[status,renderCases.filter(x=>x.status===status).length]));
  if(!equal(renderCounts,{candidate:182,admitted:58,blocked:32})||session.renderBlockedCount!==32||session.renderCandidateCount!==182)
    fail('SMD_HOME_R2_UNEXPECTED_RENDER_BLOCKER','counts');
  const blocked=renderCases.filter(x=>x.status==='blocked');
  const direct=blocked.filter(x=>x.reasonCode==='FNS_CLIP_WITNESS_MISSING');
  const ancestor=blocked.filter(x=>x.reasonCode==='FNS_SCHEMA9_ANCESTOR_RENDER_BLOCKED');
  if(direct.length!==2||ancestor.length!==30||!equal(direct.map(x=>x.target).sort(),[...KNOWN_DIRECT_BLOCKERS].sort())||blocked.length!==direct.length+ancestor.length)
    fail('SMD_HOME_R2_UNEXPECTED_RENDER_BLOCKER','reason map');
  const common={schemaVersion:1,sourceSnapshotDigest:SOURCE_SNAPSHOT_DIGEST,generatedFrom:FROZEN_PARENT_SOURCE,generatorVersion:GENERATOR_VERSION};
  const sourceIdentity={...common,documentUid:meta.documentUid,skinId:meta.skinId,schema:meta.schema,rootFrameId:meta.rootFrameId,rootNodeKey:'node-1:3',treeContract:meta.treeContract,
    sourceCanvas:meta.referenceViewport,designViewportPolicy:[1920,1080],sourceWitnessDigest:SOURCE_WITNESS_DIGEST,sourceFiles:FROZEN_SHA,
    assetCount:31,nodeCount:272,nativeTextCount:76,productCommitAllowed:false,physicalParity:'NOT_RUN'};
  const sectionManifest={...common,rootNodeKey:'node-1:3',originalOrderNotVisualOrder:true,sections};
  const copyManifest={...common,offsetUnit:'utf16',fontFamily:'Pretendard',texts:copy};
  const mediaManifest={...common,slots,overlaidOrInnerFrameKeys:NON_SLOTS};
  const blockers={...common,renderCounts,knownDirectBlockers:KNOWN_DIRECT_BLOCKERS,blockedCases:blocked.map(x=>({target:x.target,reasonCode:x.reasonCode,blockedBy:x.blockedBy??null})),
    qualification:'STRUCTURAL_VALIDATED_RENDER_BLOCKED',productCommitAllowed:false};
  const manifestFiles={
    'source-identity.json':canonicalJson(sourceIdentity),
    'section-manifest.json':canonicalJson(sectionManifest),
    'home-copy-manifest.json':canonicalJson(copyManifest),
    'media-slot-manifest.json':canonicalJson(mediaManifest),
    'render-blocker-manifest.json':canonicalJson(blockers),
  };
  const publicText=Object.fromEntries(copy.map(t=>[t.target,{characters:t.characters,sourceNodeId:t.sourceNodeId,textDigest:t.textDigest,
    usage:t.usage,layout:t.layout,firstRun:{fontFamily:t.runs[0]?.font.family,fontWeight:t.runs[0]?.fontWeight,fontSize:t.runs[0]?.fontSize}}]));
  manifestFiles['../../../../app/data/home-r2-copy.ts'] = `// Generated from frozen Figma Native Text. Edit source/revision, not strings.\nexport const homeFigmaText = ${JSON.stringify(publicText,null,2)} as const;\nexport type HomeFigmaTextKey = keyof typeof homeFigmaText;\nexport const homeText = (id: HomeFigmaTextKey): string => homeFigmaText[id].characters;\n`;
  const bodySections=sections.slice(1,-1).map(x=>({id:x.id,sourceNodeKey:x.sourceNodeKey,visualIndex:x.visualIndex-1,originalOrder:x.originalOrder,contentTextRefs:x.contentTextRefs,mediaSlotRefs:x.mediaSlotRefs}));
  manifestFiles['../../../../app/data/home-r2-manifest.ts'] = `// Generated from the frozen Figma node graph. No assetId is assigned here.\nexport const homeR2Source = ${JSON.stringify({contract:'SMD-HOME-R2-CF2',sourceSnapshotDigest:SOURCE_SNAPSHOT_DIGEST,sourceWitnessDigest:SOURCE_WITNESS_DIGEST,designViewport:[1920,1080],exportCanvas:[1920,9967]},null,2)} as const;\nexport const homeBodySections = ${JSON.stringify(bodySections,null,2)} as const;\nexport type HomeBodySectionId = typeof homeBodySections[number]['id'];\nexport const homeMediaSlots = ${JSON.stringify(Object.fromEntries(slots.map(x=>[x.slotId,x])),null,2)} as const;\nexport type HomeMediaSlotId = keyof typeof homeMediaSlots;\n`;
  return {manifestFiles,sections,slots,texts:copy,blockers,sourceIdentity};
}

export function verifyUntouchedFiles(root,authorizedRevisionDigests={}){
  const data=JSON.parse(readFileSync(join(root,GENERATED_ROOT,'parent-source-sha256.json'),'utf8'));
  if(data.parentZip.sha256!=='05fe22f0f11a07e361b5181252a8dc7905010af1d82d852ce0b1b6ee72ed1de9')fail('SMD_HOME_R2_PARENT_SHA_INVALID');
  for(const [name,digest] of Object.entries(data.unchangedFiles)){
    let found;try{found=sha256(readFileSync(resolve(root,name)));}catch{fail('SMD_HOME_R2_PARENT_FILE_MISSING',name);}
    if(found!==digest && authorizedRevisionDigests[name]!==found)fail('SMD_HOME_R2_NO_TOUCH_DRIFT',name);
  }
  return Object.keys(data.unchangedFiles).length;
}

export function manifestOutputPath(root,name) {
  const p=resolve(root,GENERATED_ROOT,name);
  if(!within(p,resolve(root)))fail('SMD_HOME_R2_MANIFEST_OUTSIDE_ROOT',name);
  return p;
}
