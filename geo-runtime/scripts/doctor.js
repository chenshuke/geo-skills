#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { configPath, loadGeoConfig, ensureConfig, mask, headers } = require('./credentials.js');

const args = process.argv.slice(2);
const suite = path.resolve(__dirname, '../..');
const required = [
  'geo-runtime','geo-hub','geo-workflow-hub','geo-config','geo-account','geo-article',
  'geo-indexing','geo-publish','geo-brand','geo-knowledge','geo-content','geo-content-production',
  'geo-content-audit','geo-content-to-publish-pipeline','geo-content-archive','geo-analysis'
];
const optional = ['geo-brand-diagnosis'];
const coreScripts = [
  'geo-runtime/scripts/credentials.js',
  'geo-runtime/scripts/api_request.js',
  'geo-runtime/scripts/doctor.js',
  'geo-config/scripts/setup_defaults.js',
  'geo-content-archive/scripts/project_paths.js',
  'geo-article/scripts/upload_article.js',
  'geo-article/scripts/delete_articles.js',
  'geo-indexing/scripts/import_questions.js',
  'geo-indexing/scripts/scheduled_indexing.js',
  'geo-content-production/scripts/generate_image.js',
  'geo-content-production/scripts/generate_cover.js',
  'geo-content/scripts/generate_image.js',
  'geo-content/scripts/generate_cover.js',
  'geo-content-to-publish-pipeline/scripts/pipeline.js',
  'geo-brand-diagnosis/scripts/render_geo_brand_diagnosis.js',
];
function ok(status, message, extra) { return extra ? { status, message, ...extra } : { status, message }; }
function nodeMajor() { return Number(process.versions.node.split('.')[0] || 0); }
function hasArg(name) { return args.includes(name); }
function commandExists(cmd) {
  const isWin = process.platform === 'win32';
  const probes = isWin ? [['where', [cmd]], [cmd, ['--version']]] : [['sh', ['-lc', `command -v ${cmd}`]], [cmd, ['--version']]];
  for (const [file, probeArgs] of probes) {
    try { child_process.execFileSync(file, probeArgs, { stdio: 'ignore' }); return true; } catch {}
  }
  return false;
}
function skillStatus(names) { return names.map(name => ({ name, exists: fs.existsSync(path.join(suite, name, 'SKILL.md')) })); }
function checkScript(rel) {
  const file = path.join(suite, rel);
  if (!fs.existsSync(file)) return { file: rel, status: 'WARN', message: 'missing' };
  try {
    child_process.execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    return { file: rel, status: 'OK', message: 'syntax ok' };
  } catch (e) {
    return { file: rel, status: 'FAIL', message: String(e.stderr || e.message).slice(0, 500) };
  }
}
function configHealth(cfg) {
  const problems = [];
  if (!cfg.geo.baseUrl) problems.push('platform endpoint empty');
  if (!cfg.geo.openKey) problems.push('openKey empty');
  if (!cfg.geo.referer) problems.push('referer empty');
  if (!Number(cfg.defaults.companyId)) problems.push('defaults.companyId is 0/empty');
  if (!Number(cfg.defaults.productId)) problems.push('defaults.productId is 0/empty');
  return ok(problems.length ? 'WARN' : 'OK', problems.length ? problems.join('; ') : 'config ready');
}
async function request(cfg, apiPath) {
  const base = String(cfg.geo.baseUrl || '').replace(/\/$/, '');
  const res = await fetch(`${base}${apiPath}`, { headers: headers(cfg) });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}
