const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function getBrowserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((c) => c && fs.existsSync(c)) || null;
}

async function renderPdfToImages(pdfPath, outputDir, prefix = 'page') {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pdfData = fs.readFileSync(pdfPath).toString('base64');
  const pdfJsCode = fs.readFileSync(path.join(__dirname, '../tmp/pdf.min.js'), 'utf8');
  const workerJsCode = fs.readFileSync(path.join(__dirname, '../tmp/pdf.worker.min.js'), 'utf8');

  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: true,
    args: ['--no-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 2000 });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script>${pdfJsCode}</script>
        <script>
          const workerBlob = new Blob([${JSON.stringify(workerJsCode)}], { type: 'application/javascript' });
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
        </script>
        <style>
          body { margin: 0; background: #333; }
          canvas { display: block; margin: 10px auto; }
        </style>
      </head>
      <body>
        <div id="container"></div>
      </body>
    </html>
  `;

  await page.setContent(html);

  const numPages = await page.evaluate(async (base64Pdf) => {
    const raw = atob(base64Pdf);
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    window.__pdf = pdf;
    return pdf.numPages;
  }, pdfData);

  console.log(`PDF has ${numPages} pages.`);
  const outputPaths = [];

  for (let i = 1; i <= numPages; i++) {
    const dataUrl = await page.evaluate(async (pageNum) => {
      const pdf = window.__pdf;
      const pageObj = await pdf.getPage(pageNum);
      const scale = 2.0; // High resolution
      const viewport = pageObj.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await pageObj.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/png');
    }, i);

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const outPath = path.join(outputDir, `${prefix}-${i}.png`);
    fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
    console.log(`Rendered page ${i} -> ${outPath}`);
    outputPaths.push(outPath);
  }

  await browser.close();
  return outputPaths;
}

if (require.main === module) {
  const targetPdf = process.argv[2] || 'tmp/form-pages/filled-fixture.pdf';
  const outDir = process.argv[3] || 'tmp/form-pages/renders';
  renderPdfToImages(targetPdf, outDir).then((paths) => {
    console.log('Done rendering:', paths);
  }).catch(console.error);
}

module.exports = { renderPdfToImages };

