import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSourceFreeze, SOURCE_SNAPSHOT_DIGEST, SOURCE_WITNESS_DIGEST } from './home-r2-source.mjs';

function cssFontSize(px) {
  const minimum = px <= 25 ? Math.max(15, Math.round(px * .7)) : Math.max(20, Math.round(px * .52));
  return `clamp(${minimum}px, ${(px / 19.2).toFixed(5).replace(/0+$/,'').replace(/\.$/,'')}vw, ${px}px)`;
}
function color(rgba){ return `rgba(${rgba.slice(0,3).map(n=>Math.round(n*255)).join(',')},${Number(rgba[3].toFixed(5))})`; }
function cssRun(r) {
  if(r.font.family!=='Pretendard' || r.fills.length!==1 || r.fills[0].kind!=='solid' ||
     !Number.isFinite(r.fontSize) || ![400,500,600,700].includes(r.fontWeight) ||
     r.textCase!=='ORIGINAL') throw new Error('SMD_HOME_R2_CF3_TEXT_VISUAL_UNQUALIFIED');
  const spacing=r.letterSpacing.unit==='PERCENT'?`${r.letterSpacing.value/100}em`:
    r.letterSpacing.unit==='PIXELS'?`${r.letterSpacing.value}px`:null;
  const leading=r.lineHeight.unit==='PIXELS'?cssFontSize(r.lineHeight.value):
    r.lineHeight.unit==='AUTO'?'normal':null;
  if(spacing===null || leading===null)throw new Error('SMD_HOME_R2_CF3_TEXT_RUN_UNQUALIFIED');
  return {characters:r.characters,sourceStartUtf16:r.start,sourceEndUtf16:r.end,
    style:{fontFamily:'var(--font-ui)',fontWeight:r.fontWeight,fontSize:cssFontSize(r.fontSize),letterSpacing:spacing,lineHeight:leading,color:color(r.fills[0].rgba)}};
}
export function buildHomeCf3Visual(root){
  const freeze=buildSourceFreeze(root);
  const file=resolve(root,'docs/migration/smd-home-r2/cf1/figma-source/skin.jsonl');
  const records=readFileSync(file,'utf8').trimEnd().split('\n').map(line=>JSON.parse(line));
  const nodes=new Map(records.filter(x=>x.kind==='node').map(n=>[n.nodeKey,n]));
  const texts=records.filter(x=>x.kind==='native-text');
  const mapped=Object.fromEntries(texts.map(x=>[x.target,{textDigest:x.textDigest,runs:x.runs.map(cssRun)}]));
  for(const t of texts){const joined=mapped[t.target].runs.map(r=>r.characters).join('');if(joined!==t.characters)throw new Error('SMD_HOME_R2_CF3_TEXT_RUN_MISMATCH');}
  const lines=records.filter(x=>x.kind==='line-stroke-source-v9-r2b').map(x=>{
    const node=nodes.get(x.target);
    if(!node||node.nodeKind!=='LINE'||node.rectLocal[3]!==0||x.sourceNodeKind!=='LINE'||
       x.status!=='candidate'||x.exportEvidence.method!=='analytic-svg'||
       x.exportEvidence.failureCode!=='FNS_R2B_LINE_FIGMA_SVG_FAILED'||
       x.sourceWitnessDigest!==SOURCE_WITNESS_DIGEST)throw new Error('SMD_HOME_R2_CF3_LINE_SOURCE_INVALID');
    return {target:x.target,parentNodeKey:node.parent,rectLocal:node.rectLocal,
      transformLocal:node.transformLocal,centerlineLocal:x.centerlineLocal,
      sourceWitnessDigest:x.sourceWitnessDigest,lineSourceDigest:x.lineSourceDigest,
      assetId:x.exportEvidence.assetId,renderMethod:x.exportEvidence.method,
      visualQualification:'CANDIDATE_NOT_PIXEL_VERIFIED',stroke:x.stroke};
  });
  if(lines.length!==15||texts.length!==76||freeze.sections.length!==11||freeze.slots.length!==8)throw new Error('SMD_HOME_R2_CF3_SOURCE_DRIFT');
  const sections=freeze.sections.map(x=>({...x,visualQualification:'SOURCE_GEOMETRY_ONLY'}));
  const blockers=freeze.blockers;
  const witness={contract:'SMD-HOME-R2-CF3',sourceSnapshotDigest:SOURCE_SNAPSHOT_DIGEST,sourceWitnessDigest:SOURCE_WITNESS_DIGEST,
    desktopViewport:[1920,1080],fullScrollSource:[1920,9967],
    sections:sections.map(x=>({id:x.id,nodeKey:x.sourceNodeKey,rectLocal:x.rectLocal,originalOrder:x.originalOrder,visualIndex:x.visualIndex})),
    lineCandidates:lines,clipBlockers:{direct:blockers.knownDirectBlockers,propagatedCount:30,sourceStatus:'VISUAL_UNQUALIFIED'},
    physicalPixelParity:'NOT_RUN',responsiveViewportWidths:[360,390,430,768,1024,1280,1440,1920,2560,3440,3840]};
  const runtimeData=`// Generated from frozen Figma Schema 9 Native Text. Do not edit directly.\nimport type {HomeFigmaTextKey} from './home-r2-copy';\nexport const homeR2VisualText = ${JSON.stringify(mapped,null,2)} as const satisfies Record<HomeFigmaTextKey,{textDigest:string;runs:readonly {characters:string;sourceStartUtf16:number;sourceEndUtf16:number;style:{fontFamily:string;fontWeight:number;fontSize:string;letterSpacing:string;lineHeight:string;color:string}}[]}>;\n`;
  const lineData=`// Generated from frozen Figma LINE sources (analytic SVG CANDIDATES, not pixel qualified).\nexport const homeR2LineCandidates = ${JSON.stringify(Object.fromEntries(lines.map(x=>[x.target,x])),null,2)} as const;\nexport type HomeR2LineNodeKey = keyof typeof homeR2LineCandidates;\n`;
  const witnessData=`${JSON.stringify(witness,null,2)}\n`;
  return {outputs:{'app/data/home-r2-visual-text.ts':runtimeData,'app/data/home-r2-line-candidates.ts':lineData,
    'docs/migration/smd-home-r2/cf3/visual-witness.json':witnessData},witness,textCount:texts.length,lineCount:lines.length};
}
