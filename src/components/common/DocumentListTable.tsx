'use client';

import React, { useRef, useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  FileQuestion,
  Eye,
  Download,
  Info,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check,
  XCircle,
  HardDrive,
  Cloud,
  Loader2,
  X,
} from 'lucide-react';
import { BeneficiaryDocument } from '@/types';
import { useApp } from '@/context/AppContext';
import { ModalPortal } from './Modal';
import { DocumentPreviewModal } from './DocumentPreviewModal';

export interface DocumentListTableProps {
  documents: BeneficiaryDocument[];
  title?: string;
  readOnly?: boolean;
  onDelete?: (docId: string) => Promise<void> | void;
  onReplace?: (doc: BeneficiaryDocument, file: File) => Promise<void> | void;
  onVerify?: (docId: string, status: 'verified' | 'rejected') => Promise<void> | void;
  showVerificationControls?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  id_card: 'สำเนาบัตรประจำตัวประชาชน',
  house_reg: 'สำเนาทะเบียนบ้าน',
  income_proof: 'หนังสือรับรองรายได้ / เงินเดือน',
  medical_cert: 'ใบรับรองแพทย์ / ประวัติการรักษา',
  debt_doc: 'สัญญากู้ยืม / หนังสือทวงหนี้',
  housing_exterior: 'ภาพถ่ายสภาพบ้านภายนอก',
  housing_interior: 'ภาพถ่ายสภาพบ้านภายใน',
  family_photo: 'ภาพถ่ายครอบครัวและสมาชิก',
  field_photo: 'ภาพถ่ายการลงพื้นที่จริง',
  land_doc: 'เอกสารสิทธิ์ที่ดิน / สัญญาเช่า',
  other_doc: 'เอกสารหลักฐานอื่นๆ',
};

