#!/usr/bin/env node
/**
 * GEO source asset library helper.
 * Creates and updates a long-lived citation source asset table from Scheduled Indexing answers.
 */
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders, mask } = require('../../geo-runtime/scripts/credentials.js');

const CSV_FIELDS = [
  'url','domain','title','platform','source_type','control_level','reusable','needs_strengthening','stable_cited',
  'citation_count','indexed_count','first_seen','last_seen','related_topics','related_ai_platforms','run_ids','answer_ids','next_action','notes'
];
const MEDIA_HINTS = ['news','toutiao','sohu','163.com','qq.com','sina','ifeng','36kr','huxiu','baijiahao','thepaper','jiemian','donews','csdn','zhihu','xiaohongshu','bilibili','douyin','weixin','mp.weixin'];
const PLATFORM_HINTS = ['zhihu.com','baidu.com','baike','wikipedia','wiki','csdn.net','juejin','jianshu','douban','reddit','quora','bilibili.com','xiaohongshu.com','weixin.qq.com'];
const INDUSTRY_HINTS = ['guide','rank','top','review','compare','百科','指南','推荐','排行','榜单','评测','测评','行业','知识','解决方案'];

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
function normalizeDomainPattern(v) {
  const raw = String(v || '').trim().toLowerCase();
  if (!raw) return '';
  try { return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.replace(/^www\./, ''); }
  catch { return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]; }
}
function today() { return new Date().toISOString().slice(0, 10); }
function nowIso() { return new Date().toISOString(); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); return dir; }
function usage() {
  console.log(`Usage:
  node geo-source-assets/scripts/source_assets.js --action init --project-dir 项目_品牌GEO
  node geo-source-assets/scripts/source_assets.js --action import --answers-json answers.json --project-dir 项目_品牌GEO --owned-domains example.com --owned-brands 品牌名
  node geo-source-assets/scripts/source_assets.js --action fetch --schedule-id 123 --project-dir 项目_品牌GEO --limit 200
  node geo-source-assets/scripts/source_assets.js --action next --project-dir 项目_品牌GEO

Actions:
  init     Create empty source asset library files
  import   Import local Scheduled Indexing answers JSON
  fetch    Fetch /v1/scheduled-indexing/{id}/answers then import
  next     Re-render summary and next actions from existing CSV
  summary  Same as next

Options:
  --project-dir <dir>           GEO project root; default current directory
  --output-dir <dir>            Override output directory
  --answers-json <file>         JSON from scheduled_indexing.js --action answers --json-out
  --schedule-id <id>            Fetch answers directly from Scheduled Indexing
  --limit <n>                   Fetch/import page size; default 200
  --platform <ai-platform>      Fetch filter
  --run-id <id>                 Fetch filter
  --owned-domains <a,b>         Domains controlled by the user/brand
  --owned-brands <a,b>          Brand aliases for owned source detection
  --competitor-domains <a,b>    Competitor domains
  --competitor-brands <a,b>     Competitor brand names
  --dry-run                     Preview extraction; do not write files
  --reset                       Ignore existing source_assets.csv and rebuild
  --json-out <file>             Save summary JSON
`);
}
function outputDir(args) {
  const explicit = first(args, ['output-dir','outputDir']);
  if (explicit) return path.resolve(String(explicit));
  const projectDir = path.resolve(String(first(args, ['project-dir','projectDir'], '.')));
  return path.join(projectDir, '07_监测分析', '引用源资产库');
}
function normalizeUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(String(raw).trim());
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.hash = '';
    // Keep query for content identity only when path is too short; otherwise remove noisy trackers.
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|spm|from|share|source|timestamp|ts|token|sign)/i.test(key)) u.searchParams.delete(key);
    if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch { return String(raw).trim(); }
}
function domainOf(raw) {
  try { return new URL(raw).hostname.replace(/^www\./,'').toLowerCase(); } catch { return ''; }
}
function containsAny(text, arr) {
  const s = String(text || '').toLowerCase();
  return arr.some(x => x && s.includes(String(x).toLowerCase()));
}
function domainMatchesAny(domain, patterns) {
  const d = normalizeDomainPattern(domain);
  return patterns.some(p => {
    const n = normalizeDomainPattern(p);
    return n && (d === n || d.endsWith(`.${n}`));
  });
}
function classify(site, ctx, opts) {
  const url = normalizeUrl(site.url || site.href || site.link || '');
  const domain = domainOf(url);
  const title = String(site.title || '').trim();
  const hay = `${url}\n${domain}\n${title}\n${site.platform || ''}`;
  const ownedDomains = opts.ownedDomains || [];
  const ownedBrands = opts.ownedBrands || [];
  const competitorDomains = opts.competitorDomains || [];
  const competitorBrands = opts.competitorBrands || [];
  let source_type = 'unknown_source';
  let control_level = 'unknown';
  let reusable = 'unknown';
  let needs_strengthening = 'yes';
  let notes = [];

  const articleIndexed = Boolean(site.articleIndexed || site.indexed || site.ownedIndexed);
  if (articleIndexed || domainMatchesAny(domain, ownedDomains) || containsAny(hay, ownedBrands)) {
    source_type = 'owned_source'; control_level = 'owned'; reusable = 'yes'; needs_strengthening = articleIndexed ? 'no' : 'yes';
    if (articleIndexed) notes.push('articleIndexed=true');
  } else if (domainMatchesAny(domain, competitorDomains) || containsAny(hay, competitorBrands)) {
    source_type = 'competitor_source'; control_level = 'uncontrollable'; reusable = 'no'; needs_strengthening = 'yes';
  } else if (containsAny(hay, MEDIA_HINTS)) {
    source_type = 'media_source'; control_level = 'influenceable'; reusable = 'yes'; needs_strengthening = 'yes';
  } else if (containsAny(hay, PLATFORM_HINTS)) {
    source_type = 'platform_source'; control_level = 'influenceable'; reusable = 'yes'; needs_strengthening = 'yes';
  } else if (containsAny(hay, INDUSTRY_HINTS) || domain) {
    source_type = 'industry_source'; control_level = 'influenceable'; reusable = 'yes'; needs_strengthening = 'yes';
  }
  if (!url || (!title && !domain)) { source_type = 'irrelevant_source'; control_level = 'unknown'; reusable = 'no'; notes.push('missing url/title'); }

  return { url, domain, title, source_type, control_level, reusable, needs_strengthening, notes };
}
function nextAction(row) {
  const type = row.source_type;
  const stable = row.stable_cited === 'yes';
  const indexed = Number(row.indexed_count || 0);
  const cited = Number(row.citation_count || 0);
  if (type === 'owned_source') {
    if (!stable) return '补强我方页面：更新内容、增加权威说明、补内链，并继续监测是否稳定引用';
    if (indexed < cited) return '复核我方页面命中质量：让页面标题/摘要更贴近高频问题';
    return '保持维护：定期更新内容，作为可复用证据源';
  }
  if (type === 'competitor_source') return '建立替代内容：写对比/替代/榜单文章，并在同类媒体源补我方观点';
  if (type === 'media_source') return '复用媒体渠道：优先在该媒体或同类媒体发布我方内容/案例/观点';
  if (type === 'platform_source') return '补平台露出：在该社区/问答/百科类平台补充我方可信内容';
  if (type === 'industry_source') return '补行业证据：围绕该主题写专业解释页、指南页或榜单页';
  if (type === 'irrelevant_source') return '校准关键词意图：检查问题是否过泛或内容主题是否偏离';
  return '人工复核来源类型和可控性';
}
function extractRowsFromAnswers(answers, opts = {}) {
  const extracted = [];
  for (const ans of answers) {
    const sites = ans.searchedSites || ans.searchedSite || ans.sources || [];
    if (!Array.isArray(sites)) continue;
    for (const site of sites) {
      const c = classify(site, ans, opts);
      if (!c.url && !c.domain) continue;
      extracted.push({
        ...c,
        platform: site.platform || '',
        answerIndexed: Boolean(ans.indexed),
        siteArticleIndexed: Boolean(site.articleIndexed || site.indexed),
        aiPlatform: ans.platform || ans.aiPlatform || '',
        topic: ans.topic || ans.question || '',
        runId: ans.runId || '',
        answerId: ans.id || ans.taskId || '',
        seenAt: ans.createdAt || ans.updatedAt || nowIso(),
      });
    }
  }
  return extracted;
}
function unwrapRows(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.rows)) return json.rows;
  const d = json.data !== undefined ? json.data : json;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.rows)) return d.rows;
  return [];
}
function readAnswersJson(file) {
  const raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  return unwrapRows(raw);
}
function csvEscape(v) {
  const s = Array.isArray(v) ? v.join('|') : String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}
