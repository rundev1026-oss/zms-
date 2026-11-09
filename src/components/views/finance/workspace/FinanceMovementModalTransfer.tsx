'use client';

import React, { useState } from 'react';
import { X, ArrowLeftRight, CheckCircle2, AlertCircle, Loader2, Building2, Vault, HandCoins, RotateCcw, UploadCloud } from 'lucide-react';
import { BankAccount } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  banks: BankAccount[];
  actor: { id: string; name: string; role: string };
  onSuccess: () => void;
}

export function FinanceMovementModalTransfer({ isOpen, onClose, banks, actor, onSuccess }: Props) {
  const activeBanks = banks.filter((b) => b.status === 'active');
  const [transferMode, setTransferMode] = useState<'bank_to_bank' | 'bank_to_treasurer' | 'treasurer_to_staff' | 'staff_to_treasurer'>('bank_to_bank');
  
  const [sourceBankAccountId, setSourceBankAccountId] = useState(activeBanks[0]?.id || '');
  const [targetBankAccountId, setTargetBankAccountId] = useState(activeBanks[1]?.id || activeBanks[0]?.id || '');
  const [staffName, setStaffName] = useState(actor.name || '');
  const [amount, setAmount] = useState('');
  const [moneyType, setMoneyType] = useState('zakat');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const sourceBank = banks.find((b) => b.id === sourceBankAccountId);
  const targetBank = banks.find((b) => b.id === targetBankAccountId);
  const sourceBankBal = Number(sourceBank?.currentBalance || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const val = Number(amount);
    if (!val || val <= 0) {
      setError('กรุณาระบุจำนวนเงินที่ต้องการโอนมากกว่า 0 บาท');
      return;
    }

    if (transferMode === 'bank_to_bank') {
      if (!sourceBankAccountId || !targetBankAccountId) {
        setError('กรุณาเลือกบัญชีธนาคารต้นทางและปลายทาง');
        return;
      }
      if (sourceBankAccountId === targetBankAccountId) {
        setError('บัญชีต้นทางและปลายทางต้องไม่เป็นบัญชีเดียวกัน');
        return;
      }
      if (val > sourceBankBal) {
        setError(`ยอดเงินในบัญชีต้นทาง "${sourceBank?.accountName}" ไม่เพียงพอ (คงเหลือ ฿${sourceBankBal.toLocaleString('th-TH')})`);
        return;
      }
    } else if (transferMode === 'bank_to_treasurer') {
      if (!sourceBankAccountId) {
        setError('กรุณาเลือกบัญชีธนาคารต้นทาง');
        return;
      }
      if (val > sourceBankBal) {
        setError(`ยอดเงินในบัญชีต้นทาง "${sourceBank?.accountName}" ไม่เพียงพอ`);
        return;
      }
    } else if (transferMode === 'treasurer_to_staff') {
      if (!staffName.trim()) {
        setError('กรุณาระบุชื่อเจ้าหน้าที่ผู้รับเงินทดรอง');
        return;
      }
    } else if (transferMode === 'staff_to_treasurer') {
      if (!staffName.trim()) {
        setError('กรุณาระบุชื่อเจ้าหน้าที่ผู้ส่งคืนเงิน');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          input: {
            transferMode,
            sourceBankAccountId,
            targetBankAccountId,
            staffName: staffName.trim(),
            amount: val,
            moneyType,
            transferDate,
            referenceNo: referenceNo.trim() || `TRF-${Date.now().toString().slice(-6)}`,
            slipUrl: slipUrl.trim(),
            notes: notes.trim(),
          },
          actor,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'บันทึกการโอนเงินไม่สำเร็จ');
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
      <div className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-blue-200 bg-white shadow-2xl">
        {/* Header - Blue Theme (#2563EB) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xs">
              <ArrowLeftRight className="h-5 w-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">บันทึกการโอนเงินภายในองค์กร (Transfer)</h2>
              <p className="text-xs text-blue-100/90">การโอนเงินภายใน 4 รูปแบบ ไม่บันทึกเป็นรายได้หรือรายจ่ายภายนอก</p>
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

        {/* 4 Transfer Mode Selector Tabs */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            เลือกรูปแบบการโอนเงิน (Transfer Type)
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setTransferMode('bank_to_bank')}
              className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                transferMode === 'bank_to_bank'
                  ? 'border-blue-600 bg-white text-blue-800 shadow-sm ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
              }`}
            >
              <Building2 className={`h-5 w-5 ${transferMode === 'bank_to_bank' ? 'text-blue-600' : 'text-slate-400'}`} />
              <div className="mt-1 text-xs font-bold">1. ธนาคารสู่ธนาคาร</div>
              <div className="text-[10px] text-slate-400">Bank to Bank</div>
            </button>

            <button
              type="button"
              onClick={() => setTransferMode('bank_to_treasurer')}
              className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                transferMode === 'bank_to_treasurer'
                  ? 'border-blue-600 bg-white text-blue-800 shadow-sm ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
              }`}
            >
              <Vault className={`h-5 w-5 ${transferMode === 'bank_to_treasurer' ? 'text-amber-600' : 'text-slate-400'}`} />
              <div className="mt-1 text-xs font-bold">2. ธนาคารสู่เหรัญญิก</div>
              <div className="text-[10px] text-slate-400">Bank to Treasurer</div>
            </button>

            <button
              type="button"
              onClick={() => setTransferMode('treasurer_to_staff')}
              className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                transferMode === 'treasurer_to_staff'
                  ? 'border-blue-600 bg-white text-blue-800 shadow-sm ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
              }`}
            >
              <HandCoins className={`h-5 w-5 ${transferMode === 'treasurer_to_staff' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <div className="mt-1 text-xs font-bold">3. เหรัญญิกสู่เจ้าหน้าที่</div>
              <div className="text-[10px] text-slate-400">Cash Float Handover</div>
            </button>

            <button
              type="button"
              onClick={() => setTransferMode('staff_to_treasurer')}
              className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                transferMode === 'staff_to_treasurer'
                  ? 'border-blue-600 bg-white text-blue-800 shadow-sm ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
              }`}
            >
              <RotateCcw className={`h-5 w-5 ${transferMode === 'staff_to_treasurer' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div className="mt-1 text-xs font-bold">4. เจ้าหน้าที่คืนเงินสด</div>
              <div className="text-[10px] text-slate-400">Staff Cash Refund</div>
            </button>
          </div>
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
            {/* วันที่ทำรายการ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                วันที่ทำรายการ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* ประเภทเงิน */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                ประเภทเงิน <span className="text-red-500">*</span>
              </label>
              <select
                value={moneyType}
                onChange={(e) => setMoneyType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="zakat">เงินซะกาต (Zakat)</option>
                <option value="sadaqah">เงินศอดะเกาะฮ์ (Sadaqah)</option>
                <option value="operational">เงินบริหารสำนักงาน (Operational)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Inputs according to Mode */}
          {transferMode === 'bank_to_bank' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  บัญชีธนาคารต้นทาง <span className="text-red-500">*</span>
                </label>
                <select
                  value={sourceBankAccountId}
                  onChange={(e) => setSourceBankAccountId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  {activeBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} — {b.accountName} (฿{Number(b.currentBalance).toLocaleString('th-TH')})
                    </option>
                  ))}
                </select>
                {sourceBank && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    คงเหลือ: ฿{sourceBankBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  บัญชีธนาคารปลายทาง <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetBankAccountId}
                  onChange={(e) => setTargetBankAccountId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  {activeBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} — {b.accountName} (฿{Number(b.currentBalance).toLocaleString('th-TH')})
                    </option>
                  ))}
                </select>
                {targetBank && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    คงเหลือปัจจุบัน: ฿{Number(targetBank.currentBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </div>
                )}
              </div>
            </div>
          )}

          {transferMode === 'bank_to_treasurer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                บัญชีธนาคารต้นทางที่จะถอนเข้าคลังเหรัญญิก <span className="text-red-500">*</span>
              </label>
              <select
                value={sourceBankAccountId}
                onChange={(e) => setSourceBankAccountId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                {activeBanks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} — {b.accountName} (฿{Number(b.currentBalance).toLocaleString('th-TH')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(transferMode === 'treasurer_to_staff' || transferMode === 'staff_to_treasurer') && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {transferMode === 'treasurer_to_staff' ? 'เจ้าหน้าที่ผู้รับเงินสดทดรอง' : 'เจ้าหน้าที่ผู้ส่งคืนเงินสด'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="ระบุชื่อเจ้าหน้าที่ปฏิบัติงาน"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  เลขที่ใบสำคัญ / เอกสารอ้างอิง
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="เช่น HND-2569-001 หรือ VOU-001"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* จำนวนเงิน */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              จำนวนเงินที่โอน (บาท) <span className="text-red-500">*</span>
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 pr-10 text-base font-bold text-blue-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">บาท</span>
            </div>
          </div>

          {/* แนบสลิป / หลักฐานการโอน */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              หลักฐานสลิปการโอน / ใบสำคัญรับเงิน (Slip URL / Proof)
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="url"
                value={slipUrl}
                onChange={(e) => setSlipUrl(e.target.value)}
                placeholder="https://... หรือแนบลิงก์รูปสลิป"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setSlipUrl('https://placehold.co/600x800.png?text=Transfer+Slip')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
              >
                <UploadCloud className="h-3.5 w-3.5" /> จำลองสลิป
              </button>
            </div>
          </div>

          {/* หมายเหตุ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">หมายเหตุ / วัตถุประสงค์การโอน</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุเหตุผลหรือรายละเอียดการโอน..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Accounting Ledger Impact Notice */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-slate-700">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              การบันทึกบัญชีแยกประเภทคู่ (Double-Entry Internal Transfer):
            </div>
            <div className="mt-1 text-[11px] text-blue-900">
              {transferMode === 'bank_to_bank' && 'เดบิต: ธนาคารปลายทาง (1010-01) | เครดิต: ธนาคารต้นทาง (1010-01)'}
              {transferMode === 'bank_to_treasurer' && 'เดบิต: เงินสดเหรัญญิก (1020-01) | เครดิต: เงินฝากธนาคาร (1010-01)'}
              {transferMode === 'treasurer_to_staff' && 'เดบิต: เงินสดยืมทดรองเจ้าหน้าที่ (1030-01) | เครดิต: เงินสดเหรัญญิก (1020-01)'}
              {transferMode === 'staff_to_treasurer' && 'เดบิต: เงินสดเหรัญญิก (1020-01) | เครดิต: เงินสดยืมทดรองเจ้าหน้าที่ (1030-01)'}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              * เป็นการเปลี่ยนมือสินทรัพย์ภายในองค์กร ไม่ถือเป็นรายได้หรือรายจ่ายภายนอก
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังดำเนินการ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> ยืนยันการโอนเงิน
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
