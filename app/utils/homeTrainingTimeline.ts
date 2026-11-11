/** SMD_HOME_TRAINING_REVEAL_R1: presentation contract only.
 * Source Figma node identities and transforms remain immutable. */
import { dampedEaseOut } from './homeIntroTimeline.ts';
import { specialSkipIntent, specialWheelDeltaPx } from './homeSpecialTimeline.ts';

export const HOME_TRAINING_TIMING = Object.freeze({
  entryDurationMs: 420,
  titleStartMs: 0,
  titleDurationMs: 440,
  subtitleStartMs: 240,
  subtitleDurationMs: 420,
  cardStartMs: [580, 750, 920] as const,
  cardDurationMs: 440,
  diagramStartMs: 1360,
  diagramDurationMs: 900,
  textOffsetPx: 24,
  cardOffsetPx: 30,
});

/** Indices are animation slots, not the original Figma paint order. */
export const HOME_TRAINING_TARGETS: Readonly<Record<string, number>> = Object.freeze({
  'node-1:103': 0, // heading
  'node-1:104': 1, // subtitle
  'node-1:313': 2, // card 01
  'node-1:315': 3, // card 02, inside node-1:314
  'node-1:95': 4, // card 03
});

/** Diagram sources span two parents; each reads the same opacity progress. */
export const HOME_TRAINING_DIAGRAM_NODES = Object.freeze([
  'node-1:486', 'node-1:495', // circles
  'node-1:489', 'node-1:500', 'node-1:497', // boxes
  'node-1:488', 'node-1:496', // connectors
  'node-1:501', 'node-1:555', // arrows inside node-1:314
  'node-1:492', 'node-1:498', // AM / PM labels
  'node-1:493', 'node-1:499', 'node-1:494', // step labels
] as const);
const DIAGRAM_SET: ReadonlySet<string> = new Set(HOME_TRAINING_DIAGRAM_NODES);

export const HOME_TRAINING_COMPLETE_MS =
  HOME_TRAINING_TIMING.diagramStartMs + HOME_TRAINING_TIMING.diagramDurationMs;

export type TrainingRevealPhase =
  | 'disabled' | 'unarmed' | 'ready' | 'entering'
  | 'revealing' | 'completed' | 'skipped';
export type TrainingRevealOutcome = 'not-started' | 'completed' | 'skipped' | 'disabled';

export function trainingItemIndex(key: string): number | null {
  return Object.prototype.hasOwnProperty.call(HOME_TRAINING_TARGETS, key)
    ? HOME_TRAINING_TARGETS[key]!
    : null;
}

export function isTrainingDiagramNode(key: string): boolean {
  return DIAGRAM_SET.has(key);
}

export function trainingItemStartMs(index: number): number {
  switch (index) {
    case 0: return HOME_TRAINING_TIMING.titleStartMs;
    case 1: return HOME_TRAINING_TIMING.subtitleStartMs;
    case 2: case 3: case 4: return HOME_TRAINING_TIMING.cardStartMs[index - 2]!;
    default: throw new RangeError('SMD_TRAINING_ITEM_INDEX_INVALID');
  }
}

export function trainingItemProgress(elapsedMs: number, index: number): number {
  if (!Number.isFinite(elapsedMs)) throw new RangeError('SMD_TRAINING_TIME_INVALID');
  const start = trainingItemStartMs(index);
  const duration = index === 0 ? HOME_TRAINING_TIMING.titleDurationMs
    : index === 1 ? HOME_TRAINING_TIMING.subtitleDurationMs
      : HOME_TRAINING_TIMING.cardDurationMs;
  return dampedEaseOut(Math.min(1, Math.max(0, (elapsedMs - start) / duration)));
}

function cubicBezierCoordinate(t: number, a: number, b: number): number {
  const inv = 1 - t;
  return 3 * inv * inv * t * a + 3 * inv * t * t * b + t * t * t;
}

/** CSS cubic-bezier(0.4, 0, 0.2, 1), with x inversion. Opacity only. */
export function trainingDiagramProgress(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) throw new RangeError('SMD_TRAINING_DIAGRAM_TIME_INVALID');
  const x = Math.min(1, Math.max(0,
    (elapsedMs - HOME_TRAINING_TIMING.diagramStartMs) / HOME_TRAINING_TIMING.diagramDurationMs));
  if (x === 0 || x === 1) return x;
  let lo = 0; let hi = 1;
  for (let i = 0; i < 24; i++) {
    const t = (lo + hi) / 2;
    if (cubicBezierCoordinate(t, 0.4, 0.2) < x) lo = t;
    else hi = t;
  }
  return cubicBezierCoordinate((lo + hi) / 2, 0, 1);
}

export function trainingEntryProgress(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) throw new RangeError('SMD_TRAINING_ENTRY_TIME_INVALID');
  return dampedEaseOut(Math.min(1, Math.max(0, elapsedMs / HOME_TRAINING_TIMING.entryDurationMs)));
}

export function trainingEntryTargetY(sectionDocumentTop: number, headerHeight: number): number {
  if (!Number.isFinite(sectionDocumentTop) || !Number.isFinite(headerHeight) || headerHeight < 0) {
    throw new RangeError('SMD_TRAINING_ENTRY_GEOMETRY_INVALID');
  }
  return Math.max(0, sectionDocumentTop - headerHeight);
}

// Reuse Special's input classifier rather than maintaining conflicting gesture rules.
export const trainingSkipIntent = specialSkipIntent;
export const trainingWheelDeltaPx = specialWheelDeltaPx;

export function trainingOutcome(phase: TrainingRevealPhase): TrainingRevealOutcome {
  switch (phase) {
    case 'completed': return 'completed';
    case 'skipped': return 'skipped';
    case 'disabled': return 'disabled';
    default: return 'not-started';
  }
}

export function isTrainingTerminal(phase: TrainingRevealPhase): boolean {
  return phase === 'completed' || phase === 'skipped' || phase === 'disabled';
}

/** Only an explicit Special down-skip that already navigated to Training can auto-reveal. */
export function trainingHandoff(
  specialPhase: string, specialSkipReason: string | null,
): 'none' | 'wheel-ready' | 'at-training' {
  switch (specialPhase) {
    case 'completed': return 'wheel-ready';
    case 'skipped': return specialSkipReason === 'WHEEL_DOWN' ? 'at-training' : 'none';
    default: return 'none';
  }
}
