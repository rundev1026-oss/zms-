import { readFileSync } from 'fs';
import path from 'path';
import { PDFDocument, PDFFont, PDFPage, rgb, type PDFImage } from 'pdf-lib';
import * as fontkitModule from '@pdf-lib/fontkit';

function fontkitEngine() {
  const loaded = fontkitModule as unknown as {
    create?: (data: Uint8Array) => unknown;
    default?: { create: (data: Uint8Array) => unknown };
  };
  return (loaded.default?.create ? loaded.default : loaded) as Parameters<PDFDocument['registerFontkit']>[0];
}
import type { SurveyPrintModel } from './model';

const LETTER_H = 792;
const A4_W = 595.28;
const A4_H = 841.89;
const SCALE = A4_W / 612;
const OFFSET_Y = (A4_H - LETTER_H * SCALE) / 2;
const INK = rgb(0.08, 0.16, 0.38);

const KNOWN_PREFIXES = ['นางสาว', 'นาง', 'นาย', 'อิหม่าม', 'ฮัจญี', 'ฮัจญะห์'];

type Slot = { x: number; top: number; w: number; size?: number; align?: 'left' | 'right' };

function baseline(top: number, lift = 3): number {
  return LETTER_H - top + lift;
}

function fitText(font: PDFFont, value: string, size: number, maxWidth: number): { text: string; size: number } {
  let next = size;
  while (next > 6 && font.widthOfTextAtSize(value, next) > maxWidth) next -= 0.4;
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
  const x = slot.align === 'right' ? slot.x + slot.w - width : slot.x;
  page.drawText(fitted.text, { x, y: baseline(slot.top), size: fitted.size, font, color: INK });
}

function drawCheck(page: PDFPage, x: number, top: number) {
  const y = LETTER_H - top;
  page.drawLine({ start: { x: x - 3.2, y: y - 0.4 }, end: { x: x - 0.6, y: y - 3.6 }, thickness: 1.35, color: INK });
  page.drawLine({ start: { x: x - 0.6, y: y - 3.6 }, end: { x: x + 4.2, y: y + 3.4 }, thickness: 1.35, color: INK });
}

function wrap(font: PDFFont, value: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const ch of value) {
    const next = current + ch;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current);
      current = ch.trimStart();
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function givenName(prefix: string, first: string): string {
  return [prefix.trim(), first.trim()].filter(Boolean).join(' ');
}

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

function houseToken(address: string | null): { house: string | null; rest: string | null } {
  if (!address) return { house: null, rest: null };
  const parts = address.trim().split(/\s+/);
  if (/^\d[\d/-]*$/.test(parts[0] || '')) {
    return { house: parts[0], rest: parts.slice(1).join(' ') || null };
  }
  return { house: null, rest: address.trim() };
}

function isMoney(value: string | null): boolean {
  if (!value) return false;
  return /^[\d\s,.\u0e50-\u0e59]+$/.test(value);
}

function fillIdentity(page: PDFPage, font: PDFFont, model: SurveyPrintModel, includeContact: boolean) {
  draw(page, font, givenName(model.titlePrefix, model.firstName), { x: 252, top: 199, w: 140, size: 10 });
  draw(page, font, model.lastName, { x: 430, top: 199, w: 145, size: 10 });
  if (!includeContact) return;
  draw(page, font, model.birthDay, { x: 122, top: 225, w: 34, size: 10, align: 'right' });
  draw(page, font, model.birthMonth, { x: 168, top: 225, w: 42, size: 10, align: 'right' });
  draw(page, font, model.birthYear, { x: 228, top: 225, w: 52, size: 10 });
  draw(page, font, model.phone, { x: 348, top: 225, w: 210, size: 10 });
  draw(page, font, model.age, { x: 70, top: 246, w: 42, size: 10, align: 'right' });
  draw(page, font, model.nationalId, { x: 258, top: 246, w: 300, size: 10 });

  const address = houseToken([model.addressLine, model.community].filter(Boolean).join(' ') || null);
  draw(page, font, address.house, { x: 145, top: 267, w: 28, size: 8 });
  draw(page, font, address.rest, { x: 240, top: 267, w: 165, size: 8 });
  draw(page, font, model.subdistrict, { x: 472, top: 267, w: 105, size: 8 });
  draw(page, font, model.district, { x: 98, top: 288, w: 125, size: 9 });
  draw(page, font, [model.province, model.postcode].filter(Boolean).join(' '), { x: 275, top: 288, w: 140, size: 9 });
  draw(page, font, model.occupation, { x: 458, top: 288, w: 115, size: 9 });
}

