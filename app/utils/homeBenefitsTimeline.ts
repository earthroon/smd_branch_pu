/** SMD_HOME_BENEFITS_REVEAL_R1: presentation timing and handoff only.
 * The Figma source scene, paint order and the previous three reveals stay unchanged. */
import { dampedEaseOut } from './homeIntroTimeline.ts';
import { specialSkipIntent, specialWheelDeltaPx } from './homeSpecialTimeline.ts';

export const HOME_BENEFITS_TIMING = Object.freeze({
  entryDurationMs: 420,
  titleStartMs: 0,
  titleDurationMs: 500,
  cardStartMs: [520, 690, 860, 1030] as const,
  cardDurationMs: 460,
  titleEntryOffsetPx: -26,
  cardEntryOffsetPx: 30,
});

/** Indices define motion only; DOM child/paint order must never be rearranged. */
export const HOME_BENEFITS_TARGETS: Readonly<Record<string, number>> = Object.freeze({
  'node-1:92': 0, // two-line heading, Fade-Down
  'node-1:85': 1, // 01 top-left
  'node-18:144': 2, // 02 top-right
  'node-18:86': 3, // 03 bottom-left, nested children remain together
  'node-18:131': 4, // 04 bottom-right
});

export const HOME_BENEFITS_COMPLETE_MS =
  HOME_BENEFITS_TIMING.cardStartMs[3] + HOME_BENEFITS_TIMING.cardDurationMs;

export type BenefitsRevealPhase =
  | 'disabled' | 'unarmed' | 'ready' | 'entering'
  | 'revealing' | 'completed' | 'skipped';
export type BenefitsRevealOutcome = 'not-started' | 'completed' | 'skipped' | 'disabled';

export function benefitsItemIndex(key: string): number | null {
  return Object.prototype.hasOwnProperty.call(HOME_BENEFITS_TARGETS, key)
    ? HOME_BENEFITS_TARGETS[key]!
    : null;
}

export function benefitsItemStartMs(index: number): number {
  switch (index) {
    case 0: return HOME_BENEFITS_TIMING.titleStartMs;
    case 1: case 2: case 3: case 4: return HOME_BENEFITS_TIMING.cardStartMs[index - 1]!;
    default: throw new RangeError('SMD_BENEFITS_ITEM_INDEX_INVALID');
  }
}

export function benefitsItemProgress(elapsedMs: number, index: number): number {
  if (!Number.isFinite(elapsedMs)) throw new RangeError('SMD_BENEFITS_TIME_INVALID');
  const duration = index === 0
    ? HOME_BENEFITS_TIMING.titleDurationMs
    : HOME_BENEFITS_TIMING.cardDurationMs;
  const normalized = Math.min(1, Math.max(0, (elapsedMs - benefitsItemStartMs(index)) / duration));
  return dampedEaseOut(normalized);
}

export function benefitsEntryProgress(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) throw new RangeError('SMD_BENEFITS_ENTRY_TIME_INVALID');
  return dampedEaseOut(Math.min(1, Math.max(0, elapsedMs / HOME_BENEFITS_TIMING.entryDurationMs)));
}

export function benefitsEntryTargetY(sectionDocumentTop: number, headerHeight: number): number {
  if (!Number.isFinite(sectionDocumentTop) || !Number.isFinite(headerHeight) || headerHeight < 0) {
    throw new RangeError('SMD_BENEFITS_ENTRY_GEOMETRY_INVALID');
  }
  return Math.max(0, sectionDocumentTop - headerHeight);
}

/** Same gesture classifier and wheel units as the existing Special/Training path. */
export const benefitsSkipIntent = specialSkipIntent;
export const benefitsWheelDeltaPx = specialWheelDeltaPx;

export function isBenefitsTerminal(phase: BenefitsRevealPhase): boolean {
  return phase === 'completed' || phase === 'skipped' || phase === 'disabled';
}

export function benefitsOutcome(phase: BenefitsRevealPhase): BenefitsRevealOutcome {
  switch (phase) {
    case 'completed': return 'completed';
    case 'skipped': return 'skipped';
    case 'disabled': return 'disabled';
    default: return 'not-started';
  }
}

/** An explicit Training down-skip has already navigated to Benefits.
 * Completion only arms the NEXT wheel. Other terminations never trigger a reveal. */
export function benefitsHandoff(
  trainingPhase: string, trainingSkipReason: string | null,
): 'none' | 'wheel-ready' | 'at-benefits' {
  switch (trainingPhase) {
    case 'completed': return 'wheel-ready';
    case 'skipped': return trainingSkipReason === 'WHEEL_DOWN' ? 'at-benefits' : 'none';
    default: return 'none';
  }
}
