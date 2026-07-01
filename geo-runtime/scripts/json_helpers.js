#!/usr/bin/env node
/** Shared JSON helpers for GEO skills. */
function isPlainObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function unwrapRows(body, opts = {}) {
  const maxDepth = opts.maxDepth || 8;
  const seen = new Set();
  function inner(v, depth) {
    if (!v || depth > maxDepth) return [];
    if (Array.isArray(v)) return v;
    if (!isPlainObject(v) || seen.has(v)) return [];
    seen.add(v);
    for (const key of ['rows','list','records','items','data']) {
      if (Array.isArray(v[key])) return v[key];
    }
    if (isPlainObject(v.data)) {
      const r = inner(v.data, depth + 1);
      if (r.length || Array.isArray(v.data)) return r;
    }
    for (const key of ['result','payload']) {
      if (isPlainObject(v[key]) || Array.isArray(v[key])) {
        const r = inner(v[key], depth + 1);
        if (r.length) return r;
      }
    }
    for (const val of Object.values(v)) {
      if (isPlainObject(val) || Array.isArray(val)) {
        const r = inner(val, depth + 1);
        if (r.length) return r;
      }
    }
    return [];
  }
  return inner(body, 0);
}
function pickFirst(obj, paths) {
  for (const path of paths) {
    const parts = String(path).split('.');
    let cur = obj;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object' || cur[p] === undefined || cur[p] === null || cur[p] === '') { cur = undefined; break; }
      cur = cur[p];
    }
    if (cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return '';
}
function findDeepByKey(obj, allowedKeys, depth = 0, seen = new Set()) {
  if (!obj || typeof obj !== 'object' || depth > 6 || seen.has(obj)) return '';
  seen.add(obj);
  if (Array.isArray(obj)) {
    for (const x of obj) { const v = findDeepByKey(x, allowedKeys, depth + 1, seen); if (v !== '') return v; }
    return '';
  }
  for (const [k,v] of Object.entries(obj)) {
    if (allowedKeys.includes(k) && v !== undefined && v !== null && v !== '') return v;
  }
  for (const v of Object.values(obj)) {
    const found = findDeepByKey(v, allowedKeys, depth + 1, seen);
    if (found !== '') return found;
  }
  return '';
}
module.exports = { unwrapRows, pickFirst, findDeepByKey };
