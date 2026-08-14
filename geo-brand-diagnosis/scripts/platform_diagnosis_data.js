#!/usr/bin/env node
/**
 * Read-only GEO platform data source for brand recognition and product recommendation diagnosis.
 * Lists Scheduled Indexing plans and exports selected answers + searchedSites.
 */
const fs = require('fs');
const path = require('path');
const { loadGeoConfig, headers: geoHeaders, mask } = require('../../geo-runtime/scripts/credentials.js');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
function first(args, names, fallback) { for (const key of names) if (args[key] !== undefined && args[key] !== '') return args[key]; return fallback; }
function base(cfg) { return String(cfg.geo.baseUrl || '').replace(/\/$/, ''); }
function rowsOf(body) {
  const data = body && body.data !== undefined ? body.data : body;
  if (Array.isArray(data)) return data;
  for (const key of ['data', 'list', 'rows']) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function apiPath(pathname, query = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  return qs.size ? `${pathname}?${qs}` : pathname;
}
async function request(cfg, pathname, query = {}) {
  const response = await fetch(`${base(cfg)}${apiPath(pathname, query)}`, { headers: { ...geoHeaders(cfg), Accept: 'application/json' } });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!response.ok || (data && typeof data === 'object' && data.statusCode !== undefined && data.statusCode !== 0)) {
    const message = typeof data === 'object' ? (data.message || data.msg || JSON.stringify(data).slice(0, 500)) : String(data).slice(0, 500);
    throw new Error(`GEO API GET ${pathname} failed: HTTP ${response.status}; ${message}`);
  }
  return data;
}
function requireConfig(cfg) {
  if (!cfg.geo.openKey) throw new Error('未配置 GEO openKey，请先使用 geo-config。');
  if (!Number(cfg.defaults.companyId) || !Number(cfg.defaults.productId)) throw new Error('companyId/productId 尚未设置，请先使用 geo-config 选择默认公司和产品。');
}
function finishedRun(run) { return Number(run.taskFinished || 0) > 0 && Number(run.taskFinished || 0) >= Number(run.taskTotal || 0) && !run.errorMessage; }
function normalizeSource(site, answerId, topicId, platform, index) {
  return {
    source_id: `${answerId}-S${index + 1}`,
    answer_id: answerId,
    topic_id: topicId,
    ai_platform: platform,
    title: String(site?.title || ''),
    url: String(site?.url || ''),
    source_domain: String(site?.platform || ''),
    article_indexed: Boolean(site?.articleIndexed),
  };
}
function normalizeAnswer(row) {
  const sites = Array.isArray(row.searchedSites) ? row.searchedSites : Array.isArray(row.sources) ? row.sources : [];
  return {
    answer_id: Number(row.id || 0),
    run_id: Number(row.runId || 0),
    topic_id: Number(row.topicId || 0),
    question: String(row.topic || row.question || ''),
    ai_platform: String(row.platform || ''),
    status: Number(row.status),
    finished: Number(row.status) === 2,
    brand_indexed: Boolean(row.indexed),
    target_words: Array.isArray(row.targetWord) ? row.targetWord : [],
    ai_answer: String(row.content || row.answer || ''),
    competitors: Array.isArray(row.competitors) ? row.competitors : [],
    rank_or_rate: row.rate ?? null,
    screenshot_url: String(row.screenshotUrl || ''),
    created_at: row.createdAt || '',
    sources: sites.map((site, index) => normalizeSource(site, Number(row.id || 0), Number(row.topicId || 0), String(row.platform || ''), index)),
  };
}
function normalizeMode(value) {
  const mode = String(value || 'auto').toLowerCase();
  if (['brand', 'brand-recognition', 'recognition'].includes(mode)) return 'brand_recognition';
  if (['product', 'product-recommendation', 'recommendation', 'acquisition'].includes(mode)) return 'product_recommendation';
  if (['mixed', 'combined'].includes(mode)) return 'mixed';
  return 'auto';
}
function inferQuestionMode(answer) {
  const question = String(answer.question || '').trim();
  const targetWords = (answer.target_words || []).map(String).map(word => word.trim()).filter(word => word.length >= 2);
  if (targetWords.some(word => question.toLowerCase().includes(word.toLowerCase()))) return 'brand_recognition';
  if (/(推荐|哪家好|哪家靠谱|怎么选|如何选|选择什么|选什么|用什么|什么.+好|适合什么|性价比|效果好|排行榜|排名|对比)/.test(question)) return 'product_recommendation';
  return 'unknown';
}
function diagnosisModeSummary(answers, requestedMode) {
  if (requestedMode !== 'auto') return { requested: requestedMode, inferred: requestedMode, question_modes: {} };
  const byQuestion = new Map();
  for (const answer of answers) {
    const key = answer.topic_id || answer.question;
    if (!byQuestion.has(key)) byQuestion.set(key, inferQuestionMode(answer));
  }
  const counts = { brand_recognition: 0, product_recommendation: 0, unknown: 0 };
  for (const value of byQuestion.values()) counts[value] = (counts[value] || 0) + 1;
  let inferred = 'unknown';
  if (counts.brand_recognition && counts.product_recommendation) inferred = 'mixed';
  else if (counts.brand_recognition) inferred = 'brand_recognition';
  else if (counts.product_recommendation) inferred = 'product_recommendation';
  return { requested: 'auto', inferred, question_modes: counts };
}
async function listPlans(cfg, args) {
  const limit = Math.min(100, Math.max(1, Number(first(args, ['limit'], 30)) || 30));
  const companyId = Number(first(args, ['company-id', 'companyId'], cfg.defaults.companyId));
  const productId = Number(first(args, ['product-id', 'productId'], cfg.defaults.productId));
  const plans = rowsOf(await request(cfg, '/v1/scheduled-indexing', { companyId, limit }));
  const enriched = [];
  for (const plan of plans) {
    if (productId && Number(plan.productId) !== productId && !args['all-products']) continue;
    const runs = rowsOf(await request(cfg, `/v1/scheduled-indexing/${plan.id}/runs`, { limit: 10 }));
    const latestRun = runs[0] || null;
    enriched.push({
      schedule_id: Number(plan.id),
      name: plan.name || '',
      company_id: Number(plan.companyId || 0),
      product_id: Number(plan.productId || 0),
      platforms: Array.isArray(plan.platforms) ? plan.platforms : [],
      question_count: Array.isArray(plan.topicIds) ? plan.topicIds.length : Array.isArray(plan.topicList) ? plan.topicList.length : 0,
      questions: Array.isArray(plan.topicList) ? plan.topicList.map(item => ({ topic_id: Number(item.id || 0), question: item.topic || '' })) : [],
      source_mode: plan.source,
      enabled: Boolean(plan.enabled),
      last_run_at: plan.lastRunAt || latestRun?.startedAt || null,
      latest_run: latestRun ? { run_id: Number(latestRun.id), status: latestRun.status, task_total: Number(latestRun.taskTotal || 0), task_finished: Number(latestRun.taskFinished || 0), finished: finishedRun(latestRun), error: latestRun.errorMessage || null } : null,
      ready_for_diagnosis: Boolean(latestRun && finishedRun(latestRun)),
      created_at: plan.createdAt || '',
    });
  }
  return { action: 'list', selection_required: true, defaults: { company_id: companyId, product_id: productId }, rows: enriched };
}
async function exportPlan(cfg, args) {
  const scheduleId = Number(first(args, ['schedule-id', 'scheduleId', 'id'], 0));
  if (!scheduleId) throw new Error('export 需要 --schedule-id。');
  const detailBody = await request(cfg, `/v1/scheduled-indexing/${scheduleId}`);
  const detailData = detailBody?.data || detailBody;
  const plan = detailData?.schedule || detailData;
  const runs = rowsOf(await request(cfg, `/v1/scheduled-indexing/${scheduleId}/runs`, { limit: 100 }));
  const allRuns = Boolean(args['all-runs'] || args.allRuns);
  let runId = Number(first(args, ['run-id', 'runId'], 0));
  if (!allRuns && !runId) runId = Number((runs.find(finishedRun) || runs[0] || {}).id || 0);
  const limit = Math.min(1000, Math.max(1, Number(first(args, ['limit'], 500)) || 500));
  const answersRaw = rowsOf(await request(cfg, `/v1/scheduled-indexing/${scheduleId}/answers`, { limit, runId: runId || undefined }));
  const answers = answersRaw.map(normalizeAnswer);
  const selected = !allRuns && runId ? answers.filter(row => !row.run_id || row.run_id === runId) : answers;
  const sources = selected.flatMap(row => row.sources);
  const uniqueQuestions = [...new Map(selected.map(row => [row.topic_id || row.question, { topic_id: row.topic_id, question: row.question }])).values()];
  const platforms = [...new Set(selected.map(row => row.ai_platform).filter(Boolean))];
  const sourceUrls = [...new Set(sources.map(row => row.url).filter(Boolean))];
  const requestedMode = normalizeMode(first(args, ['diagnosis-mode', 'diagnosisMode', 'mode'], 'auto'));
  const mode = diagnosisModeSummary(selected, requestedMode);
  const includedRunIds = [...new Set(selected.map(row => row.run_id).filter(Boolean))];
  const finishedAnswerCount = selected.filter(row => row.finished).length;
  const readiness = !selected.length ? 'no_answers' : finishedAnswerCount === selected.length ? 'ready_for_diagnosis' : 'incomplete_answers';
  return {
    schema: 'geo-dual-diagnosis-platform-data/v2',
    status: readiness,
    source: 'GEO Scheduled Indexing',
    diagnosis_mode: mode,
    schedule: { schedule_id: scheduleId, name: plan?.name || '', company_id: Number(plan?.companyId || 0), product_id: Number(plan?.productId || 0), configured_platforms: plan?.platforms || [], question_count: uniqueQuestions.length, selected_run_id: allRuns ? null : (runId || null), included_run_ids: includedRunIds, all_runs: allRuns },
    summary: { answer_count: selected.length, finished_answer_count: finishedAnswerCount, incomplete_answer_count: selected.length - finishedAnswerCount, run_count: includedRunIds.length, platform_count: platforms.length, platforms, source_record_count: sources.length, unique_source_url_count: sourceUrls.length },
    questions: uniqueQuestions,
    answers: selected,
    sources,
    limitations: [
      'GEO 平台答案与 searchedSites 可用于品牌认知、产品推荐、竞品和信源诊断。',
      '产品推荐状态、推荐理由和推荐强度需要阅读回答语义判断，不能仅依赖 brand_indexed 或关键词。',
      '判断回答事实是否准确仍需品牌知识库或可核验品牌资料作为基准。',
      'searchedSites 表示 AI 检索/引用过的来源，不等于来源支持回答中的全部主张。'
    ]
  };
}
function writeResult(result, args) {
  const output = first(args, ['json-out', 'jsonOut']);
  if (output) { const file = path.resolve(output); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n', 'utf8'); }
  console.log(JSON.stringify(result, null, 2));
}
async function main() {
  const args = parseArgs(process.argv);
  const action = String(first(args, ['action'], 'list'));
  const cfg = loadGeoConfig(); requireConfig(cfg);
  let result;
  if (action === 'list') result = await listPlans(cfg, args);
  else if (action === 'export') result = await exportPlan(cfg, args);
  else if (action === 'config-check') result = { action, configured: true, open_key: mask(cfg.geo.openKey), referer: cfg.geo.referer || '', company_id: Number(cfg.defaults.companyId), product_id: Number(cfg.defaults.productId) };
  else throw new Error(`未知 action：${action}；可用 list / export / config-check。`);
  writeResult(result, args);
}
main().catch(error => { console.error(error.message || error); process.exit(1); });
