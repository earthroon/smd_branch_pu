# SMD_HOME_INTRO_LAYOUT_REPAIR_R1 Windows 적용 및 검증

부모: `FILM_R13_NONLINEAR_WIND_R1_full_baked_unverified.zip`. 모든 수정 파일은 기존 SHA가 일치할 때만 적용됩니다. 사용자가 변경한 파일을 조용히 덮어쓰지 않습니다.

```powershell
$ErrorActionPreference = 'Stop'
$root = 'D:\1111113232\TE-PU\smd-public (1)\smd-public'
$delivery = Join-Path $env:USERPROFILE 'Downloads\SMD_HOME_INTRO_LAYOUT_REPAIR_R1_overlay.zip'
$patchDir = Join-Path $env:TEMP 'SMD_HOME_INTRO_LAYOUT_REPAIR_R1'
Expand-Archive -LiteralPath $delivery -DestinationPath $patchDir -Force

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $patchDir 'SMD_HOME_INTRO_LAYOUT_REPAIR_R1_APPLY.ps1') `
  -ProjectRoot $root -PatchRoot $patchDir -VerifyOnly
if ($LASTEXITCODE -ne 0) { throw 'PREFLIGHT_FAILED' }

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $patchDir 'SMD_HOME_INTRO_LAYOUT_REPAIR_R1_APPLY.ps1') `
  -ProjectRoot $root -PatchRoot $patchDir -Apply
if ($LASTEXITCODE -ne 0) { throw 'APPLY_FAILED' }

Set-Location -LiteralPath $root
npm run test:hero-film
if ($LASTEXITCODE -ne 0) { throw 'HERO_TEST_FAILED' }
node --experimental-strip-types --test scripts/tests/home-intro-scroll.test.mjs scripts/tests/home-intro-compact-reveal.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'INTRO_TEST_FAILED' }
node --experimental-strip-types scripts/tests/home-intro-source-gate.mjs
if ($LASTEXITCODE -ne 0) { throw 'SOURCE_GATE_FAILED' }
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'NUXT_TYPECHECK_FAILED' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'NUXT_BUILD_FAILED' }
```

실제 Nuxt를 켠 후 별도 터미널에서 실행합니다.

```powershell
npm run dev -- --host 127.0.0.1 --port 3129
```

```powershell
node scripts/figma-r2/verify-home-intro-browser.mjs --url http://127.0.0.1:3129/ --out artifacts/intro-r1-browser.json
```

필수: 실제 렌더 `data-intro-route=compact-reveal`, 초기 info 높이=0·opacity=0, 첫 휠 후 Reveal 1회, 8개 icon/text opacity=1, 완료 후 native scroll. `boundary`의 info→body 공백을 보고 흰 띠 페인트 Owner를 별도로 분류합니다. 

**주의:** 본 전달 ZIP에 포함된 과거 `.nuxt`/`.output`은 Wind R1 이전 실행 산출물입니다. 새로 빌드해야 합니다. Node 22.18.0에서는 설치된 Nuxt 버전이 요구하는 Node >=22.21.0으로 업그레이드해야 할 수 있습니다.
