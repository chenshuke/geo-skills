#!/usr/bin/env node
/**
 * GEO article upload (UTF-8 safe).
 *
 * Reads local Markdown as UTF-8, rejects invalid/suspicious mojibake by default,
 * posts JSON with explicit charset, and verifies by reading back the article.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { loadGeoConfig, headers: geoHeaders } = require('../../geo-runtime/scripts/credentials.js');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
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
  node geo-article/scripts/upload_article.js --file article.md [options]
  node geo-article/scripts/upload_article.js --title "标题" --content "正文" [options]

UTF-8 safe by default. Suspicious mojibake is rejected unless --allow-suspicious is set.

Options:
  --file <path>               Markdown file, read as UTF-8
  --title <text>              Article title; defaults to first H1 or frontmatter title
  --content <text>            Article content if --file is not used
  --summary <text>            Summary; defaults to content excerpt
  --tags <a,b,c>              Tags, comma-separated
  --cover-url <url>           coverImageUrl
  --auto-cover                Generate cover through GEO /v1/text-to-img and use ossUrls[0]
  --product-id <id>           Defaults to config defaults.productId
  --company-id <id>           Defaults to config defaults.companyId
  --dry-run                   Validate and print payload; do not upload
  --allow-suspicious          Do not block suspicious mojibake patterns
  --json-out <file>           Save result JSON

Examples:
  node geo-article/scripts/upload_article.js --file "文章.md" --auto-cover
  node geo-article/scripts/upload_article.js --file "文章.md" --cover-url "https://...png"
`);
}
function decodeUtf8Strict(file) {
  const buf = fs.readFileSync(file);
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  if (replacementCount > 0) {
    throw new Error(`文件不是有效 UTF-8，已出现 ${replacementCount} 个替换字符 �：${file}\n请先把文件另存为 UTF-8 without BOM 后再上传。`);
  }
  return text.replace(/\r\n/g, '\n');
}
function stripFrontmatter(md) {
  if (!md.startsWith('---\n')) return { body: md, fm: {} };
  const end = md.indexOf('\n---', 4);
  if (end < 0) return { body: md, fm: {} };
  const raw = md.slice(4, end).trim();
  const fm = {};
  for (const line of raw.split(/\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return { body: md.slice(end + 4).replace(/^\s*\n/, ''), fm };
}
function extractTitle(md, fm, explicit) {
  if (explicit) return String(explicit).trim();
  if (fm.title) return String(fm.title).trim();
  const m = md.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  return '';
}
function excerpt(content, max = 200) {
  return content
    .replace(/^---[\s\S]*?---\s*/,'')
    .replace(/```[\s\S]*?```/g,'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,'')
    .replace(/!\[\[[^\]]+\]\]/g,'')
    .replace(/[#>*_`\-\[\]()]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0, max);
}
function parseTags(v) { return String(v || '').split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 5); }
function suspiciousMojibake(text) {
  const patterns = [
    /锟斤拷|烫烫|屯屯|�/,
    /(?:Ã|Â|â€|â€™|â€œ|â€\u009d|â€¦)/,
    /(?:ä¸|å[\x80-\xff]|æ[\x80-\xff]|ç[\x80-\xff])/, // common UTF-8 bytes decoded as latin-1
  ];
  const hits = patterns.filter(p => p.test(text)).map(p => String(p));
  return hits;
}
function countCjk(text) { return (text.match(/[\u3400-\u9fff]/g) || []).length; }
function buildHeaders(cfg) {
  return { ...geoHeaders(cfg), 'Content-Type': 'application/json; charset=utf-8', 'Accept': 'application/json' };
}
async function requestJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) {
    const msg = body && typeof body === 'object' ? (body.message || JSON.stringify(body)) : String(body).slice(0, 500);
    const err = new Error(`GEO API failed: HTTP ${res.status} ${res.statusText}; ${msg}`);
    err.response = body;
    throw err;
  }
  return body;
}
async function generateCover(args, title) {
  const script = path.resolve(__dirname, '../../geo-content-production/scripts/generate_cover.js');
  const tmp = path.join(os.tmpdir(), `geo-cover-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const coverArgs = [script, '--title', title, '--json-out', tmp];
  const brand = first(args, ['brand', 'product', 'company']); if (brand) coverArgs.push('--brand', String(brand));
  const keywords = first(args, ['keywords', 'tags']); if (keywords) coverArgs.push('--keywords', String(keywords));
  const res = cp.spawnSync(process.execPath, coverArgs, { stdio: 'inherit' });
  if (res.error || res.status) throw new Error(`自动封面生成失败：${res.error ? res.error.message : `exit ${res.status}`}`);
  const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  try { fs.unlinkSync(tmp); } catch {}
  const url = Array.isArray(data.ossUrls) && data.ossUrls[0] || Array.isArray(data.resourceUrls) && data.resourceUrls[0];
  if (!url) throw new Error('自动封面生成完成但没有返回图片 URL');
  return url;
}
async function getArticle(base, h, id) {
  if (!id) return null;
  try {
    const j = await requestJson(`${base}/v1/article/${id}`, { headers: h });
    return j.data || j;
  } catch { return null; }
}
async function listRecent(base, h, { productId, companyId }) {
  const qs = new URLSearchParams({ page: '1', limit: '10', productId: String(productId), companyId: String(companyId) });
  const j = await requestJson(`${base}/v1/article?${qs}`, { headers: h });
  const d = j.data || j;
  return Array.isArray(d?.data) ? d.data : Array.isArray(d?.list) ? d.list : Array.isArray(d) ? d : [];
}
function summarizeCheck(title, content, uploaded) {
  const uTitle = uploaded?.title || '';
  const uContent = uploaded?.content || uploaded?.markdown || uploaded?.body || '';
  return {
    titleExact: uTitle ? uTitle === title : null,
    titleReturned: uTitle || null,
    contentReturned: Boolean(uContent),
    suspiciousReturned: suspiciousMojibake(`${uTitle}\n${uContent}`),
    cjkLocal: countCjk(`${title}\n${content}`),
    cjkReturned: countCjk(`${uTitle}\n${uContent}`),
  };
}
(async () => {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const cfg = loadGeoConfig();
  const base = cfg.geo.baseUrl.replace(/\/$/, '');
  const companyId = Number(first(args, ['company-id', 'companyId'], cfg.defaults.companyId || 0));
  const productId = Number(first(args, ['product-id', 'productId'], cfg.defaults.productId || 0));
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
  if (!companyId || !productId) throw new Error('缺少 companyId/productId，请先配置 defaults 或传 --company-id/--product-id。');

  let raw = '';
  let fm = {};
  if (args.file) {
    raw = decodeUtf8Strict(path.resolve(String(args.file)));
    const parsed = stripFrontmatter(raw);
    raw = parsed.body;
    fm = parsed.fm;
  } else if (args.content) {
    raw = String(args.content).replace(/\r\n/g, '\n');
  } else {
    usage(); process.exit(1);
  }
  const title = extractTitle(raw, fm, first(args, ['title']));
  if (!title) throw new Error('缺少标题：请在 Markdown 中添加一级标题 # 标题，或传 --title。');
  const content = raw.trim();
  const summary = first(args, ['summary'], fm.summary || excerpt(content));
  const tags = parseTags(first(args, ['tags'], fm.tags || ''));

  const suspicious = suspiciousMojibake(`${title}\n${summary}\n${content}`);
  if (suspicious.length && !args['allow-suspicious'] && !args.allowSuspicious) {
    throw new Error(`检测到疑似乱码/错误编码模式：${suspicious.join(', ')}\n请确认源文件已保存为 UTF-8，或确认无误后加 --allow-suspicious。`);
  }

  let coverImageUrl = first(args, ['cover-url', 'coverUrl'], fm.coverImageUrl || fm.cover || '');
  if (!coverImageUrl && (args['auto-cover'] || args.autoCover)) coverImageUrl = await generateCover(args, title);

  const payload = { title, productId, companyId, coverImageUrl, content, summary, tags };
  Object.keys(payload).forEach(k => (payload[k] === '' || payload[k] == null || (Array.isArray(payload[k]) && payload[k].length === 0)) && delete payload[k]);

  const localCheck = { title, bytes: Buffer.byteLength(JSON.stringify(payload), 'utf8'), cjkCount: countCjk(`${title}\n${content}`), suspicious };
  if (args['dry-run'] || args.dryRun) {
    console.log(JSON.stringify({ dryRun: true, endpoint: `${base}/v1/article`, localCheck, payloadPreview: { ...payload, content: content.slice(0, 500) + (content.length > 500 ? '...' : '') } }, null, 2));
    return;
  }

  const h = buildHeaders(cfg);
  const created = await requestJson(`${base}/v1/article`, { method: 'POST', headers: h, body: JSON.stringify(payload) });
  const id = created?.data?.id || created?.id;
  let uploaded = await getArticle(base, h, id);
  if (!uploaded) {
    const rows = await listRecent(base, h, { productId, companyId });
    uploaded = rows.find(x => x.id === id) || rows.find(x => x.title === title) || null;
  }
  const verification = summarizeCheck(title, content, uploaded);
  if (verification.suspiciousReturned.length) {
    console.error('⚠️ 回查结果疑似乱码：', verification.suspiciousReturned.join(', '));
  }
  if (verification.titleExact === false) {
    console.error('⚠️ 回查标题与本地标题不完全一致，请检查是否发生编码或平台处理问题。');
  }
  const result = { created: created.data || created, articleId: id, verification, uploadedPreview: uploaded ? { id: uploaded.id, title: uploaded.title, coverImageUrl: uploaded.coverImageUrl, status: uploaded.status } : null };
  const jsonOut = first(args, ['json-out', 'jsonOut']);
  if (jsonOut) { fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true }); fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(result, null, 2), 'utf8'); }
  console.log(JSON.stringify(result, null, 2));
})().catch(e => { console.error(e.message || e); if (e.response) console.error(JSON.stringify(e.response, null, 2)); process.exit(1); });
