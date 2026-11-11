import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { HOME_INTRO_DESKTOP_MEDIA } from '~/utils/homeIntroTimeline';
<<<<<<< HEAD
=======
import { createHomeWheelSkipGate } from '~/utils/homeWheelSkipGate';
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
import {
  HOME_SPECIAL_REVEAL_COMPLETE_MS,
  HOME_SPECIAL_TIMING,
  isSpecialTerminal,
  specialEntryProgress,
  specialEntryTargetY,
  specialItemProgress,
  specialOutcome,
  specialSkipIntent,
  specialWheelDeltaPx,
  type SpecialRevealPhase,
} from '~/utils/homeSpecialTimeline';

/** One-shot, home-only second scene. The first Intro is never mutated or rescheduled. */
export function useHomeSpecialReveal(stageRef: Ref<HTMLElement | null>, introCompleted: Ref<boolean>) {
  const route = useRoute();
  const phase = ref<SpecialRevealPhase>('unarmed');
  const outcome = computed(() => specialOutcome(phase.value));
  const starts = ref(0);
  const skips = ref(0);
  const skipReason = ref<string | null>(null);
<<<<<<< HEAD
=======
  const wheelSkipGate = createHomeWheelSkipGate();
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
  let media: MediaQueryList | null = null;
  let motionRoot: HTMLElement | null = null;
  let mounted = false;
  let rafId: number | null = null;
  let activeListeners = false;
  let entryStartedAt = 0;
  let revealStartedAt = 0;
  let firstWheelAt = 0;
  let lastWheelAt = 0;
  let extraDownPx = 0;
  let entryFromY = 0;
  let entryToY = 0;
  let lastProgrammaticY = 0;
  let scrollingElement: HTMLElement | null = null;
  let originalScrollBehavior: { value: string; priority: string } | null = null;

  const section = (id: string): HTMLElement | null =>
    stageRef.value?.querySelector<HTMLElement>(`[data-wide-section="${id}"]`) ?? null;

  function headerHeight(): number {
    const el = document.querySelector<HTMLElement>('.smd-site-header');
    if (!el) throw new Error('SMD_SPECIAL_HEADER_GEOMETRY_UNAVAILABLE');
    const value = el.getBoundingClientRect().height;
    if (!Number.isFinite(value) || value < 0) throw new Error('SMD_SPECIAL_HEADER_HEIGHT_INVALID');
    return value;
  }

  function documentTop(element: HTMLElement): number {
    return element.getBoundingClientRect().top + window.scrollY;
  }

  function targetFor(id: string): number {
    const el = section(id);
    if (!el || !el.isConnected) throw new Error(`SMD_SPECIAL_SECTION_MISSING_${id}`);
    return specialEntryTargetY(documentTop(el), headerHeight());
  }

  function desktopFailure(): string | null {
    if (!stageRef.value?.isConnected) return 'SPECIAL_STAGE_NOT_CURRENT';
    if (route.path !== '/') return 'NON_HOME_ROUTE';
    if (!media?.matches) return 'NON_DESKTOP_OR_REDUCED_MOTION';
    if (navigator.maxTouchPoints > 0) return 'TOUCH_CAPABLE_DEVICE';
    if (!section('special-start') || !section('training-track')) return 'SPECIAL_SECTION_UNAVAILABLE';
    if (stageRef.value.querySelectorAll('.smd-home-special__target').length !== 4) {
      return 'SPECIAL_TARGET_COUNT_INVALID';
    }
    return null;
  }

  function setVar(name: string, number: number, unit = ''): void {
    // Keep per-frame style invalidation inside Special Start, never across all 7 body scenes.
    (motionRoot ?? section('special-start'))?.style.setProperty(name, `${number.toFixed(6)}${unit}`);
  }

  function materializeFinal(): void {
    for (let i = 0; i < 4; i++) {
      setVar(`--smd-special-${i}-opacity`, 1);
      setVar(`--smd-special-${i}-y`, 0, 'px');
    }
  }

  function presentReveal(elapsedMs: number): void {
    for (let i = 0; i < 4; i++) {
      const progress = specialItemProgress(elapsedMs, i);
      const offset = i === 0 ? HOME_SPECIAL_TIMING.titleEntryOffsetPx
        : HOME_SPECIAL_TIMING.cardEntryOffsetPx;
      setVar(`--smd-special-${i}-opacity`, progress);
      setVar(`--smd-special-${i}-y`, offset * (1 - progress), 'px');
    }
  }

  function ownScrollBehavior(): void {
    const element = document.scrollingElement;
    if (!(element instanceof HTMLElement)) throw new Error('SMD_SPECIAL_SCROLL_ELEMENT_UNAVAILABLE');
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
    // Do not overwrite scroll-behavior if another owner has changed it.
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
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('keydown', onKeyDown, true);
    activeListeners = false;
  }

  function installActiveListeners(): void {
    if (activeListeners) return;
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown, true);
    activeListeners = true;
  }

  /** All terminal routes expose fully visible content and release event ownership. */
  function finish(status: 'completed' | 'skipped', reason: string, goToNext = false): void {
    if (isSpecialTerminal(phase.value)) return;
    stopAnimation();
    materializeFinal();
    // Resolve a valid next target while the immediate-scroll override still belongs to us.
    let nextTarget: number | null = null;
    if (goToNext) {
      try { nextTarget = targetFor('training-track'); }
      catch (error) {
        console.error('SMD_SPECIAL_NEXT_SECTION_FAILED', error);
        reason = 'NEXT_SECTION_GEOMETRY_FAILED';
      }
    }
    phase.value = status;
    if (status === 'skipped') {
      skips.value += 1;
      skipReason.value = reason;
    }
    removeActiveListeners();
    if (nextTarget !== null && originalScrollBehavior !== null) {
      window.scrollTo({ top: nextTarget, behavior: 'auto' });
    }
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
        const value = entryFromY + (entryToY - entryFromY) * specialEntryProgress(elapsed);
        lastProgrammaticY = value;
        window.scrollTo({ top: value, behavior: 'auto' });
        if (elapsed >= HOME_SPECIAL_TIMING.entryDurationMs) {
          lastProgrammaticY = entryToY;
          window.scrollTo({ top: entryToY, behavior: 'auto' });
          beginReveal(now);
        } else rafId = window.requestAnimationFrame(tick);
        break;
      }
      case 'revealing': {
        const elapsed = Math.max(0, now - revealStartedAt);
        presentReveal(elapsed);
        if (elapsed >= HOME_SPECIAL_REVEAL_COMPLETE_MS) finish('completed', 'ANIMATION_COMPLETE');
        else rafId = window.requestAnimationFrame(tick);
        break;
      }
      default: break;
    }
  }

  function beginEntry(now: number): void {
    entryFromY = window.scrollY;
    entryToY = targetFor('special-start');
    if (entryToY <= entryFromY + 1) throw new Error('SMD_SPECIAL_ENTRY_NOT_FORWARD');
    ownScrollBehavior();
    firstWheelAt = now;
    lastWheelAt = now;
    extraDownPx = 0;
    entryStartedAt = now;
    lastProgrammaticY = entryFromY;
    phase.value = 'entering';
    rafId = window.requestAnimationFrame(tick);
  }

  function onWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey || !Number.isFinite(event.deltaY)) return;
    if (event.target instanceof Element && event.target.closest('.smd-site-header')) return;
    switch (phase.value) {
      case 'ready': {
        if (event.deltaY <= 0) return;
        if (!event.cancelable) {
          finish('skipped', 'NON_CANCELABLE_WHEEL');
          return;
        }
        const special = section('special-start');
        if (!special || special.getBoundingClientRect().top < window.innerHeight - 3) {
          finish('skipped', 'SPECIAL_ALREADY_VISIBLE');
          return;
        }
        event.preventDefault();
        try { beginEntry(performance.now()); }
        catch (error) {
          console.error('SMD_SPECIAL_ENTRY_FAILED', error);
          finish('skipped', 'ENTRY_FAILED');
        }
        break;
      }
      case 'entering':
      case 'revealing': {
        if (!event.cancelable) {
          finish('skipped', 'NON_CANCELABLE_WHEEL');
          return;
        }
        const now = performance.now();
        let deltaPx: number;
        try { deltaPx = specialWheelDeltaPx(event.deltaY, event.deltaMode, window.innerHeight); }
        catch (error) {
          console.error('SMD_SPECIAL_WHEEL_CLASSIFICATION_FAILED', error);
          finish('skipped', 'WHEEL_CLASSIFICATION_FAILED');
          return;
        }
        const silence = now - lastWheelAt;
        lastWheelAt = now;
        extraDownPx += Math.max(0, deltaPx);
<<<<<<< HEAD
        const intent = specialSkipIntent({
          deltaPx, elapsedSinceEntryMs: now - firstWheelAt,
          silenceSinceLastWheelMs: silence, cumulativeFollowUpDownPx: extraDownPx,
        });
=======
        const requestedIntent = specialSkipIntent({
          deltaPx, elapsedSinceEntryMs: now - firstWheelAt,
          silenceSinceLastWheelMs: silence, cumulativeFollowUpDownPx: extraDownPx,
        });
        const intent = wheelSkipGate.observe(now, deltaPx, requestedIntent);
>>>>>>> dec113c (feat(home): add FAQ accordion and stabilize scroll animations)
        switch (intent) {
          case 'skip-up':
            // Leave this event native after retiring our controller.
            finish('skipped', 'WHEEL_UP');
            break;
          case 'skip-down':
            event.preventDefault();
            finish('skipped', 'WHEEL_DOWN', true);
            break;
          default:
            // Wheel tail of the admitting gesture: no accumulated scroll/replay.
            event.preventDefault();
            break;
        }
        break;
      }
      default: break;
    }
  }

  function onScroll(): void {
    switch (phase.value) {
      case 'ready': {
        const special = section('special-start');
        if (!special || special.getBoundingClientRect().top < window.innerHeight - 3) {
          finish('skipped', 'EXTERNAL_SCROLL');
        }
        break;
      }
      case 'entering':
        // A scrollbar/other owner may move the document independently of our RAF.
        if (Math.abs(window.scrollY - lastProgrammaticY) > 48) {
          finish('skipped', 'EXTERNAL_ENTRY_SCROLL');
        }
        break;
      case 'revealing':
        if (Math.abs(window.scrollY - entryToY) > 3) finish('skipped', 'EXTERNAL_REVEAL_SCROLL');
        break;
      default: break;
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable]')) return;
    const keys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    switch (phase.value) {
      case 'entering':
      case 'revealing':
        // User navigation is native; never re-hide the completed targets.
        finish('skipped', 'KEYBOARD_NAVIGATION');
        break;
      default: break;
    }
  }

  function arm(): void {
    if (!mounted || phase.value !== 'unarmed' || !introCompleted.value) return;
    const reason = desktopFailure();
    if (reason) {
      phase.value = 'disabled';
      skipReason.value = reason;
      return;
    }
    const special = section('special-start');
    if (!special || special.getBoundingClientRect().top < window.innerHeight - 3) {
      // Restored/moved scroll positions must never hide content waiting for a wheel.
      phase.value = 'skipped';
      skipReason.value = 'SPECIAL_ALREADY_VISIBLE';
      skips.value += 1;
      return;
    }
    motionRoot = special;
    phase.value = 'ready';
    installActiveListeners();
  }

  function onEnvironmentChange(): void {
    if (!mounted) return;
    const reason = desktopFailure();
    if (!reason) return;
    switch (phase.value) {
      case 'ready': case 'entering': case 'revealing': finish('skipped', reason); break;
      case 'unarmed': phase.value = 'disabled'; skipReason.value = reason; break;
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

  watch(introCompleted, () => arm(), { flush: 'sync' });

  onMounted(() => {
    mounted = true;
    media = window.matchMedia(HOME_INTRO_DESKTOP_MEDIA);
    const reason = desktopFailure();
    if (reason) {
      phase.value = 'disabled';
      skipReason.value = reason;
    } else arm();
    media.addEventListener('change', onEnvironmentChange);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onBeforeUnmount(() => {
    mounted = false;
    stopAnimation();
    materializeFinal();
    removeActiveListeners();
    restoreScrollBehavior();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    media?.removeEventListener('change', onEnvironmentChange);
    media = null;
    motionRoot = null;
  });

  return { phase, outcome, starts, skips, skipReason };
}
