#!/usr/bin/env node
/**
 * GEO publication status checker.
 * Maps articleId -> publication task -> publishedUrl/status and writes a publish status table.
 * Never prints Base URL or full openKey.
 */
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders, mask } = require('../../geo-runtime/scripts/credentials.js');

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
function rowsOf(body) {
  const d = body && body.data !== undefined ? body.data : body;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.records)) return d.records;
  return [];
}
function stableJson(v) { try { return JSON.stringify(v); } catch { return String(v); } }
function includesAnyId(obj, ids) {
  if (!ids.length) return true;
  const s = stableJson(obj);
  return ids.some(id => s.includes(String(id)));
}
function collectArticleIds(obj, out = new Set()) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) { for (const x of obj) collectArticleIds(x, out); return out; }
  for (const [k,v] of Object.entries(obj)) {
    if (/article[_-]?id/i.test(k) && Number(v)) out.add(Number(v));
    if (v && typeof v === 'object') collectArticleIds(v, out);
  }
  return out;
}
function collectTaskIds(obj, out = new Set(), includeGenericId = false) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) { for (const x of obj) collectTaskIds(x, out, includeGenericId); return out; }
  for (const [k,v] of Object.entries(obj)) {
    if (((includeGenericId && /^id$/i.test(k)) || /task[_-]?id/i.test(k) || /publication[_-]?task[_-]?id/i.test(k)) && Number(v)) out.add(Number(v));
    if (v && typeof v === 'object') collectTaskIds(v, out, includeGenericId);
  }
  return out;
}
function collectUrls(obj, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) { for (const x of obj) collectUrls(x, out); return out; }
  for (const [k,v] of Object.entries(obj)) {
    if (typeof v === 'string' && /^https?:\/\//i.test(v) && /(published|publish|url|link|href)/i.test(k)) out.push({ key: k, url: v });
    else if (v && typeof v === 'object') collectUrls(v, out);
  }
  return out;
}
function pickFirst(obj, names) {
  if (!obj || typeof obj !== 'object') return '';
  for (const n of names) if (obj[n] !== undefined && obj[n] !== null && obj[n] !== '') return obj[n];
  return '';
}
function findByKeyRegex(obj, regex) {
  if (!obj || typeof obj !== 'object') return '';
  if (Array.isArray(obj)) { for (const x of obj) { const r = findByKeyRegex(x, regex); if (r !== '') return r; } return ''; }
  for (const [k,v] of Object.entries(obj)) {
    if (regex.test(k) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) return v;
    if (v && typeof v === 'object') { const r = findByKeyRegex(v, regex); if (r !== '') return r; }
  }
  return '';
}
function inferStatus(row) {
  const publishedUrl = row.publishedUrl || '';
  const text = `${row.rawStatus || ''} ${row.rawMessage || ''} ${row.failureReason || ''}`.toLowerCase();
  if (publishedUrl) return 'published_url_ready';
  if (/fail|error|失败|异常|驳回|拒绝/.test(text)) return 'failed';
  if (/人工|手动|待处理|需处理|登录|验证码|授权|cookie/.test(text)) return 'manual_required';
  if (/success|done|完成|已发布|published/.test(text)) return 'published_no_url';
  return 'pending_or_processing';
}
function nextAction(row) {
  if (row.status === 'published_url_ready') return '拿 publishedUrl 去 geo-indexing 做 searchedSites 精确命中检测';
  if (row.status === 'published_no_url') return '继续回查 /v1/publication；若长时间无 URL，人工核验平台后台';
  if (row.status === 'failed') return '查看 failureReason/rawMessage，修复账号/封面/标题/平台规则后重发';
  if (row.status === 'manual_required') return '进入平台账号做人工处理/重新授权/验证码处理后再回查';
  return '等待发布完成，稍后再次运行 publication_status.js 回查';
}
function normalizePublicationRows({ tasks, publications, articleFilter, taskFilter }) {
  const taskByArticle = new Map();
  const taskById = new Map();
  for (const t of tasks) {
    const tids = [...collectTaskIds(t, new Set(), true)];
    for (const tid of tids) taskById.set(Number(tid), t);
    for (const aid of collectArticleIds(t)) {
      if (!taskByArticle.has(Number(aid))) taskByArticle.set(Number(aid), []);
      taskByArticle.get(Number(aid)).push(t);
    }
  }
  const rows = [];
  for (const p of publications) {
    const articleIds = [...collectArticleIds(p)];
    const taskIds = [...collectTaskIds(p, new Set(), false)].filter(id => taskById.has(Number(id)) || /publicationTaskId|taskId/i.test(stableJson(p)));
    const urls = collectUrls(p);
    const publishedUrl = String(pickFirst(p, ['publishedUrl','publishUrl','articleUrl','postUrl','platformUrl','url']) || urls[0]?.url || '');
    const primaryArticleIds = articleIds.length ? articleIds : articleFilter;
    for (const articleId of (primaryArticleIds.length ? primaryArticleIds : [0])) {
      if (articleFilter.length && !articleFilter.includes(Number(articleId))) continue;
      const relatedTasks = taskByArticle.get(Number(articleId)) || [];
      const taskId = Number(taskIds[0] || relatedTasks[0]?.id || relatedTasks[0]?.taskId || 0);
      if (taskFilter.length && !taskFilter.includes(taskId) && !includesAnyId(p, taskFilter)) continue;
      const rawStatus = pickFirst(p, ['status','publishStatus','state','resultStatus','auditStatus']) || findByKeyRegex(p, /status|state/i);
      const rawMessage = pickFirst(p, ['message','msg','remark','reason','errorMessage']) || findByKeyRegex(p, /message|remark|reason|error/i);
      const row = {
        articleId: Number(articleId) || '',
        taskId: taskId || '',
        platform: String(pickFirst(p, ['platform','publishPlatform','mediaPlatform']) || findByKeyRegex(p, /platform/i) || ''),
        accountId: String(pickFirst(p, ['accountId','publishAccountId','publicationAccountId']) || findByKeyRegex(p, /account.*id/i) || ''),
        accountName: String(pickFirst(p, ['accountName','name','nickname']) || findByKeyRegex(p, /account.*name|nickname/i) || ''),
        title: String(pickFirst(p, ['title','articleTitle']) || findByKeyRegex(p, /title/i) || ''),
        rawStatus: String(rawStatus ?? ''),
        rawMessage: String(rawMessage ?? ''),
        publishedUrl,
        failureReason: String(rawMessage ?? ''),
        raw: p,
      };
      row.status = inferStatus(row);
      row.nextAction = nextAction(row);
      rows.push(row);
    }
  }
  // If no publication rows yet, still emit task-level rows so users do not mistake task-created for published.
  if (!rows.length) {
    for (const t of tasks) {
      const tids = [...collectTaskIds(t, new Set(), true)];
      if (taskFilter.length && !tids.some(id => taskFilter.includes(Number(id)))) continue;
      const articleIds = [...collectArticleIds(t)].filter(id => !articleFilter.length || articleFilter.includes(Number(id)));
      for (const articleId of (articleIds.length ? articleIds : articleFilter.length ? articleFilter : [0])) {
        rows.push({
          articleId: Number(articleId) || '',
          taskId: Number(tids[0] || t.id || t.taskId || 0) || '',
          platform: String(findByKeyRegex(t, /platform/i) || ''),
          accountId: String(findByKeyRegex(t, /account.*id/i) || ''),
          accountName: String(findByKeyRegex(t, /account.*name|nickname/i) || ''),
          title: String(findByKeyRegex(t, /title|name/i) || ''),
          rawStatus: String(findByKeyRegex(t, /status|state/i) || ''),
          rawMessage: String(findByKeyRegex(t, /message|remark|reason|error/i) || ''),
          publishedUrl: '',
          failureReason: '',
          status: 'task_created_no_publication_url',
          nextAction: '任务已存在但未拿到 publishedUrl：继续回查 /v1/publication，不能判定为已被 AI 看见',
          raw: t,
        });
      }
    }
  }
  return rows.sort((a,b) => Number(a.articleId||0) - Number(b.articleId||0) || Number(a.taskId||0) - Number(b.taskId||0));
}
function mdEscape(s) { return String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 160); }
function renderMd(rows, meta) {
  const lines = ['# 发布状态回查表', '', `更新时间：${nowIso()}`, ''];
  lines.push(`- Referer：${meta.referer || '(未配置)'}`);
  lines.push(`- openKey：${meta.openKey || '(empty)'}`);
  lines.push(`- companyId/productId：${meta.companyId || 0} / ${meta.productId || 0}`);
  lines.push(`- 结论提醒：有 publishedUrl 只代表平台发布 URL 已拿到；是否被 AI 看见，还必须交给 geo-indexing 做 searchedSites 命中检测。`);
  lines.push('', '| articleId | taskId | platform | account | status | publishedUrl | 下一步 |', '|---:|---:|---|---|---|---|---|');
  for (const r of rows) lines.push(`| ${r.articleId || ''} | ${r.taskId || ''} | ${mdEscape(r.platform)} | ${mdEscape(r.accountName || r.accountId)} | ${r.status} | ${r.publishedUrl ? `[URL](${r.publishedUrl})` : ''} | ${mdEscape(r.nextAction)} |`);
  return lines.join('\n');
}
function csvEscape(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function renderCsv(rows) {
  const fields = ['articleId','taskId','platform','accountId','accountName','title','status','rawStatus','rawMessage','publishedUrl','nextAction'];
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
  const tasks = rowsOf(taskBody).filter(t => includesAnyId(t, [...articleFilter, ...taskFilter]));
  const publications = rowsOf(publicationBody).filter(p => includesAnyId(p, [...articleFilter, ...taskFilter]));
  const rows = normalizePublicationRows({ tasks, publications, articleFilter, taskFilter });
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
