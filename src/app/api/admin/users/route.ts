import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { OrganizationService } from '@/services/organizationService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function resolveToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/zms_session=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = resolveToken(req);

    // 1. First attempt enterprise NestJS backend
    if (token) {
      try {
        const nestRes = await fetch(`${API_BASE_URL}/users?${searchParams.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (nestRes.ok) {
          const data = await nestRes.json();
          return NextResponse.json({
            success: true,
            data: data.items,
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
            totalPages: data.totalPages,
            stats: data.stats,
            pendingSetupCount: data.stats?.pendingPermissions || 0,
          });
        }
      } catch {}
    }

    // 2. Fallback to local AuthService
    const actor = await OrganizationService.resolveActor(req);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถดูรายชื่อผู้ใช้งานทั้งหมดได้' },
        { status: 403 }
      );
    }

    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const role = (searchParams.get('role') as any) || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const passwordSetupStatus = (searchParams.get('passwordSetupStatus') as any) || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await AuthService.getAllUsers({
      branchId,
      departmentId,
      role,
      status,
      passwordSetupStatus,
      search,
    });

    return NextResponse.json({
      success: true,
      data: result.users,
      total: result.total,
      pendingSetupCount: result.pendingSetupCount,
      stats: {
        totalUsers: result.total,
        activeUsers: result.users.filter((u: any) => u.status === 'active').length,
        inactiveUsers: result.users.filter((u: any) => u.status !== 'active').length,
        suspendedUsers: result.users.filter((u: any) => u.status === 'suspended').length,
        totalRoles: 7,
        pendingPermissions: result.pendingSetupCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = resolveToken(req);

    // 1. First attempt enterprise NestJS backend
    if (token) {
      try {
        const roleMapping: Record<string, string> = {
          super_admin: 'SUPER_ADMIN',
          executive: 'ADMIN',
          officer: 'ASSISTANCE_OFFICER',
          finance: 'FINANCE_OFFICER',
          approver: 'APPROVER',
          member: 'PUBLIC_USER',
        };
        const mappedRole = roleMapping[body.role] || body.role || 'ASSISTANCE_OFFICER';

        const nestRes = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-zms-csrf': '1',
          },
          body: JSON.stringify({
            displayName: body.displayName || `${body.firstName || ''} ${body.lastName || ''}`.trim() || body.username || 'ผู้ใช้ใหม่',
            username: body.username || (body.email ? body.email.split('@')[0] : 'user_' + Date.now()),
            email: body.email,
            phone: body.phone,
            roleCode: mappedRole,
            branchId: body.branchId || 'br-hq',
            departmentId: body.departmentId || 'dept-social',
            position: body.position || '-',
            dataScope: body.dataScope || 'BRANCH',
            approvalLimit: body.approvalLimit ? Number(body.approvalLimit) : undefined,
            password: body.password || 'ZmsEnterprise2026!',
          }),
        });

        const data = await nestRes.json();
        if (nestRes.ok) {
          return NextResponse.json({ success: true, message: data.message || 'สร้างผู้ใช้งานสำเร็จ', data }, { status: 201 });
        } else {
          return NextResponse.json({ success: false, error: data.message || 'ไม่สามารถสร้างผู้ใช้งานได้' }, { status: nestRes.status });
        }
      } catch {}
    }

    // 2. Fallback to local AuthService
    const actor = await OrganizationService.resolveActor(req);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถเพิ่มผู้ใช้งานได้' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await AuthService.createUserByAdmin(body, actor as any, ip);

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.user,
        setupToken: result.setupToken,
        setupUrl: result.setupUrl,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'ไม่สามารถเพิ่มผู้ใช้งานได้' }, { status: 400 });
  }
}
