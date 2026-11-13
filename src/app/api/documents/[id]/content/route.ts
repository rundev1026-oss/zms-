import { NextRequest, NextResponse } from 'next/server';
import { resolveServerToken } from '@/lib/serverToken';
import { StorageService } from '@/services/storageService';
import { AuthService } from '@/services/authService';
import { ActorContext } from '@/services/registryService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function userToken(request: NextRequest): string | null {
  return resolveServerToken(request) || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = userToken(request);
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'กรุณาเข้าสู่ระบบเพื่อเปิดดูหรือดาวน์โหลดเอกสาร' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const inline = request.nextUrl.searchParams.get('inline') === '1' ? '1' : '0';

  // Step 1: Attempt to fetch from NestJS API backend
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/content?inline=${inline}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (response.ok) {
      const bytes = await response.arrayBuffer();
      const headers = new Headers();
      headers.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
      headers.set('Content-Length', response.headers.get('content-length') || String(bytes.byteLength));
      headers.set('Content-Disposition', response.headers.get('content-disposition') || (inline === '1' ? 'inline' : 'attachment'));
      headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      headers.set('X-Content-Type-Options', 'nosniff');
      return new NextResponse(new Uint8Array(bytes), { status: 200, headers });
    }
  } catch (nestErr) {
    // NestJS fetch error, continue to local storage fallback
  }

  // Step 2: Fallback to local SQLite/disk storage via StorageService
  try {
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

    const action = inline === '1' ? 'preview' : 'download';
    const localResult = await StorageService.getFileContent(id, actor, action);

    if (localResult.type === 'redirect' && localResult.url) {
      return NextResponse.redirect(localResult.url);
    }

    if (localResult.buffer) {
      const rawFileName = localResult.fileName || `document-${id}.pdf`;
      const encodedFileName = encodeURIComponent(rawFileName);
      const asciiFallback = rawFileName.replace(/[^\x20-\x7E]/g, '_');
      const dispositionType = inline === '1' ? 'inline' : 'attachment';

      const headers = new Headers();
      headers.set('Content-Type', localResult.mimeType || 'application/octet-stream');
      headers.set('Content-Length', String(localResult.fileSize || localResult.buffer.length));
      headers.set(
        'Content-Disposition',
        `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`
      );
      headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      headers.set('X-Content-Type-Options', 'nosniff');

      return new NextResponse(new Uint8Array(localResult.buffer), {
        status: 200,
        headers,
      });
    }
  } catch (localErr: any) {
    const msg = localErr.message || '';
    let status = 500;
    let friendlyError = 'ระบบไม่สามารถเปิดเอกสารได้ กรุณาลองใหม่อีกครั้ง';

    if (msg.includes('สิทธิ์') || msg.includes('ไม่มีสิทธิ์')) {
      status = 403;
      friendlyError = 'ท่านไม่มีสิทธิ์ในการเข้าถึงหรือดาวน์โหลดเอกสารนี้';
    } else if (msg.includes('ไม่พบ')) {
      status = 404;
      friendlyError = msg.includes('ต้นฉบับ')
        ? msg
        : 'ไม่พบไฟล์เอกสารบนเซิร์ฟเวอร์ เอกสารอาจถูกลบหรือยังไม่ได้อัปโหลด';
    }

    return NextResponse.json({ success: false, error: friendlyError }, { status });
  }

  return NextResponse.json(
    { success: false, error: 'ไม่พบไฟล์เอกสารบนเซิร์ฟเวอร์' },
    { status: 404 }
  );
}
