import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = `/audit-logs${queryString ? `?${queryString}` : ''}`;

    const res = await proxyToNest(endpoint, request, { method: 'GET' });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถดึงข้อมูลประวัติการทำงานได้' },
        { status: res.status }
      );
    }

    const rawItems = json.items || json || [];
    const normalizedItems = (Array.isArray(rawItems) ? rawItems : []).map((log: any) => ({
      ...log,
      userName: log.userName || log.actor?.displayName || log.actor?.email || 'ระบบ',
      description: log.description || (log.metadata ? (typeof log.metadata === 'object' ? JSON.stringify(log.metadata) : String(log.metadata)) : '') || '-',
      timestamp: log.timestamp || (log.createdAt ? new Date(log.createdAt).toLocaleString('th-TH') : '-'),
      entityId: log.entityId || log.resourceId || '-',
      entityType: log.entityType || log.resourceType || 'general',
      ipAddress: log.ipAddress || '-',
    }));

    return NextResponse.json({
      success: true,
      data: normalizedItems,
      pagination: json.total !== undefined ? {
        total: json.total,
        page: json.page,
        limit: json.limit,
        totalPages: json.totalPages,
      } : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล Audit Logs' },
      { status: 500 }
    );
  }
}
