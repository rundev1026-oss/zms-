'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  ShieldCheck, 
  AlertCircle, 
  Plus, 
  CheckCircle2, 
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { BeneficiaryRegistryItem } from '@/types';
import { DocumentListTable } from '@/components/common/DocumentListTable';
import { DocumentUploader, UploadedDocumentItem } from '@/components/common/DocumentUploader';
import { uploadRegistryDocument } from '@/lib/registryDocuments';
import { useApp } from '@/context/AppContext';

interface DocumentsSectionProps {
  registry: BeneficiaryRegistryItem;
  canEdit: boolean;
  onRefreshRegistry?: () => void;
  onDocumentsUploaded?: (newDocs: UploadedDocumentItem[]) => void;
}

export function DocumentsSection({
  registry,
  canEdit,
  onRefreshRegistry,
  onDocumentsUploaded,
}: DocumentsSectionProps) {
  const { authToken } = useApp();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const documents = registry.documents || [];

  const filteredDocs = selectedCategoryFilter === 'all'
    ? documents
    : documents.filter((d) => d.category === selectedCategoryFilter);

  // Stats
  const idCardsCount = documents.filter((d) => d.category === 'id_card').length;
  const familyPhotosCount = documents.filter((d) => d.category === 'family_photo').length;
  const housePhotosCount = documents.filter((d) => d.category === 'housing_interior' || d.category === 'housing_exterior').length;
  const certDocsCount = documents.filter((d) => d.category === 'medical_cert' || d.category === 'land_doc' || d.category === 'house_reg').length;
  const financialDocsCount = documents.filter((d) => d.category === 'income_proof' || d.category === 'debt_doc').length;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                4. ส่วนเอกสารแนบและหลักฐาน ({documents.length} รายการ)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                PDPA Compliant
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เอกสารประกอบการขึ้นทะเบียน สำเนาบัตร ภาพถ่ายที่อยู่อาศัย เอกสารรับรอง และหลักฐานทางการเงิน
            </p>
          </div>
        </div>

        {/* Action Button: เพิ่มเอกสาร / จัดการเอกสาร */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsUploading(!isUploading)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0 self-start sm:self-auto"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isUploading ? 'ปิดหน้าต่างอัปโหลด' : 'เพิ่มเอกสาร / จัดการเอกสาร'}</span>
          </button>
        )}
      </div>

      {/* Category Pills Filter */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto text-xs touch-scroll">
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            selectedCategoryFilter === 'all'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          ทั้งหมด ({documents.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('id_card')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            selectedCategoryFilter === 'id_card'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          สำเนาบัตร ปชช ({idCardsCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('family_photo')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            selectedCategoryFilter === 'family_photo'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          ภาพถ่ายครอบครัว ({familyPhotosCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('housing_exterior')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            selectedCategoryFilter === 'housing_exterior'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          ภาพถ่ายบ้านพัก ({housePhotosCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('income_proof')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            selectedCategoryFilter === 'income_proof'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          รายได้/หนี้สิน ({financialDocsCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('medical_cert')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            selectedCategoryFilter === 'medical_cert'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          เอกสารรับรอง ({certDocsCount})
        </button>
      </div>

      {/* Uploader Box when activated */}
      {isUploading && (
        <div className="bg-slate-50 border border-indigo-200 rounded-2xl p-5 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-indigo-700" />
              <span>อัปโหลดเอกสารแนบใหม่ (รองรับ PDF, JPEG, PNG ไม่เกิน 10MB)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              ยกเลิก
            </button>
          </div>
          <DocumentUploader
            entityType="beneficiary"
            entityId={registry.id}
            onDocumentsChange={(uploadedDocs) => {
              if (onDocumentsUploaded) {
                onDocumentsUploaded(uploadedDocs);
              }
              if (onRefreshRegistry) {
                onRefreshRegistry();
              }
            }}
          />
        </div>
      )}

      {/* Documents List Table (Features real preview, real download, and missing file error alerts) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <DocumentListTable
          documents={filteredDocs}
          readOnly={!canEdit}
          onDelete={async (documentId) => {
            const headers: Record<string, string> = {};
            if (authToken) headers.Authorization = `Bearer ${authToken}`;
            const response = await fetch(`/api/documents/${documentId}`, {
              method: 'DELETE',
              headers,
              credentials: 'include',
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || !body.success) throw new Error(body.error || 'ลบเอกสารไม่สำเร็จ');
            onRefreshRegistry?.();
          }}
          onReplace={async (document, file) => {
            const result = await uploadRegistryDocument(
              registry.id,
              file,
              document.category,
              authToken,
              document.id,
            );
            if (!result.ok) throw new Error(result.error || 'เปลี่ยนเอกสารไม่สำเร็จ');
            onRefreshRegistry?.();
          }}
        />
      </div>

      {/* Security and Storage Note */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          เอกสารทุกฉบับเชื่อมโยงกับที่จัดเก็บจริงบนระบบความปลอดภัยสูง ตรวจสอบสิทธิ์ทุกครั้งก่อนเปิดดูหรือดาวน์โหลด
        </span>
      </div>
    </div>
  );
}
