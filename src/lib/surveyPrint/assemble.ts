import type { NextRequest } from 'next/server';
import { buildSurveyPrintModel, type SurveyPrintImage } from './model';
import { renderSurveyHtml } from './render';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function userToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined') return token;
  }
  const cookie = request.headers.get('cookie') || '';
  const session = cookie.match(/zms_session=([^;]+)/);
  if (session) return decodeURIComponent(session[1]);
  const stored = cookie.match(/zms_auth_token=([^;]+)/);
  if (stored) return decodeURIComponent(stored[1]);
  return null;
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function failureMessage(body: any, fallback: string): string {
  const raw = body?.message ?? body?.error;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  return fallback;
}

const IMAGE_CATEGORIES = new Set(['housing_exterior', 'housing_interior', 'family_photo', 'field_photo']);

export async function assembleSurveyDocument(request: NextRequest, beneficiaryId: string) {
  const token = userToken(request);
  if (!token) {
    return { ok: false as const, status: 401, error: 'กรุณาเข้าสู่ระบบก่อนพิมพ์เอกสาร' };
  }
  const headers = { Authorization: `Bearer ${token}` };

  const beneficiaryRes = await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}`, { headers, cache: 'no-store' });
  if (!beneficiaryRes.ok) {
    const body = await readJson(beneficiaryRes);
    return {
      ok: false as const,
      status: beneficiaryRes.status,
      error: failureMessage(body, 'ไม่พบทะเบียนหรือไม่มีสิทธิ์เปิดเอกสาร'),
    };
  }
  const beneficiary = await readJson(beneficiaryRes);

  const [documentsRes, profileRes, consentRes] = await Promise.all([
    fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/documents`, { headers, cache: 'no-store' }),
    fetch(`${API_BASE_URL}/auth/me`, { headers, cache: 'no-store' }),
    fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/consents/latest`, { headers, cache: 'no-store' }),
  ]);

  const documents = documentsRes.ok ? await readJson(documentsRes) : [];
  const profile = profileRes.ok ? await readJson(profileRes) : {};
  const consent = consentRes.ok ? await readJson(consentRes) : null;

  const applications: any[] = [];
  let applicationsNote: string | null = null;
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(
      `${API_BASE_URL}/assistance-requests?beneficiaryId=${encodeURIComponent(beneficiaryId)}&page=${page}&limit=100`,
      { headers, cache: 'no-store' },
    );
    if (response.status === 403) {
      applicationsNote = 'ไม่มีสิทธิ์เข้าถึงประวัติคำร้อง';
      break;
    }
    if (!response.ok) {
      applicationsNote = 'ไม่สามารถโหลดประวัติคำร้องได้';
      break;
    }
    const body = (await readJson(response)) || {};
    const items = Array.isArray(body.items) ? body.items : [];
    applications.push(...items);
    const total = Number(body.total || items.length);
    if (applications.length >= total || items.length === 0) break;
  }

  await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/survey-print`, {
    method: 'POST',
    headers,
    cache: 'no-store',
  }).catch(() => undefined);

  const documentRows = Array.isArray(documents) ? documents : [];
  const images: SurveyPrintImage[] = [];
  for (const document of documentRows) {
    const mime = String(document.mimeType || '');
    const category = String(document.documentType || document.category || '');
    const isImage = mime.startsWith('image/') || (IMAGE_CATEGORIES.has(category) && mime !== 'application/pdf');
    if (!isImage || document.fileAvailable === false || !document.id) continue;
    if (Number(document.fileSize || document.sizeBytes || 0) > 8_000_000) continue;
    const fileRes = await fetch(`${API_BASE_URL}/documents/${document.id}/content?inline=1`, { headers, cache: 'no-store' });
    if (!fileRes.ok) continue;
    const type = fileRes.headers.get('content-type') || mime;
    if (!type.startsWith('image/')) continue;
    const bytes = Buffer.from(await fileRes.arrayBuffer());
    const caption = `${categoryLabel(category)} · ${document.originalFileName || document.fileName || document.name || 'รูปภาพ'}`;
    images.push({
      id: document.id,
      dataUrl: `data:${type};base64,${bytes.toString('base64')}`,
      caption,
    });
  }

  const model = buildSurveyPrintModel({
    beneficiary,
    documents: documentRows,
    applications,
    applicationsNote,
    consent,
    images,
    printedBy: profile?.displayName || profile?.username || profile?.email || 'ผู้ใช้งานระบบ',
  });
  return {
    ok: true as const,
    html: renderSurveyHtml(model),
    model,
    registryNumber: model.registryNumber,
    fullName: model.fullName,
    printedAt: model.printedAt,
    printedBy: model.printedBy,
  };
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    housing_exterior: 'ภาพถ่ายภายนอกบ้าน',
    housing_interior: 'ภาพถ่ายภายในบ้าน',
    family_photo: 'ภาพถ่ายครอบครัว',
    field_photo: 'ภาพถ่ายบ้านหรือที่อยู่อาศัย',
    id_card: 'สำเนาบัตรประจำตัวประชาชน',
  };
  return labels[category] || 'รูปภาพประกอบ';
}
