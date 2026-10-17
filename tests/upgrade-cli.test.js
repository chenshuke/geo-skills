// Isolated installer regression: no network, user credentials, npm or real skill directories.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const installer = path.resolve(__dirname, '../upgrade-geo-skills.js');

function fixture(t, cli = 'ok') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-cli-upgrade-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, 'bin'), source = path.join(root, 'source');
  fs.mkdirSync(bin);
  for (const name of ['geo-runtime', 'best-geo']) {
    fs.mkdirSync(path.join(source, name), { recursive: true });
    fs.writeFileSync(path.join(source, name, 'SKILL.md'), `new ${name}`);
  }
  fs.writeFileSync(path.join(bin, 'best-geo'), `#!${process.execPath}\n` +
    `if(process.argv.includes('--check'))throw Error('Online checks are forbidden');\n` +
    (cli === 'broken' ? `console.log('not-json');` :
      `console.log(JSON.stringify({ok:true,data:{version:'${cli === 'old' ? '1.0.0' : '2.0.4'}'}}));`), { mode: 0o755 });
  const targets = [path.join(root, 'codex', 'skills'), path.join(root, 'claude', 'skills')];
  targets.forEach((target, i) => {
    fs.mkdirSync(path.join(target, 'geo-runtime'), { recursive: true });
    fs.mkdirSync(path.join(target, 'geo-retired'), { recursive: true });
    fs.writeFileSync(path.join(target, 'geo-runtime', 'original.txt'), `original-${i}`);
    fs.writeFileSync(path.join(target, 'unrelated.txt'), 'keep');
  });
  const backup = path.join(root, 'backup');
  const args = ['--source-dir', source, '--backup-dir', backup, '--json',
    ...targets.flatMap(p => ['--target-dir', p])];
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  return { root, source, targets, backup, args, env };
}
function run(f, extra = []) {
  return spawnSync(process.execPath, [installer, ...f.args, ...extra], { env: f.env, encoding: 'utf8', timeout: 20000 });
}

test('dry-run detects local CLI 2 without online request or mutation', t => {
  const f = fixture(t), result = run(f);
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.cli.version, '2.0.4');
  assert.equal(plan.cli.installRequired, false);
  assert.ok(plan.skills.includes('best-geo'));
  assert.equal(plan.legacy.length, 0);
  assert.equal(fs.existsSync(f.backup), false);
  assert.ok(fs.existsSync(path.join(f.targets[0], 'geo-retired')));
});

test('upgrade installs official skill and makes distinct backups for same-basename targets', t => {
  const f = fixture(t), result = run(f, ['--apply', '--no-cli-install']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.cli.installPerformed, false);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.backup, 'manifest.json')));
  f.targets.forEach((target, i) => {
    assert.ok(fs.existsSync(path.join(target, 'best-geo', 'SKILL.md')));
    assert.equal(fs.existsSync(path.join(target, 'geo-retired')), false);
    assert.equal(fs.readFileSync(path.join(target, 'unrelated.txt'), 'utf8'), 'keep');
    assert.equal(fs.readFileSync(path.join(f.backup, manifest.targets[i].snapshot, 'geo-runtime', 'original.txt'), 'utf8'), `original-${i}`);
  });
});

test('failure during second-target installation restores both original targets', t => {
  const f = fixture(t);
  const hook = `const fs=require('fs'); const copy=fs.cpSync; let failed=false;
    fs.cpSync=(src,dst,opts)=>{if(!failed&&dst===${JSON.stringify(path.join(f.targets[1], 'best-geo'))}){failed=true;throw Error('injected copy failure')}return copy(src,dst,opts)};
    process.argv=['node',${JSON.stringify(installer)},...${JSON.stringify([...f.args, '--apply', '--no-cli-install'])}];require(${JSON.stringify(installer)});`;
  const result = spawnSync(process.execPath, ['-e', hook], { env: f.env, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /injected copy failure/);
  f.targets.forEach((target, i) => {
    assert.equal(fs.readFileSync(path.join(target, 'geo-runtime', 'original.txt'), 'utf8'), `original-${i}`);
    assert.ok(fs.existsSync(path.join(target, 'geo-retired')));
    assert.equal(fs.existsSync(path.join(target, 'best-geo')), false);
  });
});

for (const cli of ['old', 'broken']) {
  test(`${cli} CLI never removes existing skills when installation is disabled`, t => {
    const f = fixture(t, cli), result = run(f, ['--apply', '--no-cli-install']);
    assert.equal(result.status, 1);
    assert.equal(fs.existsSync(f.backup), false);
    assert.ok(fs.existsSync(path.join(f.targets[0], 'geo-retired')));
  });
}

test('real package installation includes CLI 2 guidance at every skill reference', t => {
  const f = fixture(t);
  const result = run(f, ['--source-dir', path.dirname(installer), '--apply', '--no-cli-install']);
  assert.equal(result.status, 0, result.stderr);
  for (const target of f.targets) {
    assert.ok(fs.existsSync(path.join(target, 'best-geo', 'references', 'cli-compatibility.md')));
    for (const skill of fs.readdirSync(target).filter(n => n.startsWith('geo-'))) {
      const text = fs.readFileSync(path.join(target, skill, 'SKILL.md'), 'utf8');
      const rule = text.split('\n').find(line => line.includes('CLI 2 平台操作优先规则'));
      assert.ok(rule, `${skill} has no CLI 2 rule`);
      const references = [...rule.matchAll(/`(\.\.\/[^`]+\.md)`/g)].map(m => m[1]);
      assert.equal(references.length, 2);
      for (const reference of references) assert.ok(fs.existsSync(path.resolve(target, skill, reference)), `${skill}: ${reference}`);
    }
  }
});

for (const fail of [false, true]) {
  test(`automatic CLI update ${fail ? 'failure preserves originals' : 'succeeds before skills install and keeps JSON clean'}`, t => {
    const f = fixture(t, 'old');
    const cliPath = path.join(f.root, 'bin', 'best-geo');
    const nextCli = `#!${process.execPath}\nconsole.log(JSON.stringify({ok:true,data:{version:'2.0.4'}}));\n`;
    const npmPath = path.join(f.root, 'bin', 'npm');
    fs.writeFileSync(npmPath, `#!${process.execPath}\n` +
      `require('node:assert/strict').deepEqual(process.argv.slice(2),['install','--global','best-geo@latest']);\n` +
      `console.log('simulated npm output');\n` +
      (fail ? 'process.exit(1);' : `require('fs').writeFileSync(${JSON.stringify(cliPath)},${JSON.stringify(nextCli)},{mode:0o755});`), { mode: 0o755 });
    const result = run(f, ['--apply']);
    assert.equal(result.status, fail ? 1 : 0, result.stderr);
    assert.match(result.stderr, /simulated npm output/);
    if (fail) {
      assert.equal(fs.existsSync(f.backup), false);
      assert.ok(fs.existsSync(path.join(f.targets[0], 'geo-retired')));
    } else {
      const report = JSON.parse(result.stdout);
      assert.equal(report.cli.version, '2.0.4');
      assert.equal(report.cli.installPerformed, true);
      assert.ok(fs.existsSync(path.join(f.targets[0], 'best-geo', 'SKILL.md')));
    }
  });
}
