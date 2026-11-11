import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {CURRICULUM_WEEK_PROGRAM_SCHEMA,CURRICULUM_WEEK_SOURCE_ENTRIES}
  from '../../../app/data/curriculum-week-program.ts';
import {admitCurriculumWeekProgram,CurriculumWeekProgramError}
  from '../../../app/utils/curriculumWeekProgramAdmission.ts';
import {resolveCurriculumOperationalState}
  from '../../../app/utils/curriculumR1Operational.ts';
import {curriculumSourceText}
  from '../../../app/data/curriculum-r1-copy.generated.ts';
import {curriculumR1Source}
  from '../../../app/data/curriculum-r1-manifest.ts';
import {curriculumSourceShapes}
  from '../../../app/data/curriculum-r1-shapes.generated.ts';
const root=resolve(import.meta.dirname,'../../..');
const source=file=>readFileSync(resolve(root,file),'utf8');
const publication={id:'pub',digest:'digest'};
const projection=()=>({
  schema:CURRICULUM_WEEK_PROGRAM_SCHEMA,publicationId:publication.id,
  publicationDigest:publication.digest,
  weeks:CURRICULUM_WEEK_SOURCE_ENTRIES.map(week=>({
    id:week.id,
    navigation:{label:curriculumSourceText[week.label].displayText,
      title:curriculumSourceText[week.title].displayText},
    slots:{detail:{status:'unassigned'},media:null,extensions:[]},
  })),
});
const fixtures=()=>{
  const c={publication,navigation:{kakaoUrl:'https://open.kakao.com/o/abc123'},
    pageSlots:{curriculum:{afterTeach:[],afterLearningPath:[],beforeCta:[]}}};
  const s={path:'/curriculum',publicationId:'pub',publicationDigest:'digest',
    selected:{mode:'legacy',pageId:'curriculum'}};
  return {c,s};
};
const expectInvalid=(v,siteMedia=null)=>assert.throws(()=>admitCurriculumWeekProgram(v,publication,siteMedia),
  e=>e instanceof CurriculumWeekProgramError||/CMS_/i.test(String(e)));

test('source entries retain six frozen PSD IDs, original text and shapes',()=>{
  assert.deepEqual(CURRICULUM_WEEK_SOURCE_ENTRIES.map(w=>w.id),
    ['week-01','week-02','week-03','week-04','week-05','week-06']);
  assert.deepEqual(CURRICULUM_WEEK_SOURCE_ENTRIES.map(w=>w.shape),['72','73','74','75','76','388']);
  assert.equal(curriculumSourceShapes['72'].sourceFill,'#172C57');
  for(const w of CURRICULUM_WEEK_SOURCE_ENTRIES){
    assert.equal(curriculumSourceText[w.label].rawText.startsWith('WEEK '),true);
    assert.equal(curriculumSourceText[w.title].sectionId,'six-week-program');
  }
});

test('absent CMS program stays on the original publication and first-week PSD',()=>{
  const {c,s}=fixtures();
  const state=resolveCurriculumOperationalState(c,s,'/curriculum');
  assert.equal(state.weekProgram,null);
  assert.equal(state.publicationKey,'pub:digest');
});

test('all six registered IDs are admitted in stable canonical order',()=>{
  const x=projection();
  const w=admitCurriculumWeekProgram(x,publication,null);
  assert.equal(w.weeks.length,6);
  assert.equal(w.weeks[5].id,'week-06');
  assert.equal(w.weeks[1].slots.detail.status,'unassigned');
  assert.equal(w.weeks[4].slots.media,null);
  const {c,s}=fixtures();
  const state=resolveCurriculumOperationalState({...c,curriculumWeekProgram:x},s,'/curriculum');
  assert.equal(state.weekProgram.schema,CURRICULUM_WEEK_PROGRAM_SCHEMA);
  assert.deepEqual(state.weekProgram.weeks.map(v=>v.id),x.weeks.map(v=>v.id));
});

test('a valid week 03 binds its text list and source-reviewed notice slot',()=>{
  const x=projection();
  x.weeks[2].slots.detail={status:'ready',eyebrow:'WEEK 03',
    heading:'실측과 분해·조립',description:'주차별 세부 과정 안내',items:['실측','분해·조립']};
  x.weeks[2].slots.extensions=[{id:'week03-notice',kind:'notice',schemaVersion:1,
    props:{heading:'안내',body:'실습 일정은 변경될 수 있습니다.',tone:'neutral'}}];
  const w=admitCurriculumWeekProgram(x,publication,null);
  assert.equal(w.weeks[2].slots.detail.heading,'실측과 분해·조립');
  assert.equal(w.weeks[2].slots.extensions[0].kind,'notice');
});

