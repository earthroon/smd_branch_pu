# Existing hero binding: CF4–CF6

No page or route was added. Parent: SMD_ACA_PU_CF1_CF3.zip. Only the existing top hero owns the film; source text, white background, body layout and CMS disconnect mode are retained.

## Implemented
- Build-time monotone cubic position samples + logarithmic rate table. This is a deterministic easing LUT, not a claim of fidelity to an unspecified nonlinear physical model. Runtime ODE/JS frame loop: none.
- Desktop horizontal wheel/Shift-wheel and arrow keys request bounded WAAPI travel. Native scroll stores committed position; inner rail supplies transient transform. Cancellation samples current transform before settling scroll. Vertical wheel stays owned by the existing intro; both consumers share horizontal classification.
- Mobile native swipe, pointer distance/time/scroll-based tap classification. Tap Commit precedes GPU readiness. Reduced motion retains static selection. Mouse dwell preview is 240ms (candidate UX constant).
- Focus chunks are full-image PNG chunks (UV 0,0,1,1), content-addressed and byte-identical to source. No selective high-resolution crop or zoom is claimed. Worker initialization and chunk fetching begin only after admitted focus intent; current generation only, abort on cancellation, late bitmap disposal, one texture, one render submission per current focus.
- Dedicated Worker/OffscreenCanvas WebGPU draws the selected image into a same-coordinate overlay. CSS outline is the immediate selection indication and fallback. Touch opacity Bezier runs without zoom. Shader effect is identity sampling, not a new spatial focusing filter.
- GPU failure disables subsequent GPU attempts for this mount and exposes data-focus-reason, preserving logical selection. No implicit repeated transfers of the same OffscreenCanvas.
- Resize, page hiding, scrolling and unmount cancel visual work; committed selection ID remains except explicit release/new navigation input. No autoplay.

## Verification
Typecheck and production build logs included. 18 focused tests pass (including mock Worker late-decode cancellation and single-submit tests). Mock GPU tests are NOT actual WebGPU execution.
The prior environment had no Chromium and download failed; browser/runtime/physical/GPU/device-loss tests are NOT completed. CF6 is therefore PARTIAL, not runtime-qualified. The browser script includes viewport, CMS request, placement, keyboard move/commit/release and reload checks for execution on a browser-equipped machine.
Existing legacy CF03 baseline failures are retained from the parent; this is not a clean all-tests claim.

```sh
npm ci
npm run typecheck
npm run build
node --experimental-strip-types --test scripts/tests/hero-film-cf1-cf3.test.mjs scripts/tests/hero-film-cf4-cf6.test.mjs scripts/tests/r3-public-boundary.test.mjs
npm run dev
# In a separate terminal, with Playwright and Chromium installed:
node scripts/verify-hero-film-browser.mjs
```

## Remaining qualification
Actual C0 interruption residual, rate-transition C1 behavior, horizontal wheel/vertical intro overlap, touch gestures, 1099/1100 switch, actual DPR, shader compilation, GPU loss, network intent timing, accessibility and white-text readability require browser/device validation. Desktop pointer drag is not implemented; desktop navigation is horizontal wheel or arrow keys. No Cloudflare deployment performed.