function fillChoices(page: PDFPage, font: PDFFont, model: SurveyPrintModel) {
  const marital: Record<string, number> = {
    single: 128,
    married: 186,
    separated: 294,
    divorced: 406,
    widowed: 406,
  };
  if (model.maritalCode && marital[model.maritalCode]) drawCheck(page, marital[model.maritalCode], 304);
  if (model.maritalCode && !marital[model.maritalCode]) {
    drawCheck(page, 498, 304);
    draw(page, font, model.maritalStatus, { x: 530, top: 310, w: 55, size: 8 });
  }

  const housingX: Record<string, { x: number; top: number }> = {
    own: { x: 128, top: 319 },
    relative: { x: 128, top: 345 },
    rent: { x: 424, top: 319 },
  };
  const housing = model.housingCode ? housingX[model.housingCode] : undefined;
  if (housing) drawCheck(page, housing.x, housing.top);
  if (model.housingCode && !housing) {
    drawCheck(page, 248, 345);
    draw(page, font, model.housingNotes || model.housingType, { x: 290, top: 351, w: 270, size: 8 });
  }

  const hasTitle = ['title_deed', 'ns3', 'nor_sor_3', 'spk', 'sor_por_kor', 'permission_granted', 'rental_agreement'].includes(model.landCode || '');
  const noTitle = ['no_doc', 'none', 'public_land'].includes(model.landCode || '');
  if (hasTitle) drawCheck(page, 388, 361);
  if (noTitle) drawCheck(page, 462, 361);

  const reasonX = [52, 266, 52, 266, 52];
  const reasonTop = [414, 414, 435, 435, 462];
  model.reasons.forEach((reason, index) => {
    if (reason.checked) drawCheck(page, reasonX[index], reasonTop[index]);
  });
  if (model.reasons[1]?.checked) {
    draw(page, font, model.debt?.type || model.reasons[1].detail, { x: 360, top: 420, w: 95, size: 8 });
    draw(page, font, model.debt?.balance, { x: 490, top: 420, w: 68, size: 8, align: 'right' });
  }
  if (model.reasons[4]?.checked && model.reasons[4].detail) {
    draw(page, font, model.reasons[4].detail, { x: 150, top: 468, w: 400, size: 8 });
  }

  if (model.disability) {
    drawCheck(page, 52, 517);
    draw(page, font, model.disability, { x: 230, top: 523, w: 330, size: 8 });
  }
  if (model.illness) {
    drawCheck(page, 52, 538);
    draw(page, font, model.illness, { x: 165, top: 544, w: 390, size: 8 });
  }
  if (model.limitations) {
    drawCheck(page, 52, 559);
    draw(page, font, model.limitations, { x: 150, top: 565, w: 400, size: 8 });
  }
  if (model.assistanceNeeds.length) {
    draw(page, font, model.assistanceNeeds.join(', '), { x: 128, top: 620, w: 430, size: 8 });
  }
}

function fillAssistance(page: PDFPage, font: PDFFont, row: SurveyPrintModel['pastAssistance'][number] | undefined, tops: { aspect: number; money: number; year: number }) {
  if (!row) return;
  draw(page, font, row.type || row.notes, { x: 220, top: tops.aspect, w: 340, size: 8 });
  if (isMoney(row.amount)) {
    drawCheck(page, 174, tops.money);
    draw(page, font, row.amount, { x: 248, top: tops.money, w: 95, size: 8, align: 'right' });
  } else if (row.amount) {
    drawCheck(page, 389, tops.money);
    draw(page, font, row.amount, { x: 432, top: tops.money, w: 140, size: 8 });
  }
  draw(page, font, row.year, { x: 78, top: tops.year, w: 190, size: 8 });
  draw(page, font, row.agency, { x: 348, top: tops.year, w: 220, size: 8 });
}

