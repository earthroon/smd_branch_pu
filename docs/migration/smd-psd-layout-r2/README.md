# SMD-PSD-LAYOUT-R2

Parent: complete SMD-ABOUT-R1 and SMD-CURRICULUM-R1 overlays on SMD_PU.
Curriculum R1 archive SHA-256: 436763772ad3bc7f961465984fade81b020a01ed1f365f6ab943994d23534c29.

## Display change

The R1 pages borrowed the homepage's 75% compaction and enabled source-coordinate
layout from 1380px. At 1440px this displayed a 1920px source at 1080px, reducing
the Curriculum hero's original 17px paragraph to 9.5625px. R2 gives each PSD page
its own source-width authority and delays source-coordinate layout until the
source artboard fits. Shared paint/font tokens and the Header remain shared.

| Viewport / input | About and Curriculum body |
| --- | --- |
| <=699px | Existing mobile semantic reflow |
| 700..1099px | Existing tablet semantic reflow |
| 1100..1919px | Existing desktop semantic reflow |
| >=1920px, hover:hover and pointer:fine | 100% width, 1920px cap; source text/frames at 1:1 |
| >=1920px with coarse pointer or no hover | Existing semantic reflow |

The 1919/1920 transition intentionally changes layout mode. Semantic typography
and source-authored typography are distinct; R2 does not claim a continuous
interpolation across that boundary. Narrower-screen source-geometry helper
results are calculations, not a claim that the semantic DOM uses those widths.

## Preserved owners

Home compaction, Header geometry/navigation, default layout, shared color/font
tokens, original PSD manifests/text/shapes, asset bytes and media transforms,
CMS publication/currentness, URLs, slots and missing-detail states are unchanged.
No dependencies, lockfile, Worker configuration or backend routes change.

## Apply and verify

Download SMD-PSD-LAYOUT-R2_overlay.zip and SMD-PSD-LAYOUT-R2_APPLY.ps1 to Downloads.
Apply after both R1 overlays; the existing verified Node overlay engine checks
file hashes before mutation, preserves raw backups and refuses unknown edits.

```powershell
$ProjectRoot = 'D:\1111113232\TE-PU\smd-public (1)\smd-public'
Set-Location -LiteralPath $ProjectRoot
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$env:USERPROFILE\Downloads\SMD-PSD-LAYOUT-R2_APPLY.ps1" `
  -ProjectRoot $ProjectRoot `
  -ArchivePath "$env:USERPROFILE\Downloads\SMD-PSD-LAYOUT-R2_overlay.zip"
if ($LASTEXITCODE -ne 0) { throw 'PSD_LAYOUT_R2_APPLY_FAILED' }
foreach ($CheckName in @('test:about','test:curriculum','typecheck','build')) {
  npm.cmd run $CheckName
  if ($LASTEXITCODE -ne 0) { throw "FAILED: $CheckName" }
}
$env:SMD_DEV_FIXTURE_ONLY = '1'
npm.cmd run dev
```

Review /about and /curriculum at 1379, 1380, 1440, 1919, 1920 and 2560 CSS px.
Production retains SMD_CORE/PublicSurface. The development fixture does not
establish production publication or live deployment. Actual executed results
and unobserved scopes belong to SMD-PSD-LAYOUT-R2_VERIFY_RECEIPT.json.
