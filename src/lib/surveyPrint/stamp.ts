import { readFileSync } from 'fs';
import path from 'path';
import { PDFDocument, PDFFont, PDFPage, rgb, type PDFImage } from 'pdf-lib';
import * as fontkitModule from '@pdf-lib/fontkit';
import type { SurveyPrintModel } from './model';

function fontkitEngine() {
  const loaded = fontkitModule as unknown as {
    create?: (data: Uint8Array) => unknown;
    default?: { create: (data: Uint8Array) => unknown };
  };
  return (loaded.default?.create ? loaded.default : loaded) as Parameters<PDFDocument['registerFontkit']>[0];
}

const INK = rgb(0, 0, 0); // Pure professional black

type Slot = {
  x: number;
  y: number; // Native PDF coordinate (baseline from bottom)
  w: number;
  size?: number;
  align?: 'left' | 'center' | 'right';
};

function fitText(font: PDFFont, value: string, size: number, maxWidth: number): { text: string; size: number } {
  let next = size;
  while (next > 5.5 && font.widthOfTextAtSize(value, next) > maxWidth) next -= 0.3;
  if (font.widthOfTextAtSize(value, next) <= maxWidth) return { text: value, size: next };
  let shown = value;
  while (shown.length > 1 && font.widthOfTextAtSize(`${shown}...`, next) > maxWidth) shown = shown.slice(0, -1);
  return { text: `${shown}...`, size: next };
}

function draw(page: PDFPage, font: PDFFont, value: string | null | undefined, slot: Slot) {
  const text = value?.trim();
  if (!text) return;
  const size = slot.size ?? 9;
  const fitted = fitText(font, text, size, slot.w);
  const width = font.widthOfTextAtSize(fitted.text, fitted.size);
  let x = slot.x;
  if (slot.align === 'right') x = slot.x + slot.w - width;
  else if (slot.align === 'center') x = slot.x + (slot.w - width) / 2;
  page.drawText(fitted.text, { x, y: slot.y, size: fitted.size, font, color: INK });
}

function drawCheck(page: PDFPage, x: number, y: number) {
  page.drawLine({
    start: { x: x - 3.2, y: y - 0.4 },
    end: { x: x - 0.6, y: y - 3.6 },
    thickness: 1.35,
    color: INK,
  });
  page.drawLine({
    start: { x: x - 0.6, y: y - 3.6 },
    end: { x: x + 4.2, y: y + 3.4 },
    thickness: 1.35,
    color: INK,
  });
}

function wrap(font: PDFFont, value: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const words = value.split(/\s+/);
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let piece = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(piece + ch, size) > maxWidth) {
            lines.push(piece);
            piece = ch;
          } else {
            piece += ch;
          }
        }
        current = piece;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

const KNOWN_PREFIXES = ['นางสาว', 'นาง', 'นาย', 'ด.ช.', 'ด.ญ.', 'เด็กชาย', 'เด็กหญิง', 'อิหม่าม', 'ฮัจญี', 'ฮัจญะห์'];

function splitStoredName(full: string | null): { given: string; surname: string } {
  if (!full) return { given: '', surname: '' };
  let rest = full.trim();
  let prefix = '';
  for (const item of KNOWN_PREFIXES) {
    if (rest === item || rest.startsWith(`${item} `)) {
      prefix = item;
      rest = rest.slice(item.length).trim();
      break;
    }
  }
  const parts = rest.split(/\s+/).filter(Boolean);
  const given = [prefix, parts[0] || ''].filter(Boolean).join(' ');
  return { given, surname: parts.slice(1).join(' ') };
}

interface ParsedAddress {
  house: string | null;
  moo: string | null;
  soi: string | null;
  road: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postcode: string | null;
}

