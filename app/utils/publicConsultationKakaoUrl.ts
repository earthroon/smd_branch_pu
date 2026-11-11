import seed from '@smd/content-contracts/seed-content.json' with { type: 'json' };
import { validPublishedKakaoUrl } from '../data/home-r2-navigation.ts';
import { publicExternalActionsAllowed } from './publicExternalActionPolicy.ts';

type ConsultationContent = {
  publication: { id: string };
  navigation: { kakaoUrl: unknown };
};

/**
 * The Public Kakao consultation URL is an independent outbound action.
 * Standalone reads only the pinned local seed; CMS reads only published content.
 * Neither mode changes admission for form submissions or other outbound URLs.
 */
export function resolvePublicConsultationKakaoUrl(
  content: ConsultationContent | null | undefined,
  mode: 'standalone' | 'cms',
): string | null {
  switch (mode) {
    case 'standalone': return validPublishedKakaoUrl(seed.navigation.kakaoUrl);
    case 'cms': return publicExternalActionsAllowed(content)
      ? validPublishedKakaoUrl(content?.navigation.kakaoUrl) : null;
  }
}
