#!/usr/bin/env node
/*
 * Upgrade GEO Skills atomically for Codex/Claude-compatible clients.
 * Default mode is a dry-run. Use --apply to mutate local skill directories.
 * This script never reads, copies, or migrates platform credentials.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const HOME = os.homedir();
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const minimumCliVersion = '2.0.4';

function supportedVersion(value) {
  const actual = String(value || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!actual) return false;
  const minimum = minimumCliVersion.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (Number(actual[i + 1]) !== minimum[i]) return Number(actual[i + 1]) > minimum[i];
  }
  return true;
}

function parseArgs(argv) {
  const out = { apply: false, json: false, installCli: true, targets: ['codex', 'claude'], targetDirs: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--json') out.json = true;
    else if (a === '--no-cli-install') out.installCli = false;
    else if (a === '--source-dir') out.sourceDir = argv[++i];
    else if (a === '--backup-dir') out.backupDir = argv[++i];
    else if (a === '--targets') out.targets = String(argv[++i] || '').split(',').map(x => x.trim()).filter(Boolean);
    else if (a === '--target-dir') out.targetDirs.push(argv[++i]);
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`未知参数：${a}`);
  }
  return out;
}

function usage() {
  return `用法：
  node upgrade-geo-skills.js                 # 预演，不修改文件
  node upgrade-geo-skills.js --apply         # 备份后执行升级
  node upgrade-geo-skills.js --apply --targets codex,claude,agents
  node upgrade-geo-skills.js --apply --target-dir /path/to/skills
  node upgrade-geo-skills.js --apply --no-cli-install  # 离线环境，跳过 CLI 安装

默认目标：~/.codex/skills、~/.claude/skills
可选目标：codex、claude、agents、openclaw，或重复传入 --target-dir。
`;
}

function detectCli() {
  const command = process.platform === 'win32' ? 'best-geo.cmd' : 'best-geo';
  const result = cp.spawnSync(command, ['version'], { encoding: 'utf8', timeout: 15000 });
  if (result.error?.code === 'ENOENT') return { installed: false, command, supported: false };
  if (result.error) throw new Error(`CLI 本机检测失败，不会自动重装：${result.error.message}`);
  let payload;
  try { payload = JSON.parse(result.stdout); }
  catch { throw new Error('CLI 已存在但返回内容无法解析，不会自动重装；请先检查 best-geo version。'); }
  const version = payload?.data?.version || payload?.data?.current;
  if (result.status !== 0 || !payload.ok || !version) throw new Error(`CLI 本机检测异常（${payload.code || 'UNKNOWN'}），不会自动重装。`);
  return { installed: true, supported: supportedVersion(version), version, command };
}

function installCli() {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.error('Best GEO CLI 缺失或版本过旧，正在安装 best-geo@latest...');
  cp.execFileSync(npm, ['install', '--global', 'best-geo@latest'], { stdio: ['ignore', 2, 2] });
  const result = detectCli();
  if (!result.installed || !result.supported) throw new Error(`CLI 安装后检测未通过，需要 ${minimumCliVersion}+。`);
  return result;
}

function expand(p) {
  return path.resolve(String(p).replace(/^~(?=$|[\\/])/, HOME));
}

function managedDirs(sourceDir) {
  return fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && (e.name === 'best-geo' || /^geo-[a-z0-9-]+$/i.test(e.name)))
    .map(e => e.name)
    .sort();
}

function targetMap() {
  return {
    codex: path.join(HOME, '.codex', 'skills'),
    claude: path.join(HOME, '.claude', 'skills'),
    agents: path.join(HOME, '.agents', 'skills'),
    openclaw: path.join(HOME, '.openclaw', 'skills'),
  };
}

function knownLegacyPaths() {
  return [
    path.join(HOME, '.openclaw', 'workspace-di', 'skills', 'geo-topic-expand'),
    path.join(HOME, '.hermes', 'profiles', 'hermes-di', 'skills', 'geo-topic-expand'),
  ];
}

function existingManaged(target) {
  if (!fs.existsSync(target)) return [];
  return fs.readdirSync(target, { withFileTypes: true })
    .filter(e => e.name === 'best-geo' || /^geo-/i.test(e.name))
    .map(e => e.name)
    .sort();
}

function copyEntry(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: false, force: true });
}

function makeBackup(sourceEntries, targetEntries, legacyEntries, backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });
  const manifest = { createdAt: new Date().toISOString(), sourceEntries, targets: [], legacy: [] };
  for (const [index, { target, names }] of targetEntries.entries()) {
    const rel = path.join('targets', String(index));
    const snap = path.join(backupDir, rel);
    fs.mkdirSync(snap, { recursive: true });
    for (const name of names) copyEntry(path.join(target, name), path.join(snap, name));
    manifest.targets.push({ target, names, snapshot: rel });
  }
  for (const legacy of legacyEntries) {
    const safe = legacy.replace(/[^a-zA-Z0-9._-]+/g, '_');
    copyEntry(legacy, path.join(backupDir, 'legacy', safe));
    manifest.legacy.push(legacy);
  }
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function archiveBackup(backupDir, archivePath) {
  try {
    cp.execFileSync('tar', ['-czf', archivePath, '-C', path.dirname(backupDir), path.basename(backupDir)], { stdio: 'ignore' });
    return archivePath;
  } catch (_) {
    return null;
  }
}

function restoreFromBackup(backupDir, manifest) {
  for (const { target, names, snapshot } of manifest.targets) {
    const snap = path.join(backupDir, snapshot);
    fs.mkdirSync(target, { recursive: true });
    for (const name of manifest.sourceEntries) fs.rmSync(path.join(target, name), { recursive: true, force: true });
    for (const name of names) copyEntry(path.join(snap, name), path.join(target, name));
  }
  for (const legacy of manifest.legacy) {
    const safe = legacy.replace(/[^a-zA-Z0-9._-]+/g, '_');
    if (!fs.existsSync(legacy)) copyEntry(path.join(backupDir, 'legacy', safe), legacy);
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) return console.log(usage());
  const sourceDir = expand(args.sourceDir || __dirname);
  if (!fs.existsSync(path.join(sourceDir, 'geo-runtime', 'SKILL.md'))) throw new Error(`不是有效的 GEO Skills 源目录：${sourceDir}`);
  const names = managedDirs(sourceDir);
  if (!names.length) throw new Error(`源目录没有 geo-* 技能：${sourceDir}`);
  const map = targetMap();
  const targets = args.targetDirs.length ? args.targetDirs.map(expand) : args.targets.map(k => map[k]).filter(Boolean);
  if (!targets.length) throw new Error('没有有效安装目标；请使用 --targets 或 --target-dir。');
  for (const target of targets) {
    const rel = path.relative(target, sourceDir);
    if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) throw new Error(`源目录不能位于安装目标内：${sourceDir} -> ${target}`);
  }
  const targetEntries = targets.map(target => ({ target, names: existingManaged(target) }));
  const legacyEntries = args.targetDirs.length ? [] : knownLegacyPaths().filter(fs.existsSync);
  const backupDir = expand(args.backupDir || path.join(HOME, '.geo-skills-backups', `upgrade-${stamp}`));
  const cli = detectCli();
  const plan = { sourceDir, skills: names, targets: targetEntries, legacy: legacyEntries, backupDir, cli: { installed: cli.installed, version: cli.version, installRequired: !cli.supported, minimumVersion: minimumCliVersion, package: 'best-geo@latest', autoInstall: args.installCli }, willMutate: args.apply };
  if (!args.apply) return console.log(args.json ? JSON.stringify(plan, null, 2) : `${JSON.stringify(plan, null, 2)}\n\n这是预演，没有修改任何文件。确认后加 --apply 执行。`);

  if (fs.existsSync(backupDir) || fs.existsSync(`${backupDir}.tar.gz`)) throw new Error(`备份路径已存在，请指定新的 --backup-dir：${backupDir}`);
  if (!cli.supported) {
    if (!args.installCli) throw new Error(`CLI 缺失或低于 ${minimumCliVersion}，且指定了 --no-cli-install；未继续升级。`);
    installCli();
  }

  const manifest = makeBackup(names, targetEntries, legacyEntries, backupDir);
  const archivePath = `${backupDir}.tar.gz`;
  const archive = archiveBackup(backupDir, archivePath);
  try {
    for (const target of targets) {
      fs.mkdirSync(target, { recursive: true });
      for (const name of targetEntries.find(entry => entry.target === target).names) fs.rmSync(path.join(target, name), { recursive: true, force: true });
      for (const name of names) copyEntry(path.join(sourceDir, name), path.join(target, name));
    }
    for (const legacy of legacyEntries) fs.rmSync(legacy, { recursive: true, force: true });
  } catch (error) {
    restoreFromBackup(backupDir, manifest);
    throw new Error(`升级失败，已尝试从备份恢复：${error.message}`);
  }
  const result = { ...plan, cli: { ...detectCli(), installPerformed: !cli.supported }, applied: true, backupDir, archive: archive || null, removedLegacy: legacyEntries };
  console.log(args.json ? JSON.stringify(result, null, 2) : `升级完成。\n备份目录：${backupDir}\n备份压缩包：${archive || '系统未找到 tar，已保留备份目录'}\n已安装 ${names.length} 个 GEO 技能到 ${targets.length} 个目标。`);
}

try { main(); } catch (error) { console.error(error.message || error); process.exitCode = 1; }
