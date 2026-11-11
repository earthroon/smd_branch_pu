import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveAboutOperationalState} from '../../../app/utils/aboutR1Operational.ts';
const after=[{id:'notice-a',kind:'notice',schemaVersion:1,props:{heading:'안내',body:'본문',tone:'neutral'}}];
const before=[{id:'notice-b',kind:'notice',schemaVersion:1,props:{heading:'상담',body:'본문',tone:'neutral'}}];
const content={publication:{id:'pub-a',digest:'a'.repeat(64),revision:1,at:'2026-11-03T00:00:00Z'},
 navigation:{kakaoUrl:'https://open.kakao.com/o/abc123'},pageSlots:{about:{afterPillars:after,beforeCta:before}}};
const selected={path:'/about',publicationId:'pub-a',publicationDigest:'a'.repeat(64),selected:{mode:'legacy',pageId:'about'}};
test('the same publication owns both URL and original CMS slot nodes',()=>{
 const r=resolveAboutOperationalState(content,selected,'/about');
 assert.equal(r.consultationUrl,content.navigation.kakaoUrl);
 assert.equal(r.afterAudience,after);assert.equal(r.beforeCta,before);
});
test('stale route, missing state, wrong page or mixed publication consumes nothing',()=>{
 for(const [c,s,path]of [
  [null,selected,'/about'],[content,null,'/about'],[content,selected,'/'],
  [content,{...selected,path:'/archive'},'/about'],
  [content,{...selected,publicationId:'pub-b'},'/about'],
  [content,{...selected,publicationDigest:'b'.repeat(64)},'/about'],
  [content,{...selected,selected:{mode:'legacy',pageId:'home'}},'/about'],
 ])assert.equal(resolveAboutOperationalState(c,s,path),null);
});
test('invalid URLs remain unavailable rather than introducing an address',()=>{
 for(const kakaoUrl of ['',null,'http://open.kakao.com/o/a','https://example.com/o/a','https://open.kakao.com/o/a?x=1'])
  assert.equal(resolveAboutOperationalState({...content,navigation:{kakaoUrl}},selected,'/about').consultationUrl,null);
});
