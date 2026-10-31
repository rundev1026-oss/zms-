export interface PendingRegistryFile {
  id: string;
  file: File;
  category: string;
  name: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBeneficiaryId(value: string | undefined | null): boolean {
  return UUID_PATTERN.test(String(value || ''));
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
): Promise<{ ok: boolean; document?: any; error?: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('documentType', documentType);
  if (replacesDocumentId) form.append('replacesDocumentId', replacesDocumentId);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
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
  return { ok: true, document: body.document };
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
