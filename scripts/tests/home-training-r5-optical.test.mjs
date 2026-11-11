import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  HOME_TRAINING_R5_FIELD_NODE, HOME_TRAINING_R5_FIELD_DIGEST,
  HOME_TRAINING_R5_OPTICAL_MAP, HOME_TRAINING_R5_PAINT_WIDTH,
  assertHomeTrainingR5TextSource, homeTrainingR5PaintWidth, homeTrainingR5Optical,
} from '../../app/utils/homeTrainingOpticalR5.ts';
import {homeVisibleFilmText, HOME_FILM_COPY_LABEL} from '../../app/utils/homeFilmCopyPresentation.ts';
import {mobileTrainingR4A, assertMobileTrainingR4A} from '../../app/data/home-training-mobile-r4a.ts';

const root = resolve(import.meta.dirname, '../..');
const read = (path) => readFileSync(resolve(root,path),'utf8');

test('CF1 · Figma two-run source preserves identity and display composition', () => {
  assert.equal(HOME_FILM_COPY_LABEL,'인테리어필름 · 유리필름');
  const source = {digest:HOME_TRAINING_R5_FIELD_DIGEST,runs:[
    {characters:'인테리어· 유리 ',start:0,end:9},
    {characters:'필름',start:9,end:11},
  ]};
  assert.doesNotThrow(()=>assertHomeTrainingR5TextSource(HOME_TRAINING_R5_FIELD_NODE,source));
  const visible = source.runs.map(x=>homeVisibleFilmText(HOME_TRAINING_R5_FIELD_NODE,x.characters)).join('');
  assert.equal(visible,HOME_FILM_COPY_LABEL);
  assert.deepEqual(source.runs.map(x=>x.characters),['인테리어· 유리 ','필름']);
});

test('CF1 · invalid run or unexpected node never silently reinterprets source', () => {
  assert.throws(()=>assertHomeTrainingR5TextSource(HOME_TRAINING_R5_FIELD_NODE,
    {digest:'wrong',runs:[{characters:'인테리어· 유리 ',start:0,end:9},{characters:'필름',start:9,end:11}]}),
    /SOURCE_DRIFT/);
  assert.throws(()=>assertHomeTrainingR5TextSource(HOME_TRAINING_R5_FIELD_NODE,
    {digest:HOME_TRAINING_R5_FIELD_DIGEST,runs:[{characters:'wrong',start:0,end:9},{characters:'필름',start:9,end:11}]}),
    /SOURCE_DRIFT/);
  assert.equal(homeVisibleFilmText('node-1:483','2회 이상'),'2회 이상');
});

test('CF2 · paint-only width gives center card room without mutating Figma rect',()=>{
  assert.equal(homeTrainingR5PaintWidth(HOME_TRAINING_R5_FIELD_NODE,232),320);
  assert.equal(homeTrainingR5PaintWidth('node-1:483',232),232);
  assert.throws(()=>homeTrainingR5PaintWidth(HOME_TRAINING_R5_FIELD_NODE,231),/RECT_DRIFT/);
  // 216 source X, -40 optical offset, 320 paint width, 8px initial safety pad.
  assert.ok(216-40+HOME_TRAINING_R5_PAINT_WIDTH+8<=510);
});

test('CF2 · exactly three Figma cards: child optical map never moves card frames or reveal owners',()=>{
  const keys = Object.keys(HOME_TRAINING_R5_OPTICAL_MAP).sort();
  assert.deepEqual(keys,['node-1:100','node-1:414','node-1:477','node-1:478',
    'node-1:479','node-1:482','node-1:483','node-1:484'].sort());
  for (const key of ['node-1:313','node-1:315','node-1:95','node-1:93']) {
    assert.equal(homeTrainingR5Optical(key),null);
  }
  for (const v of Object.values(HOME_TRAINING_R5_OPTICAL_MAP)) {
    assert.ok(Number.isFinite(v.dx) && Number.isFinite(v.dy) && Math.abs(v.dx)<=40 && Math.abs(v.dy)<=4);
  }
  assert.deepEqual([79+homeTrainingR5Optical('node-1:477').dy,86+homeTrainingR5Optical('node-1:482').dy],[83,82]);
});

test('CF2 · nested SVG optical group does not take the reveal transform owner',()=>{
  const s=read('app/components/figma/FigmaSceneNode.vue');
  assert.match(s,/class="smd-home-training__optical"/);
  assert.match(s,/:data-training-optical-node="child"/);
  assert.match(s,/smd-home-training__target/);
  const style=read('app/assets/css/home-training-reveal.css');
  assert.match(style,/\.smd-home-training__target/);
  assert.doesNotMatch(style,/\.smd-home-training__optical/);
});

test('CF3 · both mobile/tablet semantic text contracts use the same visible string',()=>{
  assertMobileTrainingR4A();
  assert.equal(mobileTrainingR4A.fieldDisplayText, HOME_FILM_COPY_LABEL);
  assert.equal(mobileTrainingR4A.fieldDisplayFirst+mobileTrainingR4A.fieldDisplaySecond,
    HOME_FILM_COPY_LABEL);
  const vue=read('app/components/home/TeachSection.vue');
  assert.match(vue,/mobileTrainingR4A\.fieldDisplayFirst/);
  assert.match(vue,/mobileTrainingR4A\.fieldDisplaySecond/);
  assert.match(vue,/<wbr\s*\/>/);
});

test('CF4 · both text renderers are view-only and retain the Figma Source authority',()=>{
  const native=read('app/components/figma/FigmaNativeText.vue');
  const semantic=read('app/components/home/TeachSection.vue');
  assert.match(native,/assertHomeTrainingR5TextSource\(props\.nodeKey, original\.value\)/);
  assert.match(native,/homeTrainingR5PaintWidth\(props\.nodeKey, props\.width\)/);
  assert.match(native,/props\.width/); // original native Source Rect remains tracked
  assert.match(semantic,/mobileTrainingR4A\.fieldSourceText|mobileTrainingR4A\.fieldDisplayFirst/);
  assert.doesNotMatch(native,/figmaScene\.texts\[[^\]]+\]\s*=/);
});
