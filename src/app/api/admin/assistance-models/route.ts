import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { OrganizationService } from '@/services/organizationService';

export interface AssistanceModelItem {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description: string;
  method: 'transfer' | 'delivery' | 'direct_service' | 'voucher' | 'vendor_payment';
  methodLabelTh: string;
  requiresAmount: boolean;
  requiresEvidence: boolean;
  requiresFollowUp: boolean;
  minFollowUpCount: number;
  followUpIntervalDays: number;
  isActive: boolean;
  orderIndex: number;
  linkedTypeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_ASSISTANCE_MODELS: AssistanceModelItem[] = [
  {
    id: 'mdl-cash',
    code: 'cash',
    name: 'เงินสงเคราะห์และการเงิน',
    nameEn: 'Financial Assistance & Cash Grants',
    description: 'การช่วยเหลือเป็นตัวเงินโอนผ่านธนาคารหรือเงินสดสำหรับผู้ยากไร้ ค่าครองชีพ หรือกรณีฉุกเฉิน',
    method: 'transfer',
    methodLabelTh: 'โอนเงินเข้าบัญชีธนาคาร',
    requiresAmount: true,
    requiresEvidence: true,
    requiresFollowUp: true,
    minFollowUpCount: 1,
    followUpIntervalDays: 90,
    isActive: true,
    orderIndex: 1,
  },
  {
    id: 'mdl-in-kind',
    code: 'in_kind',
    name: 'สิ่งของและถุงยังชีพ',
    nameEn: 'In-Kind Food & Essentials',
    description: 'การสนับสนุนข้าวสาร อาหารแห้ง ถุงยังชีพ นมผง หรือของใช้จำเป็นในชีวิตประจำวัน',
    method: 'delivery',
    methodLabelTh: 'ส่งมอบสิ่งของ/ถุงยังชีพถึงมือ',
    requiresAmount: false,
    requiresEvidence: true,
    requiresFollowUp: false,
    minFollowUpCount: 0,
    followUpIntervalDays: 0,
    isActive: true,
    orderIndex: 2,
  },
  {
    id: 'mdl-housing',
    code: 'housing',
    name: 'ซ่อมแซมและจัดสร้างที่อยู่อาศัย',
    nameEn: 'Housing Repair & Construction',
    description: 'การปรับปรุงหลังคา ห้องน้ำ ฝาบ้าน หรือสร้างบ้านพักอาศัยขั้นพื้นฐานให้ปลอดภัยและถูกสุขลักษณะ',
    method: 'vendor_payment',
    methodLabelTh: 'ชำระค่าวัสดุและช่างซ่อมสร้าง',
    requiresAmount: true,
    requiresEvidence: true,
    requiresFollowUp: true,
    minFollowUpCount: 3,
    followUpIntervalDays: 30,
    isActive: true,
    orderIndex: 3,
  },
  {
    id: 'mdl-career',
    code: 'career',
    name: 'ส่งเสริมอาชีพและเครื่องมือทำกิน',
    nameEn: 'Livelihood & Equipment Support',
    description: 'การจัดหาอุปกรณ์ทำกิน เครื่องมือประกอบอาชีพ หรือเงินทุนหมุนเวียนเพื่อสร้างรายได้ถาวร',
    method: 'vendor_payment',
    methodLabelTh: 'จัดซื้ออุปกรณ์/จ่ายตรงร้านค้า',
    requiresAmount: true,
    requiresEvidence: true,
    requiresFollowUp: true,
    minFollowUpCount: 4,
    followUpIntervalDays: 60,
    isActive: true,
    orderIndex: 4,
  },
  {
    id: 'mdl-education',
    code: 'education',
    name: 'ทุนการศึกษาและพัฒนาเยาวชน',
    nameEn: 'Education Grants & Student Aid',
    description: 'ทุนการศึกษา ค่าเล่าเรียน ชุดนักเรียน และอุปกรณ์การเรียนสำหรับบุตรหลานครอบครัวยากจน',
    method: 'transfer',
    methodLabelTh: 'โอนเงินเข้าบัญชีการศึกษา/สถานศึกษา',
    requiresAmount: true,
    requiresEvidence: true,
    requiresFollowUp: true,
    minFollowUpCount: 2,
    followUpIntervalDays: 180,
    isActive: true,
    orderIndex: 5,
  },
  {
    id: 'mdl-medical',
    code: 'medical',
    name: 'ค่ารักษาพยาบาลและเวชภัณฑ์',
    nameEn: 'Medical Care & Healthcare Aid',
    description: 'ค่าเดินทางไปรักษา ค่ายานอกบัญชี ค่าผ้าอ้อมผู้ใหญ่ และอุปกรณ์ผู้ป่วยติดเตียง',
    method: 'transfer',
    methodLabelTh: 'โอนเงินหรือส่งมอบเวชภัณฑ์',
    requiresAmount: true,
    requiresEvidence: true,
    requiresFollowUp: true,
    minFollowUpCount: 2,
    followUpIntervalDays: 60,
    isActive: true,
    orderIndex: 6,
  },
  {
    id: 'mdl-emergency',
    code: 'emergency',
    name: 'ช่วยเหลือผู้ประสบภัยฉุกเฉิน',
    nameEn: 'Emergency & Disaster Relief',
    description: 'การเยียวยาเร่งด่วนกรณีอัคคีภัย อุทกภัย อุบัติภัย หรือสถานการณ์วิกฤตเฉียบพลัน',
    method: 'transfer',
    methodLabelTh: 'โอนเงินด่วนหรือสิ่งของบรรเทาทุกข์',
    requiresAmount: true,
    requiresEvidence: true,
    requiresFollowUp: true,
    minFollowUpCount: 1,
    followUpIntervalDays: 30,
    isActive: true,
    orderIndex: 7,
  },
  {
    id: 'mdl-humanitarian',
    code: 'humanitarian',
    name: 'มนุษยธรรมและสาธารณประโยชน์',
    nameEn: 'Humanitarian & Special Aid',
    description: 'การช่วยเหลือกลุ่มเฉพาะทาง ผู้เดินทางตกยาก หรือโครงการสาธารณประโยชน์ตามมติคณะกรรมการ',
    method: 'direct_service',
    methodLabelTh: 'ดำเนินการโดยตรงตามมติ',
    requiresAmount: true,
    requiresEvidence: true,
    requiresFollowUp: false,
    minFollowUpCount: 0,
    followUpIntervalDays: 0,
    isActive: true,
    orderIndex: 8,
  },
];

async function loadModelsFromDb(): Promise<AssistanceModelItem[]> {
  await initDb();
  const db = getDb();

  try {
    const row = await db.execute({
      sql: 'SELECT value FROM system_settings WHERE key = ?',
      args: ['assistance_models_catalog'],
    });

    if (row.rows.length > 0 && row.rows[0].value) {
      const parsed = JSON.parse(String(row.rows[0].value));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // If not in DB yet, persist defaults
  try {
    await db.execute({
      sql: `INSERT INTO system_settings (id, key, value, category, created_at, updated_at) 
            VALUES (?, ?, ?, 'assistance', datetime('now'), datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: ['ast-models-cat', 'assistance_models_catalog', JSON.stringify(DEFAULT_ASSISTANCE_MODELS)],
    });
  } catch {}

  return DEFAULT_ASSISTANCE_MODELS;
}

async function saveModelsToDb(models: AssistanceModelItem[]): Promise<void> {
  await initDb();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO system_settings (id, key, value, category, created_at, updated_at) 
          VALUES (?, ?, ?, 'assistance', datetime('now'), datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: ['ast-models-cat', 'assistance_models_catalog', JSON.stringify(models)],
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true' || searchParams.get('includeInactive') === '1';

    let models = await loadModelsFromDb();

    // Enrich with linked assistance type count from DB
    await initDb();
    const db = getDb();
    try {
      const counts = await db.execute(`SELECT category, COUNT(*) as count FROM assistance_types GROUP BY category`);
      const countMap: Record<string, number> = {};
      counts.rows.forEach(r => {
        if (r.category) countMap[String(r.category)] = Number(r.count);
      });

      models = models.map(m => ({
        ...m,
        linkedTypeCount: countMap[m.code] || 0,
      }));
    } catch {}

    if (!includeInactive) {
      models = models.filter(m => m.isActive);
    }

    models.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    return NextResponse.json({ success: true, data: models });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงข้อมูลรูปแบบการช่วยเหลือได้' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = await OrganizationService.resolveActor(request, body.actor);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const { code, name, nameEn, description, method, methodLabelTh, requiresAmount, requiresEvidence, requiresFollowUp, minFollowUpCount, followUpIntervalDays } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรหัสและชื่อรูปแบบการช่วยเหลือ' }, { status: 400 });
    }

    const models = await loadModelsFromDb();
    const normalizedCode = String(code).trim().toLowerCase();

    if (models.some(m => m.code.toLowerCase() === normalizedCode)) {
      return NextResponse.json({ success: false, error: `รหัสรูปแบบการช่วยเหลือ '${code}' มีอยู่ในระบบแล้ว` }, { status: 409 });
    }

    const newModel: AssistanceModelItem = {
      id: `mdl-${Date.now()}`,
      code: normalizedCode,
      name: String(name).trim(),
      nameEn: nameEn ? String(nameEn).trim() : undefined,
      description: description ? String(description).trim() : '',
      method: method || 'transfer',
      methodLabelTh: methodLabelTh || 'โอนเงินเข้าบัญชี',
      requiresAmount: Boolean(requiresAmount),
      requiresEvidence: Boolean(requiresEvidence),
      requiresFollowUp: Boolean(requiresFollowUp),
      minFollowUpCount: Number(minFollowUpCount) || 0,
      followUpIntervalDays: Number(followUpIntervalDays) || 0,
      isActive: true,
      orderIndex: models.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    models.push(newModel);
    await saveModelsToDb(models);

    return NextResponse.json({ success: true, data: newModel }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'เกิดข้อผิดพลาดในการสร้างรูปแบบการช่วยเหลือ' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = await OrganizationService.resolveActor(request, body.actor);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const { id, code, name, nameEn, description, method, methodLabelTh, requiresAmount, requiresEvidence, requiresFollowUp, minFollowUpCount, followUpIntervalDays, isActive, orderIndex } = body;

    if (!id && !code) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรหัสรูปแบบการช่วยเหลือ (id หรือ code)' }, { status: 400 });
    }

    const models = await loadModelsFromDb();
    const idx = models.findIndex(m => m.id === id || m.code === code);

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'ไม่พบรูปแบบการช่วยเหลือที่ระบุ' }, { status: 404 });
    }

    models[idx] = {
      ...models[idx],
      name: name !== undefined ? String(name).trim() : models[idx].name,
      nameEn: nameEn !== undefined ? String(nameEn).trim() : models[idx].nameEn,
      description: description !== undefined ? String(description).trim() : models[idx].description,
      method: method !== undefined ? method : models[idx].method,
      methodLabelTh: methodLabelTh !== undefined ? methodLabelTh : models[idx].methodLabelTh,
      requiresAmount: requiresAmount !== undefined ? Boolean(requiresAmount) : models[idx].requiresAmount,
      requiresEvidence: requiresEvidence !== undefined ? Boolean(requiresEvidence) : models[idx].requiresEvidence,
      requiresFollowUp: requiresFollowUp !== undefined ? Boolean(requiresFollowUp) : models[idx].requiresFollowUp,
      minFollowUpCount: minFollowUpCount !== undefined ? Number(minFollowUpCount) : models[idx].minFollowUpCount,
      followUpIntervalDays: followUpIntervalDays !== undefined ? Number(followUpIntervalDays) : models[idx].followUpIntervalDays,
      isActive: isActive !== undefined ? Boolean(isActive) : models[idx].isActive,
      orderIndex: orderIndex !== undefined ? Number(orderIndex) : models[idx].orderIndex,
      updatedAt: new Date().toISOString(),
    };

    await saveModelsToDb(models);

    return NextResponse.json({ success: true, data: models[idx] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'เกิดข้อผิดพลาดในการแก้ไขรูปแบบการช่วยเหลือ' }, { status: 500 });
  }
}

