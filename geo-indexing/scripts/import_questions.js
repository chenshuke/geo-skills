#!/usr/bin/env node
/**
 * GEO question import helper (Node/no-Python).
 *
 * Targets:
 *  - scheduled-indexing: import local questions to /v1/scheduled-indexing (default)
 *  - product-topic: import local deep user questions to /v1/geo-product-topic
 *  - topic-task-select: select generated questions from /v1/topic-task/{taskId}/select
 *  - legacy-indexing-custom: old custom indexing import (internal rollback only; blocked unless --allow-legacy is explicit)
 */
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders } = require('../../geo-runtime/scripts/credentials.js');

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
const TARGETS = new Set(['scheduled-indexing', 'indexing-custom', 'product-topic', 'topic-task-select', 'legacy-indexing-custom']);

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
  node geo-indexing/scripts/import_questions.js --target scheduled-indexing --file questions.md --name "每日收录" --dry-run
  node geo-indexing/scripts/import_questions.js --target product-topic --file questions.md --tags "深层问题,GEO" --dry-run
  node geo-indexing/scripts/import_questions.js --target topic-task-select --task-id 123 --selected-ids 0,2,5 --dry-run

Targets:
  scheduled-indexing 默认：创建定时收录计划：POST /v1/scheduled-indexing
  indexing-custom    兼容旧提示词的别名：实际也走 /v1/scheduled-indexing
  product-topic      将本地深层用户问题写入产品主题库：POST /v1/geo-product-topic
  topic-task-select  从平台主题生成任务中选择搜索问题插入：POST /v1/topic-task/{taskId}/select

Legacy guard:
  legacy-indexing-custom 为内部人工回滚入口，默认阻断；必须显式添加 --allow-legacy 且真实写入仍需 --force。
  学员查收录、Agent 自动执行、课堂提示词一律不要使用 legacy-indexing-custom。

Input:
  --file <path>          .md/.txt/.csv/.json；自动 UTF-8 读取、去重、过滤空行
  --question <text>      单个问题
  --questions <a|b|c>    用 | 或换行分隔的多个问题

Common options:
  --company-id <id>      默认读取 config defaults.companyId
  --product-id <id>      默认读取 config defaults.productId
  --limit <n>            默认 200
  --dry-run              只预览 payload，不写入
  --force                真实写入必须显式添加
  --json-out <file>      保存结果 JSON

scheduled-indexing options:
  --name <text>          计划名称，默认 定时收录-YYYY-MM-DD
  --platforms <list|all> 默认 doubao；all 仅在账号已开通全部平台时使用
  --schedule-type <type> once | daily | weekly | interval，默认 once
  --hours <0,8,16>       执行小时数组；课堂默认建议 --hours 9
  --weekdays <1,3,5>     weekly 必填，1=周一..7=周日
  --times-per-day <n>    daily 均分预设；课堂建议直接用 --hours 9
  --interval-days <n>    interval 必填
  --run-now              创建成功后立即执行一次
  --source <1|2|3>       采集模式：3=云端模式（默认），1=本地/设备模式；2为平台保留模式

product-topic options:
  --tags <a,b>           默认 深层用户问题,手动导入
  --knowledge-base-ids <ids>  可选，逗号分隔

topic-task-select options:
  --task-id <id>         必填
  --selected-ids <ids>   平台生成问题索引，逗号分隔
  --match-file <path>    可选：读取本地问题并按 topic-task 的 llmResult.questions 精确匹配索引
