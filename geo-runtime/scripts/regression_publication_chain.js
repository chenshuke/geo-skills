#!/usr/bin/env node
/** Regression test for publication -> publishedUrl -> indexing URL match chain. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const child_process = require('child_process');
const { normalizePublicationJson } = require('./publication_helpers.js');

const suite = path.resolve(__dirname, '../..');
const fixtures = path.join(suite, 'geo-runtime', 'fixtures');
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function runNode(script, args) {
  const out = child_process.spawnSync(process.execPath, [script, ...args], { cwd: suite, encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`${path.relative(suite, script)} failed\nSTDOUT:\n${out.stdout}\nSTDERR:\n${out.stderr}`);
  return out.stdout;
}
function main() {
  const rawFile = path.join(fixtures, 'publication', 'raw_publication_mixed_url.json');
  const expectedFile = path.join(fixtures, 'publication', 'publication_status_expected.json');
  const answersFile = path.join(fixtures, 'indexing', 'answers_url_match.json');
  const urlExpectedFile = path.join(fixtures, 'indexing', 'url_match_expected.json');
  const raw = readJson(rawFile);
  const expected = readJson(expectedFile);
  const rows = normalizePublicationJson(raw);
  for (const pattern of expected.forbiddenPublishedUrlPatterns) {
    assert(!rows.some(r => String(r.publishedUrl || '').includes(pattern)), `forbidden URL pattern leaked into publishedUrl: ${pattern}`);
  }
  for (const exp of expected.expectations) {
    const matches = rows.filter(r => Number(r.articleId) === Number(exp.articleId));
    assert(matches.length > 0, `missing article ${exp.articleId}`);
    const urlRows = matches.filter(r => r.publishedUrl);
    assert(urlRows.length === exp.publishedUrlCount, `article ${exp.articleId} expected ${exp.publishedUrlCount} URLs, got ${urlRows.length}`);
    if (exp.latestUrl) {
      const latest = matches.find(r => r.isLatest === 'yes');
      assert(latest, `article ${exp.articleId} missing isLatest=yes`);
      assert(latest.publishedUrl === exp.latestUrl, `article ${exp.articleId} latest URL mismatch`);
      assert(Number(latest.publicationId) === Number(exp.latestPublicationId), `article ${exp.articleId} latest publicationId mismatch`);
    }
    assert(matches.some(r => r.status === exp.status), `article ${exp.articleId} expected status ${exp.status}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-publication-regression-'));
  const matchScript = path.join(suite, 'geo-indexing', 'scripts', 'published_url_match.js');
  runNode(matchScript, ['--publication-json', rawFile, '--answers-json', answersFile, '--project-dir', tmp]);
  const matchJson = path.join(tmp, '07_监测分析', '收录监测', 'URL命中回查', `published_url_match_${new Date().toISOString().slice(0,10)}.json`);
  const match = readJson(matchJson);
  const urlExpected = readJson(urlExpectedFile);
  for (const exp of urlExpected.expectations) {
    const got = (match.results || []).filter(r => Number(r.articleId) === Number(exp.articleId));
    assert(got.length > 0, `url match missing article ${exp.articleId}`);
    assert(got.some(r => r.status === exp.status), `url match article ${exp.articleId} expected ${exp.status}, got ${got.map(r=>r.status).join(',')}`);
  }
  console.log(JSON.stringify({ ok: true, publicationRows: rows.length, urlMatchResults: match.results.length, tmp }, null, 2));
}
main();
