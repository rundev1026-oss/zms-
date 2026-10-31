const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const dir = __dirname;
const sourceName = process.argv[2] || 'master.pdf';
const prefix = process.argv[3] || 'page';
const pdf = fs.readFileSync(path.join(dir, sourceName)).toString('base64');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 2000, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0"><canvas id="c"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  window.renderPage = async (pageNumber) => {
    const data = Uint8Array.from(atob('${pdf}'), (c) => c.charCodeAt(0));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const pdfPage = await doc.getPage(pageNumber);
    const viewport = pdfPage.getViewport({ scale: 2 });
    const canvas = document.getElementById('c');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return { width: viewport.width, height: viewport.height, pages: doc.numPages };
  };
</script></body></html>`, { waitUntil: 'networkidle0', timeout: 60000 });

  const first = await page.evaluate((pageNumber) => window.renderPage(pageNumber), 1);
  const pageCount = first.pages;
  for (let number = 1; number <= pageCount; number += 1) {
    const size = number === 1 ? first : await page.evaluate((pageNumber) => window.renderPage(pageNumber), number);
    const canvas = await page.$('#c');
    await canvas.screenshot({ path: path.join(dir, `${prefix}-${number}.png`) });
    console.log(JSON.stringify({ number, ...size, pages: pageCount }));
  }
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
