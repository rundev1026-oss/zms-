import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

export async function GET() {
  try {
    const data = await AuthService.getOrganizationStructure();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถโหลดโครงสร้างองค์กรได้' },
      { status: 500 }
    );
  }
}
