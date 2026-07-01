#!/usr/bin/env node
/**
 * GEO publication status checker.
 * Maps articleId -> publication task -> publishedUrl/status and writes a publish status table.
 * Never prints Base URL or full openKey.
 */
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders, mask } = require('../../geo-runtime/scripts/credentials.js');
const { unwrapRows, normalizePublicationStatus, hasAnyId } = require('../../geo-runtime/scripts/publication_helpers.js');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) { out._.push(token); continue; }
    const raw = token.slice(2);
    if (raw.startsWith('no-')) { out[raw.slice(3)] = false; continue; }
    const eq = raw.indexOf('=');
    if (eq >= 0) { out[raw.slice(0, eq)] = raw.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[raw] = true;
    else { out[raw] = next; i++; }
  }
  return out;
}
function first(args, names, fallback = undefined) { for (const n of names) if (args[n] !== undefined && args[n] !== '') return args[n]; return fallback; }
function splitList(v) { return String(v || '').split(/[,，\n|]/).map(s => s.trim()).filter(Boolean); }
function asIds(v) { return splitList(v).map(Number).filter(n => Number.isFinite(n) && n > 0); }
function today() { return new Date().toISOString().slice(0, 10); }
function nowIso() { return new Date().toISOString(); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); return dir; }
function usage() {
  console.log(`Usage:
  node geo-publish/scripts/publication_status.js --article-ids 101,102 --project-dir 项目_品牌GEO
  node geo-publish/scripts/publication_status.js --task-ids 88,89 --limit 200
  node geo-publish/scripts/publication_status.js --project-dir 项目_品牌GEO --json-out publish-status.json

Purpose:
  发布任务创建后，回查 /v1/publication-task 和 /v1/publication，输出 articleId -> publishedUrl 状态表。

Options:
  --article-id / --article-ids <ids>   只关注这些 articleId
  --task-id / --task-ids <ids>         只关注这些 publication task id
  --company-id / --product-id <id>     默认从 geo-config defaults 读取
  --page <n> --limit <n>               默认 page=1 limit=200
  --project-dir <dir>                  输出到 06_发布记录/发布状态回查/
  --output-dir <dir>                   自定义输出目录
  --dry-run                            只展示将请求的接口路径，不访问 API
  --json-out <file>                    另存 JSON
`);
}
function outputDir(args) {
  const explicit = first(args, ['output-dir','outputDir']);
  if (explicit) return path.resolve(String(explicit));
  const projectDir = path.resolve(String(first(args, ['project-dir','projectDir'], '.')));
  return path.join(projectDir, '06_发布记录', '发布状态回查');
}
function apiPath(pathname, query = {}) {
  const qs = new URLSearchParams();
  for (const [k,v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${pathname}?${s}` : pathname;
}
function base(cfg) { return String(cfg.geo.baseUrl || '').replace(/\/$/, ''); }
async function request(cfg, pathname, query = {}) {
  const pathOnly = apiPath(pathname, query);
  const res = await fetch(`${base(cfg)}${pathOnly}`, { headers: { ...geoHeaders(cfg), Accept: 'application/json' } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) {
    const msg = body && typeof body === 'object' ? (body.message || body.msg || JSON.stringify(body).slice(0,500)) : String(body).slice(0,500);
    throw new Error(`GEO API GET ${pathname} failed: HTTP ${res.status}; ${msg}`);
  }
  return body;
}
function rowsOf(body) { return unwrapRows(body); }
function mdEscape(s) { return String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 160); }
function renderMd(rows, meta) {
  const lines = ['# 发布状态回查表', '', `更新时间：${nowIso()}`, ''];
  lines.push(`- Referer：${meta.referer || '(未配置)'}`);
  lines.push(`- openKey：${meta.openKey || '(empty)'}`);
  lines.push(`- companyId/productId：${meta.companyId || 0} / ${meta.productId || 0}`);
  lines.push(`- 结论提醒：有 publishedUrl 只代表平台发布 URL 已拿到；是否被 AI 看见，还必须交给 geo-indexing 做 searchedSites 命中检测。`);
  lines.push('', '| articleId | publicationId | taskId | platform | account | status | 最新 | 时间 | publishedUrl | 下一步 |', '|---:|---:|---:|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const time = r.updatedAt || r.createdAt || '';
    lines.push(`| ${r.articleId || ''} | ${r.publicationId || r.sourceRecordId || ''} | ${r.taskId || ''} | ${mdEscape(r.platform)} | ${mdEscape(r.accountName || r.accountId)} | ${r.status} | ${r.isLatest || ''} | ${mdEscape(time)} | ${r.publishedUrl ? `[URL](${r.publishedUrl})` : ''} | ${mdEscape(r.nextAction)} |`);
  }
  return lines.join('\n');
}
function csvEscape(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function renderCsv(rows) {
  const fields = ['articleId','publicationId','sourceRecordId','taskId','platform','accountId','accountName','title','status','isLatest','createdAt','updatedAt','rawStatus','rawMessage','publishedUrl','nextAction'];
  return [fields.join(','), ...rows.map(r => fields.map(f => csvEscape(r[f])).join(','))].join('\n') + '\n';
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const cfg = loadGeoConfig();
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
  const companyId = Number(first(args, ['company-id','companyId'], cfg.defaults.companyId || 0));
  const productId = Number(first(args, ['product-id','productId'], cfg.defaults.productId || 0));
  if (!companyId || !productId) throw new Error('缺少 companyId/productId，请先配置 defaults 或传 --company-id/--product-id。');
  const articleFilter = [...new Set([...asIds(first(args, ['article-id','articleId'], '')), ...asIds(first(args, ['article-ids','articleIds'], ''))])];
  const taskFilter = [...new Set([...asIds(first(args, ['task-id','taskId'], '')), ...asIds(first(args, ['task-ids','taskIds'], ''))])];
  const query = { page: first(args, ['page'], 1), limit: first(args, ['limit'], 200), companyId, productId };
  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  const paths = {
    publicationTask: apiPath('/v1/publication-task', query),
    publication: apiPath('/v1/publication', query),
  };
  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, request: { paths, openKey: mask(cfg.geo.openKey), referer: cfg.geo.referer || '' }, filters: { articleIds: articleFilter, taskIds: taskFilter } }, null, 2));
    return;
  }
  const [taskBody, publicationBody] = await Promise.all([
    request(cfg, '/v1/publication-task', query),
    request(cfg, '/v1/publication', query),
  ]);
  const filters = [...articleFilter, ...taskFilter];
  const tasks = rowsOf(taskBody).filter(t => hasAnyId(t, filters));
  const publications = rowsOf(publicationBody).filter(p => hasAnyId(p, filters));
  const rows = normalizePublicationStatus({ tasks, publications, articleFilter, taskFilter });
  const dir = outputDir(args);
  ensureDir(dir);
  const stamp = today();
  const files = {
    md: path.join(dir, `发布状态回查_${stamp}.md`),
    csv: path.join(dir, `publication_status_${stamp}.csv`),
    json: path.join(dir, `publication_status_${stamp}.json`),
  };
  const meta = { companyId, productId, referer: cfg.geo.referer || '', openKey: mask(cfg.geo.openKey), paths };
  fs.writeFileSync(files.md, renderMd(rows, meta), 'utf8');
  fs.writeFileSync(files.csv, renderCsv(rows), 'utf8');
  fs.writeFileSync(files.json, JSON.stringify({ meta, rows }, null, 2), 'utf8');
  const jsonOut = first(args, ['json-out','jsonOut']);
  if (jsonOut) { ensureDir(path.dirname(path.resolve(jsonOut))); fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ meta, rows, files }, null, 2), 'utf8'); }
  console.log(JSON.stringify({ action: 'publication-status', count: rows.length, readyUrls: rows.filter(r => r.publishedUrl).length, needsFollowUp: rows.filter(r => !r.publishedUrl || r.status !== 'published_url_ready').length, files }, null, 2));
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
