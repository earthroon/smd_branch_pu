<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import CurriculumSectionHeading from './CurriculumSectionHeading.vue';
import CurriculumSourceText from './CurriculumSourceText.vue';
import CurriculumWeekDetailPanel from './CurriculumWeekDetailPanel.vue';
import { curriculumSourceShapes } from '~/data/curriculum-r1-shapes.generated';
import { CURRICULUM_WEEK_SOURCE_ENTRIES, type CurriculumWeekId,
  type CurriculumWeekPublishedProgram } from '~/data/curriculum-week-program';
import { curriculumFrameStyle } from '~/utils/curriculumR1LayoutMath';

const props=defineProps<{program:CurriculumWeekPublishedProgram|null}>();
const weeks=CURRICULUM_WEEK_SOURCE_ENTRIES;
const selectedWeekId=ref<CurriculumWeekId>('week-01');
const selectedSource=computed(()=>{
  const entry=weeks.find(week=>week.id===selectedWeekId.value);
  if(!entry)throw new Error('SMD_CURRICULUM_WEEK_SELECTED_ID_INVALID');
  return entry;
});
const selectedPublished=computed(()=>props.program?.weeks.find(week=>week.id===selectedWeekId.value)??null);
function selectWeek(id:CurriculumWeekId){
  if(!weeks.some(week=>week.id===id))throw new Error('SMD_CURRICULUM_WEEK_SELECT_INVALID');
  selectedWeekId.value=id;
}
async function onTabKeydown(event:KeyboardEvent,index:number){
  const key=event.key;
  let target=index;
  switch(key){
    case 'ArrowRight':target=(index+1)%weeks.length;break;
    case 'ArrowLeft':target=(index+weeks.length-1)%weeks.length;break;
    case 'Home':target=0;break;
    case 'End':target=weeks.length-1;break;
    default:return;
  }
  event.preventDefault();
  selectWeek(weeks[target]!.id);
  const tablist=(event.currentTarget as HTMLButtonElement).parentElement;
  await nextTick();
  tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus();
}
</script>
<template>
  <CurriculumSectionHeading label="387" title="386" />
  <div class="smd-curriculum__weeks" role="tablist" aria-label="6주 교육과정">
    <button v-for="(week,index) in weeks" :id="'curriculum-week-'+week.week" :key="week.id"
      type="button" role="tab" :aria-selected="selectedWeekId===week.id"
      aria-controls="curriculum-week-panel" :tabindex="selectedWeekId===week.id?0:-1"
      :data-week="week.week"
      :data-detail-state="!program?(week.week===1?'source':'unassigned'):program.weeks[index]?.slots.detail.status"
      class="smd-curriculum__week" :class="{'smd-curriculum__week--active':selectedWeekId===week.id}"
      :style="curriculumFrameStyle(curriculumSourceShapes[week.shape].frame,'six-week-program')"
      @click="selectWeek(week.id)" @keydown="onTabKeydown($event,index)">
      <template v-if="program">
        <span class="smd-curriculum__week-nav-copy smd-curriculum__week-label">{{program.weeks[index]?.navigation.label}}</span>
        <span class="smd-curriculum__week-nav-copy smd-curriculum__week-title">{{program.weeks[index]?.navigation.title}}</span>
      </template>
      <template v-else>
        <CurriculumSourceText :text-id="week.label" as="span" class="smd-curriculum__week-label"
          :frame="curriculumSourceShapes[week.shape].frame" />
        <CurriculumSourceText :text-id="week.title" as="span" class="smd-curriculum__week-title"
          :frame="curriculumSourceShapes[week.shape].frame" paint-role="week-title" />
      </template>
    </button>
  </div>
  <CurriculumWeekDetailPanel :key="selectedWeekId" :source="selectedSource"
    :published="selectedPublished" />
  <CurriculumSourceText text-id="414" class="smd-curriculum__week-note" />
  <p v-if="program===null" class="smd-curriculum__week-availability" role="note">2–6주차 상세 안내 준비 중</p>
</template>
