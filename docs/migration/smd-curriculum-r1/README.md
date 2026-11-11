# SMD-CURRICULUM-R1

Parent: SMD_PU d9e3568089e20bbe4dc8893337f483e2539effd9 with the complete SMD-ABOUT-R1 overlay.
Parent About archive SHA-256: 65155363c3c96a95da806867c688907fe4d415da254f2e8c70fe3f2fd7defebd.

Source: 261028_smd_교육과정페이지.psd, SHA-256
42da24276ea7c449f886164c439854f84bfadff679f896fc55abad4cc531c012.
Observed PSD: 1920×6958, 8-bit sRGB, 145 ungrouped layers; 103 text layers,
95 body text layers, five original PNG photos and one embedded PDF-derived arrow.

## Owners

- default.vue still renders the existing SiteHeader and SiteFooter exactly once.
- main.css owns the existing action-orange and the four shared PSD surfaces.
  About's existing --about-* names are aliases; its raw source manifests remain unchanged.
- Header geometry, brand, menus and breakpoints remain in their existing owner.
- Curriculum uses the existing font and line-height roles. Wide authored text metrics
  remain measured PSD geometry; semantic reflow uses the shared role defaults.
- PSD Layout R2 replaces the R1 homepage-scale dependency: this page owns a 1920px
  source artboard displayed at 1:1 for fine-pointer/hover viewports >=1920px.
  Below 1920px and for coarse pointers, the existing semantic reflow remains active.
  Header stays outside it and retains its existing geometry and token owners.
- Original photos retain their bytes, affine transforms, clip frames and radii.
- source-manifest.json keeps original IDs, order, strings, paint and source identity.
  The proposed Virtual Tree is a separate approved application mapping, not a Photoshop parent tree.
- The PSD FOOTER placeholder and PSD Header are not new product components.

## Explicit display and content changes

1. Source layer 19 remains `20년 경력`; its displayed duration is `6주 과정`.
2. AM/PM source #D95E23 displays through existing --smd-action-orange (#D95E22).
3. `/curriculum` now displays the PSD's 42 hours, 09:00–17:00 and up to six students.
   Legacy seed/fixture contains 48 hours, 09–18 and five students. Other pages,
   source copy contracts, historical publications and form options are not rewritten.
4. Week 01 has supplied details. Weeks 02–06 retain their summaries and have disabled
   detailed tabs with an explicit availability note. Detailed content is not fabricated.
5. The Week 01 right-hand surface is intentionally unassigned, not an image load failure.
6. afterTeach follows practical training; afterLearningPath follows the six-week program;
   beforeCta precedes the final consultation CTA. Original slot names and nodes are retained.

## Operational boundary

The body is PSD_BUILD_SOURCE_V1, not a new CMS body projection.
app.vue's existing `/api/render` response supplies the selected legacy curriculum page,
shared publication identity, validated Kakao URL and three existing CMS slots.
No per-component fetch, new Core producer, altered V5 media schema or production fixture fallback.
Invalid/missing consultation URLs display an unavailable action without a replacement URL.
Current production Publication consistency must be checked separately before a release claim.

## Windows application

Keep SMD-CURRICULUM-R1_overlay.zip and SMD-CURRICULUM-R1_APPLY.ps1 in the same directory.
The installer checks the archive and every pending destination before the first write,
preserves original bytes in artifacts/curriculum-r1-*, accepts CRLF text, and is idempotent.
Unknown local changes stop application; do not force overwrite them.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$env:USERPROFILE\Downloads\SMD-CURRICULUM-R1_APPLY.ps1" `
  -ProjectRoot 'C:\SMD_pu\SMD_NUXT_R3_S1_S2_PUBLIC_FULL_BAKED_UNVERIFIED\smd-public' `
  -ArchivePath "$env:USERPROFILE\Downloads\SMD-CURRICULUM-R1_overlay.zip"

npm.cmd run test:curriculum
if ($LASTEXITCODE -ne 0) { throw 'CURRICULUM_TEST_FAILED' }
npm.cmd run test:about
if ($LASTEXITCODE -ne 0) { throw 'ABOUT_REGRESSION_FAILED' }
npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) { throw 'TYPECHECK_FAILED' }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'BUILD_FAILED' }
```

For a local visual preview without Core, explicitly select the existing development fixture:

```powershell
$env:SMD_DEV_FIXTURE_ONLY = '1'
npm.cmd run dev
```

Open the printed local origin's `/curriculum`. The flag is development-only and is not
production publication evidence. Production continues to require SMD_CORE/PublicSurface.
This bake performs no Git commit/push, publication write or Cloudflare deployment.

## Reproduction and verification

The delivered static source, images and build need no Python dependency.
For source regeneration only, use psd-tools with the TypeSetting API, Pillow and PyMuPDF:

```text
python scripts/curriculum-r1/extract-source.py --source <original-PSD-path>
```

The source verifier checks a pinned source-manifest hash, generated data parity,
every original photo digest/dimension, the derived arrow and one owner per shared token.
Tests cover independent PSD-corner/CSS-affine parity, invalid geometry, route/publication
currentness, invalid URLs, corruption, overlay refusals, backup bytes and reapplication.
Actual executed checks and unobserved scopes are recorded in the supplied verification receipt.
