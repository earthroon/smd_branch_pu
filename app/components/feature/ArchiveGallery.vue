<script setup lang="ts">
import Gallery from '~/components/archive/ArchiveGallery.vue';
withDefaults(defineProps<{mode?:'preview'|'full';lane?:'photo'|'video'}>(),{mode:'full',lane:'photo'});
</script>
<template><Gallery :mode="mode" :lane="lane" /></template>
