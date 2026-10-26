'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  AlertCircle,
  FileQuestion,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { BeneficiaryDocument } from '@/types';
import { useApp } from '@/context/AppContext';
import { ModalPortal } from '@/components/common/Modal';

interface DocumentPreviewModalProps {
  document: BeneficiaryDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  const { authToken, currentUser, showToast } = useApp();

  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
    }
  }, [isOpen, doc]);

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const fileName = doc.name || 'เอกสาร';
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  const isPdf = doc.mimeType?.includes('pdf') || fileExt === 'pdf';
  const isImage =
    doc.mimeType?.includes('image') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(fileExt);

  // Format file size
  const formatSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return 'ไม่ระบุขนาด';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Secure URL generator
  const getFileEndpoint = (action: 'preview' | 'download'): string => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
    const params = new URLSearchParams();
    params.set('action', action);
    if (token) params.set('token', token);
    if (currentUser?.id) params.set('actorId', currentUser.id);
    if (currentUser?.role) params.set('actorRole', currentUser.role);
    if (currentUser?.name) params.set('actorName', currentUser.name);
    return `/api/storage/file/${doc.id}?${params.toString()}`;
  };

  const previewUrl = getFileEndpoint('preview');
  const downloadUrl = getFileEndpoint('download');

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || 'ดาวน์โหลดเอกสารไม่สำเร็จ');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.name || `document-${doc.id}.${fileExt || 'pdf'}`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast(`ดาวน์โหลดเอกสาร "${doc.name}" สำเร็จ`, 'success');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const isLegacyMissing = doc.fileExists === false;

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-[1020] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`bg-white shadow-2xl border border-slate-200 flex flex-col w-full transition-all duration-200 overflow-hidden ${
            isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-5xl h-[92vh] max-h-[calc(100dvh-24px)] rounded-2xl'
          }`}
        >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isPdf
                  ? 'bg-rose-500/20 text-rose-400'
                  : isImage
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isPdf ? (
                <FileText className="w-5 h-5" />
              ) : isImage ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <FileQuestion className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-100 truncate block">
                {doc.name}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                  {doc.category || 'เอกสารทั่วไป'}
                </span>
                <span>• {formatSize(doc.fileSize)}</span>
                <span>• {doc.uploadDate || 'วันที่อัปโหลดไม่ระบุ'}</span>
                {doc.uploadedByName && <span>• อัปโหลดโดย: {doc.uploadedByName}</span>}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Zoom / Rotate Controls (only if image/pdf & file exists) */}
            {!isLegacyMissing && !hasError && (isImage || isPdf) && (
              <div className="hidden sm:flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/60 mr-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="ซูมออก (-)"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="รีเซ็ตขนาด (100%)"
                  className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-white"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="ซูมเข้า (+)"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  title="หมุน 90 องศา"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors ml-1"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Download Button */}
            {!isLegacyMissing && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-colors"
                title="ดาวน์โหลดไฟล์เก็บไว้ในเครื่อง"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden md:block"
              title={isFullscreen ? 'ย่อหน้าต่าง' : 'ขยายเต็มจอ'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-100 overflow-auto relative flex items-center justify-center p-2 sm:p-4">
          {/* Case 1: Legacy Missing Document */}
          {isLegacyMissing ? (
            <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-amber-200 shadow-md text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  ไม่พบไฟล์ต้นฉบับบนเซิร์ฟเวอร์
                </h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  เอกสารนี้เป็นบันทึกเก่าจากระบบจำลองเดิม (พาธ <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{doc.fileUrl}</code>) ซึ่งไม่ได้อัปโหลดไฟล์ต้นฉบับจริงไว้ในพื้นที่จัดเก็บ
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" /> คำแนะนำสำหรับเจ้าหน้าที่:
                </div>
                <p className="text-[11px] text-amber-800">
                  กรุณาขอให้ผู้ขอรับความช่วยเหลือหรือเจ้าหน้าที่ประจำสาขาอัปโหลดเอกสารฉบับจริงเข้ามาใหม่ผ่านระบบอัปโหลดเอกสาร
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          ) : hasError ? (
            /* Case 2: Error Loading File */
            <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-rose-200 shadow-md text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 mx-auto flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  ไม่สามารถเปิดดูเอกสารได้
                </h4>
                <p className="text-xs text-rose-600 mt-2">
                  {errorMessage || 'เกิดข้อผิดพลาดในการโหลดไฟล์ หรือท่านไม่มีสิทธิ์ในการเข้าถึงเอกสารนี้'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>ลองดาวน์โหลดแทน</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                >
                  ปิด
                </button>
              </div>
            </div>
          ) : isPdf ? (
            /* Case 3: PDF Document Viewer */
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    <span className="text-xs font-medium text-slate-600">กำลังโหลดเอกสาร PDF...</span>
                  </div>
                </div>
              )}
              <div
                className="w-full h-full transition-transform duration-200 origin-center"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                }}
              >
                <iframe
                  src={`${previewUrl}#toolbar=1&navpanes=0`}
                  title={fileName}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                    setErrorMessage('เบราว์เซอร์ไม่สามารถแสดงตัวอย่าง PDF ได้โดยตรง');
                  }}
                  className="w-full h-full rounded-2xl border border-slate-300 bg-white shadow-md"
                />
              </div>
            </div>
          ) : isImage ? (
            /* Case 4: High-Res Image Viewer */
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4 relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    <span className="text-xs font-medium text-slate-600">กำลังโหลดรูปภาพ...</span>
                  </div>
                </div>
              )}
              <div
                className="transition-transform duration-200 origin-center max-w-full max-h-full flex items-center justify-center"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={fileName}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                    setErrorMessage('ไม่สามารถโหลดภาพนี้ได้ ไฟล์อาจถูกลบหรือเสียหาย');
                  }}
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          ) : (
            /* Case 5: Office / Other Non-Previewable Documents */
            <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-md text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-xs">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  {doc.name}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  ไฟล์ประเภท <span className="font-mono uppercase font-semibold text-slate-700">{fileExt || 'DOC'}</span> ไม่รองรับการแสดงผลตัวอย่างโดยตรงในเบราว์เซอร์
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  ขนาดไฟล์: {formatSize(doc.fileSize)} • หมวด: {doc.category}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>ดาวน์โหลดเอกสารเพื่อเปิดดูบนเครื่อง</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> ตรวจสอบสิทธิ์ผ่านระบบความปลอดภัย PDPA
            </span>
            {doc.storageProvider && (
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono text-[10px]">
                Storage: {doc.storageProvider.toUpperCase()}
              </span>
            )}
            {doc.checksum && (
              <span className="hidden md:inline font-mono text-[10px] text-slate-400 truncate max-w-xs" title={`SHA-256: ${doc.checksum}`}>
                SHA-256: {doc.checksum.slice(0, 16)}...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">กด Esc เพื่อปิด</span>
          </div>
        </div>
      </div>
    </div>
  </ModalPortal>
  );
};
