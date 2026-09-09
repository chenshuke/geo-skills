#!/usr/bin/env node
/**
 * GEO Scheduled Indexing helper (Node/no-Python).
 *
 * Uses Best GEO CLI Scheduled Indexing capabilities as the default AI indexing interface.
 * Never prints internal authentication data; previews show capability names only.
 */
const fs = require('fs');
const path = require('path');
const { call, plan, apply } = require('../../geo-runtime/scripts/best_geo.js');

const ALL_PLATFORMS = ['deepseek','doubao','yuanbao','qwen','yiyan','kimi','zhipu','chatgpt','gemini','nami','grok','perp','poe'];
const DEFAULT_PLATFORMS = ['doubao'];
const PLATFORM_ALIASES = {
  '豆包': 'doubao', 'doubao': 'doubao',
  'deepseek': 'deepseek', 'deepseek深度求索': 'deepseek', '深度求索': 'deepseek',
  '元宝': 'yuanbao', '腾讯元宝': 'yuanbao', 'yuanbao': 'yuanbao',
  '通义': 'qwen', '通义千问': 'qwen', '千问': 'qwen', 'qwen': 'qwen',
  '文心': 'yiyan', '文心一言': 'yiyan', 'yiyan': 'yiyan',
  'kimi': 'kimi', '月之暗面': 'kimi',
  '智谱': 'zhipu', '智谱清言': 'zhipu', 'zhipu': 'zhipu',
  'chatgpt': 'chatgpt', 'gpt': 'chatgpt', 'openai': 'chatgpt',
  'gemini': 'gemini', 'google': 'gemini',
  '纳米': 'nami', 'nami': 'nami',
  'grok': 'grok',
  'perplexity': 'perp', 'perp': 'perp',
  'poe': 'poe',
};
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
  create               创建定时收录计划: scheduledIndexing.create
  list                 计划列表: scheduledIndexing.list
  detail               计划详情: scheduledIndexing.get
  update               更新计划/启停: scheduledIndexing.update
  delete               删除计划: scheduledIndexing.delete
  run-now              立即执行一次: scheduledIndexing.runNow
  runs                 执行历史: scheduledIndexing.runs
  metrics              折线图数据: scheduledIndexing.metrics
  answers              大模型回答与引用: scheduledIndexing.answers
  matrix               问题×平台收录矩阵: scheduledIndexing.topicPlatformMatrix
  citations            引用分析: scheduledIndexing.citations
  topic-stats          按 topic 聚合统计: scheduledIndexing.topicStats
  suggest-competitors  AI 建议竞品: indexing.suggestCompetitors

Create input:
  --file <path>              .md/.txt/.csv/.json questions
  --question <text>          单个问题
  --questions <a|b|c>        多个问题，用 | 或换行分隔
  --name <text>              计划名称，默认 定时收录-YYYY-MM-DD
  --platforms <list|all>     默认 doubao；all 仅在账号已开通全部平台时使用
  --schedule-type <type>     once | daily | weekly | interval，默认 once
  --hours <0,8,16>           执行小时
  --weekdays <1,3,5>         weekly: 1=周一..7=周日
  --times-per-day <n>        daily 均分预设；课堂建议直接用 --hours 9
  --interval-days <n>        interval 必填
  --times-per-cycle <n>      interval 均分预设
  --competitor-brands <a,b>  竞品品牌数组
  --screenshot-platforms <a,b> 截图平台数组(platforms 子集)
  --source <1|3>             采集模式：3=云端模式（默认），1=本地/设备模式
  --enabled <true|false>     默认 true
  --run-now                  创建成功后立即执行一次

Safety:
  写操作必须先 --dry-run；真实执行必须加 --force。输出不会展示内部认证信息。
