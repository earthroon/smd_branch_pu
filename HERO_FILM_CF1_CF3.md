# Hero film CF1–CF3

Existing `/` layout binding only; no new page or route. No CF4 rolling timeline, autoplay, GPU focus or LUT is implemented in this delivery.

## Changes
- Explicit `runtimeConfig.public.contentMode`: standalone by default. CMS mode retains the original render envelope/identity validation. No automatic fallback and no fabricated publication.
- Home renders its existing scene/semantic layout without CMS. Other CMS-dependent routes display a connection-pending state; privacy retains its static path. Footer contacts are unavailable rather than fabricated. Original CMS schema/server adapters remain.
- Default wrangler config has ASSETS and no SMD_CORE. `wrangler.cms.toml` retains PublicSurface and sets mode=cms. Neither configuration was deployed. Original worker name `smd-web` is retained; verify deployment target before using it (user screenshot was smd-aca-pu).
- Only top hero receives HomeHeroFilm. Frozen generated scene/text bytes untouched. Only hero background asset node-1:5 is suppressed in presentation. Hero CSS white; other sections unchanged.
- Three original PNGs copied byte-for-byte with filenames preserved. No image editing, recompression or invented content.
- Two slots below 2400 CSS container px; three at/above 2400; below 700 one 85%-width slot plus peek. 2400 is a local film breakpoint, not an existing global token.
- contain sizing + actual DPR pixel ceiling. Existing hero outer geometry/sticky and intro timing preserved. White text is unchanged; contrast over white gaps is NOT visually qualified.
- CF3 provides native horizontal overflow only; no new wheel handler or intro ownership changes. The existing intro may consume desktop wheel during its reveal. CF4 input arbitration remains pending.

## Run
```sh
npm ci
npm run typecheck
npm run build
npm run test:source
node --experimental-strip-types --test scripts/tests/home-layout-r1.test.mjs scripts/tests/hero-film-cf1-cf3.test.mjs
npm run dev
```
Browser qualification (Playwright + installed Chromium required):
```sh
node scripts/verify-hero-film-browser.mjs
```
CMS reconnection: set NUXT_PUBLIC_CONTENT_MODE=cms for development/build as appropriate, restore an actual SMD_CORE PublicSurface binding using wrangler.cms.toml, and validate genuine publication responses. No local contact data is substituted.

## Evidence
Typecheck/build and targeted tests are recorded under artifacts/hero-film-cf1-cf3. Browser verification did not run successfully: this host reported uv_interface_addresses errors; Chromium was absent and browser download failed. A temporary host-only network-interface shim was attempted and is not part of delivered product source.

Old scripts/tests/cf03-interaction.test.mjs: 15 failures reproduced on the unmodified uploaded baseline (14 pass / 15 fail); same failures after this change. These historical tests were not rewritten to claim a clean full suite.

No physical display, browser layout, hydration, Cloudflare deployment or performance PASS is claimed.
