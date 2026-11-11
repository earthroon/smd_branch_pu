# Hero film infinite R1 — current behavior

Supersedes the earlier CF1–CF6 no-autoplay, 2/3 equal slot and DPR-clamped sizing contracts for this hero only, following the latest user directions.

- Existing homepage only. New page/route: none.
- Order: 1(1).jpg → 2.jpg → 3.jpg. Uploaded JPEG bytes and names preserved.
- Image height equals existing hero grid height. Width follows original aspect ratio exactly (height:100%; width:auto). No cover, source crop, stretching or per-column fitting. Visible count follows viewport geometry, not enforced 2/3 equal-width slots. DPR no-upscale ceiling is removed because it conflicted with the explicit Y-fill requirement.
- Gap zero. Repeated visual groups; period is measured from first item to next group's first item with fractional DOM geometry. WAAPI linear infinite transform, 35 CSS px/s. No per-frame JavaScript loop.
- Pause control, selected-image pause, Escape/release resume, hidden-page pause and reduced-motion stop. Source text remains unchanged.
- Full-image focus chunks now use the new JPEG bytes; no eager focus-chunk requests.
- Browser verification script updated for aspect ratio, Y fill, zero gaps, actual idle movement and pause. Browser/physical seam/GPU validation NOT RUN on this host (previous Chromium install unavailable). Static/model tests and compilation do not prove visual seam quality.

Run npm ci; npm run typecheck; npm run build; npm run dev.
On a browser-equipped machine: node scripts/verify-hero-film-browser.mjs.
No deployment or GitHub push performed.
