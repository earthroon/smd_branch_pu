<script setup lang="ts">
import { useInquiryBotStore } from '~/stores/inquiryBot';
const store=useInquiryBotStore();
const open=ref(false);
const input=ref('');
const list=ref<HTMLElement|null>(null);
async function ask(){const message=input.value;input.value='';await store.ask(message);await nextTick();list.value?.scrollTo({top:list.value.scrollHeight,behavior:'smooth'});}
</script>
<template>
  <aside class="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3" aria-label="FAQ 자동 안내">
    <section v-if="open" class="flex h-[min(450px,70vh)] w-[min(360px,calc(100vw-40px))] flex-col overflow-hidden rounded-xl border border-background-300 bg-background-50 shadow-xl" aria-label="자동 안내 대화창">
      <header class="flex items-center justify-between bg-foreground-950 px-4 py-3 text-background-50"><div><h2 class="font-heading text-base">SMD 자동 안내</h2><p class="text-[11px] text-background-300">등록된 FAQ만 답변 · 상담원 연결 아님</p></div><button type="button" aria-label="자동 안내 닫기" class="p-2" @click="open=false"><i class="ri-close-line"/></button></header>
      <div ref="list" class="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        <p v-if="!store.lines.length" class="text-sm leading-relaxed text-foreground-600">교육과정, 수강료, 상담 시간에 관해 질문할 수 있습니다. 이름, 전화번호 등 개인정보는 입력하지 마세요.</p>
        <div v-for="line in store.lines" :key="line.id" :class="['rounded-lg p-3 text-sm leading-relaxed',line.from==='visitor'?'ml-8 bg-primary-100 text-foreground-950':line.from==='system'?'border border-primary-200 bg-primary-50':'mr-8 bg-background-100 text-foreground-800']"><p>{{ line.text }}</p><NuxtLink v-if="line.handoff" :to="line.handoff.href" class="mt-2 inline-block underline">{{ line.handoff.label }}</NuxtLink></div>
        <p v-if="store.busy" class="text-xs text-foreground-500">조회 중…</p>
      </div>
      <form class="flex gap-2 border-t border-background-200 p-3" @submit.prevent="ask"><input v-model.trim="input" maxlength="250" required class="min-w-0 flex-1 rounded-md border border-background-300 bg-background-50 px-3 py-2 text-sm" aria-label="자동 안내 질문" placeholder="질문을 입력하세요" /><button type="submit" :disabled="store.busy||!input" class="btn-primary disabled:opacity-50">전송</button></form>
    </section>
    <button type="button" :aria-expanded="open" class="flex items-center gap-2 rounded-full bg-foreground-950 px-5 py-3 font-label text-sm text-background-50 shadow-lg" @click="open=!open"><i class="ri-question-answer-line text-lg" />{{ open?'자동 안내 닫기':'FAQ 자동 안내' }}</button>
  </aside>
</template>
