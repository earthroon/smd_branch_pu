/** SMD-HOME-HERO-CAROUSEL-R1-CF1: presentation-only slots.
 * Existing hero IDs and Standalone Media publication authority remain canonical.
 * Focal points start at the explicit neutral center; they are not measured scene anchors.
 */
import { homeFilmAssets, type FilmImageId } from './home-film.ts';

export const HERO_CAROUSEL_REVISION = 'SMD-HOME-HERO-CAROUSEL-R1-CF1-CF3' as const;
export const HERO_CAROUSEL_DELAY_MS = 3000 as const;
/** R2 motion timing; image fade start is the caption delay's T=0 authority. */
export const HERO_DISSOLVE_DURATION_MS = 700 as const;
export const HERO_CAPTION_START_DELAY_MS = 20 as const;
export const HERO_CAPTION_FADE_MS = 420 as const;
export const HERO_CAPTION_RISE_PX = 12 as const;
const HERO_IMAGE_IDS = ['hero-1', 'hero-2', 'hero-3'] as const satisfies readonly FilmImageId[];

export type HeroFocalPoint = Readonly<{ xPercent: number; yPercent: number }>;
export type HeroMediaResolution =
  | Readonly<{ kind: 'local'; src?: string; alt?: string; width?: number; height?: number }>
  | Readonly<{
      kind: 'published'; publicationId: string; assetId: string;
      src: string; alt: string; width: number; height: number;
    }>
  | Readonly<{ kind: 'unbound' }>;
export type HeroCarouselSlot = Readonly<{
  slotId: FilmImageId;
  imageId: FilmImageId;
  order: number;
  src: string;
  alt: string;
  width: number;
  height: number;
  focalPoint: HeroFocalPoint;
  publicationId: string | null;
  assetId: string | null;
}>;

export const heroCarouselFocalPoints: Readonly<Record<FilmImageId, HeroFocalPoint>> = Object.freeze({
  'hero-1': Object.freeze({ xPercent: 50, yPercent: 50 }),
  'hero-2': Object.freeze({ xPercent: 50, yPercent: 50 }),
  'hero-3': Object.freeze({ xPercent: 50, yPercent: 50 }),
});

function validDimension(n: number): boolean {
  return Number.isSafeInteger(n) && n > 0;
}

export function resolveHeroCarouselSlots(
  resolveMedia: (id: FilmImageId) => HeroMediaResolution,
): readonly HeroCarouselSlot[] {
  if (homeFilmAssets.length !== HERO_IMAGE_IDS.length ||
      homeFilmAssets.some((asset, i) => asset.id !== HERO_IMAGE_IDS[i])) {
    throw new Error('HERO_CAROUSEL_SLOT_ORDER_DRIFT');
  }

  const observed = new Set<FilmImageId>();
  const slots = homeFilmAssets.map((asset, order): HeroCarouselSlot => {
    if (observed.has(asset.id)) throw new Error(`HERO_CAROUSEL_DUPLICATE_IMAGE:${asset.id}`);
    observed.add(asset.id);
    const focalPoint = heroCarouselFocalPoints[asset.id];
    if (!focalPoint || ![focalPoint.xPercent, focalPoint.yPercent]
      .every(n => Number.isFinite(n) && n >= 0 && n <= 100)) {
      throw new Error(`HERO_CAROUSEL_FOCAL_INVALID:${asset.id}`);
    }
    const binding = resolveMedia(asset.id);
    switch (binding.kind) {
      case 'unbound':
        throw new Error(`STANDALONE_FILM_IMAGE_NOT_PUBLISHED:${asset.id}`);
      case 'local': {
        const src = binding.src ?? asset.src;
        const alt = binding.alt ?? asset.alt;
        const width = binding.width ?? asset.width;
        const height = binding.height ?? asset.height;
        if (!src || !alt || !validDimension(width) || !validDimension(height)) {
          throw new Error(`HERO_CAROUSEL_SOURCE_INVALID:${asset.id}`);
        }
        return {
          slotId: asset.id, imageId: asset.id, order, src, alt,
          width, height, focalPoint,
          publicationId: null, assetId: null,
        };
      }
      case 'published': {
        if (!binding.publicationId || !binding.assetId || !binding.src ||
            !validDimension(binding.width) || !validDimension(binding.height) ||
            typeof binding.alt !== 'string') {
          throw new Error(`HERO_CAROUSEL_PUBLICATION_INVALID:${asset.id}`);
        }
        return {
          slotId: asset.id, imageId: asset.id, order, src: binding.src, alt: binding.alt,
          width: binding.width, height: binding.height, focalPoint,
          publicationId: binding.publicationId, assetId: binding.assetId,
        };
      }
    }
  });
  return Object.freeze(slots);
}