function fillEconomy(page: PDFPage, font: PDFFont, model: SurveyPrintModel) {
  const incomeTops = [239, 264, 282, 301, 319, 337, 356];
  const expenseTops = [239, 264, 282, 301, 319, 337, 356];
  model.incomeRows.slice(0, 7).forEach((row, index) => {
    draw(page, font, row.amount, { x: 188, top: incomeTops[index], w: 70, size: 8, align: 'right' });
  });
  model.expenseRows.slice(0, 7).forEach((row, index) => {
    draw(page, font, row.amount, { x: 438, top: expenseTops[index], w: 68, size: 8, align: 'right' });
  });
  draw(page, font, model.incomeTotal, { x: 188, top: 386, w: 70, size: 8, align: 'right' });
  draw(page, font, model.expenseTotal, { x: 438, top: 386, w: 68, size: 8, align: 'right' });
  const extra = [
    model.incomeRows[7]?.amount ? `รายได้อื่น ${model.incomeRows[7].amount}` : null,
    model.incomeRows[7]?.label.includes('(') ? model.incomeRows[7].label : null,
    model.expenseRows[6]?.label.includes('(') ? model.expenseRows[6].label : null,
  ].filter(Boolean).join(' ');
  draw(page, font, extra || null, { x: 145, top: 437, w: 420, size: 8 });
}

function fillMembers(page: PDFPage, font: PDFFont, members: SurveyPrintModel['members'], startIndex: number) {
  const bottoms = [541, 562, 584, 606, 627, 648, 670, 691, 713, 734];
  members.slice(startIndex, startIndex + 10).forEach((member, index) => {
    const top = bottoms[index] - 8;
    const note = [member.relation, member.notes].filter(Boolean).join(' ');
    draw(page, font, member.name, { x: 90, top, w: 118, size: 7 });
    draw(page, font, member.age, { x: 216, top, w: 40, size: 7, align: 'right' });
    draw(page, font, member.education, { x: 268, top, w: 96, size: 7 });
    draw(page, font, member.occupation, { x: 372, top, w: 70, size: 7 });
    draw(page, font, member.income, { x: 448, top, w: 58, size: 7, align: 'right' });
    draw(page, font, note, { x: 516, top, w: 62, size: 6.5 });
  });
}

function fillCoordinator(page: PDFPage, font: PDFFont, model: SurveyPrintModel) {
  const lines = wrap(font, model.familySituation || '', 9, 500).slice(0, 4);
  [117, 137, 159, 180].forEach((top, index) => {
    draw(page, font, lines[index], { x: 52, top, w: 510, size: 9 });
  });
  const person = splitStoredName(model.coordinator.name);
  draw(page, font, person.given, { x: 192, top: 481, w: 190, size: 10 });
  draw(page, font, person.surname, { x: 425, top: 481, w: 145, size: 10 });
  draw(page, font, model.coordinator.phone, { x: 88, top: 507, w: 125, size: 9 });
  draw(page, font, model.coordinator.occupation, { x: 252, top: 507, w: 100, size: 9 });
  draw(page, font, model.coordinator.role, { x: 405, top: 507, w: 150, size: 9 });
  draw(page, font, model.coordinator.age, { x: 68, top: 528, w: 42, size: 9, align: 'right' });
  draw(page, font, model.coordinator.nationalId, { x: 255, top: 528, w: 290, size: 9 });
  const address = houseToken(model.coordinator.address);
  draw(page, font, address.house, { x: 145, top: 543, w: 28, size: 8 });
  draw(page, font, address.rest, { x: 240, top: 543, w: 170, size: 8 });
}

