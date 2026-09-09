#!/usr/bin/env node
/** Upload search questions or create a Scheduled Indexing plan through Best GEO CLI. */
const fs = require('fs');
const path = require('path');
const { plan, apply } = require('../../geo-runtime/scripts/best_geo.js');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) { out._.push(token); continue; }
    const raw = token.slice(2); const eq = raw.indexOf('=');
    const key = eq >= 0 ? raw.slice(0, eq) : raw;
    const value = eq >= 0 ? raw.slice(eq + 1) : (!argv[i + 1] || argv[i + 1].startsWith('--') ? true : argv[++i]);
    out[key] = value;
  }
  return out;
}
function first(args, names, fallback) { for (const n of names) if (args[n] !== undefined && args[n] !== '') return args[n]; return fallback; }
function split(v) { return String(v || '').split(/[,，|\n]/).map(x => x.trim()).filter(Boolean); }
function ints(v) { return split(v).map(Number).filter(Number.isInteger); }
function bool(v, fallback) { if (v === undefined) return fallback; return /^(1|true|yes|y|on)$/i.test(String(v)); }
function clean(line) {
  return String(line).replace(/^\s*>+\s*/, '').replace(/^\s*[-*+]\s+/, '').replace(/^\s*\d+[.)、]\s+/, '').replace(/^#{1,6}\s+/, '').trim();
}
function readQuestions(args) {
  let rows = [];
  const file = first(args, ['file']);
  if (file) {
    const abs = path.resolve(String(file));
    const buf = fs.readFileSync(abs); let text = buf.toString('utf8').replace(/^\uFEFF/, '');
    if (text.includes('\uFFFD')) throw new Error(`文件不是有效 UTF-8：${abs}`);
    const ext = path.extname(abs).toLowerCase();
    if (ext === '.json') {
      const raw = JSON.parse(text); const arr = Array.isArray(raw) ? raw : raw.questions || raw.data || [];
      rows.push(...arr.map(x => typeof x === 'string' ? x : x.question || x.topic || x.query || ''));
    } else {
      rows.push(...text.split(/\r?\n/).map(clean).filter(x => x && !/^\|?\s*:?-{2,}/.test(x)));
    }
  }
  const one = first(args, ['question']); if (one) rows.push(String(one));
  rows.push(...split(first(args, ['questions'], '')));
  const seen = new Set(); const result = [];
  for (const row of rows) {
    const q = String(row).replace(/\s+/g, ' ').trim(); const key = q.toLowerCase();
    if (q && !seen.has(key)) { seen.add(key); result.push(q); }
  }
  return result.slice(0, Math.min(100, Number(first(args, ['limit'], 100)) || 100));
}
function scheduleConfig(args) {
  const type = String(first(args, ['schedule-type', 'scheduleType'], 'once'));
  const cfg = { type };
  const hours = ints(first(args, ['hours'], '')); if (hours.length) cfg.hours = hours;
  const weekdays = ints(first(args, ['weekdays'], '')); if (weekdays.length) cfg.weekdays = weekdays;
  const timesPerDay = Number(first(args, ['times-per-day', 'timesPerDay'], 0)); if (timesPerDay) cfg.timesPerDay = timesPerDay;
  const intervalDays = Number(first(args, ['interval-days', 'intervalDays'], 0)); if (intervalDays) cfg.intervalDays = intervalDays;
  const timesPerCycle = Number(first(args, ['times-per-cycle', 'timesPerCycle'], 0)); if (timesPerCycle) cfg.timesPerCycle = timesPerCycle;
  return cfg;
}
function usage() {
  console.log(`Usage:
  node import_questions.js --target questions --file questions.md --product-id 93 --dry-run
  node import_questions.js --target scheduled-indexing --file questions.md --company-id 101 --product-id 93 --platforms doubao --dry-run

Targets:
  questions           使用 questions.create 上传搜索问题
  scheduled-indexing  使用 scheduledIndexing.create 创建监测计划

写操作先用 --dry-run；确认后再加 --force。`);
}
async function execute(capability, input, dryRun) {
  if (dryRun) return { dryRun: true, capability, input };
  const prepared = await plan(capability, input); const planId = prepared?.data?.planId || prepared?.planId;
  if (!planId) throw new Error('CLI 未返回 planId');
  return apply(planId);
}
async function main() {
  const args = parseArgs(process.argv); if (args.help || args.h) return usage();
  const target = String(first(args, ['target'], 'questions'));
  if (!['questions', 'scheduled-indexing'].includes(target)) throw new Error('只支持 --target questions 或 scheduled-indexing。');
  const questions = readQuestions(args); if (!questions.length) throw new Error('没有读取到搜索问题。');
  const productId = Number(first(args, ['product-id', 'productId'], 0)); if (!productId) throw new Error('缺少 --product-id。');
  const dryRun = Boolean(args['dry-run'] || args.dryRun); if (!dryRun && !args.force) throw new Error('真实写入前请先 --dry-run，确认后添加 --force。');
  let capability; let input;
  if (target === 'questions') {
    capability = 'questions.create'; input = { productId, questions };
    const tags = split(first(args, ['tags'], '')); if (tags.length) input.tags = tags;
  } else {
    const companyId = Number(first(args, ['company-id', 'companyId'], 0)); if (!companyId) throw new Error('Scheduled Indexing 缺少 --company-id。');
    capability = 'scheduledIndexing.create';
    input = {
      name: String(first(args, ['name'], `定时收录-${new Date().toISOString().slice(0, 10)}`)), companyId, productId,
      topics: questions, platforms: split(first(args, ['platforms'], 'doubao')), source: Number(first(args, ['source'], 1)),
      scheduleConfig: scheduleConfig(args), enabled: bool(first(args, ['enabled'], undefined), true),
    };
    const screenshots = split(first(args, ['screenshot-platforms', 'screenshotPlatforms'], '')); if (screenshots.length) input.screenshotPlatforms = screenshots;
    const competitors = split(first(args, ['competitor-brands', 'competitorBrands'], '')); if (competitors.length) input.competitorBrands = competitors;
  }
  const result = await execute(capability, input, dryRun);
  const output = { target, count: questions.length, result };
  const jsonOut = first(args, ['json-out', 'jsonOut']); if (jsonOut) { const abs = path.resolve(String(jsonOut)); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, JSON.stringify(output, null, 2), 'utf8'); }
  console.log(JSON.stringify(output, null, 2));
}
main().catch(error => { console.error(error.message || error); process.exit(1); });
