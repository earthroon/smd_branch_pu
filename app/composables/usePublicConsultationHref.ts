import { useContentMode } from './useContentMode';
import { useSiteContent } from './useSiteContent';
import { resolvePublicConsultationKakaoUrl } from '../utils/publicConsultationKakaoUrl';

/** Same URL owner for desktop/mobile, Figma and semantic consultation actions. */
export function usePublicConsultationHref() {
  const mode = useContentMode();
  const content = useSiteContent();
  return computed(() => resolvePublicConsultationKakaoUrl(content.value, mode));
}
