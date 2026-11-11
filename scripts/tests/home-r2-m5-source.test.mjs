import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
test('M5 V6 render selection defaults to legacy V5 until explicit opt-in',()=>{
 const server=read('server/api/render.get.ts');
 assert.match(server,/SMD_HOME_R2_V6_RENDER==='true'/);
 assert.match(server,/useV6\?'v6':'v5'/);
 assert.doesNotMatch(server,/\/v6\/render\?path/);
});
test('M5 Home R2 image bytes require distinct active-V6-only proxy, no V5 URL fallthrough',()=>{
 const media=read('server/api/media/home-r2/[assetId].get.ts');
 assert.match(media,/\^sm_\[a-f0-9\]\{64\}\$/);
 assert.match(media,/\/v6\/media\/home-r2/);
 assert.doesNotMatch(media,/\/v5\/media/);
 const frame=read('app/components/home/HomeMediaFrame.vue');
 assert.match(frame,/resolveHomeR2PublicImage/);
 assert.match(frame,/object-fit:contain/);
});
test('M5 Figma source and old category templates are still independent of Home FAQ',()=>{
 const faq=read('app/components/home/HomeFaq.vue');
 assert.match(faq,/<details v-if="rowAt\(index\)"/);
 assert.match(faq,/<summary/);
 assert.doesNotMatch(faq,/={10,}|<script[^>]*dangerouslySetInnerHTML/);
 for(const p of ['about','curriculum','archive','practice','promotion','contact']){
  const page=read(`app/pages/${p}.vue`);
  assert.doesNotMatch(page,/useHomeR2Published|SMD_RENDER_RESPONSE_V6/);
 }
});
