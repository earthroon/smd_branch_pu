/** Mobile R4A presentation authority. Immutable Figma text and R2 asset records are not edited. */
import {homeFigmaText} from './home-r2-copy.ts';
import {mobileTrainingR2} from './home-training-mobile-r2.ts';

export const mobileTrainingR4A = {
  contract: 'SMD_HOME_R2_MOBILE_R4A_TRACK_OPTICAL_FIX',
  fieldLabelSource: 'node-1:479',
  fieldValueSource: 'node-1:478',
  fieldSourceText: '인테리어· 유리 필름',
  fieldDisplayText: '인테리어필름 · 유리필름',
  fieldDisplayFirst: '인테리어필름 · ',
  fieldDisplaySecond: '유리필름',
  timeline: {
    morningLabel: mobileTrainingR2.timeline.morningLabel,
    centerWork: mobileTrainingR2.timeline.secondWork,
    afternoonLabel: mobileTrainingR2.timeline.afternoonLabel,
    morningBottom: mobileTrainingR2.timeline.morningWork,
    afternoonBottom: mobileTrainingR2.timeline.afternoonWork,
    afternoonSourceText: '필름 래핑',
    afternoonDisplayText: '필름래핑',
  },
  arrow: mobileTrainingR2.arrow,
  authority: 'USER_APPROVED_MOBILE_DISPLAY_OVERRIDE_R4A',
} as const;

export function assertMobileTrainingR4A(): void {
  const v = mobileTrainingR4A;
  const refs = [v.timeline.morningLabel, v.timeline.centerWork, v.timeline.afternoonLabel,
    v.timeline.morningBottom, v.timeline.afternoonBottom] as const;
  const expected = ['오전','밑작업','오후','밑작업','필름 래핑'] as const;
  if (homeFigmaText[v.fieldLabelSource]?.characters !== '교육분야' ||
      homeFigmaText[v.fieldValueSource]?.characters !== v.fieldSourceText ||
      v.fieldDisplayFirst + v.fieldDisplaySecond !== v.fieldDisplayText ||
      v.fieldDisplayText !== '인테리어필름 · 유리필름' ||
      v.timeline.afternoonDisplayText !== '필름래핑' ||
      v.timeline.afternoonSourceText !== '필름 래핑' ||
      refs.some((key,index) => homeFigmaText[key]?.characters !== expected[index]) ||
      v.arrow.sourceNodes.length !== 2 || v.arrow.sourceNodes[0] !== 'node-1:501' ||
      v.arrow.sourceNodes[1] !== 'node-1:555') {
    throw new Error('SMD_HOME_R2_MOBILE_R4A_SOURCE_DRIFT');
  }
}
