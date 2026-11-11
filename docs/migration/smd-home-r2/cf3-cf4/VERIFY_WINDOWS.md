# Windows 로컬 검증 · CF3/CF4

기존 CF1/CF2 코드베이크의 소스 전체본에 CF3/CF4 Overlay를 병합하거나 CF3/CF4 전체 ZIP을 새 폴더에 풀어 검사한다. 정상 ZIP의 최상위 폴더는 `smd-public`이다. 기존 운영 디렉터리의 `.env`와 secret 파일을 덮어쓰지 않는다.

```powershell
Set-Location 'C:\YOUR_PROJECT\smd-public'

node scripts/home-r2-cf1-source-static.mjs
if ($LASTEXITCODE -ne 0) { throw 'CF1_SOURCE_FAILED' }
node scripts/home-r2-cf2-composition-static.mjs
if ($LASTEXITCODE -ne 0) { throw 'CF2_COMPOSITION_FAILED' }
node scripts/home-r2-cf3-visual-freeze.mjs --verify
if ($LASTEXITCODE -ne 0) { throw 'CF3_VISUAL_SOURCE_FAILED' }
node scripts/home-r2-cf3-static.mjs
if ($LASTEXITCODE -ne 0) { throw 'CF3_STATIC_FAILED' }
node --experimental-strip-types scripts/home-r2-cf4-static.mjs
if ($LASTEXITCODE -ne 0) { throw 'CF4_STATIC_FAILED' }

node --experimental-strip-types --test `
  scripts/tests/home-r2-cf1-source.test.mjs `
  scripts/tests/home-r2-cf2-composition.test.mjs `
  scripts/tests/home-r2-cf3-visual.test.mjs `
  scripts/tests/home-r2-cf4-scaffold.test.mjs `
  scripts/tests/home-hero-facts-public.test.mjs `
  scripts/tests/home-cta-slot.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'CF1_CF4_MODEL_FAILED' }
```

완전한 Nuxt 의존성을 정상적으로 확보한 Windows 빌드 환경에서는 **아래 검증을 추가로 수행**한다.

```powershell
npm ci
if ($LASTEXITCODE -ne 0) { throw 'NPM_CI_FAILED' }
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'NUXT_TYPECHECK_FAILED' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'NUXT_BUILD_FAILED' }
```

빌드가 통과하더라도 직접 실행 확인이 필요하다. 360/390/430/768/1024/1280/1440/1920/2560/3440/3840 폭에서 가로 스크롤, 카드와 Header 겹침, Pretendard 폰트, 빈 이미지 슬롯, Figma LINE을 확인한다. `/reviews`, `/faq` 직접 SSR/CSR 접근·새로고침·뒤로가기, 503 Source unavailable, noindex, 기존 카테고리 페이지 회귀를 확인한다.

CSS/Source Static 검사는 **브라우저 레이아웃 및 픽셀 패리티의 대체 증거가 아니다.** 두 Mask/Clip Source Witness는 미검증으로 남긴다. Cloudflare 운영 Publication은 명시적 배포 승인 전까지 변경하지 않는다.
