'use client';

import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle2, AlertCircle, Loader2, UploadCloud } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actor: { id: string; name: string; role: string };
  onSuccess: () => void;
}

export function FinanceModalCashAdminExpense({ isOpen, onClose, actor, onSuccess }: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payeeName, setPayeeName] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/finance/workflow-actions?view=categories')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setCategories(res.data);
            if (res.data[0]) {
              setCategoryId(res.data[0].id);
            }
          }
        });
    }
  }, [isOpen]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const val = Number(amount);
    if (!val || val <= 0) {
      setError('กรุณาระบุจำนวนเงินที่มากกว่า 0 บาท');
      return;
    }
    if (!categoryId) {
      setError('กรุณาเลือกหมวดหมู่รายจ่าย');
      return;
    }
    if (!payeeName.trim()) {
      setError('กรุณาระบุชื่อผู้รับเงิน / ร้านค้า');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disburse_admin',
          input: {
            categoryId,
            categoryName: selectedCategory ? selectedCategory.name : 'ค่าใช้จ่ายบริหารสำนักงาน',
            amount: val,
            expenseDate,
            payeeName: payeeName.trim(),
            receiptUrl: receiptUrl.trim(),
            notes: notes.trim(),
          },
          actor,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'บันทึกการตัดจ่ายค่าใช้จ่ายบริหารไม่สำเร็จ');
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
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-blue-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Receipt className="h-5 w-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">ตัดจ่ายค่าใช้จ่ายบริหารสำนักงาน (Admin Expense)</h2>
              <p className="text-xs text-blue-100/90">ตัดยอดเงินสดยืมทดรองเจ้าหน้าที่ตาม 12 หมวดหมู่มาตรฐาน</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              หมวดหมู่ค่าใช้จ่ายบริหาร (12 หมวดมาตรฐาน) <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.group_name || 'บริหาร'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">วันที่ตามใบเสร็จ <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">จำนวนเงิน (บาท) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-bold text-blue-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">ผู้รับเงิน / ชื่อร้านค้า <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="เช่น บจก. ปตท., ร้านเครื่องเขียนสมใจ..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">ลิงก์ใบเสร็จ / ใบกำกับภาษี (Receipt URL)</label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="url"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="https://... หรือแนบลิงก์รูปใบเสร็จ"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setReceiptUrl('https://placehold.co/600x800.png?text=Tax+Invoice+Receipt')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
              >
                <UploadCloud className="h-3.5 w-3.5" /> แนบตัวอย่าง
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">รายละเอียดค่าใช้จ่าย</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุรายละเอียด เช่น ค่าน้ำมันรถยนต์ตู้ปฏิบัติงานลงพื้นที่ยะหา..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* GL preview */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 text-xs text-slate-600">
            <span className="font-bold text-blue-900">บันทึกบัญชีแยกประเภท: </span>
            เดบิต 5020-01 ค่าใช้จ่ายบริหารสำนักงาน | เครดิต 1030-01 เงินสดยืมทดรองเจ้าหน้าที่
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
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-700/20 hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังตัดจ่าย...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> ยืนยันการตัดจ่ายรายจ่ายบริหาร
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
