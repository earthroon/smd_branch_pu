import {coreResponse} from '../utils/public-core';
export default defineEventHandler(async(event)=>{
  setHeader(event,'cache-control','no-store');
  const origin=process.env.SMD_CANONICAL_PUBLIC_ORIGIN;
  if(!origin||!/^https:\/\/[a-z0-9.-]+$/i.test(origin)||origin.includes('REPLACE'))
    throw createError({statusCode:503,statusMessage:'SITEMAP_ORIGIN_NOT_VERIFIED'});
  const response=await coreResponse(event,'/v3/sitemap');
  if(!response.ok)throw createError({statusCode:503,statusMessage:'SITEMAP_PUBLICATION_UNAVAILABLE'});
  const result=await response.json() as {publication?:{digest?:string};paths?:unknown};
  if(!result.publication?.digest||!Array.isArray(result.paths)||
    !result.paths.every(x=>typeof x==='string'&&(/^\/[a-z0-9/-]*$/).test(x)&&!x.includes('//')))
    throw createError({statusCode:503,statusMessage:'SITEMAP_CONTENT_INVALID'});
  setHeader(event,'content-type','application/xml; charset=utf-8');
  setHeader(event,'x-smd-publication-digest',result.publication.digest);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    result.paths.map(p=>`  <url><loc>${origin}${p}</loc></url>`).join('\n')
  }\n</urlset>`;
});
