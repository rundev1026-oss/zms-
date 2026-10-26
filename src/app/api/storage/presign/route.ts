import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storageService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, fileSize, category, entityType, entityId, actor } = body;

    if (!fileName || !fileType || !fileSize || !category || !entityType) {
      return NextResponse.json(
        {
          success: false,
          error: 'กรุณาระบุข้อมูลไฟล์ให้ครบถ้วน (fileName, fileType, fileSize, category, entityType)',
        },
        { status: 400 }
      );
    }

    const presignedData = await StorageService.generatePresignedUploadUrl(
      {
        fileName,
        fileType,
        fileSize,
        category,
        entityType,
        entityId,
      },
      actor
    );

    return NextResponse.json({
      success: true,
      ...presignedData,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการสร้าง Presigned URL สำหรับอัปโหลดไฟล์',
      },
      { status: 400 }
    );
  }
}
