/** SMD-GALLERY-R1-CF4. Public Archive V3 media routing and UI-only lifetime witnesses.
 * The published Archive validator remains the media classification and admission authority.
 */
import {
  ARCHIVE_ASSET_KEY,
  ARCHIVE_YOUTUBE_ID,
} from '@smd/content-contracts/archive-contracts';
import type { GalleryFilterId } from './gallery-view.ts';

export const GALLERY_IMAGE_LOAD_ERROR = 'SMD_GALLERY_R1_CF4_IMAGE_LOAD_FAILED' as const;
export const GALLERY_POSTER_LOAD_ERROR = 'SMD_GALLERY_R1_CF4_POSTER_LOAD_FAILED' as const;
const ARCHIVE_PREFIX = 'archive/';

/** No direct R2 key, unverified extension, arbitrary external URL or silent fallback. */
export function galleryArchiveMediaUrl(assetKey: string): string {
  if (!ARCHIVE_ASSET_KEY.test(assetKey)) {
    throw new Error('SMD_GALLERY_R1_CF4_MEDIA_ASSET_INVALID');
  }
  return `/api/archive/media/${assetKey.slice(ARCHIVE_PREFIX.length)}`;
}

/** The CDN is the existing policy only when the original posterKey is null. */
export function galleryPosterUrl(posterKey: string | null, youtubeId: string): string {
  if (!ARCHIVE_YOUTUBE_ID.test(youtubeId)) {
    throw new Error('ARCHIVE_YOUTUBE_ID_INVALID');
  }
  switch (posterKey) {
    case null:
      return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
    default:
      return galleryArchiveMediaUrl(posterKey);
  }
}

export type GalleryMediaOwner = Readonly<{
  publicationId: string;
  publicationDigest: string;
  filter: GalleryFilterId;
  page: number;
  entryId: string;
}>;

/** Unique, deterministic vnode identity; values are not interpreted as UI/CMS authority. */
export function galleryMediaOwnerKey(owner: GalleryMediaOwner): string {
  if (!owner.publicationId || !/^[a-f0-9]{64}$/.test(owner.publicationDigest) ||
      !Number.isSafeInteger(owner.page) || owner.page < 1 || !owner.entryId ||
      !['all', 'photo', 'video'].includes(owner.filter)) {
    throw new Error('SMD_GALLERY_R1_CF4_PLAYER_OWNER_INVALID');
  }
  return JSON.stringify([
    owner.publicationId, owner.publicationDigest, owner.filter, owner.page, owner.entryId,
  ]);
}

export type GalleryImageLoadState =
  | Readonly<{ kind: 'loading'; ownerKey: string; src: string }>
  | Readonly<{ kind: 'ready'; ownerKey: string; src: string }>
  | Readonly<{
      kind: 'failed'; ownerKey: string; src: string;
      code: typeof GALLERY_IMAGE_LOAD_ERROR;
    }>;

export function galleryImageInitialState(ownerKey: string, src: string): GalleryImageLoadState {
  return { kind: 'loading', ownerKey, src };
}

/** A late load/error from another owner or URL cannot mutate the current card. */
export function galleryImageTransition(
  state: GalleryImageLoadState,
  event: 'load' | 'error',
  ownerKey: string,
  src: string,
): GalleryImageLoadState {
  if (state.ownerKey !== ownerKey || state.src !== src) return state;
  switch (event) {
    case 'load': return { kind: 'ready', ownerKey, src };
    case 'error': return { kind: 'failed', ownerKey, src, code: GALLERY_IMAGE_LOAD_ERROR };
  }
}
