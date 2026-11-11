# 아카데미 소개 페이지 적용

기준 Public 커밋은 d9e3568089e20bbe4dc8893337f483e2539effd9이다.
PSD 정본은 261028_smd_아카데미소개페이지(1).psd이며 SHA-256은
36e2e557bf1e8c1b3101357b28689f84111a83a5d90b61049672416c9549b4e6이다.

## 적용한 동작

/about 본문을 Hero, 정보 바, 교육 대상, 현장 경험, 실습, 반복 실습과 피드백,
진로, 상담 CTA의 8개 섹션으로 구성했다. 원문 59개와 PNG 사진 8개, SVG 아이콘 4개를 소비한다.
사진·아이콘의 파일명과 원본 바이트를 유지하며 PSD transform, 회전, 둥근 clip frame을 반영한다.
Header와 Footer는 기존 default layout의 공통 컴포넌트를 각각 1회 사용한다.

SMD-PSD-LAYOUT-R2에서 Wide 조건을 1920px 이상, hover:hover, pointer:fine으로 조정했다.
본문 artboard 폭은 min(viewportWidth,1920)이며 1920px 기준 원본 크기로 표시한다.
699px 이하, 700~1099px, 1100~1919px 및 coarse pointer는 기존 같은 컴포넌트의 CSS reflow를 사용한다.
홈 전용 75% 배율과 공통 Header의 높이·메뉴·색상·서체 토큰은 각 기존 소유자에 유지한다.
R1에서 도입했던 본문 75% 축소는 R2가 대체한다. 적용 순서는 About R1 → Curriculum R1 → PSD Layout R2이다.
현재 레이아웃 계약과 검증 범위는 ../smd-psd-layout-r2/README.md를 참조한다.

## 명세에서 조정한 발행 경계

이번 Public 한 저장소의 오버레이에서 본문 문구와 사진은 PSD_BUILD_SOURCE_V1 빌드 자산이다.
새 CMS Publication으로 등록했다고 주장하지 않으며 새로운 V7 envelope·Core endpoint·미디어 슬롯을 도입하지 않았다.
@smd/content-contracts 0.7.0과 V5 미디어 상한·validator는 유지한다.
명세 CF5의 새 About Publication producer와 운영 발행은 별도 후속 범위다.

기존 app/app.vue가 검증한 현재 Publication에서 메뉴·상담 URL·CMS 삽입 슬롯을 소비한다.
추가 콘텐츠 fetch는 없다. route 또는 publication ID/digest가 다르면 소비하지 않는다.
about.afterPillars는 Audience 뒤, about.beforeCta는 Career와 CTA 사이에 표시한다.
상담 URL이 없거나 유효하지 않으면 연결 불가 상태를 표시한다.
기존 /curriculum CTA를 현재 검증된 상담 링크로 바꾼 것이 동작상의 변경이다.

Header의 공통 주황은 PSD의 #D95E22로 정합되어 다른 페이지에도 적용된다.
브랜드 SMD아카데미/700, 메뉴 순서, 로고 크기, drawer 동작과 높이는 유지한다.
Footer 배경은 /about에만 #2E2E2E를 적용한다. Footer 문구·연락처·내재 높이는 기존 공통 구현이 소유한다.

## 부모 소스 정리

기준 커밋의 11개 파일에 남은 병합 마커 29묶음을 정리했다.
FAQ·Methods·50ms wheel gate·강조 문구가 들어 있는 incoming 구문을 보존했다.
홈 generated scene/copy/ownership, 타임라인 수식, wheel gate 구현은 변경하지 않았다.
GitHub에서 빠진 고정 SVG는 기존 source freeze와 SMD_HOME_BENEFITS_REVEAL_R1_full_source.zip의
원본 바이트로 복원했다. Header 로고는 주어진 Figma의 원본 SVG를 사용한다.

## 적용

SMD-ABOUT-R1_APPLY.ps1과 SMD-ABOUT-R1_overlay.zip을 같은 폴더에 둔다.

~~~powershell
& .\SMD-ABOUT-R1_APPLY.ps1 -ProjectRoot 'D:\1111113232\TE-PU\smd-public (1)\smd-public'
~~~

적용기는 모든 대상 파일과 필수 부모 파일을 검사한 다음 변경한다.
이름이 같은 로컬 파일이 기대한 기준본과 다르면 OVERLAY_LOCAL_FILE_CHANGED로 중단한다.
이미 같은 결과가 있는 파일은 건너뛰며 기존 파일은 artifacts/about-r1-*에 백업한다.
Windows CRLF는 텍스트 비교에서 LF와 동일하게 취급하되 백업은 원래 바이트를 보존한다.
오버레이는 위 기준 커밋을 대상으로 한다. 다른 버전의 로컬 수정으로 검사가 중단되면
파일을 강제로 덮어쓰지 말고 오류에 표시된 파일을 현재 변경 사항과 병합해야 한다.
Git commit, push, Cloudflare 배포는 수행하지 않는다.

~~~powershell
npm run verify:about
npm run test:about
npm run typecheck
npm run build
npm run dev
~~~

로컬에서 Core 서비스 없이 화면을 볼 때만 기존 명시적 fixture를 사용한다.

~~~powershell
$env:SMD_DEV_FIXTURE_ONLY = '1'
npm run dev
~~~

fixture는 개발 전용이며 실제 운영 Publication 검증을 대신하지 않는다.
운영 /about은 기존과 같이 SMD_CORE 바인딩과 유효한 /api/render 응답을 요구한다.

## 검증

source verifier는 원문 digest, 원본 사진·아이콘 바이트와 PNG 크기를 확인한다.
단위 검증은 PSD에서 관측한 transform corners와 CSS affine 결과, 오염된 자산 거부,
중복 배율 방지, 다른 route/Publication의 소비 거부, 잘못된 상담 URL 처리를 확인한다.
최종 실행 결과와 브라우저 환경은 함께 제공하는 검증 receipt에 기록한다.
브라우저 검증은 실제 Vue 컴포넌트를 실행한 명시적 fixture harness에서 수행했다.
기존 Pretendard 1.3.9와 같은 릴리스의 TTF를 검증 환경에서만 로컬 제공했다.
이는 Nuxt 전체 SSR/hydration 또는 운영 Core Publication의 실행 검증이 아니다.
PowerShell 실행기는 정적 검토 대상이며 Windows PowerShell에서의 실행은 이 환경에서 수행하지 않았다.
새 About CMS 발행, Figma 캔버스 작성, Cloudflare 배포·운영 물리 실행은 이 오버레이의 완료 주장에 포함하지 않는다.
