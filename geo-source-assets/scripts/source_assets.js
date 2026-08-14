#!/usr/bin/env node
/**
 * GEO source asset library helper.
 * Creates and updates a long-lived citation source asset table from Scheduled Indexing answers.
 */
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders, mask } = require('../../geo-runtime/scripts/credentials.js');
const { unwrapRows } = require('../../geo-runtime/scripts/json_helpers.js');

const CSV_FIELDS = [
  'schedule_id','schedule_name','task_type','ai_platform','url','domain','title','platform','source_type','control_level','reusable','needs_strengthening','stable_cited',
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
  node geo-source-assets/scripts/source_assets.js --action fetch --schedule-ids 123,456 --project-dir 项目_品牌GEO --limit 200
  node geo-source-assets/scripts/source_assets.js --action next --project-dir 项目_品牌GEO

Actions:
  init     Create empty source asset library files
  import   Import local Scheduled Indexing answers JSON
  list     List Scheduled Indexing tasks for selection
  fetch    Fetch one or more Scheduled Indexing tasks and generate isolated reports
  next     Re-render summary and next actions from existing CSV
  summary  Same as next

Options:
  --project-dir <dir>           GEO project root; default current directory
  --output-dir <dir>            Override output directory
  --answers-json <file>         JSON from scheduled_indexing.js --action answers --json-out
  --schedule-id <id>            Fetch answers directly from Scheduled Indexing
  --schedule-ids <a,b>          Fetch multiple tasks; each task gets an isolated report
  --schedule-name <name>        Task name for local JSON import
  --task-type <type>            brand / product / recommendation / comparison / custom
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
function safeName(value, fallback = '未命名任务') {
  const text = String(value || fallback).trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  return text.slice(0, 80) || fallback;
}
function taskOutputDir(baseDir, meta) {
  return path.join(baseDir, `任务_${meta.scheduleId}_${safeName(meta.scheduleName)}`);
}
function inferTaskType(name, answers = []) {
  const taskName = String(name || '');
  if (/推荐|哪家好|排行|榜单/.test(taskName)) return 'recommendation';
  if (/对比|比较|竞品/.test(taskName)) return 'comparison';
  if (/产品|设备|型号/.test(taskName)) return 'product';
  if (/品牌|认知/.test(taskName)) return 'brand';
  const questions = answers.map(a => String(a.topic || a.question || ''));
  const scores = {
    recommendation: questions.filter(q => /推荐|哪家好|排行榜|排名|选择谁|厂家/.test(q)).length,
    comparison: questions.filter(q => /对比|区别|哪个好|vs/i.test(q)).length,
    product: questions.filter(q => /产品|设备|型号|功效|适合/.test(q)).length,
    brand: questions.filter(q => /品牌|是谁|靠谱吗|怎么样|公司/.test(q)).length,
  };
  const [type, score] = Object.entries(scores).sort((a,b) => b[1] - a[1])[0];
  if (score > 0) return type;
  return 'custom';
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

  const articleIndexed = Boolean(site.articleIndexed || site.article_indexed || site.indexed || site.ownedIndexed);
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
function extractRowsFromAnswers(answers, opts = {}, meta = {}) {
  const extracted = [];
  for (const ans of answers) {
    const sites = ans.searchedSites || ans.searchedSite || ans.sources || [];
    if (!Array.isArray(sites)) continue;
    for (const site of sites) {
      const c = classify(site, ans, opts);
      if (!c.url && !c.domain) continue;
      extracted.push({
        ...c,
        scheduleId: String(meta.scheduleId || ''),
        scheduleName: String(meta.scheduleName || ''),
        taskType: String(meta.taskType || ''),
        platform: site.platform || '',
        answerIndexed: Boolean(ans.indexed),
        siteArticleIndexed: Boolean(site.articleIndexed || site.article_indexed || site.indexed),
        aiPlatform: ans.platform || ans.aiPlatform || ans.ai_platform || site.ai_platform || '',
        topic: ans.topic || ans.question || '',
        runId: ans.runId || ans.run_id || '',
        answerId: ans.id || ans.answer_id || ans.taskId || ans.task_id || '',
        seenAt: ans.createdAt || ans.created_at || ans.updatedAt || ans.updated_at || nowIso(),
      });
    }
  }
  return extracted;
}
function readAnswersJson(file) {
  const raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (Array.isArray(raw.answers)) return raw.answers;
  if (raw.data && Array.isArray(raw.data.answers)) return raw.data.answers;
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
  const rowKey = row => `${row.schedule_id || ''}|${row.ai_platform || ''}|${row.url || ''}`;
  for (const row of existing) if (row.url) map.set(rowKey(row), { ...row });
  for (const item of extracted) {
    const key = `${item.scheduleId || ''}|${item.aiPlatform || ''}|${item.url}`;
    const current = map.get(key) || {
      schedule_id: item.scheduleId,
      schedule_name: item.scheduleName,
      task_type: item.taskType,
      ai_platform: item.aiPlatform,
      url: item.url,
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
    const multiRun = splitList(current.run_ids).length >= 2;
    current.stable_cited = Number(current.citation_count || 0) >= 2 || multiRun ? 'yes' : 'no';
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
  lines.push('', '## 资产明细', '', '| AI平台 | 类型 | 域名 | 标题 | 引用次数 | 稳定引用 | 可控性 |', '|---|---|---|---|---:|---|---|');
  for (const r of rows) {
    lines.push(`| ${r.ai_platform || '未知'} | ${r.source_type} | ${r.domain} | ${String(r.title||'').replace(/\|/g,'\\|').slice(0,80)} | ${r.citation_count} | ${r.stable_cited} | ${r.control_level} |`);
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
    lines.push(`- AI平台：${r.ai_platform || '未知'}`);
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
  lines.push('', '## 按 AI 平台');
  const platforms = groupCounts(rows, 'ai_platform');
  for (const [platform, count] of Object.entries(platforms)) lines.push(`- ${platform || '未知'}: ${count} 个引用页面`);
  return lines.join('\n');
}
function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}
function renderTaskHtml(rows, meta) {
  const byPlatform = {};
  for (const row of rows) (byPlatform[row.ai_platform || '未知平台'] ||= []).push(row);
  const sections = Object.entries(byPlatform).map(([platform, items]) => `
    <section><h2>${htmlEscape(platform)}</h2><p>${items.length} 个引用页面</p>
    <table><thead><tr><th>来源标题</th><th>域名</th><th>类型</th><th>引用次数</th><th>关联问题</th></tr></thead><tbody>
    ${items.map(r => `<tr><td><a href="${htmlEscape(r.url)}">${htmlEscape(r.title || r.url)}</a></td><td>${htmlEscape(r.domain)}</td><td>${htmlEscape(r.source_type)}</td><td>${htmlEscape(r.citation_count)}</td><td>${htmlEscape(r.related_topics)}</td></tr>`).join('')}
    </tbody></table></section>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(meta.scheduleName)}信源报告</title><style>
  body{margin:0;background:#f5f7fa;color:#172033;font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1180px;margin:auto;padding:32px 20px 64px}header{background:#15263c;color:white;padding:36px;border-radius:8px}h1{margin:0 0 8px;font-size:30px}header p{margin:4px 0;color:#d6e2ef}section{margin-top:24px;background:white;padding:24px;border:1px solid #dde4ec;border-radius:8px;overflow:auto}h2{margin-top:0}table{width:100%;border-collapse:collapse;min-width:820px}th,td{text-align:left;padding:12px;border-bottom:1px solid #e7ecf1;vertical-align:top}th{background:#f2f5f8}a{color:#1769aa;word-break:break-all}</style></head><body><main>
  <header><h1>${htmlEscape(meta.scheduleName || `监测任务 ${meta.scheduleId}`)}信源报告</h1><p>任务ID：${htmlEscape(meta.scheduleId)}　类型：${htmlEscape(meta.taskType)}　引用页面：${rows.length}</p><p>各 AI 平台独立统计；一个平台引用过，不代表其他平台会引用。</p></header>${sections || '<section><p>该任务没有提取到引用来源。</p></section>'}</main></body></html>`;
}
function writeReports(dir, rows, dryRun = false) {
  const files = {
    csv: path.join(dir, 'source_assets.csv'),
    md: path.join(dir, 'source_assets.md'),
    actions: path.join(dir, 'source_gap_actions.md'),
    summary: path.join(dir, 'source_asset_summary.md'),
    html: path.join(dir, 'task_source_report.html'),
  };
  if (!dryRun) {
    ensureDir(dir);
    writeCsv(files.csv, rows);
    fs.writeFileSync(files.md, renderAssetsMd(rows), 'utf8');
    fs.writeFileSync(files.actions, renderActionsMd(rows), 'utf8');
    fs.writeFileSync(files.summary, renderSummaryMd(rows), 'utf8');
    const first = rows[0] || {};
    fs.writeFileSync(files.html, renderTaskHtml(rows, { scheduleId: first.schedule_id || '', scheduleName: first.schedule_name || '', taskType: first.task_type || '' }), 'utf8');
  }
  return files;
}
async function requestGeo(cfg, endpoint, query = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  const base = String(cfg.geo.baseUrl || '').replace(/\/$/, '');
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await fetch(`${base}${endpoint}${suffix}`, { headers: { ...geoHeaders(cfg), Accept: 'application/json' } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) {
    const msg = body && typeof body === 'object' ? (body.message || body.msg || JSON.stringify(body).slice(0,500)) : String(body).slice(0,500);
    throw new Error(`GEO API GET ${endpoint} failed: HTTP ${res.status}; ${msg}`);
  }
  return body;
}
async function fetchAnswers(args, scheduleId) {
  const cfg = loadGeoConfig();
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
  const id = Number(scheduleId || first(args, ['schedule-id','scheduleId','id'], 0));
  if (!id) throw new Error('fetch 需要 --schedule-id。');
  const qs = new URLSearchParams({ page: String(first(args, ['page'], 1)), limit: String(first(args, ['limit'], 200)) });
  for (const [arg, key] of [['platform','platform'],['topic-id','topicId'],['topicId','topicId'],['run-id','runId'],['runId','runId'],['task-id','taskId'],['taskId','taskId'],['start-date','startDate'],['startDate','startDate'],['end-date','endDate'],['endDate','endDate']]) {
    const v = first(args, [arg]); if (v !== undefined && v !== true) qs.set(key, String(v));
  }
  const [body, detail] = await Promise.all([
    requestGeo(cfg, `/v1/scheduled-indexing/${id}/answers`, Object.fromEntries(qs)),
    requestGeo(cfg, `/v1/scheduled-indexing/${id}`),
  ]);
  const plan = detail?.data?.schedule || detail?.schedule || detail?.data || detail || {};
  return { rows: unwrapRows(body), meta: { scheduleId: id, scheduleName: plan.name || `监测任务${id}` }, request: { path: `/v1/scheduled-indexing/${id}/answers?${qs}`, openKey: mask(cfg.geo.openKey), referer: cfg.geo.referer || '' } };
}
async function listSchedules(args) {
  const cfg = loadGeoConfig();
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey。');
  const body = await requestGeo(cfg, '/v1/scheduled-indexing', { companyId: cfg.defaults?.companyId || undefined, page: 1, limit: first(args, ['limit'], 50) });
  return unwrapRows(body).map(row => ({ id: row.id, name: row.name || '', platforms: row.platforms || [], enabled: row.enabled, updatedAt: row.updatedAt || row.createdAt || '' }));
}
function renderMultiTaskSummary(results) {
  const lines = ['# 多监测任务信源汇总', '', `生成时间：${nowIso()}`, '', '| 任务ID | 任务名称 | 类型 | 引用页面 | AI平台 | 报告 |', '|---:|---|---|---:|---|---|'];
  for (const result of results) lines.push(`| ${result.meta.scheduleId} | ${result.meta.scheduleName} | ${result.meta.taskType} | ${result.rows.length} | ${[...new Set(result.rows.map(r => r.ai_platform).filter(Boolean))].join('、')} | ${result.files.html} |`);
  lines.push('', '> 各任务和各 AI 平台独立统计。本汇总只用于比较，不改变单任务报告中的证据归属。');
  return lines.join('\n');
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
  if (action === 'list') {
    console.log(JSON.stringify({ tasks: await listSchedules(args) }, null, 2));
    return;
  }
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
    const answers = readAnswersJson(file);
    const meta = { scheduleId: first(args, ['schedule-id','scheduleId'], ''), scheduleName: first(args, ['schedule-name','scheduleName'], '本地导入任务'), taskType: first(args, ['task-type','taskType'], '') };
    meta.taskType = meta.taskType || inferTaskType(meta.scheduleName, answers);
    extracted = extractRowsFromAnswers(answers, opts, meta);
  } else if (action === 'fetch') {
    const scheduleIds = splitList(first(args, ['schedule-ids','scheduleIds'], first(args, ['schedule-id','scheduleId','id'], '')));
    if (!scheduleIds.length) throw new Error('fetch 需要 --schedule-id 或 --schedule-ids。');
    const baseDir = outputDir(args);
    const results = [];
    for (const scheduleId of scheduleIds) {
      const fetched = await fetchAnswers(args, scheduleId);
      fetched.meta.taskType = first(args, ['task-type','taskType'], '') || inferTaskType(fetched.meta.scheduleName, fetched.rows);
      const taskRows = mergeAssets([], extractRowsFromAnswers(fetched.rows, opts, fetched.meta));
      const taskDir = taskOutputDir(baseDir, fetched.meta);
      const files = writeReports(taskDir, taskRows, dryRun);
      results.push({ meta: fetched.meta, rows: taskRows, files });
    }
    if (!dryRun) {
      ensureDir(baseDir);
      fs.writeFileSync(path.join(baseDir, 'multi_task_source_summary.md'), renderMultiTaskSummary(results), 'utf8');
    }
    console.log(JSON.stringify({ dryRun, taskCount: results.length, tasks: results.map(r => ({ ...r.meta, assetCount: r.rows.length, files: r.files })) }, null, 2));
    return;
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
