<script setup lang="ts">
/** The four already approved Home FAQ rows, not fictional FAQ category data. */
import { computed, ref } from 'vue';
import { useHomeR2Published } from '~/composables/useHomeR2Published';
import { useSiteContent } from '~/composables/useSiteContent';
import { resolveHomeFaqRows, type HomeFaqId } from '~/data/homeFaqApprovedCopy';
import CatalogueCover from './CatalogueCover.vue';
import CatalogueSheet from './CatalogueSheet.vue';
const published=useHomeR2Published();
const content=useSiteContent();
const expanded=ref<HomeFaqId|null>(null);
const rows=computed(()=>{
  const p=published.value;
  switch(p){
    case null:return resolveHomeFaqRows([]);
    default:{
      const owner=content.value?.publication;
      if(owner?.id!==p.publicationId || owner.digest!==p.publicationDigest)
        throw new Error('R7_FAQ_PUBLICATION_STALE');
      return resolveHomeFaqRows(p.faq);
    }
  }
});
</script>
<template>
  <div class="smd-r7-route smd-r7-route--faq" data-r7-route-owner="faq" data-r7-hero="fullscreen">
    <CatalogueCover page-id="faq" eyebrow="INFORMATION / Q&A" heading="자주 묻는 질문"
      description="SMD 아카데미의 기존 승인 안내를 확인하세요." href="/contact" link-label="상담신청" />
    <CatalogueSheet page-id="faq" section-id="questions" :ordinal="2" :total="2"
      variant="faq" fit="flow" label="INFORMATION / FAQ" heading-id="r7-faq-questions">
      <div class="smd-r7-route__questions">
        <div><p class="smd-r7-route__eyebrow">INFORMATION / DETAILS</p>
          <h2 id="r7-faq-questions">Q&A</h2></div>
        <div class="smd-r7-route__question-list">
          <article v-for="row in rows" :key="row.id" :data-qa-owner="row.authority">
            <button type="button" :aria-expanded="expanded===row.id"
              @click="expanded=expanded===row.id?null:row.id">
              <span>{{row.question}}</span><span aria-hidden="true">{{expanded===row.id?'−':'+'}}</span>
            </button>
            <div v-if="expanded===row.id" class="smd-r7-route__answer">
              <p v-for="(paragraph,index) in row.paragraphs" :key="index">{{paragraph}}</p>
            </div>
          </article>
          <NuxtLink to="/contact" class="smd-r7-route__cta-link">추가 상담 문의 ↗</NuxtLink>
        </div>
      </div>
    </CatalogueSheet>
  </div>
</template>
