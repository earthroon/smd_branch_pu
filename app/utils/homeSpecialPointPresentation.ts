/**
 * SMD_HOME_SPECIAL_COPY_R1: display-only corrections for three Special Start cards.
 * Figma Scene/JSONL bytes, UTF-16 boundaries, source digests and CMS copies stay frozen.
 */
export const HOME_SPECIAL_POINT_PRESENTATION_R1 = 'SMD_HOME_SPECIAL_COPY_R1' as const;

export type SpecialPointRun = Readonly<{
  characters: string;
  style: Readonly<Record<string, string | number>>;
  start?: number;
  end?: number;
  sourceStartUtf16?: number;
  sourceEndUtf16?: number;
}>;

type SpecialPointPlan = Readonly<{
  sourceRuns: readonly string[];
  sourceWeights: readonly number[];
  emphasisIndex: number;
  correction?: Readonly<{ index: number; from: string; to: string }>;
}>;

const PLAN_01: SpecialPointPlan = {
  sourceRuns: [
    '수강생이 스스로 작업할 수 있는 수준까지',
    ' \n교육하는 것을 목표로 합니다.',
  ],
  sourceWeights: [500, 400],
  emphasisIndex: 0,
};
const PLAN_02: SpecialPointPlan = {
  sourceRuns: [
    '현장 매커니즘을 반영하여 오전 일작업과 \n프라이머 도포, 오후 필름 래핑 순으로 \n',
    '현장감 있게 수업',
    '합니다.',
  ],
  sourceWeights: [400, 500, 400],
  emphasisIndex: 1,
  correction: {index: 0, from: '매커니즘', to: '메커니즘'},
};
const PLAN_03: SpecialPointPlan = {
  sourceRuns: [
    '수료 후',
    ' 개인별 맞춤 · 취업 창업 컨설팅',
    '을 \n통해 필름 시장 진입을 돕습니다.',
  ],
  sourceWeights: [400, 500, 400],
  emphasisIndex: 1,
};

function planFor(nodeKey: string): SpecialPointPlan | null {
  switch (nodeKey) {
    case 'node-18:120': return PLAN_01;
    case 'node-18:121': return PLAN_02;
    case 'node-18:122': return PLAN_03;
    default: return null;
  }
}

export function isHomeSpecialEmphasisRun(nodeKey: string, runIndex: number): boolean {
  const plan = planFor(nodeKey);
  return plan !== null && plan.emphasisIndex === runIndex;
}

/** Refuses a modified source rather than reinterpreting edited strings or old offsets. */
export function presentHomeSpecialPointRuns(
  nodeKey: string, sourceRuns: readonly SpecialPointRun[],
): readonly SpecialPointRun[] {
  const plan = planFor(nodeKey);
  if (plan === null) return sourceRuns;
  if (sourceRuns.length !== plan.sourceRuns.length) {
    throw new Error(`SMD_HOME_SPECIAL_POINT_SOURCE_DRIFT ${nodeKey}:run_count`);
  }

  let offset = 0;
  return sourceRuns.map((run, index) => {
    const sourceText = plan.sourceRuns[index];
    if (sourceText === undefined) {
      throw new Error(`SMD_HOME_SPECIAL_POINT_SOURCE_DRIFT ${nodeKey}:run_${index}`);
    }
    const start = run.start ?? run.sourceStartUtf16;
    const end = run.end ?? run.sourceEndUtf16;
    const expectedEnd = offset + sourceText.length;
    if (run.characters !== sourceText || run.style.fontWeight !== plan.sourceWeights[index] ||
      start !== offset || end !== expectedEnd) {
      throw new Error(`SMD_HOME_SPECIAL_POINT_SOURCE_DRIFT ${nodeKey}:run_${index}`);
    }
    offset = expectedEnd;

    const correction = plan.correction;
    let displayed = run.characters;
    if (correction?.index === index) {
      const first = displayed.indexOf(correction.from);
      if (first < 0 || displayed.indexOf(correction.from, first + correction.from.length) !== -1 ||
        correction.from.length !== correction.to.length) {
        throw new Error(`SMD_HOME_SPECIAL_POINT_CORRECTION_DRIFT ${nodeKey}`);
      }
      displayed = displayed.replace(correction.from, correction.to);
    }
    if (index === plan.emphasisIndex) {
      return {...run, characters: displayed, style: {...run.style, fontWeight: 700}};
    }
    return displayed === run.characters ? run : {...run, characters: displayed};
  });
}
