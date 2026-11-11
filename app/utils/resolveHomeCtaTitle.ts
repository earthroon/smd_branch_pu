import type {PublicContentV2} from '@smd/content-contracts/contracts';
/** Read-only view of the additive V1 CMS promotion.homeCtaTitle copy slot. */
export function resolveHomeCtaTitle(promotion:PublicContentV2['promotion']|null|undefined):string {
  if(!promotion)return '상담 신청하기';
  const value:unknown=(promotion as PublicContentV2['promotion'] & {homeCtaTitle?:unknown}).homeCtaTitle;
  if(value===undefined)return promotion.ctaTitle;
  if(typeof value!=='string'||value.length===0||value.length>120||
     value!==value.trim()||/[\u0000-\u001f\u007f<>]/.test(value))
    throw new Error('CMS_HOME_CTA_COPY_SLOT_INVALID');
  return value;
}
