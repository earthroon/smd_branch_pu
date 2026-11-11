import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const file=x=>readFileSync(resolve(root,x),'utf8');
test('header label is sourced from publication navigation for desktop and mobile',()=>{
  const header=file('app/components/feature/SiteHeader.vue');
  assert.match(header,/content\?\.navigation\.rightNav/);
  assert.match(header,/content\?\.navigation\.leftNav/);
  assert.match(header,/\{\{ item\.label \}\}/);
});
test('archive section heading is publication pages.archive.sectionHeading',()=>{
  const gallery=file('app/components/archive/ArchiveGallery.vue');
  assert.match(gallery,/\{\{pages\?\.archive\.sectionHeading\}\}/);
  assert.doesNotMatch(gallery,/>SMD ARCHIVE</);
});
test('archive SEO is reactive to CMS /archive label with requested fallback',()=>{
  const archive=file('app/pages/archive.vue');
  assert.match(archive,/archiveNavigationLabel=computed/);
  assert.match(archive,/link\.to==='\/archive'/);
  assert.match(archive,/useSeoMeta\(\{title:computed/);
  assert.doesNotMatch(archive,/useSeoMeta\(\{title:'수강후기/);
});
test('public URL /archive is unchanged',()=>{
  const archive=file('app/pages/archive.vue');
  assert.match(archive,/ArchiveGallery mode="full"/);
  const header=file('app/components/feature/SiteHeader.vue');
  assert.match(header,/:to="item\.to"/);
});
