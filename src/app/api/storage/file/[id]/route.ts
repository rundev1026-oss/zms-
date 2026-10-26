import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storageService';
import { AuthService } from '@/services/authService';
import { ActorContext } from '@/services/registryService';

function extractToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }
  const cookie = request.cookies.get('zms_session')?.value;
  if (cookie) return cookie;

  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) return queryToken;

  return '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    const { searchParams } = new URL(request.url);
    const isDownload =
      searchParams.get('action') === 'download' ||
      searchParams.get('download') === 'true' ||
      searchParams.get('mode') === 'download';
    const action = (isDownload ? 'download' : 'preview') as 'preview' | 'download';

    if (!docId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรหัสเอกสาร (docId)' },
        { status: 400 }
      );
    }

    // 1. Authenticate Request
    const token = extractToken(request);
    let actor: ActorContext;

    if (token) {
      const user = await AuthService.validateSession(token);
      if (user) {
        actor = {
          id: user.id,
          name: user.name,
          role: user.role,
          nationalId: user.nationalId,
          beneficiaryId: user.beneficiaryId,
        };
      } else {
        return NextResponse.json(
          { success: false, error: 'Session การใช้งานหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' },
          { status: 401 }
        );
      }
    } else {
      // Fallback check: Allow query actor params for internal/authenticated views if session cookie wasn't forwarded
      const actorId = searchParams.get('actorId');
      const actorRole = searchParams.get('actorRole');
      const actorName = searchParams.get('actorName');
      const nationalId = searchParams.get('nationalId');

      if (actorId && actorRole && ['officer', 'super_admin', 'approver', 'executive', 'member'].includes(actorRole)) {
        actor = {
          id: actorId,
          name: actorName || 'User',
          role: actorRole,
          nationalId: nationalId || undefined,
        };
      } else {
        return NextResponse.json(
          { success: false, error: 'กรุณาเข้าสู่ระบบเพื่อเปิดดูหรือดาวน์โหลดเอกสาร' },
          { status: 401 }
        );
      }
    }

    // 2. Fetch File Content & Check Permissions via StorageService
    const result = await StorageService.getFileContent(docId, actor, action);

    // 3. Remote Storage Redirect (S3 Presigned URL)
    if (result.type === 'redirect' && result.url) {
      return NextResponse.redirect(result.url);
    }

    // 4. Local File Buffer Streaming
    if (!result.buffer) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบเนื้อหาไฟล์ในระบบจัดเก็บ' },
        { status: 404 }
      );
    }

    const rawFileName = result.fileName || `document-${docId}.pdf`;
    const encodedFileName = encodeURIComponent(rawFileName);
    const asciiFallback = rawFileName.replace(/[^\x20-\x7E]/g, '_');
    const dispositionType = action === 'preview' ? 'inline' : 'attachment';

    const headers = new Headers();
    headers.set('Content-Type', result.mimeType || 'application/octet-stream');
    headers.set('Content-Length', String(result.fileSize || result.buffer.length));
    headers.set(
      'Content-Disposition',
      `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`
    );
    headers.set('Cache-Control', 'private, max-age=3600, must-revalidate');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    const status = error.message?.includes('สิทธิ์') ? 403 : error.message?.includes('ไม่พบ') ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการเปิดดูหรือดาวน์โหลดเอกสาร',
      },
      { status }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Session หมดอายุหรือไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const actor: ActorContext = {
      id: user.id,
      name: user.name,
      role: user.role,
      nationalId: user.nationalId,
      beneficiaryId: user.beneficiaryId,
    };

    await StorageService.deleteDocument(docId, actor);

    return NextResponse.json({
      success: true,
      message: 'ลบเอกสารสำเร็จ',
    });
  } catch (error: any) {
    const status = error.message?.includes('สิทธิ์') ? 403 : error.message?.includes('ไม่พบ') ? 404 : 400;
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการลบเอกสาร' },
      { status }
    );
  }
}
