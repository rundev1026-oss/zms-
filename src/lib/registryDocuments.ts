export interface PendingRegistryFile {
  id: string;
  file: File;
  category: string;
  name: string;
}

export interface DocumentChecklistCategoryMeta {
  key: string;
  label: string;
  shortLabel: string;
  required?: boolean;
}

export const DOCUMENT_CHECKLIST_CATEGORIES: DocumentChecklistCategoryMeta[] = [
  { key: 'id_card', label: 'สำเนาบัตรประจำตัวประชาชน', shortLabel: 'สำเนาบัตรประชาชน', required: true },
  { key: 'house_reg', label: 'สำเนาทะเบียนบ้าน', shortLabel: 'สำเนาทะเบียนบ้าน', required: true },
  { key: 'housing_exterior', label: 'รูปถ่ายสภาพบ้าน (ภายนอก)', shortLabel: 'รูปถ่ายสภาพบ้าน (ภายนอก)', required: true },
  { key: 'housing_interior', label: 'รูปถ่ายสภาพบ้าน (ภายใน)', shortLabel: 'รูปถ่ายสภาพบ้าน (ภายใน)' },
  { key: 'family_photo', label: 'รูปถ่ายครอบครัวผู้ขอรับความช่วยเหลือ', shortLabel: 'รูปถ่ายครอบครัว' },
  { key: 'income_proof', label: 'เอกสารรับรองรายได้ / สมุดบัญชี', shortLabel: 'เอกสารรายได้ / สมุดบัญชี' },
  { key: 'medical_cert', label: 'ใบรับรองแพทย์ / เอกสารความพิการ', shortLabel: 'ใบรับรองแพทย์ / ความพิการ' },
  { key: 'debt_doc', label: 'เอกสารภาระหนี้สิน / ใบแจ้งหนี้', shortLabel: 'เอกสารภาระหนี้สิน' },
  { key: 'land_doc', label: 'เอกสารสิทธิ์ที่ดิน / สัญญาเช่า', shortLabel: 'เอกสารสิทธิ์ที่ดิน / สัญญาเช่า' },
  { key: 'other_doc', label: 'เอกสารประกอบอื่น ๆ', shortLabel: 'เอกสารประกอบอื่น ๆ' },
];

export function normalizeDocumentCategory(rawCategory?: string | null): string {
  const key = String(rawCategory || '').trim().toLowerCase();
  switch (key) {
    case 'id_card':
    case 'national_id':
      return 'id_card';
    case 'house_reg':
    case 'house_registration':
      return 'house_reg';
    case 'housing_exterior':
    case 'house_photo':
    case 'housing_photo':
      return 'housing_exterior';
    case 'housing_interior':
      return 'housing_interior';
    case 'family_photo':
      return 'family_photo';
    case 'income_proof':
    case 'income_cert':
    case 'bank_book':
      return 'income_proof';
    case 'medical_cert':
      return 'medical_cert';
    case 'debt_doc':
    case 'debt_proof':
      return 'debt_doc';
    case 'land_doc':
      return 'land_doc';
    default:
      return 'other_doc';
  }
}

export interface DocumentChecklistItemStatus extends DocumentChecklistCategoryMeta {
  count: number;
  attached: boolean;
  statusText: string;
  files: any[];
}

export interface ComputedDocumentChecklistSummary {
  items: DocumentChecklistItemStatus[];
  countsByCategory: Record<string, number>;
  attachedCategoriesCount: number;
  unattachedCategoriesCount: number;
  totalCategoriesCount: number;
  totalFilesCount: number;
  checklist: {
    nationalIdCopy: boolean;
    houseRegistration: boolean;
    housePhoto: boolean;
    incomeCertificate: boolean;
    medicalCertificate: boolean;
    debtProof: boolean;
    otherDocuments: boolean;
    otherDocumentsDetails?: string;
  };
}