function parseThaiAddress(address: string | null): ParsedAddress {
  if (!address) {
    return { house: null, moo: null, soi: null, road: null, subdistrict: null, district: null, province: null, postcode: null };
  }
  let str = address.trim();

  let postcode: string | null = null;
  const pcMatch = str.match(/\b(\d{5})\b$/);
  if (pcMatch) {
    postcode = pcMatch[1];
    str = str.replace(/\b\d{5}\b$/, '').trim();
  }

  let house: string | null = null;
  const houseMatch = str.match(/^(\d[\d/-]*)\s*/);
  if (houseMatch) {
    house = houseMatch[1];
    str = str.slice(houseMatch[0].length).trim();
  }

  let moo: string | null = null;
  const mooMatch = str.match(/(?:หมู่ที่|หมู่|ม\.)\s*(\d+)/);
  if (mooMatch) {
    moo = mooMatch[1];
    str = str.replace(mooMatch[0], '').trim();
  }

  let soi: string | null = null;
  const soiMatch = str.match(/(?:ซอย|ซ\.|ชุมชน)\s*([^\s]+)/);
  if (soiMatch) {
    soi = soiMatch[0];
    str = str.replace(soiMatch[0], '').trim();
  }

  let road: string | null = null;
  const roadMatch = str.match(/(?:ถนน|ถ\.)\s*([^\s]+)/);
  if (roadMatch) {
    road = roadMatch[1];
    str = str.replace(roadMatch[0], '').trim();
  }

  let subdistrict: string | null = null;
  const subMatch = str.match(/(?:แขวง|ตำบล|ต\.)\s*([^\s]+)/);
  if (subMatch) {
    subdistrict = subMatch[1];
    str = str.replace(subMatch[0], '').trim();
  }

  let district: string | null = null;
  const distMatch = str.match(/(?:เขต|อำเภอ|อ\.)\s*([^\s]+)/);
  if (distMatch) {
    district = distMatch[1];
    str = str.replace(distMatch[0], '').trim();
  }

  let province: string | null = null;
  const provMatch = str.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/);
  if (provMatch) {
    province = provMatch[1];
    str = str.replace(provMatch[0], '').trim();
  }

  if (str && !soi && !district) {
    soi = str;
  }

  return { house, moo, soi, road, subdistrict, district, province, postcode };
}

function isMoney(value: string | null): boolean {
  if (!value) return false;
  return /^[\d\s,.\u0e50-\u0e59]+$/.test(value);
}

