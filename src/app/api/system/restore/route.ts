import { NextResponse } from 'next/server';
import { BackupService } from '@/services/backupService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, actor } = body;

    if (!filename || !actor) {
      return NextResponse.json({ success: false, error: 'ต้องระบุชื่อไฟล์สำรองและข้อมูลผู้กู้คืน' }, { status: 400 });
    }

    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'การละเมิดสิทธิ์: เฉพาะ Super Admin เท่านั้นที่สามารถกู้คืนฐานข้อมูลได้' },
        { status: 403 }
      );
    }

    const result = await BackupService.restoreBackup(filename, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
