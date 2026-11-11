<script setup lang="ts">
import AboutSourceText from './AboutSourceText.vue';
import { aboutSourceAssets } from '~/data/about-r1-assets.generated';
import type { AboutIconId, AboutTextId } from '~/data/about-r1-types';
const items: readonly { icon: AboutIconId; title: AboutTextId; detail: AboutTextId }[] = [
  { icon: 'experience', title: '19', detail: '20' }, { icon: 'hands-on', title: '26', detail: '27' },
  { icon: 'practice', title: '29', detail: '30' }, { icon: 'career', title: '31', detail: '32' }];
function iconStyle(id: AboutIconId) {
  const b = aboutSourceAssets.icons[id].bbox;
  return { '--icon-x': b[0], '--icon-y': b[1] - 1650, '--icon-width': b[2] - b[0], '--icon-height': b[3] - b[1], filter: 'url(#about-icon-' + id + ')' };
}
</script>
<template>
  <svg class="smd-about__icon-filters" width="0" height="0" aria-hidden="true" focusable="false">
    <defs><filter v-for="item in items" :id="'about-icon-' + item.icon" :key="item.icon" color-interpolation-filters="sRGB">
      <feFlood :flood-color="aboutSourceAssets.icons[item.icon].colorOverlay.color"
        :flood-opacity="aboutSourceAssets.icons[item.icon].colorOverlay.opacity" result="paint" />
      <feComposite in="paint" in2="SourceAlpha" operator="in" />
    </filter></defs>
  </svg>
  <ul class="smd-about__facts"><li v-for="item in items" :key="item.icon" class="smd-about__fact">
    <img class="smd-about__fact-icon" :src="'/about/' + encodeURIComponent(aboutSourceAssets.icons[item.icon].fileName) + '?v=' + aboutSourceAssets.icons[item.icon].sha256"
      :style="iconStyle(item.icon)" :data-about-icon="item.icon" :data-source-sha256="aboutSourceAssets.icons[item.icon].sha256"
      :width="aboutSourceAssets.icons[item.icon].bbox[2] - aboutSourceAssets.icons[item.icon].bbox[0]"
      :height="aboutSourceAssets.icons[item.icon].bbox[3] - aboutSourceAssets.icons[item.icon].bbox[1]"
      alt="" aria-hidden="true" loading="lazy" decoding="async" />
    <div class="smd-about__fact-copy">
      <AboutSourceText :text-id="item.title" as="h2" class="smd-about__fact-title" />
      <AboutSourceText :text-id="item.detail" class="smd-about__fact-detail" />
    </div>
  </li></ul>
  <span v-for="x in [521,960,1399]" :key="x" class="smd-about__fact-divider"
    :style="{ left: (x / 1920 * 100) + '%' }" aria-hidden="true" />
</template>
