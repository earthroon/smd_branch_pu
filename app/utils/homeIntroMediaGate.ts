/** SMD HOME HERO CAROUSEL R1F: the active (visible) Hero owns media admission. */
export type HeroMediaStatus = Readonly<{
  phase: 'loading' | 'ready' | 'failed';
  sourceRevision: string;
  reason: string | null;
}>;

/** No timer can open the Intro merely because img.complete became true. */
export const INTRO_MEDIA_TIMEOUT_MS = 15_000;
export const INTRO_GEOMETRY_STABLE_FRAMES = 2;

export function introMediaAdmitted(status: HeroMediaStatus | null): boolean {
  return status?.phase === 'ready' && status.sourceRevision.length > 0 && status.reason === null;
}

export function canPresentIntro(
  status: HeroMediaStatus | null,
  geometryReady: boolean,
  fontsReady: boolean,
  stableFrames: number,
): boolean {
  return introMediaAdmitted(status) && geometryReady && fontsReady &&
    Number.isSafeInteger(stableFrames) && stableFrames >= INTRO_GEOMETRY_STABLE_FRAMES;
}
