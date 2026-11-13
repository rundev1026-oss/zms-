'use client';

import React, { useState } from 'react';
import { X, Banknote, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, UploadCloud, Vault } from 'lucide-react';
import { BankAccount } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  banks: BankAccount[];
  actor: { id: string; name: string; role: string };
  onSuccess: () => void;
}

export function FinanceMovementModalWithdraw({ isOpen, onClose, banks, actor, onSuccess }: Props) {
  const activeBanks = banks.filter((b) => b.status === 'active');
  const [bankAccountId, setBankAccountId] = useState(activeBanks[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [fundType, setFundType] = useState('zakat');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [withdrawnByName, setWithdrawnByName] = useState(actor.name || '');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'full_instant' | 'draft_request'>('full_instant');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const selectedBank = banks.find((b) => b.id === bankAccountId);
  const currentBankBalance = Number(selectedBank?.currentBalance || 0);

  const workflowSteps = [
    { num: 1, title: 'สร้างคำขอถอนเงิน' },
    { num: 2, title: 'ตรวจสอบยอดคงเหลือ' },
    { num: 3, title: 'อนุมัติการถอนเงิน' },
    { num: 4, title: 'ไปถอนเงินที่ธนาคาร' },
    { num: 5, title: 'แนบสลิปถอนเงิน' },
    { num: 6, title: 'เหรัญญิกรับเงินสด' },
    { num: 7, title: 'ตัดยอดบัญชีธนาคาร' },
    { num: 8, title: 'บันทึกสมุดบัญชีคู่ (GL)' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const val = Number(amount);
    if (!val || val <= 0) {
      setError('กรุณาระบุจำนวนเงินถอนที่มากกว่า 0 บาท');
      return;
    }
    if (!bankAccountId) {
      setError('กรุณาเลือกบัญชีธนาคารต้นทาง');
      return;
    }
    if (val > currentBankBalance) {
      setError(
        `ยอดเงินคงเหลือในบัญชี "${selectedBank?.accountName}" ไม่เพียงพอ (คงเหลือ ฿${currentBankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ต้องการถอน ฿${val.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdrawal_workflow',
          input: {
            title: title.trim() || `ถอนเงินสดเข้าคลังเหรัญญิก (${fundType})`,
            bankAccountId,
            amount: val,
            fundType,
            eventDate,
            withdrawnByName: withdrawnByName.trim() || actor.name,
            proofUrl: proofUrl.trim(),
            notes: notes.trim(),
            status: mode === 'full_instant' ? 'completed' : 'draft',
          },
          actor,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'บันทึกการถอนเงินไม่สำเร็จ');
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
      <div className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-amber-200 bg-white shadow-2xl">
        {/* Header - Amber Theme (#D97706) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xs">
              <Banknote className="h-5 w-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">บันทึกการถอนเงินสดจากธนาคารเข้าคลังเหรัญญิก (Withdrawal)</h2>
              <p className="text-xs text-amber-100/90">กระบวนการควบคุม 8 ขั้นตอน ตัดยอดธนาคารและเพิ่มยอดเงินสดเหรัญญิก</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="zms-action rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 8-Step Workflow Progress Pills */}
        <div className="border-b border-amber-100 bg-amber-50/50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
            กระบวนการถอนเงินสดมาตรฐาน (8-Step Cash Withdrawal Cycle)
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] md:grid-cols-8">
            {workflowSteps.map((step) => (
              <div
                key={step.num}
                className="flex flex-col items-center rounded-xl border border-amber-200/80 bg-white p-2 text-center shadow-2xs"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
                  {step.num}
                </div>
                <div className="mt-1 font-semibold leading-tight text-slate-700">{step.title}</div>
              </div>
            ))}
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

          {/* Execution Mode Selector */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-xs font-semibold text-slate-700">รูปแบบการบันทึก:</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('full_instant')}
                className={`zms-action flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  mode === 'full_instant'
                    ? 'border-amber-500 bg-white text-amber-800 shadow-xs ring-2 ring-amber-100'
                    : 'border-slate-200 bg-white/50 text-slate-600 hover:bg-white'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                ถอนจริงและรับเข้าคลังสมบูรณ์ (ครบ 8 ขั้นตอนทันที)
              </button>
              <button
                type="button"
                onClick={() => setMode('draft_request')}
                className={`zms-action flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  mode === 'draft_request'
                    ? 'border-amber-500 bg-white text-amber-800 shadow-xs ring-2 ring-amber-100'
                    : 'border-slate-200 bg-white/50 text-slate-600 hover:bg-white'
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                สร้างเป็นคำขอถอนเงิน (รออนุมัติและไปถอนจริง)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* วันที่ถอน */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                วันที่ทำรายการ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
            </div>

            {/* ประเภทเงิน */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                ประเภทเงิน <span className="text-red-500">*</span>
              </label>
              <select
                value={fundType}
                onChange={(e) => setFundType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
              >
                <option value="zakat">เงินซะกาต (Zakat)</option>
                <option value="sadaqah">เงินศอดะเกาะฮ์ (Sadaqah)</option>
                <option value="operational">เงินบริหารสำนักงาน (Operational)</option>
              </select>
            </div>
          </div>

          {/* บัญชีธนาคารต้นทาง */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              บัญชีธนาคารต้นทาง (Source Bank Account) <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
            >
              {activeBanks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} — {b.accountName} ({b.accountNumber}) · คงเหลือ ฿
                  {Number(b.currentBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
            {selectedBank && (
              <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-amber-900">
                <span>สาขา: {selectedBank.branchName || 'สำนักงานใหญ่'}</span>
                <span>ยอดเงินที่ถอนได้สูงสุด: ฿{currentBankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* จำนวนเงินที่ถอน */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                จำนวนเงินที่ถอน (บาท) <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentBankBalance}
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 pr-10 text-base font-bold text-amber-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">บาท</span>
              </div>
            </div>

            {/* ผู้ไปถอน / เจ้าหน้าที่ผู้รับผิดชอบ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                ผู้ไปถอน / เจ้าหน้าที่ผู้รับผิดชอบ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={withdrawnByName}
                onChange={(e) => setWithdrawnByName(e.target.value)}
                placeholder="ชื่อ-สกุล ผู้ได้รับมอบหมายไปถอนเงิน"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>

          {/* วัตถุประสงค์การถอนเงิน */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              วัตถุประสงค์การถอนเงิน <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ถอนเงินสดสำรองสำหรับจ่ายเงินสงเคราะห์ซะกาตรายสัปดาห์..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {/* แนบสลิปถอนเงิน */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              หลักฐานสลิปการถอนเงินจากธนาคาร (Withdrawal Slip URL)
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://... หรือแนบลิงก์รูปสลิปถอนเงิน"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
              <button
                type="button"
                onClick={() => setProofUrl('https://placehold.co/600x800.png?text=Bank+Withdrawal+Slip')}
                className="zms-action inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                <UploadCloud className="h-3.5 w-3.5" /> จำลองสลิปถอน
              </button>
            </div>
          </div>

          {/* หมายเหตุ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">หมายเหตุ / มติที่ประชุม</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุมติที่ประชุมคณะกรรมการ หรือบันทึกข้อความภายใน..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {/* GL Posting Preview */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 text-xs text-slate-700">
            <div className="font-bold text-amber-950">ผลกระทบต่อบัญชีแยกประเภท (General Ledger Impact):</div>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="font-semibold text-emerald-800">เดบิต (Debit):</span> 1020-01 เงินสดในมือเหรัญญิก (+ เพิ่มขึ้น)
              </div>
              <div>
                <span className="font-semibold text-rose-800">เครดิต (Credit):</span> 1010-01 เงินฝากธนาคาร (- ลดลง)
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
              className="zms-action inline-flex items-center gap-2 rounded-xl bg-[#D97706] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-700/20 transition hover:bg-[#b45309] active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังดำเนินการ...
                </>
              ) : (
                <>
                  <Vault className="h-4 w-4" /> ยืนยันการถอนเงินสดเข้าคลัง
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
