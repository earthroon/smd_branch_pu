export const homeFilmAssets = [
  {
    "id": "hero-1",
    "src": "/media/hero/1(1).jpg",
    "alt": "우드 필름 시공",
    "width": 1920,
    "height": 1275
  },
  {
    "id": "hero-2",
    "src": "/media/hero/2.jpg",
    "alt": "실내 필름 시공 현장",
    "width": 1920,
    "height": 1275
  },
  {
    "id": "hero-3",
    "src": "/media/hero/3.jpg",
    "alt": "벽면 마감 작업",
    "width": 1920,
    "height": 1275
  }
] as const;

export type FilmImageId = (typeof homeFilmAssets)[number]['id'];
export type FilmEditorialSource =
  | { kind: 'approved'; imageId: FilmImageId; title: string; description: string; href: string; sourceRevision: string }
  | { kind: 'unavailable'; imageId: FilmImageId; reason: 'APPROVED_EDITORIAL_MISSING' };

/** Source admission stays closed until actual editorial title, caption and URL are supplied. */
export const homeFilmEditorial: Readonly<Record<FilmImageId, FilmEditorialSource>> = {
  'hero-1': { kind: 'unavailable', imageId: 'hero-1', reason: 'APPROVED_EDITORIAL_MISSING' },
  'hero-2': { kind: 'unavailable', imageId: 'hero-2', reason: 'APPROVED_EDITORIAL_MISSING' },
  'hero-3': { kind: 'unavailable', imageId: 'hero-3', reason: 'APPROVED_EDITORIAL_MISSING' },
};

export type FilmEditorialAdmission =
  | (Extract<FilmEditorialSource, { kind: 'approved' }> & { linkKind: 'internal' | 'external' })
  | Extract<FilmEditorialSource, { kind: 'unavailable' }>;

/** Any future approved source must pass this gate before reaching SSR or the link surface. */
export function admitFilmEditorial(
  imageId: FilmImageId,
  source: FilmEditorialSource,
  verifiedInternalRoutes: ReadonlySet<string> = new Set(),
): FilmEditorialAdmission {
  switch (source.imageId === imageId) {
    case false: throw new Error(`FILM_TITLE_IDENTITY_DRIFT: ${imageId}`);
    case true: break;
  }
  switch (source.kind) {
    case 'unavailable': return source;
    case 'approved': {
      switch ([source.title, source.description, source.sourceRevision].every(v => v.trim().length > 0)) {
        case false: throw new Error(`FILM_TITLE_METADATA_UNAVAILABLE: ${imageId}`);
        case true: break;
      }
      // Do not guess public routes. A known editorial source must explicitly provide its href.
      const internal = /^\/(?!\/)[a-zA-Z0-9/_-]+\/?$/.test(source.href) && !source.href.includes('..');
      const external = /^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/.test(source.href);
      switch (internal || external) {
        case false: throw new Error(`FILM_TITLE_TARGET_INVALID: ${imageId}`);
        case true: {
          // Internal links require a separately verified canonical public route.
          if (internal && !verifiedInternalRoutes.has(source.href)) {
            throw new Error(`FILM_TITLE_TARGET_INVALID: ${imageId} (unverified internal route)`);
          }
          return { ...source, linkKind: internal ? 'internal' : 'external' };
        }
      }
    }
    default: {
      const exhaustive: never = source;
      throw new Error(`FILM_EDITORIAL_KIND_UNHANDLED: ${String(exhaustive)}`);
    }
  }
}

/** One result per logical source image, independent of the repeating visual track. */
export const homeFilmEditorialAdmissions = homeFilmAssets.map(asset =>
  admitFilmEditorial(asset.id, homeFilmEditorial[asset.id])
);
export const homeFilmEditorialReady = homeFilmEditorialAdmissions.every(item => item.kind === 'approved');
