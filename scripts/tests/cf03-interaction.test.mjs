import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, cpSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { validateCf03 } from '../cf03-interaction-static.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const read=rel=>readFileSync(join(root,rel),'utf8');
const baseline=JSON.parse(read('docs/migration/cf00/content-baseline.json')).original;
const ref=JSON.parse(read('docs/migration/cf03/source-reference.json'));
const routes=JSON.parse(read('scripts/tests/fixtures/cf03-route-navigation.json'));
const archives=JSON.parse(read('scripts/tests/fixtures/cf03-archive-categories.json'));

// Evaluates the ACTUAL <script setup> body, with model implementations of
// Vue reactivity/lifecycle and the browser Observer API. This is NOT a Vue mount,
// Nuxt SSR, DOM/hydration, Playwright, or Cloudflare runtime test.
function createModel({ currentPath='/',scrollY=16,overflow='auto',intersections=true,content }={}) {
  const listeners=new Map();
  const installed=[];
  const removed=[];
  const mounts=[];
  const unmounts=[];
  const reactiveWatches=[];
  const routeWatches=[];
  let componentAlive=true;
  const route={ path:currentPath };
  const state={
    document:{body:{style:{overflow}}},
    window:{
      scrollY,
      addEventListener(type,cb,opts){ installed.push({type,cb,opts});listeners.set(cb,type); },
      removeEventListener(type,cb){ removed.push({type,cb});listeners.delete(cb); },
    },
    observerInstances:[],
  };
  class FakeIntersectionObserver {
    constructor(callback, options){this.callback=callback;this.options=options;this.observed=[];this.unobserved=[];this.disconnects=0;state.observerInstances.push(this);}
    observe(node){this.observed.push(node);}
    unobserve(node){this.unobserved.push(node);}
    disconnect(){this.disconnects++;}
    emit(entries){this.callback(entries);}
  }
  if(intersections)state.window.IntersectionObserver=FakeIntersectionObserver;
  const refFn=(initial)=>{
    let value=initial;
    const r={ __watchers:[] };
    Object.defineProperty(r,'value',{
      get(){return value;},
      set(next){const before=value; value=next; if(componentAlive&&before!==next) for(const cb of r.__watchers)cb(next,before);},
      enumerable:true
    });
    return r;
  };
  const watch=(dep,cb)=>{
    if(typeof dep==='function')routeWatches.push({read:dep,cb,last:dep()});
    else reactiveWatches.push({dep,cb}),dep.__watchers.push(cb);
  };
  const api={
    ref:refFn,
    computed:fn=>({get value(){return fn();}}),
    watch,
    onMounted:fn=>mounts.push(fn),
    onUnmounted:fn=>unmounts.push(fn),
    useSiteContent:()=>({value:content??{navigation:{leftNav:baseline.leftNav,rightNav:baseline.rightNav,kakaoUrl:baseline.KAKAO_URL,contactPhone:baseline.CONTACT_PHONE,instagramUrl:baseline.INSTAGRAM_URL,youtubeUrl:baseline.YOUTUBE_URL},archive:{filters:baseline.archiveFilters,items:baseline.archiveItems}}}),
    useRoute:()=>route,
    useSeoMeta:()=>{},
    withDefaults:(_props,defaults)=>defaults,
    defineProps:()=>({}),
    window:state.window,
    document:state.document,
    IntersectionObserver:FakeIntersectionObserver,
  };
  function execute(relativeFile, names) {
    const source=read(relativeFile);
    const script=source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1];
    assert(script,`<script setup> missing in ${relativeFile}`);
    // Test transport adaptations only: importing a .vue SFC is unsupported in Node,
    // and import.meta.client is a compile-time Nuxt macro. No behavior math changed.
    const prepared=stripTypeScriptTypes(script.replace(/^import\s+[^\n]+;\s*$/gm,'').replaceAll('import.meta.client','true'));
    return new Function(...Object.keys(api),`${prepared}\nreturn { ${names.join(',')} };`)(...Object.values(api));
  }
  return {
    state,api,execute,
    mount(){for(const fn of mounts)fn();},
    unmount(){for(const fn of unmounts)fn();componentAlive=false;},
    setPath(next){ route.path=next;for(const w of routeWatches){const v=w.read();if(v!==w.last){const prev=w.last;w.last=v;if(componentAlive)w.cb(v,prev);}} },
    scroll(next){state.window.scrollY=next;for(const [cb,type] of listeners)if(type==='scroll')cb();},
    get installed(){return installed;},get removed(){return removed;},get listenerCount(){return listeners.size;},
  };
}

function mutate(rel, before, after, expectedCheck) {
  const directory=mkdtempSync(join(tmpdir(),'smd-cf03-neg-'));
  const dst=join(directory,'candidate');
  try {
    cpSync(root,dst,{recursive:true,filter:p=>!['node_modules','.nuxt','.output','.git'].includes(p.split(/[\\/]/).at(-1))});
    const path=join(dst,rel);
    const text=readFileSync(path,'utf8');
    assert(text.includes(before),`mutation precondition failed ${rel}: ${before.slice(0,60)}`);
    writeFileSync(path,text.replace(before,after),'utf8');
    const report=validateCf03(dst);
    assert(!report.pass,`mutation wrongly admitted: ${rel}`);
    assert(report.failures.some(x=>x.name===expectedCheck),`expected ${expectedCheck}, got ${report.failures.map(x=>x.name).join('|')}`);
  }finally{rmSync(directory,{force:true,recursive:true});}
}

