/** SMD_HOME_WHEEL_SKIP_GATE_R1.
 * A brief wheel twitch must not retire a one-shot reveal. This gate owns only
 * FOLLOW-UP skip intent confirmation, never the initial scene-entry wheel.
 * No timers, replay, global listeners, or modifications to scroll position.
 */
export const HOME_WHEEL_SKIP_GATE = Object.freeze({
  confirmDurationMs: 50,
  confirmTravelPx: 40,
  maxSameGestureGapMs: 160,
  minimumEvents: 2,
});

export type HomeWheelSkipIntent = 'ignore' | 'skip-up' | 'skip-down';
type Candidate = {
  direction: Exclude<HomeWheelSkipIntent, 'ignore'>;
  firstAtMs: number;
  lastAtMs: number;
  traveledPx: number;
  eventCount: number;
};

/** An intentional follow-up must persist for >=50ms with >=40 CSS px of
 * same-direction travel across at least two wheel events. One-off/reversing
 * pulses are suppressed. A deliberate one-event wheel notch no longer skips;
 * the user may scroll again to confirm. The confirming UP wheel stays native.
 */
export function createHomeWheelSkipGate(): {
  observe: (nowMs: number, deltaPx: number, requested: HomeWheelSkipIntent) => HomeWheelSkipIntent;
  reset: () => void;
} {
  let candidate: Candidate | null = null;

  function reset(): void { candidate = null; }

  function observe(
    nowMs: number, deltaPx: number, requested: HomeWheelSkipIntent,
  ): HomeWheelSkipIntent {
    if (!Number.isFinite(nowMs) || !Number.isFinite(deltaPx) || nowMs < 0 ||
        !['ignore', 'skip-up', 'skip-down'].includes(requested)) {
      throw new RangeError('SMD_HOME_WHEEL_SKIP_GATE_INPUT_INVALID');
    }
    if (deltaPx === 0) return 'ignore';

    const direction = deltaPx < 0 ? 'skip-up' : 'skip-down';
    if (requested !== 'ignore' && requested !== direction) {
      throw new RangeError('SMD_HOME_WHEEL_SKIP_GATE_DIRECTION_CONFLICT');
    }
    const distance = Math.abs(deltaPx);

    if (candidate && (candidate.direction !== direction ||
        nowMs < candidate.lastAtMs ||
        nowMs - candidate.lastAtMs > HOME_WHEEL_SKIP_GATE.maxSameGestureGapMs)) {
      candidate = null;
    }
    if (!candidate) {
      // No candidate is allowed to start merely from a wheel tail classified
      // as 'ignore' by the existing Special/Training/Benefits/Methods policy.
      if (requested === 'ignore') return 'ignore';
      candidate = {direction, firstAtMs: nowMs, lastAtMs: nowMs,
        traveledPx: distance, eventCount: 1};
      return 'ignore';
    }

    candidate.lastAtMs = nowMs;
    candidate.traveledPx += distance;
    candidate.eventCount += 1;
    if (requested !== candidate.direction) return 'ignore';
    if (nowMs - candidate.firstAtMs < HOME_WHEEL_SKIP_GATE.confirmDurationMs ||
        candidate.traveledPx < HOME_WHEEL_SKIP_GATE.confirmTravelPx ||
        candidate.eventCount < HOME_WHEEL_SKIP_GATE.minimumEvents) return 'ignore';

    const confirmed = candidate.direction;
    candidate = null;
    return confirmed;
  }

  return {observe, reset};
}
