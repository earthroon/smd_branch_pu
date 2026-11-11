/** R7 CF5: one desktop wheel owner per Nuxt layout, no duplicate page listeners. */
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { installCatalogueSpringWheel, type CatalogueSpringLease } from '~/utils/catalogueSpringWheel';

export function useCatalogueSpringScroll(): void {
  const route = useRoute();
  let lease: CatalogueSpringLease | null = null;
  onMounted(() => {
    lease = installCatalogueSpringWheel(() => route.path);
  });
  watch(() => route.fullPath, () => lease?.cancel(), { flush: 'sync' });
  onBeforeUnmount(() => {
    lease?.dispose();
    lease = null;
  });
}