test('CF03 source/static contract admits the one-file candidate (without claiming runtime)',()=>{
  const report=validateCf03(root);
  assert(report.pass,JSON.stringify(report.failures));
  assert.deepEqual(report.scope.modifiedParentFiles,['app/pages/contact.vue']);
  assert.equal(report.evidence.promoted,false);
  assert.equal(report.evidence.browser,'UNKNOWN');
});

test('real SiteHeader script model: mount, scroll 16/17/16, passive cleanup',()=>{
  const m=createModel();const h=m.execute('app/components/feature/SiteHeader.vue',['open','scrolled','nav','isActive']);
  m.mount();
  assert.equal(m.installed.length,1);
  assert.deepEqual(m.installed[0].opts,{passive:true});
  assert.equal(h.scrolled.value,false);
  m.scroll(17);assert.equal(h.scrolled.value,true);
  m.scroll(16);assert.equal(h.scrolled.value,false);
  assert.equal(h.nav.value.length,6);
  assert.equal(h.isActive('/'),true);
  assert.equal(h.isActive('/about'),false);
  m.setPath('/about');assert.equal(h.isActive('/about'),true);
  m.unmount();assert.equal(m.listenerCount,0);assert.equal(m.removed.length,1);
});

test('real SiteHeader script model: drawer lock ownership and route close',()=>{
  const m=createModel({currentPath:'/curriculum',overflow:'clip'});
  const h=m.execute('app/components/feature/SiteHeader.vue',['open','scrolled']);
  m.mount();
  h.open.value=true;
  assert.equal(m.state.document.body.style.overflow,'hidden');
  m.setPath('/archive');
  assert.equal(h.open.value,false);
  assert.equal(m.state.document.body.style.overflow,'clip');
  h.open.value=true;
  h.open.value=false;
  assert.equal(m.state.document.body.style.overflow,'clip');
  h.open.value=true;
  m.unmount();
  assert.equal(m.state.document.body.style.overflow,'clip');
});

test('real SiteHeader script model: same-route click policy not silently introduced',()=>{
  const m=createModel({currentPath:'/archive'});
  const h=m.execute('app/components/feature/SiteHeader.vue',['open']);m.mount();
  h.open.value=true;m.setPath('/archive');
  assert.equal(h.open.value,true,'source pathname watcher only closes on actual path change');
  m.unmount();
});

test('real ArchiveGallery script: original six filter counts, exact order and reset',()=>{
  const m=createModel();
  const {active,filtered}=m.execute('app/components/feature/ArchiveGallery.vue',['active','filtered']);
  for(const [category,count] of Object.entries(archives.frozenCountByFilter)){
    active.value=category;
    assert.equal(filtered.value.length,count,category);
    assert(filtered.value.every(item=>category==='ALL'||item.category===category));
  }
  active.value='ALL';assert.deepEqual(filtered.value.map(x=>x.title),archives.sourceItems.map(x=>x.title));
  active.value='없는 분류';assert.deepEqual(filtered.value,[],'unknown category must not silently select ALL');
});

test('real ArchiveGallery script: no canonical array mutation on repeated filters',()=>{
  const items=structuredClone(baseline.archiveItems);
  const m=createModel({content:{archive:{filters:baseline.archiveFilters,items},navigation:{}}});
  const {active,filtered}=m.execute('app/components/feature/ArchiveGallery.vue',['active','filtered']);
  for(let i=0;i<30;i++){
    active.value=i%2?'수강생 작업':'ALL';void filtered.value;
  }
  assert.deepEqual(items,baseline.archiveItems);
});

test('real Reveal script model: non-intersection, intersection unobserve, dispose',()=>{
  const m=createModel();const {el,visible}=m.execute('app/components/feature/Reveal.vue',['el','visible','props']);
  el.value={id:'reveal-1'};
  assert.equal(visible.value,false);
  m.mount();
  const [io]=m.state.observerInstances;
  assert(io);
  assert.equal(io.options.threshold,0.14);
  assert.equal(io.options.rootMargin,'0px 0px -40px 0px');
  assert.equal(io.observed.length,1);
  io.emit([{target:el.value,isIntersecting:false}]); assert.equal(visible.value,false);
  io.emit([{target:el.value,isIntersecting:true}]); assert.equal(visible.value,true);
  assert.equal(io.unobserved.length,1);
  m.unmount();assert.equal(io.disconnects,1);
});

test('real Reveal script model: callback after unmount never promotes visibility',()=>{
  const m=createModel();const {el,visible}=m.execute('app/components/feature/Reveal.vue',['el','visible']);
  el.value={id:'reveal-2'};m.mount();
  const io=m.state.observerInstances[0];
  m.unmount();io.emit([{target:el.value,isIntersecting:true}]);
  assert.equal(visible.value,false);
});

