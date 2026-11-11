/** CF4. Frozen Schema 9 design slots. These IDs describe layout slots, never ReviewEntry IDs.
 * Source: scripts/fixtures/reviews-r1/skin.jsonl (node/native-text records). */
export const reviewsCardFigmaSlots = [
  { card: 'node-4:312', title: 'node-4:317', body: 'node-4:316',
    author: 'node-4:315', course: 'node-4:314', badgeText: 'node-4:318', badgePaint: 'node-4:319' },
  { card: 'node-4:274', title: 'node-4:278', body: 'node-4:277',
    author: 'node-4:276', course: 'node-4:275', badgeText: 'node-4:279', badgePaint: 'node-4:280' },
  { card: 'node-4:236', title: 'node-4:240', body: 'node-4:239',
    author: 'node-4:238', course: 'node-4:237', badgeText: 'node-4:241', badgePaint: 'node-4:242' },
] as const;

/** Card outline Stroke was blocked in the Figma export. CSS border is a separate candidate. */
export const reviewsCardPaintQualification = {
  figmaStroke: 'NOT_QUALIFIED',
  cssReconstruction: 'CANDIDATE_PENDING_BROWSER_PARITY',
} as const;
