import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getFollowUpUploadDir } from '@/services/followUpService';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const planId = (formData.get('planId') as string) || 'general';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบไฟล์รูปภาพที่ต้องการอัปโหลด' },
        { status: 400 }
      );
    }

    // 1. Validate MIME type
    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_PHOTO_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `ประเภทไฟล์รูปภาพไม่ถูกต้อง (${file.type}) รองรับเฉพาะ JPG, JPEG, PNG และ WebP เท่านั้น`,
        },
        { status: 400 }
      );
    }

    // 2. Validate Size
    if (file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน ${MAX_PHOTO_SIZE / (1024 * 1024)} MB)`,
        },
        { status: 400 }
      );
    }

    // 3. Save to public/uploads/follow-ups/
    const uploadDir = getFollowUpUploadDir();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanFileName}`;
    const destinationPath = path.join(uploadDir, uniqueFileName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destinationPath, buffer);

    const publicPath = `/uploads/follow-ups/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      message: 'อัปโหลดรูปภาพหลักฐานเรียบร้อย',
      data: {
        fileName: file.name,
        storedFileName: uniqueFileName,
        filePath: publicPath,
        fileUrl: publicPath,
        fileType: mimeType,
        fileSize: file.size,
      },
    });
  } catch (error: any) {
    console.error('Error uploading follow-up photo:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการบันทึกไฟล์ภาพหลักฐานเข้าสู่ระบบจัดเก็บ',
      },
      { status: 500 }
    );
  }
}
