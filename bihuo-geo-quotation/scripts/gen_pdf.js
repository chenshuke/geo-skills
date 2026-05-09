const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function generatePDF(htmlFile, outputFile) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-gpu'],
    headless: true
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1200 });
  
  const htmlPath = path.resolve(htmlFile);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Get the actual content height
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`[${path.basename(htmlFile)}] Screen content height: ${bodyHeight}px`);

  // Inject dynamic page size CSS
  await page.evaluate((height) => {
    const style = document.createElement('style');
    style.textContent = `@page { size: 794px ${height + 20}px; margin: 0; }`;
    document.head.appendChild(style);
  }, bodyHeight);

  const pdfBytes = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();
  fs.writeFileSync(outputFile, pdfBytes);
  console.log(`[${path.basename(htmlFile)}] PDF saved: ${outputFile}`);
}

(async () => {
  await generatePDF(
    './templates/geo_service_template.html',
    './output/必火GEO服务报价单_9800.pdf'
  );
  await generatePDF(
    './templates/geo_training_template.html',
    './output/必火GEO训练营报名单_2980.pdf'
  );
  console.log('All PDFs generated!');
})();