`);
}
function splitList(v, sep = /[,，]/) { return String(v || '').split(sep).map(s => s.trim()).filter(Boolean); }
function parseBool(v, fallback) { if (v === undefined || v === '') return fallback; if (typeof v === 'boolean') return v; return /^(1|true|yes|y|on)$/i.test(String(v)); }
function parseIds(v) { return splitList(v).map(Number).filter(n => Number.isFinite(n)); }
function normalizePlatform(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  return PLATFORM_ALIASES[raw] || PLATFORM_ALIASES[lower] || lower;
}
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
function rowsOf(body) {
  const d = body && body.data !== undefined ? body.data : body;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.rows)) return d.rows;
  return [];
}
async function request(cfg, capability, input = {}, { write = false } = {}) {
  if (!write) return call(capability, input);
  const p=await plan(capability,input); const pid=p?.data?.planId||p?.planId; if(!pid)throw Error('CLI 未返回 planId'); return apply(pid);
}
function validatePositiveInt(value, name) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} 必须是正整数。`);
}
function validateHourList(hours, name = 'hours') {
  for (const h of hours) {
    if (!Number.isInteger(h) || h < 0 || h > 23) throw new Error(`${name} 必须是 0-23 的整数，当前包含 ${h}。`);
  }
}
function scheduleConfig(args) {
  const inline = first(args, ['schedule-config-json','scheduleConfigJson']);
  const cfg = inline ? JSON.parse(String(inline)) : { type: String(first(args, ['schedule-type','scheduleType'], 'once')) };
  cfg.type = String(cfg.type || 'once').toLowerCase();
  if (!['once','daily','weekly','interval'].includes(cfg.type)) throw new Error('scheduleConfig.type 不合法；只能是 once / daily / weekly / interval。');

  if (!inline) {
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
  }

  if (cfg.hours) validateHourList(cfg.hours);
  if (cfg.weekdays) {
    for (const d of cfg.weekdays) if (!Number.isInteger(d) || d < 1 || d > 7) throw new Error(`weekdays 必须是 1-7 的整数，当前包含 ${d}。`);
  }
  for (const [prop, label] of [['timesPerDay','times-per-day'], ['timesPerActiveDay','times-per-active-day'], ['intervalDays','interval-days'], ['timesPerCycle','times-per-cycle']]) {
    if (cfg[prop] !== undefined) validatePositiveInt(Number(cfg[prop]), label);
  }

  if (cfg.type === 'once') {
    // The API rejects once schedules when an empty hours array is present.
    delete cfg.hours;
  } else if (cfg.type === 'daily') {
    if (!Array.isArray(cfg.hours) && cfg.timesPerDay === undefined) cfg.hours = [9];
  } else if (cfg.type === 'weekly') {
    if (!Array.isArray(cfg.weekdays) || !cfg.weekdays.length) throw new Error('weekly 计划必须传 --weekdays，例如 --weekdays 1,3,5。');
    if (!Array.isArray(cfg.hours) && cfg.timesPerActiveDay === undefined) cfg.hours = [9];
  } else if (cfg.type === 'interval') {
    if (cfg.intervalDays === undefined) throw new Error('interval 计划必须传 --interval-days，例如 --interval-days 3。');
    if (!Array.isArray(cfg.hours) && cfg.timesPerCycle === undefined) cfg.hours = [9];
  }
  return cfg;
}
function platforms(args) {
  const raw = String(first(args, ['platforms'], DEFAULT_PLATFORMS.join(','))).trim();
  if (/^(default|默认)$/i.test(raw)) return DEFAULT_PLATFORMS.slice();
  if (/^all$/i.test(raw)) return ALL_PLATFORMS.slice();
  const requested = splitList(raw).map(normalizePlatform);
  const invalid = requested.filter(p => !ALL_PLATFORMS.includes(p));
  if (invalid.length) throw new Error(`platforms 包含不支持的平台：${invalid.join(',')}；可选 ${ALL_PLATFORMS.join(',')}；中文可用：豆包、DeepSeek、通义、Kimi、元宝、文心等。`);
  const out = [...new Set(requested)];
  if (!out.length) throw new Error(`platforms 为空；默认建议 doubao，可选 ${ALL_PLATFORMS.join(',')}`);
  return out;
}
function sourceValue(args) {
  const value = Number(first(args, ['source'], 3));
  if (![1, 3].includes(value)) throw new Error('source 只能是 1（本地/设备模式）或 3（云端模式）。');
  return value;
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
  const screenshotPlatforms = splitList(first(args, ['screenshot-platforms','screenshotPlatforms'], '')).map(normalizePlatform);
  if (screenshotPlatforms.length) {
    const invalidShots = screenshotPlatforms.filter(p => !payload.platforms.includes(p));
    if (invalidShots.length) throw new Error(`screenshot-platforms 必须是 platforms 子集，当前不匹配：${invalidShots.join(',')}`);
    payload.screenshotPlatforms = [...new Set(screenshotPlatforms)];
  }
  payload.source = sourceValue(args);
  const competitors = splitList(first(args, ['competitor-brands','competitorBrands'], ''));
  if (competitors.length) payload.competitorBrands = competitors;
  return payload;
}
function updatePayload(args, cfg) {
  const payload = {};
  for (const k of ['name']) { const v = first(args, [k]); if (v !== undefined) payload[k] = String(v); }
  for (const [arg, prop] of [['company-id','companyId'],['companyId','companyId'],['product-id','productId'],['productId','productId'],['source','source']]) {
    const v = first(args, [arg]); if (v !== undefined) payload[prop] = prop === 'source' ? sourceValue(args) : Number(v);
  }
  if (args.file || args.question || args.questions || args.topic || args.topics) payload.topics = readQuestions(args);
  if (first(args, ['platforms']) !== undefined) payload.platforms = platforms(args);
  if (first(args, ['screenshot-platforms','screenshotPlatforms']) !== undefined) {
    const shots = splitList(first(args, ['screenshot-platforms','screenshotPlatforms'], '')).map(normalizePlatform);
    const basePlatforms = payload.platforms || ALL_PLATFORMS;
    const invalidShots = shots.filter(p => !basePlatforms.includes(p));
    if (invalidShots.length) throw new Error(`screenshot-platforms 必须是 platforms 子集，当前不匹配：${invalidShots.join(',')}`);
    payload.screenshotPlatforms = [...new Set(shots)];
  }
  if (first(args, ['competitor-brands','competitorBrands']) !== undefined) payload.competitorBrands = splitList(first(args, ['competitor-brands','competitorBrands'], ''));
  if (first(args, ['schedule-type','scheduleType','schedule-config-json','scheduleConfigJson','hours','weekdays','times-per-day','timesPerDay','times-per-active-day','timesPerActiveDay','interval-days','intervalDays','times-per-cycle','timesPerCycle']) !== undefined) payload.scheduleConfig = scheduleConfig(args);
  if (first(args, ['enabled']) !== undefined) payload.enabled = parseBool(first(args, ['enabled']), true);
  return payload;
}
function queryCommon(args, cfg) {
  const q = {};
  for (const key of ['page','limit','id','name','enabled','platform','topicId','startDate','endDate','runId','taskId']) {
    const v = first(args, [key, key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())]);
    if (v !== undefined && v !== true) q[key] = ['page','limit','id','topicId','runId','taskId'].includes(key) ? Number(v) : v;
  }
  const companyId = first(args, ['company-id','companyId'], cfg.defaults.companyId || '');
  if (companyId && ['list'].includes(String(first(args,['action'],'list')))) q.companyId = Number(companyId);
  return q;
}
function preview(capability, input, unused = {}, extra = {}) {
  return { dryRun: true, request: { capability, input: input || undefined, backend: 'best-geo' }, ...extra };
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const action = String(first(args, ['action'], args._[0] || 'list'));
  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  const cfg = { defaults: { companyId: Number(first(args, ['company-id','companyId'], 0)), productId: Number(first(args, ['product-id','productId'], 0)) }, geo: {} };
  if (WRITE_ACTIONS.has(action) && !dryRun && !args.force) throw new Error(`${action} 是写/耗资源操作。请先 --dry-run 预览，真实执行加 --force。`);
  const id = Number(first(args, ['id'], 0));
  let result;

  if (action === 'create') {
    const body = createPayload(args, cfg);
    if (dryRun) result = preview('scheduledIndexing.create', body, cfg);
    else {
      const created = await request(cfg, 'scheduledIndexing.create', body, { write: true });
      const scheduleId = Number(created?.data?.id || created?.id || 0);
      let runNow = null, detail = null;
      if (args['run-now'] || args.runNow) runNow = await request(cfg, 'scheduledIndexing.runNow', { planId: scheduleId }, { write: true });
      if (scheduleId) detail = await request(cfg, 'scheduledIndexing.get', { planId: scheduleId });
      result = { action, scheduleId, created: created.data || created, runNow: runNow ? (runNow.data || runNow) : null, verification: detail ? (detail.data || detail) : null };
    }
  } else if (action === 'list') {
    const query = queryCommon(args, cfg);
    result = dryRun ? preview('scheduledIndexing.list', query, cfg) : { action, rows: rowsOf(await request(cfg, 'scheduledIndexing.list', query)) };
  } else if (action === 'detail') {
    if (!id) throw new Error('detail 需要 --id。');
    result = dryRun ? preview('scheduledIndexing.get', { planId: id }, cfg) : { action, data: (await request(cfg, 'scheduledIndexing.get', { planId: id })).data };
  } else if (action === 'update') {
    if (!id) throw new Error('update 需要 --id。');
    const body = updatePayload(args, cfg);
    result = dryRun ? preview('scheduledIndexing.update', { ...body, planId: id }, cfg) : { action, updated: (await request(cfg, 'scheduledIndexing.update', { ...body, planId: id }, { write: true })).data, verification: (await request(cfg, 'scheduledIndexing.get', { planId: id })).data };
  } else if (action === 'delete') {
    if (!id) throw new Error('delete 需要 --id。');
    result = dryRun ? preview('scheduledIndexing.delete', { planId: id }, cfg) : { action, deleted: await request(cfg, 'scheduledIndexing.delete', { planId: id }, { write: true }) };
  } else if (action === 'run-now') {
    if (!id) throw new Error('run-now 需要 --id。');
    result = dryRun ? preview('scheduledIndexing.runNow', { planId: id }, cfg) : { action, run: (await request(cfg, 'scheduledIndexing.runNow', { planId: id }, { write: true })).data };
  } else if (['runs','metrics','answers','citations','topic-stats'].includes(action)) {
    if (!id) throw new Error(`${action} 需要 --id。`);
    const endpoint = action === 'topic-stats' ? 'topic-stats' : action;
    const query = queryCommon(args, cfg);
    delete query.id;
    result = dryRun ? preview(`scheduledIndexing.${endpoint === 'topic-stats' ? 'topicStats' : endpoint}`, { ...query, planId: id }, cfg) : { action, rows: rowsOf(await request(cfg, `scheduledIndexing.${endpoint === 'topic-stats' ? 'topicStats' : endpoint}`, { ...query, planId: id })) };
  } else if (action === 'matrix' || action === 'topic-platform-matrix') {
    if (!id) throw new Error('matrix 需要 --id。');
    const query = queryCommon(args, cfg); delete query.id;
    result = dryRun ? preview('scheduledIndexing.topicPlatformMatrix', { ...query, planId: id }, cfg) : { action: 'matrix', rows: rowsOf(await request(cfg, 'scheduledIndexing.topicPlatformMatrix', { ...query, planId: id })) };
  } else if (action === 'suggest-competitors') {
    const companyId = Number(first(args, ['company-id','companyId'], cfg.defaults.companyId || 0));
    if (!companyId) throw new Error('suggest-competitors 需要 companyId。');
    const body = { companyId };
    result = dryRun ? preview('indexing.suggestCompetitors', body, cfg) : { action, suggestions: (await request(cfg, 'indexing.suggestCompetitors', body, { write: true })).data };
  } else {
    throw new Error(`未知 action：${action}`);
  }

  const jsonOut = first(args, ['json-out','jsonOut']);
  if (jsonOut) { fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true }); fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(result, null, 2), 'utf8'); }
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