export const DocumentListTable: React.FC<DocumentListTableProps> = ({
  documents = [],
  title,
  readOnly = false,
  onDelete,
  onReplace,
  onVerify,
  showVerificationControls = false,
}) => {
  const { authToken, currentUser, showToast } = useApp();

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<BeneficiaryDocument | null>(null);
  const [detailsDoc, setDetailsDoc] = useState<BeneficiaryDocument | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<BeneficiaryDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<BeneficiaryDocument | null>(null);

  const authHeaders = (): Record<string, string> => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isPrivateDocument = (doc: BeneficiaryDocument) => Boolean(doc.fileUrl?.startsWith('/api/documents/'));

  const formatSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return 'ไม่ระบุขนาด';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileCategoryLabel = (category: string): string => {
    return CATEGORY_LABELS[category] || category || 'เอกสารทั่วไป';
  };

  const getFileIcon = (name: string, mime?: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (mime?.includes('pdf') || ext === 'pdf') {
      return (
        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    if (mime?.includes('image') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return (
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ImageIcon className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
        <FileQuestion className="w-4 h-4" />
      </div>
    );
  };

  const getFileTypeBadge = (name: string, mime?: string) => {
    const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
    if (mime?.includes('pdf') || ext === 'PDF') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
          PDF
        </span>
      );
    }
    if (mime?.includes('image') || ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(ext)) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
          {ext === 'JPEG' ? 'JPG' : ext}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
        {ext}
      </span>
    );
  };

  const handleDownloadFile = async (doc: BeneficiaryDocument) => {
    try {
      setDownloadingId(doc.id);
      const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
      const params = new URLSearchParams();
      params.set('action', 'download');
      if (token) params.set('token', token);
      if (currentUser?.id) params.set('actorId', currentUser.id);
      if (currentUser?.role) params.set('actorRole', currentUser.role);
      if (currentUser?.name) params.set('actorName', currentUser.name);

      const downloadUrl = isPrivateDocument(doc)
        ? `/api/documents/${doc.id}/content`
        : `/api/storage/file/${doc.id}?${params.toString()}`;
      const res = await fetch(downloadUrl, {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || 'ดาวน์โหลดเอกสารไม่สำเร็จ');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.name || `document-${doc.id}`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast(`ดาวน์โหลดเอกสาร "${doc.name}" เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการดาวน์โหลดเอกสาร', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingDoc) return;
    try {
      setIsDeleting(true);
      if (onDelete) {
        await onDelete(deletingDoc.id);
      } else {
        // Direct API call
        const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const deleteUrl = isPrivateDocument(deletingDoc)
          ? `/api/documents/${deletingDoc.id}`
          : `/api/storage/file/${deletingDoc.id}`;
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          headers,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถลบเอกสารได้');
        }
      }
      showToast(`ลบเอกสาร "${deletingDoc.name}" สำเร็จ`, 'success');
      setDeletingDoc(null);
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการลบเอกสาร', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReplaceFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const target = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (!file || !target || !onReplace) return;
    try {
      await onReplace(target, file);
      showToast(`เปลี่ยนเอกสาร "${target.name}" เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      showToast(err.message || 'เปลี่ยนเอกสารไม่สำเร็จ', 'error');
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={handleReplaceFile}
      />
      {/* Optional Title Header */}
      {title && (
        <div className="flex items-center justify-between pb-1">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>{title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {documents.length} รายการ
            </span>
          </h4>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400 space-y-1">
          <FileQuestion className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-600">ยังไม่มีเอกสารแนบ</p>
          <p className="text-[11px] text-slate-400">เมื่อแนบไฟล์และบันทึกสำเร็จ เอกสารจะแสดงในรายการนี้</p>
        </div>
      ) : (
        <>
          {/* ========================================================
              DESKTOP VIEW: Table format
             ======================================================== */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ชื่อเอกสาร</th>
                  <th className="py-3 px-3">หมวดหมู่</th>
                  <th className="py-3 px-2 text-center">ประเภท</th>
                  <th className="py-3 px-3 text-right">ขนาดไฟล์</th>
                  <th className="py-3 px-3">วันที่อัปโหลด</th>
                  <th className="py-3 px-3">ผู้อัปโหลด / สถานะ</th>
                  <th className="py-3 px-4 text-center">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const isLegacyMissing = doc.fileExists === false;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* File Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          {getFileIcon(doc.name, doc.mimeType)}
                          <div className="min-w-0 max-w-xs">
                            <span className="truncate block font-semibold text-slate-900" title={doc.name}>
                              {doc.name}
                            </span>
                            {isLegacyMissing && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> ไม่พบไฟล์ต้นฉบับ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {getFileCategoryLabel(doc.category)}
                        </span>
                      </td>

                      {/* File Type Badge */}
                      <td className="py-3.5 px-2 text-center">
                        {getFileTypeBadge(doc.name, doc.mimeType)}
                      </td>

                      {/* File Size */}
                      <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                        {formatSize(doc.fileSize)}
                      </td>

                      {/* Upload Date */}
                      <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {doc.uploadDate || '-'}
                        </span>
                      </td>

                      {/* Uploader / Verification Status */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          {doc.uploadedByName ? (
                            <span className="text-[11px] font-medium text-slate-700 block">
                              {doc.uploadedByName}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">ผู้ยื่นคำร้อง</span>
                          )}

                          <div>
                            {doc.status === 'verified' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" /> พร้อมใช้งาน
                              </span>
                            ) : doc.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                                <XCircle className="w-2.5 h-2.5" /> ไม่ผ่าน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                รอตรวจสอบ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            disabled={isLegacyMissing}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs transition-colors disabled:opacity-40"
                            title={isLegacyMissing ? 'ไม่พบไฟล์ต้นฉบับ' : 'เปิดดูเอกสาร'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>เปิดดู</span>
                          </button>

                          {/* Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(doc)}
                            disabled={downloadingId === doc.id || isLegacyMissing}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                              isLegacyMissing
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title={isLegacyMissing ? 'ไม่พบไฟล์ต้นฉบับ' : 'ดาวน์โหลดไฟล์'}
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>ดาวน์โหลด</span>
                          </button>

                          {!readOnly && onReplace && (
                            <button
                              type="button"
                              onClick={() => {
                                replaceTargetRef.current = doc;
                                replaceInputRef.current?.click();
                              }}
                              disabled={isLegacyMissing}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition-colors disabled:opacity-40"
                              title="เปลี่ยนเอกสาร"
                            >
                              <span>เปลี่ยน</span>
                            </button>
                          )}

                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => setDetailsDoc(doc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="ดูรายละเอียดข้อมูลไฟล์"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => setDeletingDoc(doc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="ลบเอกสาร"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Officer Verification Quick Buttons */}
                          {showVerificationControls && onVerify && (
                            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-200">
                              <button
                                type="button"
                                onClick={() => onVerify(doc.id, 'verified')}
                                className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                                title="อนุมัติเอกสารนี้"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onVerify(doc.id, 'rejected')}
                                className="p-1.5 rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors"
                                title="ปฏิเสธเอกสารนี้"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ========================================================
              MOBILE VIEW: Card format (iPhone 15 & touch screens)
             ======================================================== */}
          <div className="md:hidden space-y-3">
            {documents.map((doc) => {
              const isLegacyMissing = doc.fileExists === false;

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {getFileIcon(doc.name, doc.mimeType)}
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-slate-900 block truncate">
                          {doc.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {getFileCategoryLabel(doc.category)}
                          </span>
                          {getFileTypeBadge(doc.name, doc.mimeType)}
                          <span className="text-slate-400 font-mono">
                            • {formatSize(doc.fileSize)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {doc.status === 'verified' ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ผ่าน
                        </span>
                      ) : doc.status === 'rejected' ? (
                        <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                          ไม่ผ่าน
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          รอตรวจ
                        </span>
                      )}
                    </div>
                  </div>

                  {isLegacyMissing && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>บันทึกจำลองเดิม ไม่มีไฟล์จริงบนเซิร์ฟเวอร์</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                    <span>อัปโหลด: {doc.uploadDate || '-'}</span>
                    <span>{doc.uploadedByName ? `โดย: ${doc.uploadedByName}` : ''}</span>
                  </div>

                  {/* Mobile Action Buttons (Full width touch-friendly) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 active:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-200"
                    >
                      <Eye className="w-4 h-4" />
                      <span>เปิดดูเอกสาร</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadFile(doc)}
                      disabled={downloadingId === doc.id || isLegacyMissing}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border ${
                        isLegacyMissing
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-200'
                      }`}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>ดาวน์โหลด</span>
                    </button>
                  </div>

                  {/* Secondary mobile actions */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setDetailsDoc(doc)}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>ดูรายละเอียดเชิงลึก</span>
                    </button>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setDeletingDoc(doc)}
                        className="text-rose-600 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบเอกสาร</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ========================================================
          DOCUMENT PREVIEW MODAL
         ======================================================== */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
      />

      {/* ========================================================
          DOCUMENT DETAILS MODAL
         ======================================================== */}
      {detailsDoc && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDetailsDoc(null);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden"
            >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span>รายละเอียดข้อมูลเอกสารและหลักฐาน</span>
              </h3>
              <button
                type="button"
                onClick={() => setDetailsDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 block text-[10px]">ชื่อไฟล์ต้นฉบับ</span>
                <span className="font-bold text-slate-900 block break-all text-sm">
                  {detailsDoc.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">หมวดหมู่เอกสาร</span>
                  <span className="font-semibold text-slate-800">
                    {getFileCategoryLabel(detailsDoc.category)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">ขนาดไฟล์</span>
                  <span className="font-semibold text-slate-800">
                    {formatSize(detailsDoc.fileSize)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">MIME Type</span>
                  <span className="font-mono text-slate-700">
                    {detailsDoc.mimeType || 'application/octet-stream'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">ระบบจัดเก็บ (Engine)</span>
                  <span className="font-semibold text-emerald-700 uppercase flex items-center gap-1">
                    {detailsDoc.storageProvider === 's3' ? (
                      <Cloud className="w-3.5 h-3.5" />
                    ) : (
                      <HardDrive className="w-3.5 h-3.5" />
                    )}
                    {detailsDoc.storageProvider || 'LOCAL'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 block text-[10px]">ความสมบูรณ์ของไฟล์ (SHA-256 Checksum)</span>
                <span className="font-mono text-slate-600 block break-all text-[11px]">
                  {detailsDoc.checksum || 'ไม่มีข้อมูล Checksum (บันทึกเดิม)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <span className="font-semibold block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" /> การคุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  เอกสารนี้ถูกจัดเก็บในระดับความลับเฉพาะ (Confidential) การเปิดดูหรือดาวน์โหลดจะถูกบันทึกลงใน Audit Trail เสมอ
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDetailsDoc(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* ========================================================
          CONFIRM DELETE MODAL
         ======================================================== */}
      {deletingDoc && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) setDeletingDoc(null);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-slate-900 text-base">
                ยืนยันการลบเอกสารแนบ?
              </h3>
              <p className="text-xs text-slate-500">
                คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร{' '}
                <span className="font-bold text-slate-800">"{deletingDoc.name}"</span>{' '}
                ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                disabled={isDeleting}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>ยืนยันลบเอกสาร</span>
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}
    </div>
  );
};
