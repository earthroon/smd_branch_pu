import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {aboutSourceAssets} from '../../app/data/about-r1-assets.generated.ts';
import {aboutSourceText} from '../../app/data/about-r1-copy.generated.ts';
import {aboutR1Source} from '../../app/data/about-r1-manifest.ts';
import {aboutSourceShapes} from '../../app/data/about-r1-shapes.generated.ts';
import {assertAboutR1Source} from '../../app/utils/aboutR1Admission.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const digest=b=>createHash('sha256').update(b).digest('hex');
export function verifyAboutAssets(base=root) {
  assertAboutR1Source();
  const freezeBytes=Buffer.from(readFileSync(resolve(base,'docs/migration/smd-about-r1/source-manifest.json'),'utf8').replace(/\r\n/g,'\n'));
  if(digest(freezeBytes)!==aboutR1Source.sourceManifestDigest)throw new Error('SMD_ABOUT_SOURCE_MANIFEST_DIGEST_MISMATCH');
  const freeze=JSON.parse(freezeBytes);
  const {sourceManifestDigest,...manifest}=aboutR1Source;
  for(const [actual,expected]of [[manifest,freeze.manifest],[aboutSourceText,freeze.text],
    [aboutSourceAssets,freeze.assets],[aboutSourceShapes,freeze.shapes]])
    if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('SMD_ABOUT_GENERATED_SOURCE_DRIFT');

  const assets=[...Object.values(aboutSourceAssets.photos),...Object.values(aboutSourceAssets.icons)];
  for(const a of assets) {
    const bytes=readFileSync(resolve(base,'public/about',a.fileName));
    if(bytes.length!==a.byteLength||digest(bytes)!==a.sha256)
      throw new Error('SMD_ABOUT_ASSET_BYTES_MISMATCH:'+a.fileName);
    if(a.fileName.endsWith('.png') &&
      (bytes.readUInt32BE(16)!==a.sourceWidth||bytes.readUInt32BE(20)!==a.sourceHeight))
      throw new Error('SMD_ABOUT_ASSET_DIMENSIONS_MISMATCH:'+a.fileName);
  }
  for(const row of Object.values(aboutSourceText))
    if(digest(Buffer.from(row.rawText,'utf8'))!==row.sourceTextDigest)
      throw new Error('SMD_ABOUT_TEXT_DIGEST_MISMATCH:'+row.sourceLayerId);
  return {text:59,photos:8,icons:4,sourceAuthority:'PSD_BUILD_SOURCE_V1'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log('PASS_SMD_ABOUT_SOURCE',JSON.stringify(verifyAboutAssets()));
