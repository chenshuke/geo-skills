#!/usr/bin/env node
/**
 * GEO Image Generation — use GEO platform /v1/text-to-img.
 *
 * Creates an async text-to-image task, optionally waits for completion,
 * uploads returned provider URLs to GEO OSS, and optionally downloads images
 * to local files. Credentials are shared with other GEO skills.
 *
 * Important: Kling resourceUrls can be very long signed URLs. Direct
 * /v1/oss/translate-url may silently return null. The default OSS strategy is
 * therefore local-upload: download provider images to temp files, upload them
 * with /v1/oss/pre signed POST, then verify each resulting OSS URL.
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
  --oss-mode <local|auto|translate|none>
                                默认 local：先下载 provider 图片，再通过 /v1/oss/pre 上传并验证
                                auto：先尝试 translate-url，失败/返回 null 时自动回退本地上传
                                translate：仅使用旧 URL 镜像转存；none：不生成 OSS URL
  --translate-url / --no-translate-url
                                兼容旧参数；--translate-url 等价 auto，--no-translate-url 等价 none
  --keep-temp                   保留转存时下载的临时图片，默认上传后删除
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
  return normalizeTranslatedUrls(body, sourceUrls);
}

function isHttpUrl(v) { return typeof v === 'string' && /^https?:\/\//i.test(v); }
function pickUrl(v) {
  if (isHttpUrl(v)) return v;
  if (!v || typeof v !== 'object') return null;
  return v.url || v.ossUrl || v.ossURL || v.uploadUrl || v.resourceUrl || v.src || null;
}
function normalizeTranslatedUrls(body, sourceUrls = []) {
  const data = body && typeof body === 'object' && body.data !== undefined ? body.data : body;
  if (Array.isArray(data)) return data.map(pickUrl);
  if (data && typeof data === 'object') {
    for (const key of ['ossUrls', 'urls', 'resourceUrls', 'list', 'data']) {
      if (Array.isArray(data[key])) return data[key].map(pickUrl);
    }
    const mapped = sourceUrls.map(src => pickUrl(data[src]));
    if (mapped.some(Boolean)) return mapped;
    const one = pickUrl(data);
    if (one) return [one];
  }
  return [];
}
function resolveOssMode(args) {
  const explicit = firstValue(args, ['oss-mode', 'ossMode']);
  if (explicit) {
    const v = String(explicit).toLowerCase();
    if (['local', 'auto', 'translate', 'none'].includes(v)) return v;
    throw new Error('--oss-mode 只能是 local、auto、translate 或 none。');
  }
  if (args['translate-url'] === false || args.translateUrl === false) return 'none';
  if (args['translate-url'] === true || args.translateUrl === true) return 'auto';
  return 'local';
}
function contentTypeFromExt(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  return 'image/png';
}
function extFromContentType(ct) {
  const v = String(ct || '').toLowerCase();
  if (v.includes('jpeg') || v.includes('jpg')) return '.jpg';
  if (v.includes('webp')) return '.webp';
  if (v.includes('gif')) return '.gif';
  if (v.includes('svg')) return '.svg';
  if (v.includes('png')) return '.png';
  return '';
}
function safeFileName(name, fallback = 'geo_image.png') {
  const ext = path.extname(name || fallback) || path.extname(fallback) || '.png';
  const base = path.basename(name || fallback, ext).replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70) || 'geo_image';
  return `${base}${ext}`;
}
async function requestOssPre(cfg, fileName) {
  const url = `${normalizeBaseUrl(cfg.baseUrl)}/v1/oss/pre`;
  const payload = { fileName, businessType: 2, groupId: 1, from: 1, url: '' };
  const body = await requestJson(url, { method: 'POST', headers: headers(cfg), body: JSON.stringify(payload) });
  const data = body.data || body;
  if (!data || !data.host || !data.key) throw new Error('OSS 预签名失败：/v1/oss/pre 未返回 host/key。');
  return data;
}
async function downloadToTemp(url, index) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载 provider 图片失败：image#${index + 1} HTTP ${res.status} ${res.statusText}`);
  const contentType = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error(`下载 provider 图片失败：image#${index + 1} 内容为空。`);
  const ext = extFromContentType(contentType) || extensionFromUrl(url, '.png');
  const fileName = safeFileName(`geo_image_${Date.now()}_${index + 1}${ext}`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-img-oss-'));
  const file = path.join(dir, fileName);
  fs.writeFileSync(file, buf);
  return { file, fileName, contentType: contentType || contentTypeFromExt(fileName), bytes: buf.length, tempDir: dir };
}
async function uploadLocalFileToOss(cfg, file, fileName) {
  const safeName = safeFileName(fileName || path.basename(file));
  const pre = await requestOssPre(cfg, safeName);
  const form = new FormData();
  for (const key of ['expire', 'policy', 'signature', 'OSSAccessKeyId', 'host', 'callback', 'dir', 'key', 'uploadUrl', 'Content-Disposition']) {
    if (pre[key] !== undefined && pre[key] !== null) form.append(key, String(pre[key]));
  }
  const blob = new Blob([fs.readFileSync(file)], { type: contentTypeFromExt(safeName) });
  form.append('file', blob, safeName);
  const res = await fetch(pre.host, { method: 'POST', body: form });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`OSS 本地上传失败：HTTP ${res.status} ${res.statusText}; ${String(text).slice(0, 300)}`);
  const finalUrl = pre.uploadUrl || (String(pre.host).replace(/\/$/, '') + '/' + String(pre.key || '').replace(/^\//, ''));
  return { url: finalUrl, httpStatus: res.status, fileName: safeName };
}
async function verifyRemoteImage(url) {
  if (!isHttpUrl(url)) throw new Error('OSS URL 无效。');
  let res = null;
  try { res = await fetch(url, { method: 'HEAD' }); } catch {}
  if (res && res.ok) return { ok: true, httpStatus: res.status, method: 'HEAD' };
  res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
  if (res.ok || res.status === 206) return { ok: true, httpStatus: res.status, method: 'GET' };
  throw new Error(`OSS URL 验证失败：HTTP ${res.status} ${res.statusText}`);
}
async function uploadSourceUrlsViaLocal(cfg, sourceUrls, { keepTemp = false, onlyIndexes = null } = {}) {
  const ossUrls = new Array(sourceUrls.length).fill(null);
  const items = [];
  const indexes = onlyIndexes || sourceUrls.map((_, i) => i);
  for (const i of indexes) {
    const src = sourceUrls[i];
    if (!isHttpUrl(src)) throw new Error(`resourceUrls[${i}] 不是有效 URL。`);
    const tmp = await downloadToTemp(src, i);
    try {
      const uploaded = await uploadLocalFileToOss(cfg, tmp.file, tmp.fileName);
      const verification = await verifyRemoteImage(uploaded.url);
      ossUrls[i] = uploaded.url;
      items.push({ index: i, method: 'local-upload', fileName: uploaded.fileName, bytes: tmp.bytes, ossUrl: uploaded.url, verified: verification });
    } finally {
      if (!keepTemp) { try { fs.rmSync(tmp.tempDir, { recursive: true, force: true }); } catch {} }
    }
  }
  return { ossUrls, items };
}
async function buildOssUrls(cfg, sourceUrls, { mode = 'local', keepTemp = false } = {}) {
  const report = { mode, ossUrls: [], items: [], warnings: [] };
  if (!Array.isArray(sourceUrls) || !sourceUrls.length || mode === 'none') return report;

  let translated = [];
  if (mode === 'auto' || mode === 'translate') {
    try { translated = await translateUrls(cfg, sourceUrls); }
    catch (e) { report.warnings.push(`translate-url failed: ${e.message || e}`); translated = []; }
  }

  if (mode === 'translate') {
    report.ossUrls = translated.filter(isHttpUrl);
    if (report.ossUrls.length !== sourceUrls.length) report.warnings.push('translate-url returned empty/null URL for one or more images. Use --oss-mode local or auto.');
    return report;
  }

  if (mode === 'auto') {
    const missing = [];
    report.ossUrls = new Array(sourceUrls.length).fill(null);
    for (let i = 0; i < sourceUrls.length; i++) {
      const candidate = translated[i];
      if (isHttpUrl(candidate)) {
        try {
          const verification = await verifyRemoteImage(candidate);
          report.ossUrls[i] = candidate;
          report.items.push({ index: i, method: 'translate-url', ossUrl: candidate, verified: verification });
          continue;
        } catch (e) {
          report.warnings.push(`translate-url verification failed for image#${i + 1}: ${e.message || e}`);
        }
      } else {
        report.warnings.push(`translate-url returned null/empty for image#${i + 1}; fallback to local upload.`);
      }
      missing.push(i);
    }
    if (missing.length) {
      const local = await uploadSourceUrlsViaLocal(cfg, sourceUrls, { keepTemp, onlyIndexes: missing });
      for (let i = 0; i < local.ossUrls.length; i++) if (local.ossUrls[i]) report.ossUrls[i] = local.ossUrls[i];
      report.items.push(...local.items);
    }
    report.ossUrls = report.ossUrls.filter(isHttpUrl);
    return report;
  }

  const local = await uploadSourceUrlsViaLocal(cfg, sourceUrls, { keepTemp });
  report.ossUrls = local.ossUrls.filter(isHttpUrl);
  report.items = local.items;
  return report;
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
  const ossMode = resolveOssMode(args);
  const keepTemp = Boolean(args['keep-temp'] || args.keepTemp);
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
      if (ossMode !== 'none') {
        const oss = await buildOssUrls(cfg, row.resourceUrls, { mode: ossMode, keepTemp });
        result.ossUrls = oss.ossUrls;
        result.ossUpload = oss;
      }
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
