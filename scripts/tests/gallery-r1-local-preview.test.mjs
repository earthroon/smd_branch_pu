import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const page = read('app/pages/archive.vue');
const preview = read('app/components/gallery/GalleryStandalonePreview.vue');
const nuxt = read('nuxt.config.ts');
const render = read('server/api/render.get.ts');

test('PUBLIC STANDALONE: /archive fixture is selected before V3 and Legacy', () => {
  assert.match(nuxt, /contentMode:\s*'standalone'/);
  assert.match(page, /localGalleryPreview = useContentMode\(\) === 'standalone'/);
  assert.doesNotMatch(page, /import\.meta\.dev/); // Must survive Workers production build
  assert.match(page, /<GalleryStandalonePreview v-if="localGalleryPreview" \/>/);
  assert.match(page, /<GalleryFrame2\s+v-if="galleryV3 && c"/);
  assert.match(page, /archive\.schemaVersion === 3/);
});
test('LOCAL PREVIEW: Figma 1:27 has nine source-backed placeholder slots with 6 video and 3 photo', () => {
  const kinds = [...preview.matchAll(/mediaNode: 'node-1:(?:69|68|67|54|53|52|36|35|34)', badgeNode: 'node-1:\d+', kind: '(video|photo)'/g)].map(m => m[1]);
  assert.deepEqual(kinds, ['video','photo','video','video','photo','video','video','photo','video']);
  assert.match(preview, /data-gallery-preview-only="true"/);
  assert.doesNotMatch(preview, /LOCAL FIGMA PREVIEW|게시된 사진\/영상이 아닌 디자인 플레이스홀더/);
  assert.doesNotMatch(preview, /<iframe|<img|<video|fetch\(|useAsyncData|\/api\/archive\/media/);
});
test('LOCAL PREVIEW: same existing tab and page state model, never upgrades preview to CMS', () => {
  assert.match(preview, /galleryActivateFilter\(state.value, filter\)/);
  assert.match(preview, /galleryPaginate\(/);
  assert.match(preview, /<GalleryCategoryTabs/);
  assert.match(preview, /<GalleryPagination/);
  assert.doesNotMatch(preview, /publicationId|publicationDigest|validateArchiveCollectionV3/);
  assert.match(render, /DEV_FIXTURE_ONLY/);
});

test('PUBLIC STANDALONE: Worker config selects gallery fixture while V3 and other routes retain authority', () => {
  const wrangler = read('wrangler.toml');
  const app = read('app/app.vue');
  assert.match(wrangler, /NUXT_PUBLIC_CONTENT_MODE = "standalone"/);
  assert.match(page, /<GalleryStandalonePreview v-if="localGalleryPreview" \/>/);
  assert.match(page, /<GalleryFrame2\s+v-if="galleryV3 && c"/);
  assert.match(app, /standalonePreviewSelected\(path, local\)/);
  assert.doesNotMatch(page, /useRuntimeConfig\(\)\.public\.contentMode\s*=/);
  assert.match(preview, /data-gallery-preview-only="true"/);
});
