export const STANDALONE_PREVIEW_PUBLICATION_ID = 'STANDALONE_PREVIEW_NOT_PUBLISHED';

/** The unpublished Standalone seed is display-only, not an approval for outbound actions. */
export function publicExternalActionsAllowed(
  content: { publication: { id: string } } | null | undefined,
): boolean {
  return Boolean(content && content.publication.id !== STANDALONE_PREVIEW_PUBLICATION_ID);
}
