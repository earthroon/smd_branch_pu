import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { HOME_INTRO_DESKTOP_MEDIA } from '~/utils/homeIntroTimeline';
<<<<<<< HEAD
=======
import { createHomeWheelSkipGate } from '~/utils/homeWheelSkipGate';
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
import {
  HOME_BENEFITS_COMPLETE_MS,
  HOME_BENEFITS_TARGETS,
  HOME_BENEFITS_TIMING,
  benefitsEntryProgress,
  benefitsEntryTargetY,
  benefitsHandoff,
  benefitsItemProgress,
  benefitsOutcome,
  benefitsSkipIntent,
  benefitsWheelDeltaPx,
  isBenefitsTerminal,
  type BenefitsRevealPhase,
} from '~/utils/homeBenefitsTimeline';

/** Fourth, home-only scene. One-shot and independently owned.
 * The existing Intro/Special/Training controllers do not change. */
export function useHomeBenefitsReveal(
  stageRef: Ref<HTMLElement | null>,
  trainingPhase: Ref<string>,
  trainingSkipReason: Ref<string | null>,
) {
  const route = useRoute();
  const phase = ref<BenefitsRevealPhase>('unarmed');
  const outcome = computed(() => benefitsOutcome(phase.value));
  const prepared = ref(false);
  const starts = ref(0);
  const skips = ref(0);
  const skipReason = ref<string | null>(null);
<<<<<<< HEAD
=======
  const wheelSkipGate = createHomeWheelSkipGate();
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)

  let mounted = false;
  let media: MediaQueryList | null = null;
  let rafId: number | null = null;
  let activeListeners = false;
  let entryFromY = 0;
  let entryToY = 0;
  let entryStartedAt = 0;
  let revealStartedAt = 0;
  let firstWheelAt = 0;
  let lastWheelAt = 0;
  let extraDownPx = 0;
  let lastProgrammaticY = 0;
  let scrollingElement: HTMLElement | null = null;
  let originalScrollBehavior: { value: string; priority: string } | null = null;

  const section = (id: string): HTMLElement | null =>
    stageRef.value?.querySelector<HTMLElement>(`[data-wide-section="${id}"]`) ?? null;

  function headerHeight(): number {
    const header = document.querySelector<HTMLElement>('.smd-site-header');
    if (!header) throw new Error('SMD_BENEFITS_HEADER_MISSING');
    const height = header.getBoundingClientRect().height;
    if (!Number.isFinite(height) || height < 0) throw new Error('SMD_BENEFITS_HEADER_HEIGHT_INVALID');
    return height;
  }

  function targetFor(id: string): number {
    const target = section(id);
    if (!target?.isConnected) throw new Error(`SMD_BENEFITS_SECTION_MISSING_${id}`);
    return benefitsEntryTargetY(target.getBoundingClientRect().top + window.scrollY, headerHeight());
  }

  function desktopFailure(): string | null {
    if (!stageRef.value?.isConnected) return 'BENEFITS_STAGE_NOT_CURRENT';
    if (route.path !== '/') return 'NON_HOME_ROUTE';
    if (!media?.matches) return 'NON_DESKTOP_OR_REDUCED_MOTION';
    if (navigator.maxTouchPoints > 0) return 'TOUCH_CAPABLE_DEVICE';
    if (!section('training-track') || !section('benefits') || !section('methods')) {
      return 'BENEFITS_SECTION_UNAVAILABLE';
    }
    const row = section('benefits');
    if (row?.querySelectorAll('.smd-home-benefits__target').length !== Object.keys(HOME_BENEFITS_TARGETS).length) {
      return 'BENEFITS_TARGET_COUNT_INVALID';
    }
    return null;
  }

  function setVar(name: string, value: number, unit = ''): void {
    section('benefits')?.style.setProperty(name, `${value.toFixed(6)}${unit}`);
  }

  function presentFinal(): void {
    for (let i = 0; i < 5; i++) {
      setVar(`--smd-benefits-${i}-opacity`, 1);
      setVar(`--smd-benefits-${i}-y`, 0, 'px');
    }
  }

  function presentReveal(elapsedMs: number): void {
    for (let i = 0; i < 5; i++) {
      const progress = benefitsItemProgress(elapsedMs, i);
      const offset = i === 0
        ? HOME_BENEFITS_TIMING.titleEntryOffsetPx
        : HOME_BENEFITS_TIMING.cardEntryOffsetPx;
      setVar(`--smd-benefits-${i}-opacity`, progress);
      setVar(`--smd-benefits-${i}-y`, offset * (1 - progress), 'px');
    }
  }

  function ownScrollBehavior(): void {
    const element = document.scrollingElement;
    if (!(element instanceof HTMLElement)) throw new Error('SMD_BENEFITS_SCROLL_ELEMENT_UNAVAILABLE');
    scrollingElement = element;
    originalScrollBehavior = {
      value: element.style.getPropertyValue('scroll-behavior'),
      priority: element.style.getPropertyPriority('scroll-behavior'),
    };
    element.style.setProperty('scroll-behavior', 'auto', 'important');
  }

  function restoreScrollBehavior(): void {
    const element = scrollingElement;
    const previous = originalScrollBehavior;
    scrollingElement = null;
    originalScrollBehavior = null;
    if (!element || !previous) return;
    if (element.style.getPropertyValue('scroll-behavior') !== 'auto'
      || element.style.getPropertyPriority('scroll-behavior') !== 'important') return;
    if (previous.value) element.style.setProperty('scroll-behavior', previous.value, previous.priority);
    else element.style.removeProperty('scroll-behavior');
  }

  function stopAnimation(): void {
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    rafId = null;
  }

  function removeActiveListeners(): void {
    if (!activeListeners) return;
    window.removeEventListener('wheel', onWheel, true);
    window.removeEventListener('keydown', onKeyDown, true);
    activeListeners = false;
  }

  function installActiveListeners(): void {
    if (activeListeners) return;
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('keydown', onKeyDown, true);
    activeListeners = true;
  }

  /** Only terminal outcomes own the final visual state. Nothing can re-arm a terminal scene. */
  function finish(status: 'completed' | 'skipped', reason: string, goToNext = false): void {
    if (isBenefitsTerminal(phase.value)) return;
    stopAnimation();
    presentFinal();
    let nextTarget: number | null = null;
    if (goToNext) {
      try { nextTarget = targetFor('methods'); }
      catch (error) {
        console.error('SMD_BENEFITS_NEXT_SECTION_FAILED', error);
        reason = 'NEXT_SECTION_GEOMETRY_FAILED';
      }
    }
    phase.value = status;
    if (status === 'skipped') {
      skips.value += 1;
      skipReason.value = reason;
    }
    prepared.value = false;
    removeActiveListeners();
    if (nextTarget !== null) window.scrollTo({ top: nextTarget, behavior: 'auto' });
    restoreScrollBehavior();
  }

  function beginReveal(now: number): void {
    revealStartedAt = now;
    starts.value += 1;
    presentReveal(0);
    phase.value = 'revealing';
    rafId = window.requestAnimationFrame(tick);
  }

  function tick(now: number): void {
    rafId = null;
    if (!mounted) return;
    switch (phase.value) {
      case 'entering': {
        const elapsed = Math.max(0, now - entryStartedAt);
        const y = entryFromY + (entryToY - entryFromY) * benefitsEntryProgress(elapsed);
        lastProgrammaticY = y;
        window.scrollTo({ top: y, behavior: 'auto' });
        if (elapsed >= HOME_BENEFITS_TIMING.entryDurationMs) {
          lastProgrammaticY = entryToY;
          window.scrollTo({ top: entryToY, behavior: 'auto' });
          beginReveal(now);
        } else rafId = window.requestAnimationFrame(tick);
        break;
      }
      case 'revealing': {
        presentReveal(Math.max(0, now - revealStartedAt));
        if (now - revealStartedAt >= HOME_BENEFITS_COMPLETE_MS) {
          finish('completed', 'ANIMATION_COMPLETE');
        } else rafId = window.requestAnimationFrame(tick);
        break;
      }
      default: break;
    }
  }

  function beginEntry(now: number): void {
    entryFromY = window.scrollY;
    entryToY = targetFor('benefits');
    if (entryToY <= entryFromY + 1) throw new Error('SMD_BENEFITS_ENTRY_NOT_FORWARD');
    ownScrollBehavior();
    firstWheelAt = now;
    lastWheelAt = now;
    extraDownPx = 0;
    entryStartedAt = now;
    lastProgrammaticY = entryFromY;
    phase.value = 'entering';
    rafId = window.requestAnimationFrame(tick);
  }

  function beginFromTrainingSkip(): void {
    if (phase.value !== 'unarmed') return;
    const error = desktopFailure();
    if (error) { finish('skipped', error); return; }
    const target = targetFor('benefits');
    // Training has retired its Wheel listener and navigated already. Do NOT
    // consume or replay the same Wheel event a second time.
    if (Math.abs(window.scrollY - target) > 4) {
      finish('skipped', 'TRAINING_HANDOFF_POSITION_INVALID');
      return;
    }
    entryToY = target;
    ownScrollBehavior();
    firstWheelAt = performance.now();
    lastWheelAt = firstWheelAt;
    extraDownPx = 0;
    installActiveListeners();
    beginReveal(firstWheelAt);
  }

  function onWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey || !Number.isFinite(event.deltaY)) return;
    if (event.target instanceof Element && event.target.closest('.smd-site-header')) return;
    switch (phase.value) {
      case 'ready': {
        if (event.deltaY <= 0) return;
        // A completed Training does not create a global wheel shortcut.
        if (window.scrollY < targetFor('training-track') - 5) return;
        if (!event.cancelable) { finish('skipped', 'NON_CANCELABLE_WHEEL'); return; }
        if (targetFor('benefits') <= window.scrollY + 1) {
          finish('skipped', 'BENEFITS_ALREADY_PASSED');
          return;
        }
        event.preventDefault();
        try { beginEntry(performance.now()); }
        catch (error) {
          console.error('SMD_BENEFITS_ENTRY_FAILED', error);
          finish('skipped', 'ENTRY_FAILED');
        }
        break;
      }
      case 'entering':
      case 'revealing': {
        if (!event.cancelable) { finish('skipped', 'NON_CANCELABLE_WHEEL'); return; }
        const now = performance.now();
        let deltaPx: number;
        try { deltaPx = benefitsWheelDeltaPx(event.deltaY, event.deltaMode, window.innerHeight); }
        catch (error) {
          console.error('SMD_BENEFITS_WHEEL_CLASSIFICATION_FAILED', error);
          finish('skipped', 'WHEEL_CLASSIFICATION_FAILED');
          return;
        }
        const silence = now - lastWheelAt;
        lastWheelAt = now;
        extraDownPx += Math.max(0, deltaPx);
<<<<<<< HEAD
        const intent = benefitsSkipIntent({
=======
        const requestedIntent = benefitsSkipIntent({
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
          deltaPx,
          elapsedSinceEntryMs: now - firstWheelAt,
          silenceSinceLastWheelMs: silence,
          cumulativeFollowUpDownPx: extraDownPx,
        });
<<<<<<< HEAD
=======
        const intent = wheelSkipGate.observe(now, deltaPx, requestedIntent);
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
        switch (intent) {
          case 'skip-up':
            // Let the current upward event remain native after retiring ownership.
            finish('skipped', 'WHEEL_UP');
            break;
          case 'skip-down':
            event.preventDefault();
            finish('skipped', 'WHEEL_DOWN', true);
            break;
          default:
            event.preventDefault(); // Wheel-tail suppression; never queue or replay delta.
            break;
        }
        break;
      }
      default: break;
    }
  }

  function onScroll(): void {
    switch (phase.value) {
      case 'unarmed': {
        // External scrollbar restoration or direct navigation that bypasses the
        // first three scenes must not leave the Benefits heading/cards hidden.
        if (trainingPhase.value === 'skipped') return; // wait for post-flush reason+position handoff
        if (window.scrollY >= targetFor('benefits') - 2) finish('skipped', 'EXTERNAL_EARLY_SCROLL');
        break;
      }
      case 'ready': {
        if (window.scrollY >= targetFor('benefits') - 2) {
          finish('skipped', 'EXTERNAL_BENEFITS_SCROLL');
        }
        break;
      }
      case 'entering': {
        if (Math.abs(window.scrollY - lastProgrammaticY) > 48) {
          finish('skipped', 'EXTERNAL_ENTRY_SCROLL');
        }
        break;
      }
      case 'revealing': {
        if (Math.abs(window.scrollY - entryToY) > 3) {
          finish('skipped', 'EXTERNAL_REVEAL_SCROLL');
        }
        break;
      }
      default: break;
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable]')) return;
    const down = ['ArrowDown', 'PageDown', ' ', 'End'];
    const up = ['ArrowUp', 'PageUp', 'Home'];
    if (down.includes(event.key)) {
      switch (phase.value) {
        case 'entering': case 'revealing':
          event.preventDefault();
          finish('skipped', 'KEYBOARD_DOWN', true);
          break;
        default: break;
      }
    } else if (up.includes(event.key)) {
      switch (phase.value) {
        case 'entering': case 'revealing':
          finish('skipped', 'KEYBOARD_UP');
          break;
        default: break;
      }
    }
  }

  function prepareIfOffscreen(): void {
    if (prepared.value) return;
    const benefits = section('benefits');
    if (!benefits || benefits.getBoundingClientRect().top <= window.innerHeight - 3) return;
    prepared.value = true;
  }

  function onHandoff(): void {
    if (!mounted || phase.value !== 'unarmed') return;
    const handoff = benefitsHandoff(trainingPhase.value, trainingSkipReason.value);
    switch (handoff) {
      case 'wheel-ready': {
        const error = desktopFailure();
        if (error) { finish('skipped', error); return; }
        if (targetFor('benefits') <= window.scrollY + 1) {
          finish('skipped', 'BENEFITS_ALREADY_PASSED');
          return;
        }
        // Prepared on mount while this section was offscreen. Its upper edge
        // may already be visible from Training due to Training's 75% height.
        if (!prepared.value) {
          finish('skipped', 'BENEFITS_ALREADY_VISIBLE_UNPREPARED');
          return;
        }
        phase.value = 'ready';
        installActiveListeners();
        break;
      }
      case 'at-benefits':
        beginFromTrainingSkip();
        break;
      case 'none': {
        if (trainingPhase.value === 'skipped') finish('skipped', 'TRAINING_NOT_FORWARDED');
        else if (trainingPhase.value === 'disabled') finish('skipped', 'TRAINING_DISABLED');
        else prepareIfOffscreen();
        break;
      }
    }
  }

  function onEnvironmentChange(): void {
    if (!mounted) return;
    const error = desktopFailure();
    if (!error) return;
    switch (phase.value) {
      case 'unarmed':
        phase.value = 'disabled';
        prepared.value = false;
        skipReason.value = error;
        break;
      case 'ready': case 'entering': case 'revealing':
        finish('skipped', error);
        break;
      default: break;
    }
  }

  function onResize(): void {
    switch (phase.value) {
      case 'ready': case 'entering': case 'revealing':
        finish('skipped', 'VIEWPORT_CHANGED');
        break;
      default:
        onEnvironmentChange();
        break;
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState !== 'hidden') return;
    switch (phase.value) {
      case 'entering': case 'revealing': finish('skipped', 'PAGE_HIDDEN'); break;
      default: break;
    }
  }

  // Training sets its terminal phase before the skip reason, then scrolls to
  // Benefits. A post-flush watcher observes the complete handoff once.
  watch([trainingPhase, trainingSkipReason], onHandoff, { flush: 'post' });

  onMounted(() => {
    mounted = true;
    media = window.matchMedia(HOME_INTRO_DESKTOP_MEDIA);
    const error = desktopFailure();
    if (error) {
      phase.value = 'disabled';
      skipReason.value = error;
    } else {
      // Prepare before Training animates so its shorter 75% viewport can
      // partially reveal the Benefits section without exposing final cards.
      prepareIfOffscreen();
      if (window.scrollY >= targetFor('benefits') - 2) {
        finish('skipped', 'RESTORED_BENEFITS_SCROLL');
      } else onHandoff();
    }
    media.addEventListener('change', onEnvironmentChange);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onBeforeUnmount(() => {
    mounted = false;
    stopAnimation();
    presentFinal();
    prepared.value = false;
    removeActiveListeners();
    restoreScrollBehavior();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    media?.removeEventListener('change', onEnvironmentChange);
    media = null;
  });

  return { phase, outcome, prepared, starts, skips, skipReason };
}
