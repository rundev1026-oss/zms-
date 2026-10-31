'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  FileText, 
  DollarSign, 
  Users, 
  FileCheck, 
  Lock,
  Loader2
} from 'lucide-react';
import { ModalPortal } from '@/components/common/Modal';

interface SoftDeleteModalProps {
  beneficiaryId: string;
  registryNumber: string;
  fullName: string;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SoftDeleteModal: React.FC<SoftDeleteModalProps> = ({
  beneficiaryId,
  registryNumber,
  fullName,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Form states
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [typedConfirm, setTypedConfirm] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingPreview(true);
    setPreviewError(null);

    fetch(`/api/registry/${beneficiaryId}/delete-preview`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data) {
          setPreviewData(json.data);
        } else {
          setPreviewError(json.error || 'ไม่สามารถตรวจสอบข้อมูลทะเบียนได้');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setPreviewError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      })
      .finally(() => {
        if (isMounted) setLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [beneficiaryId]);

  const canDelete = previewData?.canDelete ?? false;
  const isConfirmMatch = typedConfirm.trim().toUpperCase() === registryNumber.trim().toUpperCase();
  const isFormValid = canDelete && reason.trim().length >= 5 && isConfirmMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/registry/${beneficiaryId}/soft-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          reference: reference.trim() || undefined,
          passwordConfirm: passwordConfirm || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`จำหน่าย/ลบทะเบียน ${registryNumber} เรียบร้อยแล้ว (เก็บประวัติทั้งหมดไว้)`, 'success');
        onSuccess();
        onClose();
      } else {
        showToast(json.error || 'ไม่สามารถจำหน่ายทะเบียนได้', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-xl overflow-hidden my-auto">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">จำหน่าย/ลบข้อมูลทะเบียนผู้มีสิทธิ์ (Soft Delete)</h3>
                <p className="text-xs text-red-100">เฉพาะผู้ดูแลระบบสูงสุด (Super Admin)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Safety Notice */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">ระบบความปลอดภัยข้อมูล ZMS Enterprise</p>
                <p className="text-amber-800 leading-relaxed">
                  การจำหน่ายนี้เป็นแบบ <strong>Soft Delete</strong> ข้อมูลเดิม ประวัติการช่วยเหลือทั้งหมด บันทึกทางการเงิน เอกสารแนบ และ Audit Log จะ<strong>ถูกเก็บรักษาไว้อย่างครบถ้วน</strong> เพื่อความโปร่งใสและตรวจสอบย้อนหลังได้ตลอดเวลา
                </p>
              </div>
            </div>

            {/* Target Beneficiary Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 font-mono">
                <span>รหัสทะเบียน: <strong className="text-slate-800 font-bold">{registryNumber}</strong></span>
                <span>สถานะ: <span className="font-semibold text-slate-700">{previewData?.summary?.status || '-'}</span></span>
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {fullName}
              </div>
              <div className="text-slate-500 text-[11px]">
                เลขประจำตัว: {previewData?.summary?.identityNumberMasked || '-'} • โทร: {previewData?.summary?.phone || '-'}
              </div>
            </div>

            {/* Loading / Error / Linked Data Preview */}
            {loadingPreview ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                <span>กำลังตรวจสอบรายการผูกพันและเงื่อนไขความปลอดภัย...</span>
              </div>
            ) : previewError ? (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{previewError}</span>
              </div>
            ) : (
              <>
                {/* Blockers Alert if any */}
                {!previewData.canDelete && (
                  <div className="p-3.5 bg-red-50 rounded-xl border border-red-300 text-xs text-red-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-red-800">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>ไม่สามารถจำหน่ายทะเบียนได้ เนื่องจากมีกระบวนการที่ยังค้างอยู่:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-red-700 pl-2">
                      {previewData.blockers.map((b: string, idx: number) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-red-600 pt-1 border-t border-red-200">
                      * กรุณาดำเนินการหรือยกเลิกคำขอความช่วยเหลือ/การเบิกจ่ายที่ค้างอยู่ให้เรียบร้อยก่อนดำเนินการจำหน่ายทะเบียน
                    </p>
                  </div>
                )}

                {/* Linked Records Summary */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>ข้อมูลประวัติเดิมที่จะถูกเก็บรักษาไว้ (Preserved History):</span>
                    {previewData.canDelete && (
                      <span className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ตรวจสอบผ่าน ไม่มีขั้นตอนค้าง
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
                        <FileText className="w-3 h-3" /> คำขอทั้งหมด
                      </div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        {previewData.summary?.counts?.applications ?? 0}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
                        <DollarSign className="w-3 h-3" /> การเบิกจ่าย
                      </div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        {previewData.summary?.counts?.disbursements ?? 0}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
                        <FileCheck className="w-3 h-3" /> เอกสารแนบ
                      </div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        {previewData.summary?.counts?.documents ?? 0}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" /> สมาชิกครัวเรือน
                      </div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        {previewData.summary?.counts?.householdMembers ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form fields only when canDelete is true */}
                {previewData.canDelete && (
                  <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                    {/* Reason */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        เหตุผลในการจำหน่าย/ลบทะเบียน <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="ระบุเหตุผล เช่น ย้ายถิ่นฐานออกนอกพื้นที่, เสียชีวิต, ตรวจสอบพบข้อมูลซ้ำซ้อน (อย่างน้อย 5 ตัวอักษร)"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        required
                      />
                    </div>

                    {/* Reference */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        เลขที่เอกสารอ้างอิง/คำสั่ง (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="เช่น คำสั่งคณะกรรมการที่ 12/2569"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                    </div>

                    {/* Registry Number Confirmation */}
                    <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 space-y-1.5">
                      <label className="block text-xs font-bold text-red-900">
                        พิมพ์เลขทะเบียน <span className="font-mono underline text-red-700">{registryNumber}</span> เพื่อยืนยัน <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={typedConfirm}
                        onChange={(e) => setTypedConfirm(e.target.value)}
                        placeholder={`พิมพ์ ${registryNumber}`}
                        className="w-full text-xs p-2 rounded-lg border border-red-300 focus:border-red-500 font-mono text-center uppercase"
                        required
                      />
                    </div>

                    {/* Password Confirm */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>รหัสผ่าน Super Admin เพื่อยืนยัน (ถ้าต้องการ)</span>
                      </label>
                      <input
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="ใส่รหัสผ่านของคุณเพื่อยืนยันสิทธิ์"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={!isFormValid || isSubmitting}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold transition-colors shadow-sm"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>กำลังดำเนินการ...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            <span>ยืนยันจำหน่าย/ลบทะเบียน</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {!previewData?.canDelete && !loadingPreview && (
              <div className="flex justify-end pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

