/**
 * Gallery Figma aVzrXSUp4FrQ1dp7nKrSVI : Gallery 1:2 / Header 1:4.
 * Presentation-only mapping: never mutate Publication V5 navigation records.
 * Other pages keep homeHeaderNavigationV2 as their source authority.
 */
export const GALLERY_FIGMA_FILE_KEY = 'aVzrXSUp4FrQ1dp7nKrSVI' as const;

export type GalleryHeaderNavigationId = 'about' | 'curriculum' | 'archive' | 'reviews' | 'faq';

const galleryHeaderNodes: Readonly<Record<GalleryHeaderNavigationId, string>> = {
  about: 'node-1:19',
  curriculum: 'node-1:20',
  archive: 'node-1:26',
  reviews: 'node-1:25',
  faq: 'node-1:24',
};

export function galleryHeaderNodeForItem(
  routePath: string,
  itemId: GalleryHeaderNavigationId,
  defaultNodeKey: string,
): string {
  switch (routePath) {
    case '/archive': return galleryHeaderNodes[itemId];
    default: return defaultNodeKey;
  }
}

/** /archive was mislabeled '수강후기' in the historical CMS seed.
 * Keep /reviews unchanged. Other fields/links and source publication stay intact.
 */
export function galleryNavigationPresentation<T extends Readonly<{ to: string; label: string }>>(
  item: T,
): T {
  switch (item.to) {
    case '/archive': return { ...item, label: '수강갤러리' };
    default: return item;
  }
}
