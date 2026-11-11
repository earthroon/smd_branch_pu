import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('CF1: Figma FRAME2 is isolated from reused header/footer and home scaling', () => {
  const page = read('app/pages/archive.vue');
  const frame = read('app/components/gallery/GalleryFrame2.vue');
  const css = read('app/assets/css/gallery-r1.css');
  const layout = read('app/layouts/default.vue');
  assert.match(layout, /<SiteHeader\s*\/>/);
  assert.match(layout, /<SiteFooter\s*\/>/);
  assert.match(page, /<GalleryFrame2\s+v-if="galleryV3 && c"/);
  assert.match(page, /<ArchiveGallery mode="full"\s*\/>/); // Historical route preserved.
  assert.match(page, /<CmsSlot :nodes="c\?\.pageSlots\.archive\.afterGallery/);
  assert.match(page, /<CmsSlot :nodes="c\?\.pageSlots\.archive\.beforeCta/);
  assert.match(page, /<CtaBand/);
  assert.match(frame, /data-figma-node="node-1:27"/);
  for (const node of ['node-1:72', 'node-1:83', 'node-1:82']) assert.ok(frame.includes(node));
  assert.match(css, /max-width: 1046px/);
  assert.match(css, /2329\.25px/);
  assert.match(css, /343\.7843 \/ 305\.8026/);
  assert.match(css, /--gallery-badge-background: var\(--smd-brand-navy\)/);
  assert.match(css, /--gallery-tab-active: var\(--smd-action-orange\)/);
  assert.doesNotMatch(css, /(transform\s*:\s*scale\(\.75\)|zoom\s*:\s*\.75|width\s*:\s*75%)/);
  assert.doesNotMatch(frame, /<SiteHeader|<SiteFooter|<PageHero/);
});

test('CF1: source typography, white surface, 3/2/1 grids and noncrop semantics', () => {
  const css = read('app/assets/css/gallery-r1.css');
  assert.match(css, /background: var\(--gallery-background\)/);
  assert.match(css, /font-size: 61\.509px/);
  assert.match(css, /font-size: 34\.943px/);
  assert.match(css, /font: 700 14\.848px/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /object-fit: contain/);
  assert.match(css, /--gallery-eyebrow: #1c315b/);
  assert.match(css, /width: 35px/);
  assert.match(css, /height: 5px/);
  assert.doesNotMatch(css, /object-fit: cover/);
});

test('CF1: archive SEO and historical V2 PageHero are not replaced by hardcoded Figma copy', () => {
  const page = read('app/pages/archive.vue');
  const frame = read('app/components/gallery/GalleryFrame2.vue');
  assert.match(page, /archiveNavigationLabel=computed/);
  assert.match(page, /useSeoMeta\(\{title:computed/);
  assert.match(page, /<PageHero/);
  assert.match(page, /:title-lines="pages\?\.archive\.hero\.titleLines/);
  assert.match(frame, /titleLines\.join\(' '\)/);
  assert.match(frame, /v-for="\(segment, index\) in ledeSegments"/);
  assert.doesNotMatch(frame, />SMD ACADEMY \/ CLASS GALLERY</);
});
