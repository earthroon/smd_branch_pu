# SMD Home R2 · V-R1~V-R6 Windows 실검증

## 증거 경계

이 복구 코드는 **Public 전용 로컬 후보**입니다. `SMD_FIGMA_SCENE_VR1`은 현재 메인에서 원본 JSONL Scene을 그리며, Desktop(>=1100px)과 반응형 리플로우(<1100px)를 서로 다른 출력 경로로 구분합니다. **CMS/Core/운영 D1/Cloudflare Worker를 변경하거나 배포하지 않습니다.**

- Figma 원본: 272 Nodes / 165 Paint Operations / 31 SVG 원본 / 68 SVG 인스턴스 / Native Text 76 / Run 89 / Clip 38.
- Figma 원본 `physicalParity=NOT_RUN`, `renderQualification=BLOCKED`, 차단 원인 2건(하위 30건). 위 상태를 PASS로 격상하지 않습니다.
- `SOURCE/STATIC PASS`는 Nuxt/SSR/브라우저/Pixel Parity 통과가 아닙니다.
- 8개 신규 R2 사진 슬롯은 미발행 상태에서 비워 둡니다. 원본 SVG는 빈 R2 사진 슬롯이 아닙니다.

## 준비: 소스 무결성, 컴파일

`C:\SMD_pu\SMD_NUXT_R3_S1_S2_PUBLIC_FULL_BAKED_UNVERIFIED\smd-public` 경로에서:

```powershell
Set-Location 'C:\SMD_pu\SMD_NUXT_R3_S1_S2_PUBLIC_FULL_BAKED_UNVERIFIED\smd-public'
node scripts/figma-r2/build-render-scene.mjs --verify
node scripts/figma-r2/verify-scene.mjs
if ($LASTEXITCODE -ne 0) { throw 'SOURCE_STATIC_FAILED' }

npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'NPM_CI_FAILED' }
npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) { throw 'NUXT_TYPECHECK_FAILED' }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'NUXT_BUILD_FAILED' }
```

위 명령이 실패하면 운영 배포 금지. 출력을 보존해 원인 분석.

## 브라우저에서 11개 화면 폭을 한 번에 측정

**PowerShell 창 A:** Public 개발 서버. Cloudflare Public Render 바인딩이 없으면 CMS 데이터를 필요로 하는 페이지가 오류 상태일 수 있습니다. 이 경우 스크린샷 실패를 가짜 PASS로 바꾸지 말고 Runtime 환경을 먼저 구성합니다.

```powershell
Set-Location 'C:\SMD_pu\SMD_NUXT_R3_S1_S2_PUBLIC_FULL_BAKED_UNVERIFIED\smd-public'
npm.cmd run dev -- --host 127.0.0.1 --port 3000
```

**PowerShell 창 B:** Chrome 또는 Edge가 설치되어 있어야 합니다.

```powershell
Set-Location 'C:\SMD_pu\SMD_NUXT_R3_S1_S2_PUBLIC_FULL_BAKED_UNVERIFIED\smd-public'
node scripts/figma-r2/verify-browser.mjs --url http://127.0.0.1:3000/
if ($LASTEXITCODE -ne 0) { throw 'BROWSER_VISUAL_METRICS_FAILED' }
```

검증기는 360,390,430,768,1024,1280,1440,1920,2560,3440,3840px **전체 스크롤 페이지** 스크린샷 및 `browser-receipt.json`을 `docs/migration/smd-home-r2/visual-restore/browser-local/`에 생성합니다. 대상 경로는 `--out C:\...`로 변경 가능합니다. `SMD_CHROME_PATH` 환경변수로 Chrome/Edge 실행 파일을 지정할 수 있습니다.

검증 내용: 원본 SVG 인스턴스 표시/HTTP 200+image/svg+xml, Pretendard 실제 로딩, FAQ 문자 `====` 노출 여부, 가로 넘침, 데스크톱 Scene 활성/태블릿·모바일 Reflow 활성, 상담 CTA 존재. 브라우저를 열고 실제 1920px 전체 캡처를 **Figma 원본 픽셀 캡처와 육안 및 픽셀 도구로 별도 대조**해야 합니다.

**주의:** Figma ZIP은 픽셀 Reference를 포함하지 않고, Clip Witness 누락 2건은 여전히 BLOCKED입니다. 모든 브라우저 검사를 통과해도 완전한 픽셀 패리티 승인 조건이 자동 충족되지는 않습니다.

## 완료 조건 / 승격 금지

- `node scripts/figma-r2/verify-scene.mjs` : Source SHA 31개와 Paint 165개, Text 76개, Run 89개, Legacy No-Touch 등 정적 검사 통과.
- Nuxt 전체 Typecheck·Build : 실제 Windows에서 실행하고 exit 0 확인.
- 브라우저 11개 폭: 폰트 실로딩 및 실 HTTP 자산 검사, 폰트/이미지/스크롤 지표 기록.
- 1920px Figma 픽셀 레퍼런스 및 원본 Mask Witness 확보·재현 전에는 `VISUAL_QUALIFIED` 금지.
- **`wrangler deploy`, `d1 migrations apply --remote`, `git push` 명령을 이 복구 키트에서 실행하지 않음.**
