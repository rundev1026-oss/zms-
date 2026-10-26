'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Download,
  Trash2,
  Lock,
  Cloud,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { BeneficiaryDocument } from '@/types';
import { DocumentPreviewModal } from './DocumentPreviewModal';

export interface UploadedDocumentItem {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  storageProvider: 's3' | 'cloudinary' | 'local';
  storagePath?: string;
  uploadDate: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface DocumentUploaderProps {
  entityType: 'beneficiary' | 'assistance_request';
  entityId?: string;
  existingDocuments?: UploadedDocumentItem[];
  onDocumentsChange?: (docs: UploadedDocumentItem[]) => void;
  readOnly?: boolean;
  requiredCategories?: string[];
  maxFiles?: number;
}

const DOCUMENT_CATEGORIES = [
  { value: 'id_card', label: 'สำเนาบัตรประจำตัวประชาชน' },
  { value: 'house_reg', label: 'สำเนาทะเบียนบ้าน' },
  { value: 'income_proof', label: 'หนังสือรับรองรายได้ / เงินเดือน' },
  { value: 'medical_cert', label: 'ใบรับรองแพทย์ / ประวัติการรักษา' },
  { value: 'debt_doc', label: 'สัญญากู้ยืม / หนังสือทวงถามหนี้' },
  { value: 'housing_exterior', label: 'ภาพถ่ายสภาพบ้านภายนอก' },
  { value: 'housing_interior', label: 'ภาพถ่ายสภาพบ้านภายใน' },
  { value: 'family_photo', label: 'ภาพถ่ายครอบครัวและสมาชิก' },
  { value: 'land_doc', label: 'เอกสารสิทธิ์ที่ดิน / สัญญาเช่า' },
  { value: 'other_doc', label: 'เอกสารหลักฐานอื่นๆ' },
];

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  entityType,
  entityId = 'draft',
  existingDocuments = [],
  onDocumentsChange,
  readOnly = false,
  requiredCategories = [],
  maxFiles = 10,
}) => {
  const [documents, setDocuments] = useState<UploadedDocumentItem[]>(existingDocuments);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    requiredCategories.length > 0 ? requiredCategories[0] : 'id_card'
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    { name: string; progress: number; error?: string }[]
  >([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<BeneficiaryDocument | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setGeneralError(null);

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 25 * 1024 * 1024; // 25 MB

    const filesToUpload: File[] = Array.from(fileList);

    for (const file of filesToUpload) {
      if (!allowedTypes.includes(file.type)) {
        setGeneralError(`ไฟล์ "${file.name}" ไม่ได้รับอนุญาต รองรับเฉพาะ PDF และไฟล์รูปภาพ`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setGeneralError(`ไฟล์ "${file.name}" มีขนาดเกิน 25 MB`);
        return;
      }
    }

    for (const file of filesToUpload) {
      const uploadItem = { name: file.name, progress: 10 };
      setUploadingFiles((prev) => [...prev, uploadItem]);

      try {
        // Step 1: Request Presigned URL or Upload Endpoint
        const presignRes = await fetch('/api/storage/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            category: selectedCategory,
            entityType,
            entityId,
          }),
        });

        const presignData = await presignRes.json();
        if (!presignRes.ok || !presignData.success) {
          throw new Error(presignData.error || 'ไม่สามารถเตรียมการอัปโหลดไฟล์ได้');
        }

        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.name === file.name ? { ...item, progress: 30 } : item
          )
        );

        let finalFileUrl = presignData.downloadUrl;
        let finalStoragePath = presignData.fileKey;
        const provider = presignData.provider;

        // Step 2: Upload based on provider
        if (provider === 's3') {
          // Direct S3 Presigned PUT
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', presignData.uploadUrl, true);
            if (presignData.headers) {
              Object.entries(presignData.headers).forEach(([k, v]) => {
                xhr.setRequestHeader(k, v as string);
              });
            }
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percent = Math.round(30 + (e.loaded / e.total) * 50);
                setUploadingFiles((prev) =>
                  prev.map((item) =>
                    item.name === file.name ? { ...item, progress: percent } : item
                  )
                );
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`S3 upload failed with status ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ S3'));
            xhr.send(file);
          });
        } else if (provider === 'cloudinary') {
          // Cloudinary Direct Upload
          const formData = new FormData();
          formData.append('file', file);
          if (presignData.fields) {
            Object.entries(presignData.fields).forEach(([k, v]) => {
              formData.append(k, v as string);
            });
          }
          const cRes = await fetch(presignData.uploadUrl, {
            method: 'POST',
            body: formData,
          });
          const cData = await cRes.json();
          if (!cRes.ok) throw new Error(cData.error?.message || 'Cloudinary upload failed');
          finalFileUrl = cData.secure_url || cData.url;
          finalStoragePath = cData.public_id;
        } else {
          // Local Storage Engine via /api/storage/upload
          const formData = new FormData();
          formData.append('file', file);
          formData.append('category', selectedCategory);
          formData.append('entityType', entityType);
          formData.append('entityId', entityId);

          const localRes = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
          });
          const localData = await localRes.json();
          if (!localRes.ok || !localData.success) {
            throw new Error(localData.error || 'Local storage upload failed');
          }
          finalFileUrl = localData.fileUrl;
          finalStoragePath = localData.storagePath;
        }

        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.name === file.name ? { ...item, progress: 90 } : item
          )
        );

        // Step 3: Register document in SQLite DB
        const regRes = await fetch('/api/storage/register-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            category: selectedCategory,
            fileUrl: finalFileUrl,
            storageProvider: provider,
            storagePath: finalStoragePath,
            fileSize: file.size,
            mimeType: file.type,
            entityType,
            entityId,
          }),
        });

        const regData = await regRes.json();
        const docRecord = regData.document;

        const categoryObj = DOCUMENT_CATEGORIES.find((c) => c.value === selectedCategory);
        const newDoc: UploadedDocumentItem = {
          id: docRecord?.id || `doc-${Date.now()}`,
          name: file.name,
          category: selectedCategory,
          categoryLabel: categoryObj?.label || selectedCategory,
          fileUrl: finalFileUrl,
          fileSize: file.size,
          mimeType: file.type,
          storageProvider: provider,
          storagePath: finalStoragePath,
          uploadDate: new Date().toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          status: 'pending',
        };

        const updatedDocs = [...documents, newDoc];
        setDocuments(updatedDocs);
        if (onDocumentsChange) {
          onDocumentsChange(updatedDocs);
        }

        // Remove from uploading
        setUploadingFiles((prev) => prev.filter((item) => item.name !== file.name));
      } catch (err: any) {
        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.name === file.name ? { ...item, error: err.message || 'อัปโหลดไม่สำเร็จ' } : item
          )
        );
      }
    }
  };

  const handleRemoveDocument = (id: string) => {
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    if (onDocumentsChange) {
      onDocumentsChange(updated);
    }
  };

  const toBeneficiaryDoc = (d: UploadedDocumentItem): BeneficiaryDocument => {
    return {
      id: d.id,
      name: d.name,
      fileUrl: d.fileUrl,
      uploadDate: d.uploadDate || new Date().toISOString(),
      category: d.category as any,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      storageProvider: d.storageProvider,
      storagePath: d.storagePath,
      uploadedByName: 'ผู้ใช้งานระบบ',
      fileExists: true,
      status: d.status || 'pending',
    };
  };

  const handleDownload = async (doc: UploadedDocumentItem) => {
    setDownloadingId(doc.id);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null;
      const downloadEndpoint = `/api/storage/file/${doc.id}?download=true${token ? `&token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(downloadEndpoint);
      if (!res.ok) {
        if (doc.fileUrl) {
          window.open(doc.fileUrl, '_blank');
          return;
        }
        throw new Error('ไม่สามารถดาวน์โหลดไฟล์ได้');
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      if (doc.fileUrl) {
        window.open(doc.fileUrl, '_blank');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category selector & Drag Drop box (only if not readonly) */}
      {!readOnly && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมวดหมู่เอกสารที่ต้องการแนบ
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>ความปลอดภัยสูงสุด (Direct S3 / Encryption)</span>
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  รองรับเอกสาร PDF ความละเอียดสูง และรูปภาพ (PNG, JPG, WEBP) สูงสุด 25 MB ต่อไฟล์
                </p>
              </div>
            </div>
          </div>

          {generalError && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{generalError}</span>
            </div>
          )}
        </div>
      )}

      {/* Uploading progress bars */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-sm flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 truncate max-w-xs">{item.name}</span>
                <span className="text-slate-500">
                  {item.error ? (
                    <span className="text-rose-600 font-medium">ล้มเหลว: {item.error}</span>
                  ) : (
                    <span>{item.progress}%</span>
                  )}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    item.error ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attached Documents List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>เอกสารแนบในระบบ ({documents.length} รายการ)</span>
          {documents.length > 0 && (
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกและสำรองข้อมูลแล้ว
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
            ยังไม่มีเอกสารแนบในรายการนี้
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {documents.map((doc) => {
              const isPdf = doc.mimeType?.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
              const categoryLabel =
                DOCUMENT_CATEGORIES.find((c) => c.value === doc.category)?.label || doc.category;

              return (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3 shadow-sm hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate block">
                          {doc.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {categoryLabel}
                        </span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-[10px]">
                        {doc.storageProvider === 's3' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                            <Cloud className="w-2.5 h-2.5" /> S3 Cloud
                          </span>
                        )}
                        {doc.storageProvider === 'cloudinary' && (
                          <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                            <Cloud className="w-2.5 h-2.5" /> Cloudinary
                          </span>
                        )}
                        {(!doc.storageProvider || doc.storageProvider === 'local') && (
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                            <HardDrive className="w-2.5 h-2.5" /> Local Secure
                          </span>
                        )}
                        <span className="text-slate-400">• {doc.uploadDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(toBeneficiaryDoc(doc))}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="เปิดดูเอกสาร"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="ดาวน์โหลดเอกสาร"
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบเอกสาร"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Real In-System Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
};
