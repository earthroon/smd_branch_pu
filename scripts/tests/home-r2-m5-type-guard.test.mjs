import { test } from 'node:test';
import assert from 'node:assert/strict';
import {homeR2PublishedFromRender} from '../../app/utils/homeR2ScaffoldAdmission.ts';

test('M5 V3 (no schema) and V4/V5 responses never expose Home R2 state', () => {
  assert.equal(homeR2PublishedFromRender({requestedPath: '/'}), null);
  for (const schema of ['SMD_RENDER_RESPONSE_V4', 'SMD_RENDER_RESPONSE_V5']) {
    assert.equal(homeR2PublishedFromRender({schema, homeR2: {invalid: true}}), null);
  }
});

test('M5 only V6 selects Home R2 projection without modifying its identity', () => {
  const projection={publicationId:'publication-12',publicationDigest:'a'.repeat(64)};
  assert.equal(homeR2PublishedFromRender({schema:'SMD_RENDER_RESPONSE_V6',homeR2:projection}), projection);
});
