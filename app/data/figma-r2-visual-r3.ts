/** R3 USER VISUAL OVERRIDES. The Schema9 source and 31 canonical SVG assets remain immutable.
 * CF7 `node-18:57` is BLOCKED_SOURCE_WITNESS, not admitted by these overrides.
 */
export const r3MethodsTextSizes = {
  'node-18:114': {fontSize:36,letterSpacing:-0.72,kind:'heading'},
  'node-1:61': {fontSize:36,letterSpacing:-0.72,kind:'heading'},
  'node-18:116': {fontSize:36,letterSpacing:-0.72,kind:'heading'},
  'node-18:115': {fontSize:24,letterSpacing:-0.48,kind:'description'},
  'node-1:62': {fontSize:24,letterSpacing:-0.48,kind:'description'},
  'node-18:117': {fontSize:24,letterSpacing:-0.48,kind:'description'},
} as const;
export type R3MethodsTextNodeKey = keyof typeof r3MethodsTextSizes;
export function r3MethodsTextOverride(nodeKey: string) {
  return Object.prototype.hasOwnProperty.call(r3MethodsTextSizes,nodeKey) ?
    r3MethodsTextSizes[nodeKey as R3MethodsTextNodeKey] : undefined;
}
export const r3Svg = {
  'node-1:52': {kind:'methods-seam',sourceAsset:'asset-e1e7cd4844e6428824ab3155bf5b13f04bd986556036176a91c59a872a77a1a7',
     authority:'USER_REQUESTED_SEAM_OVERRIDE_R3'},
  'node-1:482': {kind:'helmet-weight',sourceAsset:'asset-2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595',
     href:'/figma-r2/derived/helmet-weight-r3.svg',derivedSha256:'848c8bc3b70a65bae95f4a245f1d0e920ffac3f8c4ae23e5ad6a5add11b637e5',
     authority:'USER_VISUAL_ICON_WEIGHT_OVERRIDE_R3',qualification:'PENDING_VISUAL_APPROVAL'},
  'node-1:501': {kind:'chevron-ink',sourceAsset:'asset-8a780adf1d97823fd3a50f0a1933bbf80f557213d78346445d7f4b5982dc255f',
     href:'/figma-r2/derived/chevron-ink-r3.svg',derivedSha256:'85002f4158a7bf09f26116ddd122d4249e4fdbbe740b5cbfcf1ce407779c7737',
     authority:'USER_VISUAL_CHEVRON_INK_OVERRIDE_R3'},
  'node-1:555': {kind:'chevron-ink',sourceAsset:'asset-8a780adf1d97823fd3a50f0a1933bbf80f557213d78346445d7f4b5982dc255f',
     href:'/figma-r2/derived/chevron-ink-r3.svg',derivedSha256:'85002f4158a7bf09f26116ddd122d4249e4fdbbe740b5cbfcf1ce407779c7737',
     authority:'USER_VISUAL_CHEVRON_INK_OVERRIDE_R3'},
} as const;
export type R3SvgNodeKey = keyof typeof r3Svg;
export function r3SvgOverride(nodeKey: string, sourceAsset: string) {
  const v=Object.prototype.hasOwnProperty.call(r3Svg,nodeKey) ? r3Svg[nodeKey as R3SvgNodeKey] : undefined;
  if(v && v.sourceAsset!==sourceAsset) throw new Error(`R3_SVG_SOURCE_IDENTITY_MISMATCH ${nodeKey}`);
  return v;
}
export const r3ClipRecovery = {
  nodeKey:'node-18:57', reasonCode:'FNS_CLIP_WITNESS_MISSING', status:'BLOCKED_SOURCE_WITNESS',
  expectedOwner:'node-18:26', exportRequired:'original Figma Clip path group with mask and artwork'
} as const;