function parseCsv(text) {
  const rows = [];
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return rows;
  const headers = parseCsvLine(lines[0]);
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h,i) => row[h] = cells[i] || '');
    rows.push(row);
  }
  return rows;
}
function parseCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
function loadExisting(dir, reset = false) {
  const file = path.join(dir, 'source_assets.csv');
  if (reset || !fs.existsSync(file)) return [];
  return parseCsv(fs.readFileSync(file, 'utf8'));
}
function uniquePush(value, existing) {
  const set = new Set(splitList(existing));
  if (value) set.add(String(value));
  return [...set].join('|');
}
function mergeAssets(existing, extracted) {
  const map = new Map();
  for (const row of existing) if (row.url) map.set(row.url, { ...row });
  for (const item of extracted) {
    const key = item.url;
    const current = map.get(key) || {
      url: key,
      domain: item.domain,
      title: item.title,
      platform: item.platform,
      source_type: item.source_type,
      control_level: item.control_level,
      reusable: item.reusable,
      needs_strengthening: item.needs_strengthening,
      stable_cited: 'no',
      citation_count: '0',
      indexed_count: '0',
      first_seen: item.seenAt || nowIso(),
      last_seen: item.seenAt || nowIso(),
      related_topics: '',
      related_ai_platforms: '',
      run_ids: '',
      answer_ids: '',
      next_action: '',
      notes: item.notes.join('|'),
    };
    current.domain = current.domain || item.domain;
    current.title = current.title || item.title;
    current.platform = uniquePush(item.platform, current.platform);
    // Upgrade classification when stronger evidence appears.
    if (item.source_type === 'owned_source' || current.source_type === 'unknown_source') {
      current.source_type = item.source_type;
      current.control_level = item.control_level;
      current.reusable = item.reusable;
    }
    if (item.source_type === 'competitor_source' && current.source_type !== 'owned_source') {
      current.source_type = item.source_type;
      current.control_level = item.control_level;
      current.reusable = item.reusable;
    }
    current.citation_count = String(Number(current.citation_count || 0) + 1);
    if (item.siteArticleIndexed || (item.source_type === 'owned_source' && item.answerIndexed)) current.indexed_count = String(Number(current.indexed_count || 0) + 1);
    current.last_seen = item.seenAt || nowIso();
    current.related_topics = uniquePush(item.topic, current.related_topics);
    current.related_ai_platforms = uniquePush(item.aiPlatform, current.related_ai_platforms);
    current.run_ids = uniquePush(item.runId, current.run_ids);
    current.answer_ids = uniquePush(item.answerId, current.answer_ids);
    current.notes = uniquePush(item.notes.join('|'), current.notes);
    const multiPlatform = splitList(current.related_ai_platforms).length >= 2;
    const multiRun = splitList(current.run_ids).length >= 2;
    current.stable_cited = Number(current.citation_count || 0) >= 2 || multiPlatform || multiRun ? 'yes' : 'no';
    current.needs_strengthening = current.source_type === 'owned_source' && current.stable_cited === 'yes' && Number(current.indexed_count || 0) > 0 ? 'no' : 'yes';
    current.next_action = nextAction(current);
    map.set(key, current);
  }
  return [...map.values()].sort((a,b) => Number(b.citation_count||0) - Number(a.citation_count||0) || String(a.domain).localeCompare(String(b.domain)));
}
function writeCsv(file, rows) {
  const lines = [CSV_FIELDS.join(',')];
  for (const r of rows) lines.push(CSV_FIELDS.map(f => csvEscape(r[f])).join(','));
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}
function groupCounts(rows, field) {
  const out = {};
  for (const r of rows) out[r[field] || ''] = (out[r[field] || ''] || 0) + 1;
  return out;
}
function renderAssetsMd(rows) {
  const lines = ['# GEO 引用源资产库', '', `更新时间：${nowIso()}`, '', '## 摘要', ''];
  const counts = groupCounts(rows, 'source_type');
  for (const [k,v] of Object.entries(counts)) lines.push(`- ${k}: ${v}`);
  lines.push('', '## 资产明细', '', '| 类型 | 域名 | 标题 | 引用次数 | 命中次数 | 稳定引用 | 可控性 | 下一步 |', '|---|---|---|---:|---:|---|---|---|');
  for (const r of rows) {
    lines.push(`| ${r.source_type} | ${r.domain} | ${String(r.title||'').replace(/\|/g,'\\|').slice(0,80)} | ${r.citation_count} | ${r.indexed_count} | ${r.stable_cited} | ${r.control_level} | ${String(r.next_action||'').replace(/\|/g,'\\|')} |`);
  }
  return lines.join('\n');
}
function renderActionsMd(rows) {
  const lines = ['# 信源补强建议', '', `更新时间：${nowIso()}`, ''];
  const priority = rows.filter(r => r.needs_strengthening === 'yes').sort((a,b) => {
    const score = x => (x.source_type === 'competitor_source' ? 100 : x.source_type === 'owned_source' ? 80 : 50) + Number(x.citation_count||0);
    return score(b) - score(a);
  });
  if (!priority.length) lines.push('当前没有需要补强的引用源。');
  for (const r of priority) {
    lines.push(`## ${r.domain || r.url}`);
    lines.push(`- 类型：${r.source_type}`);
    lines.push(`- 标题：${r.title || '(无标题)'}`);
    lines.push(`- 引用次数：${r.citation_count}；命中次数：${r.indexed_count}；稳定引用：${r.stable_cited}`);
    lines.push(`- 关联问题：${r.related_topics || ''}`);
    lines.push(`- 下一步：${r.next_action}`);
    lines.push(`- URL：${r.url}`);
    lines.push('');
  }
  return lines.join('\n');
}
function renderSummaryMd(rows) {
  const counts = groupCounts(rows, 'source_type');
  const owned = rows.filter(r => r.source_type === 'owned_source');
  const comp = rows.filter(r => r.source_type === 'competitor_source');
  const stableOwned = owned.filter(r => r.stable_cited === 'yes');
  const lines = ['# 引用源资产摘要', '', `更新时间：${nowIso()}`, ''];
  lines.push(`- 总引用源：${rows.length}`);
  lines.push(`- 我方内容源：${owned.length}`);
  lines.push(`- 稳定我方源：${stableOwned.length}`);
  lines.push(`- 竞品内容源：${comp.length}`);
  lines.push(`- 需补强来源：${rows.filter(r => r.needs_strengthening === 'yes').length}`);
  lines.push('', '## 类型分布');
  for (const [k,v] of Object.entries(counts)) lines.push(`- ${k}: ${v}`);
  lines.push('', '## Top 引用域名');
  const byDomain = {};
  for (const r of rows) byDomain[r.domain] = (byDomain[r.domain] || 0) + Number(r.citation_count || 0);
  Object.entries(byDomain).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([d,c]) => lines.push(`- ${d}: ${c}`));
  return lines.join('\n');
}
function writeReports(dir, rows, dryRun = false) {
  const files = {
    csv: path.join(dir, 'source_assets.csv'),
    md: path.join(dir, 'source_assets.md'),
    actions: path.join(dir, 'source_gap_actions.md'),
    summary: path.join(dir, 'source_asset_summary.md'),
  };
  if (!dryRun) {
    ensureDir(dir);
    writeCsv(files.csv, rows);
    fs.writeFileSync(files.md, renderAssetsMd(rows), 'utf8');
    fs.writeFileSync(files.actions, renderActionsMd(rows), 'utf8');
    fs.writeFileSync(files.summary, renderSummaryMd(rows), 'utf8');
  }
  return files;
}
async function fetchAnswers(args) {
  const cfg = loadGeoConfig();
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
  const id = Number(first(args, ['schedule-id','scheduleId','id'], 0));
  if (!id) throw new Error('fetch 需要 --schedule-id。');
  const qs = new URLSearchParams({ page: String(first(args, ['page'], 1)), limit: String(first(args, ['limit'], 200)) });
  for (const [arg, key] of [['platform','platform'],['topic-id','topicId'],['topicId','topicId'],['run-id','runId'],['runId','runId'],['task-id','taskId'],['taskId','taskId'],['start-date','startDate'],['startDate','startDate'],['end-date','endDate'],['endDate','endDate']]) {
    const v = first(args, [arg]); if (v !== undefined && v !== true) qs.set(key, String(v));
  }
  const base = String(cfg.geo.baseUrl || '').replace(/\/$/, '');
  const res = await fetch(`${base}/v1/scheduled-indexing/${id}/answers?${qs}`, { headers: { ...geoHeaders(cfg), Accept: 'application/json' } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) {
    const msg = body && typeof body === 'object' ? (body.message || body.msg || JSON.stringify(body).slice(0,500)) : String(body).slice(0,500);
    throw new Error(`GEO API GET /v1/scheduled-indexing/{id}/answers failed: HTTP ${res.status}; ${msg}`);
  }
  return { rows: unwrapRows(body), request: { path: `/v1/scheduled-indexing/${id}/answers?${qs}`, openKey: mask(cfg.geo.openKey), referer: cfg.geo.referer || '' } };
}
function summaryJson(rows, files, extractedCount, dryRun) {
  return {
    dryRun,
    extractedCount,
    assetCount: rows.length,
    typeCounts: groupCounts(rows, 'source_type'),
    needsStrengthening: rows.filter(r => r.needs_strengthening === 'yes').length,
    stableOwnedSources: rows.filter(r => r.source_type === 'owned_source' && r.stable_cited === 'yes').length,
    files,
  };
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const action = String(first(args, ['action'], args._[0] || 'summary'));
  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  const dir = outputDir(args);
  const opts = {
    ownedDomains: splitList(first(args, ['owned-domains','ownedDomains'], '')),
    ownedBrands: splitList(first(args, ['owned-brands','ownedBrands','brand','brands'], '')),
    competitorDomains: splitList(first(args, ['competitor-domains','competitorDomains'], '')),
    competitorBrands: splitList(first(args, ['competitor-brands','competitorBrands'], '')),
  };
  let extracted = [];
  if (action === 'init') {
    const rows = loadExisting(dir, Boolean(args.reset));
    const files = writeReports(dir, rows, dryRun);
    const result = summaryJson(rows, files, 0, dryRun);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (action === 'import') {
    const file = first(args, ['answers-json','answersJson','file']);
    if (!file) throw new Error('import 需要 --answers-json。');
    extracted = extractRowsFromAnswers(readAnswersJson(file), opts);
  } else if (action === 'fetch') {
    const fetched = await fetchAnswers(args);
    extracted = extractRowsFromAnswers(fetched.rows, opts);
  } else if (action === 'next' || action === 'summary') {
    extracted = [];
  } else {
    throw new Error(`未知 action：${action}`);
  }
  const existing = loadExisting(dir, Boolean(args.reset));
  const rows = mergeAssets(existing, extracted);
  const files = writeReports(dir, rows, dryRun);
  const result = summaryJson(rows, files, extracted.length, dryRun);
  const jsonOut = first(args, ['json-out','jsonOut']);
  if (jsonOut) { ensureDir(path.dirname(path.resolve(jsonOut))); fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(result, null, 2), 'utf8'); }
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
