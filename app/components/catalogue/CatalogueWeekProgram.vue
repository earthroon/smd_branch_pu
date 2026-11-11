<script setup lang="ts">
/** R7 semantic six-week viewer. Same source ids, publication data and keyboard contract. */
import { computed, nextTick, ref } from 'vue';
import { CURRICULUM_WEEK_SOURCE_ENTRIES, type CurriculumWeekId,
  type CurriculumWeekPublishedProgram } from '~/data/curriculum-week-program';
import CmsSlot from '~/components/cms/CmsSlot.vue';
import CatalogueSourceCopy from './CatalogueSourceCopy.vue';
const props = defineProps<{ program: CurriculumWeekPublishedProgram | null }>();
const weeks = CURRICULUM_WEEK_SOURCE_ENTRIES;
const active = ref<CurriculumWeekId>('week-01');
const selected = computed(() => {
  const source = weeks.find(w => w.id === active.value);
  if (!source) throw new Error('R7_WEEK_SOURCE_INVALID');
  return source;
});
const published = computed(() => props.program?.weeks.find(w => w.id === active.value) ?? null);
const detail = computed(() => published.value?.slots.detail ?? {status:'unassigned' as const});
const media = computed(() => published.value?.slots.media ?? null);
const extensions = computed(() => published.value?.slots.extensions ?? []);
const legacy = computed(() => active.value === 'week-01' && detail.value.status === 'unassigned');
const points = [['403','404'],['405','406'],['407','408'],['409','410'],['411','412']] as const;
async function navigate(event:KeyboardEvent,index:number){
  let n=index;
  switch(event.key){
    case 'ArrowRight': n=(index+1)%weeks.length;break;
    case 'ArrowLeft': n=(index+weeks.length-1)%weeks.length;break;
    case 'Home': n=0;break;
    case 'End': n=weeks.length-1;break;
    default:return;
  }
  event.preventDefault();
  const next = weeks[n];
  if (!next) throw new Error('R7_WEEK_FOCUS_INDEX_INVALID');
  active.value = next.id;
  await nextTick();
  (event.currentTarget as HTMLButtonElement).parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[n]?.focus();
}
</script>
<template>
  <div class="smd-r7-route__week-program" data-r7-week-active="active">
    <div class="smd-r7-route__week-tabs" role="tablist" aria-label="6주 교육과정">
      <button v-for="(week,index) in weeks" :key="week.id" :id="'r7-week-'+week.id"
        type="button" role="tab" :aria-controls="'r7-week-panel'" :aria-selected="active===week.id"
        :tabindex="active===week.id ? 0 : -1" :class="{'is-active':active===week.id}"
        @click="active=week.id" @keydown="navigate($event,index)">
        <span>WEEK</span><strong>{{String(week.week).padStart(2,'0')}}</strong>
        <CatalogueSourceCopy page="curriculum" :text-id="week.title" as="span" />
      </button>
    </div>
    <div id="r7-week-panel" class="smd-r7-route__week-detail" role="tabpanel"
      :aria-labelledby="'r7-week-'+active" tabindex="0" :data-detail-state="legacy ? 'source' : detail.status">
      <div class="smd-r7-route__week-copy">
        <p class="smd-r7-route__eyebrow">WEEK {{String(selected.week).padStart(2,'0')}}</p>
        <template v-if="legacy">
          <CatalogueSourceCopy page="curriculum" text-id="401" as="h3" />
          <CatalogueSourceCopy page="curriculum" text-id="402" />
          <ul><li v-for="point in points" :key="point[1]">
            <CatalogueSourceCopy page="curriculum" :text-id="point[1]" as="span" />
          </li></ul>
        </template>
        <template v-else-if="detail.status==='ready'">
          <h3>{{ detail.heading }}</h3><p>{{ detail.description }}</p>
          <ul v-if="detail.items.length"><li v-for="item in detail.items" :key="item">{{item}}</li></ul>
        </template>
        <p v-else role="status">{{selected.week}}주차 상세 안내 준비 중</p>
        <CmsSlot v-if="extensions.length" :nodes="extensions" />
      </div>
      <figure v-if="media" class="smd-r7-route__week-media" data-media-state="published">
        <img :src="media.src" :alt="media.alt" :width="media.width" :height="media.height"
          loading="lazy" decoding="async" />
      </figure>
      <div v-else class="smd-r7-route__week-unassigned" data-media-state="unassigned" aria-hidden="true">
        <span>WEEK {{String(selected.week).padStart(2,'0')}} / CONTENT</span>
      </div>
    </div>
  </div>
</template>
