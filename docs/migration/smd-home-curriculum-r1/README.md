# SMD-HOME-OPTICAL-R1 + SMD-CURRICULUM-WEEK-R1

**Base:** `SMD_ACA_PU-main(1).zip` (provided Public Nuxt tree)

**Scope:** Public repository files only. No Core/CMS repo, D1 migration, publication, or remote deployment included.

## Home CF1–CF3

- `homeInfoLayout.ts`: `node-1:395` (helmet) receives `iconOpticalY: 19` in section-local SVG units. Other icons and original Figma nodes keep their geometry.
- `homeInfoLayoutMath.ts`: the optical offset is bounded to +/-32. Text positions, icon scale and animation timing are unchanged.
- `home-info-compact.css`: fourth info value `node-18:59` uses intrinsic-width centering, scoped to the `info-bar` foreignObject; the original `234px` source rect is not modified.
- `scripts/tests/home-layout-r1.test.mjs`: geometry, isolated delta, invalid offsets and CSS scope.
- `scripts/figma-r2/verify-home-layout-browser.mjs`: additional observed ink centers. Browser thresholds `15px` helmet median and `7px` icon/value X are provisional. Actual browser qualification NOT RUN here.

## Curriculum CF1–CF5

- `CurriculumWeekProgram.vue`: all six weeks are interactive tabs with one selection, associated one tabpanel and Left/Right/Home/End keyboard navigation. Navigation selection is client-only, no per-click CMS fetch.
- `CurriculumSourceShapes.vue`: only shapes `72`, `73`, `74`, `75`, `76`, `388` no longer paint. Their original generated records remain byte-identical. Tabs are the single navy fill owner, including 1920px+ desktop source layout. Shapes `399` and `413` are preserved as panel backgrounds.
- `CurriculumSourceText.vue`: an explicit **string** `paintRole='week-title'` renders the tab title from the active/idle token; absent paintRole leaves *all unrelated Figma source text* untouched.
- `CurriculumWeekDetailPanel.vue`: `week-01` with unassigned data uses frozen PSD text 400–412; other unassigned weeks show an explicit unassigned state. `ready` weeks render bounded heading/body/items, optional approved image and CMS extensions. A single panel DOM owner switches by selected ID.
- `app/assets/css/main.css`: centralized source-matched tokens `--smd-curriculum-week-title-idle=#000000`, `--smd-curriculum-week-title-active=#FFFFFF`. Navy `#172C57`, orange `#D95E22`, panel `#F2F6FF` retain existing owners.
- `app/assets/css/curriculum-r1.css`: regular/mobile semantic grid plus source-aware 1920px+ coordinates; dynamic panel is kept inside the original panel footprint with scroll when needed, no silent content clipping, image preserve-aspect fit.
- `CURRICULUM_WEEK_PROGRAM_SCHEMA = SMD_CURRICULUM_WEEK_PROGRAM_V1`: Public candidate version. Strictly six IDs `week-01` ... `week-06` in source order. Per week: `navigation`, `slots.detail`, `slots.media`, `slots.extensions`.

### Future Public projection agreement (Core implementation NOT INCLUDED)

Field on the *admitted and same-publication* Public content:

```ts
curriculumWeekProgram?: {
  schema: 'SMD_CURRICULUM_WEEK_PROGRAM_V1';
  publicationId: string; // same as c.publication.id
  publicationDigest: string; // same as c.publication.digest
  weeks: readonly [Week01, Week02, Week03, Week04, Week05, Week06];
}
```

Each week has `{ id, navigation: {label, title}, slots: {detail, media, extensions} }`.
`detail` is either `{status:'unassigned'}` or `{status:'ready', eyebrow, heading, description, items}`.
`media` is `null` or `{assetId,alt,title,displayMode:'natural'|'contain'}`.
`extensions` uses the existing 0.7.0 `CmsRootNode` registry: `notice`, `card-grid`, `faq-group` only.

- Unknown/extra keys, missing/reordered weeks, wrong publication, unsafe text, excessive items or unsupported CMS blocks reject with an error; no silent old-content fallback on a **present but invalid** projection.
- For a `week-01` unassigned detail, the original 1st-week PSD copy remains visible. Its media/extensions must be empty until a `ready` replacement is committed, preventing a silently hidden CMS slot.
- Media requires the exact `curriculum.weeks.week-NN.media` binding **and** matching asset in the same V5-style `siteMedia` publication projection. Only then is `/api/media/image/{assetId}` formed. This does not grant Core publication authority.
- If no `curriculumWeekProgram` field is supplied (current 0.7.0 contract), the original week-01 PSD panel remains, and week-02~06 show an explicit unassigned state. The three existing page slots remain untouched.

### Core/CMS work required before full CF3/CF4 promotion

1. Add `SMD_CURRICULUM_WEEK_PROGRAM_V1` to the shared content contract and versioned PublicSurface response.
2. Add independent Core Draft validation and publication admission, exact six IDs and same-publication binding; stage/provenance needs to be in the same publication transaction.
3. Register and authorize new `curriculum.weeks.week-NN.media` slots. Existing 0.7.0 registry cannot publish them.
4. Provide a CMS week-editor UI that writes Draft CAS and allows explicit approval and publication. A Draft change must never update a live Public response directly.
5. Repeat Windows Nuxt browser interaction test and physical 1920px+ pixel tests after the actual CMS publication is available.

**Do not mark CF3 Core, CF4 CMS, V6 publication or Windows browser tests PASS from this Public-only overlay.**

## Verification

In a local checkout with dependencies installed:

```powershell
npm.cmd run verify:curriculum
npm.cmd run test:curriculum
node --experimental-strip-types --test scripts/tests/home-layout-r1.test.mjs
npm.cmd run typecheck
npm.cmd run build
```

After starting an admitted local Nuxt Public page:

```powershell
node scripts/figma-r2/verify-home-layout-browser.mjs --url http://127.0.0.1:3000/
node scripts/curriculum-r1/verify-week-program-browser.mjs --url http://127.0.0.1:3000/curriculum
```

The last two commands **need actual browser/SSR/CMS publication data**. They have not been run successfully in the bake environment; the static and model tests are not a substitute.
