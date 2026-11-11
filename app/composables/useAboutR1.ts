import { useContentMode } from './useContentMode';
import { useSiteContent } from './useSiteContent';
import { useSelectedCategoryPage } from './useSelectedCategoryPage';
import { resolveAboutOperationalState } from '../utils/aboutR1Operational';
/** No additional content request. Body authority remains PSD_BUILD_SOURCE_V1. */
export function useAboutR1() {
  const content = useSiteContent(), selected = useSelectedCategoryPage(), route = useRoute();
  const mode = useContentMode();
  return computed(() => resolveAboutOperationalState(content.value, selected.value, route.path, mode));
}
