/** SMD_HOME_FAQ_R1: user-approved public Q/A, not a Figma placeholder.
 * Published CMS rows, when current, take precedence for their matching IDs.
 * Absent published IDs use this explicit, locally owned source with a DOM authority label.
 */
export const HOME_FAQ_APPROVED_COPY_R1 = [
  {
    id: 'home.faq.01',
    question: 'Q. 국비 지원이 가능한가요?',
    answer: 'A. SMD아카데미는 사설 학원으로, 별도의 국비 지원은 제공하지 않습니다.',
  },
  {
    id: 'home.faq.02',
    question: 'Q. 어떤 교육을 목표로 하나요?',
    answer: 'A. 현업 시공사의 실전에 가까운 수업을 통해 전문 기술자를 양성하는 것을 목표로 합니다.',
  },
  {
    id: 'home.faq.03',
    question: 'Q. 수료 후 어떤 지원을 받을 수 있나요?',
    answer: 'A. 수강생의 상황에 맞는 취업·창업 컨설팅을 제공합니다.\n\n우수 수료생에게는 소망디자인협의 고정 시공 인력으로 일할 기회를 제공합니다.',
  },
  {
    id: 'home.faq.04',
    question: 'Q. 현장 경험도 포함되나요?',
    answer: 'A. 교육 과정에서 2회 이상의 현장 경험 기회를 제공합니다.',
  },
] as const;

export type HomeFaqId = typeof HOME_FAQ_APPROVED_COPY_R1[number]['id'];
export type HomeFaqApprovedRow = typeof HOME_FAQ_APPROVED_COPY_R1[number];

export type HomeFaqPublishedRow = Readonly<{
  id: string;
  question: string;
  answer: string;
  visible: true;
}>;
export type HomeFaqDisplayRow = Readonly<{
  id: HomeFaqId;
  question: string;
  paragraphs: readonly string[];
  authority: 'CMS_PUBLICATION_V1' | 'USER_APPROVED_QA_R1';
}>;

/** The four fixed visual slots stay present. Published values are never silently replaced. */
export function resolveHomeFaqRows(publishedRows: readonly HomeFaqPublishedRow[]): readonly HomeFaqDisplayRow[] {
  const byId = new Map<string, HomeFaqPublishedRow>();
  for (const row of publishedRows) {
    if (!HOME_FAQ_APPROVED_COPY_R1.some(approved => approved.id === row.id)
      || byId.has(row.id) || !row.question.trim() || !row.answer.trim() || row.visible !== true) {
      throw new Error('SMD_HOME_FAQ_PUBLISHED_ROW_INVALID');
    }
    byId.set(row.id, row);
  }
  return HOME_FAQ_APPROVED_COPY_R1.map(approved => {
    const published = byId.get(approved.id);
    const source = published ?? approved;
    return {
      id: approved.id,
      question: source.question,
      paragraphs: source.answer.split(/\r?\n\s*\r?\n/).map(part => part.trim()),
      authority: published ? 'CMS_PUBLICATION_V1' : 'USER_APPROVED_QA_R1',
    };
  });
}
