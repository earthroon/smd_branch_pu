import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  HomeR2PublicV6Error,resolveHomeR2PublicImage,validateHomeR2PublicProjection,
} from '../../.home-r2-m5-build/utils/home-r2-v6-public.js';
import {homeR2Source} from '../../.home-r2-m5-build/data/home-r2-manifest.js';
const digest='a'.repeat(64),assetId=`sm_${'f'.repeat(64)}`;
const pub={id:'123e4567-e89b-42d3-a456-426614174000',digest};
const make=()=>({contract:'SMD_HOME_R2_PUBLIC_V1',publicationId:pub.id,publicationDigest:pub.digest,
 sourceSnapshotDigest:homeR2Source.sourceSnapshotDigest,sourceWitnessDigest:homeR2Source.sourceWitnessDigest,
 draftRevision:2,draftDigest:'c'.repeat(64),faq:[{id:'home.faq.01',question:'교육은 어떻게 진행되나요?',answer:'실습 중심 과정입니다.',visible:true}],
 mediaBindings:[{slotId:'home.methods.01.image',assetId,alt:'실습 장면',title:'훈련',displayMode:'contain'}],
 assets:[{assetId,width:491,height:416,mimeType:'image/png'}]});
const bad=(code)=>(e)=>e instanceof HomeR2PublicV6Error&&e.code===code;
test('M5 V6 projection current identity, approved FAQ and image resolve',()=>{
 const p=make();assert.equal(validateHomeR2PublicProjection(p,pub),p);
 assert.equal(resolveHomeR2PublicImage(p,pub,'home.methods.01.image').src,`/api/media/home-r2/${assetId}`);
 assert.equal(resolveHomeR2PublicImage(p,pub,'home.methods.02.image'),null);
});
test('M5 stale Publication never resolves Home R2 image',()=>{
 assert.throws(()=>resolveHomeR2PublicImage(make(),{...pub,digest:'b'.repeat(64)},'home.methods.01.image'),bad('SMD_HOME_M4_V6_PROJECTION_INVALID'));
});
test('M5 unknown slot, duplicate slot, missing asset fail closed',()=>{
 const p=make();assert.throws(()=>resolveHomeR2PublicImage(p,pub,'home.hero.image'),bad('SMD_HOME_M4_V6_SLOT_INVALID'));
 assert.throws(()=>validateHomeR2PublicProjection({...p,mediaBindings:[...p.mediaBindings,...p.mediaBindings]},pub),bad('SMD_HOME_M4_V6_MEDIA_BINDING_INVALID'));
 assert.throws(()=>validateHomeR2PublicProjection({...p,assets:[]},pub),bad('SMD_HOME_M4_V6_MEDIA_ASSETS_INVALID'));
});
test('M5 FAQ input corruption, placeholder, HTML and ordering refused',()=>{
 const p=make();for(const question of ['================','<script>alert(1)</script>',''])
   assert.throws(()=>validateHomeR2PublicProjection({...p,faq:[{...p.faq[0],question}]},pub),bad('SMD_HOME_M4_V6_FAQ_INVALID'));
 assert.throws(()=>validateHomeR2PublicProjection({...p,faq:[{...p.faq[0],id:'home.faq.04'},p.faq[0]]},pub),bad('SMD_HOME_M4_V6_FAQ_ORDER_INVALID'));
});
test('M5 forged source witness and private R2 field refused',()=>{
 const p=make();assert.throws(()=>validateHomeR2PublicProjection({...p,sourceWitnessDigest:'a'.repeat(64)},pub),bad('SMD_HOME_M4_V6_PROJECTION_INVALID'));
 assert.throws(()=>validateHomeR2PublicProjection({...p,assets:[{...p.assets[0],r2Key:'private'}]},pub),bad('SMD_HOME_M4_V6_MEDIA_ASSETS_INVALID'));
});
test('M5 V5/no-V6 projection retains Figma empty media slot',()=>{
 assert.equal(resolveHomeR2PublicImage(null,pub,'home.methods.01.image'),null);
});
