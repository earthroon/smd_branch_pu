# SMD-HOME-R2-CF1-CF2

## FIGMA SOURCE FREEZE + NUXT HOME COMPOSITION

- 상태: **SPECIFICATION / NOT BAKED**
- 기준 프로젝트: `smd-public (2).zip` 및 `리팩토링 프레임.zip`
- 대상: **메인페이지의 Figma SSOT와 홈페이지 본문 조합**
- 구현 계층: Nuxt 4 / Vue 3 / TypeScript / Tailwind
- 제외 계층: CF3 반응형·시각 패리티, CF4 Header Navigation V2 및 신규 Scaffold Routes, CF5 CMS/R2 계약 변경, CF6 배포 및 운영 발행
- 변경 원칙: 기존 7개 카테고리 본문과 라우팅 소유권, Cloudflare PublicSurface, V5 활성 Publication 유지

### 증거 등급

이 명세의 `SOURCE-CONFIRMED`는 제공 ZIP/읽기 전용 Cloudflare 조회에서 확인한 사실만 가리킨다. 명세 완료는 코드 적용, 타입 검사, 브라우저 실행, 실제 렌더 검증을 의미하지 않는다.

## 0. 읽기 전용 기준선

| 입력 | SHA-256 |
|---|---|
| `smd-public (2).zip` | `05fe22f0f11a07e361b5181252a8dc7905010af1d82d852ce0b1b6ee72ed1de9` |
| `리팩토링 프레임.zip` | `c12c8946a7f75f3b1f91f42bdbd755f3c3758c18757553c40b42cf31d296cada` |
| `skin.jsonl` | `fe38ccb06dfc5be1755de0ebc289e9b469327066da1a358f8e94f33eb3a29c1a` |
| `figma-reference.json` | `d3770060b861a0211c4dea1a5582f78ce97ea1040588324b10923ccddb824a3b` |
| `export-session.json` | `a3c6ce020566cceb620f6ba348c2a46f7a28e876a2c485073982168fefeb547a` |

- 두 ZIP의 CRC 무결성 확인: PASS (아카이브 파일 오류 없음).
- `skin.jsonl` JSONL 레코드 1,201개. `end.recordCount=1200`은 끝 레코드를 제외한 값이다.
- `node` 272 / `native-text` 76 / `asset` 31 / `line-stroke-source-v9-r2b` 15.
- 31개 SVG 자산의 선언 SHA와 실제 바이트가 일치함. 272개 NodeKey 중 중복 0, 부모 미존재 0, Native Text 대상 누락 0.
- Render Case: `candidate=182`, `admitted=58`, `blocked=32`.
- 차단 원인: `FNS_CLIP_WITNESS_MISSING` 2개 (`node-18:25`, `node-18:57`), `FNS_SCHEMA9_ANCESTOR_RENDER_BLOCKED` 30개.
- `figma-reference.json`: `physicalParity=NOT_RUN`.
- `export-session.json`: `status=STRUCTURAL_VALIDATED_RENDER_BLOCKED`, `productCommitAllowed=false`.
- Cloudflare D1 읽기 전용 조회 (2026-10-30): 활성 Publication `sequence=11`, `schema=SMD_SITE_PUBLICATION_V5`, `pages.routes.home.slots={}`. 본문 내용 변경/발행하지 않음.

---

# CF1. FIGMA SOURCE FREEZE

## CF1-1. 목적과 SSOT

원본 Figma Export를 불변 입력으로 보존하고, SMD Home 구현이 소비할 **파생 매니페스트**를 만든다. 파생 매니페스트는 입력을 설명할 뿐 원본을 정정하거나 새로운 출처로 대체하지 않는다.

| 축 | 소유권 |
|---|---|
| 문구의 한글·영문·띄어쓰기·줄바꿈·강조 | Figma `native-text.characters` + `runs` + `textDigest` |
| Figma 노드 종류·구조·원본 순서·Affine·Clip·Paint | 원본 `skin.jsonl` |
| Figma 원본 신원 | `meta`, `figma-reference.json`, `export-session.json` |
| PC 디자인 기준 뷰포트 | 사용자 지정 **1920×1080** |
| 내보낸 전체 페이지 캔버스 | 원본 `referenceViewport=[1920,9967]` 및 `root.rectLocal` |
| 이미지를 넣을 빈 사각 프레임 | Figma 구조로부터 추출한 미디어 슬롯 레지스트리 |
| 실제 사진 바이트 | 추후 사용자 R2 CMS 업로드. CF1/CF2에서 생성 금지 |
| FAQ `=====================` | 원본에서는 정확히 동결, 제품 복사문구로는 승격하지 않는 `pending-cms-copy` 분류 |
| Home 메뉴와 링크 | Figma의 텍스트·순서 기록, 라우트 구현은 CF4 |