test('real Reveal script model: absent IntersectionObserver admits visibility',()=>{
  const m=createModel({intersections:false});const {el,visible}=m.execute('app/components/feature/Reveal.vue',['el','visible']);
  el.value={id:'reveal-3'};m.mount();
  assert.equal(visible.value,true);
  assert.equal(m.state.observerInstances.length,0);
  m.unmount();
});

test('real contact script model: phone digits and 3 published external links',()=>{
  const m=createModel();const {channels}=m.execute('app/pages/contact.vue',['channels']);
  const items=channels.value;
  assert.equal(items.length,4);
  assert.equal(items.find(x=>x.label==='전화 상담').href,'tel:'+baseline.CONTACT_PHONE.replace(/[^0-9]/g,''));
  assert.deepEqual(items.filter(x=>!x.href.startsWith('tel:')).map(x=>x.href),[baseline.KAKAO_URL,baseline.INSTAGRAM_URL,baseline.YOUTUBE_URL]);
  assert.equal(routes.phone.target,'_blank');
});

test('frozen route and source archive fixtures preserve all link destinations',()=>{
  assert.deepEqual(routes.paths,ref.routes);
  assert.equal(routes.navigation.left.length+routes.navigation.right.length,6);
  assert.equal(routes.notFound.expectedHttpStatus,404);
  assert.equal(routes.phone.href,ref.sourceInteraction.phoneUri);
});

const negatives=[
  ['N01 new archive detail route is forbidden','app/pages/archive.vue','<ArchiveGallery />','<NuxtLink to="/archive/extra">Extra</NuxtLink><ArchiveGallery />','no invented archive detail route'],
  ['N02 archive article navigation is forbidden','app/components/feature/ArchiveGallery.vue','<article class="group cursor-pointer">','<article class="group cursor-pointer" @click="navigateTo(\'/archive/fake\')">','archive card has no invented navigation'],
  ['N03 category substring matching is forbidden','app/components/feature/ArchiveGallery.vue','i.category===active.value','i.category.includes(active.value)','archive filter exact category equality'],
  ['N04 scroll 16px boundary is strict','app/components/feature/SiteHeader.vue','window.scrollY > 16','window.scrollY >= 16','header 16 pixel strict scroll'],
  ['N05 listener cleanup cannot vanish','app/components/feature/SiteHeader.vue',"window.removeEventListener('scroll', onScroll);",'// removed scroll cleanup','header scroll cleanup'],
  ['N06 prior overflow must restore exactly','app/components/feature/SiteHeader.vue','document.body.style.overflow = bodyOverflowBeforeDrawer;','document.body.style.overflow = \'\';','drawer lock stores exact prior overflow'],
  ['N07 Reveal callback disposal guard is mandatory','app/components/feature/Reveal.vue','!disposed && entry.isIntersecting','entry.isIntersecting','Reveal late callback guard'],
  ['N08 Reveal fallback cannot vanish','app/components/feature/Reveal.vue',"!('IntersectionObserver' in window)","'IntersectionObserver' in window",'Reveal no-IO fallback'],
  ['N09 external safe rel is mandatory','app/components/feature/CtaBand.vue','rel="noopener noreferrer"','rel="noreferrer"','CTA external native safe link'],
  ['N10 no manual internal navigation','app/components/feature/SiteHeader.vue','const isActive =','function dead(){ event.preventDefault(); router.push(\'/\'); }\nconst isActive =','header internal links never manually suppressed'],
  ['N11 unknown URL must retain error status','app/error.vue','setResponseStatus(event, effectiveStatus.value)','setResponseStatus(event, 200)','404 server HTTP status preserved'],
  ['N12 CMS failure cannot render 200','app/app.vue','throw toPublicContentError(error.value)','return null;','CMS unavailable fails closed'],
  ['N13 active is pathname not substring','app/components/feature/SiteHeader.vue','route.path === to','route.path.includes(to)','header path exact equality'],
  ['N14 CSS is frozen','app/assets/css/main.css','@tailwind base;','/* layout change */\n@tailwind base;','source CSS byte parity preserved'],
  ['N15 Worker is frozen','workers/smd-core/src/index.ts','export ', '/* changed Worker */\nexport ', 'no out-of-scope file modifications'],
  ['N16 phone is published not hardcoded','app/pages/contact.vue','c.value?.navigation.contactPhone??\'\'','\'0505-738-2101\'','contact published phone to digits URI'],
  ['N17 no unmeasured scroll policy','app/components/feature/SiteHeader.vue','function onScroll() {','function onScroll() { window.scrollTo(0,0);','global router scroll policy not invented'],
  ['N18 tel original target cannot silently disappear','app/pages/contact.vue','target="_blank"','target="_self"','contact source tel target restored'],
];
for(const [title,rel,before,after,gate] of negatives){
  test(`negative ${title}`,()=>mutate(rel,before,after,gate));
}
