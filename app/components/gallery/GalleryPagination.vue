<script setup lang="ts">
import { galleryPageTokens } from '~/utils/gallery-view';
const props = defineProps<{ page: number; totalPages: number }>();
const emit = defineEmits<{ selectPage: [page: number] }>();
const tokens = computed(() => galleryPageTokens(props.totalPages, props.page));
</script>

<template>
  <nav v-if="props.totalPages > 1" class="smd-gallery-pagination" aria-label="수강갤러리 페이지">
    <template v-for="token in tokens" :key="token.key">
      <button
        v-if="token.kind === 'page'"
        type="button"
        class="smd-gallery-pagination__page"
        :class="{ 'smd-gallery-pagination__page--active': token.page === props.page }"
        :aria-current="token.page === props.page ? 'page' : undefined"
        :aria-label="`${token.page}페이지`"
        @click="emit('selectPage', token.page)"
      >{{ token.page }}</button>
      <span v-else class="smd-gallery-pagination__ellipsis" aria-hidden="true">…</span>
    </template>
  </nav>
</template>
