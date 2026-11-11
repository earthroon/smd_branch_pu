import { homeFilmAssets } from '../data/home-film.ts';

/** Logical identity never depends on the physical slot of the infinite loop. */
export type FilmImageId = (typeof homeFilmAssets)[number]['id'];
export type FilmSelectionOrigin = 'pointer' | 'keyboard' | 'touch';

type FilmSelectionBase = {
  generation: number;
  pointerGeneration: number;
  hoverCandidateId: FilmImageId | null;
};

export type FilmSelection =
  | (FilmSelectionBase & { kind: 'idle' })
  | (FilmSelectionBase & { kind: 'preview'; imageId: FilmImageId; origin: 'pointer' | 'keyboard' })
  | (FilmSelectionBase & { kind: 'committed'; imageId: FilmImageId; origin: FilmSelectionOrigin })
  | (FilmSelectionBase & { kind: 'releasing'; imageId: FilmImageId });

export type FilmIntent =
  | { kind: 'hover-candidate'; imageId: FilmImageId; pointerGeneration: number }
  | { kind: 'hover-admit'; imageId: FilmImageId; pointerGeneration: number }
  | { kind: 'hover-leave'; pointerGeneration: number }
  | { kind: 'keyboard-focus'; imageId: FilmImageId }
  | { kind: 'commit'; imageId: FilmImageId; origin: FilmSelectionOrigin }
  | { kind: 'release'; origin: 'keyboard' | 'explicit' }
  | { kind: 'release-complete'; generation: number }
  | { kind: 'cancel-preview'; reason: 'pointercancel' | 'stale' | 'surface-change' };

export type FilmSelectionEffect =
  | { kind: 'none' }
  | { kind: 'preview-started'; imageId: FilmImageId }
  | { kind: 'committed'; imageId: FilmImageId }
  | { kind: 'released' }
  | { kind: 'stale-event' };

export type FilmSelectionResult = { state: FilmSelection; effect: FilmSelectionEffect };
const imageIds = new Set<string>(homeFilmAssets.map((image) => image.id));

export function isFilmImageId(value: unknown): value is FilmImageId {
  return typeof value === 'string' && imageIds.has(value);
}

function requireImageId(id: string): asserts id is FilmImageId {
  switch (isFilmImageId(id)) {
    case true: return;
    case false: throw new Error(`FILM_IMAGE_ID_UNKNOWN: ${id}`);
  }
}

function exhaustiveIntent(neverIntent: never): never {
  throw new Error(`FILM_INTENT_UNHANDLED: ${String(neverIntent)}`);
}

export function initialFilmSelection(): FilmSelection {
  return { kind: 'idle', generation: 0, pointerGeneration: 0, hoverCandidateId: null };
}

function noChange(state: FilmSelection): FilmSelectionResult {
  return { state, effect: { kind: 'none' } };
}

function stale(state: FilmSelection): FilmSelectionResult {
  return { state, effect: { kind: 'stale-event' } };
}