### 핵심 금지사항

- `skinId=personal-home`을 임의로 `smd-home`으로 바꿔 원본인 척하지 않는다.
- Figma의 `referenceViewport=[1920,9967]`을 `[1920,1080]`으로 덮어쓰지 않는다.
- `node.order`와 시각적인 Y 순서를 혼합하지 않는다.
- `text.characters`에 `trim()`, Unicode 정규화, 띄어쓰기 자동 수정 또는 오탈자 수정을 적용하지 않는다.
- `sourceNodeId`가 다르다는 이유로 같은 텍스트를 자동 제거하지 않는다. **중복 렌더 판단은 CF2 레이아웃 소유권으로 분리**한다.
- Render `candidate`, `admitted`, `blocked` 상태를 임의 변경하지 않는다.
- 미해결 Clip을 렌더 가능하다고 표시하거나 누락 SVG를 가짜 사각형으로 메우지 않는다.

## CF1-2. Source Identity

```text
contract = FNS-SCHEMA9-TREE-SSOT-R2B-LINE-STROKE-R1
schema = 9
skinId = personal-home
documentUid = doc-be7d8329bdc7e710794b7de3bd873e7f
rootFrameId = 1:3
rootNodeKey = node-1:3
snapshotDigest = 5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f
sourceWitnessDigest = b81daf175c8ee9e590b1bc0b87cd74dbe7d0c75e121c412fc0cfa16367127cc1
sourceCanvas = [1920, 9967]
designViewportPolicy = [1920, 1080]  # User-defined, not an Export field
```

**검증:** `meta`, `figma-reference.json`, `export-session.json`, `end` 사이에서 공통 필드가 일치하는지 확인한다. 원본 FNS digest를 독립 재구성하지 않는 한 원본 export가 주장한 digest는 **출처 메타데이터**이며, 별도의 SHA-256 바이트 검사와 구분한다.

## CF1-3. 최상위 섹션 인벤토리

원본 자식의 `order`는 **원본 순서 필드**로 보존한다. Home 레이아웃 조합 순서는 **Y 좌표와 승인된 Section Mapping**을 기준으로 별도 작성한다.

| Visual index | NodeKey | 원본 명칭 | 원본 `order` | Y 범위 |
|---:|---|---|---:|---|
| 0 | `node-1:6` | Header | 10 | 0~125 |
| 1 | `node-1:4` | headimage | 9 | 125~940 |
| 2 | `node-1:134` | headimage_bar_frame | 8 | 940~1250 |
| 3 | `node-1:123` | Frame 1 | 7 | 1250~2317 |
| 4 | `node-1:93` | Frame 2 | 6 | 2317~3208 |
| 5 | `node-1:77` | Frame 3 | 5 | 3208~4630 |
| 6 | `node-1:51` | Frame 5 | 4 | 4630~5830 |
| 7 | `node-1:46` | Frame 6 | 3 | 5819~7165 |
| 8 | `node-1:22` | Frame 7 | 2 | 7180~8379 |
| 9 | `node-1:20` | FRAME 8 | 1 | 8394~9254 |
| 10 | `node-36:8` | footer | 0 | 9254~9972 |

참고: `Frame 5`와 `Frame 6`의 Y 구간은 11px 중첩한다. Footer의 하단은 원본 Root 9967px보다 5px 길다. CF1은 이 차이를 기록하고 **자동 보정하지 않는다**. CSS 흐름 재구성에 필요한 공간 정책은 CF3에서 검증한다.

## CF1-4. 텍스트 및 폰트 매니페스트

각 Native Text는 다음 원본 정보와 결합한다.

