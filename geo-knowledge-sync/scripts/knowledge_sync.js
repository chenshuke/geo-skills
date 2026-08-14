#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders, mask } = require('../../geo-runtime/scripts/credentials.js');
const { unwrapRows } = require('../../geo-runtime/scripts/json_helpers.js');

const TEXT_EXTS = new Set(['.md','.txt','.json','.csv','.html','.htm','.yaml','.yml','.xml']);

function parseArgs(argv) {
  const out = { _: [], source: [], sourceUrl: [] };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) { out._.push(token); continue; }
    const raw = token.slice(2); const eq = raw.indexOf('=');
    const key = eq >= 0 ? raw.slice(0, eq) : raw;
    const value = eq >= 0 ? raw.slice(eq + 1) : (!argv[i + 1] || argv[i + 1].startsWith('--') ? true : argv[++i]);
    if (key === 'source') out.source.push(value);
    else if (key === 'source-url' || key === 'sourceUrl') out.sourceUrl.push(value);
    else out[key] = value;
  }
  return out;
}
function first(args, names, fallback) { for (const n of names) if (args[n] !== undefined && args[n] !== '') return args[n]; return fallback; }
function splitList(v) { return String(v || '').split(/[,，|\n]/).map(x => x.trim()).filter(Boolean); }
function safeName(v, fallback = 'file') { return String(v || fallback).replace(/[\\/:*?"<>|]/g, '_').replace(/^\.+/, '').slice(0, 160) || fallback; }
function usage() { console.log(`Usage:
  node geo-knowledge-sync/scripts/knowledge_sync.js --action list [--name 关键词]
  node geo-knowledge-sync/scripts/knowledge_sync.js --action detail --knowledge-base-id 127
  node geo-knowledge-sync/scripts/knowledge_sync.js --action upload --source ./02_知识库 --name 品牌知识库 --tags 品牌,产品
  node geo-knowledge-sync/scripts/knowledge_sync.js --action upload --knowledge-base-id 127 --source ./新增资料 --force
  node geo-knowledge-sync/scripts/knowledge_sync.js --action download --knowledge-base-id 127 --output-dir ./平台备份

Uploads preview by default. Add --force only after user confirmation.`); }
function cfgChecked() {
  const cfg = loadGeoConfig();
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
  if (!Number(cfg.defaults.companyId)) throw new Error('未设置默认 companyId，请先使用 geo-config 选择公司。');
  return cfg;
}
function apiPathOnly(endpoint, query) {
  const qs = new URLSearchParams();
  for (const [k,v] of Object.entries(query || {})) if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
  return endpoint + (qs.toString() ? `?${qs}` : '');
}
async function request(cfg, method, endpoint, { query = {}, body } = {}) {
  const base = String(cfg.geo.baseUrl || '').replace(/\/$/, '');
  const relative = apiPathOnly(endpoint, query);
  const headers = { ...geoHeaders(cfg), Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8';
  const res = await fetch(base + relative, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok || (data && typeof data === 'object' && data.statusCode !== undefined && data.statusCode !== 0)) {
    const msg = data && typeof data === 'object' ? (data.message || data.msg || JSON.stringify(data).slice(0,500)) : String(data).slice(0,500);
    throw new Error(`${method} ${endpoint} 失败：HTTP ${res.status}；${msg}`);
  }
  return { data, request: { method, path: relative, openKey: mask(cfg.geo.openKey) } };
}
function dataObject(body) { return body?.data?.data || body?.data || body; }
function collectFiles(inputPaths, maxBytes) {
  const files = [];
  function walk(p, root) {
    const abs = path.resolve(p); const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        walk(path.join(abs, entry.name), root || abs);
      }
      return;
    }
    const ext = path.extname(abs).toLowerCase();
    if (!TEXT_EXTS.has(ext)) return;
    if (stat.size > maxBytes) throw new Error(`文件过大：${abs}（${stat.size} bytes），请拆分或使用URL。`);
    files.push({ name: root ? path.relative(root, abs).replace(/\\/g, '/') : path.basename(abs), file: fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '') });
  }
  for (const p of inputPaths) walk(p, null);
  return files;
}
function deepId(body) {
  const candidates = [body?.data?.id, body?.data?.data?.id, body?.id];
  return Number(candidates.find(Boolean) || 0);
}
async function listAction(cfg, args) {
  const query = { page: first(args,['page'],1), limit: first(args,['limit'],30), companyId: cfg.defaults.companyId, productId: first(args,['product-id','productId'], cfg.defaults.productId || undefined), name: first(args,['name'],undefined), status: first(args,['status'],undefined) };
  const res = await request(cfg, 'GET', '/v1/knowledge-base', { query });
  const rows = unwrapRows(res.data).map(x => ({ id:x.id, name:x.name, companyId:x.companyId, productId:x.productId, status:x.status, tags:x.tags || [], documentCount:(x.documents || []).length, createdAt:x.createdAt }));
  console.log(JSON.stringify({ rows, request: res.request }, null, 2));
}
async function detailAction(cfg, id) {
  const res = await request(cfg, 'GET', `/v1/knowledge-base/${id}`);
  console.log(JSON.stringify({ knowledgeBase: dataObject(res.data), request: res.request }, null, 2));
}
async function uploadAction(cfg, args) {
  const id = Number(first(args,['knowledge-base-id','knowledgeBaseId','id'],0));
  const sources = [...args.source, ...splitList(first(args,['sources'],''))].filter(Boolean);
  const maxBytes = Number(first(args,['max-file-bytes','maxFileBytes'],2 * 1024 * 1024));
  const files = collectFiles(sources, maxBytes);
  for (const url of args.sourceUrl) files.push({ name: safeName(new URL(String(url)).pathname.split('/').pop() || 'url-document'), file: String(url) });
  if (!files.length) throw new Error('没有可上传文件。支持文本文件/目录，或使用 --source-url。');
  const tags = splitList(first(args,['tags'],''));
  const payload = id ? { files } : { name:first(args,['name'], path.basename(path.resolve(sources[0] || '知识库'))), companyId:Number(first(args,['company-id','companyId'],cfg.defaults.companyId)), productId:Number(first(args,['product-id','productId'],cfg.defaults.productId || 0)) || null, tags, files };
  const preview = { dryRun:!args.force, action:id?'append':'create', endpoint:id?`/v1/knowledge-base/${id}/files`:'/v1/knowledge-base', knowledgeBaseId:id||undefined, name:payload.name, companyId:payload.companyId, productId:payload.productId, tags, files:files.map(f => ({ name:f.name, type:/^https?:\/\//i.test(f.file)?'url':'text', size:f.file.length })) };
  if (!args.force) { console.log(JSON.stringify(preview,null,2)); return; }
  const created = await request(cfg,'POST',id?`/v1/knowledge-base/${id}/files`:'/v1/knowledge-base',{body:payload});
  const knowledgeBaseId = id || deepId(created.data);
  if (!knowledgeBaseId) throw new Error('上传返回中没有知识库ID，无法完成回查。');
  const verified = await request(cfg,'GET',`/v1/knowledge-base/${knowledgeBaseId}`);
  const kb = dataObject(verified.data);
  console.log(JSON.stringify({ ok:true, knowledgeBaseId, name:kb.name, status:kb.status, documentCount:(kb.documents||[]).length, documents:(kb.documents||[]).map(d=>({id:d.id,name:d.name,fileName:d.fileName,status:d.status})) },null,2));
}
async function downloadAction(cfg, args) {
  const id = Number(first(args,['knowledge-base-id','knowledgeBaseId','id'],0));
  if (!id) throw new Error('download 需要 --knowledge-base-id。');
  const res = await request(cfg,'GET',`/v1/knowledge-base/${id}`); const kb = dataObject(res.data);
  const baseOut = path.resolve(String(first(args,['output-dir','outputDir'],path.join('02_知识库','平台下载'))));
  const out = path.join(baseOut, `知识库_${id}_${safeName(kb.name,'未命名')}`); fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'knowledge-base.json'),JSON.stringify(kb,null,2),'utf8');
  const lines = [`# ${kb.name || `知识库${id}`} 下载清单`,'',`- 知识库ID：${id}`,`- 标签：${(kb.tags||[]).join('、')}`,`- 状态：${kb.status}`,'','## 文档',''];
  const results=[];
  for (const doc of kb.documents || []) {
    const result={id:doc.id,name:doc.name,fileName:doc.fileName,fileUrl:doc.fileUrl||'',status:'metadata_only'};
    if (doc.fileUrl && !args['metadata-only'] && !args.metadataOnly) {
      try {
        const response=await fetch(doc.fileUrl); if(!response.ok) throw new Error(`HTTP ${response.status}`);
        const target=path.join(out,safeName(doc.fileName||doc.name||`document-${doc.id}`)); fs.writeFileSync(target,Buffer.from(await response.arrayBuffer())); result.status='downloaded'; result.localFile=target;
      } catch(e) { result.status='download_failed'; result.error=e.message; }
    } else if (!doc.fileUrl) result.status='no_file_url';
    results.push(result); lines.push(`- ${doc.name || doc.fileName || doc.id}：${result.status}${result.localFile ? `；${result.localFile}` : ''}`);
  }
  fs.writeFileSync(path.join(out,'manifest.md'),lines.join('\n')+'\n','utf8');
  console.log(JSON.stringify({ok:true,knowledgeBaseId:id,outputDir:out,documents:results},null,2));
}
async function main(){
  const args=parseArgs(process.argv); if(args.help||args.h){usage();return;} const action=String(first(args,['action'],args._[0]||'list')); const cfg=cfgChecked();
  if(action==='list') return listAction(cfg,args);
  if(action==='detail'){const id=Number(first(args,['knowledge-base-id','knowledgeBaseId','id'],0));if(!id)throw new Error('detail 需要知识库ID。');return detailAction(cfg,id);}
  if(action==='upload') return uploadAction(cfg,args);
  if(action==='download') return downloadAction(cfg,args);
  throw new Error(`未知 action：${action}`);
}
main().catch(e=>{console.error(e.message||e);process.exit(1);});
