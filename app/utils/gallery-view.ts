/** SMD-GALLERY-R1-CF2/CF3. Published Archive V3 projection; UI state is not CMS authority. */
import {
  archiveLaneOf,
  validateArchiveCollectionV3,
  type ArchiveCollectionAny,
} from '@smd/content-contracts/archive-contracts';
import { archiveView, type ArchiveCardView } from './archive-view.ts';

export type GalleryFilterId = 'all' | 'photo' | 'video';
export type GalleryMediaKind = 'photo' | 'video';
export type GalleryBadgeLabel = '사진' | '영상';

export const GALLERY_PAGE_SIZE = 9 as const;
export const GALLERY_FILTER_ORDER = ['all', 'photo', 'video'] as const;
export const GALLERY_FILTER_V1 = {
  all: { label: '전체', lanes: ['photo', 'video'] },
  photo: { label: '사진', lanes: ['photo'] },
  video: { label: '영상', lanes: ['video'] },
} as const satisfies Readonly<Record<GalleryFilterId, {
  label: string;
  lanes: readonly GalleryMediaKind[];
}>>;

export type GalleryCardView =
  | Readonly<ArchiveCardView & {
      mediaKind: 'photo';
      badgeLabel: '사진';
      media: Extract<ArchiveCardView['media'], { kind: 'image' }>;
    }>
  | Readonly<ArchiveCardView & {
      mediaKind: 'video';
      badgeLabel: '영상';
      media: Extract<ArchiveCardView['media'], { kind: 'youtube' }>;
    }>;

export type GalleryProjectionV1 = Readonly<{
  contract: 'SMD_GALLERY_PROJECTION_V1';
  sourcePublicationId: string;
  sourcePublicationDigest: string;
  views: Readonly<Record<GalleryFilterId, readonly GalleryCardView[]>>;
}>;

function galleryReject(code: string): never {
  throw new Error(code);
}

/** No V2 auto-migration, no title/extension heuristic, no independent badge authoring. */
export function buildGalleryProjectionV1(
  archive: ArchiveCollectionAny,
  publication: Readonly<{ id: string; digest: string }>,
): GalleryProjectionV1 {
  if (archive?.schemaVersion !== 3) {
    return galleryReject('SMD_GALLERY_R1_ARCHIVE_SCHEMA_UNSUPPORTED');
  }
  if (!publication || typeof publication.id !== 'string' || !publication.id ||
      !/^[a-f0-9]{64}$/.test(publication.digest)) {
    return galleryReject('SMD_GALLERY_R1_PUBLICATION_STALE');
  }

  // The existing validators and view mapper own visibility, source order and media shape.
  const canonical = validateArchiveCollectionV3(archive);
  const originals = new Map(canonical.items.map(entry => [entry.id, entry] as const));
  const seen = new Set<string>();
  const all: GalleryCardView[] = archiveView(canonical).map(card => {
    if (seen.has(card.id)) return galleryReject('SMD_GALLERY_R1_DUPLICATE_ITEM_ID');
    seen.add(card.id);
    const source = originals.get(card.id);
    if (!source || !source.visible) return galleryReject('SMD_GALLERY_R1_FILTER_PARTITION_INVALID');
    switch (archiveLaneOf(source)) {
      case 'photo':
        if (card.media.kind !== 'image') {
          return galleryReject('SMD_GALLERY_R1_MEDIA_KIND_CONFLICT');
        }
        return { ...card, media: card.media, mediaKind: 'photo', badgeLabel: '사진' } as const;
      case 'video':
        if (card.media.kind !== 'youtube') {
          return galleryReject('SMD_GALLERY_R1_MEDIA_KIND_CONFLICT');
        }
        return { ...card, media: card.media, mediaKind: 'video', badgeLabel: '영상' } as const;
      case 'unassigned':
        return galleryReject('SMD_GALLERY_R1_MEDIA_UNCLASSIFIED');
    }
  });
  const photo = all.filter(item => item.mediaKind === 'photo');
  const video = all.filter(item => item.mediaKind === 'video');
  if (photo.length + video.length !== all.length ||
      new Set([...photo, ...video].map(item => item.id)).size !== all.length) {
    return galleryReject('SMD_GALLERY_R1_FILTER_PARTITION_INVALID');
  }
  return {
    contract: 'SMD_GALLERY_PROJECTION_V1',
    sourcePublicationId: publication.id,
    sourcePublicationDigest: publication.digest,
    views: { all, photo, video },
  };
}

