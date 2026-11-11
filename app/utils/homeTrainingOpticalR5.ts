/** SMD_HOME_TRAINING_R5: display-only text paint and inner-card optical offsets.
 * Coordinates are Figma 1920px viewBox user units, NOT viewport CSS px.
 * Preserve the generated Scene node rects, transforms, source runs, and digests.
 * Values are initial source/screenshot-derived candidates pending physical ink qualification.
 */
export const HOME_TRAINING_R5_FIELD_NODE = 'node-1:478' as const;
export const HOME_TRAINING_R5_FIELD_DIGEST =
  'c22c52246a9ec54420cfb1c362aa28591cae6b3556651da5654ea6540f8efc70' as const;
export const HOME_TRAINING_R5_SOURCE_RUNS = ['인테리어· 유리 ', '필름'] as const;
export const HOME_TRAINING_R5_PAINT_WIDTH = 320;
export const HOME_TRAINING_R5_SOURCE_WIDTH = 232;

export type TrainingR5TextSource = Readonly<{
  digest: string;
  runs: readonly Readonly<{ characters: string; start: number; end: number }>[];
}>;

export function assertHomeTrainingR5TextSource(nodeKey: string, source: TrainingR5TextSource | undefined): void {
  switch (nodeKey) {
    case HOME_TRAINING_R5_FIELD_NODE: {
      const runs = source?.runs;
      if (source?.digest !== HOME_TRAINING_R5_FIELD_DIGEST || runs?.length !== 2 ||
          runs[0]?.characters !== HOME_TRAINING_R5_SOURCE_RUNS[0] ||
          runs[0]?.start !== 0 || runs[0]?.end !== 9 ||
          runs[1]?.characters !== HOME_TRAINING_R5_SOURCE_RUNS[1] ||
          runs[1]?.start !== 9 || runs[1]?.end !== 11) {
        throw new Error('SMD_HOME_TRAINING_R5_TEXT_SOURCE_DRIFT');
      }
      return;
    }
    default: return;
  }
}

/** Expands paint-only width; source rect remains 232x39. */
export function homeTrainingR5PaintWidth(nodeKey: string, sourceWidth: number): number {
  switch (nodeKey) {
    case HOME_TRAINING_R5_FIELD_NODE:
      if (sourceWidth !== HOME_TRAINING_R5_SOURCE_WIDTH) {
        throw new Error('SMD_HOME_TRAINING_R5_FIELD_RECT_DRIFT');
      }
      return HOME_TRAINING_R5_PAINT_WIDTH;
    default: return sourceWidth;
  }
}

export type TrainingR5OpticalOffset = Readonly<{ dx: number; dy: number }>;

/** Distinct child wrappers: never share the reveal target's CSS transform owner.
 * Card background frames node-1:313 / node-1:315 / node-1:95 never move.
 * -4, -40, -14 are initial X candidates informed by the supplied 1920px screenshot.
 * +4/-4 on middle/right icons normalize their Figma bounding-box Y centers.
 */
export const HOME_TRAINING_R5_OPTICAL_MAP: Readonly<Record<string, TrainingR5OpticalOffset>> = Object.freeze({
  'node-1:414': Object.freeze({ dx: -4, dy: 0 }), // first card icon
  'node-1:100': Object.freeze({ dx: -4, dy: 0 }), // first card two-line copy group
  'node-1:477': Object.freeze({ dx: -40, dy: 4 }), // middle card actual icon asset
  'node-1:479': Object.freeze({ dx: -40, dy: 0 }), // middle label
  'node-1:478': Object.freeze({ dx: -40, dy: 0 }), // middle expanded value
  'node-1:482': Object.freeze({ dx: -14, dy: -4 }), // right card icon
  'node-1:484': Object.freeze({ dx: -14, dy: 0 }), // right label
  'node-1:483': Object.freeze({ dx: -14, dy: 0 }), // right value
});

export function homeTrainingR5Optical(nodeKey: string): TrainingR5OpticalOffset | null {
  return HOME_TRAINING_R5_OPTICAL_MAP[nodeKey] ?? null;
}
