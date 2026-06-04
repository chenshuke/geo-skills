#!/usr/bin/env node
/**
 * GEO cover generation wrapper.
 *
 * Default path is GEO platform text-to-image (/v1/text-to-img) via
 * generate_image.js. No SVG fallback is used because SVG is not suitable for
 * the publishing chain.
 */
const path = require('path');
const cp = require('child_process');

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
function first(args, names, fallback='') { for (const n of names) if (args[n] !== undefined && args[n] !== '') return args[n]; return fallback; }
function usage() {
  console.log(`Usage:
  node geo-content-production/scripts/generate_cover.js --title "文章标题" [options]

This command generates a cover through GEO /v1/text-to-img. It does not output SVG.

Options:
  --title <text>             文章标题，必填；也可直接传 --prompt
  --subtitle <text>          副标题/补充卖点
  --keywords <text>          关键词，逗号分隔
  --brand <text>             客户品牌/产品名
  --style <text>             commercial | tech | clean | product，默认 commercial
  --aspect-ratio <ratio>     默认 16:9
  --model <v1|v2>            默认 v2
  --output <file>            下载第一张封面到本地 PNG/JPG 文件
  --project-dir <dir>        GEO 项目根目录；未传 output 时自动写入 04_内容创作/{日期}/covers/
  --batch <YYYY-MM-DD>       内容批次日期，默认今天
  --json-out <file>          保存完整结果 JSON
  --dry-run                  只打印 payload，不创建任务

Examples:
  node geo-content-production/scripts/generate_cover.js \\
    --title "2026年GEO优化服务商推荐TOP5" \\
    --brand "必火AI" \\
    --output covers/cover_01.png
`);
}
function buildPrompt(args) {
  const explicit = first(args, ['prompt']);
  if (explicit) return explicit;
  const title = first(args, ['title']);
  if (!title) return '';
  const subtitle = first(args, ['subtitle']);
  const keywords = first(args, ['keywords']);
  const brand = first(args, ['brand', 'product', 'company']);
  const style = first(args, ['style'], 'commercial');
  const styleMap = {
    commercial: '高级商业封面图，现代营销视觉，质感光影，适合公众号文章首图',
    tech: '科技感封面图，深蓝渐变背景，AI数据网络、发光几何元素，专业可信',
    clean: '简洁高级封面图，大留白，轻量几何元素，清晰专业，适合知识型文章',
    product: '品牌产品展示封面图，突出客户品牌产品主体，商业摄影质感',
  };
  const parts = [
    `为GEO文章生成横版封面图，文章标题：${title}`,
    brand ? `客户品牌/产品：${brand}` : '',
    subtitle ? `副标题/核心卖点：${subtitle}` : '',
    keywords ? `关键词：${keywords}` : '',
    styleMap[style] || style,
    '画面要求：16:9 横版构图，适合公众号/网页文章首图，专业、可信、干净，有明确视觉中心',
    '不要出现乱码文字，不要水印，不要二维码，不要竞品品牌 logo，不要夸张标题党风格',
  ].filter(Boolean);
  return parts.join('；');
}

const args = parseArgs(process.argv);
if (args.help || args.h) { usage(); process.exit(0); }
const prompt = buildPrompt(args);
if (!prompt) { usage(); process.exit(1); }

const target = path.resolve(__dirname, 'generate_image.js');
const forwarded = ['--prompt', prompt];
const passthrough = [
  ['negative-prompt','negative-prompt'], ['negativePrompt','negativePrompt'],
  ['resolution','resolution'], ['num','num'], ['n','n'],
  ['aspect-ratio','aspect-ratio'], ['aspectRatio','aspectRatio'],
  ['model','model'], ['product-id','product-id'], ['productId','productId'],
  ['company-id','company-id'], ['companyId','companyId'],
  ['geo-config','geo-config'], ['config','config'],
  ['timeout-ms','timeout-ms'], ['interval-ms','interval-ms'], ['max-interval-ms','max-interval-ms'],
  ['output','output'], ['output-dir','output-dir'], ['project-dir','project-dir'], ['projectDir','projectDir'], ['batch','batch'], ['date','date'], ['json-out','json-out'],
];
for (const [src, dest] of passthrough) if (args[src] !== undefined && args[src] !== true && args[src] !== false) forwarded.push(`--${dest}`, String(args[src]));
if (args.model === undefined) forwarded.push('--model', 'v2');
if (args['aspect-ratio'] === undefined && args.aspectRatio === undefined) forwarded.push('--aspect-ratio', '16:9');
if (args['project-dir'] !== undefined || args.projectDir !== undefined) forwarded.push('--artifact', 'cover');
if (args['dry-run'] || args.dryRun) forwarded.push('--dry-run');
if (args.wait === false) forwarded.push('--no-wait');
if (args['translate-url'] === false || args.translateUrl === false) forwarded.push('--no-translate-url');

const result = cp.spawnSync(process.execPath, [target, ...forwarded], { stdio: 'inherit' });
if (result.error) {
  console.error(result.error.message || result.error);
  process.exit(1);
}
process.exit(result.status ?? 0);
