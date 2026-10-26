import { NextResponse } from 'next/server';
import { BackupService } from '@/services/backupService';

export async function GET() {
  try {
    const backups = await BackupService.listBackups();
    return NextResponse.json({ success: true, data: backups });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const note = body.note || 'สำรองข้อมูลผ่านระบบ API';
    const actor = body.actor || { id: 'u-1', name: 'ผู้ดูแลระบบ', role: 'super_admin' };

    const result = await BackupService.createBackup(note, actor);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