function appendixLines(model: SurveyPrintModel): { heading: string; lines: string[] }[] {
  const sections: { heading: string; lines: string[] }[] = [];
  const identity = [
    model.registryNumber && model.registryNumber !== '-' ? `เลขทะเบียน ${model.registryNumber}` : null,
    model.fullName ? `ชื่อผู้ขอรับความช่วยเหลือ ${model.fullName}` : null,
    model.statusLabel && model.statusLabel !== 'ไม่มีข้อมูล' ? `สถานะทะเบียน ${model.statusLabel}` : null,
    model.registeredAt ? `วันที่ขึ้นทะเบียน ${model.registeredAt}` : null,
    model.officerName ? `เจ้าหน้าที่ผู้บันทึก ${model.officerName}` : null,
    model.printedAt ? `พิมพ์เมื่อ ${model.printedAt}` : null,
    model.printedBy ? `ผู้สั่งพิมพ์ ${model.printedBy}` : null,
  ].filter((line): line is string => Boolean(line));
  if (identity.length) sections.push({ heading: 'ข้อมูลทะเบียน', lines: identity });

  if (model.address) sections.push({ heading: 'ที่อยู่ตามทะเบียน', lines: [model.address] });
  if (model.net) sections.push({ heading: 'รายได้สุทธิต่อเดือน', lines: [`${model.net} บาท`] });
  const situationOverflow = wrapLength(model.familySituation);
  if (situationOverflow) sections.push({ heading: '1.8 สถานภาพครอบครัวโดยละเอียด (ข้อความที่เกินบรรทัดในแบบฟอร์ม)', lines: [situationOverflow] });
  if (model.dependentBurdens) sections.push({ heading: 'ภาระเลี้ยงดู', lines: [model.dependentBurdens] });
  if (model.housingCondition || model.housingNotes) {
    sections.push({
      heading: 'สภาพที่อยู่อาศัย',
      lines: [model.housingCondition, model.housingNotes].filter((line): line is string => Boolean(line)),
    });
  }
  if (model.landTitle) sections.push({ heading: 'เอกสารสิทธิ์ที่ดิน', lines: [[model.landTitle, model.landNotes].filter(Boolean).join(' ')] });
  if (model.location.placeName || model.location.latitude || model.location.longitude) {
    sections.push({
      heading: 'พิกัดที่อยู่อาศัย',
      lines: [
        [model.location.placeName, model.location.latitude && model.location.longitude ? `${model.location.latitude}, ${model.location.longitude}` : null, model.location.verification]
          .filter(Boolean)
          .join(' · '),
      ],
    });
  }
  if (model.asnaf) {
    sections.push({
      heading: 'ผลการจำแนกประเภทผู้มีสิทธิ์',
      lines: [model.asnaf.name, model.asnaf.rationale, model.asnaf.assessedAt, model.asnaf.recordedBy ? `ผู้บันทึก ${model.asnaf.recordedBy}` : null, model.asnaf.reviewedBy ? `ผู้ตรวจทาน ${model.asnaf.reviewedBy}` : null].filter((line): line is string => Boolean(line)),
    });
  }
  if (model.criteriaRecorded) {
    sections.push({
      heading: 'บันทึกการตรวจเงื่อนไขของเจ้าหน้าที่',
      lines: model.criteria
        .filter((item) => item.result !== 'blank' || item.note)
        .map((item) => `${item.result === 'pass' ? 'ผ่าน' : item.result === 'fail' ? 'ไม่ผ่าน' : 'ยังไม่บันทึก'} — ${item.label}${item.note ? ` (${item.note})` : ''}`),
    });
  }
  if (model.committeeNotes) sections.push({ heading: 'ความเห็นคณะกรรมการ', lines: [model.committeeNotes] });
  if (model.consent) {
    sections.push({
      heading: 'ความยินยอม',
      lines: [[model.consent.accepted ? 'ให้ความยินยอมแล้ว' : 'ยังไม่ให้ความยินยอม', model.consent.version, model.consent.recordedAt].filter(Boolean).join(' · ')],
    });
  }
  if (model.registrationNote) sections.push({ heading: 'บันทึกการขึ้นทะเบียน', lines: [model.registrationNote] });
  if (model.applicationsNote) sections.push({ heading: 'ประวัติคำร้อง', lines: [model.applicationsNote] });
  if (model.applications.length) {
    sections.push({
      heading: 'คำร้องขอความช่วยเหลือในระบบ',
      lines: model.applications.map((app) =>
        [app.no, app.date, app.type, app.detail, app.requested ? `ขอ ${app.requested}` : null, app.approved ? `อนุมัติ ${app.approved}` : null, app.disbursed ? `จ่าย ${app.disbursed}` : null, app.status]
          .filter(Boolean)
          .join(' · '),
      ),
    });
  }
  if (model.documents.length) {
    sections.push({
      heading: 'เอกสารแนบ',
      lines: model.documents.map((doc) => [doc.type, doc.name, doc.date, doc.status, doc.kind === 'pdf' ? 'ไฟล์ PDF แนบอยู่กับทะเบียน ไม่ได้รวมเข้าหน้าแบบฟอร์ม' : null].filter(Boolean).join(' · ')),
    });
  }
  return sections.filter((section) => section.lines.length > 0);
}