function fillPage1(page: PDFPage, font: PDFFont, model: SurveyPrintModel, includeContact = true) {
  // 1.1 ชื่อ ... นามสกุล (template text baseline y = 587.0)
  const given = [model.titlePrefix, model.firstName].filter(Boolean).join(' ');
  draw(page, font, given, { x: 265, y: 588.0, w: 110, size: 9.5 });
  draw(page, font, model.lastName, { x: 425, y: 588.0, w: 145, size: 9.5 });

  if (!includeContact) return;

  // วัน/เดือน/ปีเกิด ... เบอร์โทร (template text baseline y = 566.0)
  draw(page, font, model.birthDay, { x: 112, y: 567.0, w: 28, size: 9.5, align: 'center' });
  draw(page, font, model.birthMonth, { x: 150, y: 567.0, w: 68, size: 9.5, align: 'center' });
  draw(page, font, model.birthYear, { x: 230, y: 567.0, w: 52, size: 9.5, align: 'center' });
  draw(page, font, model.phone, { x: 345, y: 567.0, w: 225, size: 9.5 });

  // อายุ ... เลขประจำตัวบัตรประชาชน (template text baseline y = 545.0)
  let ageStr = model.age;
  if (!ageStr && model.birthYear) {
    const by = parseInt(model.birthYear, 10);
    if (by > 2400) ageStr = String(new Date().getFullYear() + 543 - by);
  }
  draw(page, font, ageStr, { x: 65, y: 546.0, w: 38, size: 9.5, align: 'center' });
  draw(page, font, model.nationalId, { x: 250, y: 546.0, w: 320, size: 9.5 });

  // ที่อยู่ปัจจุบัน (template baseline y = 523.9)
  const fullAddrStr = [model.addressLine, model.community].filter(Boolean).join(' ');
  const pAddr = parseThaiAddress(fullAddrStr);
  draw(page, font, pAddr.house || model.addressLine, { x: 145, y: 524.9, w: 32, size: 8.5 });
  if (pAddr.moo) draw(page, font, pAddr.moo, { x: 195, y: 524.9, w: 25, size: 8.5, align: 'center' });
  draw(page, font, pAddr.soi || model.community, { x: 245, y: 524.9, w: 85, size: 8.5 });
  if (pAddr.road) draw(page, font, pAddr.road, { x: 350, y: 524.9, w: 60, size: 8.5 });
  draw(page, font, model.subdistrict || pAddr.subdistrict, { x: 470, y: 524.9, w: 100, size: 8.5 });

  // เขต/อำเภอ... จังหวัด... อาชีพ... (template baseline y = 502.9)
  draw(page, font, model.district || pAddr.district, { x: 105, y: 503.9, w: 125, size: 8.5 });
  draw(page, font, [model.province || pAddr.province, model.postcode || pAddr.postcode].filter(Boolean).join(' '), { x: 285, y: 503.9, w: 130, size: 8.5 });
  draw(page, font, model.occupation, { x: 460, y: 503.9, w: 110, size: 8.5 });

  // สถานะ (template baseline y = 482.1)
  const maritalChecks: Record<string, number> = {
    single: 128,
    married: 186,
    separated: 294,
    widowed: 405,
    divorced: 430,
  };
  const mCode = model.maritalCode?.toLowerCase() || '';
  if (maritalChecks[mCode]) {
    drawCheck(page, maritalChecks[mCode], 484.5);
  } else if (model.maritalStatus) {
    if (model.maritalStatus.includes('สมรส') || model.maritalStatus.includes('แต่งงาน')) {
      drawCheck(page, 186, 484.5);
    } else if (model.maritalStatus.includes('โสด')) {
      drawCheck(page, 128, 484.5);
    } else if (model.maritalStatus.includes('หม้าย')) {
      drawCheck(page, 405, 484.5);
    } else if (model.maritalStatus.includes('หย่า')) {
      drawCheck(page, 430, 484.5);
    } else {
      drawCheck(page, 500, 484.5);
      draw(page, font, model.maritalStatus, { x: 525, y: 483.0, w: 60, size: 8 });
    }
  }

  // ที่อยู่อาศัย (Row 1 y = 461.1, Row 2 y = 440.1)
  const hCode = model.housingCode?.toLowerCase() || '';
  if (hCode === 'own') drawCheck(page, 130, 463.5);
  else if (hCode === 'rent') drawCheck(page, 426, 463.5);
  else if (hCode === 'relative') drawCheck(page, 130, 442.5);
  else if (hCode === 'other' || model.housingType) {
    drawCheck(page, 246, 442.5);
    draw(page, font, model.housingNotes || model.housingType, { x: 285, y: 441.0, w: 285, size: 8 });
  }

  // โฉนดที่ดิน (template baseline y = 419.1)
  const hasTitle = ['title_deed', 'ns3', 'nor_sor_3', 'spk', 'sor_por_kor', 'permission_granted', 'rental_agreement'].includes(model.landCode || '');
  const noTitle = ['no_doc', 'none', 'public_land'].includes(model.landCode || '');
  if (hasTitle || (model.landTitle && !model.landTitle.includes('ไม่มี'))) drawCheck(page, 390, 421.5);
  else if (noTitle || (model.landTitle && model.landTitle.includes('ไม่มี'))) drawCheck(page, 465, 421.5);

  // 1.2 สาเหตุที่ควรได้รับการช่วยเหลือ
  // Row 1: y = 365.5
  if (model.reasons[0]?.checked) drawCheck(page, 51.5, 367.5); // 1.2.1 ยากจน
  if (model.reasons[1]?.checked) { // 1.2.2 มีหนี้สิน
    drawCheck(page, 267.5, 367.5);
    draw(page, font, model.debt?.type || model.reasons[1].detail, { x: 385, y: 366.5, w: 95, size: 7.5 });
    draw(page, font, model.debt?.balance, { x: 520, y: 366.5, w: 42, size: 7.5, align: 'right' });
  }
  // Row 2: y = 344.5
  if (model.reasons[2]?.checked) drawCheck(page, 51.5, 346.5); // 1.2.3 ตกงาน
  if (model.reasons[3]?.checked) drawCheck(page, 267.5, 346.5); // 1.2.4 ปัญหาครอบครัว
  // Row 3: y = 323.5
  if (model.reasons[4]?.checked) { // 1.2.5 อื่นๆ
    drawCheck(page, 51.5, 325.5);
    draw(page, font, model.reasons[4].detail, { x: 120, y: 324.5, w: 450, size: 8 });
  }

  // 1.3 สภาพปัจจุบัน
  if (model.disability) {
    drawCheck(page, 51.5, 275.5);
    draw(page, font, model.disability, { x: 210, y: 274.5, w: 360, size: 8 });
  }
  if (model.illness) {
    drawCheck(page, 51.5, 254.5);
    draw(page, font, model.illness, { x: 160, y: 253.5, w: 410, size: 8 });
  }
  if (model.limitations) {
    drawCheck(page, 51.5, 233.5);
    draw(page, font, model.limitations, { x: 180, y: 232.5, w: 390, size: 8 });
  }

  // 1.4 ความต้องการความช่วยเหลือ (template baseline y = 173.0)
  if (model.assistanceNeeds.length) {
    draw(page, font, model.assistanceNeeds.join(', '), { x: 125, y: 174.0, w: 445, size: 8.5 });
  }

  // 1.5 ประวัติการได้รับความช่วยเหลือ
  if (model.pastAssistance.length === 0) {
    drawCheck(page, 51.5, 129.5); // ไม่เคยได้รับ
  } else {
    drawCheck(page, 164.5, 129.5); // เคยได้รับ
    const p1 = model.pastAssistance[0];
    if (p1) {
      draw(page, font, p1.type || p1.notes, { x: 190, y: 107.3, w: 380, size: 8 });
      if (isMoney(p1.amount)) {
        drawCheck(page, 174, 87.3);
        draw(page, font, p1.amount, { x: 245, y: 86.3, w: 90, size: 8, align: 'right' });
      } else if (p1.amount) {
        drawCheck(page, 389, 87.3);
        draw(page, font, p1.amount, { x: 435, y: 86.3, w: 135, size: 8 });
      }
      draw(page, font, p1.year, { x: 85, y: 65.3, w: 180, size: 8 });
      draw(page, font, p1.agency, { x: 345, y: 65.3, w: 225, size: 8 });
    }
  }
}