export type GalleryPageResult<T> = Readonly<{
  currentPage: number;
  totalPages: number;
  items: readonly T[];
}>;

/** Page 1 is the stored empty-state page; the actual visible page is clamped. */
export function galleryPaginate<T>(items: readonly T[], requestedPage: number): GalleryPageResult<T> {
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
    return galleryReject('SMD_GALLERY_R1_PAGINATION_INVALID');
  }
  const totalPages = Math.ceil(items.length / GALLERY_PAGE_SIZE);
  const currentPage = Math.min(requestedPage, Math.max(totalPages, 1));
  const start = (currentPage - 1) * GALLERY_PAGE_SIZE;
  return { currentPage, totalPages, items: items.slice(start, start + GALLERY_PAGE_SIZE) };
}

export type GalleryPageToken =
  | Readonly<{ kind: 'page'; key: string; page: number }>
  | Readonly<{ kind: 'ellipsis'; key: string }>;

/** Display a bounded page window, retaining both ends and current neighbors. */
export function galleryPageTokens(totalPages: number, currentPage: number): readonly GalleryPageToken[] {
  if (!Number.isSafeInteger(totalPages) || totalPages < 0 ||
      !Number.isSafeInteger(currentPage) || currentPage < 1 ||
      (totalPages === 0 ? currentPage !== 1 : currentPage > totalPages)) {
    return galleryReject('SMD_GALLERY_R1_PAGINATION_INVALID');
  }
  if (totalPages <= 1) return [];
  const members = new Set([1, totalPages]);
  for (let page = Math.max(1, currentPage - 1); page <= Math.min(totalPages, currentPage + 1); page++) {
    members.add(page);
  }
  const sorted = [...members].sort((a, b) => a - b);
  const tokens: GalleryPageToken[] = [];
  for (const page of sorted) {
    const previous = tokens.at(-1);
    if (previous?.kind === 'page' && page - previous.page > 1) {
      tokens.push({ kind: 'ellipsis', key: `gap-${previous.page}-${page}` });
    }
    tokens.push({ kind: 'page', key: `page-${page}`, page });
  }
  return tokens;
}


/** CF3 category-local paging. Immutable transitions simplify exact event model tests. */
export type GalleryInteractionState = Readonly<{
  activeFilter: GalleryFilterId;
  pageByFilter: Readonly<Record<GalleryFilterId, number>>;
}>;

export function galleryInitialState(): GalleryInteractionState {
  return { activeFilter: 'all', pageByFilter: { all: 1, photo: 1, video: 1 } };
}

export function galleryActivateFilter(
  state: GalleryInteractionState,
  filter: unknown,
): GalleryInteractionState {
  switch (filter) {
    case 'all':
    case 'photo':
    case 'video':
      return filter === state.activeFilter ? state : { ...state, activeFilter: filter };
    default:
      return galleryReject('SMD_GALLERY_R1_FILTER_INVALID');
  }
}

export function gallerySelectPage(
  state: GalleryInteractionState,
  page: number,
  totalPages: number,
): GalleryInteractionState {
  if (!Number.isSafeInteger(page) || page < 1 ||
      !Number.isSafeInteger(totalPages) || page > totalPages) {
    return galleryReject('SMD_GALLERY_R1_PAGINATION_INVALID');
  }
  if (page === state.pageByFilter[state.activeFilter]) return state;
  return {
    ...state,
    pageByFilter: { ...state.pageByFilter, [state.activeFilter]: page },
  };
}
