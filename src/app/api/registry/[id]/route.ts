import { NextRequest, NextResponse } from 'next/server';
import { RegistryService } from '@/services/registryService';
import { AuthService } from '@/services/authService';

function extractToken(req: Request): string {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/zms_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await RegistryService.getBeneficiaryRegistryById(id);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่พบข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาต' },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

async function handleUpdate(
  request: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  try {
    const { id } = await paramsPromise;
    const body = await request.json();
    const input = body.input || body;

    // Extract actor from session or request body
    let actor = body.actor;
    if (!actor) {
      const token = extractToken(request);
      if (token) {
        const sessionUser = await AuthService.validateSession(token);
        if (sessionUser) {
          actor = {
            id: sessionUser.id,
            name: sessionUser.name,
            role: sessionUser.role,
            nationalId: sessionUser.nationalId,
            beneficiaryId: sessionUser.beneficiaryId,
          };
        }
      }
    }

    if (!actor) {
      actor = {
        id: 'officer-1',
        name: 'เจ้าหน้าที่ผู้รับผิดชอบ',
        role: 'officer',
      };
    }

    const notes = body.notes || input.editNotes || '';

    const updatedData = await RegistryService.updateBeneficiaryRegistry(
      id,
      input,
      actor,
      notes
    );

    return NextResponse.json({
      success: true,
      message: 'บันทึกการแก้ไขข้อมูลทะเบียนสำเร็จ',
      data: updatedData,
    });
  } catch (error: any) {
    const isForbidden = error.message?.includes('สิทธิ์');
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลทะเบียน' },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
