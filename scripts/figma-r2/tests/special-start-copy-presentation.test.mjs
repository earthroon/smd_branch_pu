import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  HOME_SPECIAL_POINT_PRESENTATION_R1,
  isHomeSpecialEmphasisRun,
  presentHomeSpecialPointRuns,
} from '../../../app/utils/homeSpecialPointPresentation.ts';

const root = resolve(import.meta.dirname, '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const fixtures = [
  {
    key: 'node-18:120',
    source: ['수강생이 스스로 작업할 수 있는 수준까지', ' \n교육하는 것을 목표로 합니다.'],
    displayed: ['수강생이 스스로 작업할 수 있는 수준까지', ' \n교육하는 것을 목표로 합니다.'],
    weights: [500, 400],
    expectedWeights: [700, 400],
    boldIndex: 0,
  },
  {
    key: 'node-18:121',
    source: ['현장 매커니즘을 반영하여 오전 일작업과 \n프라이머 도포, 오후 필름 래핑 순으로 \n', '현장감 있게 수업', '합니다.'],
    displayed: ['현장 메커니즘을 반영하여 오전 일작업과 \n프라이머 도포, 오후 필름 래핑 순으로 \n', '현장감 있게 수업', '합니다.'],
    weights: [400, 500, 400],
    expectedWeights: [400, 700, 400],
    boldIndex: 1,
  },
  {
    key: 'node-18:122',
    source: ['수료 후', ' 개인별 맞춤 · 취업 창업 컨설팅', '을 \n통해 필름 시장 진입을 돕습니다.'],
    displayed: ['수료 후', ' 개인별 맞춤 · 취업 창업 컨설팅', '을 \n통해 필름 시장 진입을 돕습니다.'],
    weights: [400, 500, 400],
    expectedWeights: [400, 700, 400],
    boldIndex: 1,
  },
];
function runs(fixture, coordinateField) {
  let offset = 0;
  return fixture.source.map((characters, i) => {
    const start = offset;
    offset += characters.length;
    return {
      characters,
      ...(coordinateField === 'figma' ? {start, end: offset} : {sourceStartUtf16: start, sourceEndUtf16: offset}),
      style: {fontWeight: fixture.weights[i], fontSize: '25px', color: 'rgba(0,0,0,1)'},
    };
  });
}

test('revision identifier is explicit', () => {
  assert.equal(HOME_SPECIAL_POINT_PRESENTATION_R1, 'SMD_HOME_SPECIAL_COPY_R1');
});
for (const fixture of fixtures) {
  for (const field of ['figma', 'responsive']) {
    test(`${fixture.key} ${field}: exact characters, offsets, weights, and immutable source`, () => {
      const input = runs(fixture, field);
      const before = structuredClone(input);
      const output = presentHomeSpecialPointRuns(fixture.key, input);
      assert.deepEqual(output.map(r => r.characters), fixture.displayed);
      assert.deepEqual(output.map(r => r.style.fontWeight), fixture.expectedWeights);
      assert.deepEqual(output.map(r => r.style.fontSize), input.map(r => r.style.fontSize));
      assert.deepEqual(input, before, 'no mutations to source runs');
      const startKey = field === 'figma' ? 'start' : 'sourceStartUtf16';
      const endKey = field === 'figma' ? 'end' : 'sourceEndUtf16';
      assert.deepEqual(output.map(r => [r[startKey], r[endKey]]), input.map(r => [r[startKey], r[endKey]]));
      assert.equal(output.map(r => r.characters).join('').length, input.map(r => r.characters).join('').length);
      assert.deepEqual(output.map((_, i) => isHomeSpecialEmphasisRun(fixture.key, i)),
        fixture.source.map((_, i) => i === fixture.boldIndex));
    });
  }
}
test('non-target Figma nodes remain byte/reference identical at the presentation boundary', () => {
  const source = [{characters: '다른 영역', start: 0, end: 5, style: {fontWeight: 500}}];
  const output = presentHomeSpecialPointRuns('node-1:60', source);
  assert.strictEqual(output, source);
  assert.strictEqual(output[0], source[0]);
  assert.equal(isHomeSpecialEmphasisRun('node-1:60', 0), false);
});
test('wrong run count, characters, positions and source weights are rejected explicitly', () => {
  const f = fixtures[1];
  const src = runs(f, 'figma');
  const wrong = [
    src.slice(0, 2),
    src.map((r, i) => i === 0 ? {...r, characters: r.characters.replace('매커니즘', '메커니즘')} : r),
    src.map((r, i) => i === 1 ? {...r, start: r.start + 1} : r),
    src.map((r, i) => i === 1 ? {...r, style: {...r.style, fontWeight: 400}} : r),
  ];
  for (const bad of wrong) {
    assert.throws(() => presentHomeSpecialPointRuns(f.key, bad), /SMD_HOME_SPECIAL_POINT_SOURCE_DRIFT/);
  }
});
test('mobile CSS overrides only explicitly marked bold spans', () => {
  const css = read('app/components/home/StatementSection.vue');
  assert.match(css, /span\[data-special-emphasis="true"\]/);
  assert.match(css, /font-weight:\s*700\s*!important/);
  assert.match(css, /font-weight:\s*400\s*!important/);
});
test('both renderer paths consume the same presentation function and mark only admitted runs', () => {
  for (const path of ['app/components/figma/FigmaNativeText.vue', 'app/components/home/HomeFigmaText.vue']) {
    const source = read(path);
    assert.match(source, /presentHomeSpecialPointRuns\(/);
    assert.match(source, /isHomeSpecialEmphasisRun\(/);
    assert.match(source, /data-special-emphasis/);
  }
});
test('both renderers retain their immutable source digest attributes', () => {
  const scene = read('app/components/figma/FigmaNativeText.vue');
  const responsive = read('app/components/home/HomeFigmaText.vue');
  assert.match(scene, /:data-source-text-digest="original\.digest"/);
  assert.match(responsive, /:data-text-digest="source\.textDigest"/);
  assert.match(read('app/utils/homeSpecialPointPresentation.ts'), /SMD_HOME_SPECIAL_POINT_SOURCE_DRIFT/);
});
