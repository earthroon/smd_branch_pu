import test from 'node:test';
import assert from 'node:assert/strict';
import {homeLocalMediaSlots} from '../../app/data/home-local-media.ts';
import {homeMediaSlots} from '../../app/data/home-r2-manifest.ts';
import {assertHomeLocalMediaPath,assertHomeLocalMediaRegistry,resolveHomeLocalMedia,selectHomeMediaSlot} from '../../app/utils/homeLocalMedia.ts';
const slot='home.special-start.photo';
const source=homeLocalMediaSlots[slot];
const active={...homeLocalMediaSlots,[slot]:{...source,src:'/media/home/statement.png'}};
const local=resolveHomeLocalMedia(slot,active);

test('R1 SSOT: same eight Figma/CMS slot IDs, default null is explicit',()=>{
  assert.equal(Object.keys(homeMediaSlots).length,8);
  assert.deepEqual(Object.keys(homeLocalMediaSlots).sort(),Object.keys(homeMediaSlots).sort());
  assertHomeLocalMediaRegistry();
  assert.equal(homeLocalMediaSlots[slot].src,null);
  assert.equal(resolveHomeLocalMedia(slot),null);
});
test('R1 manual path resolves to the photo slot and does not fabricate CMS assetId',()=>{
  assert.equal(local.kind,'local');assert.equal(local.assetId,null);
  assert.equal(local.src,'/media/home/statement.png');assert.equal(local.width,1448);assert.equal(local.height,1086);
});
test('R1 root paths accept non-ASCII filenames but reject traversal/external URLs',()=>{
  assert.doesNotThrow(()=>assertHomeLocalMediaPath('/media/home/교육장.png'));
  for(const path of ['https://x.tld/f.png','//x/f.png','/media/home/../secret.png','/media/home/x/./a.png',
    '/media/home/x.png?d=1','/media/home/x.svg','/media/home/x%2f.png','/api/media/home/f.png']){
    assert.throws(()=>assertHomeLocalMediaPath(path),/SMD_HOME_LOCAL_MEDIA_PATH_INVALID/);
  }
});
test('R1 registered path with invalid metadata rejects rather than hiding error',()=>{
  const corrupt={...homeLocalMediaSlots,[slot]:{...source,src:'/media/home/a.png',width:null}};
  assert.throws(()=>resolveHomeLocalMedia(slot,corrupt),/SMD_HOME_LOCAL_MEDIA_METADATA_INVALID/);
});
test('R1 standalone local selects manual image',()=>{
  assert.deepEqual(selectHomeMediaSlot('standalone',{kind:'local'},null,local),local);
});
test('R1 standalone published ignores local draft',()=>{
  const published={kind:'published',publicationId:'id',assetId:'sm_abc',src:'/api/media/standalone/..',alt:'remote',title:'remote',width:8,height:8,mimeType:'image/png'};
  assert.deepEqual(selectHomeMediaSlot('standalone',published,null,local),published);
});
test('R1 standalone published unbound never falls back to local draft',()=>{
  assert.equal(selectHomeMediaSlot('standalone',{kind:'unbound'},null,local),null);
});
test('R1 CMS mode uses publication image and never falls back to local',()=>{
  const cms={src:'/api/media/home-r2/sm_1',alt:'cms',title:'cms',width:100,height:100,assetId:'sm_1'};
  assert.deepEqual(selectHomeMediaSlot('cms',{kind:'local'},cms,local),{...cms,kind:'cms'});
  assert.equal(selectHomeMediaSlot('cms',{kind:'local'},null,local),null);
});
test('R1 authority missing is an explicit error',()=>{
  assert.throws(()=>selectHomeMediaSlot('standalone',null,null,local),/SMD_HOME_MEDIA_AUTHORITY_MISSING/);
});
