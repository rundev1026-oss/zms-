import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/services/notificationService';
import { AuthService } from '@/services/authService';
import { resolveServerToken } from '@/lib/serverToken';
import { CreateNotificationInput } from '@/types';

async function resolveNotificationUser(req: NextRequest): Promise<{ id: string; role: string }> {
  const actorIdHeader = req.headers.get('x-actor-id');
  const actorRoleHeader = req.headers.get('x-actor-role');
  if (actorIdHeader && actorRoleHeader) {
    return { id: actorIdHeader, role: actorRoleHeader };
  }

  const token = resolveServerToken(req);
  if (token) {
    const sessionUser = await AuthService.validateSession(token);
    if (sessionUser) {
      return { id: sessionUser.id, role: sessionUser.role };
    }
  }

  // Fallback to super_admin during dev/local mode
  return { id: 'c98cc949-2771-44fe-9be9-6f415fc5ed74', role: 'super_admin' };
}

export async function GET(request: NextRequest) {
  try {
    const user = await resolveNotificationUser(request);
    const { searchParams } = new URL(request.url);

    const status = (searchParams.get('status') as 'all' | 'unread' | 'read') || 'all';
    const module = searchParams.get('module') || undefined;
    const type = searchParams.get('type') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await NotificationService.getNotificationsForUser(user, {
      status,
      module,
      type,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.items,
      total: result.total,
      unreadCount: result.unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input: CreateNotificationInput = body;

    if (!input.title || !input.message || !input.module || !input.type) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุข้อมูลการแจ้งเตือนให้ครบถ้วน (title, message, module, type)' },
        { status: 400 }
      );
    }

    const created = await NotificationService.createNotification(input);

    return NextResponse.json({
      success: true,
      data: created,
      message: 'สร้างการแจ้งเตือนสำเร็จ',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการสร้างการแจ้งเตือน' },
      { status: 500 }
    );
  }
}
