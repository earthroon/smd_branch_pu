/** SMD_R7_CF5_WHEEL_SPRING_R1
 * Runtime-only editorial sheet wheel motion, derived from R6's 940ms / 0.80 / 9.8 response.
 * No Figma/CMS/motion-v state is mutated. Native scrolling owns flows, forms and short viewports.
 */
export const CATALOGUE_SPRING_DURATION_MS = 940 as const;
export const CATALOGUE_SPRING_DAMPING = 0.80 as const;
export const CATALOGUE_SPRING_FREQUENCY = 9.8 as const;
export const CATALOGUE_WHEEL_IDLE_MS = 180 as const;
export const CATALOGUE_WHEEL_THRESHOLD_PX = 26 as const;
export const CATALOGUE_SPRING_MEDIA =
  '(min-width: 1100px) and (min-height: 850px) and (prefers-reduced-motion: no-preference)' as const;

/** Underdamped second-order step response; can briefly exceed 1 before settling. */
export function catalogueSpringProgress(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0)
    throw new Error('R7_SPRING_ELAPSED_INVALID');
  if (elapsedMs >= CATALOGUE_SPRING_DURATION_MS) return 1;
  const z = CATALOGUE_SPRING_DAMPING;
  const w = CATALOGUE_SPRING_FREQUENCY;
  const wd = w * Math.sqrt(1 - z * z);
  const t = elapsedMs / 1000;
  return 1 - Math.exp(-z * w * t) *
    (Math.cos(wd * t) + z / Math.sqrt(1 - z * z) * Math.sin(wd * t));
}

export type CatalogueSpringLease = Readonly<{ cancel: () => void; dispose: () => void }>;
type SpringFrame = {frame: number; started: number; direction: number; from: number; to: number};

const CLAMP = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const PAGE_SELECTOR = '.smd-site-shell[data-catalogue-ui="r7"] .smd-r7-home, ' +
  '.smd-site-shell[data-catalogue-ui="r7"] .smd-r7-route';
const COVER_SELECTOR = '.smd-r7-home__cover, .smd-r7-route__cover';
const VIEWPORT_SHEET_SELECTOR = '.smd-r7-sheet[data-sheet-fit="viewport"]';
const WHEEL_NATIVE_SELECTOR = 'input, textarea, select, option, iframe, [contenteditable], ' +
  '[role="dialog"], [role="listbox"], [data-native-scroll], [data-scroll-spring-ignore]';

