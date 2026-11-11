import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=(path)=>readFileSync(resolve(root,path),'utf8');
test('R3A video is an independent Nuxt top-level page, not a nested archive tab',()=>{
 const s=read('app/pages/videos.vue');
 assert.match(s,/<ArchiveGallery mode="full" lane="video"/);
 assert.match(s,/pageId==='videos'/);
 assert.match(s,/schemaVersion===3/);
 assert.doesNotMatch(s,/\/archive\?media=/);
});
test('feature wrapper forwards lane to concrete gallery',()=>{
 const s=read('app/components/feature/ArchiveGallery.vue');
 assert.match(s,/lane\?:'photo'\|'video'/);
 assert.match(s,/<Gallery :mode="mode" :lane="lane"/);
});
test('R3A gallery accepts independent lanes with no automatic V2 relabeling',()=>{
 const view=read('app/utils/archive-view.ts');
 const gallery=read('app/components/archive/ArchiveGallery.vue');
 assert.match(view,/selectVisibleArchiveAny\(archive,lane\)/);
 assert.match(gallery,/archive\.schemaVersion===3\)\?props\.lane:undefined/);
 assert.match(gallery,/lane==='video'\?'영상'/);
});
test('video description precedes bounded supplemental thumbnail display',()=>{
 const s=read('app/components/archive/ArchiveCard.vue');
 const desc=s.indexOf('{{entry.description}}');
 const thumbs=s.indexOf('entry.media.thumbnails.length');
 assert.ok(desc>0 && thumbs>desc,'VIDEO_DESCRIPTION_THUMBNAIL_ORDER');
 assert.match(s,/v-for="\(thumbnail,index\) in entry\.media\.thumbnails"/);
 assert.match(s,/\/api\/archive\/media\//);
 assert.match(s,/loading="lazy"/);
});
test('V5 Public render contract requires exact /videos + archive V3 + current nav',()=>{
 const s=read('server/utils/site-media-v5-render.ts');
 assert.match(s,/selected\.mode==='archive-lane'/);
 assert.match(s,/path!=='\/videos'/);
 assert.match(s,/shared\.archive\.schemaVersion!==3/);
 assert.match(s,/listed\.length!==1/);
});
test('Public keeps original /archive and navigation rendered from published documents',()=>{
 const gallery=read('app/pages/archive.vue');
 const header=read('app/components/feature/SiteHeader.vue');
 assert.match(gallery,/ArchiveGallery mode="full"/);
 assert.match(header,/content\?\.navigation\.rightNav/);
});
test('Public contract consumes exact pinned 0.7.0 tarball',()=>{
 const release=JSON.parse(read('vendor/content-contracts/RELEASE.json'));
 const pkg=JSON.parse(read('package.json'));
 const lock=JSON.parse(read('package-lock.json'));
 assert.equal(release.version,'0.7.0');
 assert.equal(pkg.dependencies['@smd/content-contracts'],`file:./vendor/content-contracts/${release.tarball}`);
 assert.equal(lock.packages['node_modules/@smd/content-contracts'].version,'0.7.0');
 assert.equal(lock.packages['']['dependencies']['@smd/content-contracts'],pkg.dependencies['@smd/content-contracts']);
});
