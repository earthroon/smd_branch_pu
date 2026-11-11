/** SMD_HOME_LAYOUT_R1 CF1: generated Scene is the only Y-axis source authority. */
import { figmaScene } from '~/data/figma-r2-scene.generated';
import { HOME_BODY_EXPECTED_IDS } from '~/data/home-r2-composition';
import { createHomeWideLayout } from './homeWideLayoutMath';

const SOURCE_DIGEST = '5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f';
if (figmaScene.sourceSnapshotDigest !== SOURCE_DIGEST) {
  throw new Error('SMD_HOME_LAYOUT_R1_SOURCE_DIGEST_DRIFT');
}
const BODY_IDS = HOME_BODY_EXPECTED_IDS.filter((id) => id !== 'hero' && id !== 'info-bar');
export const homeWideLayout = createHomeWideLayout(figmaScene.sections, BODY_IDS);
