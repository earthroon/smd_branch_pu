import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyHomeComposition } from '../lib/home-r2-cf2.mjs';
import {examineHomeLegacySlots} from '../../app/utils/homeR2Admission.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
test('exact nine-section Home plan binds Figma copy and eight unbound media slots',()=>{
 const result=verifyHomeComposition(root);
 assert.equal(result.actualBodySections,9);
 assert.equal(result.unboundMediaSlotCount,8);
 assert.equal(result.homeTextSourceCount,76);
 assert.equal(result.typecheck,'NOT_RUN');
 assert.equal(result.productCommitAllowed,false);
});
test('empty V5 slots are admitted, populated legacy nodes always fail closed',()=>{
 assert.deepEqual(examineHomeLegacySlots({}),{kind:'empty',nodeCount:0});
 assert.deepEqual(examineHomeLegacySlots({afterHero:[],beforeCta:[]}),{kind:'empty',nodeCount:0});
 assert.deepEqual(examineHomeLegacySlots({afterHero:[{id:'x'}]}),{kind:'conflict',code:'SMD_HOME_R2_LEGACY_SLOT_CONFLICT',nodeCount:1,slot:'afterHero'});
});
test('unknown or malformed legacy slots are not silently accepted',()=>{
 assert.equal(examineHomeLegacySlots({unknown:[]}).code,'SMD_HOME_R2_LEGACY_SLOT_INVALID');
 assert.equal(examineHomeLegacySlots({afterHero:null}).code,'SMD_HOME_R2_LEGACY_SLOT_INVALID');
 assert.equal(examineHomeLegacySlots(null).code,'SMD_HOME_R2_LEGACY_SLOT_INVALID');
});
