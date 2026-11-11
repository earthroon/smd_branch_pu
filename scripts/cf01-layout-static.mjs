import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256, CSS_SHA } from './lib/cf00-reference.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
let passes = 0;
const checks = [];
function check(name, ok) {
  checks.push({ name, passed: Boolean(ok) });
  if (!ok) throw new Error(`CF01_STATIC_LAYOUT_DRIFT: ${name}`);
  passes += 1;
}
const includesAll = (source, tokens) => tokens.every((token) => source.includes(token));

try {
  const layout = read('app/layouts/default.vue');
  const header = read('app/components/feature/SiteHeader.vue');
  const footer = read('app/components/feature/SiteFooter.vue');
  const hero = read('app/components/feature/PageHero.vue');
  const cta = read('app/components/feature/CtaBand.vue');
  const reveal = read('app/components/feature/Reveal.vue');
  const error = read('app/error.vue');
  const app = read('app/app.vue');
  const admin = read('app/pages/admin/index.vue');

  check('source CSS bytes', sha256(readFileSync(join(root,'app/assets/css/main.css'))) === CSS_SHA);
  check('layout one shell', includesAll(layout,['flex min-h-screen flex-col bg-background-50','<SiteHeader />','<main class="flex-1">','<slot />','</main>','<SiteFooter />']));
  check('layout order', layout.indexOf('<SiteHeader />') < layout.indexOf('<main class="flex-1">') && layout.indexOf('</main>') < layout.indexOf('<SiteFooter />'));
  check('no extra shell bot', !/InquiryBot|<bot/i.test(layout));
  check('header fixed and transition', includesAll(header,['fixed inset-x-0 top-0 z-50 transition-colors duration-300','border-b border-background-200 bg-background-50/95 backdrop-blur-md','border-b border-transparent bg-background-50/70 backdrop-blur-sm']));
  check('header strict scroll switch', /window\.scrollY\s*>\s*16\s*;/.test(header));
  check('header geometry', includesAll(header,['w-full px-5 md:px-8','grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20','justify-self-center']));
  check('header brand anchor', includesAll(header,['aria-label="SMD 아카데미 홈으로"','class="flex items-center gap-2.5 cursor-pointer"']));
  check('header left and right links', includesAll(header,['content?.navigation.leftNav','content?.navigation.rightNav','NuxtLink']));
  check('header transition links', (header.match(/whitespace-nowrap text-sm font-label transition-colors duration-300 hover:text-primary-600/g) || []).length === 2);
  check('header native Kakao anchors', (header.match(/target="_blank"/g) || []).length === 2 && (header.match(/rel="noopener noreferrer"/g) || []).length === 2);
  check('header mobile drawer', includesAll(header,['grid h-9 w-9 place-items-center','aria-expanded="open"','transition-[max-height] duration-500 lg:hidden','max-h-[420px]','max-h-0 border-t-transparent']));
  check('mobile CTA appearance', includesAll(header,['gap-1.5 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5','카카오톡 상담 신청']));
  check('drawer cleanup', includesAll(header,['bodyOverflowBeforeDrawer','document.body.style.overflow','releaseDrawerLock()','onUnmounted','removeEventListener']));
  check('no manual internal nav', !header.includes('preventDefault') && !header.includes('navigateTo('));
  check('footer column sizing', footer.includes('grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr]') && !footer.includes('1.4fr_0.8fr_1.2fr'));
  check('footer original brand markup', includesAll(footer,['flex items-center gap-2.5','leading-tight','font-heading text-base font-semibold text-foreground-950','Interior Film Training']));
  check('footer noninteractive brand', !/NuxtLink[^>]*to="\/"/.test(footer));
  check('footer nav source order and hover', includesAll(footer,['content.value?.navigation.leftNav','content.value?.navigation.rightNav','mt-4 space-y-2.5','transition-colors hover:text-primary-600']));
  check('footer social group', includesAll(footer,['gap-x-3 gap-y-2','ri-kakao-talk-fill text-base','ri-instagram-line text-base','ri-youtube-line text-base']));
  check('footer separators', (footer.match(/<span class="text-background-400">\|<\/span>/g) || []).length === 2);
  check('footer contact button', includesAll(footer,['to="/contact" class="btn-ghost mt-6"','© 2026 SMD ACADEMY. All rights reserved.']));
  check('PageHero unchanged layout', includesAll(hero,['border-b border-background-200 bg-background-50 pt-28 md:pt-36','container-x pb-12 md:pb-16','<slot name="title" />','v-if="$slots.default" class="mt-10"']));
  check('CTA exact semantic branches', includesAll(cta,['v-if="external"',':href="content?.navigation.kakaoUrl"','target="_blank"','rel="noopener noreferrer"','<NuxtLink','v-else',':to="to"']));
  check('CTA source transition', (cta.match(/cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-6 py-3 font-label text-sm text-background-50 transition-colors duration-300 hover:bg-primary-400/g) || []).length === 2);
  check('CTA default', includesAll(cta,["to: '/contact'", "linkLabel: '바로가기'"]));
  check('Reveal starts hidden SSR/client', includesAll(reveal,['const visible = ref(false);','visible ? \'translate-y-0 opacity-100\' : \'translate-y-7 opacity-0\'']));
  check('Reveal observer policy', includesAll(reveal,['threshold: 0.14',"rootMargin: '0px 0px -40px 0px'",'observer?.unobserve(entry.target)','observer?.disconnect()']));
  check('Reveal fallback & original transition', includesAll(reveal,['visible.value = true;','transition-all duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)]','transitionDelay: `${props.delay}ms`']));
  check('error 404 copy', includesAll(error,['페이지를 찾을 수 없습니다.','요청하신 페이지가 이동되었거나 주소가 변경되었을 수 있습니다. 홈으로 돌아가 다시 확인해 주세요.','홈으로 가기','상담 문의하기']));
  check('error original subtree', includesAll(error,['flex min-h-[70vh] items-center pt-28 md:pt-36','mt-8 flex flex-wrap items-center gap-x-8 gap-y-4','to="/" class="link-arrow"','to="/contact" class="link-arrow"']));
  check('error shell single ownership', (error.match(/<SiteHeader\s*\/>/g)||[]).length === 1 && (error.match(/<SiteFooter\s*\/>/g)||[]).length === 1 && (error.match(/<main\b/g)||[]).length === 1 && !error.includes('<NuxtPage'));
  check('error HTTP status and clear', includesAll(error,['setResponseStatus(event, effectiveStatus.value)','effectiveStatus.value === 404','clearError()']));
  check('error non-404 preserved', includesAll(error,['서비스를 불러오지 못했습니다.','effectiveStatus.value = Number.isInteger(upstream)','? upstream : 503']));
  check('error source consumes canonical API', error.includes("$fetch<PublicContent>('/api/content')") && !error.includes('seed-content'));
  check('app API content failure status', includesAll(app,['if (!isAdmin.value && error.value)','throw toPublicContentError(error.value)','showError(toPublicContentError(failure))','observed === 404']));
  check('admin independent layout', admin.includes('definePageMeta({layout:false})'));
  const missingPages = ['index','about','curriculum','practice','archive','promotion','contact'].filter(name => { try { read(`app/pages/${name}.vue`); return false; } catch { return true; } });
  check('all public route SFC present', missingPages.length === 0);
  console.log(`PASS_SMD_NUXT_R2_CF01_SHARED_LAYOUT_STATIC ${passes}/${passes}`);
  console.log(JSON.stringify({ contract:'SMD-NUXT-R2-CF00-CF01', totalChecks: passes, checks, browserParity: null, typecheck: null, build: null }));
} catch (error) {
  console.error(String(error));
  console.error(`CF01_STATIC_FAILED after ${passes} passed checks`);
  process.exitCode = 1;
}
