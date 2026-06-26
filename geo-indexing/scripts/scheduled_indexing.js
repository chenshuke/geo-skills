#!/usr/bin/env node
/**
 * GEO Scheduled Indexing helper (Node/no-Python).
 *
 * Uses /v1/scheduled-indexing as the default AI indexing interface.
 * Never prints Base URL or openKey; previews show API paths only.
 */
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders, mask } = require('../../geo-runtime/scripts/credentials.js');

const ALL_PLATFORMS = ['deepseek','doubao','yuanbao','qwen','yiyan','kimi','zhipu','chatgpt','gemini','nami','grok','perp','poe'];
const WRITE_ACTIONS = new Set(['create','update','delete','run-now','suggest-competitors']);

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
function usage() {
  console.log(`Usage:
  node geo-indexing/scripts/scheduled_indexing.js --action create --file questions.md --platforms deepseek,doubao --name "每日收录" --dry-run
  node geo-indexing/scripts/scheduled_indexing.js --action run-now --id 123 --force
  node geo-indexing/scripts/scheduled_indexing.js --action answers --id 123 --platform deepseek --limit 50
  node geo-indexing/scripts/scheduled_indexing.js --action matrix --id 123 --limit 100

Actions:
  create               创建定时收录计划: POST /v1/scheduled-indexing
  list                 计划列表: GET /v1/scheduled-indexing
  detail               计划详情: GET /v1/scheduled-indexing/{id}
  update               更新计划/启停: PATCH /v1/scheduled-indexing/{id}
  delete               删除计划: DELETE /v1/scheduled-indexing/{id}
  run-now              立即执行一次: POST /v1/scheduled-indexing/{id}/run-now
  runs                 执行历史: GET /v1/scheduled-indexing/{id}/runs
  metrics              折线图数据: GET /v1/scheduled-indexing/{id}/metrics
  answers              大模型回答与引用: GET /v1/scheduled-indexing/{id}/answers
  matrix               问题×平台收录矩阵: GET /v1/scheduled-indexing/{id}/topic-platform-matrix
  topic-stats          按 topic 聚合统计: GET /v1/scheduled-indexing/{id}/topic-stats
  suggest-competitors  AI 建议竞品: POST /v1/scheduled-indexing/suggest-competitors

Create input:
  --file <path>              .md/.txt/.csv/.json questions
  --question <text>          单个问题
  --questions <a|b|c>        多个问题，用 | 或换行分隔
  --name <text>              计划名称，默认 定时收录-YYYY-MM-DD
  --platforms <list|all>     默认 all（含新增 nami/grok/perp/poe）
  --schedule-type <type>     daily | weekly | interval | once，默认 once
  --hours <0,8,16>           执行小时
  --weekdays <1,3,5>         weekly: 1=周一..7=周日
  --times-per-day <n>        daily 均分预设
  --interval-days <n>        interval 必填
  --times-per-cycle <n>      interval 均分预设
  --competitor-brands <a,b>  竞品品牌数组
  --screenshot-platforms <a,b> 截图平台数组(platforms 子集)
  --source <1|2|3>           采集模式
  --enabled <true|false>     默认 true
  --run-now                  创建成功后立即执行一次

Safety:
  写操作必须先 --dry-run；真实执行必须加 --force。输出不会展示 Base URL 或完整 openKey。
`);
}
function splitList(v, sep = /[,，]/) { return String(v || '').split(sep).map(s => s.trim()).filter(Boolean); }
function parseBool(v, fallback) { if (v === undefined || v === '') return fallback; if (typeof v === 'boolean') return v; return /^(1|true|yes|y|on)$/i.test(String(v)); }
function parseIds(v) { return splitList(v).map(Number).filter(n => Number.isFinite(n)); }
function today() { return new Date().toISOString().slice(0, 10); }
function decodeUtf8Strict(file) {
  const buf = fs.readFileSync(file);
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  if (replacementCount > 0) throw new Error(`文件不是有效 UTF-8，出现 ${replacementCount} 个 �：${file}`);
  return text.replace(/\r\n/g, '\n');
}
function stripMd(line) {
  return String(line)
    .replace(/^\s*>+\s*/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+[.)、]\s+/, '')
    .replace(/^\s*- \[[ xX]\]\s+/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}
function splitCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out.map(s => s.replace(/^"|"$/g, '').trim());
}
function parseCsv(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]).map(h => h.toLowerCase());
  const qIndex = header.findIndex(h => ['question','questions','topic','query','问题','搜索问题','主题'].includes(h));
  const start = qIndex >= 0 ? 1 : 0;
  const idx = qIndex >= 0 ? qIndex : 0;
  return lines.slice(start).map(l => splitCsvLine(l)[idx]).filter(Boolean);
}
function parseJsonQuestions(text) {
  const raw = JSON.parse(text);
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw.questions) ? raw.questions : Array.isArray(raw.topics) ? raw.topics : Array.isArray(raw.data) ? raw.data : [];
  return arr.map(x => typeof x === 'string' ? x : (x.question || x.topic || x.query || x.data || x.title || '')).filter(Boolean);
}
function parseMarkdownOrText(text) {
  text = text.replace(/^---[\s\S]*?---\s*/, '');
  const out = [];
  let inCode = false;
  let tableHeader = null;
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (/^```/.test(line)) { inCode = !inCode; continue; }
    if (inCode || !line) continue;
    if (/^#{1,6}\s+/.test(line)) continue;
    if (/^\|.*\|$/.test(line)) {
      const cells = line.split('|').slice(1, -1).map(s => s.trim());
      if (cells.every(c => /^:?-{2,}:?$/.test(c))) continue;
      if (!tableHeader) {
        const lower = cells.map(c => c.toLowerCase());
        if (lower.some(c => ['question','topic','query','问题','搜索问题','主题'].includes(c))) { tableHeader = lower; continue; }
      }
      const idx = tableHeader ? Math.max(0, tableHeader.findIndex(c => ['question','topic','query','问题','搜索问题','主题'].includes(c))) : 0;
      if (cells[idx]) out.push(cells[idx]);
      continue;
    }
    line = stripMd(line);
    if (line) out.push(line);
  }
  return out;
}
function readQuestions(args) {
  let arr = [];
  const file = first(args, ['file']);
  if (file) {
    const abs = path.resolve(String(file));
    const text = decodeUtf8Strict(abs);
    const ext = path.extname(abs).toLowerCase();
    if (ext === '.json') arr = parseJsonQuestions(text);
    else if (ext === '.csv' || ext === '.tsv') arr = parseCsv(ext === '.tsv' ? text.replace(/\t/g, ',') : text);
    else arr = parseMarkdownOrText(text);
  }
  const q = first(args, ['question','topic']); if (q) arr.push(String(q));
  const qs = first(args, ['questions','topics']); if (qs) arr.push(...String(qs).split(/\n|\|/));
  const seen = new Set(), out = [];
  for (const raw of arr) {
    const v = String(raw).replace(/\s+/g, ' ').trim();
    const key = v.toLowerCase();
    if (v && !seen.has(key)) { seen.add(key); out.push(v); }
  }
  return out.slice(0, Number(first(args, ['limit'], 200)) || 200);
}
function base(cfg) { return String(cfg.geo.baseUrl || '').replace(/\/$/, ''); }
function buildHeaders(cfg, json = false, extra = {}) {
  return { ...geoHeaders(cfg), Accept: 'application/json', ...(json ? {'Content-Type':'application/json; charset=utf-8'} : {}), ...extra };
}
function rowsOf(body) {
  const d = body && body.data !== undefined ? body.data : body;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.rows)) return d.rows;
  return [];
}
function apiPath(pathname, query = {}) {
  const qs = new URLSearchParams();
  for (const [k,v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach(x => qs.append(k, String(x)));
    else qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${pathname}?${s}` : pathname;
}
async function request(cfg, method, pathname, { query = {}, body, headers = {} } = {}) {
  const pathOnly = apiPath(pathname, query);
  const res = await fetch(`${base(cfg)}${pathOnly}`, { method, headers: buildHeaders(cfg, Boolean(body), headers), body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok || (data && typeof data === 'object' && data.statusCode !== undefined && data.statusCode !== 0)) {
    const msg = data && typeof data === 'object' ? (data.message || data.msg || JSON.stringify(data).slice(0,500)) : String(data).slice(0,500);
    throw new Error(`GEO API ${method} ${pathname} failed: HTTP ${res.status}; ${msg}`);
  }
  return data;
}
function scheduleConfig(args) {
  const inline = first(args, ['schedule-config-json','scheduleConfigJson']);
  if (inline) return JSON.parse(String(inline));
  const cfg = { type: String(first(args, ['schedule-type','scheduleType'], 'once')) };
  const hours = parseIds(first(args, ['hours'], '')); if (hours.length) cfg.hours = hours;
  const weekdays = parseIds(first(args, ['weekdays'], '')); if (weekdays.length) cfg.weekdays = weekdays;
  for (const [argKey, prop] of [
    ['times-per-day','timesPerDay'], ['timesPerDay','timesPerDay'],
    ['times-per-active-day','timesPerActiveDay'], ['timesPerActiveDay','timesPerActiveDay'],
    ['interval-days','intervalDays'], ['intervalDays','intervalDays'],
    ['times-per-cycle','timesPerCycle'], ['timesPerCycle','timesPerCycle'],
  ]) {
    const v = first(args, [argKey]);
    if (v !== undefined) cfg[prop] = Number(v);
  }
  return cfg;
}
function platforms(args) {
  const raw = String(first(args, ['platforms'], 'all')).trim();
  if (raw === 'all') return ALL_PLATFORMS;
  const out = splitList(raw).filter(p => ALL_PLATFORMS.includes(p));
  if (!out.length) throw new Error(`platforms 为空或不合法；可选 ${ALL_PLATFORMS.join(',')}`);
  return out;
}
function createPayload(args, cfg) {
  const companyId = Number(first(args, ['company-id','companyId'], cfg.defaults.companyId || 0));
  const productId = Number(first(args, ['product-id','productId'], cfg.defaults.productId || 0));
  if (!companyId || !productId) throw new Error('缺少 companyId/productId，请先配置 defaults 或传 --company-id/--product-id。');
  const topics = readQuestions(args);
  if (!topics.length) throw new Error('没有读取到问题，请传 --file/--question/--questions。');
  const payload = {
    name: String(first(args, ['name'], `定时收录-${today()}`)),
    companyId,
    productId,
    topics,
    platforms: platforms(args),
    scheduleConfig: scheduleConfig(args),
    enabled: parseBool(first(args, ['enabled'], undefined), true),
  };
  const screenshotPlatforms = splitList(first(args, ['screenshot-platforms','screenshotPlatforms'], ''));
  if (screenshotPlatforms.length) payload.screenshotPlatforms = screenshotPlatforms.filter(p => payload.platforms.includes(p));
  const source = first(args, ['source']); if (source !== undefined) payload.source = Number(source);
  const competitors = splitList(first(args, ['competitor-brands','competitorBrands'], ''));
  if (competitors.length) payload.competitorBrands = competitors;
  return payload;
}
function updatePayload(args, cfg) {
  const payload = {};
  for (const k of ['name']) { const v = first(args, [k]); if (v !== undefined) payload[k] = String(v); }
  for (const [arg, prop] of [['company-id','companyId'],['companyId','companyId'],['product-id','productId'],['productId','productId'],['source','source']]) {
    const v = first(args, [arg]); if (v !== undefined) payload[prop] = Number(v);
  }
  if (args.file || args.question || args.questions || args.topic || args.topics) payload.topics = readQuestions(args);
  if (first(args, ['platforms']) !== undefined) payload.platforms = platforms(args);
  if (first(args, ['screenshot-platforms','screenshotPlatforms']) !== undefined) payload.screenshotPlatforms = splitList(first(args, ['screenshot-platforms','screenshotPlatforms'], '')).filter(p => ALL_PLATFORMS.includes(p));
  if (first(args, ['competitor-brands','competitorBrands']) !== undefined) payload.competitorBrands = splitList(first(args, ['competitor-brands','competitorBrands'], ''));
  if (first(args, ['schedule-type','scheduleType','schedule-config-json','scheduleConfigJson','hours','weekdays','times-per-day','timesPerDay','interval-days','intervalDays']) !== undefined) payload.scheduleConfig = scheduleConfig(args);
  if (first(args, ['enabled']) !== undefined) payload.enabled = parseBool(first(args, ['enabled']), true);
  return payload;
}
function queryCommon(args, cfg) {
  const q = {};
  for (const key of ['page','limit','id','name','enabled','platform','topicId','startDate','endDate','runId','taskId']) {
    const v = first(args, [key, key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())]);
    if (v !== undefined && v !== true) q[key] = v;
  }
  const companyId = first(args, ['company-id','companyId'], cfg.defaults.companyId || '');
  if (companyId && ['list'].includes(String(first(args,['action'],'list')))) q.companyId = Number(companyId);
  return q;
}
function preview(method, path, body, cfg, extra = {}) {
  return { dryRun: true, request: { method, path, body: body || undefined, openKey: mask(cfg.geo.openKey), referer: cfg.geo.referer || '' }, ...extra };
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const action = String(first(args, ['action'], args._[0] || 'list'));
  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  const cfg = loadGeoConfig();
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
  if (WRITE_ACTIONS.has(action) && !dryRun && !args.force) throw new Error(`${action} 是写/耗资源操作。请先 --dry-run 预览，真实执行加 --force。`);
  const id = Number(first(args, ['id'], 0));
  let result;

  if (action === 'create') {
    const body = createPayload(args, cfg);
    if (dryRun) result = preview('POST', '/v1/scheduled-indexing', body, cfg);
    else {
      const created = await request(cfg, 'POST', '/v1/scheduled-indexing', { body });
      const scheduleId = Number(created?.data?.id || created?.id || 0);
      let runNow = null, detail = null;
      if (args['run-now'] || args.runNow) runNow = await request(cfg, 'POST', `/v1/scheduled-indexing/${scheduleId}/run-now`);
      if (scheduleId) detail = await request(cfg, 'GET', `/v1/scheduled-indexing/${scheduleId}`);
      result = { action, scheduleId, created: created.data || created, runNow: runNow ? (runNow.data || runNow) : null, verification: detail ? (detail.data || detail) : null };
    }
  } else if (action === 'list') {
    const query = queryCommon(args, cfg);
    const pathOnly = apiPath('/v1/scheduled-indexing', query);
    result = dryRun ? preview('GET', pathOnly, null, cfg) : { action, rows: rowsOf(await request(cfg, 'GET', '/v1/scheduled-indexing', { query })) };
  } else if (action === 'detail') {
    if (!id) throw new Error('detail 需要 --id。');
    result = dryRun ? preview('GET', `/v1/scheduled-indexing/${id}`, null, cfg) : { action, data: (await request(cfg, 'GET', `/v1/scheduled-indexing/${id}`)).data };
  } else if (action === 'update') {
    if (!id) throw new Error('update 需要 --id。');
    const body = updatePayload(args, cfg);
    result = dryRun ? preview('PATCH', `/v1/scheduled-indexing/${id}`, body, cfg) : { action, updated: (await request(cfg, 'PATCH', `/v1/scheduled-indexing/${id}`, { body })).data, verification: (await request(cfg, 'GET', `/v1/scheduled-indexing/${id}`)).data };
  } else if (action === 'delete') {
    if (!id) throw new Error('delete 需要 --id。');
    result = dryRun ? preview('DELETE', `/v1/scheduled-indexing/${id}`, null, cfg) : { action, deleted: await request(cfg, 'DELETE', `/v1/scheduled-indexing/${id}`) };
  } else if (action === 'run-now') {
    if (!id) throw new Error('run-now 需要 --id。');
    result = dryRun ? preview('POST', `/v1/scheduled-indexing/${id}/run-now`, null, cfg) : { action, run: (await request(cfg, 'POST', `/v1/scheduled-indexing/${id}/run-now`)).data };
  } else if (['runs','metrics','answers','topic-stats'].includes(action)) {
    if (!id) throw new Error(`${action} 需要 --id。`);
    const endpoint = action === 'topic-stats' ? 'topic-stats' : action;
    const query = queryCommon(args, cfg);
    delete query.id;
    result = dryRun ? preview('GET', apiPath(`/v1/scheduled-indexing/${id}/${endpoint}`, query), null, cfg) : { action, rows: rowsOf(await request(cfg, 'GET', `/v1/scheduled-indexing/${id}/${endpoint}`, { query })) };
  } else if (action === 'matrix' || action === 'topic-platform-matrix') {
    if (!id) throw new Error('matrix 需要 --id。');
    const query = queryCommon(args, cfg); delete query.id;
    result = dryRun ? preview('GET', apiPath(`/v1/scheduled-indexing/${id}/topic-platform-matrix`, query), null, cfg) : { action: 'matrix', rows: rowsOf(await request(cfg, 'GET', `/v1/scheduled-indexing/${id}/topic-platform-matrix`, { query })) };
  } else if (action === 'suggest-competitors') {
    const companyId = Number(first(args, ['company-id','companyId'], cfg.defaults.companyId || 0));
    if (!companyId) throw new Error('suggest-competitors 需要 companyId。');
    const body = { companyId };
    result = dryRun ? preview('POST', '/v1/scheduled-indexing/suggest-competitors', body, cfg) : { action, suggestions: (await request(cfg, 'POST', '/v1/scheduled-indexing/suggest-competitors', { body })).data };
  } else {
    throw new Error(`未知 action：${action}`);
  }

  const jsonOut = first(args, ['json-out','jsonOut']);
  if (jsonOut) { fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true }); fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(result, null, 2), 'utf8'); }
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
