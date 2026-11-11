/** SMD_HOME_LAYOUT_R1 CF3: source-derived placement outside the existing intro timeline. */
import { figmaScene } from '~/data/figma-r2-scene.generated';
import { introItemIndex } from '~/utils/homeIntroTimeline';
import { createHomeInfoLayout, type InfoLayoutItem } from './homeInfoLayoutMath';

const SOURCE_DIGEST = '5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f';
if (figmaScene.sourceSnapshotDigest !== SOURCE_DIGEST) {
  throw new Error('SMD_HOME_INFO_R1_SOURCE_DIGEST_DRIFT');
}

const items = [
  { index: 0, iconKey: 'node-1:320', textKey: 'node-1:154' },
  { index: 1, iconKey: 'node-1:395', textKey: 'node-1:400', iconOpticalY: 19 },
  { index: 2, iconKey: 'node-1:411', textKey: 'node-1:404' },
  { index: 3, iconKey: 'node-18:26', textKey: 'node-18:58' },
] satisfies readonly InfoLayoutItem[];

for (const item of items) {
  if (introItemIndex(item.textKey) !== item.index ||
    (item.index < 3 && introItemIndex(item.iconKey) !== item.index)) {
    throw new Error(`SMD_HOME_INFO_R1_STAGGER_MAPPING_DRIFT:${item.index}`);
  }
}
export const homeInfoLayout = createHomeInfoLayout(figmaScene.nodes,
  'node-1:134', 'node-18:118', items);
