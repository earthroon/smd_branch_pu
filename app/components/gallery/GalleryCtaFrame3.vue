<script setup lang="ts">
import { usePublicConsultationHref } from '~/composables/usePublicConsultationHref';
import { GALLERY_FIGMA_FILE_KEY } from '~/utils/gallery-presentation';

const consultationHref = usePublicConsultationHref();
</script>

<template>
  <section
    class="smd-gallery-cta-frame3"
    data-gallery-cta-contract="SMD_GALLERY_R1_FIGMA_FRAME3"
    :data-figma-file-key="GALLERY_FIGMA_FILE_KEY"
    data-figma-node="node-1:84"
    data-figma-background-node="node-1:91"
    aria-labelledby="smd-gallery-cta-title"
  >
    <div class="smd-gallery-cta-frame3__inner">
      <h2 id="smd-gallery-cta-title" class="smd-gallery-cta-frame3__title" data-figma-node="node-1:86">
        배움의 과정이, 현장의 자신감으로.
      </h2>
      <p class="smd-gallery-cta-frame3__description" data-figma-node="node-1:85">
        SMD아카데미 인테리어필름 · 유리필름 실무 교육
      </p>
      <a
        v-if="consultationHref"
        class="smd-gallery-cta-frame3__button"
        :href="consultationHref"
        target="_blank"
        rel="noopener noreferrer"
        data-figma-node="node-1:87"
        data-figma-background-node="node-1:88"
      >상담 신청하기</a>
      <span
        v-else
        class="smd-gallery-cta-frame3__button smd-gallery-cta-frame3__button--unavailable"
        role="status"
        data-figma-node="node-1:87"
        data-figma-background-node="node-1:88"
      >상담 연결 준비 중</span>
    </div>
  </section>
</template>

<style src="~/assets/css/gallery-cta-frame3.css"></style>
