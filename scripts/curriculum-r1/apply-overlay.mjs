import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync,rmSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,dirname,sep,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const digest=b=>createHash('sha256').update(b).digest('hex');
const hash=p=>existsSync(p)?digest(readFileSync(p)):null;
const comparable=(p,text)=>!existsSync(p)?null:digest(text?Buffer.from(readFileSync(p,'utf8').replace(/\r\n/g,'\n')):readFileSync(p));
function inside(root,rel) {
  if(isAbsolute(rel)||rel.includes('\\')||rel.split('/').some(x=>x==='..'||x==='.'||x===''))
    throw new Error('OVERLAY_PATH_INVALID:'+rel);
  const dest=resolve(root,rel);
  if(!dest.startsWith(root+sep))throw new Error('OVERLAY_PATH_INVALID:'+rel);
  let parent=dirname(dest);
  while(parent!==root) {
    if(existsSync(parent)&&lstatSync(parent).isSymbolicLink())throw new Error('OVERLAY_SYMLINK_REFUSED:'+rel);
    parent=dirname(parent);
  }
  if(existsSync(dest)&&lstatSync(dest).isSymbolicLink())throw new Error('OVERLAY_SYMLINK_REFUSED:'+rel);
  return dest;
}
export function applyCurriculumOverlay(overlay,project) {
  const source=realpathSync(overlay),target=realpathSync(project);
  const manifest=JSON.parse(readFileSync(resolve(source,'SMD-CURRICULUM-R1_OVERLAY_MANIFEST.json'),'utf8'));
  if(manifest.schema!=='SMD_CURRICULUM_OVERLAY_V1'||manifest.repository!=='earthroon/SMD_PU'||!Array.isArray(manifest.files))
    throw new Error('OVERLAY_MANIFEST_INVALID');
  const pkg=JSON.parse(readFileSync(resolve(target,'package.json'),'utf8'));
  if(pkg.name!=='smd-public')throw new Error('OVERLAY_PROJECT_INVALID');
  const git=args=>execFileSync('git',args,{cwd:target,encoding:'utf8'}).trim();
  const remote=git(['remote','get-url','origin']).replace(/\.git$/,'').replace(/\/$/,'');
  if(!['https://github.com/earthroon/SMD_PU','git@github.com:earthroon/SMD_PU'].includes(remote))
    throw new Error('OVERLAY_REMOTE_INVALID:'+remote);
  for(const name of ['rebase-merge','rebase-apply','MERGE_HEAD'])
    if(existsSync(resolve(target,git(['rev-parse','--git-path',name]))))
      throw new Error('OVERLAY_GIT_OPERATION_IN_PROGRESS:'+name);
  const drift=(manifest.prerequisites??[]).filter(row=>comparable(inside(target,row.path),row.text)!==row.sha256);
  if(drift.length)throw new Error('OVERLAY_PREREQUISITE_DRIFT:'+drift.map(row=>row.path).join(','));
  const pending=[],ids=new Set();
  for(const row of manifest.files) {
    if(ids.has(row.path))throw new Error('OVERLAY_DUPLICATE_PATH:'+row.path);ids.add(row.path);
    const src=inside(source,row.path),dest=inside(target,row.path);
    if(hash(src)!==row.sha256)throw new Error('OVERLAY_BYTES_MISMATCH:'+row.path);
    const rawBeforeSha256=hash(dest),current=comparable(dest,row.text);
    if(current===row.sha256)continue;
    if(current!==row.beforeSha256&&!(row.compatibleBeforeSha256??[]).includes(current))throw new Error('OVERLAY_LOCAL_FILE_CHANGED:'+row.path);
    pending.push({...row,src,dest,rawBeforeSha256});
  }
  if(!pending.length)return {status:'ALREADY_APPLIED',files:0};
  const run='curriculum-r1-'+new Date().toISOString().replace(/[:.]/g,'-');
  const backup=resolve(target,'artifacts',run);
  mkdirSync(backup,{recursive:true});
  for(const row of pending)
    if(row.rawBeforeSha256!==null){const p=inside(backup,row.path);mkdirSync(dirname(p),{recursive:true});copyFileSync(row.dest,p);}
  const written=[];
  try {
    for(const row of pending) {
      if(hash(row.dest)!==row.rawBeforeSha256)throw new Error('OVERLAY_CURRENTNESS_CHANGED:'+row.path);
      mkdirSync(dirname(row.dest),{recursive:true});copyFileSync(row.src,row.dest);written.push(row);
      if(hash(row.dest)!==row.sha256)throw new Error('OVERLAY_COPY_VERIFY_FAILED:'+row.path);
    }
    writeFileSync(resolve(backup,'apply-result.json'),JSON.stringify({
      schema:'SMD_CURRICULUM_OVERLAY_APPLY_V1',baseCommit:manifest.baseCommit,
      files:written.map(x=>({path:x.path,beforeSha256:x.rawBeforeSha256,sha256:x.sha256})),
    },null,2)+'\n');
  } catch(error) {
    for(const row of written.reverse())
      if(row.rawBeforeSha256===null)rmSync(row.dest);
      else copyFileSync(inside(backup,row.path),row.dest);
    throw error;
  }
  return {status:'APPLIED',files:pending.length,backup};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==4)throw new Error('USAGE: node apply-overlay.mjs OVERLAY_ROOT PROJECT_ROOT');
  console.log(JSON.stringify(applyCurriculumOverlay(process.argv[2],process.argv[3])));
}
