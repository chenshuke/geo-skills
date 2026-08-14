#!/usr/bin/env node
/** GEO OSS uploader. Node.js 18+ only; no Python or third-party packages. */
const fs = require('fs');
const path = require('path');
const os = require('os');

const IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']);
const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)|!\[\[([^\]]+)\]\]/g;

function args(argv) {
  const out = { file: [], glob: [] };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i]; if (!token.startsWith('--')) continue;
    const key = token.slice(2); const next = argv[i + 1];
    if (key === 'file' || key === 'glob') { if (next && !next.startsWith('--')) out[key].push(next), i++; continue; }
    if (key.includes('=')) { const [k, ...v] = key.split('='); out[k] = v.join('='); continue; }
    if (!next || next.startsWith('--')) out[key] = true; else out[key] = next, i++;
  }
  return out;
}
function baseUrl(v) { return String(v || '').replace(/\/$/, ''); }
function http(v) { return /^https?:\/\//i.test(String(v || '')); }
function ensureFile(v) { const p = path.resolve(v); if (!fs.existsSync(p) || !fs.statSync(p).isFile()) throw new Error(`文件不存在：${v}`); return p; }
function findConfig(start) {
  let dir = path.resolve(start); if (fs.existsSync(dir) && fs.statSync(dir).isFile()) dir = path.dirname(dir);
  while (true) { const p = path.join(dir, 'geo-config', 'geo-config.json'); if (fs.existsSync(p)) return p; const parent = path.dirname(dir); if (parent === dir) return null; dir = parent; }
}
function loadConfig(explicit) {
  const candidates = [explicit, process.env.GEO_OSS_CONFIG, process.env.GEO_CONFIG, path.join(os.homedir(), '.geo-skills', 'credentials', 'geo-config.json'), findConfig(process.cwd())].filter(Boolean).map(p => path.resolve(p));
  let data = {}, used = ''; for (const p of candidates) { if (fs.existsSync(p)) { data = JSON.parse(fs.readFileSync(p, 'utf8')); used = p; break; } }
  const geo = data.geo && typeof data.geo === 'object' ? data.geo : data;
  const cfg = { baseUrl: process.env.GEO_BASE_URL || geo.baseUrl || geo.base_url, openKey: process.env.GEO_OPENKEY || process.env.GEO_OPEN_KEY || geo.openKey || geo.open_key, referer: process.env.GEO_REFERER || geo.referer || '' };
  if (!cfg.baseUrl || !cfg.openKey) throw new Error('缺少 GEO 配置，请使用 --config、GEO_CONFIG 或环境变量 GEO_BASE_URL/GEO_OPENKEY。');
  if (used) console.error(`Using GEO config: ${used}`); return { ...cfg, baseUrl: baseUrl(cfg.baseUrl) };
}
function headers(cfg) { return { Accept: 'application/json', Authorization: `Bearer ${cfg.openKey}`, ...(cfg.referer ? { Referer: cfg.referer } : {}) }; }
async function jsonRequest(cfg, endpoint, options = {}) {
  const res = await fetch(`${cfg.baseUrl}${endpoint}`, { ...options, headers: { ...headers(cfg), ...(options.headers || {}) } });
  const text = await res.text(); let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) throw new Error(`GEO API ${endpoint} failed: HTTP ${res.status}; ${typeof body === 'object' ? body.message || body.msg || JSON.stringify(body).slice(0, 300) : String(body).slice(0, 300)}`);
  return body;
}
function mime(file) { return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file).toLowerCase()] || 'application/octet-stream'; }
function uploadName(file, index) { const ext = IMG_EXTS.has(path.extname(file).toLowerCase()) ? path.extname(file).toLowerCase() : '.png'; const stem = (path.basename(file, path.extname(file)).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[_\.-]+|[_\.-]+$/g, '').slice(0, 60) || 'image'); return `${stem}_${String(index).padStart(2, '0')}_${Date.now()}${ext}`; }
async function uploadOne(file, cfg, index, a) {
  const fileName = uploadName(file, index);
  const pre = await jsonRequest(cfg, '/v1/oss/pre', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ fileName, businessType: Number(a['business-type'] || 2), groupId: Number(a['group-id'] || 1), from: Number(a['from-value'] || 1), url: '' }) });
  const data = pre.data || pre; const required = ['host', 'policy', 'signature', 'OSSAccessKeyId', 'key']; const missing = required.filter(k => data[k] === undefined || data[k] === null); if (missing.length) throw new Error(`/v1/oss/pre 缺少字段：${missing.join(', ')}`);
  const form = new FormData(); for (const k of ['expire', 'policy', 'signature', 'OSSAccessKeyId', 'host', 'callback', 'dir', 'key', 'uploadUrl', 'Content-Disposition']) if (data[k] != null) form.append(k, String(data[k])); form.append('file', new Blob([fs.readFileSync(file)], { type: mime(file) }), fileName);
  const uploaded = await fetch(data.host, { method: 'POST', body: form }); const text = await uploaded.text(); if (!uploaded.ok) throw new Error(`OSS 上传失败：HTTP ${uploaded.status} ${text.slice(0, 300)}`);
  const url = data.uploadUrl || `${String(data.host).replace(/\/$/, '')}/${String(data.key).replace(/^\//, '')}`; let check = await fetch(url, { method: 'HEAD' }).catch(() => null); if (!check || !check.ok) { check = await fetch(url, { headers: { Range: 'bytes=0-0' } }); if (!(check.ok || check.status === 206)) throw new Error(`OSS URL 验证失败：HTTP ${check.status}`); } return url;
}
function expandGlob(pattern) { const p = path.resolve(pattern); if (!/[?*[]/.test(p)) return fs.existsSync(p) ? [p] : []; const root = p.slice(0, p.search(/[?*[]/)).replace(/[/\\][^/\\]*$/, '') || path.parse(p).root; const suffix = p.slice(root.length + 1).replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.'); const re = new RegExp(`^${suffix}$`); const found = []; const walk = d => { if (!fs.existsSync(d)) return; for (const n of fs.readdirSync(d)) { const q = path.join(d, n), st = fs.statSync(q); if (st.isDirectory()) walk(q); else if (re.test(q.slice(root.length + 1))) found.push(q); } }; walk(root); return found; }
function resolveImage(md, raw, wiki) { const target = wiki ? String(raw).split('|', 1)[0] : raw; if (!wiki && http(target)) return null; for (const p of [path.resolve(path.dirname(md), target), path.resolve(target)]) if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; return null; }
function markdownImages(md) { const text = fs.readFileSync(md, 'utf8'), items = []; for (const m of text.matchAll(MD_IMAGE_RE)) { const raw = m[2] || m[3] || '', file = resolveImage(md, raw, Boolean(m[3])); if (file) items.push({ full: m[0], alt: m[1] || '图片', file }); else if (raw) console.error(`WARNING: image not found, leaving unchanged: ${raw}`); } return { text, items }; }
async function main() {
  const a = args(process.argv);
  if (a['init-config']) { if (!a['base-url'] || !(a['open-key'] || process.env.GEO_OPENKEY)) throw new Error('--init-config 需要 --base-url 和 --open-key'); const p = path.resolve(a['init-config']); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify({ geo: { baseUrl: baseUrl(a['base-url']), openKey: a['open-key'] || process.env.GEO_OPENKEY, referer: a.referer || '' } }, null, 2)); fs.chmodSync(p, 0o600); console.log(`Wrote config: ${p}`); return; }
  const files = [...a.file, ...a.glob.flatMap(expandGlob)]; let md = null, mdData = null; if (a.markdown) { md = ensureFile(a.markdown); mdData = markdownImages(md); files.push(...mdData.items.map(x => x.file)); }
  const unique = [...new Set(files.map(x => path.resolve(x)))].filter(x => fs.existsSync(x) && fs.statSync(x).isFile()); if (!unique.length) throw new Error('没有找到可上传的图片。'); if (a['dry-run']) { console.log(JSON.stringify(unique, null, 2)); return; }
  const cfg = loadConfig(a.config), mapping = {}; for (let i = 0; i < unique.length; i++) { mapping[unique[i]] = await uploadOne(unique[i], cfg, i + 1, a); console.log(`${unique[i]} -> ${mapping[unique[i]]}`); }
  if (a.output) { const p = path.resolve(a.output); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(mapping, null, 2)); }
  if (a.replace && md && mdData) { let updated = mdData.text; for (const x of mdData.items) updated = updated.replace(x.full, `![${x.alt}](${mapping[x.file]})`); if (!a['no-backup']) fs.writeFileSync(`${md}.bak_before_oss`, mdData.text); fs.writeFileSync(md, updated); console.error(`Updated Markdown: ${md}`); }
}
main().catch(e => { console.error(e.message || e); process.exitCode = 1; });
