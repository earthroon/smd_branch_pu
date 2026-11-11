import { curriculumR1Source } from '../data/curriculum-r1-manifest.ts';
import { curriculumSourceText } from '../data/curriculum-r1-copy.generated.ts';
import { curriculumSourceAssets } from '../data/curriculum-r1-assets.generated.ts';
import { curriculumSourceShapes } from '../data/curriculum-r1-shapes.generated.ts';
import { curriculumMediaCss } from './curriculumR1LayoutMath.ts';
export function assertCurriculumR1Source(): void {
  const s=curriculumR1Source;
  if(s.schema!=='SMD_CURRICULUM_BUILD_SOURCE_V1'||s.pageId!=='curriculum'||s.sourceAuthority!=='PSD_BUILD_SOURCE_V1'||
    s.psdSha256!=='42da24276ea7c449f886164c439854f84bfadff679f896fc55abad4cc531c012'||
    s.sourceWidth!==1920||s.sourceHeight!==6958||s.sourceBodyOriginY!==132||s.sourceBodyEndY!==6231)
    throw new Error('SMD_CURRICULUM_SOURCE_IDENTITY_MISMATCH');
  const expected=['hero','facts','introduction','daily-flow','practical-training','six-week-program','course-information','consultation-cta'];
  const ids=s.sections.flatMap(section=>[...section.textLayerIds] as number[]);
  if(s.sections.length!==8||s.sections.some((section,i)=>section.id!==expected[i]||
    (i>0&&section.top!==s.sections[i-1]!.top+s.sections[i-1]!.height))||ids.length!==95||
    new Set(ids).size!==95||Object.keys(curriculumSourceText).length!==95)
    throw new Error('SMD_CURRICULUM_TEXT_COVERAGE_INVALID');
  for(const t of Object.values(curriculumSourceText)) {
    if(!ids.includes(t.sourceLayerId)||t.sourceKey!==s.psdSha256+':'+t.sourceLayerId||
      t.displayText!==t.rawText.replace(/\r/g,'\n')||t.runs.map(r=>r.text).join('')!==t.displayText)
      throw new Error('SMD_CURRICULUM_TEXT_SOURCE_INVALID');
    let end=0;
    for(const r of t.runs) {
      if(r.startUtf16!==end||r.endUtf16<=r.startUtf16||t.displayText.slice(r.startUtf16,r.endUtf16)!==r.text)
        throw new Error('SMD_CURRICULUM_TEXT_RUN_INVALID');
      end=r.endUtf16;
    }
    if(end!==t.displayText.length)throw new Error('SMD_CURRICULUM_TEXT_RUN_INVALID');
  }
  if(Object.keys(curriculumSourceAssets.photos).length!==5||curriculumSourceShapes['17'].fillEnabled!==false||
    curriculumSourceText['19'].rawText!==s.displayOverrides['19'].rawText)
    throw new Error('SMD_CURRICULUM_AUTHORITY_MISMATCH');
  for(const photo of Object.values(curriculumSourceAssets.photos))curriculumMediaCss(photo);
}
