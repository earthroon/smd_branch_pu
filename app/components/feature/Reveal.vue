<script setup lang="ts">
const props = withDefaults(defineProps<{ delay?: number; className?: string }>(), {
  delay: 0,
  className: '',
});
const el = ref<HTMLElement | null>(null);
const visible = ref(false);
let observer: IntersectionObserver | null = null;
let disposed = false;

onMounted(() => {
  const node = el.value;
  if (!node) return;
  disposed = false;
  if (!('IntersectionObserver' in window)) {
    visible.value = true;
    return;
  }
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!disposed && entry.isIntersecting) {
        visible.value = true;
        observer?.unobserve(entry.target);
      }
    }
  }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
  observer.observe(node);
});
onUnmounted(() => {
  disposed = true;
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <div
    ref="el"
    :class="[
      'transition-all duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
      visible ? 'translate-y-0 opacity-100' : 'translate-y-7 opacity-0',
      props.className,
    ]"
    :style="{ transitionDelay: `${props.delay}ms` }"
  ><slot /></div>
</template>