```ts
// PROPOSED TYPE, NOT IMPLEMENTED
export type FrozenFigmaText = Readonly<{
  nodeKey: string;
  sourceNodeId: string;
  characters: string; // exact, including line breaks
  textDigest: string;
  offsetUnit: 'utf16';
  runs: readonly unknown[]; // validated original run records
  layout: Readonly<{
    width: number;
    height: number;
    alignHorizontal: string;
    alignVertical: string;
  }>;
  usage: 'copy' | 'label' | 'pending-cms-copy' | 'source-only';
}>;
```

- 서체: Native Text의 모든 Run이 Pretendard. Source Run 기준 총 89개.
- 확인된 굵기: Regular 400, Medium 500, SemiBold 600, Bold 700.
- CSS `font-family` 기준은 기존 Pretendard 설정을 재사용하고, 줄바꿈·Line Height·Letter Spacing은 Run별 원본으로 관리한다.
- Figma `characters`와 Run 연속성이 UTF-16 offset 기준으로 일치해야 한다.
- Figma 안의 서로 다른 문구(`6주 · 총42시간` / `6주· 총 42시간`)는 **서로 다른 원문**으로 보존한다. 이들을 하나의 임의 텍스트로 통합하지 않는다.
- `node-1:30` ~ `node-1:33` FAQ 구분자 4개는 `pending-cms-copy`로 기록하고 실제 FAQ 문장으로 렌더하지 않는다.
- Figma의 `업계 최초` 문구를 원문으로 동결하되 문구의 진실성·대외 게시 승인은 출처 동결과 별도 게이트다.

## CF1-5. 이미지 슬롯 / 시각 소유권

원본에 `1_image-box`라는 이름이 붙은 FRAME은 사용자가 후속 R2 이미지를 넣을 시각적 프레임이다. 이 자리의 배경색은 사진이 아니다.

- `Frame 1`: `node-1:126`, 484×484, radius 30.
- `Frame 3`: 시각적 강점 카드 안에 515×343.5248, radius 30인 `1_image-box` 계열 구조가 있다. 다중 중첩·중복 노드도 원본에 있으므로 실제 논리 카드 수와 시각 렌더 소유권을 분리한다.
- `Frame 5`: 논리 슬롯 3개인 `node-1:54`, `node-1:56`, `node-1:58`, 각 약 491×416, radius 30. `node-1:57`과 `node-1:59`는 상위 슬롯의 내부 자식 FRAME이며 별도 업로드 슬롯으로 중복 계산하지 않는다.
- 모든 신규 슬롯은 `{slotId, sourceNodeKey, sourceFrameRect, sourceRadii, mediaState:'unbound'}`를 포함하며 실제 R2 `assetId`는 생성하지 않는다.
- 새 슬롯 이름은 CF5 CMS 계약과 호환되도록 안정적인 의미 ID로 설계하되, 기존 `home.hero.image` 등에 묵시적으로 재결합하지 않는다.
- 중첩 Clip·Blend·Paint의 실제 픽셀 실행은 CF3 보류.

## CF1-6. 산출물 경로 제안

기존 `docs/migration/cf00/` 패턴을 따라 다음을 추가한다. **지금은 추가하지 않았다.**

```text
docs/migration/smd-home-r2/
  cf1/
    figma-source/
      skin.jsonl
      figma-reference.json
      export-session.json
      assets/*.svg       # original filenames preserved
    source-identity.json
    section-manifest.json
    home-copy-manifest.json
    media-slot-manifest.json
    render-blocker-manifest.json
    parent-source-sha256.json
    receipt.json

scripts/home-r2-cf1-source-static.mjs
scripts/tests/home-r2-cf1-source.test.mjs
```

생성한 파생 매니페스트에는 `schemaVersion`, `sourceDigest`, `generatedFrom`과 `generatorVersion`을 포함한다. 원본 파일은 byte-identical 보존. Public 런타임에 전체 JSONL을 무조건 적재하지 않는다.

## CF1-7. 오류 / Admission

