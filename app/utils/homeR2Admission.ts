/** CF2 does not remap legacy CMS inserts to new Figma sections. Unknown or populated slots fail closed. */
export const LEGACY_HOME_SLOT_NAMES = [
  'afterHero', 'afterStatement', 'afterTeach', 'afterPractice', 'beforeCta',
] as const;

export type HomeLegacySlotStatus = { kind: 'empty'; nodeCount: 0 } | {
  kind: 'conflict'; code: 'SMD_HOME_R2_LEGACY_SLOT_CONFLICT' | 'SMD_HOME_R2_LEGACY_SLOT_INVALID';
  nodeCount: number | null;
  slot: string;
};

export function examineHomeLegacySlots(value: unknown): HomeLegacySlotStatus {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return { kind: 'conflict', code: 'SMD_HOME_R2_LEGACY_SLOT_INVALID', nodeCount: null, slot: '<home>' };
  }
  const slots = value as Record<string, unknown>;
  const known = new Set<string>(LEGACY_HOME_SLOT_NAMES);
  let nodeCount = 0;
  for (const [slot, nodes] of Object.entries(slots)) {
    if (!known.has(slot) || !Array.isArray(nodes)) {
      return { kind: 'conflict', code: 'SMD_HOME_R2_LEGACY_SLOT_INVALID', nodeCount: null, slot };
    }
    nodeCount += nodes.length;
    if (nodes.length > 0) {
      return { kind: 'conflict', code: 'SMD_HOME_R2_LEGACY_SLOT_CONFLICT', nodeCount, slot };
    }
  }
  return { kind: 'empty', nodeCount: 0 };
}
