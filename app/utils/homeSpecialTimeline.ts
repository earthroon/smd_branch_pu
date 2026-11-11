/** SMD_HOME_SPECIAL_REVEAL_R1. Presentation and input decisions only.
 * All Figma geometry and the earlier Intro timeline remain independent. */
import { dampedEaseOut } from './homeIntroTimeline.ts';

export const HOME_SPECIAL_TIMING = Object.freeze({
  entryDurationMs: 420,
  titleDurationMs: 520,
  cardDurationMs: 440,
  cardStartMs: [120, 210, 300] as const,
  titleEntryOffsetPx: 24,
  cardEntryOffsetPx: 32,
  gestureQuietMs: 160,
  sustainedSkipAfterMs: 180,
  sustainedSkipDeltaPx: 120,
});

export const HOME_SPECIAL_TARGETS = Object.freeze({
  'node-1:133': 0, // title
  'node-1:131': 1, // card 01
  'node-1:129': 2, // card 02
  'node-1:127': 3, // card 03
} as const);

export type SpecialRevealPhase =
  | 'disabled' | 'unarmed' | 'ready' | 'entering'
  | 'revealing' | 'completed' | 'skipped';
export type SpecialRevealOutcome = 'not-started' | 'completed' | 'skipped' | 'disabled';
export type SpecialSkipIntent = 'ignore' | 'skip-down' | 'skip-up';

export const HOME_SPECIAL_REVEAL_COMPLETE_MS =
  HOME_SPECIAL_TIMING.cardStartMs[2] + HOME_SPECIAL_TIMING.cardDurationMs;

export function specialItemIndex(nodeKey: string): number | null {
  return Object.prototype.hasOwnProperty.call(HOME_SPECIAL_TARGETS, nodeKey)
    ? HOME_SPECIAL_TARGETS[nodeKey as keyof typeof HOME_SPECIAL_TARGETS]
    : null;
}

export function specialItemStartMs(index: number): number {
  switch (index) {
    case 0: return 0;
    case 1: return HOME_SPECIAL_TIMING.cardStartMs[0];
    case 2: return HOME_SPECIAL_TIMING.cardStartMs[1];
    case 3: return HOME_SPECIAL_TIMING.cardStartMs[2];
    default: throw new RangeError('SMD_SPECIAL_ITEM_INDEX_INVALID');
  }
}

export function specialItemProgress(elapsedMs: number, index: number): number {
  if (!Number.isFinite(elapsedMs)) throw new RangeError('SMD_SPECIAL_TIME_INVALID');
  const duration = index === 0 ? HOME_SPECIAL_TIMING.titleDurationMs
    : HOME_SPECIAL_TIMING.cardDurationMs;
  return dampedEaseOut(Math.min(1, Math.max(0, (elapsedMs - specialItemStartMs(index)) / duration)));
}

export function specialEntryProgress(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) throw new RangeError('SMD_SPECIAL_TIME_INVALID');
  return dampedEaseOut(Math.min(1, Math.max(0, elapsedMs / HOME_SPECIAL_TIMING.entryDurationMs)));
}

export function specialEntryTargetY(sectionDocTop: number, headerHeight: number): number {
  if (!Number.isFinite(sectionDocTop) || !Number.isFinite(headerHeight) || headerHeight < 0) {
    throw new RangeError('SMD_SPECIAL_ENTRY_GEOMETRY_INVALID');
  }
  return Math.max(0, sectionDocTop - headerHeight);
}

/** Browser wheel delta modes: 0 CSS pixels, 1 lines, 2 pages. */
export function specialWheelDeltaPx(deltaY: number, deltaMode: number, viewportHeight: number): number {
  if (!Number.isFinite(deltaY) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new RangeError('SMD_SPECIAL_WHEEL_INVALID');
  }
  switch (deltaMode) {
    case 0: return deltaY;
    case 1: return deltaY * 16;
    case 2: return deltaY * viewportHeight;
    default: throw new RangeError('SMD_SPECIAL_WHEEL_MODE_INVALID');
  }
}

/** Classify follow-up input; the wheel that initiated navigation is never counted again.
 * Quiet gap identifies a new gesture. Sustained additional travel permits intentional
 * skip without trapping a user who keeps scrolling. */
export function specialSkipIntent(input: {
  deltaPx: number;
  elapsedSinceEntryMs: number;
  silenceSinceLastWheelMs: number;
  cumulativeFollowUpDownPx: number;
}): SpecialSkipIntent {
  const { deltaPx, elapsedSinceEntryMs, silenceSinceLastWheelMs,
    cumulativeFollowUpDownPx } = input;
  if (![deltaPx, elapsedSinceEntryMs, silenceSinceLastWheelMs, cumulativeFollowUpDownPx]
    .every(Number.isFinite)) throw new RangeError('SMD_SPECIAL_SKIP_INPUT_INVALID');
  if (deltaPx < 0) return 'skip-up';
  if (deltaPx === 0) return 'ignore';
  if (elapsedSinceEntryMs >= HOME_SPECIAL_TIMING.gestureQuietMs &&
      silenceSinceLastWheelMs >= HOME_SPECIAL_TIMING.gestureQuietMs) return 'skip-down';
  if (elapsedSinceEntryMs >= HOME_SPECIAL_TIMING.sustainedSkipAfterMs &&
      cumulativeFollowUpDownPx >= HOME_SPECIAL_TIMING.sustainedSkipDeltaPx) return 'skip-down';
  return 'ignore';
}

export function specialOutcome(phase: SpecialRevealPhase): SpecialRevealOutcome {
  switch (phase) {
    case 'completed': return 'completed';
    case 'skipped': return 'skipped';
    case 'disabled': return 'disabled';
    default: return 'not-started';
  }
}

export function isSpecialTerminal(phase: SpecialRevealPhase): boolean {
  return phase === 'completed' || phase === 'skipped' || phase === 'disabled';
}
