import { aboutR1Source } from '../data/about-r1-manifest.ts';
import { aboutSourceText } from '../data/about-r1-copy.generated.ts';
import { aboutSourceAssets } from '../data/about-r1-assets.generated.ts';
import { aboutMediaCss } from './aboutR1LayoutMath.ts';
export function assertAboutR1Source(): void {
  const source = aboutR1Source;
  if (source.schema !== 'SMD_ABOUT_BUILD_SOURCE_V1' || source.sourceAuthority !== 'PSD_BUILD_SOURCE_V1' ||
      source.pageId !== 'about' || source.sourceManifestDigest !== '13b1ae44af6e301bacfbe7b548d73505ed18d54a328cedcadc3787edb828e66c' || source.psdSha256 !== '36e2e557bf1e8c1b3101357b28689f84111a83a5d90b61049672416c9549b4e6' ||
      source.frameSnapshotDigest !== '40d104dae91803b7aa83bbb2ad36d7c30c716a8d1cba4211fc73624d862494e4' ||
      source.frameJsonlSha256 !== '87ebcdedada79209054f417ecd97c127bed9ff450415e95aef6bfe720458f46b')
    throw new Error('SMD_ABOUT_SOURCE_IDENTITY_MISMATCH');
  const expected = ['hero','facts','audience','field-experience','learn-by-doing','practice-feedback','career','consultation-cta'];
  const ids = source.sections.flatMap(s => [...s.textLayerIds] as number[]);
  if (source.sections.some((s,i) => s.id !== expected[i]) ||
      ids.length !== 59 || new Set(ids).size !== 59 || Object.keys(aboutSourceText).length !== 59)
    throw new Error('SMD_ABOUT_TEXT_COVERAGE_INVALID');
  for (const text of Object.values(aboutSourceText)) {
    if (!ids.includes(text.sourceLayerId) || text.displayText !== text.rawText.replace(/\r/g, '\n') ||
        text.runs.map(r => r.text).join('') !== text.displayText) throw new Error('SMD_ABOUT_TEXT_SOURCE_INVALID');
    let end = 0;
    for (const run of text.runs) {
      if (run.startUtf16 !== end || run.endUtf16 <= run.startUtf16 ||
          text.displayText.slice(run.startUtf16, run.endUtf16) !== run.text ||
          !(run.paintToken in source.paintTokens)) throw new Error('SMD_ABOUT_TEXT_RUN_INVALID');
      end = run.endUtf16;
    }
    if (end !== text.displayText.length) throw new Error('SMD_ABOUT_TEXT_RUN_INVALID');
  }
  if (Object.keys(aboutSourceAssets.photos).length !== 8 || Object.keys(aboutSourceAssets.icons).length !== 4)
    throw new Error('SMD_ABOUT_MEDIA_COVERAGE_INVALID');
  for (const p of Object.values(aboutSourceAssets.photos)) aboutMediaCss(p);
}