/** Only complete, immediately adjacent viewport sheets qualify; never jump over CMS inserts. */
function isViewportSheet(element: Element | null, viewportHeight: number): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.matches(`${COVER_SELECTOR}, ${VIEWPORT_SHEET_SELECTOR}`))
    return false;
  const height = element.getBoundingClientRect().height;
  return Math.abs(height - viewportHeight) <= 2 && element.scrollHeight <= element.clientHeight + 2;
}
function hasNestedNativeScroll(target: Element, owner: HTMLElement): boolean {
  for (let element: Element | null = target; element && element !== owner; element = element.parentElement) {
    if (!(element instanceof HTMLElement)) continue;
    const style = getComputedStyle(element);
    if (/(?:auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 2)
      return true;
  }
  return false;
}

/** Mount exactly once in the shared Nuxt layout; return explicit cleanup hooks. */
export function installCatalogueSpringWheel(getCurrentPath: () => string): CatalogueSpringLease {
  const screen = window.matchMedia(CATALOGUE_SPRING_MEDIA);
  const html = document.documentElement;
  let frame: SpringFrame | null = null;
  let total = 0;
  let used = false;
  let lastWheelAt = -Infinity;
  let disposed = false;
  let activeRoute = getCurrentPath();

  const maxScroll = (): number => Math.max(0, html.scrollHeight - window.innerHeight);
  const topOf = (node: HTMLElement): number => node.getBoundingClientRect().top + window.scrollY;
  function clearMotion(): void {
    if (frame !== null) window.cancelAnimationFrame(frame.frame);
    frame = null;
    html.classList.remove('smd-r7-wheel-spring-active');
    html.removeAttribute('data-r7-spring-direction');
  }
  function cancel(): void {
    clearMotion();
    used = false;
    total = 0;
    lastWheelAt = -Infinity;
  }
  function currentRoot(): HTMLElement | null {
    const path = getCurrentPath();
    if (!['/', '/about', '/curriculum', '/archive', '/reviews', '/faq', '/contact'].includes(path))
      return null;
    const root = document.querySelector<HTMLElement>(PAGE_SELECTOR);
    if (!root || !root.isConnected) return null;
    if (path === '/' && !root.classList.contains('smd-r7-home')) return null;
    if (path !== '/' && root.dataset.r7RouteOwner !== path.slice(1)) return null;
    return root;
  }
  function chooseAdjacent(root: HTMLElement, direction: number): number | null {
    const children = Array.from(root.children).filter((el): el is HTMLElement =>
      el instanceof HTMLElement && isViewportSheet(el, window.innerHeight));
    if (children.length === 0) return null;
    const from = children.reduce((best, child) =>
      Math.abs(topOf(child) - window.scrollY) < Math.abs(topOf(best) - window.scrollY) ? child : best);
    // Outside the neighbourhood of an exact page boundary, native scrolling owns the page.
    if (frame === null && Math.abs(topOf(from) - window.scrollY) > window.innerHeight * .32)
      return null;
    const next = direction > 0 ? from.nextElementSibling : from.previousElementSibling;
    if (!isViewportSheet(next, window.innerHeight)) return null;
    const target = CLAMP(topOf(next), 0, maxScroll());
    return Math.abs(target - window.scrollY) >= 1 ? target : null;
  }
  function move(target: number, direction: number): void {
    clearMotion();
    const state: SpringFrame = {
      frame: 0,
      started: performance.now(),
      direction,
      from: window.scrollY,
      to: target,
    };
    frame = state;
    html.classList.add('smd-r7-wheel-spring-active');
    html.setAttribute('data-r7-spring-direction', String(direction));
    const paint = (now: number): void => {
      if (disposed || frame !== state || !screen.matches || !currentRoot() || getCurrentPath() !== activeRoute) {
        cancel();
        return;
      }
      const elapsed = Math.max(0, now - state.started);
      const progress = catalogueSpringProgress(elapsed);
      window.scrollTo({top: CLAMP(state.from + (state.to - state.from) * progress, 0, maxScroll()), behavior: 'auto'});
      if (elapsed >= CATALOGUE_SPRING_DURATION_MS) {
        window.scrollTo({top: CLAMP(state.to, 0, maxScroll()), behavior: 'auto'});
        clearMotion();
        return;
      }
      state.frame = window.requestAnimationFrame(paint);
    };
    state.frame = window.requestAnimationFrame(paint);
  }
  function onWheel(event: WheelEvent): void {
    if (disposed || !screen.matches || event.defaultPrevented || event.ctrlKey || event.metaKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (getCurrentPath() !== activeRoute) {
      activeRoute = getCurrentPath();
      cancel();
    }
    const owner = currentRoot();
    const target = event.target;
    if (!owner || !(target instanceof Element)) return;
    // Chat/help overlays and unrelated widgets do not belong to this scroll owner.
    if (!owner.contains(target) && !target.closest('.smd-site-header')) return;
    if (target.closest(WHEEL_NATIVE_SELECTOR) || hasNestedNativeScroll(target, owner) ||
        document.querySelector('[aria-modal="true"], dialog[open]')) return;

    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = event.deltaY * scale;
    if (!Number.isFinite(delta) || Math.abs(delta) < .01) return;
    const now = performance.now();
    if (now - lastWheelAt > CATALOGUE_WHEEL_IDLE_MS) { total = 0; used = false; }
    lastWheelAt = now;
    if (used) {
      // The remaining wheel ticks of this gesture must not scroll the document mid-animation.
      event.preventDefault();
      return;
    }
    const direction = Math.sign(delta);
    const adjacent = chooseAdjacent(owner, direction);
    if (adjacent === null) return; // Flow sheet, end of page or missing geometry: native wheel.
    event.preventDefault();
    if (Math.sign(total) !== direction) total = 0;
    total += delta;
    if (Math.abs(total) < CATALOGUE_WHEEL_THRESHOLD_PX) return;
    used = true;
    if (frame !== null && frame.direction === direction) return;
    move(adjacent, direction);
  }
  const onEnvironment = (): void => { cancel(); activeRoute = getCurrentPath(); };
  const onKey = (event: KeyboardEvent): void => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancel();
  };
  window.addEventListener('wheel', onWheel, {passive: false});
  window.addEventListener('resize', onEnvironment, {passive: true});
  window.addEventListener('pointerdown', cancel, {passive: true});
  window.addEventListener('touchstart', cancel, {passive: true});
  window.addEventListener('pagehide', cancel);
  document.addEventListener('keydown', onKey);
  screen.addEventListener('change', onEnvironment);
  return {
    cancel,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      cancel();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onEnvironment);
      window.removeEventListener('pointerdown', cancel);
      window.removeEventListener('touchstart', cancel);
      window.removeEventListener('pagehide', cancel);
      document.removeEventListener('keydown', onKey);
      screen.removeEventListener('change', onEnvironment);
    },
  };
}
