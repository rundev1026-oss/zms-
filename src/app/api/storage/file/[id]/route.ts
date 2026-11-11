import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storageService';
import { AuthService } from '@/services/authService';
import { ActorContext } from '@/services/registryService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function extractToken(request: NextRequest): string {
  // 1. Authorization Bearer header
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const raw = authHeader.replace('Bearer ', '').trim();
    if (raw && raw !== 'cookie-session' && raw !== 'null' && raw !== 'undefined') {
      return raw;
    }
  }

  // 2. HTTP-only cookies
  const sessionCookie = request.cookies.get('zms_session')?.value ||
                        request.cookies.get('zms_auth_token')?.value ||
                        request.cookies.get('zms_access_token')?.value;
  if (sessionCookie && sessionCookie !== 'cookie-session' && sessionCookie !== 'null' && sessionCookie !== 'undefined') {
    return sessionCookie.trim();
  }

  // 3. Cookie header regex fallback
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/zms_session=([^;]+)/) ||
                cookieHeader.match(/zms_auth_token=([^;]+)/) ||
                cookieHeader.match(/zms_access_token=([^;]+)/);
  if (match) {
    const raw = decodeURIComponent(match[1]).trim();
    if (raw && raw !== 'cookie-session' && raw !== 'null' && raw !== 'undefined') {
      return raw;
    }
  }

  // NOTE: Token via query string (?token=...) is strictly disallowed for security/PDPA compliance
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
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบเพื่อเปิดดูหรือดาวน์โหลดเอกสาร' },
        { status: 401 }
      );
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Session การใช้งานหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' },
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

    // 2. Fetch File Content & Check Permissions via StorageService (SQLite / Local / S3)
    let result: any = null;
    let localError: any = null;

    try {
      result = await StorageService.getFileContent(docId, actor, action);
    } catch (err: any) {
      localError = err;
    }

    // 3. Fallback to NestJS documents endpoint if not found in local/SQLite storage
    if (!result && localError && localError.message?.includes('ไม่พบเอกสาร')) {
      try {
        const nestRes = await fetch(
          `${API_BASE_URL}/documents/${docId}/content?inline=${action === 'preview' ? '1' : '0'}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }
        );

        if (nestRes.ok) {
          const bytes = await nestRes.arrayBuffer();
          const headers = new Headers();
          headers.set('Content-Type', nestRes.headers.get('content-type') || 'application/pdf');
          headers.set('Content-Length', nestRes.headers.get('content-length') || String(bytes.byteLength));
          headers.set(
            'Content-Disposition',
            nestRes.headers.get('content-disposition') || (action === 'preview' ? 'inline' : 'attachment')
          );
          headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
          headers.set('X-Content-Type-Options', 'nosniff');

          return new NextResponse(new Uint8Array(bytes), {
            status: 200,
            headers,
          });
        }
      } catch (nestErr) {
        // Fall through to error reporting
      }
    }

    if (!result) {
      throw localError || new Error('ไม่พบเอกสารที่ระบุในระบบ');
    }

    // 4. Remote Storage Redirect (S3 Presigned URL)
    if (result.type === 'redirect' && result.url) {
      return NextResponse.redirect(result.url);
    }

    // 5. Local File Buffer Streaming
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
    headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    const msg = error.message || '';
    let status = 500;
    let friendlyError = 'ระบบไม่สามารถเปิดเอกสารได้ กรุณาลองใหม่อีกครั้ง';

    if (msg.includes('สิทธิ์') || msg.includes('ไม่มีสิทธิ์') || msg.includes('permission') || msg.includes('Forbidden')) {
      status = 403;
      friendlyError = 'ท่านไม่มีสิทธิ์ในการเข้าถึงหรือดาวน์โหลดเอกสารนี้';
    } else if (msg.includes('ไม่พบ') || msg.includes('not found') || msg.includes('NotFound')) {
      status = 404;
      friendlyError = msg.includes('ต้นฉบับ')
        ? msg
        : 'ไม่พบไฟล์เอกสารบนเซิร์ฟเวอร์ เอกสารอาจถูกลบหรือยังไม่ได้อัปโหลด';
    } else if (msg.includes('ประเภทไฟล์') || msg.includes('ไม่รองรับ') || msg.includes('Unsupported')) {
      status = 415;
      friendlyError = 'ไม่รองรับประเภทไฟล์นี้สำหรับการเปิดดูตัวอย่าง';
    }

    return NextResponse.json(
      {
        success: false,
        error: friendlyError,
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
        { success: false, error: 'Session การใช้งานหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' },
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

    const deleted = await StorageService.deleteDocument(docId, actor);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถลบเอกสารได้' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ลบเอกสารเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    const msg = error.message || '';
    const status = msg.includes('สิทธิ์') ? 403 : msg.includes('ไม่พบ') ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: msg || 'เกิดข้อผิดพลาดในการลบเอกสาร',
      },
      { status }
    );
  }
}
