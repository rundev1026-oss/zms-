import assert from 'assert';
import {
  LEVEL_1_ASNAFS,
  LEVEL_3_ASSISTANCE_FORMATS,
  NORMALIZED_ASSISTANCE_TYPES,
  getAssistanceTypesByAsnaf,
  getSupportedFormatsByType,
  validateThreeTierRelationship,
  buildRelationshipMatrix,
  resolveAsnafGroupCode,
} from '../src/lib/constants/asnafRelationshipCatalog.ts';

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         ${err.message}`);
  }
}

console.log('================================================================');
console.log('  TEST SUITE: PHASE 2 - MASTER DATA RELATIONSHIP ARCHITECTURE');
console.log('================================================================\n');

console.log('--- 1. LEVEL 1: ASNAF MASTER DATA ---');
it('should have all 7 canonical Asnaf groups defined with complete metadata', () => {
  assert.strictEqual(LEVEL_1_ASNAFS.length, 7);
  const codes = LEVEL_1_ASNAFS.map((a) => a.code);
  assert(codes.includes('faqir_miskin'));
  assert(codes.includes('amil'));
  assert(codes.includes('muallaf'));
  assert(codes.includes('humanitarian'));
  assert(codes.includes('gharimin'));
  assert(codes.includes('fisabilillah'));
  assert(codes.includes('ibnsabil'));
  LEVEL_1_ASNAFS.forEach((a) => {
    assert(a.nameTh && a.nameTh.length > 0);
    assert(a.nameAr && a.nameAr.length > 0);
    assert(a.sortOrder > 0);
    assert.strictEqual(a.isActive, true);
  });
});

it('should correctly resolve aliases to canonical Asnaf codes', () => {
  assert.strictEqual(resolveAsnafGroupCode('faqir'), 'faqir_miskin');
  assert.strictEqual(resolveAsnafGroupCode('miskin'), 'faqir_miskin');
  assert.strictEqual(resolveAsnafGroupCode('amilin'), 'amil');
  assert.strictEqual(resolveAsnafGroupCode('riqab'), 'humanitarian');
  assert.strictEqual(resolveAsnafGroupCode('gharimun'), 'gharimin');
  assert.strictEqual(resolveAsnafGroupCode('ibn_sabil'), 'ibnsabil');
});

console.log('\n--- 2. LEVEL 3: ASSISTANCE FORMAT MASTER DATA ---');
it('should have all 9 standard assistance delivery formats', () => {
  assert.strictEqual(LEVEL_3_ASSISTANCE_FORMATS.length, 9);
  const formatCodes = LEVEL_3_ASSISTANCE_FORMATS.map((f) => f.code);
  const expectedCodes = [
    'bank_transfer',
    'cash',
    'in_kind',
    'materials',
    'vendor_direct',
    'contractor',
    'scholarship',
    'training',
    'career_equipment',
  ];
  expectedCodes.forEach((code) => {
    assert(formatCodes.includes(code), `Missing format code: ${code}`);
  });
  LEVEL_3_ASSISTANCE_FORMATS.forEach((f) => {
    assert(f.name && f.name.length > 0);
    assert(f.deliveryMethod && f.deliveryMethodLabelTh);
    assert(typeof f.requiresReceipt === 'boolean');
    assert(typeof f.requiresInspection === 'boolean');
  });
});

console.log('\n--- 3. LEVEL 2: ASSISTANCE TYPES & RELATIONSHIPS ---');
it('should not contain any duplicated assistance type names or codes', () => {
  const codes = new Set();
  const names = new Set();
  NORMALIZED_ASSISTANCE_TYPES.forEach((t) => {
    assert(!codes.has(t.code), `Duplicate code found: ${t.code}`);
    assert(!names.has(t.name), `Duplicate name found: ${t.name}`);
    codes.add(t.code);
    names.add(t.name);
  });
});

it('should map exact 7 types to ฟากีร–มิสกิน (faqir_miskin)', () => {
  const types = getAssistanceTypesByAsnaf('faqir_miskin');
  const typeNames = types.map((t) => t.name);
  const expected = [
    'ปัจจัยยังชีพ',
    'ปัจจัยยังชีพรายเดือน',
    'ซ่อมและสร้างที่อยู่อาศัย',
    'สนับสนุนอาชีพ',
    'ทุนการศึกษา',
    'ช่วยเหลือฉุกเฉิน',
    'บ้านอัร-เราะห์มัต',
  ];
  assert.strictEqual(types.length, 7);
  expected.forEach((name) => {
    assert(typeNames.includes(name), `Missing expected type for Faqir-Miskin: ${name}`);
  });
});

it('should map exact 10 types to อามิลีน (amil)', () => {
  const types = getAssistanceTypesByAsnaf('amil');
  const typeNames = types.map((t) => t.name);
  const expected = [
    'ค่าตอบแทนเจ้าหน้าที่',
    'ค่าใช้จ่ายสำนักงาน',
    'ค่าน้ำมันรถ',
    'รถยนต์',
    'ค่าอินเตอร์เน็ต',
    'ค่าเดินทาง',
    'ค่าทำบัญชี',
    'ค่าตรวจสอบบัญชี',
    'อาหาร',
    'ค่าไฟฟ้า',
  ];
  assert.strictEqual(types.length, 10);
  expected.forEach((name) => {
    assert(typeNames.includes(name), `Missing expected type for Amil: ${name}`);
  });
});

it('should map exact 8 types to มุอัลลัฟ (muallaf)', () => {
  const types = getAssistanceTypesByAsnaf('muallaf');
  const typeNames = types.map((t) => t.name);
  const expected = [
    'มุสลิมใหม่',
    'ปัจจัยยังชีพ',
    'ปัจจัยยังชีพรายเดือน',
    'ซ่อมและสร้างที่อยู่อาศัย',
    'สนับสนุนอาชีพ',
    'ทุนการศึกษา',
    'ช่วยเหลือฉุกเฉิน',
    'บ้านอัร-เราะห์มัต',
  ];
  assert.strictEqual(types.length, 8);
  expected.forEach((name) => {
    assert(typeNames.includes(name), `Missing expected type for Muallaf: ${name}`);
  });
});

it('should map exact 1 type to มนุษยธรรม (humanitarian)', () => {
  const types = getAssistanceTypesByAsnaf('humanitarian');
  assert.strictEqual(types.length, 1);
  assert.strictEqual(types[0].name, 'มนุษยธรรม');
});

it('should map exact 1 type to ผู้มีหนี้สินล้นตัว (gharimin)', () => {
  const types = getAssistanceTypesByAsnaf('gharimin');
  assert.strictEqual(types.length, 1);
  assert.strictEqual(types[0].name, 'ผู้มีหนี้สินล้นตัว');
});

it('should map exact 3 types to ฟีสะบีลิลลาฮ์ (fisabilillah)', () => {
  const types = getAssistanceTypesByAsnaf('fisabilillah');
  const typeNames = types.map((t) => t.name);
  const expected = ['ทุนการศึกษา', 'โรงจอดรถมูลนิธิ', 'ค่าดำเนินงานจิตอาสา'];
  assert.strictEqual(types.length, 3);
  expected.forEach((name) => {
    assert(typeNames.includes(name), `Missing expected type for Fisabilillah: ${name}`);
  });
});

it('should map exact 1 type to ผู้เดินทาง (ibnsabil)', () => {
  const types = getAssistanceTypesByAsnaf('ibnsabil');
  assert.strictEqual(types.length, 1);
  assert.strictEqual(types[0].name, 'ผู้เดินทาง');
});

console.log('\n--- 4. ASSISTANCE FORMAT LINKAGE & VALIDATION ---');
it('every assistance type should have at least 1 valid assistance format', () => {
  NORMALIZED_ASSISTANCE_TYPES.forEach((t) => {
    const formats = getSupportedFormatsByType(t.code);
    assert(formats.length > 0, `Type ${t.name} has no supported formats`);
  });
});

it('ซ่อมและสร้างที่อยู่อาศัย should support materials, contractor, vendor_direct', () => {
  const formats = getSupportedFormatsByType('HOUSING_REPAIR_BUILD').map((f) => f.code);
  assert(formats.includes('materials'));
  assert(formats.includes('contractor'));
  assert(formats.includes('vendor_direct'));
  assert(!formats.includes('scholarship'));
});

it('validateThreeTierRelationship should accept valid 3-tier combinations', () => {
  // Faqir-Miskin -> Living Support -> Bank Transfer
  const v1 = validateThreeTierRelationship('faqir_miskin', 'LIVING_SUPPORT', 'bank_transfer');
  assert.strictEqual(v1.isValid, true);

  // Muallaf -> Education Grant -> Scholarship
  const v2 = validateThreeTierRelationship('muallaf', 'EDUCATION_GRANT', 'scholarship');
  assert.strictEqual(v2.isValid, true);

  // Amil -> Office Expense -> Direct Vendor
  const v3 = validateThreeTierRelationship('amil', 'AMIL_OFFICE_EXPENSE', 'vendor_direct');
  assert.strictEqual(v3.isValid, true);
});

it('validateThreeTierRelationship should reject invalid Asnaf-Type combinations', () => {
  // Amil cannot use Living Support (Faqir/Miskin)
  const v1 = validateThreeTierRelationship('amil', 'LIVING_SUPPORT', 'bank_transfer');
  assert.strictEqual(v1.isValid, false);
  assert(v1.reason.includes('ไม่สามารถใช้กับอัสนัฟ'));

  // Faqir-Miskin cannot use Amil Remuneration
  const v2 = validateThreeTierRelationship('faqir_miskin', 'AMIL_REMUNERATION', 'bank_transfer');
  assert.strictEqual(v2.isValid, false);
  assert(v2.reason.includes('ไม่สามารถใช้กับอัสนัฟ'));
});

it('validateThreeTierRelationship should reject invalid Type-Format combinations', () => {
  // Living support cannot be delivered via contractor
  const v1 = validateThreeTierRelationship('faqir_miskin', 'LIVING_SUPPORT', 'contractor');
  assert.strictEqual(v1.isValid, false);
  assert(v1.reason.includes('ไม่รองรับรูปแบบการช่วยเหลือ'));
});

console.log('\n--- 5. THREE-TIER RELATIONSHIP MATRIX BUILDER ---');
it('buildRelationshipMatrix should generate valid bidirectional links', () => {
  const matrix = buildRelationshipMatrix();
  assert.strictEqual(matrix.asnafs.length, 7);
  assert.strictEqual(matrix.assistanceTypes.length, 23);
  assert.strictEqual(matrix.assistanceFormats.length, 9);
  assert(matrix.asnafTypeLinks.length >= 31); // 7 + 10 + 8 + 1 + 1 + 3 + 1 = 31 links
  assert(matrix.typeFormatLinks.length > 40);
});

console.log('\n================================================================');
console.log(`  PHASE 2 MASTER DATA RELATIONSHIP TEST RESULTS: ${passed}/${total} PASSED`);
console.log('================================================================\n');

if (passed !== total) {
  process.exit(1);
}
