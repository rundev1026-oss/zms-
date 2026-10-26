import { NextRequest, NextResponse } from 'next/server';
import { RegistryService } from '@/services/registryService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = await RegistryService.getRegistryEditHistory(id);

    return NextResponse.json({ success: true, data: history });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่พบประวัติการแก้ไขข้อมูลทะเบียน' },
      { status: 404 }
    );
  }
}
