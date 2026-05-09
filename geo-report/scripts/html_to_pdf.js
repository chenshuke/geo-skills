/**
 * 必火GEO报价单 - HTML转PDF通用脚本
 * 用法: node html_to_pdf.js <input.html> <output.pdf>
 * 特性: 自动获取页面内容高度，生成精确单页PDF
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const [,, inputHtml, outputPdf] = process.argv;
if (!inputHtml || !outputPdf) {
  console.error('Usage: node html_to_pdf.js <input.html> <output.pdf>');
  process.exit(1);
}

const inputPath = path.resolve(inputHtml);
const outputPath = path.resolve(outputPdf);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-gpu'],
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 2000 });
  await page.goto(`file://${inputPath}`, { waitUntil: 'networkidle0' });

  // 获取实际内容高度
  const h = await page.evaluate(() => document.body.scrollHeight);
  console.log(`Content height: ${h}px`);

  // 注入精确页面尺寸
  await page.evaluate((h) => {
    const s = document.createElement('style');
    s.textContent = `@page { size: 960px ${h + 20}px; margin: 0; }`;
    document.head.appendChild(s);
  }, h);

  const pdf = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();
  fs.writeFileSync(outputPath, pdf);
  console.log(`PDF saved: ${outputPath}`);
})();