async function apiHealth(cfg) {
  if (!cfg.geo.openKey) return ok('SKIP', 'openKey empty');
  const checks = [];
  try {
    const company = await request(cfg, '/v1/geo-company?page=1&limit=1');
    checks.push({ name: 'geo-company', httpStatus: company.status, ok: company.ok });
    if (!company.ok) return ok('WARN', `geo-company HTTP ${company.status}`, { checks });
    if (Number(cfg.defaults.companyId)) {
      const product = await request(cfg, `/v1/geo-product?page=1&limit=1&companyId=${encodeURIComponent(cfg.defaults.companyId)}`);
      checks.push({ name: 'geo-product', httpStatus: product.status, ok: product.ok });
      if (!product.ok) return ok('WARN', `geo-product HTTP ${product.status}`, { checks });
    }
    return ok('OK', 'API reachable', { checks });
  } catch (e) {
    return ok('FAIL', e.message, { checks });
  }
}
function summarizeStatus(items) {
  const fail = items.filter(x => x.status === 'FAIL').length;
  const warn = items.filter(x => x.status === 'WARN').length;
  if (fail) return ok('FAIL', `${fail} failed, ${warn} warnings`);
  if (warn) return ok('WARN', `${warn} warnings`);
  return ok('OK', 'all ok');
}
async function main() {
  if (hasArg('--init-config')) console.log('Config template:', ensureConfig());
  const cfg = loadGeoConfig();
  const skills = skillStatus(required);
  const optionalSkills = skillStatus(optional);
  const scriptChecks = coreScripts.map(checkScript);
  const hasLark = commandExists('lark-cli');
  const report = {
    runtime: 'node-no-python',
    platform: { os: process.platform, arch: process.arch, homeConfig: configPath() },
    node: ok(nodeMajor() >= 18 ? 'OK' : 'FAIL', `${process.version}${nodeMajor() < 18 ? ' (Node.js 18+ required)' : ''}`),
    larkCli: ok(hasLark ? 'OK' : 'WARN', hasLark ? 'lark-cli available' : 'lark-cli not found; only Feishu/Lark sync features need it'),
    config: {
      ...configHealth(cfg),
      path: configPath(),
      exists: fs.existsSync(configPath()),
      openKey: mask(cfg.geo.openKey),
      platformConfigured: Boolean(cfg.geo.baseUrl),
      referer: cfg.geo.referer,
      defaults: cfg.defaults,
    },
    skills,
    optionalSkills,
    scripts: { ...summarizeStatus(scriptChecks), checks: scriptChecks },
    python: ok('OPTIONAL', 'Python is no longer required for core GEO Skills. Legacy .py wrappers are compatibility only.'),
  };
  if (hasArg('--check-api')) report.api = await apiHealth(cfg);

  if (hasArg('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    const missing = skills.filter(x => !x.exists).map(x => x.name);
    const optionalMissing = optionalSkills.filter(x => !x.exists).map(x => x.name);
    console.log('GEO Skills Doctor (Node / no Python mode)');
    console.log('Platform:', report.platform.os, report.platform.arch);
    console.log('Node:', report.node.status, report.node.message);
    console.log('lark-cli:', report.larkCli.status, report.larkCli.message);
    console.log('Config:', report.config.status, report.config.path, 'openKey=', report.config.openKey, 'defaults=', JSON.stringify(report.config.defaults));
    console.log('Skills:', missing.length ? 'FAIL' : 'OK', `${skills.length - missing.length}/${skills.length}`, missing.join(', ') || 'all required present');
    if (optionalSkills.length) console.log('Optional skills:', optionalMissing.length ? 'WARN' : 'OK', optionalMissing.join(', ') || 'all optional present');
    console.log('Scripts:', report.scripts.status, report.scripts.message);
    for (const s of scriptChecks.filter(x => x.status !== 'OK')) console.log(`  - ${s.status} ${s.file}: ${s.message}`);
    if (report.api) console.log('API:', report.api.status, report.api.message);
    console.log('Python:', report.python.status, report.python.message);
    if (report.config.status !== 'OK') {
      console.log('Next:', '运行 `node geo-runtime/scripts/doctor.js --init-config` 创建模板，并通过 geo-config 设置 openKey/companyId/productId。');
    }
  }
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
