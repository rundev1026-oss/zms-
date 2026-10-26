import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storageService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');
    const actorId = searchParams.get('actorId') || 'u-1';
    const actorRole = searchParams.get('actorRole') || 'superadmin';
    const actorName = searchParams.get('actorName') || 'System';
    const nationalId = searchParams.get('nationalId') || '';

    if (!docId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ docId' },
        { status: 400 }
      );
    }

    const downloadUrl = await StorageService.getSecureDownloadUrl(
      docId,
      {
        id: actorId,
        name: actorName,
        role: actorRole,
        nationalId,
      }
    );

    return NextResponse.json({
      success: true,
      downloadUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการขอสิทธิ์เข้าถึงเอกสาร',
      },
      { status: 403 }
    );
  }
}
