# SMD_HOME_INTRO_LAYOUT_REPAIR_R1 · CODE BAKE EVIDENCE

- **Parent:** `FILM_R13_NONLINEAR_WIND_R1_full_baked_unverified.zip` SHA256 `c284a2b19728eaf80822c33637e73df2e9a924624ff399a3d71abd7257edd5ba`
- **Source change:** 기존 파일 6개 수정, 테스트 1개 신규, 부모 기존 969/975개 바이트 동일
- **Unchanged:** Figma generated scene, Intro timeline constants, WIND speed/LUT, photo assets, Header/Footer/CMS, Body layout
- **Meaning change:** Desktop Intro is `compact-reveal` with zero-height initial Info host; no viewport-scroll distance admission, original viewport-scroll path retained as historical but not product selected.
- **Initial SSR:** desktop media CSS hides bar and all four icon/text channels before mount.
- **First intent:** Wheel/keyboard one-shot, in-page expansion without `scrollTo`; native page scrolling after completion.
- **Geometry:** info SVG actual rendered height measured, not a hardcoded pixel height.
- **White band:** actual product Nuxt paint owner UNKNOWN until DOM/paint boundary script is run; no negative margin or Figma reflow.

## Verification tier

- SOURCE: BAKED
- STATIC: Intro tests 15/15 PASS, source gate 4/4 PASS, Hero Wind suite 78/78 PASS
- ISOLATED TYPESCRIPT: strict TypeScript validation of composable and HomeIntroStage script PASS (local Vue declaration stubs)
- ISOLATED CHROMIUM: 12/12 PASS using the actual transpliled composable + source CSS, including before-mount paint, wheel, keyboard, responsive widths, dpr, scroll release, reduced motion
- NUXT TYPECHECK / BUILD: NOT RUN (Nuxt dependencies not present in this environment)
- NUXT ACTUAL BROWSER: NOT RUN
- HARDWARE / PERFORMANCE: UNKNOWN
- Full ZIP re-extracted into an independent directory: 78/78 Hero + 15/15 Intro + 4/4 source gate PASS, 976 ZIP entries byte-matched 0 mismatches
- Windows PowerShell apply helper: NOT RUN (PowerShell unavailable here), SHA admission manifest statically verified
- Product promotion: FALSE

Note: isolated Chromium transpiles the actual composable but uses a stubbed Vue lifecycle/reactivity and a synthetic Figma DOM; this is not evidence for Nuxt hydration or actual product pixel parity.
