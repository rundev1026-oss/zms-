import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storageService';
import { AuthService } from '@/services/authService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      fileUrl,
      storageProvider,
      storagePath,
      fileSize,
      mimeType,
      checksum,
      entityType,
      entityId,
    } = body;

    let actor = body.actor;
    if (!actor) {
      const authHeader = request.headers.get('authorization') || '';
      const cookieHeader = request.headers.get('cookie') || '';
      let token = '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '').trim();
      } else {
        const match = cookieHeader.match(/zms_session=([^;]+)/);
        if (match) token = decodeURIComponent(match[1]);
      }
      if (token) {
        const sessionUser = await AuthService.validateSession(token);
        if (sessionUser) {
          actor = {
            id: sessionUser.id,
            name: sessionUser.name,
            role: sessionUser.role,
            nationalId: (sessionUser as any).nationalId,
          };
        }
      }
    }

    if (!name || !category || !fileUrl || !entityType || !entityId) {
      return NextResponse.json(
        {
          success: false,
          error: 'กรุณาระบุข้อมูลเอกสารให้ครบถ้วน (name, category, fileUrl, entityType, entityId)',
        },
        { status: 400 }
      );
    }

    const doc = await StorageService.registerDocument(
      {
        name,
        category,
        fileUrl,
        storageProvider: storageProvider || 'local',
        storagePath: storagePath || fileUrl,
        fileSize,
        mimeType,
        checksum,
        entityType,
        entityId,
      },
      actor
    );

    return NextResponse.json({
      success: true,
      document: doc,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการลงทะเบียนเอกสารในฐานข้อมูล',
      },
      { status: 500 }
    );
  }
}
