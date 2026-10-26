import { NextResponse } from 'next/server';
import { RegistryService } from '@/services/registryService';

export async function GET() {
  try {
    const stats = await RegistryService.getSeparatedDashboardStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงสถิติภาพรวม' },
      { status: 500 }
    );
  }
}