function wrapLength(value: string | null): string | null {
  if (!value) return null;
  if (value.length < 220) return null;
  return value;
}

function drawAppendix(doc: PDFDocument, font: PDFFont, model: SurveyPrintModel, images: PDFImage[]) {
  const sections = appendixLines(model);
  const captions = model.images.map((image) => image.caption);
  if (!sections.length && !images.length) return;

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
  for (const section of sections) {
    y -= 4;
    writeLine(section.heading, 12);
    for (const line of section.lines) writeLine(line, 10, 60);
  }
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

export async function fillSurveyPdf(model: SurveyPrintModel): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), 'src', 'lib', 'surveyPrint', 'master-form.pdf');
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Regular.ttf');
  const template = readFileSync(templatePath);
  const source = await PDFDocument.load(template);
  const clean = await PDFDocument.load(template);
  source.registerFontkit(fontkitEngine());
  const font = await source.embedFont(readFileSync(fontPath), { subset: true });
  const [page1, page2, page3] = source.getPages();

  fillIdentity(page1, font, model, true);
  fillChoices(page1, font, model);
  if (model.pastAssistanceKnownNone && model.pastAssistance.length === 0) drawCheck(page1, 52, 668);
  if (model.pastAssistance.length > 0) drawCheck(page1, 164, 668);
  fillAssistance(page1, font, model.pastAssistance[0], { aspect: 696, money: 711, year: 738 });

  fillAssistance(page2, font, model.pastAssistance[1], { aspect: 109, money: 130, year: 151 });
  fillEconomy(page2, font, model);
  fillMembers(page2, font, model.members, 0);

  fillCoordinator(page3, font, model);

  for (let index = 2; index < model.pastAssistance.length; index += 1) {
    const [extra] = await source.copyPages(clean, [0]);
    source.addPage(extra);
    fillIdentity(extra, font, model, false);
    drawCheck(extra, 164, 668);
    fillAssistance(extra, font, model.pastAssistance[index], { aspect: 696, money: 711, year: 738 });
  }
  for (let index = 10; index < model.members.length; index += 10) {
    const [extra] = await source.copyPages(clean, [1]);
    source.addPage(extra);
    fillMembers(extra, font, model.members, index);
  }

  const output = await PDFDocument.create();
  output.registerFontkit(fontkitEngine());
  const outputFont = await output.embedFont(readFileSync(fontPath), { subset: true });
  const embedded = await output.embedPages(source.getPages());
  embedded.forEach((page) => {
    const sheet = output.addPage([A4_W, A4_H]);
    sheet.drawPage(page, { x: 0, y: OFFSET_Y, xScale: SCALE, yScale: SCALE });
  });
  const images = await embedImages(output, model);
  drawAppendix(output, outputFont, model, images);
  output.setTitle('แบบสำรวจเพื่อพิจารณาความช่วยเหลือของมูลนิธิซะกาตและสาธารณกุศล');
  output.setAuthor(model.printedBy || '');
  return output.save();
}
