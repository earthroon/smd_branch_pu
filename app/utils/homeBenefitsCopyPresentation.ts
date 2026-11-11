
/**
 * HOME_BENEFITS_COPY_PRESENTATION_R1
 * Figma 원본 불변, 화면 표시 문구만 변경
 */

export const benefitsCopyOverride = {
  'node-18:148': {
    source: '현장 메커니즘 반영 실무교육',
    display: '현장 메커니즘을 반영한 실무 교육',
  },

  'node-18:149': {
    source:
      '시공사 현장과 정규 실무 강의를 진행합니다.\n' +
      '소수인원으로 작업을 세심하게 지도합니다.',
    display:
      '현장의 작업 흐름을 익혀 수료 후 즉공으로 \n' +
      '현장 업무를 수행할 수 있도록 돕습니다.',
  },
} as const;

export function homeBenefitsVisibleText(
  nodeKey: string,
  text: string,
): string {
  switch (nodeKey) {
    case 'node-18:148':
    case 'node-18:149': {
      const entry = benefitsCopyOverride[nodeKey];

      if (text !== entry.source) {
        throw new Error(
          `HOME_BENEFITS_SOURCE_DRIFT:${nodeKey}`,
        );
      }

      return entry.display;
    }

    default:
      return text;
  }
}
