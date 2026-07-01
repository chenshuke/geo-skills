#!/usr/bin/env node
/**
 * GEO project path resolver (Node/no-Python).
 *
 * Ensures the standard 8-directory GEO project structure and returns the
 * correct output path for common artifacts. Intended for all geo-* skills so
 * files are written to the right place at creation time, not cleaned up later.
 */
const fs = require('fs');
const path = require('path');

const STANDARD_DIRS = [
  '00_项目概览',
  '01_项目资料',
  '02_知识库',
  '03_规划方案',
  '04_内容创作',
  '05_质量审核',
  '06_发布记录',
  '07_监测分析',
];

function today() { return new Date().toISOString().slice(0, 10); }
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
  node geo-content-archive/scripts/project_paths.js --project-dir 项目_品牌GEO --ensure
  node geo-content-archive/scripts/project_paths.js --project-dir 项目_品牌GEO --artifact article --filename 文章.md
  node geo-content-archive/scripts/project_paths.js --project-dir 项目_品牌GEO --artifact cover --filename cover_01.png

Options:
  --project-dir <dir>     GEO project root; default current directory
  --artifact <type>       Artifact type, see list below
  --filename <name>       Optional output filename
  --batch <YYYY-MM-DD>    Batch date for content outputs; default today
  --ensure                Ensure standard project directories and common subdirs
  --dry-run               Print paths but do not create directories
  --json                  Output JSON

Artifact types:
  overview, dashboard, troubleshooting, brand-positioning, raw-material, knowledge, supplement-list,
  keyword-plan, keyword-map, title-plan, tracking-table,
  article, optimized-article, cover, image, cover-mapping, compliant-list,
  audit-consistency, audit-media, audit-ai, audit-coverage, audit-gap, audit-quality,
  publish-record, publication-status, indexing-report, published-url-match, evidence-report, source-assets, pdca-report, platform-profile,
  industry-insight, screenshot, unknown
`);
}
function safeJoin(root, rel) { return path.join(root, ...String(rel).split('/')); }
function artifactDir(artifact, batch) {
  const b = batch || today();
  const map = {
    'overview': '00_项目概览',
    'dashboard': '00_项目概览',
    'troubleshooting': '00_项目概览/故障排查',
    'brand-positioning': '00_项目概览/品牌定位',
    'raw-material': '01_项目资料',
    'knowledge': '02_知识库',
    'supplement-list': '02_知识库',
    'keyword-plan': '03_规划方案/关键词方案',
    'keyword-map': '03_规划方案',
    'title-plan': '03_规划方案/标题方案',
    'tracking-table': '03_规划方案',
    'article': `04_内容创作/${b}/articles`,
    'optimized-article': `04_内容创作/${b}/optimized`,
    'cover': `04_内容创作/${b}/covers`,
    'image': `04_内容创作/${b}/images`,
    'cover-mapping': `04_内容创作/${b}/covers`,
    'compliant-list': '04_内容创作/合规榜单',
    'audit-consistency': '05_质量审核/一致性审核',
    'audit-media': '05_质量审核/媒体投稿审核',
    'audit-ai': '05_质量审核/AI识别检测',
    'audit-coverage': '05_质量审核/覆盖度分析',
    'audit-gap': '05_质量审核/缺口分析',
    'audit-quality': '05_质量审核/内容质量报告',
    'publish-record': '06_发布记录',
    'publication-status': '06_发布记录/发布状态回查',
    'indexing-report': '07_监测分析/收录监测',
    'published-url-match': '07_监测分析/收录监测/URL命中回查',
    'evidence-report': '07_监测分析/证据链分析',
    'source-assets': '07_监测分析/引用源资产库',
    'pdca-report': '07_监测分析/PDCA对比',
    'platform-profile': '07_监测分析/平台画像',
    'industry-insight': '07_监测分析/行业洞察',
    'screenshot': '07_监测分析/导出截图',
    'unknown': '00_项目概览/_待分类',
  };
  return map[artifact] || map.unknown;
}
function defaultFilename(artifact) {
  const map = {
    dashboard: '仪表盘.md',
    'keyword-map': '关键词映射表.md',
    'tracking-table': '内容布局跟踪表.md',
    'cover-mapping': 'cover_mapping.json',
  };
  return map[artifact] || '';
}
function ensureDirs(root, dryRun = false) {
  const dirs = new Set(STANDARD_DIRS);
  for (const a of [
    'troubleshooting','brand-positioning','keyword-plan','title-plan','article','optimized-article','cover','image','compliant-list',
    'audit-consistency','audit-media','audit-ai','audit-coverage','audit-gap','audit-quality',
    'publication-status',
    'indexing-report','published-url-match','evidence-report','source-assets','pdca-report','platform-profile','industry-insight','screenshot','unknown'
  ]) dirs.add(artifactDir(a, today()));
  const created = [];
  for (const rel of dirs) {
    const dir = safeJoin(root, rel);
    if (!fs.existsSync(dir)) {
      created.push(rel);
      if (!dryRun) fs.mkdirSync(dir, { recursive: true });
    }
  }
  return created;
}
function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  const projectDir = path.resolve(String(first(args, ['project-dir','projectDir','dir'], '.')));
  const artifact = String(first(args, ['artifact','type'], 'unknown'));
  const batch = String(first(args, ['batch','date'], today()));
  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  const ensure = Boolean(args.ensure || args['ensure-structure'] || args.ensureStructure || args.artifact);
  const created = ensure ? ensureDirs(projectDir, dryRun) : [];
  const relDir = artifactDir(artifact, batch);
  const filename = String(first(args, ['filename','file'], defaultFilename(artifact)) || '');
  const outputDir = safeJoin(projectDir, relDir);
  if (ensure && !dryRun) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = filename ? path.join(outputDir, filename) : outputDir;
  const result = { projectDir, artifact, batch, relativeDir: relDir, outputDir, filename, outputPath, createdDirs: created, dryRun };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('GEO project path');
    console.log('Project:', projectDir);
    console.log('Artifact:', artifact);
    console.log('Output dir:', outputDir);
    if (filename) console.log('Output path:', outputPath);
    if (created.length) console.log(dryRun ? 'Would create:' : 'Created:', created.join(', '));
  }
}
main();