test('unknown revisions, mismatched publications, duplicate/missing weeks and extra fields fail closed',()=>{
  const x=projection();expectInvalid({...x,schema:'SMD_CURRICULUM_WEEK_PROGRAM_V0'});
  expectInvalid({...x,publicationId:'other'});
  expectInvalid({...x,publicationDigest:'old'});
  expectInvalid({...x,weeks:x.weeks.slice(0,5)});
  expectInvalid({...x,weeks:[x.weeks[1],x.weeks[0],...x.weeks.slice(2)]});
  expectInvalid({...x,unknown:true});
  expectInvalid({...x,weeks:x.weeks.map((w,i)=>i===2?{...w,extra:true}:w)});
});

test('unsafe CMS text, bad detail shape and unbounded lists are explicitly rejected',()=>{
  const x=projection();
  x.weeks[1].navigation.title='<svg onload=alert(1)>';
  expectInvalid(x);
  x.weeks[1].navigation.title='밑작업과 모재';
  x.weeks[1].slots.detail={status:'ready',eyebrow:'WEEK 02',
    heading:'현장 실습',description:'설명',items:Array.from({length:9},()=> '과정')};
  expectInvalid(x);
  x.weeks[1].slots.detail={status:'unassigned',heading:'unapproved'};
  expectInvalid(x);
  x.weeks[1].slots.detail={status:'unassigned'};
  x.weeks[1].slots.extensions=[{id:'unknown',kind:'html',schemaVersion:1,props:{html:'<p>X</p>'}}];
  expectInvalid(x);
});

test('week 01 unassigned retains its existing PSD source; CMS cannot silently hide extra slots',()=>{
  const x=projection();
  const first=admitCurriculumWeekProgram(x,publication,null).weeks[0];
  assert.equal(first.slots.detail.status,'unassigned');
  x.weeks[0].slots.extensions=[{id:'week01-notice',kind:'notice',schemaVersion:1,
    props:{heading:'안내',body:'내용',tone:'neutral'}}];
  expectInvalid(x);
});

test('CMS blocks cannot silently duplicate IDs across separate weeks',()=>{
  const x=projection();
  const node={id:'same-id',kind:'notice',schemaVersion:1,
    props:{heading:'안내',body:'실습',tone:'neutral'}};
  x.weeks[1].slots.extensions=[node];
  x.weeks[2].slots.extensions=[node];
  expectInvalid(x);
});

test('media slot requires matching published binding, asset and publication',()=>{
  const x=projection(),id='sm_'+'b'.repeat(64);
  x.weeks[3].slots.media={assetId:id,alt:'4주차 실습 현장',title:'4주차 실습 사진',displayMode:'contain'};
  expectInvalid(x);
  const siteMedia={schema:'SMD_SITE_MEDIA_PUBLIC_PROJECTION_V1',
    publicationId:'pub',publicationDigest:'digest',
    bindings:{bindings:[{slotId:'curriculum.weeks.week-04.media',assetId:id,
      alt:'4주차 실습 현장',title:'4주차 실습 사진',displayMode:'contain'}]},
    assets:[{assetId:id,width:1200,height:800,mimeType:'image/png'}]};
  const w=admitCurriculumWeekProgram(x,publication,siteMedia);
  assert.deepEqual(w.weeks[3].slots.media,{...x.weeks[3].slots.media,
    src:'/api/media/image/'+id,width:1200,height:800});
  expectInvalid(x,{...siteMedia,publicationDigest:'stale'});
  expectInvalid(x,{...siteMedia,bindings:{bindings:[]}});
  expectInvalid(x,{...siteMedia,assets:[]});
  expectInvalid(x,{...siteMedia,bindings:{bindings:[{...siteMedia.bindings.bindings[0],slotId:'home.hero.image'}]}});
});

test('invalid weekly data cannot reach public operational state even when page identity matches',()=>{
  const {c,s}=fixtures(),x=projection();x.weeks[5].id='week-01';
  assert.throws(()=>resolveCurriculumOperationalState({...c,curriculumWeekProgram:x},s,'/curriculum'),
    /WEEK_PROGRAM_INVALID/);
  assert.equal(resolveCurriculumOperationalState({...c,curriculumWeekProgram:x},s,'/about'),null);
});

