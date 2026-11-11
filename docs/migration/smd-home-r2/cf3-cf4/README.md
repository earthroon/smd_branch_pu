# SMD-HOME-R2-CF3-CF4 · 코드 베이크 증거 및 범위

**부모:** `SMD-HOME-R2-CF1-CF2_full_baked_unverified.zip`  
**소스 범위:** CF3 Responsive Visual Candidate + CF4 Figma Header Navigation V2 / Public Scaffold  
**제품 배포:** 미수행. Cloudflare Workers/D1/R2/Publication 변경 없음.

## SSOT 및 디자인 계약

- Figma 전체 스크롤 원본: **1920×9967**, 기준 Desktop Viewport: **1920×1080**. 1080px를 페이지 전체 높이로 해석하지 않는다.
- Native Text **76개 / 시각 Run 89개**. 문자열·스타일 Run은 동결된 JSONL로부터 생성하고 Pretendard를 유지한다.
- Paint/Stroke 기반 LINE **15개**, 그중 5개는 stroke 2px, 나머지 10개는 stroke 3px. Export `analytic-svg`는 검증 후보이며 실제 Figma 렌더와 픽셀 동등성을 입증하지 않는다.
- Clip 직접 차단 `node-18:25`, `node-18:57`, 파급 차단 **30개**. `VISUAL_UNQUALIFIED`와 `physicalPixelParity=NOT_RUN`을 유지한다.
- CF2 홈 본문 9개 구획과 빈 Rounded Media Slot 8개를 유지한다. R2에서 이미지를 미리 삽입하거나 기존 GitHub 자산으로 대체하지 않는다.
- 메인 Home 전용 CSS만 새로운 폭/그리드/비율을 소유하고 **전역 `.container-x` 정의는 불변**으로 유지한다.
- 360/390/430, 768/1024, 1280/1440/1920, 2560/3440/3840 viewport 값은 **검증 목표 목록**이며 실제 Chromium 검사 결과가 아니다.
- Header 높이: 홈 1380px 이상 뷰포트에서 125px, 그 아래 일반 화면에서 80px, 599px 이하에서는 76px. 홈 콘텐츠 상단 Offset과 같은 Breakpoint에서 동기화한다.

## CF4 Navigation / Scaffold

| Figma 메뉴 | Route | 상태 |
|---|---|---|
| 아카데미소개 | `/about` | 기존 카테고리 |
| 교육과정 | `/curriculum` | 기존 카테고리 |
| 수강갤러리 | `/archive` | 기존 카테고리 |
| 수강후기 | `/reviews` | Public-only scaffold |
| Q&A | `/faq` | Public-only scaffold |
| 상담신청 | CMS의 기존 Kakao URL | 명시적 검증 후 열기 |

- 메뉴는 Figma Text Source (`node-1:17`, `1:15`, `1:14`, `1:13`, `1:12`)의 순서가 정본이다. Footer의 기존 CMS 내비게이션 문구는 변경하지 않는다.
- `/reviews`, `/faq`는 본문이 없는 정상 Scaffold 페이지이다. 가짜 후기/FAQ를 생성하지 않으며 `noindex,follow`를 적용한다.
- 두 경로에서 공개 홈 `GET /api/render?path=%2F`로 **실제 공유 Publication**을 얻는다. Source의 `requestedPath='/'`, `selected.pageId='home'`은 그대로 유지한다. `<NuxtPage>`는 요청 URL이 Scaffold allowlist의 정확한 값이고 원래 발행 id/digest/revision/at가 유효한 경우에만 표시한다.
- Scaffold 실패는 503으로 드러내며, `/admin` 및 알 수 없는 경로를 자동으로 변환하지 않는다.
- 차후 실제 CMS 페이지 도입은 별도 revision으로 scaffold 등록을 제거하여 동일 URL을 연결한다.

## CF1 역사 경계 / Currentness

CF4는 원래 CF1의 No-Touch 대상으로 지정됐던 `app/app.vue`, `SiteHeader.vue`를 **명시적으로 인가된 신규 수정**으로 바꾼다. 이 두 파일만 새 정본 SHA를 `scripts/lib/home-r2-cf34-authority.mjs`에 핀한다. 나머지 CF1 보존 경로는 기존 해시 대조를 지속한다. 원본 CF1 ZIP/JSONL/자산 증거는 재작성하지 않는다.

## Nuxt / 누적 회귀의 현재 한계

- 초점 검증: CF1·CF2·CF3·CF4 Source Static / Node 모델 20/20 PASS.
- 신규 TypeScript 데이터·라우트 도우미는 독립 `tsc --strict --noEmit` 검사 PASS. Vue SFC 전체 컴파일은 **미실행**.
- 두 CSS 및 17개 Vue SFC의 Script 부분 Parse PASS. Vue SFC 실제 렌더/SSR 실행과 동등하지 않다.
- 현재 환경 Node 22.16.0에서 `npm ci`가 완료되지 않아 `nuxt typecheck`, `nuxt build`, 브라우저 페이지 검증을 수행하지 못했다.
- 기존 전체 테스트: 부모본 119개 중 92 PASS/27 FAIL, CF3·CF4본 127개 중 93 PASS/34 FAIL. 추가 **7개 실패**는 기존 Header의 leftNav/rightNav 및 이벤트 계약을 전제로 한 테스트와 충돌한다. 이는 사전 정의한 의미 변경이며, 회귀가 사라졌거나 Nuxt 런타임이 정상이라고 주장할 근거는 아니다. 과거 테스트의 업데이트/대조와 물리 브라우저 검증이 남아 있다.

### Evidence ladder

| 계층 | 관측 결과 |
|---|---|
| SOURCE | CF1/Figma 원본 보존 확인, CF3/CF4 코드 작성 |
| STATIC / NODE | 초점 게이트 통과, 20/20 PASS |
| TS SUBSET | PASS (Vue 제외) |
| COMPILE (NUXT) | **UNKNOWN / NOT RUN** |
| SSR/RUNTIME | **UNKNOWN / NOT RUN** |
| PHYSICAL/PIXEL | **UNKNOWN / NOT RUN** |
| PERFORMANCE | **UNKNOWN / NOT MEASURED** |
| PRODUCT PROMOTED | **false** |

**최종 CF3/CF4 제품 마커는 발행하지 않는다.** Source+Static 범위의 후보 산출물이다.
