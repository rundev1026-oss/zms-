'use client';

import React, { useState } from 'react';
import { X, Building2, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { BankAccount } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  banks: BankAccount[];
  actor: { id: string; name: string; role: string };
  onSuccess: () => void;
}

export function FinanceMovementModalDeposit({ isOpen, onClose, banks, actor, onSuccess }: Props) {
  const activeBanks = banks.filter((b) => b.status === 'active');
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [moneyType, setMoneyType] = useState('zakat');
  const [bankAccountId, setBankAccountId] = useState(activeBanks[0]?.id || '');
  const [sourceType, setSourceType] = useState('donation_cash');
  const [amount, setAmount] = useState('');
  const [depositorName, setDepositorName] = useState(actor.name || '');
  const [referenceNo, setReferenceNo] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const selectedBank = banks.find((b) => b.id === bankAccountId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const val = Number(amount);
    if (!val || val <= 0) {
      setError('กรุณาระบุจำนวนเงินที่มากกว่า 0 บาท');
      return;
    }
    if (!bankAccountId) {
      setError('กรุณาเลือกบัญชีธนาคารปลายทาง');
      return;
    }
    if (!depositorName.trim()) {
      setError('กรุณาระบุชื่อผู้ดำเนินการนำฝาก');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deposit',
          input: {
            depositDate,
            moneyType,
            bankAccountId,
            sourceType,
            amount: val,
            depositorName: depositorName.trim(),
            referenceNo: referenceNo.trim() || `DEP-${Date.now().toString().slice(-6)}`,
            slipUrl: slipUrl.trim(),
            notes: notes.trim(),
          },
          actor,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'บันทึกการฝากเงินไม่สำเร็จ');
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
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-teal-200 bg-white shadow-2xl">
        {/* Header - Teal Theme (#0D9488) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-teal-100 bg-gradient-to-r from-teal-700 to-teal-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xs">
              <Building2 className="h-5 w-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">บันทึกการนำฝากเงินสดเข้าธนาคาร (Deposit)</h2>
              <p className="text-xs text-teal-100/90">นำเงินสดเข้าบัญชีธนาคารและบันทึกลงสมุดบัญชีแยกประเภทอัตโนมัติ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 1. วันที่นำฝาก */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                วันที่นำฝาก <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* 2. ประเภทเงิน */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                ประเภทเงิน <span className="text-red-500">*</span>
              </label>
              <select
                value={moneyType}
                onChange={(e) => setMoneyType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
              >
                <option value="zakat">เงินซะกาต (Zakat)</option>
                <option value="sadaqah">เงินศอดะเกาะฮ์ (Sadaqah)</option>
                <option value="operational_admin">เงินบริหารสำนักงาน (Operational)</option>
                <option value="restricted">เงินบริจาคเฉพาะวัตถุประสงค์ (Restricted)</option>
              </select>
            </div>
          </div>

          {/* 3. บัญชีธนาคารปลายทาง */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              บัญชีธนาคารปลายทาง <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            >
              {activeBanks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} — {b.accountName} ({b.accountNumber}) · คงเหลือ ฿
                  {Number(b.currentBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
            {selectedBank && (
              <div className="mt-1 flex items-center justify-between text-[11px] text-teal-800">
                <span>สาขา: {selectedBank.branchName || 'สำนักงานใหญ่'}</span>
                <span>ยอดเงินปัจจุบัน: ฿{Number(selectedBank.currentBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 4. แหล่งที่มาของเงิน */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                แหล่งที่มาของเงิน <span className="text-red-500">*</span>
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
              >
                <option value="donation_cash">เงินสดรับบริจาค / ซะกาตในตู้รับบริจาค</option>
                <option value="staff_refund">เงินสดส่งคืนจากเจ้าหน้าที่ภาคสนาม</option>
                <option value="treasurer_cash">เงินสดคงเหลือจากคลังเหรัญญิก</option>
                <option value="other">เงินสดแหล่งอื่น ๆ</option>
              </select>
            </div>

            {/* 5. จำนวนเงินนำฝาก */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                จำนวนเงิน (บาท) <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 pr-10 text-base font-bold text-teal-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">บาท</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 6. ผู้ดำเนินการนำฝาก */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                ผู้ดำเนินการนำฝาก <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="ชื่อ-สกุล ผู้ถือเงินไปฝาก"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* 7. เลขที่อ้างอิง / ใบนำฝาก */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                เลขที่อ้างอิง / ใบนำฝาก (Deposit Slip No.)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="เช่น DEP-2569-001 หรือเลขที่สลิป"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>

          {/* 8. แนบสลิป / URL หลักฐาน */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              ลิงก์แนบสลิปการนำฝาก (Deposit Slip URL / Image)
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="url"
                value={slipUrl}
                onChange={(e) => setSlipUrl(e.target.value)}
                placeholder="https://... หรือแนบลิงก์รูปสลิป"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="button"
                onClick={() => setSlipUrl('https://placehold.co/600x800.png?text=Bank+Deposit+Slip')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                <UploadCloud className="h-3.5 w-3.5" /> จำลองสลิป
              </button>
            </div>
          </div>

          {/* 9. หมายเหตุ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">หมายเหตุเพิ่มเติม</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น นำฝากจากยอดเงินสดตู้รับบริจาคงานมัสยิด..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {/* Accounting Ledger Posting Preview */}
          <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-3.5 text-xs text-slate-600">
            <div className="font-bold text-teal-900">การบันทึกบัญชีอัตโนมัติ (Automatic Double-Entry Posting):</div>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="font-semibold text-emerald-700">เดบิต (Debit):</span> 1010-01 เงินฝากธนาคาร (สินทรัพย์เพิ่ม)
              </div>
              <div>
                <span className="font-semibold text-teal-700">เครดิต (Credit):</span> {sourceType === 'staff_refund' ? '1030-01 เงินสดยืมทดรองเจ้าหน้าที่' : '4010-01 เงินสดรับบริจาค'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-700/20 transition hover:bg-[#0f766e] active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึกบัญชี...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> ยืนยันการนำฝากเงินสด
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
