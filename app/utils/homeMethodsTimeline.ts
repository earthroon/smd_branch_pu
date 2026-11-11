/** SMD_HOME_METHODS_REVEAL_R1.
 * Methods presentation timing and target identity only. Figma geometry and the
 * Intro/Special/Training/Benefits controllers remain independent authorities. */
import { dampedEaseOut } from './homeIntroTimeline.ts';
import { specialSkipIntent, specialWheelDeltaPx } from './homeSpecialTimeline.ts';

export const HOME_METHODS_TIMING = Object.freeze({
  entryDurationMs: 420,
  titleStartMs: 0,
  titleDurationMs: 500,
  titleEntryOffsetPx: -26,
  postTitleGapMs: 180,
  cardStartMs: Object.freeze([680, 880, 1080] as const),
  cardDurationMs: 440,
  cardEntryOffsetPx: 30,
  textStartMs: Object.freeze([1200, 1400, 1600] as const),
  textDurationMs: 300,
});

/** Source order and visual left-to-right order agree. Never reorder the Figma
 * childKeys or move sibling text nodes under the corresponding frame. */
export const HOME_METHODS_TARGETS = Object.freeze({
  title: 'node-1:60',
  cards: Object.freeze(['node-1:54', 'node-1:56', 'node-1:58'] as const),
  text: Object.freeze([
    Object.freeze(['node-18:114', 'node-18:115'] as const),
    Object.freeze(['node-1:61', 'node-1:62'] as const),
    Object.freeze(['node-18:116', 'node-18:117'] as const),
  ] as const),
});

export const HOME_METHODS_COMPLETE_MS =
  HOME_METHODS_TIMING.textStartMs[2] + HOME_METHODS_TIMING.textDurationMs;

export type MethodsRevealPhase =
  | 'disabled' | 'unarmed' | 'ready' | 'entering'
  | 'revealing' | 'completed' | 'skipped';
export type MethodsRevealOutcome = 'not-started' | 'completed' | 'skipped' | 'disabled';
export type MethodsHandoff = 'none' | 'wheel-ready' | 'at-methods';
export type MethodsCardIndex = 0 | 1 | 2;

const cardIndexByKey: Readonly<Record<string, MethodsCardIndex>> = Object.freeze({
  'node-1:54': 0, 'node-1:56': 1, 'node-1:58': 2,
});
const textIndexByKey: Readonly<Record<string, MethodsCardIndex>> = Object.freeze({
  'node-18:114': 0, 'node-18:115': 0,
  'node-1:61': 1, 'node-1:62': 1,
  'node-18:116': 2, 'node-18:117': 2,
});

export function isMethodsTitle(key: string): boolean {
  return key === HOME_METHODS_TARGETS.title;
}
export function methodsCardIndex(key: string): MethodsCardIndex | null {
  return Object.prototype.hasOwnProperty.call(cardIndexByKey, key) ? cardIndexByKey[key] ?? null : null;
}
export function methodsTextIndex(key: string): MethodsCardIndex | null {
  return Object.prototype.hasOwnProperty.call(textIndexByKey, key) ? textIndexByKey[key] ?? null : null;
}

function progress(time: number, start: number, duration: number): number {
  if (!Number.isFinite(time)) throw new RangeError('SMD_METHODS_TIME_INVALID');
  return dampedEaseOut(Math.min(1, Math.max(0, (time - start) / duration)));
}
export function methodsTitleProgress(elapsedMs: number): number {
  return progress(elapsedMs, HOME_METHODS_TIMING.titleStartMs, HOME_METHODS_TIMING.titleDurationMs);
}
export function methodsCardStartMs(index: number): number {
  switch (index) {
    case 0: return HOME_METHODS_TIMING.cardStartMs[0];
    case 1: return HOME_METHODS_TIMING.cardStartMs[1];
    case 2: return HOME_METHODS_TIMING.cardStartMs[2];
    default: throw new RangeError('SMD_METHODS_CARD_INDEX_INVALID');
  }
}
export function methodsTextStartMs(index: number): number {
  switch (index) {
    case 0: return HOME_METHODS_TIMING.textStartMs[0];
    case 1: return HOME_METHODS_TIMING.textStartMs[1];
    case 2: return HOME_METHODS_TIMING.textStartMs[2];
    default: throw new RangeError('SMD_METHODS_TEXT_INDEX_INVALID');
  }
}
export function methodsCardProgress(elapsedMs: number, index: number): number {
  return progress(elapsedMs, methodsCardStartMs(index), HOME_METHODS_TIMING.cardDurationMs);
}
export function methodsTextProgress(elapsedMs: number, index: number): number {
  return progress(elapsedMs, methodsTextStartMs(index), HOME_METHODS_TIMING.textDurationMs);
}
export function methodsEntryProgress(elapsedMs: number): number {
  return progress(elapsedMs, 0, HOME_METHODS_TIMING.entryDurationMs);
}
export function methodsEntryTargetY(sectionDocumentTop: number, headerHeight: number): number {
  if (!Number.isFinite(sectionDocumentTop) || !Number.isFinite(headerHeight) || headerHeight < 0)
    throw new RangeError('SMD_METHODS_ENTRY_GEOMETRY_INVALID');
  return Math.max(0, sectionDocumentTop - headerHeight);
}

/** Preserve the already admitted gesture classifier and its wheel-tail rules. */
export const methodsSkipIntent = specialSkipIntent;
export const methodsWheelDeltaPx = specialWheelDeltaPx;

export function methodsHandoff(benefitsPhase: string, benefitsSkipReason: string | null): MethodsHandoff {
  switch (benefitsPhase) {
    case 'completed': return 'wheel-ready';
    case 'skipped': return benefitsSkipReason === 'WHEEL_DOWN' ? 'at-methods' : 'none';
    default: return 'none';
  }
}
export function isMethodsTerminal(phase: MethodsRevealPhase): boolean {
  return phase === 'completed' || phase === 'skipped' || phase === 'disabled';
}
export function methodsOutcome(phase: MethodsRevealPhase): MethodsRevealOutcome {
  switch (phase) {
    case 'completed': return 'completed';
    case 'skipped': return 'skipped';
    case 'disabled': return 'disabled';
    default: return 'not-started';
  }
}
