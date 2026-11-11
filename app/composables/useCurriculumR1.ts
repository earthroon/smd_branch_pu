import { useContentMode } from './useContentMode';
import { useSiteContent } from './useSiteContent';
import { useSelectedCategoryPage } from './useSelectedCategoryPage';
import { resolveCurriculumOperationalState } from '../utils/curriculumR1Operational';
/** Reuses app.vue's admitted render response; no component-level request. */
export function useCurriculumR1() {
  const content=useSiteContent(),selected=useSelectedCategoryPage(),route=useRoute();
  const mode = useContentMode();
  return computed(()=>resolveCurriculumOperationalState(content.value,selected.value,route.path,mode));
}
