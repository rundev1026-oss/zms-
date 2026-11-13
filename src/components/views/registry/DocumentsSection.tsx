'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  UploadCloud,
  ShieldCheck,
  CheckCircle2,
  Circle,
  FolderCheck,
} from 'lucide-react';
import { BeneficiaryRegistryItem } from '@/types';
import { DocumentListTable } from '@/components/common/DocumentListTable';
import { DocumentUploader, UploadedDocumentItem } from '@/components/common/DocumentUploader';
import {
  uploadRegistryDocument,
  computeDocumentChecklist,
  normalizeDocumentCategory,
} from '@/lib/registryDocuments';
import { useApp } from '@/context/AppContext';

interface DocumentsSectionProps {
  registry: BeneficiaryRegistryItem;
  canEdit: boolean;
  onRefreshRegistry?: () => void | Promise<void>;
  onDocumentsUploaded?: (newDocs: UploadedDocumentItem[]) => void;
}

export function DocumentsSection({
  registry,
  canEdit,
  onRefreshRegistry,
  onDocumentsUploaded,
}: DocumentsSectionProps) {
  const { authToken, refreshData, showToast } = useApp();
  const [isUploading, setIsUploading] = useState<boolean>(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const documents = registry.documents || [];

  const checklistSummary = useMemo(
    () => computeDocumentChecklist(documents, registry.documentChecklist),
    [documents, registry.documentChecklist],
  );

  const filteredDocs = useMemo(() => {
    if (selectedCategoryFilter === 'all') return documents;
    return documents.filter(
      (d) => normalizeDocumentCategory(d.category) === selectedCategoryFilter,
    );
  }, [documents, selectedCategoryFilter]);

  const idCardsCount = checklistSummary.countsByCategory.id_card || 0;
  const houseRegCount = checklistSummary.countsByCategory.house_reg || 0;
  const familyPhotosCount = checklistSummary.countsByCategory.family_photo || 0;
  const housePhotosCount =
    (checklistSummary.countsByCategory.housing_exterior || 0) +
    (checklistSummary.countsByCategory.housing_interior || 0);
  const certDocsCount =
    (checklistSummary.countsByCategory.medical_cert || 0) +
    (checklistSummary.countsByCategory.land_doc || 0);
  const financialDocsCount =
    (checklistSummary.countsByCategory.income_proof || 0) +
    (checklistSummary.countsByCategory.debt_doc || 0);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                ส่วนเอกสารแนบและหลักฐาน ({checklistSummary.totalFilesCount} ไฟล์)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                PDPA Compliant
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Auto-Checklist ทำงานอัตโนมัติ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบตรวจสอบและติ๊ก ✓ หมวดเอกสารอัตโนมัติตามไฟล์แนบที่มีอยู่จริงในฐานข้อมูลและพื้นที่จัดเก็บไฟล์
            </p>
          </div>
        </div>

        {/* Action Button: เพิ่มเอกสาร / จัดการเอกสาร */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsUploading(!isUploading)}
            className="zms-action inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0 self-start sm:self-auto"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isUploading ? 'ซ่อนกล่องอัปโหลด' : 'เพิ่มเอกสารแนบใหม่'}</span>
          </button>
        )}
      </div>

      {/* Auto Document Checklist & Completeness Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <FolderCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                รายการตรวจสอบเอกสารแนบอัตโนมัติ (Auto Document Checklist)
              </h4>
              <p className="text-[11px] text-slate-500">
                ไม่ต้องติ๊กเอง — เมื่ออัปโหลดหรือลบไฟล์ ระบบจะคำนวณสถานะและจำนวนไฟล์ให้ทันที
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              เอกสารที่แนบแล้ว {checklistSummary.attachedCategoriesCount} รายการ
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold">
              <Circle className="w-3.5 h-3.5 text-slate-400" />
              เอกสารที่ยังไม่แนบ {checklistSummary.unattachedCategoriesCount} รายการ
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 font-extrabold">
              ความครบถ้วนของเอกสาร {checklistSummary.attachedCategoriesCount}/{checklistSummary.totalCategoriesCount}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {checklistSummary.items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setSelectedCategoryFilter((prev) => (prev === item.key ? 'all' : item.key))
              }
              className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-left transition-all ${
                item.attached
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 hover:bg-emerald-50'
                  : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100/70'
              } ${selectedCategoryFilter === item.key ? 'ring-2 ring-indigo-600' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.attached ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                    ✓
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0">
                    ○
                  </span>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {item.attached ? '✓' : '○'} {item.shortLabel} ({item.count} ไฟล์)
                  </div>
                  <div className="text-[10px] opacity-80">
                    {item.attached ? `แนบแล้ว (${item.count} ไฟล์)` : 'ยังไม่แนบ (0 ไฟล์)'}
                    {item.required ? ' • เอกสารสำคัญ' : ''}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  item.attached
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {item.count} ไฟล์
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100/80 p-1.5 text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('all')}
          className={`min-h-10 px-3 rounded-xl font-bold transition-colors ${
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
          className={`min-h-10 px-3 rounded-xl font-bold transition-colors ${
            selectedCategoryFilter === 'id_card'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          สำเนาบัตร ปชช ({idCardsCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('house_reg')}
          className={`min-h-10 px-3 rounded-xl font-bold transition-colors ${
            selectedCategoryFilter === 'house_reg'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          ทะเบียนบ้าน ({houseRegCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('housing_exterior')}
          className={`min-h-10 px-3 rounded-xl font-bold transition-colors ${
            selectedCategoryFilter === 'housing_exterior'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          ภาพถ่ายบ้านพัก ({housePhotosCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('family_photo')}
          className={`min-h-10 px-3 rounded-xl font-bold transition-colors ${
            selectedCategoryFilter === 'family_photo'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          ภาพถ่ายครอบครัว ({familyPhotosCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('income_proof')}
          className={`min-h-10 px-3 rounded-xl font-bold transition-colors ${
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
          className={`min-h-10 px-3 rounded-xl font-bold transition-colors ${
            selectedCategoryFilter === 'medical_cert'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          เอกสารรับรอง ({certDocsCount})
        </button>
      </div>

      {/* Uploader Box when activated */}
      {canEdit && isUploading && (
        <div className="bg-slate-50 border border-indigo-200 rounded-2xl p-5 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-indigo-700" />
              <span>อัปโหลดเอกสารแนบใหม่ (รองรับ PDF, JPG, PNG, WEBP ขนาดไม่เกิน 25MB)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              ซ่อนกล่องอัปโหลด
            </button>
          </div>
          <DocumentUploader
            entityType="beneficiary"
            entityId={registry.id}
            onDocumentsChange={async (uploadedDocs) => {
              if (onDocumentsUploaded) {
                onDocumentsUploaded(uploadedDocs);
              }
              await onRefreshRegistry?.();
              await refreshData();
              showToast('อัปโหลดเอกสารแนบและอัปเดตสถานะ Checklist เรียบร้อยแล้ว', 'success');
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
            if (authToken && authToken !== 'cookie-session') {
              headers.Authorization = `Bearer ${authToken}`;
            }
            const response = await fetch(`/api/documents/${documentId}`, {
              method: 'DELETE',
              headers,
              credentials: 'include',
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || !body.success) throw new Error(body.error || 'ลบเอกสารไม่สำเร็จ');
            await onRefreshRegistry?.();
            await refreshData();
            showToast('ลบเอกสารและอัปเดตสถานะ Checklist เรียบร้อยแล้ว', 'info');
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
            await onRefreshRegistry?.();
            await refreshData();
            showToast('เปลี่ยนไฟล์เอกสารเรียบร้อยแล้ว', 'success');
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
