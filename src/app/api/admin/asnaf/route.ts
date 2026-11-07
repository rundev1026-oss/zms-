import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';
import { getDb, initDb } from '@/lib/db';
import { OrganizationService } from '@/services/organizationService';

export interface AsnafMasterItem {
  id: string;
  code: string;
  nameTh: string;
  nameAr?: string;
  nameEn?: string;
  description: string;
  criteria: string[];
  requiredDocuments: string[];
  allowedFormats: string[];
  sortOrder: number;
  isActive: boolean;
  linkedTypeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const CANONICAL_8_ASNAFS: Array<{
  id: string;
  code: string;
  nameTh: string;
  sortOrder: number;
  isActive: boolean;
}> = [
  { id: 'asnaf-faqir', code: 'faqir', nameTh: 'ฟากีร (ผู้ยากไร้)', sortOrder: 1, isActive: true },
  { id: 'asnaf-miskin', code: 'miskin', nameTh: 'มิสกีน (คนขัดสน)', sortOrder: 2, isActive: true },
  { id: 'asnaf-amil', code: 'amil', nameTh: 'อามิล (เจ้าหน้าที่บริหารซะกาต)', sortOrder: 3, isActive: true },
  { id: 'asnaf-muallaf', code: 'muallaf', nameTh: 'มุอัลลัฟ (ผู้มีจิตโน้มสู่ศรัทธา)', sortOrder: 4, isActive: true },
  { id: 'asnaf-riqab', code: 'riqab', nameTh: 'ริกอบ (การปลดปล่อยพันธนาการ)', sortOrder: 5, isActive: true },
  { id: 'asnaf-gharimin', code: 'gharimin', nameTh: 'อัล-ฆอรีมีน (ผู้มีหนี้สินจำเป็น)', sortOrder: 6, isActive: true },
  { id: 'asnaf-fisabilillah', code: 'fisabilillah', nameTh: 'ฟีสะบีลิลลาฮ์ (ในหนทางของอัลลอฮ์)', sortOrder: 7, isActive: true },
  { id: 'asnaf-ibnsabil', code: 'ibnsabil', nameTh: 'อิบนุสสะบีล (ผู้เดินทางตกยาก)', sortOrder: 8, isActive: true },
];

const DEFAULT_ASNAF_METADATA: Record<string, Partial<AsnafMasterItem>> = {
  faqir: {
    nameTh: 'ฟากีร (ผู้ยากไร้)',
    nameAr: 'الفقراء (Al-Fuqara)',
    nameEn: 'The Destitute (Faqir)',
    description: 'ผู้ยากไร้ที่ไม่มีทรัพย์สินและไม่มีรายได้ หรือมีรายได้ไม่ถึงกึ่งหนึ่งของความจำเป็นขั้นพื้นฐานในการดำรงชีพ',
    criteria: [
      'ไม่มีรายได้หรือมีรายได้ไม่ถึงกึ่งหนึ่งของเกณฑ์ยังชีพขั้นต่ำ',
      'ไม่มีทรัพย์สินที่มีสภาพคล่องเพียงพอต่อการยังชีพ',
      'ไม่สามารถประกอบอาชีพได้เนื่องจากสุขภาพ วัย หรือภาระเลี้ยงดู',
    ],
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'หนังสือรับรองสถานะผู้ยากไร้จากผู้นำชุมชน/อิหม่าม',
      'ภาพถ่ายสภาพที่อยู่อาศัยจริง',
    ],
    allowedFormats: ['เงินสงเคราะห์และการเงิน', 'สิ่งของและถุงยังชีพ', 'ซ่อมแซมและจัดสร้างที่อยู่อาศัย'],
  },
  miskin: {
    nameTh: 'มิสกีน (คนขัดสน)',
    nameAr: 'المساكين (Al-Masakin)',
    nameEn: 'The Needy (Miskin)',
    description: 'คนขัดสนที่มีรายได้หรือทรัพย์สินบ้างแต่เกินกึ่งหนึ่ง แต่ยังไม่เพียงพอต่อค่าครองชีพพื้นฐานตามความจำเป็น',
    criteria: [
      'มีรายได้เกิน 50% แต่ไม่ถึง 100% ของค่าครองชีพพื้นฐานของครัวเรือน',
      'มีภาระพึ่งพิงสูง (ผู้สูงอายุ ผู้ป่วยติดเตียง หรือเด็กเล็กหลายคน)',
      'ขาดแคลนทุนหมุนเวียนในการประกอบอาชีพ',
    ],
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชน',
      'สำเนาทะเบียนบ้าน',
      'หลักฐานแสดงรายได้/หนังสือรับรองรายได้',
      'หลักฐานภาระหนี้สินจำเป็นหรือค่ารักษาพยาบาล',
    ],
    allowedFormats: ['เงินสงเคราะห์และการเงิน', 'ส่งเสริมอาชีพและเครื่องมือทำกิน', 'ทุนการศึกษาและพัฒนาเยาวชน'],
  },
  amil: {
    nameTh: 'อามิล (เจ้าหน้าที่บริหารซะกาต)',
    nameAr: 'العاملين عليها (Al-Amilina Alayha)',
    nameEn: 'Zakat Administrators (Amil)',
    description: 'เจ้าหน้าที่ผู้ได้รับการแต่งตั้งให้ทำหน้าที่รวบรวม ตรวจสอบ บริหารจัดการ และจัดสรรเงินซะกาตตามหลักการ',
    criteria: [
      'ได้รับการแต่งตั้งอย่างเป็นทางการจากคณะกรรมการมูลนิธิ',
      'ปฏิบัติหน้าที่โดยสุจริตและโปร่งใสตามคู่มือปฏิบัติการ',
    ],
    requiredDocuments: [
      'คำสั่งแต่งตั้งเจ้าหน้าที่บริหารซะกาต',
      'บันทึกรายงานการปฏิบัติหน้าที่',
    ],
    allowedFormats: ['ค่าบริหารจัดการและดำเนินงานซะกาต'],
  },
  muallaf: {
    nameTh: 'มุอัลลัฟ (ผู้มีจิตโน้มสู่ศรัทธา)',
    nameAr: 'المؤلفة قلوبهم (Al-Muallafatu Qulubuhum)',
    nameEn: 'Those Inclined Toward Islam (Mu’allaf)',
    description: 'ผู้มีจิตโน้มสู่ความศรัทธา ผู้เข้ารับอิสลามใหม่ หรือผู้ที่ควรได้รับการเสริมสร้างความสัมพันธ์อันดีในสังคม',
    criteria: [
      'ผู้เข้ารับอิสลามใหม่ภายในระยะเวลาที่กำหนด หรือต้องการการเกื้อกูลในการเริ่มต้นชีวิต',
      'ครอบครัวที่ต้องการการสนับสนุนเพื่อเสริมสร้างความมั่นคงในศรัทธา',
    ],
    requiredDocuments: [
      'หนังสือรับรองการเข้ารับอิสลามจากมัสยิด/คณะกรรมการอิสลามประจำจังหวัด',
      'สำเนาบัตรประจำตัวประชาชน',
    ],
    allowedFormats: ['เงินสงเคราะห์และการเงิน', 'ส่งเสริมอาชีพและเครื่องมือทำกิน', 'ทุนการศึกษาและพัฒนาเยาวชน'],
  },
  riqab: {
    nameTh: 'ริกอบ (การปลดปล่อยพันธนาการ)',
    nameAr: 'في الرقاب (Fi Ar-Riqab)',
    nameEn: 'Emancipation & Liberation (Riqab)',
    description: 'การปลดปล่อยพันธนาการ การช่วยเหลือผู้ตกเป็นเหยื่อการค้ามนุษย์ หรือผู้ถูกลิดรอนอิสรภาพอย่างไม่เป็นธรรม',
    criteria: [
      'ผู้ประสบภาวะถูกลิดรอนเสรีภาพทางกฎหมายหรือถูกกดขี่แรงงาน',
      'ผู้ต้องการความช่วยเหลือด้านคดีความเพื่อคืนความเป็นธรรม',
    ],
    requiredDocuments: [
      'เอกสารทางคดีความ/บันทึกการช่วยเหลือทางสังคม',
      'สำเนาบัตรประจำตัวประชาชน',
    ],
    allowedFormats: ['ช่วยเหลือทางกฎหมายและมนุษยธรรม'],
  },
  gharimin: {
    nameTh: 'อัล-ฆอรีมีน (ผู้มีหนี้สินจำเป็น)',
    nameAr: 'الغارمين (Al-Gharimin)',
    nameEn: 'Debtors in Need (Gharimin)',
    description: 'ผู้มีหนี้สินล้นพ้นตัวที่เกิดจากความจำเป็นในการดำรงชีพ การรักษาพยาบาล หรือภัยพิบัติ มิได้เกิดจากอบายมุข',
    criteria: [
      'หนี้สินเกิดขึ้นจากความจำเป็นพื้นฐาน (ค่ารักษาพยาบาล, ค่าที่อยู่อาศัย, ภัยพิบัติ)',
      'ไม่มีความสามารถในการชำระหนี้ตามกำหนด และไม่มีทรัพย์สินอื่นทดแทนได้',
      'หนี้สินไม่ได้เกิดจากการพนัน ยาเสพติด หรือการใช้จ่ายฟุ่มเฟือย',
    ],
    requiredDocuments: [
      'สัญญากู้ยืมเงิน/หนังสือทวงถามหนี้ที่เป็นทางการ',
      'หลักฐานสาเหตุของการเกิดหนี้สิน',
      'สำเนาบัตรประจำตัวประชาชนและทะเบียนบ้าน',
    ],
    allowedFormats: ['ชำระหนี้สินจำเป็นโดยตรงแก่เจ้าหนี้'],
  },
  fisabilillah: {
    nameTh: 'ฟีสะบีลิลลาฮ์ (ในหนทางของอัลลอฮ์)',
    nameAr: 'في سبيل الله (Fi Sabilillah)',
    nameEn: 'In the Cause of Allah (Fisabilillah)',
    description: 'กิจกรรมและโครงการเพื่อวิถีทางของศาสนา การศึกษาศาสนา และสาธารณประโยชน์ต่อชุมชนมุสลิม',
    criteria: [
      'โครงการเผยแผ่ความรู้ การศึกษาอิสลาม หรือสาธารณกุศลเพื่อส่วนรวม',
      'ผ่านการพิจารณาและรับรองจากคณะกรรมการวิชาการซะกาต',
    ],
    requiredDocuments: [
      'ข้อเสนอโครงการและแผนงบประมาณ',
      'หนังสือรับรองจากองค์กรศาสนาที่เกี่ยวข้อง',
    ],
    allowedFormats: ['ทุนการศึกษาและพัฒนาเยาวชน', 'มนุษยธรรมและสาธารณประโยชน์'],
  },
  ibnsabil: {
    nameTh: 'อิบนุสสะบีล (ผู้เดินทางตกยาก)',
    nameAr: 'ابن السبيل (Ibn As-Sabil)',
    nameEn: 'Stranded Wayfarers (Ibn Sabil)',
    description: 'ผู้เดินทางตกยากที่ขาดแคลนทุนทรัพย์ในการเดินทางกลับภูมิลำเนาหรือไปยังจุดหมายที่จำเป็น',
    criteria: [
      'อยู่ระหว่างการเดินทางที่ถูกต้องตามหลักศาสนาและกฎหมาย',
      'สูญเสียหรือหมดสิ้นทุนทรัพย์ในการเดินทางกลับภูมิลำเนา',
    ],
    requiredDocuments: [
      'สำเนาบัตรประจำตัวประชาชนหรือหนังสือเดินทาง',
      'บันทึกประจำวันจากสถานีตำรวจ (กรณีถูกโจรกรรมทรัพย์สินสูญหาย)',
    ],
    allowedFormats: ['เงินสงเคราะห์ค่าเดินทางและที่พักฉุกเฉิน'],
  },
};

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();

    // 1. Fetch raw asnaf categories from NestJS / PostgreSQL if available
    let categoriesList: any[] = [];
    try {
      const res = await proxyToNest('/asnaf/categories', request, { method: 'GET' });
      if (res && res.ok) {
        const rawCategories = await res.json();
        const list = Array.isArray(rawCategories) ? rawCategories : rawCategories?.data;
        if (Array.isArray(list) && list.length > 0) {
          categoriesList = list;
        }
      }
    } catch {
      // NestJS service offline or unauthenticated proxy
    }

    // Canonical 8 Asnafs fallback if NestJS is empty or not accessible
    if (!categoriesList || categoriesList.length === 0) {
      categoriesList = CANONICAL_8_ASNAFS;
    }

    // 2. Load custom enriched metadata from system_settings
    let enrichedStore: Record<string, any> = {};
    try {
      const storeRow = await db.execute({
        sql: `SELECT value FROM system_settings WHERE key = ?`,
        args: ['asnaf_master_metadata_catalog'],
      });
      if (storeRow.rows.length > 0 && storeRow.rows[0].value) {
        enrichedStore = JSON.parse(String(storeRow.rows[0].value));
      }
    } catch {}

    // 3. Count linked assistance types per Asnaf
    const typeCounts: Record<string, number> = {};
    try {
      const typeRows = await db.execute(`
        SELECT primary_group_code, COUNT(*) as count 
        FROM assistance_types 
        WHERE primary_group_code IS NOT NULL 
        GROUP BY primary_group_code
      `);
      typeRows.rows.forEach(r => {
        typeCounts[String(r.primary_group_code)] = Number(r.count);
      });
    } catch {}

    const result: AsnafMasterItem[] = categoriesList.map((r: any) => {
      const code = String(r.code);
      const defaults = DEFAULT_ASNAF_METADATA[code] || {};
      const custom = enrichedStore[code] || {};

      let linkedCount = typeCounts[code] || 0;
      if (code === 'faqir' || code === 'miskin') {
        linkedCount = (typeCounts['faqir'] || 0) + (typeCounts['miskin'] || 0) + (typeCounts['faqir_miskin'] || 0);
      }

      return {
        id: String(r.id || `asnaf-${code}`),
        code,
        nameTh: custom.nameTh || String(r.nameTh || r.name_th || defaults.nameTh || code),
        nameAr: custom.nameAr || defaults.nameAr || '',
        nameEn: custom.nameEn || defaults.nameEn || '',
        description: custom.description || defaults.description || '',
        criteria: custom.criteria || defaults.criteria || [],
        requiredDocuments: custom.requiredDocuments || defaults.requiredDocuments || [],
        allowedFormats: custom.allowedFormats || defaults.allowedFormats || [],
        sortOrder: custom.sortOrder !== undefined ? Number(custom.sortOrder) : Number(r.sortOrder || r.sort_order || 0),
        isActive: custom.isActive !== undefined ? Boolean(custom.isActive) : (r.isActive !== undefined ? Boolean(r.isActive) : true),
        linkedTypeCount: linkedCount,
      };
    });

    result.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงข้อมูลหมวดหมู่อัสนัฟได้' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = await OrganizationService.resolveActor(request, body.actor);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const { code, nameTh, nameAr, nameEn, description, criteria, requiredDocuments, allowedFormats, isActive, sortOrder } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรหัสอัสนัฟ (code)' }, { status: 400 });
    }

    await initDb();
    const db = getDb();

    // Persist enriched metadata in system_settings
    let enrichedStore: Record<string, any> = {};
    try {
      const storeRow = await db.execute({
        sql: `SELECT value FROM system_settings WHERE key = ?`,
        args: ['asnaf_master_metadata_catalog'],
      });
      if (storeRow.rows.length > 0 && storeRow.rows[0].value) {
        enrichedStore = JSON.parse(String(storeRow.rows[0].value));
      }
    } catch {}

    const prevActive = enrichedStore[code]?.isActive !== undefined ? enrichedStore[code].isActive : true;
    const nextActive = isActive !== undefined ? Boolean(isActive) : prevActive;

    enrichedStore[code] = {
      ...(enrichedStore[code] || {}),
      nameTh: nameTh !== undefined ? String(nameTh).trim() : enrichedStore[code]?.nameTh,
      nameAr: nameAr !== undefined ? String(nameAr).trim() : enrichedStore[code]?.nameAr,
      nameEn: nameEn !== undefined ? String(nameEn).trim() : enrichedStore[code]?.nameEn,
      description: description !== undefined ? String(description).trim() : enrichedStore[code]?.description,
      criteria: Array.isArray(criteria) ? criteria : enrichedStore[code]?.criteria,
      requiredDocuments: Array.isArray(requiredDocuments) ? requiredDocuments : enrichedStore[code]?.requiredDocuments,
      allowedFormats: Array.isArray(allowedFormats) ? allowedFormats : enrichedStore[code]?.allowedFormats,
      isActive: nextActive,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : (enrichedStore[code]?.sortOrder !== undefined ? enrichedStore[code].sortOrder : 0),
      updatedAt: new Date().toISOString(),
    };

    await db.execute({
      sql: `INSERT INTO system_settings (id, key, value, category, created_at, updated_at) 
            VALUES (?, ?, ?, 'asnaf', datetime('now'), datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: ['asnaf-cat-meta', 'asnaf_master_metadata_catalog', JSON.stringify(enrichedStore)],
    });

    // Record audit log
    try {
      await db.execute({
        sql: `INSERT INTO asnaf_relationship_audit_logs (
                id, relationship_type, record_id, action, actor_id, actor_name, actor_role, changes_summary, created_at
              ) VALUES (?, 'asnaf_master_data', ?, 'UPDATE_ASNAF', ?, ?, ?, ?, datetime('now'))`,
        args: [
          `aral-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          code,
          actor.id || null,
          actor.name || null,
          actor.role || null,
          `แก้ไขข้อมูลหมวดหมู่อัสนัฟ "${nameTh || enrichedStore[code]?.nameTh || code}" (สถานะ: ${nextActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'})`,
        ],
      });
    } catch (auditErr) {
      console.warn('Failed to insert audit log for asnaf update:', auditErr);
    }

    return NextResponse.json({ success: true, message: 'บันทึกข้อมูลหมวดหมู่อัสนัฟสำเร็จ' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงข้อมูลอัสนัฟ' },
      { status: 500 }
    );
  }
}
