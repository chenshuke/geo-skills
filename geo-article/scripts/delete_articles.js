#!/usr/bin/env node
// Best GEO CLI implementation. Requires --force for the irreversible apply.
const fs = require('fs');
const { call, plan, apply } = require('../../geo-runtime/scripts/best_geo.js');
function arg(k){const i=process.argv.indexOf('--'+k);return i>=0?process.argv[i+1]:null}
function has(k){return process.argv.includes('--'+k)}
function ids(){let s=arg('id')||arg('ids'); if(arg('file')) s=fs.readFileSync(arg('file'),'utf8'); if(!s) return []; return [...new Set(String(s).split(/[\s,，]+/).filter(x=>/^\d+$/.test(x)).map(Number))].sort((a,b)=>a-b)}
(async()=>{
  const list=ids();
  if(!list.length){console.error('Usage: node delete_articles.js --id 123 | --ids 1,2 | --file ids.txt [--dry-run] [--force]');process.exit(1)}
  const previews=[]; for(const id of list){ try { const r=await call('articles.get',{id}); previews.push(r?.data || r); } catch { previews.push({id}); } }
  if(has('dry-run')||!has('force')) { console.log(JSON.stringify({dryRun:true,requiresForce:true,articles:previews},null,2)); if(!has('dry-run')) process.exit(2); return; }
  let ok=0,fail=0; for(const id of list){ try { const p=await plan('articles.delete',{id}); const pid=p?.data?.planId||p?.planId; if(!pid) throw new Error('CLI 未返回 planId'); await apply(pid); ok++; } catch(e){ console.error(`[${id}] ${e.message}`); fail++; } }
  console.log(JSON.stringify({action:'delete-articles',success:ok,failed:fail},null,2)); process.exit(fail?1:0);
})().catch(e=>{console.error(e.message||e);process.exit(1)});