function fillPage2(page: PDFPage, font: PDFFont, model: SurveyPrintModel) {
  // 1.5.2 (if exists)
  if (model.pastAssistance.length > 1) {
    const p2 = model.pastAssistance[1];
    draw(page, font, p2.type || p2.notes, { x: 220, y: 683.6, w: 350, size: 8 });
    if (isMoney(p2.amount)) {
      drawCheck(page, 174, 663.6);
      draw(page, font, p2.amount, { x: 250, y: 662.6, w: 90, size: 8, align: 'right' });
    } else if (p2.amount) {
      drawCheck(page, 389, 663.6);
      draw(page, font, p2.amount, { x: 435, y: 662.6, w: 135, size: 8 });
    }
    draw(page, font, p2.year, { x: 85, y: 641.6, w: 180, size: 8 });
    draw(page, font, p2.agency, { x: 345, y: 641.6, w: 225, size: 8 });
  }

  // 1.6 สภาพเศรษฐกิจ
  const incomeBaselines = [541.1, 522.7, 504.3, 486.1, 467.7, 449.3, 431.1];
  const expenseBaselines = [541.1, 522.7, 504.3, 486.1, 467.7, 449.3, 431.1];

  model.incomeRows.slice(0, 7).forEach((row, idx) => {
    if (row.amount && row.amount !== '0.00' && row.amount !== '0') {
      draw(page, font, row.amount, { x: 200, y: incomeBaselines[idx] + 1.0, w: 98, size: 8.5, align: 'right' });
    } else {
      draw(page, font, '-', { x: 200, y: incomeBaselines[idx] + 1.0, w: 98, size: 8.5, align: 'right' });
    }
  });

  model.expenseRows.slice(0, 7).forEach((row, idx) => {
    if (row.amount && row.amount !== '0.00' && row.amount !== '0') {
      draw(page, font, row.amount, { x: 410, y: expenseBaselines[idx] + 1.0, w: 98, size: 8.5, align: 'right' });
    } else {
      draw(page, font, '-', { x: 410, y: expenseBaselines[idx] + 1.0, w: 98, size: 8.5, align: 'right' });
    }
  });

  // Totals
  draw(page, font, model.incomeTotal || '0.00', { x: 195, y: 401.3, w: 82, size: 8.5, align: 'right' });
  draw(page, font, model.expenseTotal || '0.00', { x: 420, y: 401.3, w: 86, size: 8.5, align: 'right' });

  // อธิบายเพิ่มเติม (ถ้ามี)
  const notesList = [
    model.debt?.monthly ? `ชำระหนี้รายเดือน ${model.debt.monthly} บาท (${model.debt.type || ''})` : null,
    model.incomeRows[7]?.amount && model.incomeRows[7].amount !== '0.00' ? `รายได้อื่น ${model.incomeRows[7].amount} บาท` : null,
    model.expenseRows[6]?.amount && model.expenseRows[6].amount !== '0.00' ? `รายจ่ายอื่น ${model.expenseRows[6].amount} บาท` : null,
  ].filter(Boolean);

  if (notesList.length > 0) {
    if (notesList.length === 1) {
      draw(page, font, notesList[0], { x: 145, y: 354.9, w: 425, size: 8 });
    } else {
      draw(page, font, notesList[0], { x: 145, y: 354.9, w: 425, size: 8 });
      draw(page, font, notesList.slice(1).join(' · '), { x: 45, y: 333.9, w: 525, size: 8 });
    }
  }

  // 1.7 ประวัติครอบครัว (10 rows)
  fillMembers(page, font, model.members, 0);
}

