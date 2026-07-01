#!/usr/bin/env node
/**
 * GEO skill evolution helper.
 * Turns new customer/industry/student issues into skill improvement proposals and regression tests.
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
function splitList(v) { return String(v || '').split(/[,，\n|]/).map(s => s.trim()).filter(Boolean); }
function nowIso() { return new Date().toISOString(); }
function stamp() { return new Date().toISOString().replace(/T/, '_').replace(/:/g, '').slice(0, 17); }
function today() { return new Date().toISOString().slice(0, 10); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); return dir; }
function outputDir(args) {
  const explicit = first(args, ['output-dir','outputDir']);
  if (explicit) return path.resolve(String(explicit));
  const projectDir = path.resolve(String(first(args, ['project-dir','projectDir'], '.')));
  return path.join(projectDir, '00_项目概览', '技能进化');
}
function usage() {
  console.log(`Usage:
  node geo-skill-evolution/scripts/evolve.js --symptom "问题描述" --industry "行业" --project-dir 项目_示例品牌GEO
  node geo-skill-evolution/scripts/evolve.js --symptom "发布URL误判" --evidence "publication.json,error.log" --severity P0

Options:
  --symptom <text>             新问题/失败现象
  --industry <text>            行业，如 本地生活/B2B/教育/医疗/工业品
  --learner-level <text>       新手/进阶/交付顾问
  --customer-type <text>       客户类型，必须脱敏
  --evidence <files>           证据文件，逗号/换行分隔
  --severity <P0|P1|P2|P3>     默认自动判断
  --target-skill <name>        人工指定目标技能
  --project-dir <dir>          输出到 00_项目概览/技能进化/
  --output-dir <dir>           自定义输出目录
  --json-out <file>            另存 JSON
`);
}
function redact(text) {
  return String(text || '')
    .replace(/Bearer\s+[A-Za-z0-9._-]{12,}/g, 'Bearer ****')
    .replace(/openKey["'\s:=]+[A-Za-z0-9._-]{12,}/gi, 'openKey: ****')
    .replace(/https?:\/\/[^\s)"']*oss-cn-[^\s)"']*aliyuncs\.com\/[^\s)"']+/gi, '<OSS_IMAGE_URL>')
    .replace(/https?:\/\/[^\s)"']*\/v1\//g, '[BaseURL]/v1/')
    .replace(/https?:\/\/(nbgeo\.aimusiclj\.com|geo\.zqsdai\.com)[^\s)"']*/gi, '<INTERNAL_GEO_URL>')
    .replace(/\/Users\/[^\s)"']+/g, '<LOCAL_PATH>')
    .replace(/\/home\/ubuntu\/[^\s)"']+/g, '<SERVER_PATH>')
    .slice(0, 1500);
}
function displayEvidenceName(file) {
  return redact(path.basename(String(file || '')) || 'evidence');
}
function readEvidence(files) {
  return files.map(file => {
    const abs = path.resolve(file);
    let excerpt = '';
    try { excerpt = redact(fs.readFileSync(abs, 'utf8')); } catch { excerpt = ''; }
    return { file: displayEvidenceName(file), exists: fs.existsSync(abs), excerpt };
  });
}
function includesAny(text, words) {
  const s = String(text || '').toLowerCase();
  return words.some(w => s.includes(String(w).toLowerCase()));
}
function classify(ctx) {
  const symptom = String(ctx.symptom || '');
  const evidenceText = ctx.evidence.map(e => e.excerpt).join('\n');
  const hay = `${symptom}\n${evidenceText}`;
  const out = { type: 'workflow-pattern', targetSkills: [], severity: ctx.severity || '' };

  // 分类优先级：先看用户描述的主问题，再看证据。避免 evidence 中的 Authorization/openKey 噪声覆盖真实业务问题。
  const publicationMisjudge = ['发布','publication','publishedurl','publishurl','posturl','platformurl','发布url','图片 url','图片URL','oss','url 误判','url误判','把图片','published url'];
  const authInSymptom = ['openkey','referer','companyid','productid','配置','认证','鉴权','401','403','unauthorized','forbidden'];
  const authPrimaryEvidence = /(^|\n).{0,80}(401|403|unauthorized|forbidden|鉴权失败|认证失败|invalid\s*openkey).{0,120}/i.test(evidenceText);

  if (includesAny(symptom, publicationMisjudge)) {
    out.type = 'script-fix';
    out.targetSkills = ['geo-publish','geo-indexing','geo-troubleshooter'];
  } else if (includesAny(symptom, authInSymptom) || authPrimaryEvidence) {
    out.type = 'troubleshooting-rule';
    out.targetSkills = ['geo-config','geo-runtime','geo-troubleshooter'];
  } else if (includesAny(hay, ['发布','publication','publishedurl','publishurl','posturl','platformurl','人工处理'])) {
    out.type = 'script-fix';
    out.targetSkills = ['geo-publish','geo-indexing','geo-troubleshooter'];
  } else if (includesAny(hay, ['收录','answers','matrix','searchedsites','articleindexed'])) {
    out.type = 'script-fix';
    out.targetSkills = ['geo-indexing','geo-source-assets','geo-analysis'];
  } else if (includesAny(hay, ['上传','upload_article','summaries','封面','oss','图片'])) {
    out.type = 'script-fix';
    out.targetSkills = ['geo-article','geo-content-production'];
  } else if (includesAny(hay, ['竞品','引用源','信源','source asset'])) {
    out.type = 'industry-playbook';
    out.targetSkills = ['geo-source-assets','geo-analysis','geo-content-production'];
  } else if (includesAny(hay, ['不知道','不会用','触发不到','路由','新手'])) {
    out.type = 'routing-update';
    out.targetSkills = ['geo-workflow-hub','geo-hub','geo-troubleshooter'];
  } else out.targetSkills = ['geo-workflow-hub','geo-troubleshooter'];
  if (ctx.targetSkill) out.targetSkills = [ctx.targetSkill];
  if (!out.severity) {
    if (includesAny(hay, ['误判','错误结论','泄露','base url','发布url','publishedurl','p0']) || includesAny(symptom, ['openkey'])) out.severity = 'P0';
    else if (includesAny(hay, ['失败','不兼容','人工处理','p1'])) out.severity = 'P1';
    else if (includesAny(hay, ['优化','增强','行业差异','p2'])) out.severity = 'P2';
    else out.severity = 'P3';
  }
  return out;
}

function suggestedFiles(cls) {
  const files = [];
  if (cls.targetSkills.includes('geo-publish')) files.push('geo-publish/scripts/publication_status.js');
  if (cls.targetSkills.includes('geo-indexing')) files.push('geo-indexing/scripts/published_url_match.js', 'geo-indexing/scripts/scheduled_indexing.js');
  if (cls.targetSkills.includes('geo-troubleshooter')) files.push('geo-troubleshooter/scripts/troubleshoot.js');
  if (cls.targetSkills.includes('geo-runtime')) files.push('geo-runtime/scripts/doctor.js', 'geo-runtime/scripts/regression_publication_chain.js');
  if (cls.targetSkills.includes('geo-config')) files.push('geo-config/SKILL.md', 'geo-config/scripts/setup_defaults.js');
  if (cls.targetSkills.includes('geo-article')) files.push('geo-article/scripts/upload_article.js');
  if (cls.targetSkills.includes('geo-content-production')) files.push('geo-content-production/SKILL.md', 'geo-content-production/scripts/generate_image.js');
  if (cls.targetSkills.includes('geo-source-assets')) files.push('geo-source-assets/scripts/source_assets.js');
  if (cls.targetSkills.includes('geo-analysis')) files.push('geo-analysis/SKILL.md');
  if (cls.targetSkills.includes('geo-workflow-hub')) files.push('geo-workflow-hub/SKILL.md');
  if (cls.targetSkills.includes('geo-hub')) files.push('geo-hub/SKILL.md');
  files.push('GEO-SKILLS-EXECUTION-PROTOCOL.md', 'QUICK_COMMANDS.md');
  return [...new Set(files)];
}
function suggestedTestFiles(cls) {
  const tests = [];
  if (cls.targetSkills.includes('geo-publish') || cls.targetSkills.includes('geo-indexing')) {
    tests.push('fixtures/publication/raw_publication_mixed_url.json');
    tests.push('fixtures/indexing/answers_url_match_sample.json');
    tests.push('geo-runtime/scripts/regression_publication_chain.js');
  }
  if (cls.targetSkills.includes('geo-troubleshooter')) tests.push('fixtures/troubleshooter/publication_not_finished.json');
  if (cls.targetSkills.includes('geo-source-assets')) tests.push('fixtures/source-assets/answers_searched_sites_sample.json');
  return [...new Set(tests)];
}

function recommendations(ctx, cls) {
  const rec = [];
  if (cls.type === 'script-fix') rec.push('优先补脚本确定性逻辑，并增加固定样例测试，避免只改文档。');
  if (cls.targetSkills.includes('geo-publish')) rec.push('发布链路问题要严格区分 articleId、publishedUrl、OSS 图片 URL 和人工处理状态。');
  if (cls.targetSkills.includes('geo-indexing')) rec.push('收录链路问题要区分 exact_url_hit、weak_title_account_hit、not_hit、pending，不得把弱命中当精确收录。');
  if (cls.type === 'routing-update') rec.push('把用户常见说法加入目标技能 description 和 hub 路由表。');
  if (cls.type === 'troubleshooting-rule') rec.push('把判断条件沉淀到 geo-troubleshooter，输出问题/原因/证据/下一步/人工确认。');
  if (cls.type === 'industry-playbook') rec.push('沉淀行业关键词、典型信源、竞品出现模式和内容补强打法，注意脱敏。');
  if (cls.severity === 'P0') rec.push('P0 必须先修复并跑回归测试后再给学员使用。');
  rec.push('所有公开示例使用 示例品牌A/竞品A，不写真实客户名。');
  return rec;
}
function regressionTests(ctx, cls) {
  const tests = [];
  tests.push('node geo-runtime/scripts/doctor.js --json');
  if (cls.targetSkills.includes('geo-publish')) tests.push('node geo-publish/scripts/publication_status.js --article-ids <样例文章ID> --project-dir /tmp/geo-evolution-test');
  if (cls.targetSkills.includes('geo-indexing')) tests.push('node geo-indexing/scripts/published_url_match.js --publication-json publication_status.json --answers-json answers.json --project-dir /tmp/geo-evolution-test');
  if (cls.targetSkills.includes('geo-troubleshooter')) tests.push('node geo-troubleshooter/scripts/troubleshoot.js --symptom "样例问题" --project-dir /tmp/geo-evolution-test');
  if (cls.targetSkills.includes('geo-source-assets')) tests.push('node geo-source-assets/scripts/source_assets.js --action import --answers-json answers.json --project-dir /tmp/geo-evolution-test --owned-brands 示例品牌A');
  tests.push('rg -n "/Users/|/home\\/ubuntu|Bearer\\s+[A-Za-z0-9._-]{12,}|openKey[:=]\\s*[A-Za-z0-9._-]{12,}|真实客户|客户A|客户项目|nbgeo|aimusiclj|bihuogeo\\.oss" geo-* || true');
  return [...new Set(tests)];
}
function csvEscape(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function appendBacklog(file, record) {
  const fields = ['date','severity','type','industry','learnerLevel','targetSkills','symptom','status'];
  const exists = fs.existsSync(file);
  const line = fields.map(f => csvEscape(Array.isArray(record[f]) ? record[f].join('|') : record[f])).join(',') + '\n';
  if (!exists) fs.writeFileSync(file, fields.join(',') + '\n', 'utf8');
  fs.appendFileSync(file, line, 'utf8');
}
function renderMd(record) {
  const lines = ['# GEO 技能自进化记录', '', `时间：${record.createdAt}`, ''];
  lines.push('## 新问题是什么', '', record.symptom || '(未填写)', '');
  lines.push('## 影响哪些用户/行业', '', `- 行业：${record.industry || '未指定'}`, `- 学员水平：${record.learnerLevel || '未指定'}`, `- 客户类型：${record.customerType || '未指定/已脱敏'}`, '');
  lines.push('## 根因假设', '', `- 类型：${record.type}`, `- 严重级别：${record.severity}`, '');
  lines.push('## 应该沉淀到哪个技能', '', ...record.targetSkills.map(s => `- ${s}`), '');
  lines.push('## 需要改什么', '', ...record.recommendations.map(x => `- ${x}`), '');
  if (record.suggestedFiles?.length) lines.push('## 建议修改文件', '', ...record.suggestedFiles.map(x => `- ${x}`), '');
  if (record.suggestedTestFiles?.length) lines.push('## 建议新增/更新测试', '', ...record.suggestedTestFiles.map(x => `- ${x}`), '');
  lines.push('## 回归测试怎么做', '', ...record.regressionTests.map(x => `- \`${x}\``), '');
  lines.push('## 发布前验收', '', '- dry-run 发布脚本安全扫描通过', '- 不暴露 Base URL、真实 openKey、真实客户名', '- 对应 P0/P1 样例测试通过', '- 更新 QUICK_COMMANDS / 执行协议 / doctor（如需要）', '');
  lines.push('## 是否需要人工确认', '', record.severity === 'P0' ? '需要：P0 修复方案和验收结果应由负责人确认后再发布给学员。' : '视情况：涉及真实客户案例、竞品话术或写操作时需要确认。', '');
  if (record.evidence.length) {
    lines.push('## 证据文件', '');
    record.evidence.forEach(e => lines.push(`- ${e.file}：${e.exists ? '已读取' : '未找到'}`));
  }
  return lines.join('\n');
}
function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const evidenceFiles = splitList(first(args, ['evidence','evidence-files','evidenceFiles'], ''));
  const ctx = {
    symptom: String(first(args, ['symptom','problem','case'], args._.join(' '))).trim(),
    industry: String(first(args, ['industry'], '')).trim(),
    learnerLevel: String(first(args, ['learner-level','learnerLevel'], '')).trim(),
    customerType: String(first(args, ['customer-type','customerType'], '')).trim(),
    severity: String(first(args, ['severity'], '')).trim().toUpperCase(),
    targetSkill: String(first(args, ['target-skill','targetSkill'], '')).trim(),
    evidence: readEvidence(evidenceFiles),
  };
  if (!ctx.symptom) throw new Error('请提供 --symptom。');
  const cls = classify(ctx);
  const record = {
    createdAt: nowIso(),
    date: today(),
    symptom: redact(ctx.symptom),
    industry: redact(ctx.industry),
    learnerLevel: redact(ctx.learnerLevel),
    customerType: redact(ctx.customerType),
    severity: cls.severity,
    type: cls.type,
    targetSkills: cls.targetSkills,
    recommendations: recommendations(ctx, cls),
    suggestedFiles: suggestedFiles(cls),
    suggestedTestFiles: suggestedTestFiles(cls),
    regressionTests: regressionTests(ctx, cls),
    evidence: ctx.evidence,
    status: 'proposed',
  };
  const dir = outputDir(args);
  ensureDir(dir);
  const base = `geo_skill_evolution_${stamp()}`;
  const files = {
    md: path.join(dir, `${base}.md`),
    json: path.join(dir, `${base}.json`),
    backlog: path.join(dir, 'skill_evolution_backlog.csv'),
    tests: path.join(dir, 'regression_test_plan.md'),
  };
  fs.writeFileSync(files.md, renderMd(record), 'utf8');
  fs.writeFileSync(files.json, JSON.stringify(record, null, 2), 'utf8');
  appendBacklog(files.backlog, record);
  fs.writeFileSync(files.tests, ['# GEO 技能回归测试清单', '', `更新时间：${nowIso()}`, '', ...record.regressionTests.map(x => `- [ ] \`${x}\``), ''].join('\n'), 'utf8');
  const jsonOut = first(args, ['json-out','jsonOut']);
  if (jsonOut) { ensureDir(path.dirname(path.resolve(jsonOut))); fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ record, files }, null, 2), 'utf8'); }
  console.log(JSON.stringify({ action: 'geo-skill-evolution', severity: record.severity, type: record.type, targetSkills: record.targetSkills, files }, null, 2));
}
main();
