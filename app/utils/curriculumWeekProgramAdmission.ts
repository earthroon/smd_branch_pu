/** SMD-CURRICULUM-WEEK-R1 CF3: exact-version Public projection admission.
 * Not a replacement for Core CMS Draft/Publication validation. Until Core adds
 * this projection and registers weekly media slots, only source fallback renders.
 */
import { validateCmsRootSlot } from '@smd/content-contracts/page-slot-contracts';
import { CURRICULUM_WEEK_PROGRAM_SCHEMA, CURRICULUM_WEEK_SOURCE_ENTRIES,
  type CurriculumWeekPublishedProgram, type CurriculumWeekPublishedEntry,
  type CurriculumWeekApprovedMedia, type CurriculumWeekMediaSlotV1,
} from '../data/curriculum-week-program.ts';

export class CurriculumWeekProgramError extends Error {
  readonly code='SMD_CURRICULUM_WEEK_PROGRAM_INVALID';
  readonly field:string;
  constructor(field:string){super(`SMD_CURRICULUM_WEEK_PROGRAM_INVALID: ${field}`);this.field=field;}
}
function fail(field:string):never {throw new CurriculumWeekProgramError(field);}
const record=(v:unknown):v is Record<string,unknown> =>
  v!==null && typeof v==='object' && !Array.isArray(v);
function exact(v:unknown,keys:readonly string[],path:string):asserts v is Record<string,unknown>{
  if(!record(v)||Object.keys(v).sort().join('|')!==[...keys].sort().join('|'))fail(path);
}
function text(v:unknown,max:number,path:string):asserts v is string{
  if(typeof v!=='string'||v.length===0||v.length>max||v.trim()!==v||
    /[\u0000-\u001f\u007f]/.test(v)||/<\s*\/?[a-z!]|\{\{|\}\}|javascript:|on\w+\s*=|style\s*=/i.test(v)) fail(path);
}
function optionalText(v:unknown,max:number,path:string):asserts v is string{
  if(typeof v!=='string'||v.length>max||v.trim()!==v||
    /[\u0000-\u001f\u007f]/.test(v)||/<\s*\/?[a-z!]|\{\{|\}\}|javascript:|on\w+\s*=|style\s*=/i.test(v))fail(path);
}
function approvedMedia(
  media:CurriculumWeekMediaSlotV1,id:string,siteMedia:unknown
):CurriculumWeekApprovedMedia{
  if(!record(siteMedia))fail(`${id}.media.publication`);
  if(siteMedia.schema!=='SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1')fail(`${id}.media.publication`);
  const bindings=siteMedia.bindings;
  if(!record(bindings))fail(`${id}.media.registry`);
  if(!Array.isArray(bindings.bindings))fail(`${id}.media.registry`);
  if(!Array.isArray(siteMedia.assets))fail(`${id}.media.registry`);
  const slotId=`curriculum.weeks.${id}.media`;
  const selected=bindings.bindings.filter((v:unknown)=>record(v)&&v.slotId===slotId);
  if(selected.length!==1||!record(selected[0])||selected[0].assetId!==media.assetId||
    selected[0].displayMode!==media.displayMode||selected[0].alt!==media.alt||
    selected[0].title!==media.title)fail(`${id}.media.binding`);
  const assets=siteMedia.assets.filter((v:unknown)=>record(v)&&v.assetId===media.assetId);
  const a=assets[0];
  if(assets.length!==1||!record(a)||!Number.isSafeInteger(a.width)||
    !Number.isSafeInteger(a.height)||(a.width as number)<=0||(a.height as number)<=0||
    !['image/png','image/jpeg','image/webp'].includes(String(a.mimeType)))fail(`${id}.media.asset`);
  return {...media,src:`/api/media/image/${media.assetId}`,
    width:a.width as number,height:a.height as number};
}