| 오류 | 조건 |
|---|---|
| `SMD_HOME_R2_SOURCE_DIGEST_MISMATCH` | 고정된 원본 파일 SHA 변경 |
| `SMD_HOME_R2_IDENTITY_DRIFT` | documentUid/root/schema/authority 상호 불일치 |
| `SMD_HOME_R2_NODE_GRAPH_INVALID` | 중복 NodeKey, 잘못된 parent, 순환 참조 |
| `SMD_HOME_R2_TEXT_RUN_INVALID` | `characters`, UTF-16 offset, Run reconstruction 불일치 |
| `SMD_HOME_R2_ASSET_HASH_MISMATCH` | SVG asset SHA 불일치·누락 |
| `SMD_HOME_R2_SECTION_MAPPING_INVALID` | 동일 Root 섹션을 복수 제품 섹션이 소비하거나 미지정 |
| `SMD_HOME_R2_UNEXPECTED_RENDER_BLOCKER` | 기존 known blocker 외 새로운 차단 상태 출현 |
| `SMD_HOME_R2_MEDIA_SLOT_AMBIGUOUS` | 중첩 FRAME의 실제 논리 슬롯 ownership 충돌 |

Known blocker는 **허용된 미해결 항목**이지 렌더 승격이 아니다.

## CF1-8. 종료 조건

- ZIP / 파일 SHA 일치, SVG 31/31 SHA 일치.
- 272개 NodeKey 중 중복 0, 부모 참조 결손 0.
- Source `native-text` 76개 lossless 복원, 원문 강제 수정 0.
- 11개 Root 섹션 정확한 nodeKey·Rect·Y-order·original `order` 보존.
- FAQ 4개 placeholder가 원본에서는 보존되고 공개 Copy에서는 미작성 상태로 분류.
- Render 182/58/32의 정확한 관측 상태 보존, 2 direct + 30 ancestor 막힘을 구분.
- CF2가 사용할 9개 본문 슬롯의 Manifest 생성, Header/Footer는 공통 레이아웃 소유로 남김.
- Parent Public source checksum 보존, Cloudflare/D1 변경 0.

CF1 marker (SOURCE/STATIC 범위 검증 시에만): `PASS_SMD_HOME_R2_CF1_SOURCE_FREEZE`.

---

# CF2. NUXT HOME COMPOSITION

## CF2-1. 목적

Figma 최상위 구획 중 **본문 9개**를 제품 `app/pages/index.vue`에 의미 있는 Vue 컴포넌트로 바인딩한다. Header/Footer는 기존 `app/layouts/default.vue`의 컴포넌트를 그대로 소비한다. CF2에서 Header Navigation 개편과 Footer 외형 변경을 시행하지 않는다.

### 현재 SOURCE 구조

```text
app/pages/index.vue
  HeroSection
  CmsSlot(afterHero)
  StatementSection
  CmsSlot(afterStatement)
  TeachSection
  CmsSlot(afterTeach)
  PracticeBlock
  CmsSlot(afterPractice)
  ArchiveGallery(preview)
  CmsSlot(beforeCta)
  CtaBand
```

현행 Hero는 `pages.home.hero` 및 `facts`를 사용한다. Statement는 `pages.home.statement`, Teach는 `pages.home.teachIntro`와 `training.teachItems`를 사용한다. Figma Copy가 SSOT인 CF2에서는 이 오래된 Home 문구를 새 원문으로 간주하면 안 된다.

### 목표 BODY 구조

```text
app/layouts/default.vue [NO-TOUCH]
  SiteHeader            [CF4까지 현재 제품 유지]
  main
    HeroSection          ← headimage       node-1:4
    HomeInfoBar          ← headimage_bar   node-1:134
    StatementSection     ← Frame 1        node-1:123
    TeachSection         ← Frame 2        node-1:93
    HomeBenefits         ← Frame 3        node-1:77
    HomeMethods          ← Frame 5        node-1:51
    HomeLocation         ← Frame 6        node-1:46
    HomeFaq              ← Frame 7        node-1:22
    HomeConsultationCta  ← FRAME 8        node-1:20
  SiteFooter            [NO-TOUCH]
```

## CF2-2. 컴포넌트 책임 및 콘텐츠 매핑

