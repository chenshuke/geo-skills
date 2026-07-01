#!/usr/bin/env node
/**
 * GEO troubleshooting helper.
 * Produces beginner-friendly fixed-format diagnoses from symptoms and evidence files.
 * Never prints Base URL or full openKey.
 */
const fs = require('fs');
const path = require('path');

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
function today() { return new Date().toISOString().slice(0, 10); }
function nowIso() { return new Date().toISOString(); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); return dir; }
function splitList(v) { return String(v || '').split(/[,，\n|]/).map(s => s.trim()).filter(Boolean); }
function usage() {
  console.log(`Usage:
  node geo-troubleshooter/scripts/troubleshoot.js --symptom "发布任务创建成功但没有发布" --project-dir 项目_品牌GEO
  node geo-troubleshooter/scripts/troubleshoot.js --symptom "answers 有数据但 matrix 没数据" --answers-json answers.json --matrix-json matrix.json

Evidence options:
  --doctor-json <file>          geo-runtime doctor --json
  --upload-json <file>          geo-article upload_article.js --json-out
  --publication-json <file>     geo-publish publication_status.js JSON
  --url-match-json <file>       geo-indexing published_url_match.js JSON
  --answers-json <file>         scheduled_indexing.js --action answers JSON
  --matrix-json <file>          scheduled_indexing.js --action matrix JSON
  --source-assets-json <file>   geo-source-assets summary JSON
  --source-assets-csv <file>    geo-source-assets source_assets.csv
  --log-file <file>             raw error log/text
  --project-dir <dir>           output to 00_项目概览/故障排查/
  --output-dir <dir>            custom output directory
  --json-out <file>             save JSON elsewhere
`);
}
function outputDir(args) {
  const explicit = first(args, ['output-dir','outputDir']);
  if (explicit) return path.resolve(String(explicit));
  const projectDir = path.resolve(String(first(args, ['project-dir','projectDir'], '.')));
  return path.join(projectDir, '00_项目概览', '故障排查');
}
function readText(file) {
  if (!file) return '';
  try { return fs.readFileSync(path.resolve(file), 'utf8'); } catch { return ''; }
}
function readJson(file) {
  if (!file) return null;
  try { return JSON.parse(readText(file)); } catch { return null; }
}
function rowsOf(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.rows)) return json.rows;
  if (Array.isArray(json.results)) return json.results;
  const d = json.data !== undefined ? json.data : json;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.rows)) return d.rows;
  return [];
}
function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line); const row = {};
    headers.forEach((h,i) => row[h] = cells[i] || '');
    return row;
  });
}
function parseCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i+1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}
function redact(s) {
  return String(s || '')
    .replace(/https?:\/\/[^\s)"']+/g, m => m.includes('/v1/') ? m.replace(/^https?:\/\/[^/]+/, '[BaseURL]') : m)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer ****')
    .replace(/openKey["'\s:=]+[A-Za-z0-9._-]{12,}/gi, 'openKey: ****')
    .slice(0, 800);
}
function evidenceLine(label, file, detail = '') {
  return file ? `${label}: ${file}${detail ? `（${detail}）` : ''}` : `${label}: 未提供`;
}
function hasText(hay, words) {
  const s = String(hay || '').toLowerCase();
  return words.some(w => s.includes(String(w).toLowerCase()));
}
function collectEvidence(args) {
  const files = {
    doctor: first(args, ['doctor-json','doctorJson']),
    upload: first(args, ['upload-json','uploadJson']),
    publication: first(args, ['publication-json','publicationJson','publish-status-json','publishStatusJson']),
    urlMatch: first(args, ['url-match-json','urlMatchJson']),
    answers: first(args, ['answers-json','answersJson']),
    matrix: first(args, ['matrix-json','matrixJson']),
    sourceAssetsJson: first(args, ['source-assets-json','sourceAssetsJson']),
    sourceAssetsCsv: first(args, ['source-assets-csv','sourceAssetsCsv']),
    log: first(args, ['log-file','logFile','error-log','errorLog']),
  };
  const json = {
    doctor: readJson(files.doctor),
    upload: readJson(files.upload),
    publication: readJson(files.publication),
    urlMatch: readJson(files.urlMatch),
    answers: readJson(files.answers),
    matrix: readJson(files.matrix),
    sourceAssets: readJson(files.sourceAssetsJson),
  };
  const sourceAssetRows = files.sourceAssetsCsv ? parseCsv(readText(files.sourceAssetsCsv)) : rowsOf(json.sourceAssets);
  const logText = redact(readText(files.log));
  return { files, json, rows: { publication: rowsOf(json.publication), urlMatch: rowsOf(json.urlMatch), answers: rowsOf(json.answers), matrix: rowsOf(json.matrix), sourceAssets: sourceAssetRows }, logText };
}
function newIssue(id, title) {
  return { id, title, problem: title, causes: [], evidence: [], nextSteps: [], humanConfirmation: '否' };
}
function add(issue, key, values) { issue[key].push(...[].concat(values).filter(Boolean)); }
function diagnose(args, ev) {
  const symptom = String(first(args, ['symptom','problem','question'], args._.join(' '))).trim();
  const hay = `${symptom}\n${ev.logText}\n${JSON.stringify(ev.json).slice(0, 5000)}`;
  const issues = [];
  const addIssue = (issue) => { issues.push(issue); return issue; };

  if (hasText(hay, ['openkey','401','unauthorized','认证','鉴权','密钥','token'])) {
    const i = addIssue(newIssue('openkey_invalid', 'openKey 可能配置错误或已失效'));
    add(i, 'causes', ['openKey 填错、复制时多了空格，或密钥属于另一个 GEO 平台/Referer。', '当前配置文件没有被实际运行环境读取。']);
    add(i, 'evidence', [evidenceLine('doctor JSON', ev.files.doctor), ev.logText && `错误日志：${ev.logText}`]);
    add(i, 'nextSteps', ['运行 `node geo-runtime/scripts/doctor.js --json` 查看 openKey 是否为空或接口是否 401。', '使用 `geo-config` 重新写入 openKey，并让配置脚本自动识别 Referer。', '重新做一次只读接口检查，不要先做上传/发布写操作。']);
    i.humanConfirmation = '需要：确认用户提供的 openKey 是否为当前账号/当前平台生成。';
  }

  if (hasText(hay, ['companyid','productid','10108','公司','产品','defaults.companyId','defaults.productId'])) {
    const i = addIssue(newIssue('company_product_mismatch', 'companyId/productId 可能为空、选错或与文章不匹配'));
    add(i, 'causes', ['默认 companyId/productId 仍为 0。', '文章、产品、发布任务不属于同一个 productId。', '切换 openKey 后沿用了旧公司/产品 ID。']);
    add(i, 'evidence', [evidenceLine('doctor JSON', ev.files.doctor), ev.logText && `错误日志：${ev.logText}`]);
    add(i, 'nextSteps', ['运行 `node geo-config/scripts/setup_defaults.js --list` 重新列出公司和产品。', '选择正确 companyId/productId 后写回 defaults。', '重新查询文章详情，确认文章 productId 与发布任务 productId 一致。']);
    i.humanConfirmation = '需要：让用户确认要操作的是哪个公司和产品。';
  }

  if (hasText(hay, ['文章上传失败','上传文章失败','upload_article','upload-json','article upload','summary','summaries','请求参数错误','coverImageUrl','封面上传'])) {
    const uploadRows = rowsOf(ev.json.upload);
    const i = addIssue(newIssue('article_upload_failed', '文章上传失败或上传参数不兼容'));
    add(i, 'causes', ['文章 payload 字段不符合当前接口，例如应使用 `summaries: []`。', '封面 URL 不可访问，或第三方长签名图片没有先转存到 GEO OSS。', 'Markdown 编码不是 UTF-8 或正文为空。']);
    add(i, 'evidence', [evidenceLine('upload JSON', ev.files.upload, `${uploadRows.length} rows`), ev.logText && `错误日志：${ev.logText}`]);
    add(i, 'nextSteps', ['使用 `geo-article/scripts/upload_article.js --file 文章.md --dry-run` 先预览 payload。', '封面/正文图先用 GEO OSS 本地文件上传，避免直接使用第三方长签名 URL。', '如果报“请求参数错误”，检查脚本是否已更新为 `summaries: []`。']);
    i.humanConfirmation = '视情况：如果要真实上传或覆盖文章，需要用户确认。';
  }

  const pubRows = ev.rows.publication;
  const noUrl = pubRows.filter(r => !r.publishedUrl || /task_created_no_publication_url|published_no_url|pending/.test(String(r.status || '')));
  const manual = pubRows.filter(r => /manual_required|人工|登录|授权|验证码/.test(`${r.status || ''} ${r.rawMessage || ''} ${r.failureReason || ''}`));
  const failed = pubRows.filter(r => /failed|失败|异常|驳回|error/.test(`${r.status || ''} ${r.rawMessage || ''} ${r.failureReason || ''}`));
  if (hasText(hay, ['发布任务创建成功但没有发布','没有发布','publishedurl','publication']) || noUrl.length || manual.length || failed.length) {
    const i = addIssue(newIssue('publication_not_finished', '发布任务不等于平台已发布，需要继续回查 publishedUrl'));
    add(i, 'causes', ['任务只创建成功，但平台投稿还在处理中。', '发布账号需要人工处理、登录、授权或验证码。', '平台发布失败/驳回，导致没有 publishedUrl。']);
    add(i, 'evidence', [evidenceLine('publication JSON', ev.files.publication, `总 ${pubRows.length} 条；无 URL ${noUrl.length} 条；人工处理 ${manual.length} 条；失败 ${failed.length} 条`)]);
    add(i, 'nextSteps', ['运行 `node geo-publish/scripts/publication_status.js --article-ids <文章ID> --project-dir 项目_品牌GEO` 重新回查。', '只有拿到 `publishedUrl` 后，才进入 `geo-indexing/scripts/published_url_match.js` 检测 AI 是否看见。', failed.length ? '先处理失败原因，再重新创建发布任务。' : '', manual.length ? '先到对应平台账号完成人工处理/授权。' : '']);
    i.humanConfirmation = manual.length || failed.length ? '需要：人工登录平台账号或确认是否重发。' : '不一定：处理中可稍后复查。';
  }

  const answers = ev.rows.answers;
  const matrix = ev.rows.matrix;
  if (hasText(hay, ['没跑完','pending','processing','查收录任务没有跑完']) || answers.some(a => [0,1,'pending','processing'].includes(a.status))) {
    const i = addIssue(newIssue('indexing_not_finished', '收录任务还没有跑完'));
    add(i, 'causes', ['Scheduled Indexing 执行仍在 Pending/Processing。', '立即执行后平台还在排队，answers/matrix 尚未完全刷新。']);
    add(i, 'evidence', [evidenceLine('answers JSON', ev.files.answers, `answers ${answers.length} 条`)]);
    add(i, 'nextSteps', ['先查 runs：`node geo-indexing/scripts/scheduled_indexing.js --action runs --id <计划ID> --limit 20`。', '等待本轮状态 finished 后再查 answers 和 matrix。', '不要把未完成数据作为最终收录结果。']);
    i.humanConfirmation = '否，除非长时间卡住需要用户决定是否 run-now 重跑。';
  }
  if ((hasText(hay, ['answers 有数据但 matrix 没数据','matrix 没数据']) || (answers.length && !matrix.length)) && ev.files.answers) {
    const i = addIssue(newIssue('answers_matrix_inconsistent', 'answers 有数据但 matrix 没数据或未刷新'));
    add(i, 'causes', ['answers 接口已返回明细，但 matrix 聚合接口还没生成/刷新。', '查询参数不一致，例如 runId、platform、时间范围不同。', '计划刚跑完，聚合统计延迟。']);
    add(i, 'evidence', [evidenceLine('answers JSON', ev.files.answers, `${answers.length} 条`), evidenceLine('matrix JSON', ev.files.matrix, `${matrix.length} 条`)]);
    add(i, 'nextSteps', ['用相同 scheduleId、platform、runId 重新查询 answers 和 matrix。', '如果 answers 可用，先用 answers 做分析，不要阻塞在 matrix。', '稍后再次查询 matrix；若仍为空，记录接口路径和参数反馈平台。']);
    i.humanConfirmation = '否，除非需要向平台反馈接口异常。';
  }

  const sites = answers.flatMap(a => Array.isArray(a.searchedSites) ? a.searchedSites.map(s => ({...s, topic:a.topic, aiPlatform:a.platform})) : []);
  const sourcedNotIndexed = sites.filter(s => s.url && !s.articleIndexed && !s.indexed);
  if (hasText(hay, ['articleindexed=false','searchedsites 有来源','有来源但']) || sourcedNotIndexed.length) {
    const i = addIssue(newIssue('sources_not_owned_indexed', 'AI 有引用来源，但没有把我方文章作为命中证据'));
    add(i, 'causes', ['AI 引用了行业/媒体/竞品来源，但我方 URL 没有进入证据链。', '我方文章发布较新、可抓取性不足、标题与问题不够匹配。', '`articleIndexed=false` 表示当前来源不是本品牌文章命中。']);
    add(i, 'evidence', [evidenceLine('answers JSON', ev.files.answers, `searchedSites 非我方命中约 ${sourcedNotIndexed.length} 条`)]);
    add(i, 'nextSteps', ['使用 `geo-source-assets` 把 searchedSites 沉淀成信源资产库。', '围绕高频来源写替代型/对比型/榜单型内容。', '把新发布 URL 交给 `published_url_match.js` 做精确命中复测。']);
    i.humanConfirmation = '通常不需要；如果要新增发布渠道/投放媒体，需要用户确认。';
  }

  if (hasText(hay, ['竞品','competitor']) || answers.some(a => Array.isArray(a.competitors) && a.competitors.length)) {
    const i = addIssue(newIssue('competitor_mentioned_not_owned', 'AI 提到竞品或竞品来源，但我方存在感不足'));
    add(i, 'causes', ['竞品在现有引用源中更权威或更高频。', '我方缺少对比、替代、榜单、场景型内容。', '问题意图更接近竞品已有内容。']);
    add(i, 'evidence', [evidenceLine('answers JSON', ev.files.answers, `answers ${answers.length} 条`)]);
    add(i, 'nextSteps', ['用 `geo-analysis` 分析竞品出现在哪些问题和平台。', '用 `geo-content-production` 生成对比/替代/榜单内容。', '用 `geo-source-assets` 找到可补强的媒体/行业信源。']);
    i.humanConfirmation = '视情况：涉及竞品对比口径时建议用户确认措辞。';
  }

  const assetRows = ev.rows.sourceAssets;
  const owned = assetRows.filter(r => /owned_source/.test(String(r.source_type || '')));
  const nonOwnedStable = assetRows.filter(r => !/owned_source/.test(String(r.source_type || '')) && /yes/.test(String(r.stable_cited || '')));
  if (hasText(hay, ['引用源不是我方','不是我方资产','source asset']) || nonOwnedStable.length) {
    const i = addIssue(newIssue('recommend_owned_but_uncontrolled_sources', 'AI 可能推荐我方，但引用源还不是我方可控资产'));
    add(i, 'causes', ['品牌被提到，但证据链来自媒体、平台、行业站或竞品页。', '我方可控内容源数量少，稳定引用不足。']);
    add(i, 'evidence', [evidenceLine('source assets', ev.files.sourceAssetsCsv || ev.files.sourceAssetsJson, `我方源 ${owned.length} 条；稳定非我方源 ${nonOwnedStable.length} 条`)]);
    add(i, 'nextSteps', ['优先补强我方官网/公众号/知乎/CSDN等可控页面。', '把稳定非我方源作为分发渠道或替代内容选题。', '继续监测我方源 stable_cited 是否提升。']);
    i.humanConfirmation = '需要：确认哪些域名/账号属于我方可控资产。';
  }

  const urlResults = ev.rows.urlMatch;
  const notHit = urlResults.filter(r => r.status === 'not_hit');
  const weak = urlResults.filter(r => r.status === 'weak_title_account_hit');
  if (hasText(hay, ['已发布但 ai 没看见','url 未命中','not_hit','weak_title']) || notHit.length || weak.length) {
    const i = addIssue(newIssue('published_url_not_seen_by_ai', '文章已发布，但 AI searchedSites 还没有精确命中新 URL'));
    add(i, 'causes', ['平台发布 URL 刚生成，AI/搜索尚未抓取。', '标题/摘要/账号与问题意图不一致，只出现弱命中。', '发布页不可抓取或缺少外链/引用信号。']);
    add(i, 'evidence', [evidenceLine('URL match JSON', ev.files.urlMatch, `未命中 ${notHit.length}；弱命中 ${weak.length}`)]);
    add(i, 'nextSteps', ['等待 24-72 小时后 run-now 复测。', '检查发布页标题、首段、品牌词和问题关键词是否匹配。', '通过媒体二次分发、内链、可控资产页增强抓取信号。']);
    i.humanConfirmation = '否；若要修改已发布文章或补分发渠道，需要确认。';
  }

  if (!issues.length) {
    const i = addIssue(newIssue('unknown_needs_more_evidence', '暂时无法从现有信息定位具体问题'));
    add(i, 'causes', ['没有提供可判定的 JSON 输出、错误日志或症状描述。', '问题可能发生在尚未回查的链路。']);
    add(i, 'evidence', ['当前只收到症状：' + (symptom || '(空)')]);
    add(i, 'nextSteps', ['先运行 `node geo-runtime/scripts/doctor.js --json` 检查配置。', '如果是发布问题，运行 `geo-publish/scripts/publication_status.js`。', '如果是收录问题，导出 answers/matrix 或运行 `geo-indexing/scripts/published_url_match.js`。', '把错误日志或 JSON 文件交给本技能重新诊断。']);
    i.humanConfirmation = '暂不需要；先补证据。';
  }
  return { symptom, issues };
}
function mdEscape(s) { return String(s || '').replace(/\n/g, ' ').trim(); }
function renderIssue(issue) {
  const lines = [`# ${issue.problem}`, ''];
  lines.push('## 问题是什么', '', mdEscape(issue.problem), '');
  lines.push('## 可能原因', '');
  issue.causes.forEach(x => lines.push(`- ${mdEscape(x)}`));
  lines.push('', '## 证据在哪里', '');
  issue.evidence.forEach(x => lines.push(`- ${mdEscape(x)}`));
  lines.push('', '## 下一步怎么处理', '');
  issue.nextSteps.forEach(x => lines.push(`- ${mdEscape(x)}`));
  lines.push('', '## 是否需要人工确认', '', mdEscape(issue.humanConfirmation || '否'), '');
  return lines.join('\n');
}
function renderMd(result, ev) {
  const lines = ['# GEO 故障排查报告', '', `更新时间：${nowIso()}`, ''];
  if (result.symptom) lines.push(`- 用户描述：${mdEscape(result.symptom)}`);
  lines.push(`- 诊断数量：${result.issues.length}`);
  lines.push('', '---', '');
  result.issues.forEach((issue, idx) => {
    lines.push(`## 诊断 ${idx + 1}：${issue.title}`, '');
    lines.push(renderIssue(issue), '---', '');
  });
  lines.push('## 证据文件清单', '');
  for (const [k,v] of Object.entries(ev.files)) if (v) lines.push(`- ${k}: ${v}`);
  return lines.join('\n');
}
function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const ev = collectEvidence(args);
  const result = diagnose(args, ev);
  const dir = outputDir(args);
  ensureDir(dir);
  const files = {
    md: path.join(dir, `geo_troubleshooting_${today()}.md`),
    json: path.join(dir, `geo_troubleshooting_${today()}.json`),
  };
  fs.writeFileSync(files.md, renderMd(result, ev), 'utf8');
  fs.writeFileSync(files.json, JSON.stringify(result, null, 2), 'utf8');
  const jsonOut = first(args, ['json-out','jsonOut']);
  if (jsonOut) { ensureDir(path.dirname(path.resolve(jsonOut))); fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ ...result, files }, null, 2), 'utf8'); }
  console.log(JSON.stringify({ action: 'troubleshoot', issueCount: result.issues.length, issueIds: result.issues.map(i => i.id), files }, null, 2));
}
main();
