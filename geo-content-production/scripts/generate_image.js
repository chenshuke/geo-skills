#!/usr/bin/env node
/**
 * GEO Image Generation — use GEO platform /v1/text-to-img.
 *
 * Creates an async text-to-image task, optionally waits for completion,
 * translates returned provider URLs to GEO OSS URLs, and optionally downloads
 * images to local files. Credentials are shared with other GEO skills.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_CONFIG = path.join(os.homedir(), '.geo-skills', 'credentials', 'geo-config.json');
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 5 * 1000;
const DEFAULT_MAX_INTERVAL_MS = 15 * 1000;
const PROCESSING_STATUSES = new Set([1, 2]); // submitted / processing in GEO frontend
const SUCCESS_STATUS = 3;

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

function usage() {
  console.log(`Usage:
  node geo-content-production/scripts/generate_image.js --prompt "..." [options]

Options:
  --prompt <text>                正向提示词，必填
  --negative-prompt <text>       负向提示词（也支持 --negativePrompt）
  --resolution <value>           默认 1k
  --num <n>                      默认 1
  --aspect-ratio <ratio>         默认 16:9；支持 16:9, 9:16, 1:1, 4:3, 3:4, 3:2, 2:3, 21:9
  --model <v1|v2>                默认 v2（v2 效果更好，约 2 倍积分）
  --product-id <id>              默认读取 GEO config defaults.productId
  --company-id <id>              默认读取 GEO config defaults.companyId
  --geo-config <path>            默认 ~/.geo-skills/credentials/geo-config.json
  --wait / --no-wait             默认 wait，轮询直到完成
  --timeout-ms <ms>              默认 ${DEFAULT_TIMEOUT_MS}
  --interval-ms <ms>             默认 ${DEFAULT_INTERVAL_MS}，会逐步退避
  --max-interval-ms <ms>         默认 ${DEFAULT_MAX_INTERVAL_MS}
  --translate-url / --no-translate-url
                                默认 translate-url，将 Kling 等外部 URL 转为 GEO OSS URL
  --output <file>                下载第一张结果图到指定文件
  --output-dir <dir>             下载全部结果图到目录，默认不下载
  --project-dir <dir>            GEO 项目根目录；未传 output 时自动按 artifact 写入标准目录
  --artifact <image|cover>       配合 --project-dir 使用，默认 image
  --batch <YYYY-MM-DD>           内容批次日期，默认今天
  --json-out <file>              保存完整 JSON 结果
  --dry-run                      只打印将要提交的 payload，不创建任务

Examples:
  node geo-content-production/scripts/generate_image.js \\
    --prompt "必火AI科技感封面图，无文字" --aspect-ratio 16:9 --output cover.png

  node geo-content-production/scripts/generate_image.js \\
    --prompt "产品展示图" --model v1 --num 2 --output-dir images
`);
}

function firstValue(obj, names, fallback = undefined) {
  for (const name of names) if (obj[name] !== undefined && obj[name] !== '') return obj[name];
  return fallback;
}

function findNearestConfig(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, 'geo-config', 'geo-config.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function loadConfig(args) {
  const explicit = firstValue(args, ['geo-config', 'config']);
  const candidates = [
    explicit,
    process.env.GEO_CONFIG_FILE,
    process.env.GEO_CONFIG,
    process.env.GEO_OSS_CONFIG,
    DEFAULT_CONFIG,
    findNearestConfig(process.cwd()),
  ].filter(Boolean);

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const geo = raw.geo || raw;
      const cfg = {
        path: file,
        baseUrl: process.env.GEO_BASE_URL || geo.baseUrl,
        openKey: process.env.GEO_OPENKEY || process.env.GEO_OPEN_KEY || geo.openKey,
        referer: process.env.GEO_REFERER || geo.referer || 'https://geo.bihuoai.com/',
        defaults: raw.defaults || {},
      };
      if (cfg.baseUrl && cfg.openKey) return cfg;
    } catch (e) {
      // Try next candidate.
    }
  }

  const envCfg = {
    path: 'environment',
    baseUrl: process.env.GEO_BASE_URL,
    openKey: process.env.GEO_OPENKEY || process.env.GEO_OPEN_KEY,
    referer: process.env.GEO_REFERER || 'https://geo.bihuoai.com/',
    defaults: {},
  };
  if (envCfg.baseUrl && envCfg.openKey) return envCfg;
  throw new Error('缺少 GEO 配置：请设置 ~/.geo-skills/credentials/geo-config.json，或 GEO_BASE_URL/GEO_OPENKEY/GEO_REFERER。GEO_OPEN_KEY 也兼容。');
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/$/, '');
}

function headers(cfg) {
  return {
    Authorization: `Bearer ${cfg.openKey}`,
    Referer: cfg.referer || '',
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json',
  };
}

async function requestJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) {
    const msg = body && typeof body === 'object' ? (body.message || JSON.stringify(body)) : String(body).slice(0, 500);
    const err = new Error(`GEO API failed: HTTP ${res.status} ${res.statusText}; ${msg}`);
    err.response = body;
    throw err;
  }
  return body;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function createTask(cfg, payload) {
  const url = `${normalizeBaseUrl(cfg.baseUrl)}/v1/text-to-img`;
  const body = await requestJson(url, { method: 'POST', headers: headers(cfg), body: JSON.stringify(payload) });
  return body.data || body;
}

async function listTasks(cfg, params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, String(v)); });
  const url = `${normalizeBaseUrl(cfg.baseUrl)}/v1/text-to-img?${qs.toString()}`;
  const body = await requestJson(url, { method: 'GET', headers: headers(cfg) });
  return body.data || body;
}

async function pollTask(cfg, id, { companyId, productId, timeoutMs, intervalMs, maxIntervalMs }) {
  const started = Date.now();
  let currentIntervalMs = Math.max(1000, Number(intervalMs) || DEFAULT_INTERVAL_MS);
  const maxWait = Math.max(currentIntervalMs, Number(maxIntervalMs) || DEFAULT_MAX_INTERVAL_MS);
  while (true) {
    const data = await listTasks(cfg, { page: 1, limit: 20, companyId, productId });
    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.list) ? data.list : Array.isArray(data) ? data : [];
    const row = rows.find(item => Number(item.id) === Number(id));
    if (row) {
      if (row.status === SUCCESS_STATUS || (Array.isArray(row.resourceUrls) && row.resourceUrls.length > 0)) return row;
      if (!PROCESSING_STATUSES.has(Number(row.status))) return row;
    }
    if (Date.now() - started > timeoutMs) throw new Error(`等待文生图任务超时：id=${id}`);
    await sleep(currentIntervalMs);
    currentIntervalMs = Math.min(maxWait, Math.round(currentIntervalMs * 1.4));
  }
}

async function translateUrls(cfg, sourceUrls) {
  if (!Array.isArray(sourceUrls) || sourceUrls.length === 0) return [];
  const url = `${normalizeBaseUrl(cfg.baseUrl)}/v1/oss/translate-url`;
  const body = await requestJson(url, { method: 'POST', headers: headers(cfg), body: JSON.stringify({ sourceUrls }) });
  return body.data || body;
}

function extensionFromUrl(url, fallback = '.png') {
  try {
    const u = new URL(url);
    const ext = path.extname(u.pathname);
    return ext && ext.length <= 6 ? ext : fallback;
  } catch { return fallback; }
}
function today() { return new Date().toISOString().slice(0, 10); }
function standardOutputDir(projectDir, artifact, batch) {
  if (!projectDir) return '';
  const rel = artifact === 'cover'
    ? path.join('04_内容创作', batch || today(), 'covers')
    : path.join('04_内容创作', batch || today(), 'images');
  return path.resolve(projectDir, rel);
}

async function download(url, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载图片失败：HTTP ${res.status} ${res.statusText}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

(async () => {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }

  const prompt = firstValue(args, ['prompt']);
  if (!prompt) { usage(); process.exit(1); }

  const cfg = loadConfig(args);
  const defaults = cfg.defaults || {};
  const companyId = Number(firstValue(args, ['company-id', 'companyId'], defaults.companyId || 0));
  const productId = Number(firstValue(args, ['product-id', 'productId'], defaults.productId || 0));
  if (!companyId || !productId) throw new Error('缺少 companyId/productId：请先配置 defaults，或传 --company-id 与 --product-id。');

  const payload = {
    prompt: String(prompt),
    negativePrompt: firstValue(args, ['negative-prompt', 'negativePrompt']) || undefined,
    resolution: String(firstValue(args, ['resolution'], '1k')),
    num: Number(firstValue(args, ['num', 'n'], 1)),
    aspectRatio: String(firstValue(args, ['aspect-ratio', 'aspectRatio'], '16:9')),
    companyId: String(companyId),
    productId,
    model: String(firstValue(args, ['model'], 'v2')),
  };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  const wait = args.wait !== false;
  const translate = args['translate-url'] !== false && args.translateUrl !== false;
  const timeoutMs = Number(firstValue(args, ['timeout-ms', 'timeoutMs'], DEFAULT_TIMEOUT_MS));
  const intervalMs = Number(firstValue(args, ['interval-ms', 'intervalMs'], DEFAULT_INTERVAL_MS));
  const maxIntervalMs = Number(firstValue(args, ['max-interval-ms', 'maxIntervalMs'], DEFAULT_MAX_INTERVAL_MS));

  if (args['dry-run'] || args.dryRun) {
    console.log(JSON.stringify({ dryRun: true, endpoint: '/v1/text-to-img', payload }, null, 2));
    return;
  }

  console.error(`Creating GEO text-to-img task: model=${payload.model}, aspectRatio=${payload.aspectRatio}, num=${payload.num}, productId=${productId}`);
  const created = await createTask(cfg, payload);
  let result = { id: created.id, status: created.status, created, payload };

  if (wait) {
    const row = await pollTask(cfg, created.id, { companyId, productId, timeoutMs, intervalMs, maxIntervalMs });
    result = { ...result, ...row, row };
    if (Array.isArray(row.resourceUrls)) {
      result.resourceUrls = row.resourceUrls;
      if (translate) result.ossUrls = await translateUrls(cfg, row.resourceUrls);
    }
  }

  const finalUrls = Array.isArray(result.ossUrls) && result.ossUrls.length ? result.ossUrls : result.resourceUrls;
  const downloaded = [];
  if (Array.isArray(finalUrls) && finalUrls.length) {
    const output = firstValue(args, ['output']);
    const projectDir = firstValue(args, ['project-dir', 'projectDir']);
    const artifact = String(firstValue(args, ['artifact'], 'image'));
    const batch = String(firstValue(args, ['batch', 'date'], today()));
    const outputDir = firstValue(args, ['output-dir', 'outputDir']) || standardOutputDir(projectDir, artifact, batch);
    if (output) downloaded.push(await download(finalUrls[0], path.resolve(output)));
    if (outputDir) {
      const dir = path.resolve(outputDir);
      for (let i = 0; i < finalUrls.length; i++) {
        const ext = extensionFromUrl(finalUrls[i]);
        downloaded.push(await download(finalUrls[i], path.join(dir, `geo_image_${String(i + 1).padStart(2, '0')}${ext}`)));
      }
    }
  }
  if (downloaded.length) result.downloaded = downloaded;

  const jsonOut = firstValue(args, ['json-out', 'jsonOut']);
  if (jsonOut) {
    fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
    fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(result, null, 2));
  }

  console.log(JSON.stringify(result, null, 2));
})().catch(err => {
  console.error(err.message || err);
  if (err.response) console.error(JSON.stringify(err.response, null, 2));
  process.exit(1);
});