`);
}
function decodeUtf8Strict(file) {
  const buf = fs.readFileSync(file);
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  if (replacementCount > 0) throw new Error(`文件不是有效 UTF-8，出现 ${replacementCount} 个 �：${file}`);
  return text.replace(/\r\n/g, '\n');
}
function suspiciousMojibake(text) {
  const patterns = [/锟斤拷|烫烫|屯屯|�/, /(?:Ã|Â|â€|â€™|â€œ|â€\u009d|â€¦)/, /(?:ä¸|å[\x80-\xff]|æ[\x80-\xff]|ç[\x80-\xff])/];
  return patterns.filter(p => p.test(text)).map(String);
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
function parseJson(text) {
  const raw = JSON.parse(text);
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw.questions) ? raw.questions : Array.isArray(raw.data) ? raw.data : [];
  return arr.map(x => typeof x === 'string' ? x : (x.question || x.topic || x.query || x.data || x.title || '')).filter(Boolean);
}
function parseMarkdownOrText(text) {
  text = text.replace(/^---[\s\S]*?---\s*/,'');
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
    if (!line) continue;
    // Skip obvious prose section labels; keep all bullets/questions to avoid losing user intent.
    if (/^[一二三四五六七八九十]+[、.．]\s*$/.test(line)) continue;
    out.push(line);
  }
  return out;
}
function normalizeQuestion(q) { return String(q).replace(/\s+/g, ' ').trim(); }
function readQuestions(args, fileKey = 'file') {
  let arr = [];
  const file = first(args, [fileKey]);
  if (file) {
    const abs = path.resolve(String(file));
    const text = decodeUtf8Strict(abs);
    const ext = path.extname(abs).toLowerCase();
    if (ext === '.json') arr = parseJson(text);
    else if (ext === '.csv' || ext === '.tsv') arr = parseCsv(ext === '.tsv' ? text.replace(/\t/g, ',') : text);
    else arr = parseMarkdownOrText(text);
  }
  const single = first(args, ['question', 'topic']);
  if (single) arr.push(String(single));
  const multi = first(args, ['questions', 'topics']);
  if (multi) arr.push(...String(multi).split(/\n|\|/));
  const seen = new Set(); const out = [];
  for (const q of arr.map(normalizeQuestion).filter(Boolean)) {
    const key = q.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(q); }
  }
  const limit = Number(first(args, ['limit'], 200));
  return out.slice(0, limit);
}
function parseList(v, sep = /[,，]/) { return String(v || '').split(sep).map(s => s.trim()).filter(Boolean); }
function parseIds(v) { return parseList(v).flatMap(x => /^\d+-\d+$/.test(x) ? (() => { const [a,b]=x.split('-').map(Number); const r=[]; for(let i=Math.min(a,b); i<=Math.max(a,b); i++) r.push(String(i)); return r; })() : [x]).filter(Boolean); }
function ensureBrandFormat(q, brand) {
  if (/\[[^\]]+\]\s*$/.test(q)) return q;
  if (!brand) throw new Error(`问题缺少品牌词且未传 --brand：${q}`);
  return `${q}[${brand}]`;
}
function baseUrl(cfg) { return String(cfg.geo.baseUrl || '').replace(/\/$/, ''); }
function buildHeaders(cfg) { return { ...geoHeaders(cfg), 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' }; }
async function requestJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) {
    const msg = body && typeof body === 'object' ? (body.message || body.msg || JSON.stringify(body)) : String(body).slice(0, 500);
    let hint = '';
    if (/所选平台已被禁用|平台.*禁用/.test(msg)) hint = '；建议不要使用 --platforms all，改用 --platforms doubao 或账号已开通的平台。';
    else if (/请求参数错误|参数/.test(msg)) hint = '；请检查 platforms、source、schedule-type、hours/weekdays/interval-days。课堂默认建议：--platforms doubao --schedule-type once 或 --schedule-type daily --hours 9。';
    const err = new Error(`GEO API failed: HTTP ${res.status} ${res.statusText}; ${msg}${hint}`);
    err.response = body; throw err;
  }
  return body;
}
function rowsOf(body) {
  const d = body?.data || body;
  return Array.isArray(d?.data) ? d.data : Array.isArray(d?.list) ? d.list : Array.isArray(d) ? d : [];
}
async function listCustomTasks(cfg, { companyId, limit = 20 }) {
  const qs = new URLSearchParams({ page: '1', limit: String(limit), companyId: String(companyId) });
  return rowsOf(await requestJson(`${baseUrl(cfg)}/v1/ai-indexing-task/custom?${qs}`, { headers: buildHeaders(cfg) }));
}
async function listProductTopics(cfg, { companyId, productId, limit = 20 }) {
  const qs = new URLSearchParams({ page: '1', limit: String(limit), companyId: String(companyId), productId: String(productId) });
  return rowsOf(await requestJson(`${baseUrl(cfg)}/v1/geo-product-topic?${qs}`, { headers: buildHeaders(cfg) }));
}
async function getTopicTask(cfg, taskId, { companyId, productId }) {
  const qs = new URLSearchParams({ page: '1', limit: '10', id: String(taskId) });
  if (companyId) qs.set('companyId', String(companyId));
  if (productId) qs.set('productId', String(productId));
  const rows = rowsOf(await requestJson(`${baseUrl(cfg)}/v1/topic-task?${qs}`, { headers: buildHeaders(cfg) }));
  return rows.find(x => Number(x.id) === Number(taskId)) || rows[0] || null;
}

function parseBool(v, fallback) {
  if (v === undefined || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  return /^(1|true|yes|y|on)$/i.test(String(v));
}
function normalizePlatform(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  return PLATFORM_ALIASES[raw] || PLATFORM_ALIASES[lower] || lower;
}
function today() { return new Date().toISOString().slice(0, 10); }
function validatePositiveInt(value, name) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} 必须是正整数。`);
}
function validateHourList(hours, name = 'hours') {
  for (const h of hours) if (!Number.isInteger(h) || h < 0 || h > 23) throw new Error(`${name} 必须是 0-23 的整数，当前包含 ${h}。`);
}
function scheduleConfig(args) {
  const inline = first(args, ['schedule-config-json','scheduleConfigJson']);
  const cfg = inline ? JSON.parse(String(inline)) : { type: String(first(args, ['schedule-type','scheduleType'], 'once')) };
  cfg.type = String(cfg.type || 'once').toLowerCase();
  if (!['once','daily','weekly','interval'].includes(cfg.type)) throw new Error('scheduleConfig.type 不合法；只能是 once / daily / weekly / interval。');
  if (!inline) {
    const hours = parseIds(first(args, ['hours'], '')).map(Number).filter(n => Number.isFinite(n));
    if (hours.length) cfg.hours = hours;
    const weekdays = parseIds(first(args, ['weekdays'], '')).map(Number).filter(n => Number.isFinite(n));
    if (weekdays.length) cfg.weekdays = weekdays;
    const mappings = [
      ['times-per-day','timesPerDay'], ['timesPerDay','timesPerDay'],
      ['times-per-active-day','timesPerActiveDay'], ['timesPerActiveDay','timesPerActiveDay'],
      ['interval-days','intervalDays'], ['intervalDays','intervalDays'],
      ['times-per-cycle','timesPerCycle'], ['timesPerCycle','timesPerCycle'],
    ];
    for (const [arg, prop] of mappings) {
      const v = first(args, [arg]);
      if (v !== undefined) cfg[prop] = Number(v);
    }
  }
  if (cfg.hours) validateHourList(cfg.hours);
  if (cfg.weekdays) for (const d of cfg.weekdays) if (!Number.isInteger(d) || d < 1 || d > 7) throw new Error(`weekdays 必须是 1-7 的整数，当前包含 ${d}。`);
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
function parsePlatforms(args, fallback = DEFAULT_PLATFORMS.join(',')) {
  const raw = String(first(args, ['platforms'], fallback)).trim();
  if (/^(default|默认)$/i.test(raw)) return DEFAULT_PLATFORMS.slice();
  if (/^all$/i.test(raw)) return ALL_PLATFORMS.slice();
  const requested = parseList(raw).map(normalizePlatform);
  const invalid = requested.filter(p => !ALL_PLATFORMS.includes(p));
  if (invalid.length) throw new Error(`platforms 包含不支持的平台：${invalid.join(',')}；可选：${ALL_PLATFORMS.join(',')}；中文可用：豆包、DeepSeek、通义、Kimi、元宝、文心等。`);
  const out = [...new Set(requested)];
  if (!out.length) throw new Error(`platforms 为空；默认建议 doubao；可选：${ALL_PLATFORMS.join(',')}`);
  return out;
}
function sourceValue(args) {
  const value = Number(first(args, ['source'], 3));
  if (![1, 2, 3].includes(value)) throw new Error('source 只能是 1（本地/设备模式）、2（平台保留模式）或 3（云端模式）。');
  return value;
}
function buildScheduledIndexingPayload(args, questions, companyId, productId) {
  const platforms = parsePlatforms(args);
  const payload = {
    name: String(first(args, ['name'], `定时收录-${today()}`)),
    companyId,
    productId,
    topics: questions,
    platforms,
    scheduleConfig: scheduleConfig(args),
    enabled: parseBool(first(args, ['enabled'], undefined), true),
  };
  const screenshotPlatforms = parseList(first(args, ['screenshot-platforms','screenshotPlatforms'], '')).map(normalizePlatform);
  if (screenshotPlatforms.length) {
    const invalidShots = screenshotPlatforms.filter(p => !platforms.includes(p));
    if (invalidShots.length) throw new Error(`screenshot-platforms 必须是 platforms 子集，当前不匹配：${invalidShots.join(',')}`);
    payload.screenshotPlatforms = [...new Set(screenshotPlatforms)];
  }
  payload.source = sourceValue(args);
  const competitorBrands = parseList(first(args, ['competitor-brands','competitorBrands'], ''));
  if (competitorBrands.length) payload.competitorBrands = competitorBrands;
  return payload;
}

function makePreview(target, payload, questions, extra = {}) {
  return { dryRun: true, target, count: questions.length, questionsPreview: questions.slice(0, 20), payload, ...extra };
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  let target = String(first(args, ['target'], 'scheduled-indexing'));
  // Compatibility: old prompts using --target indexing-custom now route to Scheduled Indexing.
  if (target === 'indexing-custom') target = 'scheduled-indexing';
  if (!TARGETS.has(target)) throw new Error(`未知 --target：${target}；可选 ${[...TARGETS].join(', ')}`);
  const allowLegacy = Boolean(args['allow-legacy'] || args.allowLegacy);
  if (target === 'legacy-indexing-custom' && !allowLegacy) {
    throw new Error('legacy-indexing-custom 是旧查收录接口的内部回滚入口，默认禁止使用。学员查收录请使用 scheduled-indexing / scheduled_indexing.js；如内部确需回滚，必须显式添加 --allow-legacy。');
  }
  const cfg = loadGeoConfig();
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
  const companyId = Number(first(args, ['company-id', 'companyId'], cfg.defaults.companyId || 0));
  const productId = Number(first(args, ['product-id', 'productId'], cfg.defaults.productId || 0));
  if (!companyId && target !== 'topic-task-select') throw new Error('缺少 companyId，请先配置 defaults.companyId 或传 --company-id。');
  if (!productId && (target === 'product-topic' || target === 'scheduled-indexing')) throw new Error('缺少 productId，请先配置 defaults.productId 或传 --product-id。');

  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  if (!dryRun && !args.force) throw new Error('真实写入必须先确认并添加 --force；建议先运行 --dry-run。');

  let result;
  if (target === 'scheduled-indexing') {
    const questions = readQuestions(args);
    if (!questions.length) throw new Error('没有读取到问题，请传 --file/--question/--questions。');
    const hits = suspiciousMojibake(questions.join('\n'));
    if (hits.length && !args['allow-suspicious'] && !args.allowSuspicious) throw new Error(`检测到疑似乱码：${hits.join(', ')}`);
    const payload = buildScheduledIndexingPayload(args, questions, companyId, productId);
    if (dryRun) result = makePreview(target, payload, questions, { endpoint: '/v1/scheduled-indexing' });
    else {
      const created = await requestJson(`${baseUrl(cfg)}/v1/scheduled-indexing`, { method: 'POST', headers: buildHeaders(cfg), body: JSON.stringify(payload) });
      const scheduleId = Number(created?.data?.id || created?.id || 0);
      let runNow = null;
      if ((args['run-now'] || args.runNow) && scheduleId) {
        runNow = await requestJson(`${baseUrl(cfg)}/v1/scheduled-indexing/${scheduleId}/run-now`, { method: 'POST', headers: buildHeaders(cfg) });
      }
      result = { target, imported: questions.length, scheduleId, created: created.data || created, runNow: runNow ? (runNow.data || runNow) : null };
    }
  } else if (target === 'legacy-indexing-custom') {
    const questions = readQuestions(args);
    if (!questions.length) throw new Error('没有读取到问题，请传 --file/--question/--questions。');
    const hits = suspiciousMojibake(questions.join('\n'));
    if (hits.length && !args['allow-suspicious'] && !args.allowSuspicious) throw new Error(`检测到疑似乱码：${hits.join(', ')}`);
    const platformsRaw = String(first(args, ['platforms'], DEFAULT_PLATFORMS.join(','))).trim();
    const platforms = /^all$/i.test(platformsRaw) ? ALL_PLATFORMS.slice(0, 9) : parsePlatforms(args, DEFAULT_PLATFORMS.join(','));
    if (!platforms.length) throw new Error(`platforms 为空或不合法；可选：${ALL_PLATFORMS.join(',')}`);
    const brand = first(args, ['brand', 'brands'], '');
    const dataLines = questions.map(q => ensureBrandFormat(q, brand));
    const payload = { data: dataLines.join('\n'), platforms, companyId };
    const source = first(args, ['source']); if (source !== undefined) payload.source = sourceValue(args);
    if (dryRun) result = makePreview(target, payload, questions, { endpoint: '/v1/ai-indexing-task/custom/import' });
    else {
      const created = await requestJson(`${baseUrl(cfg)}/v1/ai-indexing-task/custom/import`, { method: 'POST', headers: buildHeaders(cfg), body: JSON.stringify(payload) });
      const recent = await listCustomTasks(cfg, { companyId, limit: Math.min(50, Math.max(20, questions.length + 5)) });
      result = { target, imported: questions.length, created: created.data || created, verification: { recentCount: recent.length, matchedPreview: recent.filter(x => dataLines.some(q => String(x.topic || x.data || x.keyword || '').includes(q.replace(/\[[^\]]+\]$/, '')))).slice(0, 10) } };
    }
  } else if (target === 'product-topic') {
    const questions = readQuestions(args);
    if (!questions.length) throw new Error('没有读取到问题，请传 --file/--question/--questions。');
    const hits = suspiciousMojibake(questions.join('\n'));
    if (hits.length && !args['allow-suspicious'] && !args.allowSuspicious) throw new Error(`检测到疑似乱码：${hits.join(', ')}`);
    const tags = parseList(first(args, ['tags'], '深层用户问题,手动导入'));
    const knowledgeBaseIds = parseIds(first(args, ['knowledge-base-ids', 'knowledgeBaseIds'], '')).map(Number).filter(Boolean);
    const payload = { topic: questions.join('\n'), productId, tags, knowledgeBaseIds };
    if (dryRun) result = makePreview(target, payload, questions, { endpoint: '/v1/geo-product-topic' });
    else {
      const created = await requestJson(`${baseUrl(cfg)}/v1/geo-product-topic`, { method: 'POST', headers: buildHeaders(cfg), body: JSON.stringify(payload) });
      const recent = await listProductTopics(cfg, { companyId, productId, limit: Math.min(50, Math.max(20, questions.length + 5)) });
      result = { target, imported: questions.length, created: created.data || created, verification: { recentCount: recent.length, matchedPreview: recent.filter(x => questions.includes(String(x.topic || '').trim())).slice(0, 10) } };
    }
  } else if (target === 'topic-task-select') {
    const taskId = Number(first(args, ['task-id', 'taskId'], 0));
    if (!taskId) throw new Error('topic-task-select 需要 --task-id。');
    let selectedIds = parseIds(first(args, ['selected-ids', 'selectedIds'], ''));
    let matchInfo;
    const matchFile = first(args, ['match-file', 'matchFile']);
    if (matchFile) {
      const wanted = readQuestions({ ...args, file: matchFile });
      const task = await getTopicTask(cfg, taskId, { companyId, productId });
      const generated = task?.llmResult?.questions || [];
      const generatedNorm = generated.map(normalizeQuestion);
      const ids = [];
      const missing = [];
      for (const q of wanted) {
        const idx = generatedNorm.findIndex(x => x === normalizeQuestion(q));
        if (idx >= 0) ids.push(String(idx)); else missing.push(q);
      }
      selectedIds = [...new Set([...selectedIds, ...ids])];
      matchInfo = { taskFound: Boolean(task), generatedCount: generated.length, matched: ids.length, missing };
    }
    if (!selectedIds.length) throw new Error('需要 --selected-ids，或使用 --match-file 从任务结果精确匹配。');
    const payload = { selectedIds: selectedIds.map(String) };
    if (dryRun) result = makePreview(target, payload, selectedIds, { endpoint: `/v1/topic-task/${taskId}/select`, matchInfo });
    else {
      const selected = await requestJson(`${baseUrl(cfg)}/v1/topic-task/${taskId}/select`, { method: 'POST', headers: buildHeaders(cfg), body: JSON.stringify(payload) });
      const topics = await listProductTopics(cfg, { companyId, productId, limit: 30 }).catch(() => []);
      result = { target, taskId, selectedIds: payload.selectedIds, selected: selected.data || selected, verification: { recentTopicCount: topics.length, recentTopics: topics.slice(0, 10).map(x => ({ id: x.id, topic: x.topic, source: x.source })) }, matchInfo };
    }
  }

  const jsonOut = first(args, ['json-out', 'jsonOut']);
  if (jsonOut) { fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true }); fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(result, null, 2), 'utf8'); }
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error(e.message || e); if (e.response) console.error(JSON.stringify(e.response, null, 2)); process.exit(1); });
