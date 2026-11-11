/** Explicit UI-only correction, approved after the frozen Figma JSONL export. */
import {homeFigmaText} from './home-r2-copy.ts';

export const HOME_HEADER_BRAND_R1 = {
  contract: 'SMD_HOME_HEADER_BRAND_DISPLAY_R1',
  provenance: 'USER_APPROVED_COPY_OVERRIDE_V1',
  sourceNodeKey: 'node-1:11',
  sourceText: 'SMD 아카데미',
  displayText: 'SMD아카데미',
  fontWeight: 800,
} as const;

export function assertHomeHeaderBrandR1(): void {
  const value = HOME_HEADER_BRAND_R1;
  if (value.contract !== 'SMD_HOME_HEADER_BRAND_DISPLAY_R1' ||
      value.sourceNodeKey !== 'node-1:11' ||
      value.provenance !== 'USER_APPROVED_COPY_OVERRIDE_V1' ||
      homeFigmaText[value.sourceNodeKey].characters !== value.sourceText ||
      value.displayText !== 'SMD아카데미' ||
      value.fontWeight !== 800) {
    throw new Error('SMD_HOME_R2_HEADER_DISPLAY_CONTRACT_INVALID');
  }
}