export function computeDocumentChecklist(
  documents: any[] | undefined | null,
  baseChecklist?: any,
): ComputedDocumentChecklistSummary {
  const validDocs = (Array.isArray(documents) ? documents : []).filter((doc) => {
    if (!doc) return false;
    const status = String(doc.status || '').toLowerCase();
    if (status === 'deleted' || status === 'cancelled' || status === 'superseded') return false;
    if (doc.fileExists === false || doc.fileAvailable === false) return false;
    return true;
  });

  const filesByCategory: Record<string, any[]> = {};
  const countsByCategory: Record<string, number> = {};
  for (const cat of DOCUMENT_CHECKLIST_CATEGORIES) {
    filesByCategory[cat.key] = [];
    countsByCategory[cat.key] = 0;
  }

  for (const doc of validDocs) {
    const norm = normalizeDocumentCategory(doc.category || doc.documentType);
    if (!filesByCategory[norm]) {
      filesByCategory[norm] = [];
      countsByCategory[norm] = 0;
    }
    filesByCategory[norm].push(doc);
    countsByCategory[norm] += 1;
  }

  const items: DocumentChecklistItemStatus[] = DOCUMENT_CHECKLIST_CATEGORIES.map((cat) => {
    const files = filesByCategory[cat.key] || [];
    const count = files.length;
    const attached = count > 0;
    return {
      ...cat,
      count,
      attached,
      statusText: attached ? 'แนบแล้ว' : 'ยังไม่แนบ',
      files,
    };
  });

  const attachedCategoriesCount = items.filter((item) => item.attached).length;
  const totalCategoriesCount = items.length;
  const unattachedCategoriesCount = totalCategoriesCount - attachedCategoriesCount;
  const totalFilesCount = validDocs.length;

  const otherFiles = [...(filesByCategory.land_doc || []), ...(filesByCategory.other_doc || [])];
  const otherNames = otherFiles
    .map((f) => f.name || f.fileName || f.originalFileName)
    .filter(Boolean)
    .join(', ');

  return {
    items,
    countsByCategory,
    attachedCategoriesCount,
    unattachedCategoriesCount,
    totalCategoriesCount,
    totalFilesCount,
    checklist: {
      nationalIdCopy: countsByCategory.id_card > 0,
      houseRegistration: countsByCategory.house_reg > 0,
      housePhoto:
        countsByCategory.housing_exterior +
          countsByCategory.housing_interior +
          countsByCategory.family_photo >
        0,
      incomeCertificate: countsByCategory.income_proof > 0,
      medicalCertificate: countsByCategory.medical_cert > 0,
      debtProof: countsByCategory.debt_doc > 0,
      otherDocuments: countsByCategory.land_doc + countsByCategory.other_doc > 0,
      otherDocumentsDetails: otherNames || baseChecklist?.otherDocumentsDetails || undefined,
    },
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBeneficiaryId(value: string | undefined | null): boolean {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === 'draft') return false;
  return UUID_PATTERN.test(trimmed) || trimmed.startsWith('ben-');
}

export function documentContentUrl(documentId: string, inline = false): string {
  return `/api/documents/${documentId}/content${inline ? '?inline=1' : ''}`;
}

export async function uploadRegistryDocument(
  beneficiaryId: string,
  file: File,
  documentType: string,
  token: string | null,
  replacesDocumentId?: string,
): Promise<{ ok: boolean; document?: any; checklistSummary?: ComputedDocumentChecklistSummary; error?: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('documentType', documentType);
  if (replacesDocumentId) form.append('replacesDocumentId', replacesDocumentId);
  const headers: Record<string, string> = {};
  if (token && token !== 'cookie-session' && token !== 'null' && token !== 'undefined') {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`/api/registry/${beneficiaryId}/documents`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    return { ok: false, error: body.error || 'อัปโหลดเอกสารไม่สำเร็จ' };
  }
  return { ok: true, document: body.document, checklistSummary: body.checklistSummary };
}

export async function uploadPendingRegistryDocuments(
  beneficiaryId: string,
  files: PendingRegistryFile[],
  token: string | null,
): Promise<{ uploaded: number; failed: string[] }> {
  const failed: string[] = [];
  let uploaded = 0;
  for (const item of files) {
    const result = await uploadRegistryDocument(beneficiaryId, item.file, item.category, token);
    if (result.ok) uploaded += 1;
    else failed.push(item.name);
  }
  return { uploaded, failed };
}
