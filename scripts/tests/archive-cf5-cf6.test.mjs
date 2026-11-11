import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {archiveView} from '../../app/utils/archive-view.ts';
const file=(name)=>readFileSync(new URL('../../'+name,import.meta.url),'utf8');
const video={kind:'archive-collection',schemaVersion:2,items:[
 {id:'video-001',title:'현장 영상',description:'시공 과정',sortOrder:20,visible:true,
  media:{kind:'youtube',youtubeId:'M7lc1UVf-VE',posterKey:null}},
 {id:'image-001',title:'현장 사진',description:'필름 재단',sortOrder:10,visible:true,
  media:{kind:'image',assetKey:`archive/${'a'.repeat(64)}.webp`,alt:'필름 재단'}},
 {id:'hidden-001',title:'비공개',description:'아직 준비 중',sortOrder:0,visible:false,media:null}
]};
test('V4 view removes hidden and sorts deterministically',()=>{
 const items=archiveView(video);assert.deepEqual(items.map(x=>x.id),['image-001','video-001']);
});
test('historical cards do not leak category tags and preserve image',()=>{
 const old={filters:['ALL','문틀'],items:[{title:'사진',sub:'수업',category:'문틀',image:'https://example.com/a.jpg'}]};
 const items=archiveView(old);assert.equal(items.length,1);assert.equal(items[0].media.kind,'legacy-image');
 assert.equal(Object.hasOwn(items[0],'category'),false);
});
test('gallery has more route and click-to-mount iframe',()=>{
 const list=file('app/components/archive/ArchiveGallery.vue');
 assert.match(list, /to="\/archive"/);
 assert.match(list,/slice\(0,3\)/);
 assert.doesNotMatch(list,/archive\.filters|item\.category/);
 const player=file('app/components/archive/ArchiveYoutubePlayer.vue');
 assert.match(player, /v-if="playing"/);
 assert.match(player, /www\.youtube\.com\/embed/);
});
test('Public must keep Access credentials out of service proxy',()=>{
 const core=file('server/utils/public-core.ts');
 assert.doesNotMatch(core,/headers\.set\('Cf-Access-Jwt-Assertion'/);
 assert.match(core,/\/v4\\\/archive/);
});
