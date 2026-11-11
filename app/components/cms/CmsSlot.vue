<script setup lang="ts">
import type { CmsRootNode } from '@smd/content-contracts/page-slot-contracts';
import { CMS_COMPONENT_REGISTRY } from './cms-component-registry';
const NoticeBlock = CMS_COMPONENT_REGISTRY.notice;
const CardGridBlock = CMS_COMPONENT_REGISTRY['card-grid'];
const FaqGroupBlock = CMS_COMPONENT_REGISTRY['faq-group'];
defineProps<{nodes:readonly CmsRootNode[]}>();
</script>
<!-- No wrapper: empty slot produces no HTML element. -->
<template>
  <template v-for="node in nodes" :key="node.id">
    <NoticeBlock v-if="node.kind === 'notice'" :node="node" />
    <CardGridBlock v-else-if="node.kind === 'card-grid'" :node="node" />
    <FaqGroupBlock v-else-if="node.kind === 'faq-group'" :node="node" />
  </template>
</template>
