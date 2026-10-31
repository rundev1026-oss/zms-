'use client';

import React, { useState } from 'react';
import { RotateCcw, X, AlertCircle, Loader2 } from 'lucide-react';
import { ModalPortal } from '@/components/common/Modal';

interface RestoreModalProps {
  beneficiaryId: string;
  registryNumber: string;
  fullName: string;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  beneficiaryId,
  registryNumber,
  fullName,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = reason.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/registry/${beneficiaryId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          reference: reference.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`กู้คืนทะเบียน ${registryNumber} กลับสู่ระบบสำเร็จ`, 'success');
        onSuccess();
        onClose();
      } else {
        showToast(json.error || 'ไม่สามารถกู้คืนทะเบียนได้', 'error');
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
        <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 w-full max-w-lg overflow-hidden my-auto">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">กู้คืนทะเบียนผู้มีสิทธิ์รับซะกาต</h3>
                <p className="text-xs text-emerald-100">นำข้อมูลทะเบียนกลับเข้าสู่ระบบปกติ</p>
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

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Beneficiary Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 font-mono">
                <span>รหัสทะเบียน: <strong className="text-slate-800 font-bold">{registryNumber}</strong></span>
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {fullName}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                เมื่อกู้คืนแล้ว ทะเบียนนี้จะกลับไปแสดงในรายการทะเบียนปกติ พร้อมสถานะและประวัติเดิมทั้งหมด
              </span>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                เหตุผลในการกู้คืนทะเบียน <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น ได้รับเอกสารยืนยันตัวตนเพิ่มเติม, ยกเลิกคำสั่งเดิม (อย่างน้อย 5 ตัวอักษร)"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                placeholder="เช่น คำสั่งคณะกรรมการที่ 14/2569"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Buttons */}
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังกู้คืน...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>ยืนยันการกู้คืน</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

