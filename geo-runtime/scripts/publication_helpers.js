#!/usr/bin/env node
/** Shared publication normalization helpers. */
const { unwrapRows, pickFirst, findDeepByKey } = require('./json_helpers.js');
const ALLOWED_PUBLISHED_URL_FIELDS = ['publishedUrl', 'publishUrl', 'postUrl', 'platformUrl'];
function stableJson(v) { try { return JSON.stringify(v); } catch { return String(v); } }
function isPublishedPageUrl(raw) {
  if (!raw || typeof raw !== 'string' || !/^https?:\/\//i.test(raw)) return false;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const pathname = u.pathname.toLowerCase();
    if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?|$)/i.test(raw) || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(pathname)) return false;
    if (host.includes('oss-') || host.includes('aliyuncs.com') || host.includes('cos.') || host.includes('myqcloud.com')) return false;
    if (/\/userimg\//i.test(pathname) || /\/upload(s)?\//i.test(pathname) && /image|img|cover/i.test(pathname)) return false;
    return true;
  } catch { return false; }
}
function publishedUrlOf(row) {
  const direct = pickFirst(row, ALLOWED_PUBLISHED_URL_FIELDS);
  if (isPublishedPageUrl(String(direct))) return String(direct);
  const deep = findDeepByKey(row, ALLOWED_PUBLISHED_URL_FIELDS);
  if (isPublishedPageUrl(String(deep))) return String(deep);
  return '';
}
function publicationArticleId(row) {
  return Number(pickFirst(row, ['article.id','article.articleId','articleId','article_id']) || 0) || '';
}
function publicationArticleTitle(row) {
  return String(pickFirst(row, ['article.title','article.name','articleTitle','title']) || '');
}
function publicationTaskId(row) {
  return Number(pickFirst(row, ['publicationTaskId','publication_task_id','taskId','task.id','publicationTask.id']) || 0) || '';
}
function publicationPlatform(row) {
  return String(pickFirst(row, ['platform','publishPlatform','mediaPlatform','publishAccount.platform','account.platform']) || '');
}
function publicationAccountId(row) {
  return String(pickFirst(row, ['publishAccount.id','publicationAccount.id','account.id','accountId','publishAccountId','publicationAccountId']) || '');
}
function publicationAccountName(row) {
  return String(pickFirst(row, ['publishAccount.name','publishAccount.nickname','publicationAccount.name','account.name','account.nickname','accountName','nickname']) || '');
}
function rawStatusOf(row) { return pickFirst(row, ['status','publishStatus','state','resultStatus','auditStatus','publicationStatus']); }
function rawMessageOf(row) { return pickFirst(row, ['message','msg','remark','reason','errorMessage','failureReason','failReason','statusMessage']); }
function inferStatus({ publishedUrl, rawStatus, rawMessage }) {
  const text = `${rawStatus || ''} ${rawMessage || ''}`.toLowerCase();
  if (publishedUrl) return 'published_url_ready';
  if (/fail|error|失败|异常|驳回|拒绝|rejected/.test(text)) return 'failed';
  if (/人工|手动|待处理|需处理|登录|验证码|授权|cookie|manual|auth|login/.test(text)) return 'manual_required';
  if (/pending|processing|排队|处理中|待发布|等待/.test(text)) return 'pending';
  if (/success|done|完成|已发布|published/.test(text)) return 'published_no_url';
  return 'pending';
}
function nextAction(row) {
  if (row.status === 'published_url_ready') return '拿 publishedUrl 去 geo-indexing 做 searchedSites 精确命中检测';
  if (row.status === 'task_mapping_only') return '只有发布任务映射，尚无平台发布记录；继续回查 /v1/publication';
  if (row.status === 'published_no_url') return '状态像已发布但缺 URL；继续回查 /v1/publication，必要时人工核验平台后台';
  if (row.status === 'failed') return '查看 failureReason/rawMessage，修复账号/封面/标题/平台规则后重发';
  if (row.status === 'manual_required') return '进入平台账号做人工处理/重新授权/验证码处理后再回查';
  return '等待发布完成，稍后再次运行 publication_status.js 回查';
}
function normalizePublicationRow(row) {
  const publishedUrl = publishedUrlOf(row);
  const rawStatus = String(rawStatusOf(row) ?? '');
  const rawMessage = String(rawMessageOf(row) ?? '');
  const out = {
    articleId: publicationArticleId(row),
    taskId: publicationTaskId(row),
    platform: publicationPlatform(row),
    accountId: publicationAccountId(row),
    accountName: publicationAccountName(row),
    title: publicationArticleTitle(row),
    rawStatus,
    rawMessage,
    publishedUrl,
    failureReason: rawMessage,
    raw: row,
  };
  out.status = inferStatus(out);
  out.nextAction = nextAction(out);
  return out;
}
function collectTaskArticleIds(obj, out = new Set(), depth = 0, seen = new Set()) {
  if (!obj || typeof obj !== 'object' || depth > 8 || seen.has(obj)) return out;
  seen.add(obj);
  if (Array.isArray(obj)) { for (const x of obj) collectTaskArticleIds(x, out, depth + 1, seen); return out; }
  for (const [k,v] of Object.entries(obj)) {
    if (/^article[_-]?id$/i.test(k) && Number(v)) out.add(Number(v));
    else if (k === 'article' && v && typeof v === 'object' && Number(v.id)) out.add(Number(v.id));
    if (v && typeof v === 'object') collectTaskArticleIds(v, out, depth + 1, seen);
  }
  return out;
}
function collectTaskIds(obj, out = new Set(), depth = 0, seen = new Set()) {
  if (!obj || typeof obj !== 'object' || depth > 6 || seen.has(obj)) return out;
  seen.add(obj);
  if (Array.isArray(obj)) { for (const x of obj) collectTaskIds(x, out, depth + 1, seen); return out; }
  for (const [k,v] of Object.entries(obj)) {
    if ((/^id$/i.test(k) || /task[_-]?id/i.test(k) || /publication[_-]?task[_-]?id/i.test(k)) && Number(v)) out.add(Number(v));
    if (v && typeof v === 'object') collectTaskIds(v, out, depth + 1, seen);
  }
  return out;
}
function taskRowForArticle(task, articleId) {
  const tids = [...collectTaskIds(task)];
  return {
    articleId: Number(articleId) || '',
    taskId: Number(tids[0] || task.id || task.taskId || 0) || '',
    platform: String(pickFirst(task, ['platform','publishPlatform']) || ''),
    accountId: '',
    accountName: '',
    title: String(pickFirst(task, ['name','title']) || ''),
    rawStatus: String(rawStatusOf(task) ?? ''),
    rawMessage: String(rawMessageOf(task) ?? ''),
    publishedUrl: '',
    failureReason: '',
    status: 'task_mapping_only',
    nextAction: nextAction({ status: 'task_mapping_only' }),
    raw: task,
  };
}
function includesFilter(row, articleFilter = [], taskFilter = []) {
  const articleOk = !articleFilter.length || (row.articleId && articleFilter.includes(Number(row.articleId)));
  const taskOk = !taskFilter.length || (row.taskId && taskFilter.includes(Number(row.taskId)));
  if (articleFilter.length && taskFilter.length) return articleOk || taskOk;
  return articleOk && taskOk;
}
function normalizePublicationStatus({ tasks = [], publications = [], articleFilter = [], taskFilter = [] }) {
  const rows = [];
  const seenArticleIds = new Set();
  for (const p of publications) {
    const row = normalizePublicationRow(p);
    if (!includesFilter(row, articleFilter, taskFilter)) continue;
    rows.push(row);
    if (row.articleId) seenArticleIds.add(Number(row.articleId));
  }
  for (const t of tasks) {
    const taskIds = [...collectTaskIds(t)];
    if (taskFilter.length && !taskIds.some(id => taskFilter.includes(Number(id)))) continue;
    const articleIds = [...collectTaskArticleIds(t)].filter(id => !articleFilter.length || articleFilter.includes(Number(id)));
    for (const articleId of articleIds) {
      if (seenArticleIds.has(Number(articleId))) continue;
      rows.push(taskRowForArticle(t, articleId));
      seenArticleIds.add(Number(articleId));
    }
  }
  for (const articleId of articleFilter) {
    if (seenArticleIds.has(Number(articleId))) continue;
    rows.push({ articleId: Number(articleId), taskId: '', platform: '', accountId: '', accountName: '', title: '', rawStatus: '', rawMessage: '', publishedUrl: '', failureReason: '', status: 'task_mapping_only', nextAction: nextAction({ status: 'task_mapping_only' }), raw: null });
  }
  const deduped = [];
  const seenRows = new Set();
  for (const r of rows) {
    const key = r.publishedUrl ? [r.articleId || '', r.publishedUrl || '', r.status || ''].join('|') : [r.articleId || '', r.taskId || '', r.platform || '', r.accountId || '', r.status || ''].join('|');
    if (seenRows.has(key)) continue;
    seenRows.add(key);
    deduped.push(r);
  }
  return deduped.sort((a,b) => Number(a.articleId||0) - Number(b.articleId||0) || Number(a.taskId||0) - Number(b.taskId||0));
}
function normalizePublicationJson(json) {
  return unwrapRows(json).map(normalizePublicationRow);
}
function hasAnyId(obj, ids) {
  if (!ids.length) return true;
  const s = stableJson(obj);
  return ids.some(id => new RegExp(`(^|[^0-9])${String(id)}([^0-9]|$)`).test(s));
}
module.exports = { unwrapRows, publishedUrlOf, isPublishedPageUrl, normalizePublicationRow, normalizePublicationRows: normalizePublicationStatus, normalizePublicationStatus, normalizePublicationJson, hasAnyId, nextAction };
