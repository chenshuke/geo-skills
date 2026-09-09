#!/usr/bin/env node
// Best GEO CLI defaults helper. Authentication is owned by best-geo.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { call, plan, apply } = require('../../geo-runtime/scripts/best_geo.js');
const defaultsFile = path.join(os.homedir(), '.best-geo', 'geo-skill-defaults.json');
function arg(k){const i=process.argv.indexOf('--'+k);return i>=0?process.argv[i+1]:null}
function has(k){return process.argv.includes('--'+k)}
function list(v){return String(v||'').split(/[,，|]/).map(x=>x.trim()).filter(Boolean)}
function rows(r){const d=r?.data||r; return Array.isArray(d?.data)?d.data:Array.isArray(d?.list)?d.list:Array.isArray(d)?d:[]}
function save(v){fs.mkdirSync(path.dirname(defaultsFile),{recursive:true});fs.writeFileSync(defaultsFile,JSON.stringify(v,null,2)+'\n')}
(async()=>{
  if(has('help')){console.log('best-geo defaults: --list | --auto | --company-id ID --product-id ID | --create-company --company-name NAME | --create-product --company-id ID --product-name NAME --keywords a,b --target-words a,b [--force]');return}
  const companies=rows(await call('companies.list',{page:1,limit:100})).map(x=>({id:Number(x.id),name:x.name||x.title||''}));
  let companyId=Number(arg('company-id')||0), productId=Number(arg('product-id')||0);
  if(has('create-company')){
    const payload={name:arg('company-name')||'',description:arg('company-description')||arg('company-name')||''}; if(!payload.name)throw Error('需要 --company-name');
    if(!has('force')){console.log(JSON.stringify({dryRun:true,capability:'companies.create',payload},null,2));return}
    const p=await plan('companies.create',payload); await apply(p?.data?.planId||p?.planId); }
  if(!companyId){ if(companies.length!==1&&!has('auto')){console.log(JSON.stringify({companies,next:'请传 --company-id'},null,2));return} companyId=companies[0]?.id||0; }
  const products=companyId?rows(await call('products.list',{companyId,page:1,limit:100})).map(x=>({id:Number(x.id),name:x.name||x.title||''})):[];
  if(has('create-product')){
    const payload={companyId,name:arg('product-name')||'',keyword:list(arg('keywords')),targetWord:list(arg('target-words'))}; if(!payload.name||!payload.keyword.length||!payload.targetWord.length)throw Error('创建产品需要 --product-name、--keywords、--target-words');
    if(!has('force')){console.log(JSON.stringify({dryRun:true,capability:'products.create',payload},null,2));return}
    const p=await plan('products.create',payload); await apply(p?.data?.planId||p?.planId); }
  if(!productId&&products.length===1)productId=products[0].id;
  const result={companies,selectedCompanyId:companyId||null,products,selectedProductId:productId||null};
  if(companyId&&productId){save({companyId,productId,updatedAt:new Date().toISOString()});result.saved=defaultsFile;}
  console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.message||e);process.exit(1)});
