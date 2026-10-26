import { NextRequest, NextResponse } from 'next/server';
import { StorageService, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/services/storageService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'other_doc';
    const entityType = ((formData.get('entityType') as string) || 'assistance_request') as 'beneficiary' | 'assistance_request';
    const entityId = (formData.get('entityId') as string) || '';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบไฟล์ที่ต้องการอัปโหลด' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `ประเภทไฟล์ไม่ได้รับอนุญาต (${file.type}) รองรับเฉพาะ PDF (*.pdf) และรูปภาพ (*.jpg, *.png, *.webp) เท่านั้น`,
        },
        { status: 400 }
      );
    }

    // Validate Size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน ${MAX_FILE_SIZE / (1024 * 1024)} MB)`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const saved = await StorageService.saveLocalFile(
      buffer,
      file.name,
      file.type,
      category,
      entityType,
      entityId
    );

    return NextResponse.json({
      success: true,
      provider: 'local',
      fileName: file.name,
      fileUrl: saved.fileUrl,
      storagePath: saved.storagePath,
      fileSize: saved.fileSize,
      mimeType: file.type,
      checksum: saved.checksum,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการบันทึกไฟล์เข้าสู่ระบบจัดเก็บ',
      },
      { status: 500 }
    );
  }
}