test('one panel owner, six interactive tabs, no source mutation and scoped paints',()=>{
  const tabs=source('app/components/curriculum/CurriculumWeekProgram.vue');
  const panel=source('app/components/curriculum/CurriculumWeekDetailPanel.vue');
  const shapes=source('app/components/curriculum/CurriculumSourceShapes.vue');
  const css=source('app/assets/css/curriculum-r1.css');
  const text=source('app/components/curriculum/CurriculumSourceText.vue');
  assert.match(tabs,/@click="selectWeek\(week.id\)"/);
  assert.match(tabs,/@keydown="onTabKeydown/);
  assert.match(tabs,/:aria-selected="selectedWeekId===week.id"/);
  assert.doesNotMatch(tabs,/:disabled=/);
  assert.match(tabs,/CurriculumWeekDetailPanel/);
  assert.equal(tabs.match(/role="tablist"/g).length,1);
  assert.equal(panel.match(/role="tabpanel"/g).length,1);
  assert.match(panel,/text-id="400"/);
  assert.match(panel,/detail.status==='ready'/);
  assert.match(panel,/CmsSlot :nodes="extensions"/);
  assert.match(shapes,/weekCardPaintIds=new Set\(\[72,73,74,75,76,388\]\)/);
  assert.match(css,/\.smd-curriculum__week--active \{ background:var\(--smd-brand-navy\); \}/);
  assert.match(css,/\.smd-curriculum__week-panel--dynamic/);
  assert.match(text, /--smd-curriculum-week-title-ink/);
});


test('WEEK 06 standalone display override retains PSD identity and changes only rendered copy',()=>{
  const original=curriculumSourceText['398'];
  assert.equal(CURRICULUM_WEEK_SOURCE_ENTRIES[5].id,'week-06');
  assert.equal(CURRICULUM_WEEK_SOURCE_ENTRIES[5].title,'398');
  assert.equal(original.sourceLayerId,398);
  assert.equal(original.rawText,'유리필름과 진로');
  assert.equal(original.displayText,'유리필름과 진로');
  assert.equal(original.sourceTextDigest,'c3f250a2ba5a10deefacd70a72ea1a0ab9f68c2d7523489c5611e12d55df8b32');

  // Execute the actual computed expression extracted from the Vue SFC, not a duplicate policy.
  const component=source('app/components/curriculum/CurriculumSourceText.vue');
  const begin=component.indexOf('const override=computed(()=>{');
  assert.ok(begin>=0,'display override declaration not found');
  const end=component.indexOf('\n});',begin);
  assert.ok(end>begin,'display override closing marker not found');
  const expression=component.slice(begin,end+4);
  const script=ts.transpileModule(expression+'\noverride.value;',{
    compilerOptions:{target:ts.ScriptTarget.ES2022},reportDiagnostics:true,
  });
  const errors=(script.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,'display override TypeScript transpilation failed');
  const evaluate=textId=>runInNewContext(script.outputText,{
    props:{textId},curriculumR1Source,
    computed:getter=>({get value(){return getter();}}),
  });
  assert.equal(evaluate('398').kind,'week06-title');
  assert.equal(evaluate('398').text,'복습 · 진로상담');
  assert.equal(evaluate('19').kind,'duration-correction');
  assert.equal(evaluate('19').text,curriculumR1Source.displayOverrides['19'].text);
  for(const id of ['154','390','392','394','396','397']){
    assert.equal(evaluate(id),null,`unexpected override for ${id}`);
  }
});

test('WEEK 06 override uses active/idle CSS variable and retains original source metadata',()=>{
  const component=source('app/components/curriculum/CurriculumSourceText.vue');
  const css=source('app/assets/css/curriculum-r1.css');
  const week=source('app/components/curriculum/CurriculumWeekProgram.vue');
  assert.match(component,/:data-display-override="override\?\.kind"/);
  for(const attr of ['data-curriculum-text','data-source-layer','data-source-key','data-source-text-digest']){
    assert.ok(component.includes(':'+attr+'="'),`missing original provenance: ${attr}`);
  }
  assert.match(component,/<span v-if="override" :style="\{color:paintRole==='week-title'\?'var\(--smd-curriculum-week-title-ink\)'/);
  assert.match(css,/\.smd-curriculum__week--active \{ --smd-curriculum-week-title-ink:var\(--smd-curriculum-week-title-active\)/);
  assert.match(css,/\.smd-curriculum__week \{ --smd-curriculum-week-title-ink:var\(--smd-curriculum-week-title-idle\)/);
  assert.match(week,/v-if="program"/);
  assert.match(week,/program\.weeks\[index\]\?\.navigation\.title/);
  assert.match(week,/v-else>[\s\S]*?<CurriculumSourceText :text-id="week.title"/);
});