export function admitCurriculumWeekProgram(
  projection:unknown,
  publication:{id:string;digest:string},
  siteMedia:unknown,
):CurriculumWeekPublishedProgram {
  exact(projection,['schema','publicationId','publicationDigest','weeks'],'$');
  if(projection.schema!==CURRICULUM_WEEK_PROGRAM_SCHEMA||
    projection.publicationId!==publication.id||
    projection.publicationDigest!==publication.digest||
    !Array.isArray(projection.weeks)||
    projection.weeks.length!==CURRICULUM_WEEK_SOURCE_ENTRIES.length)
    fail('$.publication/weeks');
  // Public-side boundedness does not authorize CMS publication without a Core gate.
  let bytes=0;
  try{bytes=new TextEncoder().encode(JSON.stringify(projection)).byteLength;}
  catch{fail('$.serialization');}
  if(bytes>32768)fail('$.byteBudget');
  if(record(siteMedia) && (siteMedia.publicationId!==publication.id ||
    siteMedia.publicationDigest!==publication.digest))fail('$.siteMedia.publication');
  const cmsIds=new Set<string>();
  const cmsTotal={count:0};
  const parsed:CurriculumWeekPublishedEntry[]=[];
  for(const [index,source] of CURRICULUM_WEEK_SOURCE_ENTRIES.entries()){
    const path=`$.weeks[${index}]`;
    const entry=projection.weeks[index];
    exact(entry,['id','navigation','slots'],path);
    if(entry.id!==source.id)fail(`${path}.id/order`);
    exact(entry.navigation,['label','title'],`${path}.navigation`);
    text(entry.navigation.label,32,`${path}.navigation.label`);
    text(entry.navigation.title,70,`${path}.navigation.title`);
    exact(entry.slots,['detail','media','extensions'],`${path}.slots`);
    const detail=entry.slots.detail;
    if(!record(detail))fail(`${path}.slots.detail`);
    switch(detail.status){
      case 'unassigned': exact(detail,['status'],`${path}.slots.detail`);break;
      case 'ready': {
        exact(detail,['status','eyebrow','heading','description','items'],`${path}.slots.detail`);
        text(detail.eyebrow,90,`${path}.slots.detail.eyebrow`);
        text(detail.heading,130,`${path}.slots.detail.heading`);
        optionalText(detail.description,800,`${path}.slots.detail.description`);
        if(!Array.isArray(detail.items))fail(`${path}.slots.detail.items`);
        if(detail.items.length>8)fail(`${path}.slots.detail.items`);
        detail.items.forEach((v:unknown,i:number)=>text(v,180,`${path}.slots.detail.items[${i}]`));
        break;
      }
      default:fail(`${path}.slots.detail.status`);
    }
    const media=entry.slots.media;
    let qualified:CurriculumWeekApprovedMedia|null=null;
    if(media!==null){
      exact(media,['assetId','alt','title','displayMode'],`${path}.slots.media`);
      if(typeof media.assetId!=='string'||!/^sm_[a-f0-9]{64}$/.test(media.assetId))
        fail(`${path}.slots.media.assetId`);
      text(media.alt,160,`${path}.slots.media.alt`);
      text(media.title,160,`${path}.slots.media.title`);
      if(media.displayMode!=='natural'&&media.displayMode!=='contain')
        fail(`${path}.slots.media.displayMode`);
      qualified=approvedMedia(media as CurriculumWeekMediaSlotV1,source.id,siteMedia);
    }
    const nodes=entry.slots.extensions;
    if(index===0 && detail.status==='unassigned' && (qualified!==null ||
      (Array.isArray(nodes) && nodes.length>0)))fail(`${path}.week01.source-slot-conflict`);
    // Source-reviewed CMS kind registry: no arbitrary HTML/CSS/component URLs.
    validateCmsRootSlot(nodes,['notice','card-grid','faq-group'],`${path}.slots.extensions`,cmsIds,cmsTotal,40);
    parsed.push({id:source.id,navigation:{label:entry.navigation.label,title:entry.navigation.title},
      slots:{detail:detail as CurriculumWeekPublishedEntry['slots']['detail'],
        media:qualified,extensions:nodes}});
  }
  return {schema:CURRICULUM_WEEK_PROGRAM_SCHEMA,
    publicationId:publication.id,publicationDigest:publication.digest,weeks:parsed};
}
