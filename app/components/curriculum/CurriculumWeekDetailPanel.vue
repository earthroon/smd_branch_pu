<script setup lang="ts">
import { computed } from 'vue';
import CurriculumSourceText from './CurriculumSourceText.vue';
import CmsSlot from '~/components/cms/CmsSlot.vue';
import type { CurriculumWeekSourceEntry, CurriculumWeekPublishedEntry } from '~/data/curriculum-week-program';

const props=defineProps<{
  source:CurriculumWeekSourceEntry;
  published:CurriculumWeekPublishedEntry|null;
}>();
const legacy=computed(()=>props.source.id==='week-01' &&
  (!props.published || props.published.slots.detail.status==='unassigned'));
const detail=computed(()=>props.published?.slots.detail??{status:'unassigned' as const});
const media=computed(()=>props.published?.slots.media??null);
const extensions=computed(()=>props.published?.slots.extensions??[]);
const points=[['403','404'],['405','406'],['407','408'],['409','410'],['411','412']] as const;
</script>
<template>
  <div id="curriculum-week-panel" role="tabpanel" :aria-labelledby="'curriculum-week-'+source.week"
    tabindex="0" class="smd-curriculum__week-panel"
    :class="{'smd-curriculum__week-panel--dynamic':!legacy}"
    :data-detail-week="source.id" :data-detail-state="legacy?'source':detail.status">
    <template v-if="legacy">
      <div class="smd-curriculum__week-copy">
        <CurriculumSourceText text-id="400" class="smd-curriculum__card-label" />
        <CurriculumSourceText text-id="401" as="h3" class="smd-curriculum__week-heading" />
        <CurriculumSourceText text-id="402" />
        <ul class="smd-curriculum__week-points">
          <li v-for="[plus,body] in points" :key="body">
            <CurriculumSourceText :text-id="plus" as="span" aria-hidden="true" />
            <CurriculumSourceText :text-id="body" as="span" />
          </li>
        </ul>
      </div>
      <div class="smd-curriculum__week-media" data-media-state="unassigned" aria-hidden="true"></div>
    </template>
    <template v-else>
      <div class="smd-curriculum__week-copy smd-curriculum__week-copy--dynamic">
        <template v-if="detail.status==='ready'">
          <p class="smd-curriculum__week-eyebrow">{{detail.eyebrow}}</p>
          <h3 class="smd-curriculum__week-heading">{{detail.heading}}</h3>
          <p class="smd-curriculum__week-description">{{detail.description}}</p>
          <ul v-if="detail.items.length" class="smd-curriculum__week-points">
            <li v-for="(item,index) in detail.items" :key="index">
              <span aria-hidden="true" class="smd-curriculum__week-plus">+</span>
              <span>{{item}}</span>
            </li>
          </ul>
        </template>
        <p v-else class="smd-curriculum__week-unassigned" role="status">
          {{source.week}}주차 상세 안내 준비 중
        </p>
        <div v-if="extensions.length" class="smd-curriculum__week-extensions">
          <CmsSlot :nodes="extensions" />
        </div>
      </div>
      <figure v-if="media" class="smd-curriculum__week-media smd-curriculum__week-media--published"
        data-media-state="published" :data-media-asset="media.assetId"
        :data-display-mode="media.displayMode">
        <img :src="media.src" :width="media.width" :height="media.height"
          :alt="media.alt" :title="media.title" decoding="async" loading="lazy" />
      </figure>
      <div v-else class="smd-curriculum__week-media" data-media-state="unassigned" aria-hidden="true"></div>
    </template>
  </div>
</template>
