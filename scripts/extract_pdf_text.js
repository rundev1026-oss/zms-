const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function getBrowserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((c) => c && fs.existsSync(c)) || null;
}

async function extractText(pdfPath) {
  const pdfData = fs.readFileSync(pdfPath).toString('base64');
  const pdfJsCode = fs.readFileSync(path.join(__dirname, '../tmp/pdf.min.js'), 'utf8');
  const workerJsCode = fs.readFileSync(path.join(__dirname, '../tmp/pdf.worker.min.js'), 'utf8');

  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: true,
    args: ['--no-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script>${pdfJsCode}</script>
        <script>
          const workerBlob = new Blob([${JSON.stringify(workerJsCode)}], { type: 'application/javascript' });
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
        </script>
      </head>
      <body></body>
    </html>
  `;
  await page.setContent(html);

  const pagesText = await page.evaluate(async (base64Pdf) => {
    const raw = atob(base64Pdf);
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    const result = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const pageObj = await pdf.getPage(i);
      const textContent = await pageObj.getTextContent();
      const items = textContent.items.map((item) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
      }));
      result.push(items);
    }
    return result;
  }, pdfData);

  await browser.close();
  return pagesText;
}

const targetPdf = process.argv[2] || 'tmp/form-pages/filled-fixture.pdf';
extractText(targetPdf).then((pages) => {
  pages.forEach((items, pageIdx) => {
    console.log(`=== PAGE ${pageIdx + 1} (${items.length} items) ===`);
    items.forEach((item) => {
      if (item.str.trim()) {
        console.log(`[x=${item.x.toFixed(1)}, y=${item.y.toFixed(1)}]: ${JSON.stringify(item.str)}`);
      }
    });
  });
}).catch(console.error);

