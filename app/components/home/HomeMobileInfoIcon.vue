<script setup lang="ts">
/** Visual-only semantic reflow icons, bound to original Figma source assets.
 * The fourth is the user-provided R4A optical SVG, not a recovered Figma mask.
 */
type HomeMobileInfoIconKind='clock'|'helmet'|'tools'|'file';
const props=defineProps<{kind:HomeMobileInfoIconKind}>();
const srcByKind:Record<HomeMobileInfoIconKind,string>={
  clock:'/figma-r2/assets/asset-907f53254a066699927340bf2d76fceb0d84b85c7548ac570e43e56a2900243c.svg',
  helmet:'/figma-r2/assets/asset-2b5c24c7f3ab3aed40d08b1b2d95b2be8b43bdb11bc8dc996e239ed13bf3cc16.svg',
  tools:'/figma-r2/assets/asset-63c37cd19ad13fd67fb70f63014993699878fcc07cd77f2d82a5019fd73e4ba6.svg',
  file:'/figma-r2/user/file-01-optical-r4a.svg',
} as const;
</script>
<template>
  <span class="smd-home__mobile-info-icon" :class="`smd-home__mobile-info-icon--${props.kind}`"
    :data-mobile-icon="props.kind" aria-hidden="true">
    <!-- Figma alarm clock is two separate SVG paint operations, not one bitmap. -->
    <svg v-if="props.kind==='clock'" viewBox="0 0 107.8125 117.1875" fill="none"
      xmlns="http://www.w3.org/2000/svg" focusable="false">
      <image href="/figma-r2/assets/asset-907f53254a066699927340bf2d76fceb0d84b85c7548ac570e43e56a2900243c.svg"
        x="0" y="0" width="107.8125" height="117.1875"/>
      <image href="/figma-r2/assets/asset-b7f7017169d802a4cedf1f7f63e8cd9e076df11a6c6b4bf6d1937b95f4d7bef0.svg"
        x="25.78125" y="42.1875" width="35.15625" height="28.125"/>
    </svg>
    <img v-else :src="srcByKind[props.kind]" alt="" width="80" height="80" decoding="async" />
  </span>
</template>
<style scoped>
.smd-home__mobile-info-icon {
  display: grid;
  width: 88px;
  height: 80px;
  flex: 0 0 auto;
  place-items: center;
  margin-inline: auto;
}
.smd-home__mobile-info-icon > svg,
.smd-home__mobile-info-icon > img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.smd-home__mobile-info-icon--clock > svg { width: 65px; height: 73px; }
.smd-home__mobile-info-icon--helmet > img { width: 75px; height: 56px; }
.smd-home__mobile-info-icon--tools > img { width: 69px; height: 67px; }
.smd-home__mobile-info-icon--file > img { width: 70px; height: 78px; }
</style>
