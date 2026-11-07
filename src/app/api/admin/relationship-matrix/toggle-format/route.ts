import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { OrganizationService } from '@/services/organizationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = await OrganizationService.resolveActor(request, body.actor);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    if (!['super_admin', 'admin', 'executive', 'officer', 'finance'].includes(actor.role)) {
      return NextResponse.json(
        { success: false, error: 'ไม่อนุญาต: คุณไม่มีสิทธิ์ปรับเปลี่ยนรูปแบบการช่วยเหลือ' },
        { status: 403 }
      );
    }

    const { assistanceTypeId, formatId, isActive, isDefault } = body;

    if (!assistanceTypeId || !formatId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ assistanceTypeId และ formatId' },
        { status: 400 }
      );
    }

    await initDb();
    const db = getDb();

    // Verify assistance type and format exist
    const [astRes, fmtRes] = await Promise.all([
      db.execute({
        sql: 'SELECT id, code, name FROM assistance_types WHERE id = ?',
        args: [assistanceTypeId],
      }),
      db.execute({
        sql: 'SELECT id, code, name FROM assistance_formats WHERE id = ? OR code = ?',
        args: [formatId, formatId],
      }),
    ]);

    if (astRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบประเภทความช่วยเหลือ' }, { status: 404 });
    }
    if (fmtRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรูปแบบการช่วยเหลือ' }, { status: 404 });
    }

    const ast = astRes.rows[0];
    const fmt = fmtRes.rows[0];
    const resolvedFormatId = String(fmt.id);

    // If setting default, unset other defaults for this assistance type
    if (isDefault) {
      await db.execute({
        sql: `UPDATE assistance_type_formats SET is_default = 0, updated_at = datetime('now') WHERE assistance_type_id = ?`,
        args: [assistanceTypeId],
      });
    }

    // Check existing link
    const existingRes = await db.execute({
      sql: `SELECT id, is_active, is_default FROM assistance_type_formats WHERE assistance_type_id = ? AND format_id = ?`,
      args: [assistanceTypeId, resolvedFormatId],
    });

    let linkId = '';
    let nextActive = true;
    let nextDefault = isDefault ? 1 : 0;
    let prevActive = false;

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      linkId = String(existing.id);
      prevActive = Boolean(existing.is_active);
      nextActive = isActive !== undefined ? Boolean(isActive) : !prevActive;
      if (isDefault === undefined) {
        nextDefault = Number(existing.is_default);
      }

      await db.execute({
        sql: `UPDATE assistance_type_formats 
              SET is_active = ?, is_default = ?, updated_at = datetime('now')
              WHERE id = ?`,
        args: [nextActive ? 1 : 0, nextDefault, linkId],
      });
    } else {
      nextActive = isActive !== undefined ? Boolean(isActive) : true;
      linkId = `atf-${assistanceTypeId}-${resolvedFormatId}`;
      await db.execute({
        sql: `INSERT INTO assistance_type_formats (
                id, assistance_type_id, format_id, is_default, is_active, sort_order, updated_at
              ) VALUES (?, ?, ?, ?, ?, 99, datetime('now'))`,
        args: [linkId, assistanceTypeId, resolvedFormatId, nextDefault, nextActive ? 1 : 0],
      });
    }

    // Insert Audit Log
    try {
      await db.execute({
        sql: `INSERT INTO asnaf_relationship_audit_logs (
                id, relationship_type, record_id, action, actor_id, actor_name, actor_role,
                changes_summary, previous_state, new_state, created_at
              ) VALUES (?, 'type_format_link', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          `aral-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          linkId,
          isDefault ? 'SET_DEFAULT_FORMAT' : (nextActive ? 'ACTIVATE_FORMAT' : 'DEACTIVATE_FORMAT'),
          actor.id || null,
          actor.name || null,
          actor.role || null,
          `${nextActive ? 'เปิด' : 'ปิด'}รูปแบบ [${fmt.name}] (${fmt.code}) สำหรับประเภทความช่วยเหลือ [${ast.name}]${isDefault ? ' (กำหนดเป็นค่าเริ่มต้น)' : ''}`,
          JSON.stringify({ assistanceTypeId, formatId: resolvedFormatId, isActive: prevActive }),
          JSON.stringify({ assistanceTypeId, formatId: resolvedFormatId, isActive: nextActive, isDefault: Boolean(nextDefault) }),
        ],
      });
    } catch (auditErr) {
      console.warn('Failed to insert audit log for format link:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'ปรับปรุงรูปแบบการส่งมอบสำเร็จ',
      link: {
        id: linkId,
        assistanceTypeId,
        formatId: resolvedFormatId,
        isActive: nextActive,
        isDefault: Boolean(nextDefault),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงรูปแบบการส่งมอบ' },
      { status: 500 }
    );
  }
}

