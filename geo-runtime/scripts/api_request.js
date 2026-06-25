#!/usr/bin/env node
/**
 * GEO API request helper (Node/no-Python, cross-platform).
 *
 * Use this instead of curl for ad-hoc GEO API calls, especially on Windows
 * or when Chinese JSON/body text is involved. Write methods require --force
 * unless --dry-run is used.
 */
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders, mask } = require('./credentials.js');

function parseArgs(argv) {
  const out = { _: [], query: [] };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) { out._.push(token); continue; }
    const raw = token.slice(2);
    if (raw.startsWith('no-')) { out[raw.slice(3)] = false; continue; }
    const eq = raw.indexOf('=');
    const key = eq >= 0 ? raw.slice(0, eq) : raw;
    const valFromEq = eq >= 0 ? raw.slice(eq + 1) : undefined;
    if (key === 'query' || key === 'q') {
      const v = valFromEq !== undefined ? valFromEq : argv[++i];
      if (v) out.query.push(v);
      continue;
    }
    if (valFromEq !== undefined) { out[key] = valFromEq; continue; }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
function first(args, names, fallback = undefined) {
  for (const n of names) if (args[n] !== undefined && args[n] !== '') return args[n];
  return fallback;
}
function usage() {
  console.log(`Usage:
  node geo-runtime/scripts/api_request.js --method GET --path /v1/article --use-defaults
  node geo-runtime/scripts/api_request.js --method POST --path /v1/article --body-file payload.json --dry-run
  node geo-runtime/scripts/api_request.js --method POST --path /v1/article --body-file payload.json --force

Options:
  --method <GET|POST|PUT|PATCH|DELETE>   Default GET
  --path <api-path-or-url>                e.g. /v1/article or full https://...
  --query k=v                            Repeatable query pair; safe cross-platform replacement for URL string concat
  --use-defaults                         Adds companyId/productId from config if missing
  --body-file <json-file>                Read UTF-8 JSON file
  --body-json <json-string>              Inline JSON; avoid for long Chinese content
  --body-stdin                           Read UTF-8 JSON from stdin
  --dry-run                              Print request preview; do not send
  --force                                Required for POST/PUT/PATCH/DELETE
  --json-out <file>                      Save response JSON/text

Safety:
  - Uses application/json; charset=utf-8 for JSON bodies.
  - Refuses write methods without --force or --dry-run.
  - Never prints the real openKey.
`);
}
function normalizeBase(base) { return String(base || '').replace(/\/$/, ''); }
function buildUrl(cfg, apiPath, queryPairs, useDefaults) {
  if (!apiPath) throw new Error('缺少 --path。');
  const url = /^https?:\/\//i.test(apiPath) ? new URL(apiPath) : new URL(normalizeBase(cfg.geo.baseUrl) + (apiPath.startsWith('/') ? apiPath : `/${apiPath}`));
  for (const pair of queryPairs || []) {
    const eq = String(pair).indexOf('=');
    if (eq <= 0) throw new Error(`--query 必须是 k=v 格式：${pair}`);
    url.searchParams.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  if (useDefaults) {
    if (!url.searchParams.has('companyId') && cfg.defaults.companyId) url.searchParams.set('companyId', String(cfg.defaults.companyId));
    if (!url.searchParams.has('productId') && cfg.defaults.productId) url.searchParams.set('productId', String(cfg.defaults.productId));
  }
  return url.toString();
}
function readBody(args) {
  const file = first(args, ['body-file', 'bodyFile']);
  const inline = first(args, ['body-json', 'bodyJson']);
  if (file) return fs.readFileSync(path.resolve(String(file)), 'utf8').replace(/^\uFEFF/, '');
  if (inline) return String(inline);
  if (args['body-stdin'] || args.bodyStdin) return fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '');
  return undefined;
}
function parseMaybeJson(text) {
  if (text === undefined) return undefined;
  try { return JSON.parse(text); } catch (e) { throw new Error(`请求体不是有效 JSON：${e.message}`); }
}
function redactHeaders(h) {
  const out = { ...h };
  if (out.Authorization) out.Authorization = `Bearer ${mask(String(out.Authorization).replace(/^Bearer\s+/i, ''))}`;
  return out;
}
function safeUrlForDisplay(url) {
  try { const u = new URL(url); return `${u.pathname}${u.search}`; }
  catch { return String(url || '').replace(/^https?:\/\/[^/]+/i, ''); }
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const cfg = loadGeoConfig();
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
  const method = String(first(args, ['method', 'X'], 'GET')).toUpperCase();
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (write && !(args.force || args['dry-run'] || args.dryRun)) {
    throw new Error(`${method} 是写操作。请先加 --dry-run 预览；真实执行必须加 --force。`);
  }
  const url = buildUrl(cfg, first(args, ['path', 'url', 'endpoint'], args._[0]), args.query, args['use-defaults'] || args.useDefaults);
  const bodyText = readBody(args);
  const bodyJson = parseMaybeJson(bodyText);
  const h = { ...geoHeaders(cfg), Accept: 'application/json' };
  if (bodyText !== undefined) h['Content-Type'] = 'application/json; charset=utf-8';
  const preview = { method, path: safeUrlForDisplay(url), headers: redactHeaders(h), body: bodyJson };
  if (args['dry-run'] || args.dryRun) {
    console.log(JSON.stringify({ dryRun: true, request: preview }, null, 2));
    return;
  }
  const res = await fetch(url, { method, headers: h, body: bodyText });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  const result = { ok: res.ok, httpStatus: res.status, data };
  if (!res.ok || (data && typeof data === 'object' && data.statusCode !== undefined && data.statusCode !== 0)) {
    result.apiWarning = data && typeof data === 'object' ? (data.message || data.msg || 'GEO API returned non-zero statusCode') : 'Non-JSON error response';
  }
  const jsonOut = first(args, ['json-out', 'jsonOut']);
  if (jsonOut) {
    fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
    fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(result, null, 2), 'utf8');
  }
  console.log(JSON.stringify(result, null, 2));
  if (!res.ok || result.apiWarning) process.exitCode = 1;
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
