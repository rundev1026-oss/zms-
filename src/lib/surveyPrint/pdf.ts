import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

function browserPath(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate)) || null;
}

function headerText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function htmlToPdf(
  html: string,
  meta: { registryNumber: string; fullName: string; printedAt: string; printedBy: string },
): Promise<Buffer> {
  const executablePath = browserPath();
  if (!executablePath) {
    throw new Error('ไม่พบ Chrome หรือ Edge สำหรับสร้างไฟล์ PDF');
  }
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await page.addStyleTag({
      content: '.running-header,.running-footer{display:none !important} .sheet{padding-top:0 !important;padding-bottom:0 !important}',
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
      headerTemplate: `<div style="font-size:8px;width:100%;padding:0 12mm;color:#44403c;font-family:'Leelawadee UI',Tahoma,sans-serif;display:flex;justify-content:space-between;"><span>แบบสำรวจเพื่อพิจารณาความช่วยเหลือ</span><span>${headerText(meta.registryNumber)} · ${headerText(meta.fullName)}</span></div>`,
      footerTemplate: `<div style="font-size:8px;width:100%;padding:0 12mm;color:#44403c;font-family:'Leelawadee UI',Tahoma,sans-serif;display:flex;justify-content:space-between;"><span>${headerText(meta.registryNumber)}</span><span>พิมพ์เมื่อ ${headerText(meta.printedAt)} · ผู้พิมพ์ ${headerText(meta.printedBy)}</span><span>หน้า <span class="pageNumber"></span> จาก <span class="totalPages"></span></span></div>`,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
