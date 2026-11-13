import { NextRequest, NextResponse } from 'next/server';
import { CardViewSettingsService } from '@/services/cardViewSettingsService';

export async function GET() {
  try {
    const data = await CardViewSettingsService.getConfig();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'ไม่สามารถดึงการตั้งค่าการ์ดได้';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await CardViewSettingsService.saveConfig(body?.config, request, body?.actor);
    return NextResponse.json({ success: true, data, message: 'บันทึกการตั้งค่าการ์ดแล้ว' });
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status || 500;
    const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึกการตั้งค่าการ์ดได้';
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