function fillMembers(page: PDFPage, font: PDFFont, members: SurveyPrintModel['members'], startIndex: number) {
  const memberBaselines = [258.5, 237.1, 215.4, 194.1, 172.7, 151.3, 129.7, 108.2, 86.8, 65.2];
  members.slice(startIndex, startIndex + 10).forEach((m, idx) => {
    const y = memberBaselines[idx];
    const relationNote = [m.relation, m.notes].filter(Boolean).join(' ');
    draw(page, font, m.name, { x: 86, y, w: 135, size: 7.5 });
    draw(page, font, m.age, { x: 227, y, w: 37, size: 7.5, align: 'center' });
    draw(page, font, m.education || '-', { x: 270, y, w: 112, size: 7.5 });
    draw(page, font, m.occupation || '-', { x: 390, y, w: 64, size: 7.5 });
    draw(page, font, m.income || '0.00', { x: 460, y, w: 48, size: 7.5, align: 'right' });
    draw(page, font, relationNote || '-', { x: 520, y, w: 52, size: 7.5 });
  });
}

function fillPage3(page: PDFPage, font: PDFFont, model: SurveyPrintModel): string[] {
  // 1.8 สถานภาพครอบครัวโดยละเอียด (4 lines)
  const situationText = [
    model.familySituation,
    model.dependentBurdens ? `(ภาระเลี้ยงดู: ${model.dependentBurdens})` : null,
  ].filter(Boolean).join(' ');
  const lines = wrap(font, situationText, 9, 520);
  const situationBaselines = [674.6, 653.8, 632.8, 611.8];
  lines.slice(0, 4).forEach((line, idx) => {
    draw(page, font, line, { x: 45, y: situationBaselines[idx] + 1.0, w: 525, size: 9 });
  });

  // 2.2 รายละเอียดของผู้ประสานงาน
  const coord = model.coordinator || {};
  const coordPerson = splitStoredName(coord.name);
  draw(page, font, coordPerson.given, { x: 215, y: 306.1, w: 145, size: 9.5 });
  draw(page, font, coordPerson.surname, { x: 430, y: 306.1, w: 140, size: 9.5 });

  draw(page, font, coord.phone, { x: 95, y: 285.1, w: 115, size: 9 });
  draw(page, font, coord.occupation, { x: 265, y: 285.1, w: 110, size: 9 });
  draw(page, font, coord.role, { x: 435, y: 285.1, w: 135, size: 9 });

  draw(page, font, coord.age, { x: 68, y: 264.3, w: 40, size: 9, align: 'center' });
  draw(page, font, coord.nationalId, { x: 255, y: 264.3, w: 315, size: 9 });

  // Coordinator address
  const cAddr = parseThaiAddress(coord.address);
  if (cAddr.house) draw(page, font, cAddr.house, { x: 145, y: 243.3, w: 35, size: 8.5 });
  if (cAddr.moo) draw(page, font, cAddr.moo, { x: 205, y: 243.3, w: 25, size: 8.5, align: 'center' });
  draw(page, font, cAddr.soi || coord.address, { x: 250, y: 243.3, w: 80, size: 8.5 });
  if (cAddr.road) draw(page, font, cAddr.road, { x: 350, y: 243.3, w: 60, size: 8.5 });
  if (cAddr.subdistrict) draw(page, font, cAddr.subdistrict, { x: 470, y: 243.3, w: 100, size: 8.5 });

  if (cAddr.district) draw(page, font, cAddr.district, { x: 95, y: 222.3, w: 135, size: 8.5 });
  if (cAddr.province) draw(page, font, cAddr.province, { x: 275, y: 222.3, w: 125, size: 8.5 });
  if (coord.organization) draw(page, font, coord.organization, { x: 440, y: 222.3, w: 130, size: 8.5 });

  // Signatures at y = 191.5
  if (coord.name) {
    draw(page, font, coord.name, { x: 95, y: 192.5, w: 155, size: 9, align: 'center' });
  }
  const cert = model.certifier || {};
  if (cert.name) {
    draw(page, font, cert.name, { x: 375, y: 192.5, w: 155, size: 9, align: 'center' });
  }

  // Return overflow situation lines if any
  return lines.length > 4 ? lines.slice(4) : [];
}

