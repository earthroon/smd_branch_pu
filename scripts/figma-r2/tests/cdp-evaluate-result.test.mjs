import test from 'node:test';
import assert from 'node:assert/strict';
import { readCdpEvaluateValue } from '../cdp-evaluate-result.mjs';

test('CDP Runtime.evaluate nested object value', () => {
  const packet = { id: 1, result: { result: { type: 'object', value: { loaded: true, present: false } } } };
  assert.deepEqual(readCdpEvaluateValue(packet, 'SMD_TEST'), { loaded: true, present: false });
});

test('CDP Runtime.evaluate nested primitive and null', () => {
  assert.equal(readCdpEvaluateValue({ result: { result: { type: 'number', value: 7 } } }, 'SMD_TEST'), 7);
  assert.equal(readCdpEvaluateValue({ result: { result: { type: 'object', subtype: 'null', value: null } } }, 'SMD_TEST'), null);
});

test('CDP JavaScript exception is reported from the method response', () => {
  assert.throws(() => readCdpEvaluateValue({ result: {
    result: { type: 'object' }, exceptionDetails: { text: 'Uncaught', exception: { description: 'ReferenceError: x is not defined' } }
  } }, 'SMD_TEST'), /SMD_TEST_RUNTIME_EVAL_EXCEPTION: ReferenceError/);
});

test('CDP missing value is a typed failure, not an undefined fallback', () => {
  assert.throws(() => readCdpEvaluateValue({ result: { result: { type: 'undefined' } } }, 'SMD_TEST'),
    /SMD_TEST_RUNTIME_EVAL_VALUE_UNAVAILABLE: type=undefined/);
  assert.throws(() => readCdpEvaluateValue({ result: {} }, 'SMD_TEST'),
    /SMD_TEST_RUNTIME_EVAL_VALUE_UNAVAILABLE: type=missing/);
});

test('both browser harnesses delegate to a single CDP result reader', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { resolve, dirname } = await import('node:path');
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const f of ['verify-home-intro-browser.mjs', 'verify-home-special-browser.mjs']) {
    const text = await readFile(resolve(dir, f), 'utf8');
    assert.match(text, /import \{ readCdpEvaluateValue \} from '\.\/cdp-evaluate-result\.mjs';/);
    assert.match(text, /return readCdpEvaluateValue\(/);
    assert.doesNotMatch(text, /return (?:value|r)\.result\?\.value;/);
  }
});
