import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { HOME_INTRO_DESKTOP_MEDIA } from '~/utils/homeIntroTimeline';
import { createHomeWheelSkipGate } from '~/utils/homeWheelSkipGate';
import {
  HOME_TRAINING_COMPLETE_MS,
  HOME_TRAINING_DIAGRAM_NODES,
  HOME_TRAINING_TIMING,
  HOME_TRAINING_TARGETS,
  isTrainingTerminal,
  trainingDiagramProgress,
  trainingEntryProgress,
  trainingEntryTargetY,
  trainingHandoff,
  trainingItemProgress,
  trainingOutcome,
  trainingSkipIntent,
  trainingWheelDeltaPx,
  type TrainingRevealPhase,
} from '~/utils/homeTrainingTimeline';

/** Third scene. Owns only its wheel/RAF during Training entry/reveal.
 * Never mutates the Intro or Special controllers, Figma source, or wide-Y layout. */
export function useHomeTrainingReveal(
  stageRef: Ref<HTMLElement | null>,
  specialPhase: Ref<string>,
  specialSkipReason: Ref<string | null>,
) {
  const route = useRoute();
  const phase = ref<TrainingRevealPhase>('unarmed');
  const outcome = computed(() => trainingOutcome(phase.value));
  const prepared = ref(false);
  const starts = ref(0);
  const skips = ref(0);
  const skipReason = ref<string | null>(null);
  const wheelSkipGate = createHomeWheelSkipGate();
  let media: MediaQueryList | null = null;
  let mounted = false;
  let rafId: number | null = null;
  let activeListeners = false;
  let entryFromY = 0;
  let entryToY = 0;
  let lastProgrammaticY = 0;
  let entryStartedAt = 0;
  let revealStartedAt = 0;
  let firstWheelAt = 0;
  let lastWheelAt = 0;
  let extraDownPx = 0;
  let scrollingElement: HTMLElement | null = null;
  let originalScrollBehavior: { value: string; priority: string } | null = null;

  const section = (id: string): HTMLElement | null =>
    stageRef.value?.querySelector<HTMLElement>(`[data-wide-section="${id}"]`) ?? null;

  function headerHeight(): number {
    const header = document.querySelector<HTMLElement>('.smd-site-header');
    if (!header) throw new Error('SMD_TRAINING_HEADER_MISSING');
    const height = header.getBoundingClientRect().height;
    if (!Number.isFinite(height) || height < 0) throw new Error('SMD_TRAINING_HEADER_HEIGHT_INVALID');
    return height;
  }

  function targetFor(id: string): number {
    const el = section(id);
    if (!el?.isConnected) throw new Error(`SMD_TRAINING_SECTION_MISSING_${id}`);
    return trainingEntryTargetY(el.getBoundingClientRect().top + window.scrollY, headerHeight());
  }

  function desktopFailure(): string | null {
    if (!stageRef.value?.isConnected) return 'TRAINING_STAGE_NOT_CURRENT';
    if (route.path !== '/') return 'NON_HOME_ROUTE';
    if (!media?.matches) return 'NON_DESKTOP_OR_REDUCED_MOTION';
    if (navigator.maxTouchPoints > 0) return 'TOUCH_CAPABLE_DEVICE';
    if (!section('training-track') || !section('benefits')) return 'TRAINING_SECTION_UNAVAILABLE';
    const row = section('training-track');
    if (!row) return 'TRAINING_SECTION_UNAVAILABLE';
    if (row.querySelectorAll('.smd-home-training__target').length !== Object.keys(HOME_TRAINING_TARGETS).length) {
      return 'TRAINING_TARGET_COUNT_INVALID';
    }
    if (row.querySelectorAll('.smd-home-training__diagram-part').length !== HOME_TRAINING_DIAGRAM_NODES.length) {
      return 'TRAINING_DIAGRAM_COUNT_INVALID';
    }
    return null;
  }

  function setVar(name: string, value: number, unit = ''): void {
    section('training-track')?.style.setProperty(name, `${value.toFixed(6)}${unit}`);
  }

  function presentFinal(): void {
    for (let i = 0; i < 5; i++) {
      setVar(`--smd-training-${i}-opacity`, 1);
      setVar(`--smd-training-${i}-y`, 0, 'px');
    }
    setVar('--smd-training-diagram-opacity', 1);
  }

  function presentReveal(elapsedMs: number): void {
    for (let i = 0; i < 5; i++) {
      const progress = trainingItemProgress(elapsedMs, i);
      const offset = i < 2 ? HOME_TRAINING_TIMING.textOffsetPx : HOME_TRAINING_TIMING.cardOffsetPx;
      setVar(`--smd-training-${i}-opacity`, progress);
      setVar(`--smd-training-${i}-y`, offset * (1 - progress), 'px');
    }
    setVar('--smd-training-diagram-opacity', trainingDiagramProgress(elapsedMs));
  }

  function ownScrollBehavior(): void {
    const element = document.scrollingElement;
    if (!(element instanceof HTMLElement)) throw new Error('SMD_TRAINING_SCROLL_ELEMENT_UNAVAILABLE');
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

  /** Terminal states are irreversible for the lifetime of this home mount. */
  function finish(status: 'completed' | 'skipped', reason: string, goToNext = false): void {
    if (isTrainingTerminal(phase.value)) return;
    stopAnimation();
    presentFinal();
    let nextTarget: number | null = null;
    if (goToNext) {
      try { nextTarget = targetFor('benefits'); }
      catch (error) {
        console.error('SMD_TRAINING_NEXT_SECTION_FAILED', error);
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
        const y = entryFromY + (entryToY - entryFromY) * trainingEntryProgress(elapsed);
        lastProgrammaticY = y;
        window.scrollTo({ top: y, behavior: 'auto' });
        if (elapsed >= HOME_TRAINING_TIMING.entryDurationMs) {
          lastProgrammaticY = entryToY;
          window.scrollTo({ top: entryToY, behavior: 'auto' });
          beginReveal(now);
        } else rafId = window.requestAnimationFrame(tick);
        break;
      }
      case 'revealing': {
        const elapsed = Math.max(0, now - revealStartedAt);
        presentReveal(elapsed);
        if (elapsed >= HOME_TRAINING_COMPLETE_MS) finish('completed', 'ANIMATION_COMPLETE');
        else rafId = window.requestAnimationFrame(tick);
        break;
      }
      default: break;
    }
  }

  function beginEntry(now: number): void {
    entryFromY = window.scrollY;
    entryToY = targetFor('training-track');
    if (entryToY <= entryFromY + 1) throw new Error('SMD_TRAINING_ENTRY_NOT_FORWARD');
    ownScrollBehavior();
    firstWheelAt = now;
    lastWheelAt = now;
    extraDownPx = 0;
    entryStartedAt = now;
    lastProgrammaticY = entryFromY;
    phase.value = 'entering';
    rafId = window.requestAnimationFrame(tick);
  }

  function beginFromSpecialSkip(): void {
    if (phase.value !== 'unarmed') return;
    const error = desktopFailure();
    if (error) {
      finish('skipped', error);
      return;
    }
    const target = targetFor('training-track');
    // Special's down-skip already scrolled to this location before our post-flush watcher.
    if (Math.abs(window.scrollY - target) > 4) {
      finish('skipped', 'SPECIAL_HANDOFF_POSITION_INVALID');
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
        // A completed Special does not make Training a global wheel shortcut.
        // When the user has scrolled back above Special, leave navigation native.
        if (window.scrollY < targetFor('special-start') - 5) return;
        if (!event.cancelable) { finish('skipped', 'NON_CANCELABLE_WHEEL'); return; }
        if (targetFor('training-track') <= window.scrollY + 1) {
          finish('skipped', 'TRAINING_ALREADY_PASSED');
          return;
        }
        event.preventDefault();
        try { beginEntry(performance.now()); }
        catch (error) {
          console.error('SMD_TRAINING_ENTRY_FAILED', error);
          finish('skipped', 'ENTRY_FAILED');
        }
        break;
      }
      case 'entering':
      case 'revealing': {
        if (!event.cancelable) { finish('skipped', 'NON_CANCELABLE_WHEEL'); return; }
        const now = performance.now();
        let deltaPx: number;
        try { deltaPx = trainingWheelDeltaPx(event.deltaY, event.deltaMode, window.innerHeight); }
        catch (error) {
          console.error('SMD_TRAINING_WHEEL_CLASSIFICATION_FAILED', error);
          finish('skipped', 'WHEEL_CLASSIFICATION_FAILED');
          return;
        }
        const silence = now - lastWheelAt;
        lastWheelAt = now;
        extraDownPx += Math.max(0, deltaPx);
        const requestedIntent = trainingSkipIntent({
          deltaPx, elapsedSinceEntryMs: now - firstWheelAt,
          silenceSinceLastWheelMs: silence, cumulativeFollowUpDownPx: extraDownPx,
        });
        const intent = wheelSkipGate.observe(now, deltaPx, requestedIntent);
        switch (intent) {
          case 'skip-up':
            // Retire our controller without preventing the current upward wheel event.
            finish('skipped', 'WHEEL_UP');
            break;
          case 'skip-down':
            event.preventDefault();
            finish('skipped', 'WHEEL_DOWN', true);
            break;
          default:
            // Follow-up of the admitting wheel gesture: no scroll delta replay.
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
        if (targetFor('training-track') <= window.scrollY + 2) {
          finish('skipped', 'EXTERNAL_TRAINING_SCROLL');
        }
        break;
      }
      case 'entering':
        if (Math.abs(window.scrollY - lastProgrammaticY) > 48) finish('skipped', 'EXTERNAL_ENTRY_SCROLL');
        break;
      case 'revealing':
        if (Math.abs(window.scrollY - entryToY) > 3) finish('skipped', 'EXTERNAL_REVEAL_SCROLL');
        break;
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
        case 'entering': case 'revealing': finish('skipped', 'KEYBOARD_UP'); break;
        default: break;
      }
    }
  }

  function prepareIfOffscreen(): void {
    if (prepared.value) return;
    const training = section('training-track');
    if (!training || training.getBoundingClientRect().top <= window.innerHeight - 3) return;
    prepared.value = true;
  }

  function onHandoff(): void {
    if (!mounted || phase.value !== 'unarmed') return;
    const handoff = trainingHandoff(specialPhase.value, specialSkipReason.value);
    switch (handoff) {
      case 'wheel-ready': {
        const error = desktopFailure();
        if (error) { finish('skipped', error); return; }
        if (targetFor('training-track') <= window.scrollY + 1) {
          finish('skipped', 'TRAINING_ALREADY_PASSED'); return;
        }
        prepareIfOffscreen();
        phase.value = 'ready';
        installActiveListeners();
        break;
      }
      case 'at-training':
        beginFromSpecialSkip();
        break;
      case 'none': {
        if (specialPhase.value === 'skipped') finish('skipped', 'SPECIAL_NOT_FORWARDED');
        else if (specialPhase.value === 'disabled') finish('skipped', 'SPECIAL_DISABLED');
        else {
          switch (specialPhase.value) {
            case 'ready': case 'entering': case 'revealing': prepareIfOffscreen(); break;
            default: break;
          }
        }
        break;
      }
    }
  }

  function onEnvironmentChange(): void {
    if (!mounted) return;
    const error = desktopFailure();
    if (!error) return;
    switch (phase.value) {
      case 'ready': case 'entering': case 'revealing': finish('skipped', error); break;
      case 'unarmed': phase.value = 'disabled'; prepared.value = false; skipReason.value = error; break;
      default: break;
    }
  }

  function onResize(): void {
    switch (phase.value) {
      case 'ready': case 'entering': case 'revealing': finish('skipped', 'VIEWPORT_CHANGED'); break;
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

  // Post flush is essential: Special sets phase before skipReason and scrolls to
  // Training only after retiring its listeners. Never consume the same wheel twice.
  watch([specialPhase, specialSkipReason], onHandoff, { flush: 'post' });

  onMounted(() => {
    mounted = true;
    media = window.matchMedia(HOME_INTRO_DESKTOP_MEDIA);
    const error = desktopFailure();
    if (error) {
      phase.value = 'disabled';
      skipReason.value = error;
    } else {
      onHandoff();
    }
    media.addEventListener('change', onEnvironmentChange);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onBeforeUnmount(() => {
    mounted = false;
    stopAnimation();
    presentFinal();
    prepared.value = false;
    removeActiveListeners();
    restoreScrollBehavior();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    media?.removeEventListener('change', onEnvironmentChange);
    media = null;
  });

  return { phase, outcome, prepared, starts, skips, skipReason };
}
