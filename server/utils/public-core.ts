import type { H3Event } from 'h3';
/** PublicSurface is an explicit capability, not an unrestricted Core proxy. */
type PublicBinding = { fetch(request: Request): Promise<Response> };
/** Standalone media must be scoped to an active publication, never a bare asset ID. */
const standaloneMediaCorePath=/^\/v1\/standalone\/media\/[0-9a-f-]{36}\/sm_[a-f0-9]{64}$/;
const publicPaths:Readonly<Record<string,readonly RegExp[]>>={
  GET:[/^\/v1\/standalone\/media\/manifest$/, standaloneMediaCorePath, /^\/v6\/render$/, /^\/v6\/media\/home-r2\/sm_[a-f0-9]{64}$/, /^\/v5\/render$/, /^\/v5\/media\/image\/sm_[a-f0-9]{64}$/, /^\/v5\/media\/brand\/sb_[a-f0-9]{64}$/, /^\/v5\/brand\/current$/, /^\/v4\/render$/, /^\/v4\/archive\/media\/[a-f0-9]{64}\.(?:png|webp|jpe?g)$/, /^\/v3\/render$/, /^\/v3\/sitemap$/, /^\/v1\/content$/, /^\/v2\/content$/],
  HEAD:[standaloneMediaCorePath, /^\/v6\/media\/home-r2\/sm_[a-f0-9]{64}$/, /^\/v5\/media\/image\/sm_[a-f0-9]{64}$/, /^\/v5\/media\/brand\/sb_[a-f0-9]{64}$/],
  POST:[/^\/v1\/bot\/ask$/, /^\/v1\/inquiries$/, /^\/v1\/hooks\/ask$/]
};
function binding(event:H3Event):PublicBinding {
  const worker=(event.context as {cloudflare?:{env?:{SMD_CORE?:PublicBinding}}}).cloudflare?.env?.SMD_CORE;
  if(!worker)throw createError({statusCode:503,statusMessage:'CORE_SERVICE_BINDING_UNAVAILABLE'});
  return worker;
}
function admit(path:string, method:string){
  const pathname=path.split('?',1)[0]??'';
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('#') &&
    (publicPaths[method]??[]).some(rule=>rule.test(pathname));
}
function coreURL(path:string,method:string){
  if(!admit(path,method))throw createError({statusCode:403,statusMessage:'PUBLIC_CORE_ROUTE_NOT_ADMITTED'});
  return `https://smd-core.internal${path}`;
}
export function coreBindingAvailable(event:H3Event):boolean{
  return Boolean((event.context as {cloudflare?:{env?:{SMD_CORE?:PublicBinding}}}).cloudflare?.env?.SMD_CORE);
}
export function sameOrigin(event:H3Event):void{
  const origin=getHeader(event,'origin');
  const host=getRequestURL(event).origin;
  if(!origin||origin!==host)throw createError({statusCode:403,statusMessage:'CROSS_ORIGIN_MUTATION_REJECTED'});
}
function trustedClientIp(event:H3Event):string|undefined{
  // Absent Cloudflare execution context is NOT proof of trusted edge headers.
  const runtime=(event.context as {cloudflare?:{env?:unknown}}).cloudflare;
  if(!runtime?.env)return undefined;
  const ip=getHeader(event,'cf-connecting-ip');
  return ip && /^(?:[0-9a-fA-F:.]+)$/.test(ip) ? ip : undefined;
}
function publicHeaders(event:H3Event, payload:boolean):Headers{
  const headers=new Headers({accept:'application/json'});
  const ip=trustedClientIp(event);
  if(ip)headers.set('CF-Connecting-IP',ip);
  if(payload)headers.set('content-type','application/json');
  // Do NOT forward Cf-Access-Jwt-Assertion or any admin authority from public ingress.
  return headers;
}
export async function coreRequest<T>(event:H3Event,path:string,method:'GET'|'POST'='GET',payload?:unknown):Promise<T>{
  const request=new Request(coreURL(path,method),{
    method,headers:publicHeaders(event,payload!==undefined),
    body:payload===undefined?undefined:JSON.stringify(payload)
  });
  const response=await binding(event).fetch(request);
  setResponseStatus(event,response.status);
  setHeader(event,'cache-control','no-store');
  const parsed:unknown=await response.json().catch(()=>{throw createError({statusCode:503,statusMessage:'CORE_INVALID_JSON_RESPONSE'});});
  return parsed as T;
}
/** Do not JSON reserialize a signed webhook. The raw bytes are the signed authority. */
export async function webhookRequest<T>(event:H3Event):Promise<T>{
  const bytes=await readRawBody(event,false);
  if(!bytes)throw createError({statusCode:400,statusMessage:'WEBHOOK_BODY_REQUIRED'});
  const headers=new Headers({'content-type':'application/json'});
  for(const key of ['X-SMD-Timestamp','X-SMD-Event-Id','X-SMD-Signature']){
    const value=getHeader(event,key);
    if(value)headers.set(key,value);
  }
  const request=new Request(coreURL('/v1/hooks/ask','POST'),{method:'POST',headers,body:new Uint8Array(bytes)});
  const response=await binding(event).fetch(request);
  setResponseStatus(event,response.status);
  setHeader(event,'cache-control','no-store');
  return await response.json() as T;
}
/** Preserves bodyless 308 and 4xx/5xx status from the Core publication resolver. */
export async function coreResponse(event:H3Event,path:string):Promise<Response>{
  const request=new Request(coreURL(path,'GET'),{method:'GET',headers:publicHeaders(event,false)});
  return binding(event).fetch(request);
}

/** SiteMedia bytes: exact allowlisted GET/HEAD, never JSON, never Admin credentials. */
export async function coreMediaResponse(event:H3Event,path:string,method:'GET'|'HEAD'):Promise<Response>{
  if(!(standaloneMediaCorePath.test(path)||
      /^\/v6\/media\/home-r2\/sm_[a-f0-9]{64}$/.test(path)||
      /^\/v5\/media\/image\/sm_[a-f0-9]{64}$/.test(path)||
      /^\/v5\/media\/brand\/sb_[a-f0-9]{64}$/.test(path)))
    throw createError({statusCode:403,statusMessage:'PUBLIC_MEDIA_ROUTE_NOT_ADMITTED'});
  const headers=new Headers({accept:path.includes('/brand/')?'image/svg+xml':'image/png, image/jpeg, image/webp'});
  const etag=getHeader(event,'if-none-match');
  if(etag && etag.length<=256)headers.set('if-none-match',etag);
  return binding(event).fetch(new Request(coreURL(path,method),{method,headers}));
}
