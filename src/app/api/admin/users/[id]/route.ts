import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { OrganizationService } from '@/services/organizationService';
import { getDb, initDb } from '@/lib/db';
import { User } from '@/types';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.id;

    const actor = await OrganizationService.resolveActor(req);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถดูรายละเอียดผู้ใช้งานได้' },
        { status: 403 }
      );
    }

    await initDb();
    const db = getDb();
    const res = await db.execute({
      sql: `SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.phone, u.role, u.role_title_th,
                   u.branch, u.branch_id, u.department_id, u.status, u.password_setup_status,
                   (u.password_hash IS NOT NULL) as has_password,
                   u.last_login, u.created_at, u.updated_at,
                   b.name as branch_name, d.name as department_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?`,
      args: [userId],
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้ใช้งานที่ระบุ' }, { status: 404 });
    }

    const r: any = res.rows[0];
    const user: User = {
      id: String(r.id),
      name: String(r.name),
      firstName: r.first_name ? String(r.first_name) : undefined,
      lastName: r.last_name ? String(r.last_name) : undefined,
      email: String(r.email),
      phone: String(r.phone),
      role: r.role as any,
      roleTitleTh: String(r.role_title_th),
      branch: r.branch_name ? String(r.branch_name) : String(r.branch),
      branchId: r.branch_id ? String(r.branch_id) : undefined,
      branchName: r.branch_name ? String(r.branch_name) : undefined,
      departmentId: r.department_id ? String(r.department_id) : undefined,
      departmentName: r.department_name ? String(r.department_name) : undefined,
      status: r.status as any,
      passwordSetupStatus: (r.password_setup_status as any) || (r.has_password ? 'completed' : 'pending_setup'),
      hasPassword: Boolean(r.has_password),
      lastLogin: r.last_login ? String(r.last_login) : undefined,
      createdAt: r.created_at ? String(r.created_at) : undefined,
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    };

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.id;

    const actor = await OrganizationService.resolveActor(req);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถแก้ไขผู้ใช้งานได้' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const result = await AuthService.updateUserByAdmin(userId, body, actor as any, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถแก้ไขข้อมูลผู้ใช้งานได้' },
      { status: 400 }
    );
  }
}
