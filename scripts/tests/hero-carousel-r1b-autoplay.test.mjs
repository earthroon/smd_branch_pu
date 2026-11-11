/** Historical R1B lease regression, migrated for R2 timer ownership.
 * VM-executes the actual syncAutoplay() body, never mocks a different algorithm.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const source=readFileSync(resolve(root,'app/components/home/HomeHeroCarousel.vue'),'utf8');
const start=source.indexOf('function syncAutoplay(): void {');
const end=source.indexOf('function finishTransition(',start);
assert.ok(start>=0&&end>start,'HERO_R2_SYNC_AUTOPLAY_EXTRACTION_FAILED');
const code=source.slice(start,end).replace('function syncAutoplay(): void {','function syncAutoplay() {');
function harness({mounted=true,canPlay=true,lease=null,count=3}={}){
  const trace=[];
  const env={
    mounted,canPlay:{value:canPlay},slides:{value:Array.from({length:count},(_,i)=>({order:i}))},
    autoplayLease:{value:lease},instanceId:'instance-r2',autoplayTimer:null,
    clearAutoplay(){trace.push(['clear']);env.autoplayTimer=null;},
    setTimeout(callback,ms){trace.push(['schedule',ms]);return {callback};},
    HERO_CAROUSEL_DELAY_MS:3000,
    selectedIndex:{value:0},
    nextHeroDissolveIndex:(i)=>i+1,
    requestTransition:(i,reason)=>trace.push(['go',i,reason]),
  };
  const api=vm.runInNewContext(`${code}\nsyncAutoplay`,env);
  return {api,env,trace};
}
test('R1B/R2: hidden, unmounted or single-image owner never creates a timer',()=>{
  for(const args of [{mounted:false},{canPlay:false},{count:1}]){
    const h=harness(args);
    h.api();
    assert.equal(h.env.autoplayTimer,null);
    assert.equal(h.env.autoplayLease.value,null);
    assert.deepEqual(h.trace,[['clear']]);
  }
});
test('R1B/R2: active owner claims exactly one 3000ms timer',()=>{
  const h=harness();
  h.api();
  h.api();
  assert.deepEqual(h.trace,[['schedule',3000]]);
  assert.equal(h.env.autoplayLease.value,'instance-r2');
  h.env.autoplayTimer.callback();
  assert.deepEqual(h.trace.slice(-1),[['go',1,'auto']]);
});
test('R1B/R2: another responsive instance lease is not stolen',()=>{
  const h=harness({lease:'other-instance'});
  h.api();
  assert.equal(h.env.autoplayLease.value,'other-instance');
  assert.deepEqual(h.trace,[['clear']]);
});
test('R1B/R2: losing eligibility clears timer before lease release',()=>{
  const h=harness({canPlay:false,lease:'instance-r2'});
  h.env.autoplayTimer={callback:()=>{}};
  h.api();
  assert.equal(h.env.autoplayTimer,null);
  assert.equal(h.env.autoplayLease.value,null);
  assert.deepEqual(h.trace,[['clear']]);
});
test('R1B/R2: unmount path cannot reacquire released lease',()=>{
  assert.match(source,/if \(!mounted \|\| !canPlay\.value \|\| slides\.value\.length < 2\)/);
  assert.match(source,/onBeforeUnmount\(\(\) => \{[\s\S]*?mounted = false;[\s\S]*?clearAutoplay\(\)/);
});
