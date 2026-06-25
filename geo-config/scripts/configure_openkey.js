#!/usr/bin/env node
/**
 * Configure GEO openKey with automatic Base URL + Referer detection.
 *
 * Default Referer order:
 *   1) https://geo.bihuogeo.com
 *   2) https://geo.bihuoai.com
 *
 * Default Base URL candidates are maintained internally and are not printed in normal output.
 *
 * The script never prints the real openKey. It validates by calling
 * GET /v1/geo-company?page=1&limit=1 before writing config.
 */
function preArgValue(names) {
  for (let i = 2; i < process.argv.length; i++) {
    const token = process.argv[i];
    for (const name of names) {
      if (token === name) return process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : '';
      if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
    }
  }
  return '';
}
const preProfile = preArgValue(['--profile', '--config-profile', '--configProfile']);
if (preProfile && !process.env.GEO_CONFIG_FILE && !process.env.GEO_CONFIG && !process.env.GEO_OSS_CONFIG) process.env.GEO_PROFILE = preProfile;
const { loadGeoConfig, saveGeoConfig, ensureConfig, headers: geoHeaders, configPath, profileName, mask } = require('../../geo-runtime/scripts/credentials.js');

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
function first(args, names, fallback = undefined) {
  for (const n of names) if (args[n] !== undefined && args[n] !== '') return args[n];
  return fallback;
}
function usage() {
  console.log(`Usage:
  node geo-config/scripts/configure_openkey.js --open-key <openKey> --force
  node geo-config/scripts/configure_openkey.js --open-key <openKey> --dry-run
  node geo-config/scripts/configure_openkey.js --open-key <openKey> --referers https://geo.bihuogeo.com,https://geo.bihuoai.com --force
  node geo-config/scripts/configure_openkey.js --profile platform-a --open-key <openKey> --force

Options:
  --open-key / --openKey <key>   New GEO openKey. If omitted, uses GEO_OPENKEY/GEO_OPEN_KEY or existing config openKey.
  --profile <name>              Save/read ~/.geo-skills/credentials/geo-config.<name>.json.
  --api-url / --base-url <url>   Single GEO API base URL to test; value is not printed.
  --api-urls <a,b>               Candidate Base URLs, tried in order; values are not printed.
  --referers <a,b>               Candidate Referer values, tried in order.
  --referer <url>                Single Referer candidate to test.
  --company-id <id>              Optional defaults.companyId to write.
  --product-id <id>              Optional defaults.productId to write.
  --keep-defaults                Keep existing defaults when openKey/referer changes. Default resets to 0/0.
  --dry-run                      Test and preview; do not write.
  --force                        Required to write config.
  --json                         Output JSON only.
`);
}
function normalizeBaseUrl(v) { return String(v || '').replace(/\/$/, ''); }
function parseList(v) { return String(v || '').split(/[,，|]/).map(s => s.trim()).filter(Boolean); }
function defaultReferers() { return ['https://geo.bihuogeo.com', 'https://geo.bihuoai.com']; }
function candidateReferers(args) {
  const direct = first(args, ['referer'], '');
  const list = first(args, ['referers', 'referer-list', 'refererList'], '');
  const raw = direct ? [direct] : (list ? parseList(list) : defaultReferers());
  return [...new Set(raw.map(s => String(s).trim()).filter(Boolean))];
}
function candidateBaseUrls(args, currentBaseUrl) {
  const direct = first(args, ['api-url', 'apiUrl', 'base-url', 'baseUrl'], '');
  const list = first(args, ['api-urls', 'apiUrls', 'base-urls', 'baseUrls'], '');
  const defaults = [currentBaseUrl, 'https://geo.zqsdai.com', 'https://nbgeo.aimusiclj.com'];
  const raw = direct ? [direct] : (list ? parseList(list) : defaults);
  return [...new Set(raw.map(normalizeBaseUrl).filter(Boolean))];
}
function summarizeBody(body) {
  if (!body) return '';
  if (typeof body === 'string') return body.slice(0, 300);
  return body.message || body.msg || body.error || JSON.stringify(body).slice(0, 300);
}
function rowsOf(body) {
  const d = body?.data || body;
  return Array.isArray(d?.data) ? d.data : Array.isArray(d?.list) ? d.list : Array.isArray(d) ? d : [];
}
function sanitizeAttempt(attempt) {
  const { baseUrl, ...safe } = attempt || {};
  return safe;
}
function sanitizeAttempts(attempts) { return (attempts || []).map(sanitizeAttempt); }
async function fetchWithTimeout(url, options, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); }
  finally { clearTimeout(timer); }
}
async function testReferer({ baseUrl, openKey, referer }) {
  const cfg = { geo: { baseUrl, openKey, referer }, defaults: { companyId: 0, productId: 0 } };
  const url = `${normalizeBaseUrl(baseUrl)}/v1/geo-company?page=1&limit=1`;
  try {
    const res = await fetchWithTimeout(url, { headers: { ...geoHeaders(cfg), Accept: 'application/json' } });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    const statusCodeBad = body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0;
    const codeBad = body && typeof body === 'object' && body.code !== undefined && Number(body.code) >= 400;
    if (!res.ok || statusCodeBad || codeBad) {
      return { ok: false, baseUrl, referer, httpStatus: res.status, message: summarizeBody(body) || res.statusText };
    }
    return { ok: true, baseUrl, referer, httpStatus: res.status, companyPreviewCount: rowsOf(body).length };
  } catch (e) {
    return { ok: false, baseUrl, referer, httpStatus: null, message: e.name === 'AbortError' ? 'request timeout' : (e.message || String(e)) };
  }
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  ensureConfig();
  const cfg = loadGeoConfig();
  const openKey = first(args, ['open-key', 'openKey'], process.env.GEO_OPENKEY || process.env.GEO_OPEN_KEY || cfg.geo.openKey || '');
  if (!openKey) throw new Error(`未提供 GEO openKey。请使用 --open-key，或设置 GEO_OPENKEY，或先写入 ${configPath()}。`);
  const currentBaseUrl = normalizeBaseUrl(cfg.geo.baseUrl || 'https://nbgeo.aimusiclj.com');
  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  const referers = candidateReferers(args);
  const baseUrls = candidateBaseUrls(args, currentBaseUrl);
  if (!baseUrls.length) throw new Error('没有可测试的 Base URL 候选值。');
  if (!referers.length) throw new Error('没有可测试的 Referer 候选值。');

  const attempts = [];
  let selectedBaseUrl = null;
  let selected = null;
  for (const baseUrl of baseUrls) {
    for (const referer of referers) {
      const attempt = await testReferer({ baseUrl, openKey, referer });
      attempts.push(attempt);
      if (attempt.ok) { selectedBaseUrl = baseUrl; selected = referer; break; }
    }
    if (selected) break;
  }

  const report = {
    configPath: configPath(),
    profile: profileName() || null,
    openKey: mask(openKey),
    platformDetected: Boolean(selectedBaseUrl),
    selectedReferer: selected,
    attempts: sanitizeAttempts(attempts),
    saved: false,
  };

  if (!selected) {
    report.next = '所有平台候选 + Referer 组合都未通过：请检查 openKey 是否属于支持的平台，或确认 Referer 白名单。';
    if (args.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log('GEO openKey auto-detect');
      console.log('Config:', report.configPath, 'openKey=', report.openKey);
      console.log('Attempts:', JSON.stringify(report.attempts, null, 2));
      console.log('Next:', report.next);
    }
    process.exitCode = 2;
    return;
  }

  const nextCfg = JSON.parse(JSON.stringify(cfg));
  const baseUrl = selectedBaseUrl;
  const changedIdentity = nextCfg.geo.openKey !== openKey || nextCfg.geo.referer !== selected || normalizeBaseUrl(nextCfg.geo.baseUrl) !== baseUrl;
  nextCfg.geo = Object.assign({}, nextCfg.geo, { baseUrl, openKey, referer: selected });
  if (args['keep-defaults'] || args.keepDefaults) {
    nextCfg.defaults = Object.assign({ companyId: 0, productId: 0 }, nextCfg.defaults || {});
  } else if (changedIdentity) {
    nextCfg.defaults = { companyId: 0, productId: 0 };
  } else {
    nextCfg.defaults = Object.assign({ companyId: 0, productId: 0 }, nextCfg.defaults || {});
  }
  const companyId = first(args, ['company-id', 'companyId'], undefined);
  const productId = first(args, ['product-id', 'productId'], undefined);
  if (companyId !== undefined) nextCfg.defaults.companyId = Number(companyId);
  if (productId !== undefined) nextCfg.defaults.productId = Number(productId);

  report.defaults = nextCfg.defaults;
  report.dryRun = dryRun;
  if (!dryRun) {
    if (!args.force) throw new Error('写入 GEO 配置需要 --force；如只想测试请使用 --dry-run。');
    saveGeoConfig(nextCfg);
    report.saved = true;
  }
  report.next = nextCfg.defaults.companyId && nextCfg.defaults.productId
    ? '配置已可用于后续 GEO 技能。'
    : 'openKey 已识别；接下来运行 setup_defaults.js --list 或 --auto 选择默认公司/产品。';

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log('GEO openKey auto-detect');
    console.log('Config:', report.configPath, 'openKey=', report.openKey);
    console.log('Selected Referer:', report.selectedReferer);
    console.log('Attempts:', JSON.stringify(report.attempts, null, 2));
    console.log(report.saved ? 'Saved defaults:' : 'Preview defaults:', JSON.stringify(report.defaults));
    console.log('Next:', report.next);
  }
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
