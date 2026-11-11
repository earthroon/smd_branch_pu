# SMD-HOME-R2 CF1/CF2 code bake evidence

**SOURCE BAKED / STATIC PASS / TS SUBSET COMPILE PASS / FULL NUXT UNVERIFIED / NO DEPLOY**

## Scope

- **CF1:** Freeze byte-identical Figma JSONL, reference/session JSON and 31 SVG originals under `docs/migration/smd-home-r2/cf1/figma-source/`; verify pinned input SHA; generate source/section/text/media/render-blocker manifests; freeze No-Touch parent source digests.
- **CF2:** Map 9 Home body sections to existing Nuxt 4 layout; generate all 76 Native Text strings with IDs; explicitly select 60 displayed/pending references; provide 8 unbound media frames with verified Figma fill/radii; fail-closed legacy CMS slot guard; replace old Home-only content while preserving old category pages.
- Parent shared `SiteHeader`, `SiteFooter`, routes, PublicSurface, R2, D1 and all 21 No-Touch paths remain unchanged.
- Hero background/vector, Clip/Mask rendering, pixel parity and advanced responsive design belong to **CF3**. Header navigation and `/reviews`, `/faq` belong to **CF4**. Actual R2 media/publication and CMS FAQ data belong to **CF5**.

## Verification evidence

| Evidence | Result |
|---|---|
| Figma JSONL/Reference/Session pinned SHA | PASS |
| 31 SVG SHA checks | PASS |
| 272 source nodes / 76 Native Text / 11 sections | PASS |
| Derived manifest exact regeneration and source freeze | PASS |
| Eight non-overlapping, unbound Home media slots | PASS |
| Known render blocked 2 direct + 30 ancestor preserved | PASS |
| 21 No-Touch parent source files SHA | PASS |
| CF1 + CF2 dedicated and legacy compatibility model tests | 12/12 PASS |
| SFC `<script setup lang="ts">` syntax | 11/11 PASS |
| Standalone generated TypeScript / source guard `tsc --strict --noEmit` | PASS |
| Full Nuxt typecheck/build | NOT RUN (dependencies unavailable offline; engine warnings) |
| Browser SSR/Hydration | NOT RUN |
| Physical Figma pixel/Chrome parity | NOT RUN |
| Cloudflare deployment | NOT PERFORMED |

**Limits:** The 12 model tests and TypeScript subset do not prove `.vue` SFC full compile, SSR render or actual parity. The existing `nuxt`/`npm` engine mismatch is a parent lockfile/toolchain constraint, not a proven source failure. Do not advance evidence tiers without running the Windows checks.

## Explicit semantic changes

1. New Home sections consume **Figma copy** instead of `pages.home.*` from CMS. The historical CMS data and existing routes remain unchanged.
2. Hero/Statement images do not fetch R2 or Legacy GitHub images in CF2. Empty Figma photo frames are shown instead.
3. Old Home-only Practice/ArchivePreview sections are removed from the `index.vue` composition, while their original category pages and Vue components remain.
4. `pageSlots.home` with non-empty/unknown legacy inserts yields a typed failure. Nothing is silently discarded.
5. FAQ `=====================` is stored losslessly in CF1 but never shown as real copy or an inactive accordion button in CF2.

## Integration verification

See `docs/migration/smd-home-r2/VERIFY_WINDOWS.md` for exact commands. The CF1 code-freeze entrypoint is `node scripts/home-r2-cf1-freeze.mjs --verify`. `--write` explicitly regenerates derived artifacts only and cannot change unpinned input source.

## File changes

6 modified; 63 added; 143 existing source files preserved byte-identically. Full details in `SMD-HOME-R2-CF1-CF2_SOURCE_DIFF.txt`.
