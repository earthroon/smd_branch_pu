import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {verifyCurriculumSource} from '../verify-source.mjs';
import {curriculumR1Source as source} from '../../../app/data/curriculum-r1-manifest.ts';
import {curriculumSourceText as text} from '../../../app/data/curriculum-r1-copy.generated.ts';
import {curriculumSourceAssets as assets} from '../../../app/data/curriculum-r1-assets.generated.ts';
import {curriculumSourceShapes as shapes} from '../../../app/data/curriculum-r1-shapes.generated.ts';
import {curriculumMediaCss,curriculumRenderedWidth} from '../../../app/utils/curriculumR1LayoutMath.ts';
import {resolveCurriculumOperationalState as operational} from '../../../app/utils/curriculumR1Operational.ts';
const root=resolve(import.meta.dirname,'../../..');
test('pinned PSD witnesses, original asset bytes and shared token owners agree',()=>assert.equal(verifyCurriculumSource().status,'PASS'));
test('same layer IDs in different PSDs remain distinct; approved display correction retains source',()=>{
 assert.equal(text['19'].rawText,'20년 경력');assert.equal(source.displayOverrides['19'].text,'6주 과정');
 assert.equal(text['132'].sourceKey,source.psdSha256+':132');
 assert.notEqual(source.psdSha256,'36e2e557bf1e8c1b3101357b28689f84111a83a5d90b61049672416c9549b4e6');
});
test('disabled navy fills and native LINE identity are retained',()=>{
 assert.equal(shapes['17'].sourceFill,'#172C57');assert.equal(shapes['17'].fillEnabled,false);
 assert.equal(shapes['22'].kind,'line');assert.equal(shapes['22'].strokeWidth,.15);
 assert.equal(text['352'].runs[0].sourceColor,'#D95E23');assert.equal(text['352'].runs[0].cssColor,'var(--smd-action-orange)');
 assert.equal(text['426'].runs[0].opacity,.8);
});
test('five CSS affine transforms reproduce independently observed PSD corners after clipping',()=>{
 for(const photo of Object.values(assets.photos)) {
  const {imageStyle}=curriculumMediaCss(photo),[a,b,c,d]=imageStyle.transform.slice(7,-1).split(',').map(Number);
  const [left,top,right,bottom]=photo.frame,w=right-left,h=bottom-top;
  const tx=parseFloat(imageStyle.left)/100*w,ty=parseFloat(imageStyle.top)/100*h;
  for(const [i,x,y] of [[0,0,0],[1,photo.sourceWidth,0],[2,photo.sourceWidth,photo.sourceHeight],[3,0,photo.sourceHeight]]) {
   assert.ok(Math.abs(a*x+c*y+tx-(photo.sourceTransform[i*2]-left))<1e-7);
   assert.ok(Math.abs(b*x+d*y+ty-(photo.sourceTransform[i*2+1]-top))<1e-7);
  }
 }
});
test('invalid image matrices and viewports refuse explicitly',()=>{
 const p=assets.photos['curriculum.hero.photo'];
 for(const sourceToFrame of [[0,0,0,0,0,0],[NaN,0,0,1,0,0],[1,0,0,1,0]])
  assert.throws(()=>curriculumMediaCss({...p,sourceToFrame}),/MEDIA_GEOMETRY_INVALID/);
 for(const v of [0,-1,NaN,Infinity])assert.throws(()=>curriculumRenderedWidth(v),/VIEWPORT_INVALID/);
});
test('reference artboard retains PSD pixels independently of homepage compaction',()=>{
 for(const [v,w] of [[1380,1380],[1440,1440],[1920,1920],[2560,1920]])assert.equal(curriculumRenderedWidth(v),w);
 const photo=assets.photos['curriculum.hero.photo'];
 assert.equal((photo.frame[2]-photo.frame[0])*curriculumRenderedWidth(1920)/source.sourceWidth,590);
});
const fixture=()=>{
 const slots={afterTeach:[{id:'a'}],afterLearningPath:[{id:'b'}],beforeCta:[{id:'c'}]};
 const c={publication:{id:'pub',digest:'digest'},navigation:{kakaoUrl:'https://open.kakao.com/o/abc123'},pageSlots:{curriculum:slots}};
 const s={path:'/curriculum',publicationId:'pub',publicationDigest:'digest',selected:{mode:'legacy',pageId:'curriculum'}};
 return {c,s,slots};
};
test('one matching publication supplies the operational URL and all three original slots',()=>{
 const {c,s,slots}=fixture(),r=operational(c,s,'/curriculum');
 assert.equal(r.publicationKey,'pub:digest');assert.equal(r.consultationUrl,c.navigation.kakaoUrl);
 for(const k of Object.keys(slots))assert.equal(r[k],slots[k]);
});
test('other routes, stale identities and other selected page kinds are not consumed',()=>{
 const {c,s}=fixture();
 for(const [a,b,path] of [[c,s,'/about'],[null,s,'/curriculum'],[c,null,'/curriculum'],
  [c,{...s,publicationDigest:'old'},'/curriculum'],[c,{...s,publicationId:'old'},'/curriculum'],
  [c,{...s,path:'/about'},'/curriculum'],[c,{...s,selected:{mode:'category'}},'/curriculum'],
  [c,{...s,selected:{mode:'legacy',pageId:'about'}},'/curriculum']])assert.equal(operational(a,b,path),null);
});
test('invalid consultation URLs remain unavailable without a replacement destination',()=>{
 const {c,s}=fixture();
 for(const url of ['https://example.com/','javascript:alert(1)','https://open.kakao.com/o/abc?x=1',''])
  assert.equal(operational({...c,navigation:{kakaoUrl:url}},s,'/curriculum').consultationUrl,null);
});
test('corrupted original image bytes fail the source verifier',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'curriculum-corrupt-'));
 try {
  mkdirSync(resolve(dir,'docs/migration/smd-curriculum-r1'),{recursive:true});
  writeFileSync(resolve(dir,'docs/migration/smd-curriculum-r1/source-manifest.json'),readFileSync(resolve(root,'docs/migration/smd-curriculum-r1/source-manifest.json')));
  mkdirSync(resolve(dir,'public/curriculum'),{recursive:true});
  const first=Object.values(assets.photos)[0];writeFileSync(resolve(dir,'public/curriculum',first.fileName),'corrupted');
  assert.throws(()=>verifyCurriculumSource(dir),/AssertionError/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
