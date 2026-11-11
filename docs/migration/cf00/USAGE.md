# SMD-NUXT-R2-CF00-CF01 verification

The immutable original input archives are **not** embedded in the migrated app. Keep them separately and pass their actual paths to each audit command.

```powershell
# Run at SMD_ACADEMY_NUXT_CLOUDFLARE project root.
node .\scripts\cf00-verify.mjs --original "C:\path\project-13890572(1).zip" --candidate "C:\path\SMD_ACADEMY_NUXT_CLOUDFLARE.zip"
node .\scripts\cf01-layout-static.mjs
node --test .\scripts\tests\cf00-cf01.test.mjs
npm run test:source
npm install
npm run typecheck
npm run build
```

`cf00-freeze.mjs` was executed for the baked manifest. It is intentionally **not** a force-update operation: preexisting manifest drift fails instead of silently re-baselining. Only regenerate from a newly admitted source in a separate contract revision.

## Source/presentation boundaries

- `docs/migration/cf00/*.json` is the original-source and R1-parent identity reference, not a snapshot of the new Nuxt output.
- `cf00-verify` checks the original inputs and rejects changes to R1 files that are outside the CF01 allowlist.
- `cf01-layout-static` checks selected structural invariants. A PASS is **not** a Nuxt compile, real browser screenshot, CSS-computed geometry, working Nuxt error state, or verified HTTP status.
- R1 dev content remains `DEV_FIXTURE_ONLY`. A public content API failure may not silently return its seed in production.
- `app/error.vue` must be checked against both unknown-path **404** and content-api **503/5xx**. It must also be checked that `NuxtLink` + `clearError` exits error state on navigation.
- CF01 deliberately removes the bot overlay **mount** from the public layout, preserving all bot source/API files for CF08.
- The original text mismatch at `promotionBenefits[0].desc` remains **unmodified** until CF04. Do not assert total-page visual/text parity from CF01.

## Manual browser gate, currently unobserved

Reference: original React and Nuxt candidate under the same browser build, viewport, fonts and real image availability. Observe 390×844, 768×1024, 1024×768, 1440×900 (proposed fixtures). Verify header at `scrollY=0,16,17`, mobile drawer open/close/route change, body overflow restoration, footer computed columns, PageHero, CTA, Reveal initial/visible transitions, direct/SPA 404, 5xx content failure, admin layout isolation. Record screenshots/landmarks with actual hashes and keep `PHYSICAL=UNKNOWN` until this is performed. No arbitrary visual diff tolerance is approved in CF00/CF01.
