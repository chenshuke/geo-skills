#!/usr/bin/env node
/**
 * GEO published URL matcher.
 * Checks whether published URLs are cited in Scheduled Indexing searchedSites.
 * Never prints Base URL or full openKey.
 */
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders, mask } = require('../../geo-runtime/scripts/credentials.js');
const { unwrapRows, normalizePublicationJson } = require('../../geo-runtime/scripts/publication_helpers.js');

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
function today() { return new Date().toISOString().slice(0, 10); }
function nowIso() { return new Date().toISOString(); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); return dir; }
function usage() {
  console.log(`Usage:
  node geo-indexing/scripts/published_url_match.js --published-url https://example.com/a/1 --answers-json answers.json --project-dir 项目_品牌GEO
  node geo-indexing/scripts/published_url_match.js --publication-json publication_status.json --schedule-id 123 --limit 200
  node geo-indexing/scripts/published_url_match.js --published-urls urls.txt --schedule-id 123 --title "文章标题" --account "账号名"

Purpose:
  用 publishedUrl 检查 Scheduled Indexing answers.searchedSites 是否精确命中新 URL；否则做 title/account 弱命中并给复测建议。

Inputs:
  --published-url <url>            单个发布 URL
  --published-urls <file|list>     URL 文件，或逗号/换行分隔 URL 列表
  --publication-json <file>        geo-publish/scripts/publication_status.js 输出 JSON
  --answers-json <file>            scheduled_indexing.js --action answers --json-out 输出
  --schedule-id <id>               直接拉取 /v1/scheduled-indexing/{id}/answers
  --title <text>                   弱命中标题关键词
  --account <text>                 弱命中账号/品牌关键词
  --platform/run-id/topic-id       拉取 answers 时的过滤条件
  --project-dir <dir>              输出到 07_监测分析/收录监测/URL命中回查/
  --output-dir <dir>               自定义输出目录
  --dry-run                        只展示接口路径，不访问 API
  --json-out <file>                另存 JSON
`);
}
function outputDir(args) {
  const explicit = first(args, ['output-dir','outputDir']);
  if (explicit) return path.resolve(String(explicit));
  const projectDir = path.resolve(String(first(args, ['project-dir','projectDir'], '.')));
  return path.join(projectDir, '07_监测分析', '收录监测', 'URL命中回查');
}
function normalizeUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(String(raw).trim());
    u.protocol = 'https:';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|spm|from|share|source|timestamp|ts|token|sign|signature|expires|x-)/i.test(key)) u.searchParams.delete(key);
    if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch { return String(raw).trim(); }
}
function domainPath(raw) {
  try { const u = new URL(normalizeUrl(raw)); return `${u.hostname}${u.pathname}`.replace(/\/+$/, ''); } catch { return normalizeUrl(raw); }
}
function domainOf(raw) { try { return new URL(normalizeUrl(raw)).hostname; } catch { return ''; } }
function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .map(s => s.trim())
    .filter(s => s.length >= 2)
    .slice(0, 20);
}
function tokenHit(hay, words) {
  const s = String(hay || '').toLowerCase();
  const unique = [...new Set(words.filter(Boolean))];
  if (!unique.length) return false;
  const hits = unique.filter(w => s.includes(w.toLowerCase())).length;
  return hits >= Math.min(2, unique.length);
}
function readJson(file) { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
function targetFromRow(r) {
  return {
    publishedUrl: r.publishedUrl || '',
    title: r.title || '',
    account: r.accountName || r.account || '',
    articleId: r.articleId || '',
    platform: r.platform || '',
    publicationStatus: r.status || (r.publishedUrl ? 'published_url_ready' : 'pending'),
    rawStatus: r.rawStatus || '',
    rawMessage: r.rawMessage || '',
    nextAction: r.nextAction || '',
  };
}
function readPublishedTargets(args) {
  const targets = [];
  const one = first(args, ['published-url','publishedUrl','url']);
  if (one) targets.push({ publishedUrl: String(one), title: String(first(args, ['title'], '')), account: String(first(args, ['account','accountName','brand'], '')), articleId: first(args, ['article-id','articleId'], ''), publicationStatus: 'published_url_ready' });
  const many = first(args, ['published-urls','publishedUrls','urls']);
  if (many) {
    const p = path.resolve(String(many));
    const raw = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : String(many);
    for (const url of splitList(raw)) targets.push({ publishedUrl: url, title: String(first(args, ['title'], '')), account: String(first(args, ['account','accountName','brand'], '')), articleId: '', publicationStatus: 'published_url_ready' });
  }
  const publicationJson = first(args, ['publication-json','publicationJson','publish-status-json','publishStatusJson']);
  if (publicationJson) {
    const json = readJson(publicationJson);
    const normalized = normalizePublicationJson(json);
    for (const r of normalized) targets.push(targetFromRow(r));
  }
  const seen = new Set();
  return targets.filter(t => {
    if (!t.publishedUrl) {
      const key = `no-url:${t.articleId || ''}:${t.platform || ''}:${t.publicationStatus || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }
    const n = normalizeUrl(t.publishedUrl);
    if (!n) return false;
    const key = `${t.articleId || ''}:${n}`;
    if (seen.has(key)) return false;
    seen.add(key); t.normalizedUrl = n; t.domainPath = domainPath(n); t.domain = domainOf(n); return true;
  });
}
function readAnswers(args) {
  const file = first(args, ['answers-json','answersJson','file']);
  if (!file) return null;
  return unwrapRows(readJson(file));
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
async function fetchAnswers(args, cfg) {
  const id = Number(first(args, ['schedule-id','scheduleId','id'], 0));
  if (!id) throw new Error('需要 --answers-json 或 --schedule-id。');
  const query = { page: first(args, ['page'], 1), limit: first(args, ['limit'], 200) };
  for (const [arg, key] of [['platform','platform'],['topic-id','topicId'],['topicId','topicId'],['run-id','runId'],['runId','runId'],['task-id','taskId'],['taskId','taskId'],['start-date','startDate'],['startDate','startDate'],['end-date','endDate'],['endDate','endDate']]) {
    const v = first(args, [arg]); if (v !== undefined && v !== true) query[key] = String(v);
  }
  const pathOnly = apiPath(`/v1/scheduled-indexing/${id}/answers`, query);
  const res = await fetch(`${base(cfg)}${pathOnly}`, { headers: { ...geoHeaders(cfg), Accept: 'application/json' } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) {
    const msg = body && typeof body === 'object' ? (body.message || body.msg || JSON.stringify(body).slice(0,500)) : String(body).slice(0,500);
    throw new Error(`GEO API GET /v1/scheduled-indexing/{id}/answers failed: HTTP ${res.status}; ${msg}`);
  }
  return { rows: unwrapRows(body), pathOnly };
}
function searchedSitesOf(answer) {
  const sites = answer.searchedSites || answer.searchedSite || answer.sources || [];
  return Array.isArray(sites) ? sites : [];
}
function matchOne(target, answers) {
  if (!target.publishedUrl) {
    const status = target.publicationStatus === 'manual_required' ? 'manual_required' : target.publicationStatus === 'failed' ? 'failed' : target.publicationStatus === 'task_mapping_only' ? 'task_mapping_only' : 'pending';
    const suggestion = status === 'manual_required' ? '发布状态需要人工处理，先处理账号登录/授权/验证码后再回查 publishedUrl'
      : status === 'failed' ? '发布失败，先修复失败原因并重新发布，拿到 publishedUrl 后再做 AI 命中检测'
      : status === 'task_mapping_only' ? '只有发布任务映射，没有平台发布 URL；继续回查 /v1/publication'
      : '尚未拿到 publishedUrl；等待发布完成或人工核验平台后台后再检测';
    return { ...target, status, exactCount: 0, weakCount: 0, matches: [], suggestion };
  }
  const exact = [];
  const weak = [];
  const targetTitleTokens = tokens(target.title);
  const targetAccountTokens = tokens(target.account);
  const targetDomain = target.domain;
  for (const ans of answers) {
    for (const site of searchedSitesOf(ans)) {
      const siteUrl = site.url || site.href || site.link || '';
      const siteNorm = normalizeUrl(siteUrl);
      const siteDomainPath = domainPath(siteNorm);
      const hay = `${siteUrl}\n${site.title || ''}\n${site.platform || ''}\n${ans.topic || ans.question || ''}\n${ans.content || ''}`;
      const common = {
        topic: ans.topic || ans.question || '',
        aiPlatform: ans.platform || ans.aiPlatform || '',
        answerId: ans.id || ans.taskId || '',
        runId: ans.runId || '',
        siteUrl,
        siteTitle: site.title || '',
        articleIndexed: Boolean(site.articleIndexed || site.indexed),
      };
      if (siteNorm && (siteNorm === target.normalizedUrl || siteDomainPath === target.domainPath)) exact.push({ ...common, reason: 'normalized_url_equal' });
      else if ((targetDomain && domainOf(siteNorm) === targetDomain && tokenHit(hay, targetTitleTokens)) || tokenHit(hay, targetTitleTokens) || tokenHit(hay, targetAccountTokens)) {
        weak.push({ ...common, reason: tokenHit(hay, targetTitleTokens) ? 'title_weak_hit' : 'account_weak_hit' });
      }
    }
  }
  const status = exact.length ? 'exact_url_hit' : weak.length ? 'weak_title_account_hit' : 'not_hit';
  const suggestion = status === 'exact_url_hit'
    ? '已被 searchedSites 精确命中：继续观察是否稳定跨平台/跨批次出现'
    : status === 'weak_title_account_hit'
      ? '有标题/账号弱命中但 URL 未精确命中：继续复测，并检查发布页标题、摘要、账号名是否一致'
      : '未命中：等待搜索引擎/AI 抓取后复测，必要时补外链、媒体分发和站内可抓取性';
  return { ...target, status, exactCount: exact.length, weakCount: weak.length, matches: exact.length ? exact : weak.slice(0, 10), suggestion };
}
function mdEscape(s) { return String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 160); }
function renderMd(results, meta) {
  const lines = ['# Published URL 收录命中回查', '', `更新时间：${nowIso()}`, ''];
  lines.push(`- Referer：${meta.referer || '(未配置)'}`);
  lines.push(`- openKey：${meta.openKey || '(empty)'}`);
  if (meta.path) lines.push(`- 接口路径：${meta.path}`);
  lines.push(`- 判定层级：exact_url_hit（URL 精确命中）→ weak_title_account_hit（标题/账号弱命中）→ not_hit（未命中）`);
  lines.push('', '| articleId | publishedUrl | 状态 | 精确 | 弱命中 | 命中平台/问题 | 建议 |', '|---:|---|---|---:|---:|---|---|');
  for (const r of results) {
    const m = r.matches?.[0];
    const hit = m ? `${m.aiPlatform || ''} / ${mdEscape(m.topic)}` : '';
    lines.push(`| ${r.articleId || ''} | ${r.publishedUrl ? `[URL](${r.publishedUrl})` : ''} | ${r.status} | ${r.exactCount} | ${r.weakCount} | ${hit} | ${mdEscape(r.suggestion)} |`);
  }
  return lines.join('\n');
}
function csvEscape(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function renderCsv(results) {
  const fields = ['articleId','publishedUrl','title','account','status','exactCount','weakCount','suggestion'];
  return [fields.join(','), ...results.map(r => fields.map(f => csvEscape(r[f])).join(','))].join('\n') + '\n';
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const targets = readPublishedTargets(args);
  if (!targets.length) throw new Error('没有可检测的 publishedUrl 或发布状态记录。请传 --published-url/--published-urls 或 --publication-json。');
  let answers = readAnswers(args);
  let meta = { openKey: '', referer: '', path: '' };
  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  if (!answers) {
    const cfg = loadGeoConfig();
    if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
    const id = Number(first(args, ['schedule-id','scheduleId','id'], 0));
    const query = { page: first(args, ['page'], 1), limit: first(args, ['limit'], 200) };
    const pathOnly = id ? apiPath(`/v1/scheduled-indexing/${id}/answers`, query) : '/v1/scheduled-indexing/{id}/answers';
    meta = { openKey: mask(cfg.geo.openKey), referer: cfg.geo.referer || '', path: pathOnly };
    if (dryRun) { console.log(JSON.stringify({ dryRun: true, request: meta, targets: targets.map(t => ({ articleId: t.articleId, publishedUrl: t.publishedUrl })) }, null, 2)); return; }
    const fetched = await fetchAnswers(args, cfg);
    answers = fetched.rows; meta.path = fetched.pathOnly;
  }
  const results = targets.map(t => matchOne(t, answers || []));
  const dir = outputDir(args);
  ensureDir(dir);
  const stamp = today();
  const files = {
    md: path.join(dir, `published_url_match_${stamp}.md`),
    csv: path.join(dir, `published_url_match_${stamp}.csv`),
    json: path.join(dir, `published_url_match_${stamp}.json`),
  };
  fs.writeFileSync(files.md, renderMd(results, meta), 'utf8');
  fs.writeFileSync(files.csv, renderCsv(results), 'utf8');
  fs.writeFileSync(files.json, JSON.stringify({ meta, results }, null, 2), 'utf8');
  const jsonOut = first(args, ['json-out','jsonOut']);
  if (jsonOut) { ensureDir(path.dirname(path.resolve(jsonOut))); fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ meta, results, files }, null, 2), 'utf8'); }
  console.log(JSON.stringify({ action: 'published-url-match', targetCount: results.length, exactHits: results.filter(r => r.status === 'exact_url_hit').length, weakHits: results.filter(r => r.status === 'weak_title_account_hit').length, notHits: results.filter(r => r.status === 'not_hit').length, notReady: results.filter(r => ['manual_required','failed','task_mapping_only','pending'].includes(r.status)).length, files }, null, 2));
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