/** Pure reducer. No browser clock, WAAPI, network, worker or mutable external store. */
export function reduceFilmSelection(state: FilmSelection, intent: FilmIntent): FilmSelectionResult {
  switch (intent.kind) {
    case 'hover-candidate': {
      requireImageId(intent.imageId);
      switch (state.kind) {
        case 'committed':
        case 'releasing':
          return noChange(state);
        case 'idle':
        case 'preview': {
          switch (intent.pointerGeneration > state.pointerGeneration) {
            case false: return stale(state);
            case true: {
              const samePreview = state.kind === 'preview' && state.imageId === intent.imageId;
              const base: FilmSelectionBase = {
                generation: state.generation + (samePreview || state.kind === 'idle' ? 0 : 1),
                pointerGeneration: intent.pointerGeneration,
                hoverCandidateId: intent.imageId,
              };
              return {
                state: samePreview ? { ...base, kind: 'preview', imageId: state.imageId, origin: state.origin }
                  : { ...base, kind: 'idle' },
                effect: { kind: 'none' },
              };
            }
          }
        }
      }
    }
    case 'hover-admit': {
      requireImageId(intent.imageId);
      switch (intent.pointerGeneration === state.pointerGeneration && state.hoverCandidateId === intent.imageId) {
        case false: return stale(state);
        case true: {
          switch (state.kind) {
            case 'idle':
              return {
                state: { ...state, kind: 'preview', imageId: intent.imageId, origin: 'pointer', generation: state.generation + 1 },
                effect: { kind: 'preview-started', imageId: intent.imageId },
              };
            case 'preview': return noChange(state);
            case 'committed':
            case 'releasing': return noChange(state);
          }
        }
      }
    }
    case 'hover-leave': {
      switch (intent.pointerGeneration === state.pointerGeneration) {
        case false: return stale(state);
        case true: {
          const base = { ...state, pointerGeneration: state.pointerGeneration + 1, hoverCandidateId: null };
          switch (state.kind) {
            case 'preview': return { state: { ...base, kind: 'idle', generation: state.generation + 1 }, effect: { kind: 'released' } };
            case 'idle': return { state: base, effect: { kind: 'none' } };
            case 'committed': return { state: base, effect: { kind: 'none' } };
            case 'releasing': return { state: base, effect: { kind: 'none' } };
          }
        }
      }
      return noChange(state);
    }
    case 'keyboard-focus': {
      requireImageId(intent.imageId);
      switch (state.kind) {
        case 'committed':
        case 'releasing': return noChange(state);
        case 'idle':
        case 'preview': {
          switch (state.kind === 'preview' && state.imageId === intent.imageId) {
            case true: return noChange(state);
            case false: return {
              state: { ...state, kind: 'preview', imageId: intent.imageId, origin: 'keyboard', hoverCandidateId: null, generation: state.generation + 1 },
              effect: { kind: 'preview-started', imageId: intent.imageId },
            };
          }
        }
      }
      return noChange(state);
    }
    case 'commit': {
      requireImageId(intent.imageId);
      switch (state.kind === 'committed' && state.imageId === intent.imageId) {
        case true: return noChange(state);
        case false: return {
          state: { kind: 'committed', imageId: intent.imageId, origin: intent.origin, generation: state.generation + 1, pointerGeneration: state.pointerGeneration + 1, hoverCandidateId: null },
          effect: { kind: 'committed', imageId: intent.imageId },
        };
      }
    }
    case 'release': {
      switch (state.kind) {
        case 'committed':
          return {
            state: { kind: 'releasing', imageId: state.imageId, generation: state.generation + 1, pointerGeneration: state.pointerGeneration + 1, hoverCandidateId: null },
            effect: { kind: 'released' },
          };
        case 'preview': return {
          state: { kind: 'idle', generation: state.generation + 1, pointerGeneration: state.pointerGeneration + 1, hoverCandidateId: null },
          effect: { kind: 'released' },
        };
        case 'idle':
        case 'releasing': return noChange(state);
      }
    }
    case 'release-complete': {
      switch (state.kind === 'releasing' && state.generation === intent.generation) {
        case false: return stale(state);
        case true: return {
          state: { kind: 'idle', generation: state.generation + 1, pointerGeneration: state.pointerGeneration, hoverCandidateId: null },
          effect: { kind: 'released' },
        };
      }
    }
    case 'cancel-preview': {
      const base = { ...state, pointerGeneration: state.pointerGeneration + 1, hoverCandidateId: null };
      switch (state.kind) {
        case 'idle': return { state: base, effect: { kind: 'none' } };
        case 'preview': return { state: { ...base, kind: 'idle', generation: state.generation + 1 }, effect: { kind: 'released' } };
        case 'committed': return { state: base, effect: { kind: 'none' } };
        case 'releasing': return { state: base, effect: { kind: 'none' } };
      }
    }
    default: return exhaustiveIntent(intent);
  }
}

export type FilmHitSlot = {
  imageId: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** The pointer's current CSS-pixel position, not a center-snapped image index. */
export function filmImageAtPoint(slots: readonly FilmHitSlot[], x: number, y: number): FilmImageId | null {
  switch (Number.isFinite(x) && Number.isFinite(y)) {
    case false: return null;
    case true:
      for (const slot of slots) {
        switch (x >= slot.left && x < slot.right && y >= slot.top && y < slot.bottom) {
          case false: continue;
          case true:
            requireImageId(slot.imageId);
            return slot.imageId;
        }
      }
      return null;
  }
}
