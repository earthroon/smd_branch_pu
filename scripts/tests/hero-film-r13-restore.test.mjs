import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  initialFilmSelection, reduceFilmSelection, filmImageAtPoint,
} from '../../app/utils/homeFilmSelection.ts';
import {
  homeFilmAssets, homeFilmEditorial, homeFilmEditorialAdmissions,
  homeFilmEditorialReady, admitFilmEditorial,
} from '../../app/data/home-film.ts';

const source = path => readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const intent = (state, value) => reduceFilmSelection(state,value);
const hover = (state,id,generation) => intent(state,{kind:'hover-candidate',imageId:id,pointerGeneration:generation}).state;
const admit = (state,id,generation) => intent(state,{kind:'hover-admit',imageId:id,pointerGeneration:generation}).state;
const commit = (state,id,origin='pointer') => intent(state,{kind:'commit',imageId:id,origin});

test('CF1: candidate is not preview; dwell promotes only current id and generation',()=>{
 const initial=initialFilmSelection();
 const candidate=hover(initial,'hero-1',1);
 assert.equal(candidate.kind,'idle');
 const preview=admit(candidate,'hero-1',1);
 assert.equal(preview.kind,'preview');assert.equal(preview.imageId,'hero-1');
 const newCandidate=hover(preview,'hero-2',2);
 assert.equal(newCandidate.kind,'idle');
 assert.equal(admit(newCandidate,'hero-1',1),newCandidate);
 assert.equal(admit(newCandidate,'hero-1',2),newCandidate);
 const next=admit(newCandidate,'hero-2',2);
 assert.equal(next.kind,'preview');assert.equal(next.imageId,'hero-2');
});

test('CF1: commit is atomic, same-id no-op, pointerleave never releases committed',()=>{
 let current=admit(hover(initialFilmSelection(),'hero-1',1),'hero-1',1);
 const a=commit(current,'hero-1');
 assert.equal(a.effect.kind,'committed');assert.equal(a.state.kind,'committed');
 assert.equal(commit(a.state,'hero-1').state,a.state);
 const afterLeave=intent(a.state,{kind:'hover-leave',pointerGeneration:a.state.pointerGeneration}).state;
 assert.equal(afterLeave.kind,'committed');assert.equal(afterLeave.imageId,'hero-1');
 const b=commit(afterLeave,'hero-2');
 assert.equal(b.state.kind,'committed');assert.equal(b.state.imageId,'hero-2');
 assert.equal(b.state.generation,afterLeave.generation+1);
 assert.equal(intent(b.state,{kind:'hover-admit',imageId:'hero-1',pointerGeneration:1}).state,b.state);
});

test('CF1: explicit release passes releasing generation before idle, stale completions rejected',()=>{
 const state=commit(initialFilmSelection(),'hero-3').state;
 const released=intent(state,{kind:'release',origin:'keyboard'});
 assert.equal(released.state.kind,'releasing');
 assert.equal(intent(released.state,{kind:'release-complete',generation:state.generation}).state,released.state);
 const done=intent(released.state,{kind:'release-complete',generation:released.state.generation}).state;
 assert.equal(done.kind,'idle');assert.equal(done.hoverCandidateId,null);
});

test('CF1: unknown image IDs fail closed without accepting first image',()=>{
 assert.throws(()=>commit(initialFilmSelection(),'missing-image'),/FILM_IMAGE_ID_UNKNOWN/);
 assert.throws(()=>hover(initialFilmSelection(),'missing-image',1),/FILM_IMAGE_ID_UNKNOWN/);
});

test('CF1: physical copy index does not become selection identity; CSS pointer geometry retains position',()=>{
 const slots=[
  {imageId:'hero-2',left:100,right:200,top:20,bottom:120},
  {imageId:'hero-1',left:200,right:310,top:20,bottom:120},
  {imageId:'hero-2',left:310,right:400,top:20,bottom:120},
 ];
 assert.equal(filmImageAtPoint(slots,118,60),'hero-2');
 assert.equal(filmImageAtPoint(slots,340,100),'hero-2');
 assert.equal(filmImageAtPoint(slots,208,80),'hero-1');
 assert.equal(filmImageAtPoint(slots,5,80),null);
 assert.equal(filmImageAtPoint(slots,Infinity,80),null);
 assert.throws(()=>filmImageAtPoint([{...slots[0],imageId:'forged'}],120,60),/FILM_IMAGE_ID_UNKNOWN/);
});

