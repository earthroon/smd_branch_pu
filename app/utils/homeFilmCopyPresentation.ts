/** Display copy for the homepage hero and the fourth info card. */
export const HOME_FILM_COPY_LABEL = '인테리어필름 · 유리필름';
export const HOME_FILM_INFO_NODE = 'node-18:59';

const copyByNode: ReadonlyMap<string, readonly [sourceRun: string, displayRun: string]> = new Map([
  ['node-35:5', ['업계 최초 인테리어', '업계 최초 인테리어필름']],
  [HOME_FILM_INFO_NODE, ['인테리어 · 유리 필름', HOME_FILM_COPY_LABEL]],
  // HOME_TRAINING_R5: keep Figma two-run source bytes/digest, change only visible copy.
  ['node-1:478', ['인테리어· 유리 ', '인테리어필름 · 유리']],
]);

export function isHomeFilmCopyNode(nodeKey: string): boolean {
  return copyByNode.has(nodeKey);
}

export function homeVisibleFilmText(nodeKey: string, text: string): string {
  const copy = copyByNode.get(nodeKey);
  return copy && text === copy[0] ? copy[1] : text;
}
