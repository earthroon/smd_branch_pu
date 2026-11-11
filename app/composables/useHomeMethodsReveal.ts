import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { HOME_INTRO_DESKTOP_MEDIA } from '~/utils/homeIntroTimeline';
import { createHomeWheelSkipGate } from '~/utils/homeWheelSkipGate';
import {
  HOME_METHODS_COMPLETE_MS,
  HOME_METHODS_TARGETS,
  HOME_METHODS_TIMING,
  isMethodsTerminal,
  methodsCardProgress,
  methodsEntryProgress,
  methodsEntryTargetY,
  methodsHandoff,
  methodsOutcome,
  methodsSkipIntent,
  methodsTextProgress,
  methodsTitleProgress,
  methodsWheelDeltaPx,
  type MethodsRevealPhase,
} from '~/utils/homeMethodsTimeline';

/** Fifth home-only, one-shot scroll scene. Benefits owns the preceding gesture
 * and Methods never consumes or replays the event used for its handoff. */
export function useHomeMethodsReveal(
  stageRef: Ref<HTMLElement | null>,
  benefitsPhase: Ref<string>,
  benefitsSkipReason: Ref<string | null>,
) {
  const route = useRoute();
  const phase = ref<MethodsRevealPhase>('unarmed');
  const outcome = computed(() => methodsOutcome(phase.value));
  const prepared = ref(false);
  const starts = ref(0);
  const skips = ref(0);
  const skipReason = ref<string | null>(null);
  const wheelSkipGate = createHomeWheelSkipGate();

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
  let originalScrollBehavior: {value: string; priority: string} | null = null;

  const section = (id: string): HTMLElement | null =>
    stageRef.value?.querySelector<HTMLElement>(`[data-wide-section="${id}"]`) ?? null;

  function headerHeight(): number {
    const header = document.querySelector<HTMLElement>('.smd-site-header');
    if (!header) throw new Error('SMD_METHODS_HEADER_MISSING');
    const value = header.getBoundingClientRect().height;
    if (!Number.isFinite(value) || value < 0) throw new Error('SMD_METHODS_HEADER_HEIGHT_INVALID');
    return value;
  }

  function targetFor(id: string): number {
    const target = section(id);
    if (!target?.isConnected) throw new Error(`SMD_METHODS_SECTION_MISSING_${id}`);
    return methodsEntryTargetY(target.getBoundingClientRect().top + window.scrollY, headerHeight());
  }

  function desktopFailure(): string | null {
    if (!stageRef.value?.isConnected) return 'METHODS_STAGE_NOT_CURRENT';
    if (route.path !== '/') return 'NON_HOME_ROUTE';
    if (!media?.matches) return 'NON_DESKTOP_OR_REDUCED_MOTION';
    if (navigator.maxTouchPoints > 0) return 'TOUCH_CAPABLE_DEVICE';
    if (!section('benefits') || !section('methods') || !section('location'))
      return 'METHODS_SECTION_UNAVAILABLE';
    const row = section('methods');
    if (!row) return 'METHODS_SECTION_UNAVAILABLE';
    if (row.querySelectorAll('.smd-home-methods__title').length !== 1 ||
        row.querySelectorAll('.smd-home-methods__card').length !== HOME_METHODS_TARGETS.cards.length ||
        row.querySelectorAll('.smd-home-methods__text').length !== HOME_METHODS_TARGETS.text.length * 2)
      return 'METHODS_TARGET_COUNT_INVALID';
    return null;
  }

  function setVar(name: string, value: number, unit = ''): void {
    section('methods')?.style.setProperty(name, `${value.toFixed(6)}${unit}`);
  }

  function presentFinal(): void {
    setVar('--smd-methods-title-opacity', 1);
    setVar('--smd-methods-title-y', 0, 'px');
    for (let i = 0; i < 3; i++) {
      setVar(`--smd-methods-card-${i}-opacity`, 1);
      setVar(`--smd-methods-card-${i}-y`, 0, 'px');
      setVar(`--smd-methods-text-${i}-opacity`, 1);
    }
  }

  function presentReveal(elapsedMs: number): void {
    const title = methodsTitleProgress(elapsedMs);
    setVar('--smd-methods-title-opacity', title);
    setVar('--smd-methods-title-y', HOME_METHODS_TIMING.titleEntryOffsetPx * (1 - title), 'px');
    for (let i = 0; i < 3; i++) {
      const card = methodsCardProgress(elapsedMs, i);
      setVar(`--smd-methods-card-${i}-opacity`, card);
      setVar(`--smd-methods-card-${i}-y`, HOME_METHODS_TIMING.cardEntryOffsetPx * (1 - card), 'px');
      setVar(`--smd-methods-text-${i}-opacity`, methodsTextProgress(elapsedMs, i));
    }
  }

  function ownScrollBehavior(): void {
    if (scrollingElement) throw new Error('SMD_METHODS_SCROLL_ALREADY_OWNED');
    const element = document.scrollingElement;
    if (!(element instanceof HTMLElement)) throw new Error('SMD_METHODS_SCROLL_ELEMENT_UNAVAILABLE');
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
    if (element.style.getPropertyValue('scroll-behavior') !== 'auto' ||
        element.style.getPropertyPriority('scroll-behavior') !== 'important') return;
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
    window.addEventListener('wheel', onWheel, {passive: false, capture: true});
    window.addEventListener('keydown', onKeyDown, true);
    activeListeners = true;
  }

  /** A terminal phase is never re-armed. Complete every layer before releasing
   * scroll ownership, including text that has not yet faded in. */
  function finish(status: 'completed' | 'skipped', reason: string, goToNext = false): void {
    if (isMethodsTerminal(phase.value)) return;
    stopAnimation();
    presentFinal();
    let nextTarget: number | null = null;
    if (goToNext) {
      try { nextTarget = targetFor('location'); }
      catch (error) {
        console.error('SMD_METHODS_NEXT_SECTION_FAILED', error);
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
    if (nextTarget !== null) window.scrollTo({top: nextTarget, behavior: 'auto'});
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
        const y = entryFromY + (entryToY - entryFromY) * methodsEntryProgress(elapsed);
        lastProgrammaticY = y;
        window.scrollTo({top: y, behavior: 'auto'});
        if (elapsed >= HOME_METHODS_TIMING.entryDurationMs) {
          lastProgrammaticY = entryToY;
          window.scrollTo({top: entryToY, behavior: 'auto'});
          beginReveal(now);
        } else rafId = window.requestAnimationFrame(tick);
        break;
      }
      case 'revealing': {
        const elapsed = Math.max(0, now - revealStartedAt);
        presentReveal(elapsed);
        if (elapsed >= HOME_METHODS_COMPLETE_MS) finish('completed', 'ANIMATION_COMPLETE');
        else rafId = window.requestAnimationFrame(tick);
        break;
      }
      default: break;
    }
  }

  function beginEntry(now: number): void {
    entryFromY = window.scrollY;
    entryToY = targetFor('methods');
    if (entryToY <= entryFromY + 1) throw new Error('SMD_METHODS_ENTRY_NOT_FORWARD');
    ownScrollBehavior();
    firstWheelAt = now;
    lastWheelAt = now;
    extraDownPx = 0;
    entryStartedAt = now;
    lastProgrammaticY = entryFromY;
    phase.value = 'entering';
    rafId = window.requestAnimationFrame(tick);
  }

  function beginFromBenefitsSkip(): void {
    if (phase.value !== 'unarmed') return;
    const error = desktopFailure();
    if (error) { finish('skipped', error); return; }
    const target = targetFor('methods');
    if (Math.abs(window.scrollY - target) > 4) {
      finish('skipped', 'BENEFITS_HANDOFF_POSITION_INVALID');
      return;
    }
    if (!prepared.value) {
      finish('skipped', 'METHODS_ALREADY_VISIBLE_UNPREPARED');
      return;
    }
    entryToY = target;
    ownScrollBehavior();
    firstWheelAt = performance.now();
    lastWheelAt = firstWheelAt;
    extraDownPx = 0;
    installActiveListeners();
    // The Benefits wheel already moved to Methods. No second entry animation.
    beginReveal(firstWheelAt);
  }

  function onWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey || !Number.isFinite(event.deltaY)) return;
    if (event.target instanceof Element && event.target.closest('.smd-site-header')) return;
    switch (phase.value) {
      case 'ready': {
        if (event.deltaY <= 0) return;
        if (window.scrollY < targetFor('benefits') - 5) return;
        if (!event.cancelable) { finish('skipped', 'NON_CANCELABLE_WHEEL'); return; }
        if (targetFor('methods') <= window.scrollY + 1) {
          finish('skipped', 'METHODS_ALREADY_PASSED');
          return;
        }
        event.preventDefault();
        try { beginEntry(performance.now()); }
        catch (error) {
          console.error('SMD_METHODS_ENTRY_FAILED', error);
          finish('skipped', 'ENTRY_FAILED');
        }
        break;
      }
      case 'entering':
      case 'revealing': {
        if (!event.cancelable) { finish('skipped', 'NON_CANCELABLE_WHEEL'); return; }
        const now = performance.now();
        let deltaPx: number;
        try { deltaPx = methodsWheelDeltaPx(event.deltaY, event.deltaMode, window.innerHeight); }
        catch (error) {
          console.error('SMD_METHODS_WHEEL_CLASSIFICATION_FAILED', error);
          finish('skipped', 'WHEEL_CLASSIFICATION_FAILED');
          return;
        }
        const silence = now - lastWheelAt;
        lastWheelAt = now;
        extraDownPx += Math.max(0, deltaPx);
        const requestedIntent = methodsSkipIntent({
          deltaPx,
          elapsedSinceEntryMs: now - firstWheelAt,
          silenceSinceLastWheelMs: silence,
          cumulativeFollowUpDownPx: extraDownPx,
        });
        const intent = wheelSkipGate.observe(now, deltaPx, requestedIntent);
        switch (intent) {
          case 'skip-up':
            finish('skipped', 'WHEEL_UP'); // Allow the current upward event through.
            break;
          case 'skip-down':
            event.preventDefault();
            finish('skipped', 'WHEEL_DOWN', true);
            break;
          default:
            event.preventDefault(); // Suppress wheel tail; do not queue/replay.
            break;
        }
        break;
      }
      default: break;
    }
  }

  function onScroll(): void {
    try {
      switch (phase.value) {
        case 'unarmed': {
          // Wait for the complete post-flush Benefits handoff (phase + reason).
          if (benefitsPhase.value === 'skipped') return;
          if (window.scrollY >= targetFor('methods') - 2) finish('skipped', 'EXTERNAL_EARLY_SCROLL');
          break;
        }
        case 'ready': {
          if (window.scrollY >= targetFor('methods') - 2) finish('skipped', 'EXTERNAL_METHODS_SCROLL');
          break;
        }
        case 'entering': {
          if (Math.abs(window.scrollY - lastProgrammaticY) > 48)
            finish('skipped', 'EXTERNAL_ENTRY_SCROLL');
          break;
        }
        case 'revealing': {
          if (Math.abs(window.scrollY - entryToY) > 3)
            finish('skipped', 'EXTERNAL_REVEAL_SCROLL');
          break;
        }
        default: break;
      }
    } catch (error) {
      console.error('SMD_METHODS_SCROLL_GEOMETRY_FAILED', error);
      finish('skipped', 'SCROLL_GEOMETRY_FAILED');
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
    const methods = section('methods');
    if (!methods || methods.getBoundingClientRect().top <= window.innerHeight - 3) return;
    prepared.value = true;
  }

  function onHandoff(): void {
    if (!mounted || phase.value !== 'unarmed') return;
    const handoff = methodsHandoff(benefitsPhase.value, benefitsSkipReason.value);
    switch (handoff) {
      case 'wheel-ready': {
        const error = desktopFailure();
        if (error) { finish('skipped', error); return; }
        if (targetFor('methods') <= window.scrollY + 1) {
          finish('skipped', 'METHODS_ALREADY_PASSED');
          return;
        }
        if (!prepared.value) {
          finish('skipped', 'METHODS_ALREADY_VISIBLE_UNPREPARED');
          return;
        }
        phase.value = 'ready';
        installActiveListeners();
        break;
      }
      case 'at-methods':
        beginFromBenefitsSkip();
        break;
      case 'none': {
        if (benefitsPhase.value === 'skipped') finish('skipped', 'BENEFITS_NOT_FORWARDED');
        else if (benefitsPhase.value === 'disabled') {
          phase.value = 'disabled';
          prepared.value = false;
          skipReason.value = 'BENEFITS_DISABLED';
        } else prepareIfOffscreen();
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
      default: onEnvironmentChange(); break;
    }
  }
  function onVisibilityChange(): void {
    if (document.visibilityState !== 'hidden') return;
    switch (phase.value) {
      case 'entering': case 'revealing': finish('skipped', 'PAGE_HIDDEN'); break;
      default: break;
    }
  }

  // Benefits sets terminal phase, then skip reason, then moves to Methods.
  watch([benefitsPhase, benefitsSkipReason], onHandoff, {flush: 'post'});
  watch(() => route.path, onEnvironmentChange);

  onMounted(() => {
    mounted = true;
    media = window.matchMedia(HOME_INTRO_DESKTOP_MEDIA);
    const error = desktopFailure();
    if (error) {
      phase.value = 'disabled';
      skipReason.value = error;
    } else {
      prepareIfOffscreen();
      if (window.scrollY >= targetFor('methods') - 2) finish('skipped', 'RESTORED_METHODS_SCROLL');
      else onHandoff();
    }
    media.addEventListener('change', onEnvironmentChange);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, {passive: true});
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

  return {phase, outcome, prepared, starts, skips, skipReason};
}