test('CF1: one Nuxt useState owner and inert clones, no separate local selected state',()=>{
 const v=source('app/components/home/HomeHeroFilm.vue');
 assert.match(v,/useState\('smd-home-film-selection-r13',initialFilmSelection\)/);
 assert.match(v,/reduceFilmSelection\(selection\.value,intent\)/);
 assert.match(v,/:data-film-image-id="asset\.id"/);
 assert.match(v,/aria-hidden="true" inert/);
 assert.doesNotMatch(v,/const selected\s*=\s*ref\(/);
 assert.doesNotMatch(v,/requestAnimationFrame/);assert.match(v,/decideFilmFocus/);
 assert.match(v,/@pointermove="move"/);
 assert.match(v,/@keydown="key"/);
 assert.match(v,/if\(selection\.value\.kind!=='committed'/);
});

test('CF2: unavailable metadata remains explicit, no auto copy from alt',()=>{
 assert.equal(homeFilmAssets.length,3);
 assert.equal(homeFilmEditorialReady,false);
 assert.equal(homeFilmEditorialAdmissions.length,3);
 for(const asset of homeFilmAssets){
  assert.equal(homeFilmEditorial[asset.id].kind,'unavailable');
  assert.equal(homeFilmEditorial[asset.id].imageId,asset.id);
  assert.equal(homeFilmEditorial[asset.id].reason,'APPROVED_EDITORIAL_MISSING');
 }
 const manifest=source('app/data/home-film.ts');
 assert.doesNotMatch(manifest,/title:\s*(?:asset|image)\.alt/);
});

test('CF2: approved fixture validates identity/description/revision/URL, rejects invented or unsafe href',()=>{
 const valid={kind:'approved',imageId:'hero-1',title:'source-verified title',description:'source-verified caption',href:'/about',sourceRevision:'fixture-r1'};
 assert.equal(admitFilmEditorial('hero-1',valid,new Set(['/about'])).linkKind,'internal');
 assert.throws(()=>admitFilmEditorial('hero-1',valid),/FILM_TITLE_TARGET_INVALID/);
 assert.equal(admitFilmEditorial('hero-1',{...valid,href:'https://example.org/work'}).linkKind,'external');
 assert.throws(()=>admitFilmEditorial('hero-2',valid),/FILM_TITLE_IDENTITY_DRIFT/);
 assert.throws(()=>admitFilmEditorial('hero-1',{...valid,title:'  '}),/FILM_TITLE_METADATA_UNAVAILABLE/);
 assert.throws(()=>admitFilmEditorial('hero-1',{...valid,href:'javascript:alert(1)'}),/FILM_TITLE_TARGET_INVALID/);
 assert.throws(()=>admitFilmEditorial('hero-1',{...valid,href:'//example.org'}),/FILM_TITLE_TARGET_INVALID/);
});

test('CF2: SSR semantic records keep distinct native navigation, button and clone ownership',()=>{
 const component=source('app/components/home/HomeHeroFilm.vue');
 assert.match(component,/class="smd-hero-film__semantic"/);
 assert.match(component,/v-for="item in editorial"/);
 assert.match(component,/<figcaption v-if="item\.source\.kind==='approved'"/);
 assert.match(component,/<NuxtLink v-if="item\.source\.linkKind==='internal'"/);
 assert.match(component,/<a v-else :href="item\.source\.href"/);
 assert.match(component,/<button type="button" class="smd-hero-film__commit"/);
 assert.doesNotMatch(component,/router\.push|preventDefault\(\).*router/);
 assert.match(component,/:data-film-editorial-admission="editorialStatus"/);
});

test('CF2: Figma/H1 frozen and motion references unchanged',()=>{
 const component=source('app/components/home/HomeHeroFilm.vue');
 assert.match(component,/curve\.enterMs/);assert.match(component,/curve\.leaveMs/);
 assert.match(component,/iterations:loop\?Infinity:1/);
 assert.match(component,/setKeyframes/);
 assert(!component.includes('data-figma-node="node-35:5"'));
 const home=source('app/components/home/HeroSection.vue');
 assert.match(home,/<h1/);
});
