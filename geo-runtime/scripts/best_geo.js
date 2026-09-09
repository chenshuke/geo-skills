#!/usr/bin/env node
/**
 * Best GEO CLI bridge for GEO Skills.
 * The skills layer must never read or send platform authentication material directly.
 * Authentication is owned by `best-geo auth`; this bridge only forwards
 * structured capability calls and returns the CLI JSON unchanged.
 */
const { spawnSync } = require('child_process');

function cliPath() {
  return process.env.BEST_GEO_BIN || 'best-geo';
}

function run(args, options = {}) {
  const input = options.input === undefined ? undefined : JSON.stringify(options.input);
  const finalArgs = input === undefined ? args : [...args, '--input', input];
  const result = spawnSync(cliPath(), finalArgs, { encoding: 'utf8' });
  if (result.error) throw result.error;
  const stdout = String(result.stdout || '').trim();
  const stderr = String(result.stderr || '').trim();
  let payload;
  try { payload = stdout ? JSON.parse(stdout) : null; }
  catch { throw new Error(`best-geo returned non-JSON output: ${stdout || stderr}`); }
  if (result.status !== 0 || (payload && payload.ok === false)) {
    const err = new Error(payload?.message || stderr || `best-geo exited ${result.status}`);
    err.result = payload;
    throw err;
  }
  return payload;
}

function call(capability, input) { return run(['call', capability], { input }); }
function plan(capability, input) { return run(['plan', capability], { input }); }
function apply(planId) { return run(['apply', String(planId)]); }

if (require.main === module) {
  const [command, capability, raw] = process.argv.slice(2);
  try {
    let result;
    if (command === 'call' || command === 'plan') {
      result = command === 'call' ? call(capability, raw ? JSON.parse(raw) : {}) : plan(capability, raw ? JSON.parse(raw) : {});
    } else if (command === 'apply') result = apply(capability);
    else throw new Error('Usage: best_geo.js call|plan <capability> [json] | apply <planId>');
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}

module.exports = { run, call, plan, apply };
