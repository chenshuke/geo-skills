const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-gpu'],
    headless: true
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 1400 });

  const htmlPath = path.resolve('./templates/geo_combined_template.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`Content height: ${bodyHeight}px`);

  await page.evaluate((height) => {
    const style = document.createElement('style');
    style.textContent = `@page { size: 960px ${height + 20}px; margin: 0; }`;
    document.head.appendChild(style);
  }, bodyHeight);

  const pdfBytes = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();

  const outputPath = './output/必火GEO服务报价单（完整版）.pdf';
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`PDF saved: ${outputPath}`);
})();
