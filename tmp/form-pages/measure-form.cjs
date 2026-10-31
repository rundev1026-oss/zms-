const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const dir = __dirname;
const pdf = fs.readFileSync(path.join(dir, 'master.pdf')).toString('base64');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 2000 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0"><canvas id="c"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  window.measure = async (pageNumber) => {
    const data = Uint8Array.from(atob('${pdf}'), (c) => c.charCodeAt(0));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const pdfPage = await doc.getPage(pageNumber);
    const viewport = pdfPage.getViewport({ scale: 2 });
    const canvas = document.getElementById('c');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const ink = (x, y) => {
      const i = (y * w + x) * 4;
      const lum = image.data[i] * 0.3 + image.data[i + 1] * 0.59 + image.data[i + 2] * 0.11;
      return lum < 170;
    };
    const lines = [];
    for (let y = 0; y < h; y += 1) {
      let count = 0;
      let minX = w;
      let maxX = 0;
      for (let x = 30; x < w - 30; x += 2) {
        if (ink(x, y)) {
          count += 1;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
      if (count > 70) lines.push({ y: Math.round(y / 2), x: Math.round(minX / 2), w: Math.round((maxX - minX) / 2), n: count });
    }
    const boxes = [];
    for (let y = 8; y < h - 20; y += 3) {
      for (let x = 8; x < w - 20; x += 3) {
        if (!ink(x, y)) continue;
        let edge = 0;
        const size = 16;
        for (let k = 0; k < size; k += 2) {
          if (ink(x + k, y)) edge += 1;
          if (ink(x + k, y + size)) edge += 1;
          if (ink(x, y + k)) edge += 1;
          if (ink(x + size, y + k)) edge += 1;
        }
        let inside = 0;
        for (let ky = 4; ky < size - 4; ky += 3) {
          for (let kx = 4; kx < size - 4; kx += 3) if (ink(x + kx, y + ky)) inside += 1;
        }
        if (edge > 16 && inside < 3) boxes.push({ x: Math.round(x / 2), y: Math.round(y / 2) });
      }
    }
    const uniqueBoxes = [];
    for (const box of boxes) {
      if (!uniqueBoxes.some((item) => Math.abs(item.x - box.x) < 6 && Math.abs(item.y - box.y) < 6)) uniqueBoxes.push(box);
    }
    const uniqueLines = [];
    for (const line of lines) {
      const last = uniqueLines[uniqueLines.length - 1];
      if (last && Math.abs(last.y - line.y) < 2 && Math.abs(last.x - line.x) < 8) continue;
      uniqueLines.push(line);
    }
    return { w: w / 2, h: h / 2, lines: uniqueLines, boxes: uniqueBoxes };
  };
</script></body></html>`, { waitUntil: 'networkidle0', timeout: 60000 });

  for (let number = 1; number <= 3; number += 1) {
    const result = await page.evaluate((pageNumber) => window.measure(pageNumber), number);
    fs.writeFileSync(path.join(dir, `measure-${number}.json`), JSON.stringify(result));
    console.log('page', number, 'lines', result.lines.length, 'boxes', result.boxes.length);
  }
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
