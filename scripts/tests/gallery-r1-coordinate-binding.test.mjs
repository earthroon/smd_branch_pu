import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  GALLERY_FIGMA_FILE_KEY,
  galleryHeaderNodeForItem,
  galleryNavigationPresentation,
} from '../../app/utils/gallery-presentation.ts';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const sha = file => createHash('sha256').update(readFileSync(new URL(`../../${file}`, import.meta.url))).digest('hex');
const original = JSON.parse(read('scripts/gallery-r1/untouched-parent-sha.json'));

test('FIX: Gallery Header maps all five source nodes only for /archive and preserves navigation targets', () => {
  assert.equal(GALLERY_FIGMA_FILE_KEY, 'aVzrXSUp4FrQ1dp7nKrSVI');
  const mapping = [
    ['about','node-1:19','/about'],
    ['curriculum','node-1:20','/curriculum'],
    ['archive','node-1:26','/archive'],
    ['reviews','node-1:25','/reviews'],
    ['faq','node-1:24','/faq'],
  ];
  for(const [id, node, to] of mapping) {
    assert.equal(galleryHeaderNodeForItem('/archive', id, 'node-OLD'), node);
    assert.equal(galleryHeaderNodeForItem('/about', id, 'node-OLD'), 'node-OLD');
    assert.equal(galleryHeaderNodeForItem('/curriculum', id, 'node-OLD'), 'node-OLD');
    assert.equal(to.startsWith('/'), true);
  }
  const header = read('app/components/feature/SiteHeader.vue');
  assert.match(header, /galleryHeaderNodeForItem\(route\.path, item\.id, item\.sourceNodeKey\)/);
  assert.match(header, /:data-figma-file-key="galleryHeader \? GALLERY_FIGMA_FILE_KEY : undefined"/);
  assert.match(header, /:to="item\.to"/);
  assert.match(header, /const nav = homeHeaderNavigationV2\.items/);
  assert.match(header, /:data-figma-node="galleryHeader \? 'node-1:4' : 'node-1:6'"/);
});

test('FIX: legacy /archive title is corrected only in presentation, /reviews and publication stay unchanged', () => {
  const raw = Object.freeze({ to: '/archive', label: '수강후기', readonly: 42 });
  const display = galleryNavigationPresentation(raw);
  assert.equal(display.label, '수강갤러리');
  assert.equal(display.to, '/archive');
  assert.equal(display.readonly, 42);
  assert.equal(raw.label, '수강후기');
  const review = { to: '/reviews', label: '수강후기' };
  assert.strictEqual(galleryNavigationPresentation(review), review);
  const footer = read('app/components/feature/SiteFooter.vue');
  const archive = read('app/pages/archive.vue');
  assert.match(footer, /\.map\(galleryNavigationPresentation\)/);
  assert.match(archive, /galleryNavigationPresentation\(all\.find\(link=>link\.to==='\/archive'\)/);
  assert.match(archive, /useSeoMeta\(\{title:computed/);
  assert.match(read('app/pages/reviews.vue'), /<template>/);
});

test('FIX: Frame3 restores Figma 1920x567 positions, text and published consultation URL', () => {
  const component = read('app/components/gallery/GalleryCtaFrame3.vue');
  const css = read('app/assets/css/gallery-cta-frame3.css');
  const page = read('app/pages/archive.vue');
  for(const id of ['1:84','1:91','1:86','1:85','1:88','1:87'])
    assert.match(component, new RegExp(`node-${id}`), id);
  assert.match(component, /GALLERY_FIGMA_FILE_KEY/);
  assert.match(component, /배움의 과정이, 현장의 자신감으로\./);
  assert.match(component, /SMD아카데미 인테리어필름 · 유리필름 실무 교육/);
  assert.match(component, /상담 신청하기/);
  assert.match(component, /usePublicConsultationHref\(\)/);
  assert.match(component, /v-if="consultationHref"/);
  assert.match(component, /rel="noopener noreferrer"/);
  assert.doesNotMatch(component, /href="https?:/);
  for (const n of ['height: 567px','max-width: 1046px','top: 174.71875px','top: 258.71875px','top: 322.71875px','width: 236.992px','height: 62.004px'])
    assert.ok(css.includes(n), n);
  assert.match(page, /<GalleryCtaFrame3 v-if="localGalleryPreview \|\| galleryV3"\s*\/>/);
  assert.match(page, /<CtaBand v-else/);
  assert.match(page, /<CmsSlot :nodes="c\?\.pageSlots\.archive\.beforeCta/);
  assert.ok(page.indexOf('beforeCta') < page.indexOf('<GalleryCtaFrame3'));
  assert.doesNotMatch(css, /scale\(\.75\)|zoom: .75/);
});

test('FIX: dev-only notice removed, visual placeholders still not CMS publications', () => {
  const preview = read('app/components/gallery/GalleryStandalonePreview.vue');
  assert.doesNotMatch(preview, /LOCAL FIGMA PREVIEW|smd-gallery-standalone-notice/);
  assert.match(preview, /data-gallery-preview-only="true"/);
  assert.match(preview, /:data-figma-file-key="GALLERY_FIGMA_FILE_KEY"/);
  assert.match(read('app/components/gallery/GalleryFrame2.vue'), /:data-figma-file-key="GALLERY_FIGMA_FILE_KEY"/);
  assert.doesNotMatch(preview, /<iframe|<img|<video/);
});

test('FIX: about/curriculum original Source → Page → Operation adapters and independent video route stay byte-identical', () => {
  // CF5 Reviews intentionally revises root and the shared layout page skin.
  // The remaining Gallery/legacy owners still require byte identity.
  for(const path of ['app/pages/about.vue','app/pages/curriculum.vue','app/pages/videos.vue',
    'app/composables/useAboutR1.ts','app/composables/useCurriculumR1.ts',
    'app/assets/css/home-r2-header.css']) {
    if (original.files[path]) assert.equal(sha(path), original.files[path], path);
  }
  assert.match(read('app/pages/about.vue'), /AboutBodyStage/);
  assert.match(read('app/pages/curriculum.vue'), /CurriculumBodyStage/);
  assert.match(read('app/pages/videos.vue'), /lane="video"/);
  const app = read('app/app.vue'), layout = read('app/layouts/default.vue');
  assert.match(app, /sourcePath = scaffold === null \? path : '\/'/);
  assert.match(app, /r\.shared\.publication\.digest === r\.publication\.digest/);
  assert.match(layout, /<SiteHeader\s*\/>/);
  assert.match(layout, /<SiteFooter\s*\/>/);
  assert.match(read('app/data/home-r2-navigation.ts'), /targetStatus: 'scaffold'/);
});