| 시각 섹션 | Figma 원본 | Nuxt 제품 책임 |
|---|---|---|
| Hero | `node-1:4` | 첫 Hero 타이틀, 소제목, 설명, 배경/시각 컨테이너 |
| 정보 바 | `node-1:134` | `교육시간`, `현장경험`, `수료 후 지원`, `두 개 공종 병행 수업` 등 Figma 원문 |
| 특별한 시작 | `node-1:123` | `SMD를 통한 특별한 시작`과 01~03 설명, 이미지 프레임 |
| 정규 교육 트랙 | `node-1:93` | `정규 교육 트랙`, 오전/오후, 6주·42시간 등 실제 Source Text |
| 네 가지 강점 | `node-1:77` | 4개 논리 카드, 시각 중첩은 CF3에서 검증 |
| 교육 방법 | `node-1:51` | 좌-중-우 3개 이미지 프레임과 3개 원문 블록 |
| 교육장 위치 | `node-1:46` | 기존 Figma 안내 문구, 지도/주소 임의 생성 금지 |
| 메인 FAQ | `node-1:22` | FAQ 제목과 콘텐츠 미작성 상태. 실제 Q&A는 CF5 CMS에 연결 |
| 상담 CTA | `node-1:20` | Figma 문구, 버튼 `상담 신청하기`, 기존 상담 서비스 action 재사용 |

Figma 문자열은 원문과 `nodeKey`로 참조한다. 예컨대 교육시간에 표시되는 `6주 · 총42시간`과 정규 트랙의 `6주· 총 42시간`은 문구가 다르므로 CF2에서 임의 통합하지 않는다.

## CF2-3. 데이터 경계와 투영

```ts
// PROPOSED TYPES, NOT IMPLEMENTED
export type HomeBodySectionId =
  | 'hero'
  | 'info-bar'
  | 'special-start'
  | 'training-track'
  | 'benefits'
  | 'methods'
  | 'location'
  | 'faq'
  | 'consultation-cta';

export type HomeSectionPlan = Readonly<{
  id: HomeBodySectionId;
  sourceNodeKey: string;
  visualIndex: number;
  originalOrder: number;
  contentTextRefs: readonly string[];
  mediaSlotRefs: readonly string[];
}>;

export type HomeBodyPlan = Readonly<{
  contract: 'SMD-HOME-R2-CF2';
  sourceSnapshotDigest: string;
  sections: readonly HomeSectionPlan[];
}>;
```

**Authority 분리:**

1. `HomeBodyPlan`: Figma 구조·문구·정렬만 소유.
2. `useSiteContent()`/`useSelectedCategoryPage()`: 기존 CMS Publication currentness 및 운영 서비스 정보 소유. Figma 문구의 권위는 갖지 않음.
3. Home Media Placeholder: CF2에서는 프레임 기하만 소유. R2 객체, Legacy GitHub 이미지, 자동 생성 사진은 소비하지 않음.
4. FAQ: `pending-cms-copy`가 실제 질문을 대신하지 않음. CF2에서는 제목/빈 슬롯 구조만.
5. 상담 action: 기존 `navigation.kakaoUrl` 경로를 사용하되 빈·유효하지 않은 URL을 새 URL로 추측하지 않음.

`app/app.vue`의 `/api/render` + 요청 경로 + Publication Identity 검사는 CF2에서 수정하지 않는다. 로컬 테스트에서는 기존 Public Projection을 Mock으로 입력해 화면 구성을 확인한다.

## CF2-4. 현행 Home CMS Slots의 퇴역 안전성

현재 `index.vue`에는 `afterHero`, `afterStatement`, `afterTeach`, `afterPractice`, `beforeCta`의 CMS 삽입 지점이 있다. 활성 V5의 `pages.routes.home.slots`는 읽기 전용 조회상 빈 객체다. 그러나 이것이 향후 모든 Draft/Publication에 빈 슬롯만 있음을 의미하지 않는다.

따라서 CF2는 반드시 다음 계약을 갖는다.

- 기존 슬롯별 상태를 적재/검증하고 `legacyCmsSlotCount`를 Receipt에 기록.
- 미매핑 슬롯이 비어 있으면 새 Figma 구획 조합을 허용.
- **미매핑 슬롯에 내용이 존재하면** 무음 삭제나 새 섹션 사이 임의 삽입 대신 `SMD_HOME_R2_LEGACY_SLOT_CONFLICT`로 해당 신규 페이지 Candidate를 거부.
- 과거 Publication은 다시 쓰지 않음. 기존 Public 런타임으로 돌아갈 수 있는 명시적 rollback을 유지.
- CF5가 새 슬롯의 CMS 이동 정책을 정의하기 전, 기존 Home CMS 편집에 따른 의도치 않은 신규 페이지 증식 금지.

