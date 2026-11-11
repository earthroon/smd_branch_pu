/** UI display-only brand spelling. The frozen Figma UTF-16 text, runs and digest remain untouched. */
export const HOME_BRAND_PRESENTATION_R1 = 'SMD_HOME_BRAND_PRESENTATION_R1' as const;

/** Deliberate Figma node allowlist; no global substitution in CMS or metadata. */
export const HOME_BRAND_COPY_NODE_KEYS = [
  'node-35:4', // intro statement
  'node-1:60', // methods heading
  'node-1:92', // benefits heading
  'node-36:7', // closing statement
  'node-1:11', // historic Figma header source, normally owned by SiteHeader
] as const;

const homeBrandNodes: ReadonlySet<string> = new Set(HOME_BRAND_COPY_NODE_KEYS);
const SOURCE_BRAND = 'SMD 아카데미';
const DISPLAY_BRAND = 'SMD아카데미';

export function homeVisibleBrandText(nodeKey: string, text: string): string {
  switch (homeBrandNodes.has(nodeKey)) {
    case true: return text.replaceAll(SOURCE_BRAND, DISPLAY_BRAND);
    case false: return text;
  }
}
