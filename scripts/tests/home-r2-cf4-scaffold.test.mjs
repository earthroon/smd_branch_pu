import test from 'node:test';
import assert from 'node:assert/strict';
import { homeHeaderNavigationV2,assertHomeHeaderNavigationV2,validPublishedKakaoUrl } from '../../app/data/home-r2-navigation.ts';
import {admitHomeScaffold,scaffoldAdmissionCurrent,resolveHomeScaffoldPath} from '../../app/utils/homeR2ScaffoldAdmission.ts';
const publication={id:'pub-11',revision:11,at:'2026-10-20T04:57:44.000Z',digest:'a'.repeat(64)};
function render(){return {schema:'SMD_RENDER_RESPONSE_V5',publication:{...publication},requestedPath:'/',resolvedPath:'/',
  shared:{publication:{...publication},siteMedia:{schema:'SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1',publicationId:publication.id,publicationDigest:publication.digest}},
  selected:{mode:'legacy',pageId:'home',templateKind:'legacy-home-v1',slots:{},seo:{title:'Home'}}};}
test('CF4 Figma menu source and exact canonical routes have one owner',()=>{
 assert.doesNotThrow(assertHomeHeaderNavigationV2);
 assert.deepEqual(homeHeaderNavigationV2.items.map(x=>x.label),['아카데미소개','교육과정','수강갤러리','수강후기','Q&A']);
 assert.equal(homeHeaderNavigationV2.cta.label,'상담신청');
});
test('CF4 exact scaffold allowlist excludes unregistered and admin routes',()=>{
 for(const path of ['/reviews','/faq'])assert.equal(resolveHomeScaffoldPath(path),path);
 for(const path of ['/admin','/admin/a','/reviews/','/faq/','/unknown','/about','/'])assert.equal(resolveHomeScaffoldPath(path),null);
});
test('CF4 real V5 home publication is admitted as shared source but never forged selected page',()=>{
 const value=admitHomeScaffold('/reviews',render());
 assert.equal(value.mode,'scaffold');assert.equal(value.routePath,'/reviews');assert.equal(value.sourcePath,'/');
 assert.equal(value.render.requestedPath,'/');assert.equal(value.render.selected.pageId,'home');
 assert.equal(scaffoldAdmissionCurrent(value,'/reviews'),true);
 assert.equal(scaffoldAdmissionCurrent(value,'/faq'),false);
});
test('CF4 stale or malformed home render rejects rather than publishing a fake scaffold',()=>{
 const mutate=(fn)=>{const value=render();fn(value);assert.throws(()=>admitHomeScaffold('/faq',value),/SMD_HOME_R2_SCAFFOLD_SOURCE_IDENTITY_DRIFT/);};
 mutate(x=>x.requestedPath='/reviews');
 mutate(x=>x.resolvedPath='/faq');
 mutate(x=>x.selected.pageId='reviews');
 mutate(x=>x.selected.mode='category');
 mutate(x=>x.publication.digest='b'.repeat(64));
 mutate(x=>x.shared.siteMedia.publicationId='other');
 mutate(x=>x.publication.revision=12);
 mutate(x=>x.shared.publication.at='2020-01-01');
 assert.throws(()=>admitHomeScaffold('/admin',render()),/SMD_HOME_R2_SCAFFOLD_PATH_INVALID/);
});
test('CF4 CTA link retains published Kakao authority and rejects malformed URLs',()=>{
 assert.equal(validPublishedKakaoUrl('https://open.kakao.com/o/sNY9dDwi'),'https://open.kakao.com/o/sNY9dDwi');
 for(const x of [undefined,'javascript:alert(1)','https://example.com','https://open.kakao.com.evil.invalid/o/x','https://open.kakao.com/o/x?redirect=evil'])
   assert.equal(validPublishedKakaoUrl(x),null);
});
