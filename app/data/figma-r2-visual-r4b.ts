/** SMD Home R2 R4B presentation-only overrides. No Figma source mutation. */
export const HOME_R4B_HELMET = {
  contract: 'SMD_HOME_R2_VISUAL_REPAIR_R4B',
  nodeKey: 'node-1:482',
  parentNodeKey: 'node-1:95',
  sourceAssetId: 'asset-2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595',
  sourceAssetSha256: '2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595',
  sourceWidth: 104,
  sourceHeight: 64,
  renderedCandidateId: 'B1_CANONICAL_SOURCE_NO_EROSION',
  previousCandidateId: 'B0_R3_ERODE_0_65',
  authority: 'USER_VISUAL_HELMET_OPTICAL_R4B',
  qualification: 'VISUAL_PENDING',
} as const;

export const HOME_R4B_CARD3_TITLE = {
  nodeKey: 'node-18:116',
  originalTextDigest: 'bc22e87b6d91e4bed222827400a5b20a9fc0f80d564018bfdf9db8e3267c200c',
  text: '밑작업 중심의 반복 실습',
  originalFontWeight: 500,
  displayFontWeight: 600,
  inheritedDisplayFontSize: 36,
  inheritedLetterSpacingPx: -0.72,
  authority: 'USER_REQUESTED_METHOD_CARD3_TITLE_SEMIBOLD_R4B',
} as const;

/** Only the exact helmet is eligible; a changed asset ID or hash fails closed. */
export function resolveR4BHelmetCandidate(
  nodeKey: string,
  sourceAssetId: string,
  observedAssetSha256: string | undefined,
): typeof HOME_R4B_HELMET | null {
  switch (nodeKey) {
    case HOME_R4B_HELMET.nodeKey:
      switch (sourceAssetId === HOME_R4B_HELMET.sourceAssetId &&
        observedAssetSha256 === HOME_R4B_HELMET.sourceAssetSha256) {
        case true: return HOME_R4B_HELMET;
        case false: throw new Error('SMD_R4B_HELMET_SOURCE_IDENTITY_MISMATCH');
      }
    default: return null;
  }
}
