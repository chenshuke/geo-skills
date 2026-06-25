#!/usr/bin/env node
/**
 * GEO first-run config wizard (Node/no-Python).
 *
 * Lists accessible companies/products, optionally creates company/product after
 * explicit confirmation, and writes defaults.companyId/productId to
 * ~/.geo-skills/credentials/geo-config.json. Designed for classroom use.
 */
const readline = require('readline');
const { loadGeoConfig, saveGeoConfig, ensureConfig, headers: geoHeaders, configPath, mask } = require('../../geo-runtime/scripts/credentials.js');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const raw = token.slice(2);
    if (raw.startsWith('no-')) { out[raw.slice(3)] = false; continue; }
    const eq = raw.indexOf('=');
    if (eq >= 0) { out[raw.slice(0, eq)] = raw.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[raw] = true;
    else { out[raw] = next; i++; }
  }
  return out;
}
function first(args, names, fallback = undefined) { for (const n of names) if (args[n] !== undefined && args[n] !== '') return args[n]; return fallback; }
function usage() {
  console.log(`Usage:
  node geo-config/scripts/setup_defaults.js --list
  node geo-config/scripts/setup_defaults.js --auto
  node geo-config/scripts/setup_defaults.js --company-id 36 --product-id 409 --force

Create if missing:
  node geo-config/scripts/setup_defaults.js --create-company --company-name "公司名" --company-description "公司描述" --dry-run
  node geo-config/scripts/setup_defaults.js --create-product --company-id 36 --product-name "产品名" --keywords "关键词1,关键词2" --target-words "目标词1,目标词2" --product-type 1 --dry-run
  node geo-config/scripts/setup_defaults.js --create-company --create-product --company-name "公司名" --product-name "产品名" --keywords "关键词" --target-words "目标词" --force

Options:
  --init-config              Create ~/.geo-skills/credentials/geo-config.json if missing
  --list                     List accessible companies and products; do not write
  --auto                     If there is exactly one company/product, save automatically
  --company-id <id>          Select company ID
  --product-id <id>          Select product ID
  --force                    Required when writing/creating non-interactively
  --dry-run                  Preview selected defaults or create payload; do not write
  --json                     Output JSON only

Create company options:
  --create-company           Create company through POST /v1/geo-company
  --company-name <name>      Required for create-company
  --company-description <d>  Required by API; defaults to company-name when omitted

Create product options:
  --create-product           Create product through POST /v1/geo-product
  --product-name <name>      Required for create-product
  --keywords <a,b>           Required by API; product keyword array
  --target-words <a,b>       Required by API; product targetWord array
  --product-type <1|2>       Default 1

Classroom flow:
  1) node geo-runtime/scripts/doctor.js --init-config
  2) Fill openKey in ~/.geo-skills/credentials/geo-config.json
  3) node geo-config/scripts/setup_defaults.js --list
  4) Select existing IDs, or create company/product with --dry-run then --force
`);
}
function baseUrl(cfg) { return String(cfg.geo.baseUrl || '').replace(/\/$/, ''); }
function buildHeaders(cfg, json = false) { return { ...geoHeaders(cfg), Accept: 'application/json', ...(json ? { 'Content-Type': 'application/json; charset=utf-8' } : {}) }; }
async function requestJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok || (body && typeof body === 'object' && body.statusCode !== undefined && body.statusCode !== 0)) {
    const msg = body && typeof body === 'object' ? (body.message || body.msg || JSON.stringify(body)) : String(body).slice(0, 500);
    const err = new Error(`GEO API failed: HTTP ${res.status} ${res.statusText}; ${msg}`);
    err.response = body; throw err;
  }
  return body;
}
function rowsOf(body) {
  const d = body?.data || body;
  return Array.isArray(d?.data) ? d.data : Array.isArray(d?.list) ? d.list : Array.isArray(d) ? d : [];
}
function dataOf(body) { return body?.data || body; }
function parseList(v) { return String(v || '').split(/[,，|]/).map(s => s.trim()).filter(Boolean); }
async function listCompanies(cfg) {
  const body = await requestJson(`${baseUrl(cfg)}/v1/geo-company?page=1&limit=100`, { headers: buildHeaders(cfg) });
  return rowsOf(body).map(x => ({ id: Number(x.id), name: x.name || x.title || `Company ${x.id}`, description: x.description, productCount: x.productCount }));
}
async function listProducts(cfg, companyId) {
  const qs = new URLSearchParams({ page: '1', limit: '100', companyId: String(companyId), withDefault: 'true' });
  const body = await requestJson(`${baseUrl(cfg)}/v1/geo-product?${qs}`, { headers: buildHeaders(cfg) });
  return rowsOf(body).map(x => ({ id: Number(x.id), name: x.name || x.title || `Product ${x.id}`, type: x.type, keyword: x.keyword, targetWord: x.targetWord }));
}
async function createCompany(cfg, payload) {
  return dataOf(await requestJson(`${baseUrl(cfg)}/v1/geo-company`, { method: 'POST', headers: buildHeaders(cfg, true), body: JSON.stringify(payload) }));
}
async function createProduct(cfg, payload) {
  return dataOf(await requestJson(`${baseUrl(cfg)}/v1/geo-product`, { method: 'POST', headers: buildHeaders(cfg, true), body: JSON.stringify(payload) }));
}
function ask(rl, q) { return new Promise(resolve => rl.question(q, resolve)); }
function printHuman(report) {
  console.log('GEO defaults setup');
  console.log('Config:', report.configPath, 'openKey=', report.openKey);
  if (report.createPreview) console.log('\nCreate preview:', JSON.stringify(report.createPreview, null, 2));
  if (report.createdCompany) console.log('\nCreated company:', JSON.stringify(report.createdCompany));
  if (report.createdProduct) console.log('Created product:', JSON.stringify(report.createdProduct));
  if (report.companies) {
    console.log('\nCompanies:');
    for (const c of report.companies) console.log(`  ${c.id}\t${c.name}${c.productCount !== undefined ? `\tproducts=${c.productCount}` : ''}`);
  }
  if (report.products) {
    console.log(`\nProducts for company ${report.selectedCompanyId}:`);
    for (const p of report.products) console.log(`  ${p.id}\t${p.name}${p.type !== undefined ? `\ttype=${p.type}` : ''}`);
  }
  if (report.saved) console.log('\nSaved defaults:', JSON.stringify(report.defaults));
  else if (report.next) console.log('\nNext:', report.next);
}
function requireForceOrDryRun(args, action) {
  if (!(args.force || args['dry-run'] || args.dryRun)) throw new Error(`${action} 会写入 GEO 平台或配置文件。请先加 --dry-run 预览；真实执行必须加 --force。`);
}
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) { usage(); return; }
  if (args['init-config'] || args.initConfig) ensureConfig();
  const cfg = loadGeoConfig();
  if (!cfg.geo.openKey) throw new Error(`未配置 GEO openKey。请先编辑 ${configPath()}，或设置 GEO_OPENKEY 环境变量。`);

  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  const createCompanyFlag = Boolean(args['create-company'] || args.createCompany);
  const createProductFlag = Boolean(args['create-product'] || args.createProduct);
  const listOnly = Boolean(args.list);
  const auto = Boolean(args.auto);
  let companyId = Number(first(args, ['company-id', 'companyId'], cfg.defaults.companyId || 0));
  let productId = Number(first(args, ['product-id', 'productId'], cfg.defaults.productId || 0));
  let companies = await listCompanies(cfg).catch(e => { if (createCompanyFlag) return []; throw e; });
  let products = null;
  let createdCompany = null;
  let createdProduct = null;

  if (createCompanyFlag) {
    requireForceOrDryRun(args, '创建公司');
    const name = String(first(args, ['company-name', 'companyName'], '')).trim();
    const description = String(first(args, ['company-description', 'companyDescription'], name)).trim();
    if (!name) throw new Error('创建公司需要 --company-name。');
    const payload = { name, description };
    if (dryRun) {
      const report = { configPath: configPath(), openKey: mask(cfg.geo.openKey), createPreview: { endpoint: '/v1/geo-company', payload }, companies, next: '确认无误后，把 --dry-run 改为 --force 创建公司。' };
      if (args.json) console.log(JSON.stringify(report, null, 2)); else printHuman(report);
      return;
    }
    createdCompany = await createCompany(cfg, payload);
    companies = await listCompanies(cfg);
    companyId = Number(createdCompany.id || createdCompany.companyId || companies.find(c => c.name === name)?.id || 0);
    if (!companyId) throw new Error('公司已创建，但无法识别返回的 companyId，请运行 --list 手动确认。');
  }

  if (!companies.length) throw new Error('当前 openKey 没有可访问的公司。可使用 --create-company 创建，或检查 openKey 权限。');

  const interactive = process.stdin.isTTY && process.stdout.isTTY && !listOnly && !auto && !createProductFlag && (!companyId || !productId);

  if (auto && !companyId) {
    if (companies.length === 1) companyId = companies[0].id;
    else {
      const report = { configPath: configPath(), openKey: mask(cfg.geo.openKey), companies, next: '存在多个公司，请使用 --company-id 指定。' };
      if (args.json) console.log(JSON.stringify(report, null, 2)); else printHuman(report);
      process.exitCode = 2; return;
    }
  }
  if (!companyId && interactive) {
    printHuman({ configPath: configPath(), openKey: mask(cfg.geo.openKey), companies });
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    companyId = Number(await ask(rl, '\n请输入 companyId: '));
    rl.close();
  }
  if (companyId && !companies.some(c => c.id === Number(companyId))) throw new Error(`companyId=${companyId} 不在当前 openKey 可访问公司列表中。`);

  if (createProductFlag) {
    requireForceOrDryRun(args, '创建产品');
    if (!companyId) {
      if (companies.length === 1) companyId = companies[0].id;
      else throw new Error('创建产品需要 --company-id；或同时使用 --create-company。');
    }
    const name = String(first(args, ['product-name', 'productName'], '')).trim();
    const keyword = parseList(first(args, ['keywords', 'keyword'], ''));
    const targetWord = parseList(first(args, ['target-words', 'targetWords', 'target-word', 'targetWord'], ''));
    const type = Number(first(args, ['product-type', 'productType', 'type'], 1));
    if (!name) throw new Error('创建产品需要 --product-name。');
    if (!keyword.length) throw new Error('创建产品需要 --keywords，逗号分隔。');
    if (!targetWord.length) throw new Error('创建产品需要 --target-words，逗号分隔。');
    if (![1, 2].includes(type)) throw new Error('--product-type 只能是 1 或 2。');
    const payload = { name, keyword, type, targetWord, companyId: Number(companyId) };
    if (dryRun) {
      const report = { configPath: configPath(), openKey: mask(cfg.geo.openKey), companies, selectedCompanyId: companyId, createPreview: { endpoint: '/v1/geo-product', payload }, next: '确认无误后，把 --dry-run 改为 --force 创建产品。' };
      if (args.json) console.log(JSON.stringify(report, null, 2)); else printHuman(report);
      return;
    }
    createdProduct = await createProduct(cfg, payload);
    products = await listProducts(cfg, companyId);
    productId = Number(createdProduct.id || createdProduct.productId || products.find(p => p.name === name)?.id || 0);
    if (!productId) throw new Error('产品已创建，但无法识别返回的 productId，请运行 --list 手动确认。');
  }

  if (companyId && !products) products = await listProducts(cfg, companyId);
  if (companyId && !products.length && !createProductFlag) throw new Error(`companyId=${companyId} 下没有可访问产品。可使用 --create-product 创建，或检查账号权限。`);

  if (auto && companyId && !productId) {
    if (products.length === 1) productId = products[0].id;
    else {
      const report = { configPath: configPath(), openKey: mask(cfg.geo.openKey), companies, selectedCompanyId: companyId, products, next: '存在多个产品，请使用 --product-id 指定。' };
      if (args.json) console.log(JSON.stringify(report, null, 2)); else printHuman(report);
      process.exitCode = 2; return;
    }
  }
  if (!productId && interactive && products) {
    printHuman({ configPath: configPath(), openKey: mask(cfg.geo.openKey), companies, selectedCompanyId: companyId, products });
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    productId = Number(await ask(rl, '\n请输入 productId: '));
    rl.close();
  }

  if (listOnly || !companyId || !productId) {
    const report = { configPath: configPath(), openKey: mask(cfg.geo.openKey), companies, selectedCompanyId: companyId || null, products, next: companyId ? '使用 --product-id 选择产品；如没有产品，可用 --create-product 创建。' : '使用 --company-id 选择公司；如没有公司，可用 --create-company 创建。' };
    if (args.json) console.log(JSON.stringify(report, null, 2)); else printHuman(report);
    return;
  }
  if (!products.some(p => p.id === Number(productId))) throw new Error(`productId=${productId} 不属于 companyId=${companyId} 的产品列表。`);

  const nextCfg = JSON.parse(JSON.stringify(cfg));
  nextCfg.defaults = Object.assign({}, nextCfg.defaults, { companyId: Number(companyId), productId: Number(productId) });
  const report = { configPath: configPath(), openKey: mask(cfg.geo.openKey), companies, selectedCompanyId: companyId, products, createdCompany, createdProduct, defaults: nextCfg.defaults, saved: false };
  if (dryRun) {
    report.dryRun = true;
  } else {
    if (!args.force && !interactive) throw new Error('写入 defaults 需要 --force；或在交互式终端中运行。');
    saveGeoConfig(nextCfg);
    report.saved = true;
  }
  if (args.json) console.log(JSON.stringify(report, null, 2)); else printHuman(report);
}
main().catch(e => { console.error(e.message || e); if (e.response) console.error(JSON.stringify(e.response, null, 2)); process.exit(1); });
