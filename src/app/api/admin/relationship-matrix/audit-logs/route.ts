import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);

    const logsRes = await db.execute({
      sql: `SELECT 
              id,
              relationship_type as relationshipType,
              record_id as recordId,
              action,
              actor_id as actorId,
              actor_name as actorName,
              actor_role as actorRole,
              changes_summary as changesSummary,
              previous_state as previousState,
              new_state as newState,
              created_at as createdAt
            FROM asnaf_relationship_audit_logs
            ORDER BY created_at DESC
            LIMIT ?`,
      args: [limit],
    });

    const logs = logsRes.rows.map((r: any) => ({
      id: String(r.id),
      relationshipType: String(r.relationshipType),
      recordId: String(r.recordId),
      action: String(r.action),
      actorId: r.actorId ? String(r.actorId) : undefined,
      actorName: r.actorName ? String(r.actorName) : 'ผู้ดูแลระบบ',
      actorRole: r.actorRole ? String(r.actorRole) : 'admin',
      changesSummary: String(r.changesSummary || ''),
      previousState: r.previousState ? JSON.parse(String(r.previousState)) : undefined,
      newState: r.newState ? JSON.parse(String(r.newState)) : undefined,
      createdAt: String(r.createdAt),
    }));

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงบันทึกประวัติการเปลี่ยนแปลงได้' },
      { status: 500 }
    );
  }
}

