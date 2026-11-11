# SMD-HOME-R2 CF1 / CF2 Windows verification

This bundle is source-baked, not deployed. CF3 responsive/visual, CF4 navigation/reviews/faq routes, CF5 R2/CMS publication and CF6 deployment are not part of this bundle.

1. Extract the full source ZIP to a new directory (or merge the overlay into a clean copy of the parent). Do not overwrite a live production directory without taking a separate backup.
2. Use the existing project Node/npm toolchain. Check that its Node version meets the **actual installed** Nuxt dependency's `engines` requirements. The attached parent lockfile may resolve newer Nuxt packages than the original project's minimum version.
3. Run from the `smd-public` project root:

```powershell
$ErrorActionPreference = 'Stop'

node scripts/home-r2-cf1-source-static.mjs
if ($LASTEXITCODE -ne 0) { throw 'CF1_STATIC_FAILED' }

node scripts/home-r2-cf2-composition-static.mjs
if ($LASTEXITCODE -ne 0) { throw 'CF2_STATIC_FAILED' }

node --experimental-strip-types --test scripts/tests/home-r2-cf1-source.test.mjs scripts/tests/home-r2-cf2-composition.test.mjs scripts/tests/home-hero-facts-public.test.mjs scripts/tests/home-cta-slot.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'CF1_CF2_MODEL_FAILED' }

npm ci
if ($LASTEXITCODE -ne 0) { throw 'DEPENDENCIES_UNAVAILABLE' }

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'TYPECHECK_FAILED' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'BUILD_FAILED' }
```

4. Test SSR and hydration using the existing PublicSurface dev/staging fixtures. The root `/api/render` request must remain authoritative. Do not mock success in production.
5. If `pageSlots.home` contains nonempty nodes or unknown slot names, the new Home must reject `SMD_HOME_R2_LEGACY_SLOT_CONFLICT` / `_INVALID`, not render a silently partial page.
6. Confirm the 9 body sections, Figma copy, 8 R2-unbound placeholder frames, no FAQ placeholder strings, and no duplicate Header/Footer. Compare CF3 design fidelity separately.
7. Do not deploy or promote this build as Figma-accurate based solely on CF1/CF2 tests.

Regenerating derived artifacts after **a deliberately authorized new Figma source revision** requires updating the explicit pinned input SHAs and identity policy in `scripts/lib/home-r2-source.mjs` in a separate revision. `--write` cannot rewrite an unrecognized source snapshot as canonical.

```powershell
node scripts/home-r2-cf1-freeze.mjs --verify
```

`--write` is for generated manifests only, not Figma source transformation.
