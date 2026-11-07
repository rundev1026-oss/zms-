import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { OrganizationService } from '@/services/organizationService';

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();

    const formatsRes = await db.execute(`
      SELECT 
        af.id,
        af.code,
        af.name,
        af.name_en as nameEn,
        af.description,
        af.delivery_method as deliveryMethod,
        af.delivery_method_label_th as deliveryMethodLabelTh,
        af.requires_receipt as requiresReceipt,
        af.requires_inspection as requiresInspection,
        af.is_active as isActive,
        af.sort_order as sortOrder,
        af.created_at as createdAt,
        af.updated_at as updatedAt,
        (
          SELECT COUNT(DISTINCT atf.assistance_type_id)
          FROM assistance_type_formats atf
          JOIN assistance_types ast ON ast.id = atf.assistance_type_id
          WHERE atf.format_id = af.id AND atf.is_active = 1 AND ast.is_active = 1
        ) as linkedTypeCount
      FROM assistance_formats af
      ORDER BY af.sort_order ASC, af.code ASC
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
      linkedTypeCount: Number(r.linkedTypeCount || 0),
      createdAt: r.createdAt ? String(r.createdAt) : undefined,
      updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
    }));

    return NextResponse.json({ success: true, data: formats });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงข้อมูลรูปแบบการช่วยเหลือได้' },
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

    const {
      id,
      code,
      name,
      nameEn,
      description,
      deliveryMethod,
      deliveryMethodLabelTh,
      requiresReceipt,
      requiresInspection,
      isActive,
      sortOrder,
    } = body;

    if (!id && !code) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรหัสรูปแบบการช่วยเหลือ (id หรือ code)' },
        { status: 400 }
      );
    }

    await initDb();
    const db = getDb();

    // Check existing format
    const existingRes = await db.execute({
      sql: `SELECT * FROM assistance_formats WHERE id = ? OR code = ?`,
      args: [id || '', code || ''],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรูปแบบการช่วยเหลือที่ระบุ' }, { status: 404 });
    }

    const existing = existingRes.rows[0];
    const targetId = String(existing.id);

    const nextName = name !== undefined ? String(name).trim() : String(existing.name);
    const nextNameEn = nameEn !== undefined ? String(nameEn).trim() : (existing.name_en ? String(existing.name_en) : '');
    const nextDesc = description !== undefined ? String(description).trim() : (existing.description ? String(existing.description) : '');
    const nextMethod = deliveryMethod !== undefined ? String(deliveryMethod).trim() : String(existing.delivery_method);
    const nextMethodLabel = deliveryMethodLabelTh !== undefined ? String(deliveryMethodLabelTh).trim() : String(existing.delivery_method_label_th || existing.delivery_method);
    const nextReqReceipt = requiresReceipt !== undefined ? (requiresReceipt ? 1 : 0) : Number(existing.requires_receipt);
    const nextReqInspection = requiresInspection !== undefined ? (requiresInspection ? 1 : 0) : Number(existing.requires_inspection);
    const nextActive = isActive !== undefined ? (isActive ? 1 : 0) : Number(existing.is_active);
    const nextOrder = sortOrder !== undefined ? Number(sortOrder) : Number(existing.sort_order || 0);

    await db.execute({
      sql: `UPDATE assistance_formats 
            SET name = ?,
                name_en = ?,
                description = ?,
                delivery_method = ?,
                delivery_method_label_th = ?,
                requires_receipt = ?,
                requires_inspection = ?,
                is_active = ?,
                sort_order = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        nextName,
        nextNameEn,
        nextDesc,
        nextMethod,
        nextMethodLabel,
        nextReqReceipt,
        nextReqInspection,
        nextActive,
        nextOrder,
        targetId,
      ],
    });

    // Record Audit Log
    try {
      await db.execute({
        sql: `INSERT INTO asnaf_relationship_audit_logs (
                id, relationship_type, record_id, action, actor_id, actor_name, actor_role, changes_summary, created_at
              ) VALUES (?, 'assistance_format', ?, 'UPDATE_FORMAT', ?, ?, ?, ?, datetime('now'))`,
        args: [
          `aral-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          targetId,
          actor.id || null,
          actor.name || null,
          actor.role || null,
          `ปรับปรุงข้อมูลรูปแบบการช่วยเหลือ "${nextName}" (${existing.code}) [สถานะ: ${nextActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}]`,
        ],
      });
    } catch (auditErr) {
      console.warn('Failed to insert audit log for assistance format update:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'ปรับปรุงข้อมูลรูปแบบการช่วยเหลือสำเร็จ',
      data: {
        id: targetId,
        code: String(existing.code),
        name: nextName,
        isActive: Boolean(nextActive),
        sortOrder: nextOrder,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงข้อมูลรูปแบบการช่วยเหลือ' },
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

    const {
      code,
      name,
      nameEn,
      description,
      deliveryMethod,
      deliveryMethodLabelTh,
      requiresReceipt,
      requiresInspection,
      isActive,
      sortOrder,
    } = body;

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรหัสและชื่อรูปแบบการช่วยเหลือ' },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toLowerCase();
    const cleanName = String(name).trim();

    await initDb();
    const db = getDb();

    // Check code duplication
    const duplicateRes = await db.execute({
      sql: `SELECT id, code, name FROM assistance_formats WHERE LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)`,
      args: [cleanCode, cleanName],
    });

    if (duplicateRes.rows.length > 0) {
      const dup: any = duplicateRes.rows[0];
      return NextResponse.json(
        {
          success: false,
          error: dup.code === cleanCode
            ? `รหัสรูปแบบ "${cleanCode}" มีอยู่ในระบบแล้ว`
            : `ชื่อรูปแบบ "${cleanName}" มีอยู่ในระบบแล้ว`,
        },
        { status: 409 }
      );
    }

    const id = `fmt-${cleanCode.replace(/[^a-z0-9_-]/g, '_')}`;
    const nextDeliveryMethod = deliveryMethod || 'cash_transfer';
    const nextDeliveryLabel = deliveryMethodLabelTh || 'โอนเงินเข้าบัญชีธนาคาร';
    const nextReqReceipt = requiresReceipt !== undefined ? (requiresReceipt ? 1 : 0) : 1;
    const nextReqInspection = requiresInspection !== undefined ? (requiresInspection ? 1 : 0) : 0;
    const nextActive = isActive !== undefined ? (isActive ? 1 : 0) : 1;
    const nextOrder = Number(sortOrder) || 0;

    await db.execute({
      sql: `INSERT INTO assistance_formats (
              id, code, name, name_en, description, 
              delivery_method, delivery_method_label_th, 
              requires_receipt, requires_inspection, is_active, sort_order, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [
        id,
        cleanCode,
        cleanName,
        nameEn ? String(nameEn).trim() : null,
        description ? String(description).trim() : null,
        nextDeliveryMethod,
        nextDeliveryLabel,
        nextReqReceipt,
        nextReqInspection,
        nextActive,
        nextOrder,
      ],
    });

    // Audit log
    try {
      await db.execute({
        sql: `INSERT INTO asnaf_relationship_audit_logs (
                id, relationship_type, record_id, action, actor_id, actor_name, actor_role, changes_summary, created_at
              ) VALUES (?, 'assistance_format', ?, 'CREATE_FORMAT', ?, ?, ?, ?, datetime('now'))`,
        args: [
          `aral-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          id,
          actor.id || null,
          actor.name || null,
          actor.role || null,
          `สร้างรูปแบบการช่วยเหลือใหม่ "${cleanName}" (${cleanCode})`,
        ],
      });
    } catch (auditErr) {
      console.warn('Failed to insert audit log for assistance format creation:', auditErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: `สร้างรูปแบบการช่วยเหลือ "${cleanName}" สำเร็จ`,
        data: {
          id,
          code: cleanCode,
          name: cleanName,
          nameEn: nameEn || '',
          description: description || '',
          deliveryMethod: nextDeliveryMethod,
          deliveryMethodLabelTh: nextDeliveryLabel,
          requiresReceipt: Boolean(nextReqReceipt),
          requiresInspection: Boolean(nextReqInspection),
          isActive: Boolean(nextActive),
          sortOrder: nextOrder,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการสร้างรูปแบบการช่วยเหลือ' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const actor = await OrganizationService.resolveActor(request);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรหัสรูปแบบการช่วยเหลือ (id)' }, { status: 400 });
    }

    await initDb();
    const db = getDb();

    // Check existing format
    const existingRes = await db.execute({
      sql: `SELECT * FROM assistance_formats WHERE id = ?`,
      args: [id],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรูปแบบการช่วยเหลือที่ต้องการลบ' }, { status: 404 });
    }

    const existing: any = existingRes.rows[0];

    // Check linked assistance types
    const linkedRes = await db.execute({
      sql: `SELECT COUNT(*) as count FROM assistance_type_formats WHERE format_id = ? AND is_active = 1`,
      args: [id],
    });
    const linkedCount = Number(linkedRes.rows[0]?.count || 0);

    if (linkedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่สามารถลบรูปแบบ "${existing.name}" ได้เนื่องจากมีประเภทการช่วยเหลือผูกอยู่ ${linkedCount} รายการ กรุณายกเลิกการผูกข้อมูลก่อน หรือเปลี่ยนสถานะเป็น "ปิดใช้งาน" แทน`,
          linkedCount,
        },
        { status: 400 }
      );
    }

    // Delete relationships and format
    await db.execute({
      sql: `DELETE FROM assistance_type_formats WHERE format_id = ?`,
      args: [id],
    });

    await db.execute({
      sql: `DELETE FROM assistance_formats WHERE id = ?`,
      args: [id],
    });

    // Audit log
    try {
      await db.execute({
        sql: `INSERT INTO asnaf_relationship_audit_logs (
                id, relationship_type, record_id, action, actor_id, actor_name, actor_role, changes_summary, created_at
              ) VALUES (?, 'assistance_format', ?, 'DELETE_FORMAT', ?, ?, ?, ?, datetime('now'))`,
        args: [
          `aral-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          id,
          actor.id || null,
          actor.name || null,
          actor.role || null,
          `ลบรูปแบบการช่วยเหลือ "${existing.name}" (${existing.code}) ออกจากระบบ`,
        ],
      });
    } catch (auditErr) {
      console.warn('Failed to insert audit log for assistance format deletion:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `ลบรูปแบบการช่วยเหลือ "${existing.name}" เรียบร้อยแล้ว`,
      data: { id },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการลบรูปแบบการช่วยเหลือ' },
      { status: 500 }
    );
  }
}

