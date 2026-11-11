import {validateRenderResponseV5} from './site-media-v5-render.ts';
import {validateHomeR2PublicProjection} from '../../app/utils/home-r2-v6-public.ts';
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fields=(x:Record<string,unknown>,list:readonly string[])=>
  JSON.stringify(Object.keys(x).sort())===JSON.stringify([...list].sort());
const fail=(code:string):never=>{throw createError({statusCode:503,statusMessage:code});};
/** V6 is never sent through the V5 schema decoder by altering its schema tag.
 * A V5-compatible projection is checked independently after removing the one
 * V6-only field, then new Home authority is checked against the exact pub.
 */
export async function validateHomeR2RenderEnvelopeV6(raw:unknown,path:string){
  if(!record(raw)||!fields(raw,['schema','kind','render'])||
    raw.schema!=='SMD_RENDER_ENVELOPE_V6'||raw.kind!=='home-r2-v1'||!record(raw.render))
    return fail('SMD_HOME_M4_V6_ENVELOPE_INVALID');
  const render=raw.render;
  if(!fields(render,['schema','publication','requestedPath','resolvedPath','shared','selected','homeR2'])||
     render.schema!=='SMD_RENDER_RESPONSE_V6'||!record(render.publication))
     return fail('SMD_HOME_M4_V6_RENDER_INVALID');
  const {homeR2,...legacyFields}=render;
  const legacy={...legacyFields,schema:'SMD_RENDER_RESPONSE_V5'};
  // Existing V5 category, navigation, media and publication validators remain authority.
  const v5=await validateRenderResponseV5(legacy,path);
  let projection;
  try{projection=validateHomeR2PublicProjection(homeR2,v5.publication);}
  catch{return fail('SMD_HOME_M4_V6_PROJECTION_INVALID');}
  return {...v5,schema:'SMD_RENDER_RESPONSE_V6' as const,homeR2:projection};
}
