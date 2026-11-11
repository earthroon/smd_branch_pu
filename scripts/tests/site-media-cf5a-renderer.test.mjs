import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const {resolveSiteImageRender,SiteImageRenderError,SITE_MEDIA_CONTAIN_FRAME_CLASS}=await import(
  pathToFileURL(resolve(root,'app/utils/site-media-render.ts'))
);
const inventory=JSON.parse(readFileSync(resolve(root,'docs/site-media/image-slot-inventory.v1.json'),'utf8'));
const sha='a'.repeat(64);
const base=Object.freeze({
  admission:'V5_BINDING_ADMITTED',slotId:'home.hero.image',
  src:`/api/media/image/sm_${sha}`,alt:'테스트 이미지',title:'고정 테스트',
  width:1920,height:1080,displayMode:'natural',
});
const fail=(changes,field)=>assert.throws(()=>resolveSiteImageRender({...base,...changes}),
  e=>e instanceof SiteImageRenderError&&e.code==='SITE_MEDIA_RENDER_INPUT_INVALID'&&e.field===field);

test('natural keeps native dimensions and never uses fixed frame/cropping',()=>{
  const r=resolveSiteImageRender(base);
  assert.equal(r.displayMode,'natural');
  assert.match(r.imageClass,/\bh-auto\b/);
  assert.match(r.imageClass,/\bmax-w-full\b/);
  assert.doesNotMatch(r.imageClass,/object-cover|object-contain|h-full/);
  assert.doesNotMatch(r.frameClass,/aspect-|overflow-hidden/);
  assert.equal(r.width,1920);assert.equal(r.height,1080);
  assert.equal(r.loading,'eager');assert.equal(r.fetchPriority,'high');
  assert.equal(r.src,base.src);
});
test('contain uses fixed slot frame with object-contain and no crop',()=>{
  const r=resolveSiteImageRender({...base,displayMode:'contain'});
  assert.match(r.frameClass,/aspect-\[4\/3\]/);
  assert.match(r.imageClass,/object-contain object-center/);
  assert.doesNotMatch(r.imageClass,/object-cover/);
  assert.equal(r.width,1920);assert.equal(r.height,1080);
});
test('all seven fixed slots have exact inherited contain frames and natural default policy',()=>{
  const frame={
    'home.hero.image':'aspect-[4/3]',
    'home.statement.image':'aspect-[4/3]',
    'home.practiceTeaser.mainImage':'aspect-[16/10]',
    'home.practiceTeaser.secondaryImage':'aspect-[4/3]',
    'about.heroImage':'aspect-[16/7]',
    'about.instructor.image':'aspect-[4/3]',
    'practice.image':'aspect-[16/8]',
  };
  assert.deepEqual(SITE_MEDIA_CONTAIN_FRAME_CLASS,frame);
  const fixed=inventory.entries.filter(v=>v.bindingEligibility==='fixed');
  assert.deepEqual(fixed.map(v=>v.slotId).sort(),Object.keys(frame).sort());
  for(const v of fixed){
    const r=resolveSiteImageRender({...base,slotId:v.slotId,displayMode:v.v5DefaultDisplay});
    assert.equal(r.displayMode,'natural');
    const c=resolveSiteImageRender({...base,slotId:v.slotId,displayMode:'contain'});
    assert.ok(c.frameClass.includes(frame[v.slotId]));
  }
});
test('asset source is admitted same-origin proxy path only',()=>{
  fail({src:'https://example.com/p.png'},'src');
  fail({src:'//example.com/api/media/image/sm_'+sha},'src');
  fail({src:'javascript:alert(1)'},'src');
  fail({src:'/api/archive/media/legacy'},'src');
  fail({src:'/api/media/image/sm_'+sha+'?key=123'},'src');
  fail({src:'/api/media/image/sm_'+sha+'#x'},'src');
  fail({src:'/api/media/image/sm_Z'},'src');
});
test('renderer refuses nonexistent or spoofed admission and dynamic slots',()=>{
  fail({admission:'CANDIDATE'},'admission');
  fail({admission:undefined},'admission');
  for(const v of inventory.entries.filter(v=>v.bindingEligibility!=='fixed'))
    fail({slotId:v.slotId},'slotId');
  fail({slotId:'home.fake.image'},'slotId');
  fail({slotId:'site.header.symbol'},'slotId');
});
test('rejects invalid dimensions, bad text, unknown mode, and schema extension',()=>{
  for(const n of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
    fail({width:n},'width/height');fail({height:n},'width/height');
  }
  fail({width:Number.MAX_SAFE_INTEGER,height:2},'width/height');
  fail({alt:''},'alt');fail({alt:' bad'},'alt');fail({title:'x\n'},'title');
  fail({displayMode:'cover'},'displayMode');
  fail({unknownField:1},'model');
  assert.throws(()=>resolveSiteImageRender(null),e=>e.field==='model');
});
test('pure render-model output is deterministic and input remains unchanged',()=>{
  const sameA=resolveSiteImageRender(base);
  const sameB=resolveSiteImageRender({...base});
  assert.deepEqual(sameA,sameB);
  const previous={...base};
  resolveSiteImageRender(base);
  assert.deepEqual(base,previous);
  assert.equal(sameA.imageClass,resolveSiteImageRender(base).imageClass);
});
test('loading priority comes from slot, never ambient clock or viewport',()=>{
  const secondary=resolveSiteImageRender({...base,slotId:'home.statement.image'});
  assert.equal(secondary.loading,'lazy');assert.equal(secondary.fetchPriority,'auto');
  const about=resolveSiteImageRender({...base,slotId:'about.heroImage'});
  assert.equal(about.loading,'eager');assert.equal(about.fetchPriority,'high');
});
test('component has explicit load-error status without URL fallback or DOM-driven initial state',()=>{
  const vue=readFileSync(resolve(root,'app/components/media/SiteImage.vue'),'utf8');
  assert.match(vue,/loadState=ref<'pending'\|'loaded'\|'failed'>\('pending'\)/);
  assert.match(vue,/function onError\(event:Event\)/);
  assert.match(vue,/eventBelongsToCurrentSource\(event\)/);
  assert.match(vue,/v-if="loadState==='failed'"/);
  assert.doesNotMatch(vue,/window\.|naturalWidth|\?\?[^\n]*src|fallbackSrc/);
});
