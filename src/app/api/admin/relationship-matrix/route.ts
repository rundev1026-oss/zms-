import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { BeneficiaryService } from '@/services/beneficiaryService';
import { OrganizationService } from '@/services/organizationService';

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();

    // 1. Asnafs with metadata
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

    const CANONICAL_ASNAFS = [
      { id: 'asnaf-faqir', code: 'faqir', nameTh: 'ฟากีร (ผู้ยากไร้)', nameAr: 'الفقراء', sortOrder: 1, isActive: true },
      { id: 'asnaf-miskin', code: 'miskin', nameTh: 'มิสกีน (คนขัดสน)', nameAr: 'المساكين', sortOrder: 2, isActive: true },
      { id: 'asnaf-amil', code: 'amil', nameTh: 'อามิลีน (เจ้าหน้าที่บริหาร)', nameAr: 'العاملين عليها', sortOrder: 3, isActive: true },
      { id: 'asnaf-muallaf', code: 'muallaf', nameTh: 'มุอัลลัฟ (ผู้มีจิตโน้มสู่ศรัทธา)', nameAr: 'المؤلفة قلوبهم', sortOrder: 4, isActive: true },
      { id: 'asnaf-riqab', code: 'riqab', nameTh: 'ริกอบ / มนุษยธรรม', nameAr: 'في الرقاب', sortOrder: 5, isActive: true },
      { id: 'asnaf-gharimin', code: 'gharimin', nameTh: 'ผู้มีหนี้สินล้นพ้นตัว (ฆอรีมีน)', nameAr: 'الغارمين', sortOrder: 6, isActive: true },
      { id: 'asnaf-fisabilillah', code: 'fisabilillah', nameTh: 'ฟีสะบีลิลลาฮ์ (ในหนทางของอัลลอฮ์)', nameAr: 'في سبيل الله', sortOrder: 7, isActive: true },
      { id: 'asnaf-ibnsabil', code: 'ibnsabil', nameTh: 'อิบนุสสะบีล (ผู้เดินทาง)', nameAr: 'ابن السبيل', sortOrder: 8, isActive: true },
    ];

    const asnafs = CANONICAL_ASNAFS.map((ca) => {
      const custom = enrichedStore[ca.code] || {};
      return {
        id: ca.id,
        code: ca.code,
        nameTh: custom.nameTh || ca.nameTh,
        nameAr: custom.nameAr || ca.nameAr,
        nameEn: custom.nameEn || '',
        description: custom.description || '',
        sortOrder: custom.sortOrder !== undefined ? Number(custom.sortOrder) : ca.sortOrder,
        isActive: custom.isActive !== undefined ? Boolean(custom.isActive) : ca.isActive,
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);

    // 2. Assistance Types (including inactive)
    const types = await BeneficiaryService.getAssistanceTypes({ includeInactive: true });

    // 3. Assistance Formats (Level 3)
    const formatsRes = await db.execute(`
      SELECT id, code, name, name_en as nameEn, description, delivery_method as deliveryMethod,
             delivery_method_label_th as deliveryMethodLabelTh, requires_receipt as requiresReceipt,
             requires_inspection as requiresInspection, is_active as isActive, sort_order as sortOrder
      FROM assistance_formats
      ORDER BY sort_order ASC, code ASC
    `);
    const formats = formatsRes.rows.map((r: any) => ({
      id: String(r.id),
      code: String(r.code),
      name: String(r.name),
      nameEn: r.nameEn ? String(r.nameEn) : '',
      description: r.description ? String(r.description) : '',
      deliveryMethod: String(r.deliveryMethod),
      deliveryMethodLabelTh: String(r.deliveryMethodLabelTh || r.deliveryMethod),
      requiresReceipt: Boolean(r.requiresReceipt),
      requiresInspection: Boolean(r.requiresInspection),
      isActive: Boolean(r.isActive),
      sortOrder: Number(r.sortOrder || 0),
    }));

    // 4. Matrix Links: asnaf_assistance_types
    const asnafLinksRes = await db.execute(`
      SELECT aat.id, aat.asnaf_code, aat.assistance_type_id, aat.is_active, aat.sort_order,
             ast.code as assistance_type_code, ast.name as assistance_type_name
      FROM asnaf_assistance_types aat
      JOIN assistance_types ast ON ast.id = aat.assistance_type_id
    `);
    const asnafTypeLinks = asnafLinksRes.rows.map((r: any) => ({
      id: String(r.id),
      asnafCode: String(r.asnaf_code),
      assistanceTypeId: String(r.assistance_type_id),
      assistanceTypeCode: String(r.assistance_type_code),
      assistanceTypeName: String(r.assistance_type_name),
      isActive: Boolean(r.is_active),
      sortOrder: Number(r.sort_order || 0),
    }));

    // 5. Type-Format Links: assistance_type_formats
    const formatLinksRes = await db.execute(`
      SELECT atf.id, atf.assistance_type_id, atf.format_id, atf.is_default, atf.is_active,
             af.code as format_code, af.name as format_name, ast.code as assistance_type_code
      FROM assistance_type_formats atf
      JOIN assistance_formats af ON af.id = atf.format_id
      JOIN assistance_types ast ON ast.id = atf.assistance_type_id
    `);
    const typeFormatLinks = formatLinksRes.rows.map((r: any) => ({
      id: String(r.id),
      assistanceTypeId: String(r.assistance_type_id),
      assistanceTypeCode: String(r.assistance_type_code),
      formatId: String(r.format_id),
      formatCode: String(r.format_code),
      formatName: String(r.format_name),
      isDefault: Boolean(r.is_default),
      isActive: Boolean(r.is_active),
    }));

    // Summary Stats
    const activeLinksCount = asnafTypeLinks.filter((l) => l.isActive).length;

    return NextResponse.json({
      success: true,
      data: {
        asnafs,
        types,
        formats,
        asnafTypeLinks,
        typeFormatLinks,
        summary: {
          totalAsnafs: asnafs.length,
          activeAsnafs: asnafs.filter((a) => a.isActive).length,
          totalTypes: types.length,
          activeTypes: types.filter((t) => t.isActive).length,
          totalFormats: formats.length,
          activeFormats: formats.filter((f) => f.isActive).length,
          activeLinks: activeLinksCount,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงข้อมูลเมทริกซ์ความสัมพันธ์ได้' },
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

    if (!['super_admin', 'admin', 'executive', 'officer', 'finance'].includes(actor.role)) {
      return NextResponse.json(
        { success: false, error: 'ไม่อนุญาต: คุณไม่มีสิทธิ์ปรับเปลี่ยนความสัมพันธ์ของระบบ' },
        { status: 403 }
      );
    }

    const { asnafCode, assistanceTypeId, isActive } = body;

    if (!asnafCode || !assistanceTypeId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ asnafCode และ assistanceTypeId' },
        { status: 400 }
      );
    }

    await initDb();
    const db = getDb();

    // Verify assistance type exists
    const astRes = await db.execute({
      sql: 'SELECT id, code, name FROM assistance_types WHERE id = ?',
      args: [assistanceTypeId],
    });
    if (astRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบประเภทความช่วยเหลือที่ระบุ' }, { status: 404 });
    }
    const ast = astRes.rows[0];

    // Check existing link
    const existingLinkRes = await db.execute({
      sql: 'SELECT id, is_active FROM asnaf_assistance_types WHERE asnaf_code = ? AND assistance_type_id = ?',
      args: [asnafCode, assistanceTypeId],
    });

    let linkId = '';
    let nextActive = true;
    let prevActive = false;

    if (existingLinkRes.rows.length > 0) {
      const existing = existingLinkRes.rows[0];
      linkId = String(existing.id);
      prevActive = Boolean(existing.is_active);
      nextActive = isActive !== undefined ? Boolean(isActive) : !prevActive;

      await db.execute({
        sql: `UPDATE asnaf_assistance_types 
              SET is_active = ?, updated_at = datetime('now'), updated_by = ?
              WHERE id = ?`,
        args: [nextActive ? 1 : 0, actor.id || 'system', linkId],
      });
    } else {
      nextActive = isActive !== undefined ? Boolean(isActive) : true;
      linkId = `aat-${asnafCode}-${assistanceTypeId}`;
      await db.execute({
        sql: `INSERT INTO asnaf_assistance_types (
                id, asnaf_code, assistance_type_id, is_active, sort_order, effective_date, created_by
              ) VALUES (?, ?, ?, ?, 99, datetime('now'), ?)`,
        args: [linkId, asnafCode, assistanceTypeId, nextActive ? 1 : 0, actor.id || 'system'],
      });
    }

    // Insert Audit Log
    try {
      await db.execute({
        sql: `INSERT INTO asnaf_relationship_audit_logs (
                id, relationship_type, record_id, action, actor_id, actor_name, actor_role,
                changes_summary, previous_state, new_state, created_at
              ) VALUES (?, 'asnaf_assistance_type', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          `aral-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          linkId,
          nextActive ? 'ACTIVATE_RELATIONSHIP' : 'DEACTIVATE_RELATIONSHIP',
          actor.id || null,
          actor.name || null,
          actor.role || null,
          `${nextActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}ความสัมพันธ์ อัสนัฟ [${asnafCode}] ↔ ประเภทความช่วยเหลือ [${ast.name}] (${ast.code})`,
          JSON.stringify({ asnafCode, assistanceTypeId, isActive: prevActive }),
          JSON.stringify({ asnafCode, assistanceTypeId, isActive: nextActive }),
        ],
      });
    } catch (auditErr) {
      console.warn('Failed to insert relationship audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `${nextActive ? 'เปิด' : 'ปิด'}สิทธิ์ความสัมพันธ์สำเร็จ`,
      link: {
        id: linkId,
        asnafCode,
        assistanceTypeId,
        isActive: nextActive,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงความสัมพันธ์' },
      { status: 500 }
    );
  }
}

