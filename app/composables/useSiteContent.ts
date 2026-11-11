import type { PublicContentV2, PublicContentV4, PublicContentV5 } from '@smd/content-contracts/contracts';
export const useSiteContent = () => useState<PublicContentV2 | PublicContentV4 | PublicContentV5 | null>('smd-public-content', () => null);
