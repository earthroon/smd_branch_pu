/** SMD_HOME_LAYOUT_R1 CF3: SVG-local optical layout. No Figma node bytes are modified. */
export type InfoNode = Readonly<{
  key: string;
  parent: string | null;
  rect: readonly [number, number, number, number];
}>;
export type InfoLayoutItem = Readonly<{
  index: number;
  iconKey: string;
  textKey: string;
  /** Section-local SVG Y delta; does not change frozen Figma geometry. */
  iconOpticalY?: number;
}>;
export type InfoPlacement = Readonly<{
  kind: 'icon' | 'text';
  index: number;
  sourceKey: string;
  scale: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  targetWidth: number;
  targetHeight: number;
  transform: string;
}>;
export type InfoLayoutResult = Readonly<{
  barHeight: number;
  iconBottomY: number;
  textTopY: number;
  nodeTransforms: Readonly<Record<string, InfoPlacement>>;
  fileIcon: InfoPlacement;
}>;

export const HOME_INFO_ICON_SCALE = 0.70;
export const HOME_INFO_TEXT_SCALE = 0.90;
export const HOME_INFO_TOP_PADDING = 28;
export const HOME_INFO_ICON_TEXT_GAP = 16;
export const HOME_INFO_BOTTOM_PADDING = 45;

const fmt = (x: number): string => {
  if (!Number.isFinite(x)) throw new Error('SMD_HOME_INFO_TRANSFORM_NONFINITE');
  return String(Number(x.toFixed(6)));
};

function placement(kind: 'icon' | 'text', index: number, sourceKey: string,
  sourceX: number, sourceY: number, targetX: number, targetY: number,
  sourceWidth: number, sourceHeight: number, scale: number): InfoPlacement {
  return Object.freeze({
    kind, index, sourceKey, scale, sourceX, sourceY, targetX, targetY,
    targetWidth: sourceWidth * scale,
    targetHeight: sourceHeight * scale,
    // Wrap original <g transform="translate(sourceX sourceY)...">, do not edit its affine.
    transform: `translate(${fmt(targetX)} ${fmt(targetY)}) scale(${fmt(scale)}) translate(${-fmtNumber(sourceX)} ${-fmtNumber(sourceY)})`,
  });
}
function fmtNumber(x: number): number { return Number(fmt(x)); }

export function createHomeInfoLayout(
  nodes: Readonly<Record<string, InfoNode>>,
  sectionKey: string,
  groupKey: string,
  items: readonly InfoLayoutItem[],
): InfoLayoutResult {
  const section = nodes[sectionKey];
  const group = nodes[groupKey];
  if (!section || !group || group.parent !== sectionKey || items.length !== 4) {
    throw new Error('SMD_HOME_INFO_SOURCE_GROUP_INVALID');
  }
  const icons: InfoNode[] = [];
  const texts: InfoNode[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index]!;
    if (item.iconOpticalY !== undefined && (!Number.isFinite(item.iconOpticalY) || Math.abs(item.iconOpticalY) > 32)) {
      throw new Error(`SMD_HOME_INFO_OPTICAL_Y_INVALID:${index}`);
    }
    const icon = nodes[item.iconKey];
    const label = nodes[item.textKey];
    if (item.index !== index || !icon || !label || icon.parent !== groupKey || label.parent !== groupKey) {
      throw new Error(`SMD_HOME_INFO_NODE_BINDING_INVALID:${index}`);
    }
    for (const node of [icon, label]) {
      const [x,y,w,h] = node.rect;
      if (![x,y,w,h].every(Number.isFinite) || w <= 0 || h <= 0) {
        throw new Error(`SMD_HOME_INFO_RECT_INVALID:${node.key}`);
      }
    }
    icons.push(icon);
    texts.push(label);
  }
  const maxIconHeight = Math.max(...icons.map(icon => icon.rect[3]));
  const maxTextHeight = Math.max(...texts.map(text => text.rect[3]));
  const iconBottomY = HOME_INFO_TOP_PADDING + maxIconHeight * HOME_INFO_ICON_SCALE;
  const textTopY = iconBottomY + HOME_INFO_ICON_TEXT_GAP;
  const barHeight = textTopY + maxTextHeight * HOME_INFO_TEXT_SCALE + HOME_INFO_BOTTOM_PADDING;
  const nodeTransforms: Record<string,InfoPlacement> = {};
  let fileIcon: InfoPlacement | null = null;

  items.forEach((item, index) => {
    const icon = icons[index]!;
    const text = texts[index]!;
    const centerLocalX = text.rect[0] + text.rect[2] / 2;
    const scaledIconW = icon.rect[2] * HOME_INFO_ICON_SCALE;
    const iconXLocal = centerLocalX - scaledIconW / 2;
    const iconYLocal = iconBottomY - group.rect[1] - icon.rect[3] * HOME_INFO_ICON_SCALE
      + (item.iconOpticalY ?? 0);
    const textXLocal = centerLocalX - text.rect[2] * HOME_INFO_TEXT_SCALE / 2;
    const textYLocal = textTopY - group.rect[1];
    const iconSourceX = icon.rect[0], iconSourceY = icon.rect[1];
    const textSourceX = text.rect[0], textSourceY = text.rect[1];

    // The approved file replacement is rendered in section-local coordinates,
    // not as a FigmaSceneNode child. Keep its own independent wrapper transform.
    if (index === 3) {
      fileIcon = placement('icon', index, item.iconKey,
        group.rect[0] + iconSourceX, group.rect[1] + iconSourceY,
        group.rect[0] + iconXLocal, group.rect[1] + iconYLocal,
        icon.rect[2],icon.rect[3],HOME_INFO_ICON_SCALE);
    } else {
      nodeTransforms[item.iconKey] = placement('icon', index, item.iconKey,
        iconSourceX, iconSourceY, iconXLocal, iconYLocal,
        icon.rect[2],icon.rect[3],HOME_INFO_ICON_SCALE);
    }
    nodeTransforms[item.textKey] = placement('text', index, item.textKey,
      textSourceX, textSourceY, textXLocal, textYLocal,
      text.rect[2],text.rect[3],HOME_INFO_TEXT_SCALE);
  });
  if (!fileIcon || barHeight <= 0 || barHeight >= section.rect[3]) {
    throw new Error('SMD_HOME_INFO_BAR_HEIGHT_INVALID');
  }
  return Object.freeze({ barHeight, iconBottomY, textTopY,
    nodeTransforms: Object.freeze(nodeTransforms), fileIcon });
}
