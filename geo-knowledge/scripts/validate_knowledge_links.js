#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.');
if (!fs.existsSync(root)) {
  console.error(`知识库目录不存在：${root}`);
  process.exit(2);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function decodeTarget(value) {
  const trimmed = value.trim().replace(/^<|>$/g, '');
  try { return decodeURI(trimmed); } catch { return trimmed; }
}

const markdownFiles = walk(root).filter((file) => file.toLowerCase().endsWith('.md'));
const errors = [];
let checked = 0;

for (const file of markdownFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const links = [...text.matchAll(/\[[^\]]*\]\((<[^>]+>|[^)\s]+)\)/g)];
  for (const match of links) {
    const target = decodeTarget(match[1]);
    if (/^(https?:|mailto:|tel:)/i.test(target)) continue;
    checked += 1;
    const [filePart, anchor] = target.split('#');
    const resolved = filePart ? path.resolve(path.dirname(file), filePart) : file;
    if (!fs.existsSync(resolved)) {
      errors.push({ file, target, reason: '目标文件不存在' });
      continue;
    }
    if (anchor && resolved.toLowerCase().endsWith('.md')) {
      const source = fs.readFileSync(resolved, 'utf8');
      const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const explicit = new RegExp(`<a\\s+id=["']${escaped}["']\\s*><\\/a>`, 'i');
      if (!explicit.test(source)) errors.push({ file, target, reason: '目标锚点不存在' });
    }
  }
}

console.log(JSON.stringify({ ok: errors.length === 0, root, markdownFiles: markdownFiles.length, checkedLinks: checked, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