async function embedImages(doc: PDFDocument, model: SurveyPrintModel): Promise<PDFImage[]> {
  const images: PDFImage[] = [];
  for (const image of model.images) {
    const match = image.dataUrl.match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/);
    if (!match) continue;
    const bytes = Buffer.from(match[2], 'base64');
    try {
      images.push(match[1] === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes));
    } catch {
      continue;
    }
  }
  return images;
}

function drawAppendix(
  doc: PDFDocument,
  font: PDFFont,
  model: SurveyPrintModel,
  overflowLines: string[],
  images: PDFImage[],
) {
  if (!overflowLines.length && !images.length) return;

  const A4_W = 612;
  const A4_H = 792;
  let page = doc.addPage([A4_W, A4_H]);
  let y = A4_H - 48;

  const writeLine = (text: string, size: number, indent = 48) => {
    const lines = wrap(font, text, size, A4_W - indent - 40);
    for (const line of lines) {
      if (y < 56) {
        page = doc.addPage([A4_W, A4_H]);
        y = A4_H - 48;
      }
      page.drawText(line, { x: indent, y, size, font, color: INK });
      y -= size + 5;
    }
  };

  writeLine('ภาคผนวก', 16);
  y -= 6;

  if (overflowLines.length) {
    writeLine('1.8 สถานภาพครอบครัวโดยละเอียด (ข้อความส่วนที่เกินแบบฟอร์ม)', 12);
    for (const line of overflowLines) {
      writeLine(line, 9, 60);
    }
    y -= 10;
  }

  const captions = model.images.map((image) => image.caption);
  images.forEach((image, index) => {
    const maxW = A4_W - 96;
    const maxH = 220;
    const ratio = Math.min(maxW / image.width, maxH / image.height, 1);
    const width = image.width * ratio;
    const height = image.height * ratio;
    if (y < height + 36) {
      page = doc.addPage([A4_W, A4_H]);
      y = A4_H - 48;
    }
    writeLine(captions[index] || 'รูปภาพประกอบ', 10);
    y -= height;
    page.drawImage(image, { x: 48, y, width, height });
    y -= 16;
  });
}

export async function fillSurveyPdf(model: SurveyPrintModel): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), 'src', 'lib', 'surveyPrint', 'master-form.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Regular.ttf');
  const templateBytes = readFileSync(templatePath);

  const doc = await PDFDocument.load(templateBytes);
  const cleanDoc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkitEngine());
  const font = await doc.embedFont(readFileSync(fontPath), { subset: true });

  const [page1, page2, page3] = doc.getPages();

  fillPage1(page1, font, model, true);
  fillPage2(page2, font, model);
  const overflowLines = fillPage3(page3, font, model);

  // Additional past assistance entries beyond 2
  for (let index = 2; index < model.pastAssistance.length; index += 1) {
    const [extra] = await doc.copyPages(cleanDoc, [0]);
    doc.addPage(extra);
    fillPage1(extra, font, model, false);
    drawCheck(extra, 164.5, 129.5);
    const item = model.pastAssistance[index];
    if (item) {
      draw(extra, font, item.type || item.notes, { x: 190, y: 107.3, w: 380, size: 8 });
      if (isMoney(item.amount)) {
        drawCheck(extra, 174, 87.3);
        draw(extra, font, item.amount, { x: 245, y: 86.3, w: 90, size: 8, align: 'right' });
      } else if (item.amount) {
        drawCheck(extra, 389, 87.3);
        draw(extra, font, item.amount, { x: 435, y: 86.3, w: 135, size: 8 });
      }
      draw(extra, font, item.year, { x: 85, y: 65.3, w: 180, size: 8 });
      draw(extra, font, item.agency, { x: 345, y: 65.3, w: 225, size: 8 });
    }
  }

  // Additional members beyond 10
  for (let index = 10; index < model.members.length; index += 10) {
    const [extra] = await doc.copyPages(cleanDoc, [1]);
    doc.addPage(extra);
    fillMembers(extra, font, model.members, index);
  }

  // Images & overflow appendix if needed (drawn directly on doc!)
  const images = await embedImages(doc, model);
  drawAppendix(doc, font, model, overflowLines, images);

  doc.setTitle(`แบบสำรวจเพื่อพิจารณาความช่วยเหลือของมูลนิธิซะกาตและสาธารณกุศล - ${model.registryNumber}`);
  doc.setAuthor(model.printedBy || '');

  return doc.save();
}
