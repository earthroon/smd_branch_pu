<script setup lang="ts">
import { figmaScene } from '~/data/figma-r2-scene.generated';
import { SMD_HOME_R2_VISUAL_R4 } from '~/data/figma-r2-visual-r4';

// Rendered once in info-bar's SVG coordinate space. The original blocked subtree
// is NOT unblocked: this is a separately approved user-supplied replacement.
const override = SMD_HOME_R2_VISUAL_R4.userFile;
// R4A: the original 80x80 asset contains ~50% empty x-space.
// Preserve the source 98x98 slot and use only a viewport-cropped derived SVG.
const optical = SMD_HOME_R2_VISUAL_R4.userFileOpticalR4A;
const owner = figmaScene.nodes[override.ownerNodeKey];
const group = figmaScene.nodes[override.parentNodeKey];
const section = figmaScene.nodes[override.sectionNodeKey];
const blocked = figmaScene.nodes[override.originalBlockedNodeKey];

if (
  figmaScene.sourceSnapshotDigest !== SMD_HOME_R2_VISUAL_R4.sourceSnapshotDigest ||
  optical.sourceNodeKey !== override.ownerNodeKey ||
  optical.sourceSha256 !== override.bytesSha256 ||
  optical.viewBox !== '18 12 44 56' ||
  optical.sourceViewBox !== '0 0 80 80' ||
  optical.intrinsicSize[0] !== 80 || optical.intrinsicSize[1] !== 80 ||
  optical.preserveAspectRatio !== 'xMidYMid meet' ||
  !owner || !group || !section || !blocked ||
  owner.parent !== override.parentNodeKey ||
  group.parent !== override.sectionNodeKey ||
  blocked.renderStatus !== 'blocked' ||
  blocked.reasonCode !== override.originalBlocker ||
  owner.rect[2] !== 98 || owner.rect[3] !== 98 ||
  group.rect[0] !== 430 || group.rect[1] !== 46 ||
  owner.rect[0] !== 891 || owner.rect[1] !== 32 ||
  section.rect[1] !== 940 ||
  [...owner.affine, ...group.affine].some((v, i) => v !== [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0][i])
) {
  throw new Error('SMD_HOME_R4_FILE_ICON_SOURCE_IDENTITY_MISMATCH');
}

const x = (group.rect[0] ?? NaN) + (owner.rect[0] ?? NaN);
const y = (group.rect[1] ?? NaN) + (owner.rect[1] ?? NaN);
if (!Number.isFinite(x) || !Number.isFinite(y)) {
  throw new Error('SMD_HOME_R4_FILE_ICON_COORDINATE_INVALID');
}
</script>
<template>
  <image
    :href="optical.href"
    :x="x" :y="y"
    width="98" height="98"
    preserveAspectRatio="xMidYMid meet"
    :data-figma-svg-instance="override.ownerNodeKey"
    :data-user-asset-sha256="override.bytesSha256"
    :data-original-svg-href="override.href"
    :data-r4a-optical-bounds="optical.viewBox"
    :data-r4a-derived-svg-sha256="optical.bytesSha256"
    :data-r4a-display-authority="optical.provenance"
    :data-r4-display-authority="override.provenance"
    :data-original-clip-qualification="override.originalClipQualification"
    :data-display-qualification="override.overrideQualification"
  />
</template>