## CF2-5. 컴포넌트 수정 범위 제안

**기존 파일 유지 및 국소 수정**

```text
app/pages/index.vue
app/components/home/HeroSection.vue
app/components/home/StatementSection.vue
app/components/home/TeachSection.vue
```

**신규 추가**

```text
app/components/home/HomeInfoBar.vue
app/components/home/HomeBenefits.vue
app/components/home/HomeMethods.vue
app/components/home/HomeLocation.vue
app/components/home/HomeFaq.vue
app/components/home/HomeConsultationCta.vue
app/components/home/HomeMediaFrame.vue
app/data/home-r2-manifest.ts
app/data/home-r2-copy.ts
```

`HomeConsultationCta.vue`는 기존 `CtaBand.vue`가 여러 카테고리 페이지에서 사용되므로 독립적으로 두는 안이다. `HomeMediaFrame.vue`는 CF2에서 **unbound 프레임만** 렌더하고, CF5에서는 이미지가 승인된 경우에만 미디어 소비자로 확장한다.

**No-touch**

```text
app/app.vue
app/layouts/default.vue
app/components/feature/SiteHeader.vue
app/components/feature/SiteFooter.vue
app/components/feature/CtaBand.vue
app/components/feature/PracticeBlock.vue
app/components/feature/ArchiveGallery.vue
app/components/media/SiteImage.vue
app/composables/useSiteContent.ts
app/composables/useSelectedCategoryPage.ts
app/pages/about.vue
app/pages/curriculum.vue
app/pages/archive.vue
app/pages/practice.vue
app/pages/promotion.vue
app/pages/contact.vue
wrangler.toml
vendor/content-contracts/*
```

CF2는 `/reviews`, `/faq` 파일을 만들지 않는다. 이 두 Dummy Route는 합의된 CF4 범위에 있다. CF2에서 sitemap/SEO routing, Navigation Document, Worker/D1을 변경하지 않는다.

## CF2-6. 원본 섹션 → 의미 UI 매핑 원칙

- UI는 272개 노드를 절대좌표 DOM으로 그대로 복제하지 않는다. 의미 있는 섹션·텍스트·카드·미디어 프레임을 구성한다.
- `Figma Local Affine` 및 `node.order`는 원본 데이터에 남기지만 화면 카드 순서는 별도의 `visualIndex`로 설정한다.
- CF2는 정확한 DOM 구조와 텍스트 소비 관계를 확인한다. 픽셀 위치, 색상, Clip/Mask, 임계 너비, 실제 반응형 최적화는 CF3.
- `Frame 3`에 중첩된 카드/문구가 있어도 실제 4개 카드로 소비할 각 SourceNodeKey를 **명시적 맵**으로 정한다. 누락/중복된 시각 자산은 Receipt에 `DEFER_CF3`로 표기한다.
- 이미지가 `unbound`인 경우 Figma에서 의도한 라운딩 영역만 보여준다. `src=""`, 가짜 R2 asset, Legacy GitHub 이미지, 단순 CSS `object-cover` 대체 금지.
- FAQ placeholder 원문은 소스에 존재하지만 공개 DOM에는 `====`를 내보내지 않는다. 빈 아코디언 버튼도 생성하지 않는다.
- Header/Footer는 기존 Layout이 담당하는 단 한 번의 렌더를 유지한다. 홈 내부에 Header/Footer를 추가 중복 렌더하지 않는다.
- 기존 페이지 SEO title과 Public SSR currentness는 보존한다.

## CF2-7. 검사 및 Receipt

제안 검증기:

```text
scripts/home-r2-cf2-composition-static.mjs
scripts/tests/home-r2-cf2-composition.test.mjs
```

필수 테스트:

