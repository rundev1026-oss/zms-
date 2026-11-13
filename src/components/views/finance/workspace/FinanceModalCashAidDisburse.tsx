'use client';

import React, { useState, useEffect } from 'react';
import { X, HandCoins, CheckCircle2, AlertCircle, Loader2, UploadCloud } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actor: { id: string; name: string; role: string };
  onSuccess: () => void;
}

export function FinanceModalCashAidDisburse({ isOpen, onClose, actor, onSuccess }: Props) {
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [handoverProofUrl, setHandoverProofUrl] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingApps, setLoadingApps] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoadingApps(true);
      fetch('/api/finance/workflow-actions?view=applications')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setApplications(res.data);
            if (res.data[0]) {
              setSelectedAppId(res.data[0].id);
              setAmount(String(res.data[0].approved_amount || ''));
            }
          }
        })
        .finally(() => setLoadingApps(false));
    }
  }, [isOpen]);

  const selectedApp = applications.find((a) => a.id === selectedAppId);

  useEffect(() => {
    if (selectedApp) {
      setAmount(String(selectedApp.approved_amount || ''));
    }
  }, [selectedAppId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const val = Number(amount);
    if (!val || val <= 0) {
      setError('กรุณาระบุจำนวนเงินที่มากกว่า 0 บาท');
      return;
    }
    if (!selectedApp) {
      setError('กรุณาเลือกคำร้องขอความช่วยเหลือ');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disburse_aid',
          input: {
            applicationId: selectedApp.id,
            beneficiaryId: selectedApp.beneficiary_id,
            beneficiaryName: selectedApp.beneficiary_name,
            asnafCategory: selectedApp.asnaf_category,
            amount: val,
            paymentDate,
            handoverProofUrl: handoverProofUrl.trim(),
            gpsCoordinates: gpsCoordinates.trim(),
            notes: notes.trim(),
          },
          actor,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'บันทึกการตัดจ่ายเงินสดไม่สำเร็จ');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการทำรายการ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-teal-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-teal-100 bg-gradient-to-r from-teal-700 to-teal-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <HandCoins className="h-5 w-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">ตัดจ่ายเงินสดช่วยเหลือซะกาต (Cash Aid Disbursement)</h2>
              <p className="text-xs text-teal-100/90">ตัดยอดจากเงินสดเจ้าหน้าที่ และล็อกสถานะคำร้องป้องกันจ่ายซ้ำ</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="zms-action rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              เลือกคำร้องขอความช่วยเหลือที่อนุมัติแล้ว <span className="text-red-500">*</span>
            </label>
            {loadingApps ? (
              <div className="mt-1 text-xs text-slate-400">กำลังโหลดคำร้อง...</div>
            ) : applications.length === 0 ? (
              <div className="mt-1 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">
                ไม่มีคำร้องที่รอการจ่ายเงินสดในขณะนี้
              </div>
            ) : (
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.application_no} — {app.beneficiary_name} ({app.asnaf_category}) · วงเงิน ฿{Number(app.approved_amount).toLocaleString('th-TH')}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">วันที่จ่ายจริง <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">จำนวนเงินที่จ่าย (บาท) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-bold text-teal-900 outline-none focus:border-teal-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">ภาพถ่ายการรับมอบเงิน / ลายมือชื่อผู้รับ</label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="url"
                value={handoverProofUrl}
                onChange={(e) => setHandoverProofUrl(e.target.value)}
                placeholder="https://... หรือแนบลิงก์รูปถ่ายมอบเงิน"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setHandoverProofUrl('https://placehold.co/600x400.png?text=Assistance+Handover+Proof')}
                className="zms-action inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
              >
                <UploadCloud className="h-3.5 w-3.5" /> แนบตัวอย่าง
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">พิกัด GPS จุดจ่ายเงิน (ทางเลือก)</label>
            <input
              type="text"
              value={gpsCoordinates}
              onChange={(e) => setGpsCoordinates(e.target.value)}
              placeholder="เช่น 6.5412, 101.2831"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">หมายเหตุการจ่ายเงิน</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="บันทึกสภาพการณ์ หรือข้อมูลเพิ่มเติม..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white"
            />
          </div>

          {/* GL preview */}
          <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-3 text-xs text-slate-600">
            <span className="font-bold text-teal-900">บันทึกบัญชีแยกประเภท: </span>
            เดบิต 5010-xx ค่าใช้จ่ายซะกาต | เครดิต 1030-01 เงินสดยืมทดรองเจ้าหน้าที่
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || applications.length === 0}
              className="zms-action inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-700/20 hover:bg-[#0f766e] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังตัดจ่าย...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> ยืนยันการตัดจ่ายเงินสด
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
