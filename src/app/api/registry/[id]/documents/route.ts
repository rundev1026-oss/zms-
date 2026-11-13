import { NextRequest, NextResponse } from 'next/server';
import { mapRegistryDocument, readNestFailure } from '@/lib/registrySurvey';
import { computeDocumentChecklist } from '@/lib/registryDocuments';
import { resolveServerToken } from '@/lib/serverToken';
import { StorageService, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/services/storageService';
import { AuthService } from '@/services/authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function loadMergedBeneficiaryDocuments(id: string, token: string) {
  const docsMap = new Map<string, any>();

  try {
    const response = await fetch(`${API_BASE_URL}/beneficiaries/${id}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const mapped = mapRegistryDocument(row);
          if (mapped.id) docsMap.set(mapped.id, mapped);
        }
      }
    }
  } catch {}

  try {
    const localRows = await StorageService.getDocumentsByEntity('beneficiary', id);
    for (const row of localRows) {
      const mapped = mapRegistryDocument(row);
      if (mapped.id && !docsMap.has(mapped.id)) {
        docsMap.set(mapped.id, mapped);
      }
    }
  } catch {}

  return Array.from(docsMap.values());
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = resolveServerToken(request);
  if (!token) return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;

  const data = await loadMergedBeneficiaryDocuments(id, token);
  const checklistSummary = computeDocumentChecklist(data);

  return NextResponse.json({
    success: true,
    data,
    checklistSummary,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = resolveServerToken(request);
  if (!token) return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;
  const incoming = await request.formData();
  const file = incoming.get('file');
  const documentType = String(incoming.get('documentType') || incoming.get('category') || '').trim();
  const replacesDocumentId = String(incoming.get('replacesDocumentId') || '').trim();
  if (!(file instanceof File) || !documentType) {
    return NextResponse.json({ success: false, error: 'กรุณาเลือกไฟล์และประเภทเอกสาร' }, { status: 400 });
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return NextResponse.json(
      {
        success: false,
        error: `ประเภทไฟล์ไม่ได้รับอนุญาต (${file.type}) รองรับเฉพาะ PDF, JPG, PNG, WEBP`,
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: `ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน ${MAX_FILE_SIZE / (1024 * 1024)} MB)`,
      },
      { status: 400 },
    );
  }

  const outgoing = new FormData();
  outgoing.append('file', file, file.name);
  outgoing.append('documentType', documentType);
  if (replacesDocumentId) outgoing.append('replacesDocumentId', replacesDocumentId);

  try {
    const response = await fetch(`${API_BASE_URL}/beneficiaries/${id}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
    });
    if (response.ok) {
      const created = await response.json();
      const mapped = mapRegistryDocument(created);
      const allDocs = await loadMergedBeneficiaryDocuments(id, token);
      const checklistSummary = computeDocumentChecklist(allDocs);
      return NextResponse.json({
        success: true,
        document: mapped,
        documents: allDocs,
        checklistSummary,
      });
    }
    if (response.status !== 404) {
      const error = await readNestFailure(response, 'อัปโหลดเอกสารไม่สำเร็จ');
      return NextResponse.json({ success: false, error }, { status: response.status });
    }
  } catch {}

  // Fallback for local/SQLite beneficiary records (e.g. ben-...)
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const saved = await StorageService.saveLocalFile(
      buffer,
      file.name,
      file.type || 'application/pdf',
      documentType,
      'beneficiary',
      id,
    );
    const user = await AuthService.validateSession(token);
    const actor = user
      ? { id: user.id, name: user.name, role: user.role, nationalId: user.nationalId }
      : { id: 'officer-1', name: 'เจ้าหน้าที่ระบบ', role: 'officer' as const };
    const createdLocal = await StorageService.registerDocument(
      {
        name: file.name,
        category: documentType,
        fileUrl: saved.fileUrl,
        storageProvider: 'local',
        storagePath: saved.storagePath,
        fileSize: saved.fileSize,
        mimeType: file.type || 'application/pdf',
        checksum: saved.checksum,
        entityType: 'beneficiary',
        entityId: id,
      },
      actor,
    );
    const mapped = mapRegistryDocument(createdLocal);
    const allDocs = await loadMergedBeneficiaryDocuments(id, token);
    const checklistSummary = computeDocumentChecklist(allDocs);
    return NextResponse.json({
      success: true,
      document: mapped,
      documents: allDocs,
      checklistSummary,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'อัปโหลดเอกสารไม่สำเร็จ' },
      { status: 500 },
    );
  }
}
