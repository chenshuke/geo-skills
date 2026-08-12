#!/usr/bin/env node
const fs=require('fs'), path=require('path'), child_process=require('child_process');
const {pathToFileURL}=require('url');
function arg(k,d=''){const i=process.argv.indexOf('--'+k);return i>=0?process.argv[i+1]:d}
function esc(s){return String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
function documentData(source){
  const frontmatter=source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  const meta={};
  if(frontmatter){
    for(const line of frontmatter[1].split(/\r?\n/)){
      const m=line.match(/^([^:：]+)[:：]\s*(.*)$/);
      if(m)meta[m[1].trim()]=m[2].trim();
    }
  }
  let body=frontmatter?source.slice(frontmatter[0].length):source;
  const quote=body.match(/^>\s?(.+)$/m);
  const summary=quote?quote[1].trim():'';
  if(quote)body=body.replace(/^>\s?.+\r?\n?/m,'');
  return {meta,body,summary};
}
function inline(s){
  const links=[];
  const staged=String(s||'').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+(?:\([^)]*\)[^\s)]*)?)\)/g,(_,label,url)=>{
    const token=`@@GEO_LINK_${links.length}@@`;
    links.push(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`);
    return token;
  });
  let rendered=esc(staged).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  links.forEach((link,i)=>{rendered=rendered.replace(`@@GEO_LINK_${i}@@`,link)});
  return rendered;
}
function table(lines){const rows=lines.map(l=>l.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim())); const h=rows[0], b=rows.slice(2); return `<table><thead><tr>${h.map(x=>`<th>${inline(x)}</th>`).join('')}</tr></thead><tbody>${b.map(r=>`<tr>${h.map((_,i)=>`<td>${inline(r[i]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
function md(source){
  const out=[], lines=source.split(/\r?\n/);
  for(let i=0;i<lines.length;){
    let l=lines[i];
    if(!l.trim()){i++;continue}
    if(l.startsWith('```')){let buf=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))buf.push(lines[i++]);i++;out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);continue}
    if(l.startsWith('|')&&i+1<lines.length&&/^\|?[-:| ]+$/.test(lines[i+1])){let buf=[l,lines[i+1]];i+=2;while(i<lines.length&&lines[i].startsWith('|'))buf.push(lines[i++]);out.push(`<div class="table-wrap">${table(buf)}</div>`);continue}
    let m=l.match(/^(#{1,6})\s+(.+)$/); if(m){let n=m[1].length;out.push(`<h${n}>${inline(m[2])}</h${n}>`);i++;continue}
    if(l.trim()==='---'){out.push('<hr/>');i++;continue}
    if(/^>\s?/.test(l)){let buf=[];while(i<lines.length&&/^>\s?/.test(lines[i]))buf.push(lines[i++].replace(/^>\s?/,''));out.push(`<blockquote>${buf.map(inline).join('<br>')}</blockquote>`);continue}
    if(/^[-*+]\s+/.test(l)){let buf=[];while(i<lines.length&&/^[-*+]\s+/.test(lines[i]))buf.push(lines[i++].replace(/^[-*+]\s+/,''));out.push(`<ul>${buf.map(x=>`<li>${inline(x)}</li>`).join('')}</ul>`);continue}
    if(/^\d+\.\s+/.test(l)){let buf=[];while(i<lines.length&&/^\d+\.\s+/.test(lines[i]))buf.push(lines[i++].replace(/^\d+\.\s+/,''));out.push(`<ol>${buf.map(x=>`<li>${inline(x)}</li>`).join('')}</ol>`);continue}
    out.push(`<p>${inline(l)}</p>`);i++;
  }
  return out.join('\n');
}
const input=arg('input'); if(!input){console.error('Usage: node render_geo_brand_diagnosis.js --input report.md --output-dir out');process.exit(1)}
const outdir=arg('output-dir','.'); fs.mkdirSync(outdir,{recursive:true}); const raw=fs.readFileSync(input,'utf8');
const doc=documentData(raw); const title=arg('title',doc.meta['标题']||(doc.body.match(/^#\s+(.+)$/m)||[,path.basename(input,'.md')])[1]);
const brand=doc.meta['品牌']||String(title).replace(/\s*GEO.*$/i,'').replace(/品牌\s*AI.*$/,'').trim();
const reportType=doc.meta['报告类型']||doc.meta['版本']||'品牌 AI 诊断';
const scope=doc.meta['测试范围']||'4 个 AI 平台 · 8 个关键问题';
const testDate=doc.meta['测试日期']||'日期未标注';
const initials=brand.slice(0,2);
const css=`:root{--ink:#17202a;--muted:#5f6b76;--line:#dfe4e8;--paper:#fff;--canvas:#eef1f2;--brand:#176b63;--brand-dark:#0e3d39;--brand-soft:#eaf4f2;--risk:#b64235;--risk-soft:#fbefed}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',Arial,sans-serif;font-size:16px;line-height:1.75;letter-spacing:0}.page{max-width:1080px;margin:auto;padding:28px 28px 56px}.cover{position:relative;min-height:500px;background:var(--brand-dark);color:#fff;border-radius:6px;padding:46px 52px 38px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between}.cover:after{content:"";position:absolute;right:-110px;bottom:-180px;width:430px;height:430px;border:1px solid rgba(255,255,255,.14);border-radius:50%;box-shadow:0 0 0 60px rgba(255,255,255,.035),0 0 0 120px rgba(255,255,255,.025)}.cover-top,.cover-main,.cover-meta{position:relative;z-index:1}.brand-lockup{display:flex;align-items:center;gap:13px}.brand-mark{width:52px;height:52px;display:grid;place-items:center;background:#fff;color:var(--brand-dark);font-size:18px;font-weight:800;border-radius:4px}.brand-name{font-size:22px;font-weight:750}.brand-en{display:block;color:#a9c9c5;font-size:11px;font-weight:600;text-transform:uppercase}.cover-kicker{margin:0 0 14px;color:#9fd0ca;font-size:13px;font-weight:750;text-transform:uppercase}.cover h1{margin:0;max-width:780px;color:#fff;font-size:46px;line-height:1.18}.cover-summary{max-width:800px;margin:24px 0 0;padding-left:18px;border-left:4px solid #79beb6;color:#e8f3f1;font-size:20px;line-height:1.65}.cover-meta{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:1px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.14)}.meta-item{background:rgba(7,42,39,.88);padding:15px 17px}.meta-label{display:block;color:#8fbab5;font-size:11px}.meta-value{display:block;margin-top:3px;color:#fff;font-size:14px;font-weight:650}.content{background:var(--paper);padding:22px 42px 48px;margin-top:16px;border:1px solid var(--line);border-radius:6px}h1{display:none}h2{color:var(--ink);font-size:24px;line-height:1.35;margin:42px 0 16px;padding-bottom:10px;border-bottom:2px solid var(--brand)}h3{color:var(--brand);font-size:19px;line-height:1.45;margin:28px 0 10px}p{margin:10px 0 16px}ul,ol{padding-left:24px;margin:10px 0 20px}li{margin:7px 0}strong,b{color:#0f3f3b}blockquote{margin:18px 0 24px;padding:18px 20px;background:var(--brand-soft);border-left:5px solid var(--brand);color:#163d39;font-size:18px;font-weight:650}a{color:#0d625a;text-decoration-color:#86b9b4;text-underline-offset:3px;overflow-wrap:anywhere}a:hover{color:#084c46}.table-wrap{width:100%;overflow-x:auto;margin:18px 0 24px;border:1px solid var(--line);border-radius:6px}table{width:100%;border-collapse:collapse;background:white;min-width:640px}th,td{border-bottom:1px solid var(--line);padding:11px 13px;vertical-align:top;text-align:left}th{background:var(--brand-soft);color:#174a45;font-weight:700}tr:last-child td{border-bottom:0}pre{background:#18222b;color:#e5e7eb;border-radius:6px;padding:16px;overflow:auto}code{background:#edf1f3;border-radius:4px;padding:2px 5px}pre code{background:transparent}hr{border:0;border-top:1px solid var(--line);margin:32px 0}@media(max-width:720px){body{font-size:15px}.page{padding:10px 10px 32px}.cover{min-height:560px;padding:28px 22px 24px}.brand-mark{width:46px;height:46px}.cover h1{font-size:34px}.cover-summary{font-size:17px}.cover-meta{grid-template-columns:1fr}.meta-item{padding:10px 13px}.content{padding:8px 20px 32px;margin-top:10px}h2{font-size:21px;margin-top:34px}h3{font-size:18px}blockquote{font-size:16px;padding:15px}.table-wrap{margin-left:0;margin-right:0}}@media print{body{background:#fff}.page{max-width:none;padding:0}.cover{min-height:94vh;break-after:page;border-radius:0}.content{border:0;padding-left:0;padding-right:0}.table-wrap{overflow:visible}a{color:inherit;text-decoration:none}}`;
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body><main class="page"><header class="cover"><div class="cover-top"><div class="brand-lockup"><div class="brand-mark">${esc(initials)}</div><div><span class="brand-name">${esc(brand)}</span><span class="brand-en">Brand Intelligence Report</span></div></div></div><div class="cover-main"><p class="cover-kicker">GEO · Brand AI Diagnosis</p><h1>${esc(title)}</h1><p class="cover-summary">${inline(doc.summary||'看清 AI 是否认识、准确描述并主动推荐这个品牌。')}</p></div><div class="cover-meta"><div class="meta-item"><span class="meta-label">报告类型</span><span class="meta-value">${esc(reportType)}</span></div><div class="meta-item"><span class="meta-label">测试范围</span><span class="meta-value">${esc(scope)}</span></div><div class="meta-item"><span class="meta-label">测试日期</span><span class="meta-value">${esc(testDate)}</span></div></div></header><article class="content">${md(doc.body)}</article></main></body></html>`;
const htmlPath=path.join(outdir,path.basename(input,'.md')+'.html'); fs.writeFileSync(htmlPath,html,'utf8'); console.log('HTML:',htmlPath);
if(process.argv.includes('--png')){
  const png=path.join(outdir,path.basename(input,'.md')+'.png');
  const js=path.join(outdir,'_shot.js');
  const shot=`const { chromium } = require('playwright');\n(async()=>{\n  const b=await chromium.launch({headless:true});\n  const p=await b.newPage({viewport:{width:1280,height:1600},deviceScaleFactor:2});\n  await p.goto(${JSON.stringify(pathToFileURL(path.resolve(htmlPath)).href)});\n  await p.screenshot({path:${JSON.stringify(path.resolve(png))},fullPage:true});\n  await b.close();\n})();\n`;
  fs.writeFileSync(js,shot,'utf8');
  try{child_process.execFileSync(process.execPath,[js],{stdio:'ignore'});console.log('PNG:',png)}catch{console.error('PNG skipped: playwright/chromium not available. HTML is ready. PNG is optional and not part of the default student workflow.')} try{fs.unlinkSync(js)}catch{}
}