1. CF1 digest를 변경한 후보를 거절.
2. 본문 섹션 9개를 중복 없이 0~8 순으로 렌더.
3. Root의 Header와 Footer는 기존 Layout에서만 렌더.
4. 76개 Native Text가 원본 매니페스트에서 사라지지 않으며, 각 제품 노출 텍스트는 올바른 Source Text 참조를 소비.
5. 새 Hero/Stats/Track에 기존 `pages.home.*` 문구가 잔존하지 않음.
6. `node-1:54`, `node-1:56`, `node-1:58` 3개가 중복 없는 미디어 프레임으로 출력되고, 하위 `node-1:57`, `node-1:59`가 별도 업로드 슬롯으로 출력되지 않음.
7. 미등록 이미지 URL 요청 0, Legacy GitHub 이미지 삽입 0.
8. FAQ `====` DOM/SEO 노출 0, 가짜 Q/A 0.
9. Figma Source와 CMS 문구 충돌 시 Figma 문구가 Home에 출력.
10. `legacyCmsSlotCount>0`인 미매핑 발행본은 조용히 무시하지 않고 명시적 거절.
11. 상담 CTA는 기존 상담 동작만 사용, 새 URL 생성 0.
12. 다른 카테고리 컴포넌트·라우트·Root SSR identity의 소스 및 동작 불변.
13. Nuxt 4 typecheck/build 성공 여부는 실제 실행 후 Receipt에만 기록.

예상 Receipt 형식:

```json
{
  "contract": "SMD-HOME-R2-CF2",
  "sourceSnapshotDigest": "5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f",
  "expectedBodySections": 9,
  "actualBodySections": null,
  "sourceTextPreservation": "NOT_RUN",
  "legacyCmsSlotCount": null,
  "unboundMediaSlotCount": null,
  "unmappedCmsSlotConflict": null,
  "duplicateHeaderFooterCount": null,
  "typecheck": "NOT_RUN",
  "build": "NOT_RUN",
  "browserParity": "NOT_RUN",
  "physicalQualification": "NOT_RUN",
  "productCommitAllowed": false
}
```

`actualBodySections`, `legacyCmsSlotCount` 등은 숫자를 임의로 0 또는 성공으로 채우지 않고 실제 검증 전까지 `null`/`NOT_RUN`을 유지한다.

## CF2-8. 종료 조건

- CF1의 불변 Source Identity를 실제로 소비하는 `HomeBodyPlan`.
- 본문 9개 섹션이 정해진 순서로 `index.vue`에 조립됨.
- 11개 Root 구획 중 Header/Footer를 한 번씩만 기존 Layout에서 렌더.
- Figma Native Text 문구가 Home의 공개 문구 기준이며 기존 Home PageCopy가 이를 덮어쓰지 않음.
- 사진 없는 Rounded Frame 유지, FAQ 미작성 상태 유지.
- CMS 슬롯 내용 유실/숨김이 발생하지 않도록 명시적 게이트 존재.
- 기존 카테고리 컴포넌트, 라우트, Header/Footer 소스 변경 0.
- 추가 실행 검증을 실제로 통과하면 그 Evidence 계층만 PASS 기록.

CF2 marker (STATIC + 해당 컴파일/런타임 검증 후에만): `PASS_SMD_HOME_R2_CF2_HOME_COMPOSITION`.

---

# 3. 단계별 승인 경계

| 단계 | 현재 상태 | 완료 시 주장을 허용하는 범위 |
|---|---|---|
| CF1 | SPEC / NOT APPLIED | 원본 ZIP·Text·Asset·Node 신원 동결, Source/Static 검사 |
| CF2 | SPEC / NOT APPLIED | 홈 9개 본문 구획의 코드 조합, 범위 안의 Compile/Runtime 검증 |
| CF3 | NOT IN SCOPE | Desktop/Mobile/Tablet/Ultra-wide 시각·기하·Clip·반응형 검증 |
| CF4 | NOT IN SCOPE | 새 Navigation V2, `/reviews`, `/faq` Scaffold 라우트 |
| CF5 | NOT IN SCOPE | CMS FAQ 편집, R2 바인딩, 실제 신규 발행 계약 |
| CF6 | NOT IN SCOPE | 물리 비교, 성능 측정, 발행/롤백 검증 |

**CF1의 source-freeze PASS는 Figma 전체를 브라우저에서 올바르게 그렸다는 뜻이 아니다. CF2 컴포넌트 조합 PASS도 CF3 픽셀 패리티나 전체 사이트 발행 허가를 뜻하지 않는다.**
