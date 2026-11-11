import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { buildSourceFreeze, verifyUntouchedFiles } from './home-r2-source.mjs';
import { TEXT_HEADER_AUTHORIZED_DIGESTS } from './home-r2-text-header-authority.mjs';

const bodyOrder=['hero','info-bar','special-start','training-track','benefits','methods','location','faq','consultation-cta'];
const components=['HeroSection','HomeInfoBar','StatementSection','TeachSection','HomeBenefits','HomeMethods','HomeLocation','HomeFaq','HomeConsultationCta'];
const read=(root,file)=>readFileSync(resolve(root,file),'utf8');
export function verifyHomeComposition(root){
  const {sections,slots,texts,sourceIdentity} = buildSourceFreeze(root);
  const entries=new Map(texts.map(x=>[x.target,x]));
  const index=read(root,'app/pages/index.vue');
  const template=index.slice(index.indexOf('<template>'));
  // The semantic Intro paints Hero + Info in one Vue-owned frame. Verify that
  // pair inside the stage rather than expecting two independent page siblings.
  const intro=read(root,'app/components/home/HomeIntroStage.vue');
  const wrapped=/<HomeIntroStage variant="semantic"\s*\/>/.test(template);
  const bodyComponents=(template.match(/<Home(?:Benefits|Methods|Location|Faq|ConsultationCta)\b|<(?:StatementSection|TeachSection)\b/g)||[]).join(',');
  assert.equal(bodyComponents,components.slice(2).map(x=>`<${x}`).join(','),'home composition body order');
  if(wrapped){
    assert.match(intro,/<HeroSection v-else @film-paint-geometry="onFilmGeometry"\s*\/>/);
    assert.match(intro,/<HomeInfoBar v-else\s*\/>/);
    assert.match(intro,/data-intro-paint-owner="base"/);
    assert.match(intro,/data-intro-paint-owner="overlay"/);
    assert.doesNotMatch(template,/<HeroSection\s*\/>|<HomeInfoBar\s*\/>/);
  }else{
    assert.match(template,/<HeroSection\s*\/>\s*<HomeInfoBar\s*\/>/);
  }
  assert.doesNotMatch(index,/(?:<SiteHeader|<SiteFooter|<CmsSlot|<ArchiveGallery|<PracticeBlock|<CtaBand)\b/);
  assert.match(index,/assertHomeBodyPlan\(\)/);
  assert.match(index,/examineHomeLegacySlots/);
  assert.match(index,/SMD_HOME_R2_LEGACY_SLOT_CONFLICT|status\.code/);
  for(const [component,id,index] of components.map((x,i)=>[x,bodyOrder[i],i])){
    const file=`app/components/home/${component}.vue`;
    const code=read(root,file);
    assert.match(code,new RegExp(`data-home-section="${id}"`));
    assert.match(code,new RegExp(`data-figma-node="${sections[index+1].sourceNodeKey}"`));
    assert.match(code,/<HomeFigmaText\b|homeText\(/);
    assert.doesNotMatch(code,/(?:pages\?\.home|pages\.value\?\.home|home\.hero\.image|smd-2026\.github\.io)/);
  }
  const composition=read(root,'app/data/home-r2-composition.ts');
  const refs=[...composition.matchAll(/textRef\('(node-[^']+)'\)/g)].map(x=>x[1]);
  const seenRefs=new Set();
  for(const ref of refs){assert.ok(entries.has(ref),`unresolved Figma text ${ref}`);assert.ok(!seenRefs.has(ref),`duplicate exposed copy ${ref}`);seenRefs.add(ref);}
  assert.equal(seenRefs.size,60,'60 distinct directly exposed/pending references');
  const componentToSection = [
    ['hero','hero'],['infoBar','info-bar'],['specialStart','special-start'],
    ['training','training-track'],['benefits','benefits'],['methods','methods'],
    ['location','location'],['faq','faq'],['consultation','consultation-cta'],
  ];
  // The object keys are stable top-level semantic regions; source refs must belong to that region.
  for(let i=0;i<componentToSection.length;i++){
    const [name,sectionId]=componentToSection[i];
    const start=new RegExp(`^  ${name}:\\s*[\\[{]`,'m');
    const match=start.exec(composition);
    assert.ok(match,`missing logical mapping ${name}`);
    const nextIndex=i+1<componentToSection.length
      ? new RegExp(`^  ${componentToSection[i+1][0]}:\\s*[\\[{]`,'m').exec(composition)?.index : composition.indexOf('} as const;',match.index);
    assert.ok(Number.isInteger(nextIndex)&&nextIndex>match.index,`mapping end ${name}`);
    const refsForSection=[...composition.slice(match.index,nextIndex).matchAll(/textRef\('([^']+)'\)/g)].map(x=>x[1]);
    const expectedSection=sections.find(x=>x.id===sectionId);
    assert.ok(expectedSection);
    for(const ref of refsForSection)assert.ok(expectedSection.contentTextRefs.includes(ref),`wrong section for ${ref}: ${sectionId}`);
  }
  for(const item of texts.filter(x=>x.usage==='pending-cms-copy')){
    assert.ok(seenRefs.has(item.target));
    assert.equal(item.characters,'=====================');
  }
  for(const item of bodyOrder){
    const section=sections.find(x=>x.id===item);
    assert.ok(section?.contentTextRefs?.length>0);
  }
  const slotNames=[...composition.matchAll(/(?:slot|photo):\s*'(home\.[^']+)'/g)].map(x=>x[1]);
  assert.equal(slotNames.length,8);
  assert.equal(new Set(slotNames).size,8);
  assert.deepEqual(slotNames.sort(),slots.map(x=>x.slotId).sort());
  const media=read(root,'app/components/home/HomeMediaFrame.vue');
  assert.match(media,/:data-media-state="image\?'published':'unbound'"/);
  assert.match(media,/placeholderRgba/);
  assert.match(media,/resolveHomeR2PublicImage/);
  assert.match(media,/<img v-if="image"/);
  assert.doesNotMatch(media,/<SiteImage\b|usePublishedSiteMedia|smd-2026\.github\.io/);
  const faq=read(root,'app/components/home/HomeFaq.vue');
  assert.match(faq,/pending-cms-copy/);
  assert.match(faq,/v-if="rowAt\(index\)"/);
  assert.match(faq,/<details\b/);
  assert.doesNotMatch(faq,/<button\b|={10,}/);
  const cta=read(root,'app/components/home/HomeConsultationCta.vue');
  assert.match(cta,/navigation\.kakaoUrl/);
  assert.doesNotMatch(cta,/https:\/\/open\.kakao\.com\/o\//);
  const homeEntries=sections.slice(1,-1);
  assert.deepEqual(homeEntries.map(x=>x.id),bodyOrder);
  verifyUntouchedFiles(root,TEXT_HEADER_AUTHORIZED_DIGESTS);
  return {contract:'SMD-HOME-R2-CF2',sourceSnapshotDigest:sourceIdentity.sourceSnapshotDigest,
    expectedBodySections:9,actualBodySections:homeEntries.length,homeTextSourceCount:texts.length,
    exposedOrPendingTextCount:refs.length,unboundMediaSlotCount:slotNames.length,duplicateHeaderFooterCount:0,
    legacyCmsSlotAdmission:'FAIL_CLOSED',noTouchFilesVerified:true,
    staticStatus:'PASS',typecheck:'NOT_RUN',build:'NOT_RUN',browserParity:'NOT_RUN',physicalQualification:'NOT_RUN',productCommitAllowed:false};
}
