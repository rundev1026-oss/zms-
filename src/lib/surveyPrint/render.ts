import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SurveyPrintModel } from './model';

let fontCss = '';

function embeddedFonts(): string {
  if (fontCss) return fontCss;
  const regular = path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Regular.ttf');
  const bold = path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Bold.ttf');
  try {
    const regular64 = readFileSync(regular).toString('base64');
    const bold64 = readFileSync(bold).toString('base64');
    fontCss = `
      @font-face { font-family: 'Sarabun'; src: url(data:font/ttf;base64,${regular64}) format('truetype'); font-weight: 400; font-style: normal; }
      @font-face { font-family: 'Sarabun'; src: url(data:font/ttf;base64,${bold64}) format('truetype'); font-weight: 700; font-style: normal; }
    `;
  } catch {
    fontCss = '';
  }
  return fontCss;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function show(value: string | null | undefined): string {
  if (!value) return '<span class="empty">ไม่มีข้อมูล</span>';
  return esc(value);
}

function box(checked: boolean | null): string {
  if (checked === true) return '<span class="box on">✓</span>';
  return '<span class="box"></span>';
}

function criteriaMark(result: 'pass' | 'fail' | 'blank'): string {
  if (result === 'pass') return '<span class="box on">✓</span> <span class="result">ผ่าน</span>';
  if (result === 'fail') return '<span class="box"></span> <span class="result">ไม่ผ่าน</span>';
  return '<span class="box"></span> <span class="hand">ช่องว่างสำหรับกรอกด้วยลายมือ</span>';
}

function rows(items: { label: string; amount: string | null }[]): string {
  return items
    .map(
      (item) => `<tr><td>${esc(item.label)}</td><td class="num">${item.amount ? esc(item.amount) : '<span class="empty">ไม่มีข้อมูล</span>'}</td></tr>`,
    )
    .join('');
}

function field(label: string, value: string | null): string {
  return `<div class="field"><div class="label">${esc(label)}</div><div class="value">${show(value)}</div></div>`;
}

export function renderSurveyHtml(model: SurveyPrintModel): string {
  const reasonItems = model.reasons
    .map((reason) => {
      const detail = reason.detail ? `<div class="detail">${esc(reason.detail)}</div>` : '';
      return `<div class="check">${box(reason.checked)}<span>${esc(reason.label)}</span>${detail}</div>`;
    })
    .join('');

  const pastRows = model.pastAssistance.length
    ? model.pastAssistance
        .map(
          (row, index) => `<tr>
            <td class="num">${index + 1}</td>
            <td>${show(row.agency)}</td>
            <td>${show(row.type)}</td>
            <td>${show(row.amount)}</td>
            <td>${show(row.year)}</td>
            <td>${show(row.notes)}</td>
          </tr>`,
        )
        .join('')
    : '';

  const memberRows = model.members
    .map(
      (member, index) => `<tr>
        <td class="num">${index + 1}</td>
        <td>${esc(member.name)}</td>
        <td>${show(member.age)}</td>
        <td>${show(member.education)}</td>
        <td>${show(member.occupation)}</td>
        <td class="num">${member.income ? esc(member.income) : '<span class="empty">ไม่มีข้อมูล</span>'}</td>
        <td>${[member.relation, member.notes].filter(Boolean).map((part) => esc(part)).join(' / ') || '<span class="empty">ไม่มีข้อมูล</span>'}</td>
      </tr>`,
    )
    .join('');

  const criteria = model.criteria
    .map(
      (item, index) => `<div class="criterion">
        <div>${index + 1}. ${criteriaMark(item.result)} ${esc(item.label)}</div>
        ${item.note ? `<div class="detail">${esc(item.note)}</div>` : ''}
      </div>`,
    )
    .join('');

  const needs = model.assistanceNeeds.length
    ? `<ul>${model.assistanceNeeds.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
    : '<span class="empty">ไม่มีข้อมูล</span>';

  const appRows = model.applications
    .map(
      (row, index) => `<tr>
        <td class="num">${index + 1}</td>
        <td>${show(row.no)}</td>
        <td>${show(row.date)}</td>
        <td>${show(row.type)}</td>
        <td>${show(row.detail)}</td>
        <td class="num">${row.requested ? esc(row.requested) : '<span class="empty">ไม่มีข้อมูล</span>'}</td>
        <td class="num">${row.approved ? esc(row.approved) : '<span class="empty">ไม่มีข้อมูล</span>'}</td>
        <td class="num">${row.disbursed ? esc(row.disbursed) : '<span class="empty">ไม่มีข้อมูล</span>'}</td>
        <td>${show(row.status)}</td>
      </tr>`,
    )
    .join('');

  const docRows = model.documents
    .map(
      (doc, index) => `<tr>
        <td class="num">${index + 1}</td>
        <td>${esc(doc.type)}</td>
        <td>${esc(doc.name)}</td>
        <td>${show(doc.date)}</td>
        <td>${esc(doc.status)}</td>
      </tr>`,
    )
    .join('');

  const hasPdf = model.documents.some((doc) => doc.kind === 'pdf' && doc.status !== 'ไม่พบไฟล์ต้นฉบับ');
  const images = model.images
    .map(
      (image) => `<figure class="photo">
        <img src="${esc(image.dataUrl)}" alt="${esc(image.caption)}" />
        <figcaption>${esc(image.caption)}</figcaption>
      </figure>`,
    )
    .join('');

  const signature = (title: string, name: string | null, extra: string | null) => `<div class="sign">
    <div class="sign-title">${esc(title)}</div>
    <div class="sign-line"></div>
    <div>ลงชื่อ</div>
    <div class="sign-name">${name ? esc(name) : '................................'}</div>
    <div class="sign-meta">ตำแหน่ง ${extra ? esc(extra) : '................................'}</div>
    <div class="sign-meta">วันที่ ............ / ............ / ............</div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>แบบสำรวจ ${esc(model.registryNumber)}</title>
  <style>
    ${embeddedFonts()}
    @page { size: A4 portrait; margin: 16mm 12mm 16mm 12mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Sarabun', 'Leelawadee UI', 'Tahoma', sans-serif;
      color: #1c1917;
      font-size: 12px;
      line-height: 1.45;
      background: white;
    }
    .running-header, .running-footer { display: none; }
    @media print {
      .running-header, .running-footer {
        display: flex;
        position: fixed;
        left: 0;
        right: 0;
        font-size: 10px;
        color: #44403c;
        background: white;
      }
      .running-header { top: 0; justify-content: space-between; border-bottom: 1px solid #d6d3d1; padding-bottom: 2px; }
      .running-footer { bottom: 0; justify-content: space-between; border-top: 1px solid #d6d3d1; padding-top: 2px; }
      .sheet { padding-top: 8mm; padding-bottom: 8mm; }
    }
    .page-no::after { content: counter(page); }
    .sheet { padding-bottom: 8px; }
    .letterhead { display: flex; gap: 10px; align-items: center; border-bottom: 2px solid #0b2545; padding-bottom: 8px; margin-bottom: 8px; }
    .mark { width: 48px; height: 48px; flex: none; }
    .org { font-size: 16px; font-weight: 700; color: #0b2545; line-height: 1.2; }
    .org-en { font-size: 10px; letter-spacing: 0.04em; color: #44403c; }
    .doc-title { margin: 8px 0 6px; text-align: center; font-size: 16px; font-weight: 700; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .meta td { border: 1px solid #a8a29e; padding: 4px 6px; }
    h2 { font-size: 13px; margin: 12px 0 6px; color: #0b2545; break-after: avoid; page-break-after: avoid; }
    h3 { font-size: 12px; margin: 8px 0 4px; break-after: avoid; page-break-after: avoid; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
    .field .label { color: #57534e; font-size: 10px; }
    .field .value { min-height: 16px; }
    .empty { color: #78716c; }
    .checks { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; }
    .check, .criterion { break-inside: avoid; page-break-inside: avoid; margin-bottom: 3px; }
    .box { display: inline-block; width: 12px; height: 12px; border: 1px solid #1c1917; text-align: center; line-height: 11px; font-size: 10px; margin-right: 4px; vertical-align: -1px; }
    .box.on { background: #ecfdf5; }
    .detail, .hand, .result { color: #44403c; font-size: 11px; }
    table.data { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.data th, table.data td { border: 1px solid #78716c; padding: 3px 5px; vertical-align: top; }
    table.data th { background: #f5f5f4; font-weight: 700; text-align: left; }
    table.data thead { display: table-header-group; }
    table.data tr { break-inside: avoid; page-break-inside: avoid; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .pair { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-left: -8px; margin-right: -8px; }
    .pair > tbody > tr > td { width: 50%; vertical-align: top; border: 0; padding: 0; }
    .summary { margin-top: 6px; }
    .summary div { display: flex; justify-content: space-between; border-bottom: 1px solid #e7e5e4; padding: 2px 0; }
    .keep { break-inside: avoid; page-break-inside: avoid; }
    .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; margin-top: 8px; }
    .sign { break-inside: avoid; page-break-inside: avoid; min-height: 92px; }
    .sign-title { font-weight: 700; }
    .sign-line { height: 36px; }
    .sign-name, .sign-meta { font-size: 11px; }
    .photo { break-inside: avoid; page-break-inside: avoid; margin: 8px 0 12px; }
    .photo img { display: block; max-width: 100%; max-height: 90mm; width: auto; height: auto; object-fit: contain; border: 1px solid #d6d3d1; }
    .photo figcaption { font-size: 11px; margin-top: 3px; }
    ul { margin: 4px 0 0 18px; padding: 0; }
    .note { font-size: 11px; color: #44403c; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="running-header">
    <span>แบบสำรวจเพื่อพิจารณาความช่วยเหลือ</span>
    <span>${esc(model.registryNumber)} · ${esc(model.fullName)}</span>
  </div>
  <div class="running-footer">
    <span>${esc(model.registryNumber)}</span>
    <span>พิมพ์เมื่อ ${esc(model.printedAt)} · ผู้พิมพ์ ${esc(model.printedBy)}</span>
    <span>หน้า <span class="page-no"></span></span>
  </div>
  <main class="sheet">
    <header class="letterhead">
      <svg class="mark" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="10" fill="#0b2545"/>
        <circle cx="32" cy="32" r="16" fill="none" stroke="#f5d08a" stroke-width="3"/>
        <path d="M32 18c8 6 8 22 0 28-6-6-6-22 0-28z" fill="#f5d08a"/>
      </svg>
      <div>
        <div class="org">มูลนิธิซะกาตและสาธารณกุศล</div>
        <div class="org-en">FOUNDATION OF ZAKAT AND PUBLIC CHARITY</div>
        <div>111 หมู่ที่ 3 ตำบลสะเตงนอก อำเภอเมืองยะลา จังหวัดยะลา 95000</div>
        <div>โทรศัพท์ 065-325-0152</div>
      </div>
    </header>
    <div class="doc-title">แบบสำรวจเพื่อพิจารณาความช่วยเหลือ</div>
    <table class="meta">
      <tr>
        <td>รหัสทะเบียน<br/><strong>${esc(model.registryNumber)}</strong></td>
        <td>วันที่ขึ้นทะเบียน<br/>${show(model.registeredAt)}</td>
        <td>สถานะทะเบียน<br/>${esc(model.statusLabel)}</td>
      </tr>
      <tr>
        <td colspan="2">ชื่อ-นามสกุล<br/><strong>${esc(model.fullName)}</strong></td>
        <td>เจ้าหน้าที่ผู้รับผิดชอบ<br/>${show(model.officerName)}</td>
      </tr>
    </table>

    <h2>1. ส่วนขอรับความช่วยเหลือ</h2>
    <h3>1.1 ข้อมูลส่วนบุคคล</h3>
    <div class="grid">
      ${field('คำนำหน้า', model.titlePrefix || null)}
      ${field('ชื่อ', model.firstName || null)}
      ${field('นามสกุล', model.lastName || null)}
      ${field('วันเดือนปีเกิด', model.birthDate)}
      ${field('อายุ', model.age ? `${model.age} ปี` : null)}
      ${field('เบอร์โทรศัพท์', model.phone)}
      ${field('เลขประจำตัวประชาชน', model.nationalId)}
      ${field('อาชีพ', model.occupation)}
      ${field('สถานภาพสมรส', model.maritalStatus)}
      ${field('ลักษณะที่อยู่อาศัย', [model.housingType, model.housingCondition].filter(Boolean).join(' · ') || null)}
      ${field('การถือครองกรรมสิทธิ์ที่ดิน', model.landTitle)}
    </div>
    ${field('ที่อยู่ปัจจุบัน', model.address)}
    ${model.housingNotes ? field('รายละเอียดที่อยู่อาศัย', model.housingNotes) : ''}
    ${model.landNotes ? field('รายละเอียดเอกสารสิทธิ์', model.landNotes) : ''}

    <h3>1.2 สาเหตุที่ควรได้รับการช่วยเหลือ</h3>
    ${model.reasonsRecorded ? '' : '<p class="note">ยังไม่บันทึกสาเหตุ ช่องด้านล่างเว้นไว้สำหรับกรอกด้วยลายมือ</p>'}
    <div class="checks">${reasonItems}</div>

    <h3>1.3 สภาพปัจจุบัน</h3>
    ${field('ความพิการ', model.disability)}
    ${field('การเจ็บป่วย', model.illness)}
    ${field('ปัญหาหรือข้อจำกัดอื่น ๆ', model.limitations)}

    <h3>1.4 ความต้องการให้ความช่วยเหลือ</h3>
    ${needs}

    <h3>1.5 ประวัติการได้รับความช่วยเหลือ</h3>
    ${
      model.pastAssistanceKnownNone
        ? '<p>บันทึกไว้ว่าไม่เคยได้รับความช่วยเหลือ</p>'
        : pastRows
          ? `<table class="data"><thead><tr><th>ลำดับ</th><th>หน่วยงาน</th><th>ประเภท</th><th>จำนวนเงินหรือสิ่งของ</th><th>ปีที่ได้รับ</th><th>หมายเหตุ</th></tr></thead><tbody>${pastRows}</tbody></table>`
          : '<p class="empty">ไม่มีข้อมูลประวัติการได้รับความช่วยเหลือ</p>'
    }

    <h2>1.6 สภาพเศรษฐกิจ รายรับ รายจ่าย (ภายในบ้าน)</h2>
    <table class="pair"><tr>
      <td>
        <h3>รายได้ต่อเดือน (รวมทั้งครอบครัว)</h3>
        <table class="data"><thead><tr><th>รายการ</th><th class="num">บาท</th></tr></thead><tbody>${rows(model.incomeRows)}</tbody></table>
      </td>
      <td>
        <h3>รายจ่ายต่อเดือน (รวมทั้งครอบครัว)</h3>
        <table class="data"><thead><tr><th>รายการ</th><th class="num">บาท</th></tr></thead><tbody>${rows(model.expenseRows)}</tbody></table>
      </td>
    </tr></table>
    <div class="summary keep">
      <div><span>รายได้รวมต่อเดือน</span><strong>${model.incomeTotal ? `${esc(model.incomeTotal)} บาท` : '<span class="empty">ไม่มีข้อมูล</span>'}</strong></div>
      <div><span>รายจ่ายรวมต่อเดือน</span><strong>${model.expenseTotal ? `${esc(model.expenseTotal)} บาท` : '<span class="empty">ไม่มีข้อมูล</span>'}</strong></div>
      <div><span>เงินคงเหลือสุทธิต่อเดือน (รายได้รวม − รายจ่ายรวม)</span><strong>${model.net ? `${esc(model.net)} บาท` : '<span class="empty">ไม่มีข้อมูล</span>'}</strong></div>
    </div>
    <h3>ข้อมูลหนี้สิน</h3>
    ${
      model.debt
        ? `<div class="grid">
            ${field('ประเภทหนี้', model.debt.type)}
            ${field('ยอดหนี้คงเหลือ', model.debt.balance ? `${model.debt.balance} บาท` : null)}
            ${field('ภาระชำระต่อเดือน', model.debt.monthly ? `${model.debt.monthly} บาท` : null)}
            ${field('เจ้าหนี้', model.debt.creditor)}
          </div>${field('หมายเหตุ', model.debt.notes)}`
        : '<p class="empty">ไม่มีข้อมูลหนี้สิน</p>'
    }

    <h2>1.7 ประวัติครอบครัว</h2>
    ${
      memberRows
        ? `<table class="data"><thead><tr><th>ลำดับ</th><th>ชื่อ-สกุล</th><th>อายุ</th><th>สถานะการศึกษา</th><th>อาชีพ</th><th>รายได้</th><th>ความสัมพันธ์ / หมายเหตุ</th></tr></thead><tbody>${memberRows}</tbody></table>`
        : '<p class="empty">ไม่มีข้อมูลสมาชิกในครอบครัว</p>'
    }

    <h2>1.8 สถานภาพครอบครัวโดยละเอียด</h2>
    ${field('สภาพครอบครัว', model.familySituation)}
    ${field('ภาระในครอบครัว', model.dependentBurdens)}

    <h2>2. ส่วนของผู้ประสานงาน</h2>
    <h3>2.1 เงื่อนไขและกฎเกณฑ์ในการพิจารณาการช่วยเหลือ</h3>
    ${model.criteriaRecorded ? '<p class="note">ผลการตรวจสอบด้านล่างเป็นข้อมูลที่บันทึกไว้ในระบบ</p>' : '<p class="note">ยังไม่มีผลการตรวจสอบในระบบ จึงเว้นช่องว่างสำหรับกรอกด้วยลายมือ</p>'}
    ${criteria}
    ${model.committeeNotes ? field('หมายเหตุคณะกรรมการ', model.committeeNotes) : ''}

    <h3>2.2 รายละเอียดผู้ประสานงาน</h3>
    <div class="grid">
      ${field('ชื่อ-นามสกุล', model.coordinator.name)}
      ${field('เบอร์โทรศัพท์', model.coordinator.phone)}
      ${field('อาชีพ', model.coordinator.occupation)}
      ${field('ตำแหน่ง', model.coordinator.role)}
      ${field('อายุ', model.coordinator.age)}
      ${field('เลขประจำตัวประชาชน', model.coordinator.nationalId)}
    </div>
    ${field('ที่อยู่ปัจจุบัน', model.coordinator.address)}

    <h3>ผู้รับรอง (อิหม่าม / ผู้ใหญ่บ้าน)</h3>
    <div class="grid">
      ${field('ชื่อ-นามสกุล', model.certifier.name)}
      ${field('ตำแหน่ง', model.certifier.role)}
      ${field('เบอร์โทรศัพท์', model.certifier.phone)}
      ${field('ที่อยู่', model.certifier.address)}
    </div>

    <h2>ส่วนลงนาม</h2>
    <p class="note">เส้นลงชื่อเว้นว่างไว้ ระบบไม่ใส่ลายเซ็นแทนบุคคล</p>
    <div class="signs">
      ${signature('ผู้ขอรับความช่วยเหลือ', model.applicantName || null, null)}
      ${signature('ผู้ประสานงาน', model.coordinator.name, model.coordinator.role)}
      ${signature('ผู้รับรอง', model.certifier.name, model.certifier.role)}
      ${signature('เจ้าหน้าที่ผู้สำรวจ', model.officerName, null)}
      ${model.asnaf?.reviewedBy ? signature('ผู้ตรวจสอบหรือคณะกรรมการ', model.asnaf.reviewedBy, null) : signature('ผู้ตรวจสอบหรือคณะกรรมการ', null, null)}
    </div>

    <h2>ภาคผนวก: ข้อมูลเพิ่มเติมจากทะเบียน</h2>
    <h3>ที่พักและพิกัด</h3>
    <div class="grid">
      ${field('ที่อยู่ที่บันทึก', model.location.address)}
      ${field('ชื่อสถานที่', model.location.placeName)}
      ${field('ละติจูด', model.location.latitude)}
      ${field('ลองจิจูด', model.location.longitude)}
      ${field('สถานะการตรวจสอบพิกัด', model.location.verification)}
    </div>
    ${model.registrationNote ? field('หมายเหตุการขึ้นทะเบียน', model.registrationNote) : ''}

    <h3>ผลการพิจารณาหมวดผู้มีสิทธิ์</h3>
    ${
      model.asnaf
        ? `<div class="grid">
            ${field('หมวดที่บันทึก', model.asnaf.name)}
            ${field('วันที่บันทึก', model.asnaf.assessedAt)}
            ${field('ผู้บันทึก', model.asnaf.recordedBy)}
            ${field('ผู้ตรวจสอบ', model.asnaf.reviewedBy)}
          </div>${field('เหตุผลการประเมิน', model.asnaf.rationale)}`
        : '<p class="empty">ยังไม่มีการยืนยันหมวดผู้มีสิทธิ์</p>'
    }

    <h3>ความยินยอมให้ใช้ข้อมูล</h3>
    ${
      model.consent
        ? field('สถานะ', `${model.consent.accepted ? 'ให้ความยินยอม' : 'ไม่ให้ความยินยอม'}${model.consent.version ? ` · ฉบับ ${model.consent.version}` : ''}${model.consent.recordedAt ? ` · ${model.consent.recordedAt}` : ''}`)
        : '<p class="empty">ไม่มีข้อมูลความยินยอม</p>'
    }

    <h3>คำร้องขอความช่วยเหลือในระบบ</h3>
    ${
      model.applicationsNote
        ? `<p class="note">${esc(model.applicationsNote)}</p>`
        : appRows
          ? `<table class="data"><thead><tr><th>ลำดับ</th><th>เลขคำร้อง</th><th>วันที่</th><th>ประเภท</th><th>รายละเอียด</th><th>จำนวนที่ขอ</th><th>อนุมัติ</th><th>จ่ายแล้ว</th><th>สถานะ</th></tr></thead><tbody>${appRows}</tbody></table>`
          : '<p class="empty">ไม่มีคำร้องขอความช่วยเหลือในระบบ</p>'
    }

    <h2>เอกสารประกอบการพิจารณา</h2>
    ${
      docRows
        ? `<table class="data"><thead><tr><th>ลำดับ</th><th>ประเภทเอกสาร</th><th>ชื่อไฟล์</th><th>วันที่แนบ</th><th>สถานะ</th></tr></thead><tbody>${docRows}</tbody></table>`
        : '<p>ยังไม่มีเอกสารแนบ</p>'
    }
    ${hasPdf ? '<p class="note">ไฟล์ PDF ที่แนบไว้ถูกระบุเป็นรายการอ้างอิงเท่านั้น หน้ากระดาษของไฟล์นั้นไม่ได้ถูกนำมารวมในเอกสารฉบับนี้</p>' : ''}
    ${images || (model.documents.some((doc) => doc.kind === 'image') ? '<p class="note">ไม่พบไฟล์รูปภาพต้นฉบับสำหรับแทรกในเอกสาร</p>' : '')}
  </main>
</body>
</html>`;
}
