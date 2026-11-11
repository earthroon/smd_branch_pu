/** SMD_HOME_MEDIA_SLOT_R2 · exactly three editable Hero photo slots.
 * R1's eight Figma photo slots and all published media contracts remain unchanged.
 * This module is consulted only for Standalone LOCAL media, never for Published media.
 */
import {homeFilmAssets, type FilmImageId} from '../data/home-film.ts';
import {homeHeroLocalMediaSlots, type HomeLocalMediaDraft} from '../data/home-local-media.ts';
import {assertHomeLocalMediaPath} from './homeLocalMedia.ts';

export type HomeHeroLocalImage = Readonly<{
  src: string; alt: string; title: string; width: number; height: number;
}>;

/** Null is not a silent fallback: all 3 Hero slides are required by the Carousel. */
export function resolveHomeHeroLocalMedia(
  id: FilmImageId,
  drafts: Readonly<Partial<Record<FilmImageId, HomeLocalMediaDraft>>> = homeHeroLocalMediaSlots,
): HomeHeroLocalImage {
  const source = homeFilmAssets.find(asset => asset.id === id);
  if (!source) throw new Error(`SMD_HOME_HERO_SLOT_UNKNOWN:${id}`);
  const draft = drafts[id];
  if (!draft || draft.src === null || typeof draft.src !== 'string') {
    throw new Error(`SMD_HOME_HERO_SLOT_UNBOUND:${id}`);
  }
  // The original checked-in Hero paths are preserved exactly, including 1(1).jpg.
  // New manual addresses use the same strictly validated /media/home/ root as R1.
  switch (draft.src === source.src) {
    case true: break;
    case false: assertHomeLocalMediaPath(draft.src); break;
  }
  const {src, alt, title, width, height} = draft;
  if (typeof alt !== 'string' || typeof title !== 'string' ||
      !alt.trim() || !title.trim() || alt.length > 240 || title.length > 240 ||
      /[<>\u0000-\u001f]/.test(alt + title) ||
      !Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      Number(width) <= 0 || Number(height) <= 0 ||
      Number(width) > 50000 || Number(height) > 50000) {
    throw new Error(`SMD_HOME_HERO_METADATA_INVALID:${id}`);
  }
  return {src, alt, title, width: width as number, height: height as number};
}

export function assertHomeHeroLocalMediaRegistry(
  drafts: Readonly<Partial<Record<FilmImageId, HomeLocalMediaDraft>>> = homeHeroLocalMediaSlots,
): void {
  const required = homeFilmAssets.map(asset => asset.id).sort();
  if (JSON.stringify(Object.keys(drafts).sort()) !== JSON.stringify(required)) {
    throw new Error('SMD_HOME_HERO_SLOT_REGISTRY_DRIFT');
  }
  for (const id of required) resolveHomeHeroLocalMedia(id, drafts);
}
