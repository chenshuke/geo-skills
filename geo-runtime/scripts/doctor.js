#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const args = process.argv.slice(2);
const suite = path.resolve(__dirname, '../..');
const required = [
  'geo-runtime','geo-hub','geo-workflow-hub','geo-student-workflow','geo-config','geo-account','geo-article',
  'geo-indexing','geo-publish','geo-brand','geo-knowledge','geo-keyword-pool','geo-content','geo-content-production',
  'geo-content-audit','geo-content-to-publish-pipeline','geo-content-archive','geo-analysis','geo-source-assets','geo-troubleshooter','geo-skill-evolution'
];
const optional = ['geo-brand-diagnosis'];
const coreScripts = [
  'geo-runtime/scripts/best_geo.js',
  'geo-runtime/scripts/doctor.js',
  'geo-runtime/scripts/json_helpers.js',
  'geo-runtime/scripts/publication_helpers.js',
  'geo-runtime/scripts/regression_publication_chain.js',
  'geo-config/scripts/setup_defaults.js',
  'geo-content-archive/scripts/project_paths.js',
  'geo-keyword-pool/scripts/keyword_pool.js',
  'geo-article/scripts/upload_article.js',
  'geo-article/scripts/delete_articles.js',
  'geo-indexing/scripts/import_questions.js',
  'geo-indexing/scripts/scheduled_indexing.js',
  'geo-indexing/scripts/published_url_match.js',
  'geo-publish/scripts/publication_status.js',
  'geo-content-production/scripts/generate_image.js',
  'geo-content-production/scripts/generate_cover.js',
  'geo-content/scripts/generate_image.js',
  'geo-content/scripts/generate_cover.js',
  'geo-content-to-publish-pipeline/scripts/pipeline.js',
  'geo-source-assets/scripts/source_assets.js',
  'geo-troubleshooter/scripts/troubleshoot.js',
  'geo-skill-evolution/scripts/evolve.js',
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
function cliCheck(args) {
  try {
    const stdout = child_process.execFileSync('best-geo', args, { encoding: 'utf8' }).trim();
    const payload = JSON.parse(stdout);
    return payload.ok === false ? ok('WARN', payload.code || 'CLI check failed') : ok('OK', payload.code || 'CLI ready');
  } catch (e) { return ok('FAIL', String(e.message || e).slice(0, 300)); }
}
function summarizeStatus(items) {
  const fail = items.filter(x => x.status === 'FAIL').length;
  const warn = items.filter(x => x.status === 'WARN').length;
  if (fail) return ok('FAIL', `${fail} failed, ${warn} warnings`);
  if (warn) return ok('WARN', `${warn} warnings`);
  return ok('OK', 'all ok');
}
async function main() {
  const skills = skillStatus(required);
  const optionalSkills = skillStatus(optional);
  const scriptChecks = coreScripts.map(checkScript);
  const hasLark = commandExists('lark-cli');
  const report = {
    runtime: 'node-no-python',
    platform: { os: process.platform, arch: process.arch },
    node: ok(nodeMajor() >= 18 ? 'OK' : 'FAIL', `${process.version}${nodeMajor() < 18 ? ' (Node.js 18+ required)' : ''}`),
    larkCli: ok(hasLark ? 'OK' : 'WARN', hasLark ? 'lark-cli available' : 'lark-cli not found; only Feishu/Lark sync features need it'),
    bestGeoCli: { installed: commandExists('best-geo'), version: cliCheck(['version', '--check']), auth: cliCheck(['auth', 'status']) },
    skills,
    optionalSkills,
    scripts: { ...summarizeStatus(scriptChecks), checks: scriptChecks },
    python: ok('NOT_REQUIRED', 'Python is not used by the current GEO Skills workflow.'),
  };

  if (hasArg('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    const missing = skills.filter(x => !x.exists).map(x => x.name);
    const optionalMissing = optionalSkills.filter(x => !x.exists).map(x => x.name);
    console.log('GEO Skills Doctor (Node / no Python mode)');
    console.log('Platform:', report.platform.os, report.platform.arch);
    console.log('Node:', report.node.status, report.node.message);
    console.log('lark-cli:', report.larkCli.status, report.larkCli.message);
    console.log('Best GEO CLI:', report.bestGeoCli.installed ? 'OK' : 'FAIL', JSON.stringify(report.bestGeoCli));
    console.log('Skills:', missing.length ? 'FAIL' : 'OK', `${skills.length - missing.length}/${skills.length}`, missing.join(', ') || 'all required present');
    if (optionalSkills.length) console.log('Optional skills:', optionalMissing.length ? 'WARN' : 'OK', optionalMissing.join(', ') || 'all optional present');
    console.log('Scripts:', report.scripts.status, report.scripts.message);
    for (const s of scriptChecks.filter(x => x.status !== 'OK')) console.log(`  - ${s.status} ${s.file}: ${s.message}`);
    if (report.api) console.log('API:', report.api.status, report.api.message);
    console.log('Python:', report.python.status, report.python.message);
  }
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
