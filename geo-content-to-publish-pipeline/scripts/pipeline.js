#!/usr/bin/env node
/**
 * GEO content-to-publish pipeline (Node/no-Python).
 *
 * Orchestrates deterministic stages around LLM-created GEO content:
 * plan -> cover -> upload -> article approval -> account query -> publish dry-run -> optional publish create.
 * It never prints Base URL or openKey. Real publication requires --create-publish-task --confirm.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { loadGeoConfig, headers: geoHeaders, mask } = require('../../geo-runtime/scripts/credentials.js');

const SUITE_DIR = path.resolve(__dirname, '../..');
const PIPELINE_NAME = 'geo-content-to-publish-pipeline';
const SUPPORTED_PLATFORMS = new Set(['toutiao','sohu_news','bilibili','zhihu','csdn','wechat','xiaohongshu','douyin']);

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
function first(args, names, fallback = undefined) {
  for (const n of names) if (args[n] !== undefined && args[n] !== '') return args[n];
  return fallback;
}
function usage() {
  console.log(`Usage:
  node geo-content-to-publish-pipeline/scripts/pipeline.js --project-dir 项目目录 --title-plan 标题方案.md --count 3 --dry-run
  node geo-content-to-publish-pipeline/scripts/pipeline.js --project-dir 项目目录 --article-dir articles --platforms sohu_news,wechat --generate-cover --approve --execute
  node geo-content-to-publish-pipeline/scripts/pipeline.js --project-dir 项目目录 --state pipeline-state.json --create-publish-task --confirm

Options:
  --project-dir <dir>           GEO project root; default current directory
  --knowledge-dir <dir>         Knowledge base directory for report context
  --keyword-plan <file>         Keyword plan Markdown/text
  --title-plan <file>           Title plan Markdown/text; script extracts Top N candidates
  --article-dir <dir>           Directory of audited Markdown articles
  --articles <a.md,b.md>        Explicit Markdown article files
  --count <n>                   Number of candidates/articles to process; default 3
  --platforms <a,b>             Preferred publish platforms: sohu_news,wechat,zhihu,...
  --cover-url <url>             Reuse an existing public cover URL for articles without one
  --publish-time <time>         Optional publish time: YYYY-MM-DD HH:MM:SS
  --generate-cover              Generate cover through GEO text-to-img using --oss-mode local
  --approve                     After upload, approve articles through /v1/article/status
  --execute                     Allow cover generation/article upload/article approval writes
  --dry-run                     Preview only; default when --execute is not set
  --create-publish-task         Create real publication task from state/current inputs; requires --confirm
  --confirm                     Required with --create-publish-task
  --account-ids <ids>           Explicit publication account ids, comma-separated
  --article-ids <ids>           Existing article ids, comma-separated
  --state <file>                Load previous pipeline-state.json for publish creation or resume
  --output-dir <dir>            Custom run directory
  --json-out <file>             Save final summary JSON

Safety:
  - Base URL and real openKey are never printed.
  - Publication task creation requires --create-publish-task --confirm.
`);
}
function nowStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function today() { return new Date().toISOString().slice(0, 10); }
function splitList(v) { return String(v || '').split(/[,，\n]/).map(s => s.trim()).filter(Boolean); }
function asIds(v) { return splitList(v).map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); return dir; }
function readText(file) { return fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, ''); }
function existsFile(file) { return file && fs.existsSync(path.resolve(file)) && fs.statSync(path.resolve(file)).isFile(); }
function existsDir(dir) { return dir && fs.existsSync(path.resolve(dir)) && fs.statSync(path.resolve(dir)).isDirectory(); }
function safeSlug(s, fallback = 'item') {
  const raw = String(s || '').replace(/[#*_`~<>:"/\\|?！!？,，。\s]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return raw || fallback;
}
function mdEscape(s) { return String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>'); }
function rel(p, root = process.cwd()) { try { return path.relative(root, p) || '.'; } catch { return String(p || ''); } }
function redactForLog(text) {
  return String(text || '')
    .replace(/https?:\/\/[^\s"')]+/gi, m => {
      try { const u = new URL(m); return `${u.pathname}${u.search ? '?…' : ''}`; } catch { return '[url-redacted]'; }
    })
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ****');
}
function extractTitleFromMarkdown(file) {
  const text = readText(file);
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) {
    const m = fm[1].match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
    if (m) return m[1].trim();
  }
  const h1 = text.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return path.basename(file, path.extname(file));
}
function extractFrontmatter(file) {
  const text = readText(file);
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if (m) fields[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return fields;
}
function discoverArticles(args, projectDir, count) {
  const explicit = splitList(first(args, ['articles','files'], '')).map(p => path.resolve(p));
  let files = explicit.filter(existsFile);
  const articleDir = first(args, ['article-dir','articleDir']);
  if (!files.length && articleDir && existsDir(articleDir)) {
    files = fs.readdirSync(path.resolve(articleDir))
      .filter(f => /\.md$/i.test(f) && !/^\./.test(f))
      .map(f => path.resolve(articleDir, f));
  }
  if (!files.length) {
    const standard = path.join(projectDir, '04_内容创作');
    if (existsDir(standard)) {
      const found = [];
      const walk = dir => {
        for (const f of fs.readdirSync(dir)) {
          const p = path.join(dir, f);
          const st = fs.statSync(p);
          if (st.isDirectory()) walk(p);
          else if (/\.md$/i.test(f)) found.push(p);
        }
      };
      walk(standard);
      files = found.sort((a,b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    }
  }
  return files.slice(0, count).map((file, index) => {
    const fm = extractFrontmatter(file);
    const candidateCover = fm.coverImageUrl || fm.coverUrl || fm.cover || '';
    const coverUrl = /^https?:\/\//i.test(candidateCover) ? candidateCover : '';
    return { index: index + 1, file, title: extractTitleFromMarkdown(file), ...(coverUrl ? { coverUrl, coverSource: 'markdown-frontmatter' } : {}) };
  });
}
function extractCandidatesFromFile(file, kind, limit) {
  if (!existsFile(file)) return [];
  const text = readText(file);
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const s = line.trim();
    if (!s || /^[-|: ]+$/.test(s)) continue;
    if (/^\|/.test(s) && /\|$/.test(s)) {
      const cells = s.split('|').map(x => x.trim()).filter(Boolean);
      for (const c of cells) {
        if (/标题|关键词|问题|选题|推荐|TOP|排行|榜单|\?|？/.test(c) && !/^(:?-+:?)$/.test(c)) rows.push(c.replace(/<br\s*\/?>/gi, ' / '));
      }
      continue;
    }
    const m = s.match(/^(?:#{1,4}\s+|[-*+]\s+|\d+[.)、]\s*|Q\d*[:：]\s*|问题\d*[:：]\s*)(.+)$/i);
    if (m) rows.push(m[1].trim());
    else if ((kind === 'question' && /[?？]$/.test(s)) || /2026|TOP|排行|榜单|推荐/.test(s)) rows.push(s);
  }
  const cleaned = [];
  const seen = new Set();
  for (const r of rows) {
    const v = r.replace(/^['"“”]+|['"“”]+$/g, '').replace(/\s+/g, ' ').trim();
    if (!v || v.length < 4 || seen.has(v)) continue;
    if (/^(标题方案|关键词方案|问题列表|选题方案|目录|说明|背景|摘要|总览)$/i.test(v)) continue;
    if (/^(标题|关键词|问题|选题)$/.test(v.replace(/[：:]/g, ''))) continue;
    seen.add(v); cleaned.push(v);
    if (cleaned.length >= limit) break;
  }
  return cleaned.map((text, i) => ({ index: i + 1, text, source: path.resolve(file), kind }));
}
function buildRunDir(args, projectDir) {
  const explicit = first(args, ['output-dir','outputDir','run-dir','runDir']);
  if (explicit) return path.resolve(explicit);
  return path.join(projectDir, '06_发布记录', 'pipeline-runs', nowStamp());
}
function commandFor(scriptRel, parts) {
  const q = v => /[\s"'()（）&;]/.test(String(v)) ? JSON.stringify(String(v)) : String(v);
  return ['node', scriptRel, ...parts.filter(v => v !== undefined && v !== null && v !== '').map(q)].join(' ');
}
function spawnNode(scriptAbs, args, opts = {}) {
  const res = cp.spawnSync(process.execPath, [scriptAbs, ...args], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...opts });
  if (res.error) throw res.error;
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  if (res.status) {
    const msg = redactForLog(`${stderr}\n${stdout}`).trim().slice(0, 4000);
    throw new Error(`${path.basename(scriptAbs)} exit ${res.status}: ${msg}`);
  }
  return { stdout, stderr };
}
function parseJsonFromStdout(stdout, fileIfAny) {
  if (fileIfAny && existsFile(fileIfAny)) return JSON.parse(readText(fileIfAny));
  const s = String(stdout || '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(s.slice(start, end + 1));
  return null;
}
function loadState(stateFile) {
  if (!stateFile) return null;
  const file = path.resolve(stateFile);
  if (!existsFile(file)) throw new Error(`state 文件不存在：${stateFile}`);
  const state = JSON.parse(readText(file));
  state.__stateFile = file;
  return state;
}
function saveJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function saveText(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, 'utf8'); }
function normalizeRows(body) {
  const d = body && body.data !== undefined ? body.data : body;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.rows)) return d.rows;
  return [];
}
async function requestJson(cfg, apiPath, options = {}) {
  const base = String(cfg.geo.baseUrl || '').replace(/\/$/, '');
  const url = `${base}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
  const h = { ...geoHeaders(cfg), Accept: 'application/json', ...(options.headers || {}) };
  if (options.body && !h['Content-Type']) h['Content-Type'] = 'application/json; charset=utf-8';
  const res = await fetch(url, { method: options.method || 'GET', headers: h, body: options.body });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) {
    const msg = body && typeof body === 'object' ? (body.message || body.msg || JSON.stringify(body).slice(0, 500)) : String(body).slice(0, 500);
    throw new Error(`GEO API ${options.method || 'GET'} ${apiPath} failed: HTTP ${res.status}; ${msg}`);
  }
  return body;
}
async function queryAccounts(cfg, companyId, platforms) {
  const qs = new URLSearchParams({ page: '1', limit: '100', companyId: String(companyId) });
  const body = await requestJson(cfg, `/v1/publication-account?${qs.toString()}`);
  let rows = normalizeRows(body).map(a => {
    const max = Number(a.maxPostOneDay ?? a.maxPostOneDayCount ?? 0);
    const used = Number(a.publishedTodayCount ?? a.todayCount ?? 0);
    return { ...a, remainDaily: Number.isFinite(max - used) ? max - used : null };
  });
  if (platforms.length) rows = rows.filter(a => platforms.includes(String(a.platform)));
  return rows;
}
async function listArticles(cfg, { companyId, productId, limit = 50 }) {
  const qs = new URLSearchParams({ page: '1', limit: String(limit), companyId: String(companyId), productId: String(productId) });
  const body = await requestJson(cfg, `/v1/article?${qs.toString()}`);
  return normalizeRows(body);
}
async function listTasks(cfg, { companyId, productId, limit = 50 }) {
  const qs = new URLSearchParams({ page: '1', limit: String(limit), companyId: String(companyId), productId: String(productId) });
  const body = await requestJson(cfg, `/v1/publication-task?${qs.toString()}`);
  return normalizeRows(body);
}
function buildPublishPlan({ taskName, articleIds, platforms, accounts, accountIds, publishTime, productId, companyId, autoSelect = true }) {
  const selectedByPlatform = new Map();
  const explicitIds = new Set(accountIds || []);
  for (const p of platforms) {
    let candidates = accounts.filter(a => String(a.platform) === p && (a.status === undefined || Number(a.status) === 1));
    if (explicitIds.size) candidates = candidates.filter(a => explicitIds.has(Number(a.id)));
    candidates.sort((a,b) => Number(b.remainDaily ?? 0) - Number(a.remainDaily ?? 0));
    if (candidates[0]) selectedByPlatform.set(p, candidates[0]);
  }
  const missingPlatforms = platforms.filter(p => !selectedByPlatform.has(p));
  const articles = articleIds.map(articleId => ({
    articleId,
    platforms: Array.from(selectedByPlatform.entries()).map(([platform, account]) => ({
      platform,
      publishAccountIds: [Number(account.id)],
      publishTime: publishTime || null
    }))
  }));
  const payload = { name: taskName, aigc: false, productId: Number(productId), articles, companyId: Number(companyId) };
  return { payload, selectedAccounts: Array.from(selectedByPlatform.values()), missingPlatforms, autoSelect };
}
function renderPlanMd(state) {
  const projectRoot = state.projectDir || process.cwd();
  const lines = [];
  lines.push(`# GEO 内容到发布流水线计划`);
  lines.push('');
  lines.push(`- 运行时间：${state.createdAt}`);
  lines.push(`- Referer：${state.config?.referer || '(未配置)'}`);
  lines.push(`- openKey：${state.config?.openKeyMasked || '(empty)'}`);
  lines.push(`- companyId/productId：${state.companyId || 0} / ${state.productId || 0}`);
  lines.push(`- 模式：${state.execute ? 'execute（发布仍需确认）' : 'dry-run'}`);
  if (state.stageTimings && Object.keys(state.stageTimings).length) {
    lines.push(`- 阶段耗时：${Object.entries(state.stageTimings).map(([name, t]) => `${name} ${t.elapsedSeconds}s`).join('；')}`);
  }
  lines.push('');
  if (state.candidates?.length) {
    lines.push(`## Top ${state.candidates.length} 选题/问题`);
    lines.push('| # | 类型 | 内容 | 来源 |');
    lines.push('|---|---|---|---|');
    for (const c of state.candidates) lines.push(`| ${c.index} | ${c.kind || ''} | ${mdEscape(c.text)} | ${mdEscape(c.source ? rel(c.source, projectRoot) : '')} |`);
    lines.push('');
  }
  if (state.articles?.length) {
    lines.push('## 文章资产');
    lines.push('| # | 标题 | 本地文件 | coverUrl | articleId | status |');
    lines.push('|---|---|---|---|---|---|');
    for (const a of state.articles) lines.push(`| ${a.index} | ${mdEscape(a.title)} | ${mdEscape(a.file ? rel(a.file, projectRoot) : '')} | ${a.coverUrl ? '✅' : '待生成/未配置'} | ${a.articleId || ''} | ${a.status || ''} |`);
    lines.push('');
  }
  if (state.accounts?.length) {
    lines.push('## 发布账号候选');
    lines.push('| 平台 | 账号ID | 名称 | 状态 | 今日剩余额度 |');
    lines.push('|---|---:|---|---:|---:|');
    for (const a of state.accounts) lines.push(`| ${a.platform || ''} | ${a.id || ''} | ${mdEscape(a.name || a.nickname || '')} | ${a.status ?? ''} | ${a.remainDaily ?? ''} |`);
    lines.push('');
  }
  if (state.publishPlan) {
    lines.push('## 发布任务 dry-run');
    lines.push(`- 任务名：${state.publishPlan.payload?.name || ''}`);
    lines.push(`- 文章数：${state.publishPlan.payload?.articles?.length || 0}`);
    lines.push(`- 平台：${(state.platforms || []).join(', ') || '(未指定)'}`);
    lines.push(`- 已选择账号：${(state.publishPlan.selectedAccounts || []).map(a => `${a.platform}:${a.id}`).join(', ') || '(待用户选择)'}`);
    if (state.publishPlan.missingPlatforms?.length) lines.push(`- 缺少可用账号的平台：${state.publishPlan.missingPlatforms.join(', ')}`);
    lines.push('');
  }
  if (state.failures?.length) {
    lines.push('## 失败记录');
    for (const f of state.failures) {
      lines.push(`- 阶段：${f.stage}`);
      lines.push(`  - 原因：${mdEscape(f.reason)}`);
      lines.push(`  - 重试：\`${f.retryCommand || ''}\``);
    }
    lines.push('');
  }
  return lines.join('\n');
}
function renderChecklistMd(state) {
  const lines = [];
  lines.push('# 正式发布前确认清单');
  lines.push('');
  lines.push('> 只有用户明确确认后，才能创建真实发布任务。');
  lines.push('');
  lines.push(`- [ ] 已确认 Referer：${state.config?.referer || '(未配置)'}`);
  lines.push(`- [ ] 已确认 companyId/productId：${state.companyId || 0} / ${state.productId || 0}`);
  lines.push(`- [ ] 已确认文章数量：${state.articleIds?.length || state.articles?.filter(a => a.articleId).length || 0}`);
  lines.push(`- [ ] 已确认所有文章已审核通过：${state.approvedArticleIds?.length || 0} 篇`);
  lines.push(`- [ ] 已确认所有封面 URL 可访问且不是第三方长签名 URL`);
  lines.push(`- [ ] 已确认发布平台：${(state.platforms || []).join(', ') || '(未指定)'}`);
  lines.push(`- [ ] 已确认发布账号：${state.publishPlan?.selectedAccounts?.map(a => `${a.platform}:${a.id}`).join(', ') || '(待选择)'}`);
  lines.push(`- [ ] 已确认发布时间：${state.publishTime || '立即发布'}`);
  lines.push(`- [ ] 已确认没有残留测试发布任务`);
  lines.push('');
  lines.push('确认后可运行：');
  lines.push('');
  lines.push('```bash');
  lines.push(commandFor(`${PIPELINE_NAME}/scripts/pipeline.js`, [
    '--project-dir', state.projectDir,
    '--state', path.join(state.runDir, 'pipeline-state.json'),
    '--create-publish-task',
    '--confirm'
  ]));
  lines.push('```');
  return lines.join('\n');
}
function renderRetryMd(state) {
  const lines = ['# 可重试命令', ''];
  if (!state.failures?.length) {
    lines.push('当前没有失败阶段。');
  } else {
    for (const f of state.failures) {
      lines.push(`## ${f.stage}`);
      lines.push('');
      lines.push(`原因：${f.reason}`);
      lines.push('');
      lines.push('```bash');
      lines.push(f.retryCommand || '# 请根据 pipeline-state.json 补齐参数后重试');
      lines.push('```');
      lines.push('');
    }
  }
  if (state.assets?.length) {
    lines.push('## 已完成资产');
    for (const a of state.assets) lines.push(`- ${a.stage}: ${a.path || a.id || a.url || ''}`);
  }
  return lines.join('\n');
}
function writeReports(state) {
  saveJson(path.join(state.runDir, 'pipeline-state.json'), state);
  saveText(path.join(state.runDir, 'pipeline-plan.md'), renderPlanMd(state));
  saveText(path.join(state.runDir, 'confirmation-checklist.md'), renderChecklistMd(state));
  saveText(path.join(state.runDir, 'retry-commands.md'), renderRetryMd(state));
  if (state.publishPlan?.payload) saveJson(path.join(state.runDir, 'publish-payload.json'), state.publishPlan.payload);
}
function recordFailure(state, stage, err, retryCommand) {
  const reason = redactForLog(err && err.message ? err.message : String(err));
  state.failures.push({ stage, reason, retryCommand, at: new Date().toISOString() });
  state.lastFailedStage = stage;
}
async function runTimedStage(state, name, fn) {
  const started = Date.now();
  console.error(`[pipeline] ${name} 开始`);
  try { return await fn(); }
  finally {
    const elapsedMs = Date.now() - started;
    state.stageTimings = state.stageTimings || {};
    state.stageTimings[name] = { elapsedMs, elapsedSeconds: Math.round(elapsedMs / 100) / 10 };
    console.error(`[pipeline] ${name} 完成：${state.stageTimings[name].elapsedSeconds}s`);
  }
}
async function runCoverStage(state, args) {
  if (!args['generate-cover'] && !args.generateCover) return;
  const script = path.join(SUITE_DIR, 'geo-content-production', 'scripts', 'generate_cover.js');
  const coverDir = ensureDir(path.join(state.runDir, 'covers'));
  for (const article of state.articles) {
    if (article.coverUrl) continue;
    const slug = safeSlug(`${String(article.index).padStart(2,'0')}_${article.title}`, `article_${article.index}`);
    const jsonOut = path.join(coverDir, `${slug}.json`);
    const coverArgs = ['--title', article.title, '--json-out', jsonOut, '--project-dir', state.projectDir, '--batch', state.batch, '--oss-mode', 'local'];
    const brand = first(args, ['brand','product','company']); if (brand) coverArgs.push('--brand', String(brand));
    const keywords = first(args, ['keywords','keyword']); if (keywords) coverArgs.push('--keywords', String(keywords));
    const style = first(args, ['style']); if (style) coverArgs.push('--style', String(style));
    if (!state.execute) coverArgs.push('--dry-run');
    article.coverCommand = commandFor('geo-content-production/scripts/generate_cover.js', coverArgs);
    if (!state.execute) continue;
    const out = spawnNode(script, coverArgs);
    const data = parseJsonFromStdout(out.stdout, jsonOut) || {};
    const url = Array.isArray(data.ossUrls) && data.ossUrls[0] || Array.isArray(data.resourceUrls) && data.resourceUrls[0] || '';
    if (!url) throw new Error(`封面生成没有返回 URL：${article.title}`);
    article.coverUrl = url;
    article.coverResult = jsonOut;
    state.assets.push({ stage: 'cover', path: jsonOut, url });
  }
}
async function runUploadStage(state, args) {
  if (!state.articles.length) return;
  const script = path.join(SUITE_DIR, 'geo-article', 'scripts', 'upload_article.js');
  const uploadDir = ensureDir(path.join(state.runDir, 'uploads'));
  for (const article of state.articles) {
    if (article.articleId) continue;
    if (!article.file) continue;
    const slug = safeSlug(`${String(article.index).padStart(2,'0')}_${article.title}`, `article_${article.index}`);
    const jsonOut = path.join(uploadDir, `${slug}.json`);
    const uploadArgs = ['--file', article.file, '--json-out', jsonOut];
    if (article.coverUrl) uploadArgs.push('--cover-url', article.coverUrl);
    else if (args['auto-cover'] || args.autoCover) uploadArgs.push('--auto-cover');
    const tags = first(args, ['tags']); if (tags) uploadArgs.push('--tags', String(tags));
    const summary = first(args, ['summary']); if (summary) uploadArgs.push('--summary', String(summary));
    if (!state.execute) uploadArgs.push('--dry-run');
    article.uploadCommand = commandFor('geo-article/scripts/upload_article.js', uploadArgs);
    if (!state.execute) continue;
    const out = spawnNode(script, uploadArgs);
    const data = parseJsonFromStdout(out.stdout, jsonOut) || {};
    const id = Number(data.articleId || data.created?.id || data.uploadedPreview?.id || 0);
    if (!id) throw new Error(`文章上传后没有获取到 articleId：${article.title}`);
    article.articleId = id;
    article.uploadResult = jsonOut;
    article.status = data.uploadedPreview?.status ?? article.status;
    state.articleIds = Array.from(new Set([...(state.articleIds || []), id]));
    state.assets.push({ stage: 'upload', path: jsonOut, id });
  }
}
async function runApproveStage(state) {
  if (!state.approve) return;
  const ids = Array.from(new Set([...(state.articleIds || []), ...state.articles.map(a => a.articleId).filter(Boolean).map(Number)]));
  if (!ids.length) return;
  const payload = { ids, status: 1 };
  state.approvePreview = { endpoint: '/v1/article/status', payload };
  if (!state.execute) return;
  await requestJson(state.cfg, '/v1/article/status', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) });
  const rows = await listArticles(state.cfg, { companyId: state.companyId, productId: state.productId, limit: 100 });
  const approved = rows.filter(r => ids.includes(Number(r.id)) && Number(r.status) === 1).map(r => Number(r.id));
  state.approvedArticleIds = approved;
  if (approved.length !== ids.length) throw new Error(`文章审核回查不一致：期望 ${ids.length} 篇，通过 ${approved.length} 篇。`);
  for (const a of state.articles) if (approved.includes(Number(a.articleId))) a.status = 1;
}
async function runAccountsAndPublishPlan(state, args) {
  if (!state.platforms.length) return;
  try {
    state.accounts = await queryAccounts(state.cfg, state.companyId, state.platforms);
  } catch (e) {
    throw new Error(`账号查询失败：${e.message || e}`);
  }
  const ids = Array.from(new Set([...(state.articleIds || []), ...state.articles.map(a => a.articleId).filter(Boolean).map(Number)]));
  state.articleIds = ids;
  const accountIds = asIds(first(args, ['account-ids','accountIds'], ''));
  const taskName = first(args, ['task-name','taskName','name'], `GEO发布任务-${today()}`);
  state.publishPlan = buildPublishPlan({
    taskName,
    articleIds: ids,
    platforms: state.platforms,
    accounts: state.accounts,
    accountIds,
    publishTime: state.publishTime,
    productId: state.productId,
    companyId: state.companyId,
    autoSelect: true,
  });
}
async function createPublishTask(state) {
  if (!state.publishPlan?.payload) throw new Error('缺少 publishPlan.payload，请先运行发布 dry-run。');
  const payload = state.publishPlan.payload;
  if (!payload.articles?.length) throw new Error('发布 payload 中没有文章。');
  const missingAccount = payload.articles.some(a => !a.platforms?.length || a.platforms.some(p => !p.publishAccountIds?.length));
  if (missingAccount) throw new Error('发布 payload 缺少账号，请先确认平台账号。');
  const created = await requestJson(state.cfg, '/v1/publication-task', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) });
  const taskId = Number(created?.data?.taskId || created?.data?.id || created?.taskId || created?.id || 0);
  const rows = await listTasks(state.cfg, { companyId: state.companyId, productId: state.productId, limit: 100 });
  const articleIds = payload.articles.map(a => Number(a.articleId));
  const found = rows.find(t => (taskId && Number(t.id || t.taskId) === taskId) || String(t.name || '') === String(payload.name));
  if (!found) throw new Error('发布任务创建后回查未找到任务，已停止。');
  const serialized = JSON.stringify(found);
  for (const id of articleIds) {
    if (!serialized.includes(String(id))) throw new Error(`发布任务回查疑似未包含文章 ID ${id}，请人工核验。`);
  }
  state.publishCreated = { taskId: taskId || found.id || found.taskId || null, created: created.data || created, verifiedTask: found };
  state.assets.push({ stage: 'publish-create', id: state.publishCreated.taskId || '(verified)' });
}
function stripRuntimeStateForSave(state) {
  const copy = { ...state };
  delete copy.cfg;
  return copy;
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const previous = loadState(first(args, ['state']));
  const projectDir = path.resolve(first(args, ['project-dir','projectDir'], previous?.projectDir || '.'));
  const runDir = previous?.runDir ? path.resolve(previous.runDir) : buildRunDir(args, projectDir);
  ensureDir(runDir);
  const cfg = loadGeoConfig();
  const companyId = Number(first(args, ['company-id','companyId'], previous?.companyId || cfg.defaults.companyId || 0));
  const productId = Number(first(args, ['product-id','productId'], previous?.productId || cfg.defaults.productId || 0));
  const count = Math.max(1, Number(first(args, ['count','n'], previous?.count || 3)) || 3);
  const execute = Boolean(args.execute || args.force) && !(args['dry-run'] || args.dryRun);
  const createPublish = Boolean(args['create-publish-task'] || args.createPublishTask);
  const confirm = Boolean(args.confirm || args.yes);
  const batch = String(first(args, ['batch','date'], previous?.batch || today()));
  const platforms = splitList(first(args, ['platforms','platform'], previous?.platforms?.join(',') || '')).filter(p => SUPPORTED_PLATFORMS.has(p));
  const publishTime = first(args, ['publish-time','publishTime'], previous?.publishTime || '');

  if (createPublish && !confirm) throw new Error('创建真实发布任务必须同时传 --confirm。');
  if ((execute || createPublish) && (!cfg.geo.openKey || !companyId || !productId)) {
    throw new Error('缺少 openKey/companyId/productId，请先使用 geo-config 完成初始化。');
  }

  const state = {
    ...(previous || {}),
    pipeline: PIPELINE_NAME,
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectDir,
    runDir,
    count,
    batch,
    execute,
    createPublishTask: createPublish,
    companyId,
    productId,
    platforms,
    publishTime,
    config: { openKeyMasked: mask(cfg.geo.openKey), referer: cfg.geo.referer || '', platformConfigured: Boolean(cfg.geo.baseUrl) },
    keywordPlan: first(args, ['keyword-plan','keywordPlan'], previous?.keywordPlan || ''),
    titlePlan: first(args, ['title-plan','titlePlan'], previous?.titlePlan || ''),
    knowledgeDir: first(args, ['knowledge-dir','knowledgeDir','kb'], previous?.knowledgeDir || ''),
    articles: previous?.articles || [],
    articleIds: Array.from(new Set([...(previous?.articleIds || []), ...asIds(first(args, ['article-ids','articleIds'], ''))])),
    approvedArticleIds: previous?.approvedArticleIds || [],
    accounts: previous?.accounts || [],
    publishPlan: previous?.publishPlan || null,
    publishCreated: previous?.publishCreated || null,
    failures: previous?.failures || [],
    stageTimings: previous?.stageTimings || {},
    assets: previous?.assets || [],
    approve: Boolean(args.approve || previous?.approve),
    lastFailedStage: null,
  };
  state.cfg = cfg;

  const candidates = [];
  if (state.keywordPlan) candidates.push(...extractCandidatesFromFile(state.keywordPlan, 'keyword/question', count));
  if (state.titlePlan) candidates.push(...extractCandidatesFromFile(state.titlePlan, 'title', count));
  state.candidates = candidates.slice(0, count);

  const discovered = discoverArticles(args, projectDir, count);
  if (discovered.length) {
    const knownByFile = new Map((state.articles || []).filter(a => a.file).map(a => [path.resolve(a.file), a]));
    state.articles = discovered.map((a, i) => ({ ...(knownByFile.get(path.resolve(a.file)) || {}), ...a, index: i + 1 }));
  }
  const explicitCoverUrl = first(args, ['cover-url', 'coverUrl'], '');
  if (explicitCoverUrl) for (const article of state.articles) if (!article.coverUrl) article.coverUrl = explicitCoverUrl;

  const retryBase = commandFor(`${PIPELINE_NAME}/scripts/pipeline.js`, ['--project-dir', projectDir, '--state', path.join(runDir, 'pipeline-state.json'), '--execute']);

  try { await runTimedStage(state, 'cover', () => runCoverStage(state, args)); }
  catch (e) { recordFailure(state, 'cover', e, `${retryBase} --generate-cover`); }
  finally { writeReports(stripRuntimeStateForSave(state)); }

  if (!state.lastFailedStage) {
    try { await runTimedStage(state, 'upload', () => runUploadStage(state, args)); }
    catch (e) { recordFailure(state, 'upload', e, `${retryBase}`); }
    finally { writeReports(stripRuntimeStateForSave(state)); }
  }

  if (!state.lastFailedStage) {
    try { await runTimedStage(state, 'approve', () => runApproveStage(state)); }
    catch (e) { recordFailure(state, 'approve', e, `${retryBase} --approve`); }
    finally { writeReports(stripRuntimeStateForSave(state)); }
  }

  if (!state.lastFailedStage) {
    try { await runTimedStage(state, 'accounts/publish-dry-run', () => runAccountsAndPublishPlan(state, args)); }
    catch (e) { recordFailure(state, 'accounts/publish-dry-run', e, `${retryBase} --platforms ${platforms.join(',')}`); }
    finally { writeReports(stripRuntimeStateForSave(state)); }
  }

  if (!state.lastFailedStage && createPublish) {
    try { await runTimedStage(state, 'publish-create', () => createPublishTask(state)); }
    catch (e) { recordFailure(state, 'publish-create', e, commandFor(`${PIPELINE_NAME}/scripts/pipeline.js`, ['--project-dir', projectDir, '--state', path.join(runDir, 'pipeline-state.json'), '--create-publish-task', '--confirm'])); }
    finally { writeReports(stripRuntimeStateForSave(state)); }
  }

  const output = {
    ok: !state.lastFailedStage,
    mode: createPublish ? 'publish-create' : (execute ? 'execute-with-publish-dry-run' : 'dry-run'),
    runDir,
    reports: {
      state: path.join(runDir, 'pipeline-state.json'),
      plan: path.join(runDir, 'pipeline-plan.md'),
      checklist: path.join(runDir, 'confirmation-checklist.md'),
      retry: path.join(runDir, 'retry-commands.md'),
      publishPayload: state.publishPlan?.payload ? path.join(runDir, 'publish-payload.json') : null,
    },
    completed: {
      candidates: state.candidates.length,
      articles: state.articles.length,
      uploadedArticleIds: state.articleIds,
      approvedArticleIds: state.approvedArticleIds,
      accounts: state.accounts.length,
      publishCreated: state.publishCreated?.taskId || null,
    },
    failures: state.failures,
  };
  const jsonOut = first(args, ['json-out','jsonOut']);
  if (jsonOut) saveJson(path.resolve(jsonOut), output);
  console.log(JSON.stringify(output, null, 2));
  if (state.lastFailedStage) process.exitCode = 1;
}

main().catch(e => { console.error(redactForLog(e.message || e)); process.exit(1); });
