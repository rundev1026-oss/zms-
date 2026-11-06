'use client';

import React, { useState, useEffect } from 'react';
import { BankAccount } from '@/types';
import {
  Scale,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Filter,
  FileSpreadsheet,
  History
} from 'lucide-react';

interface PaymentReconciliationTabProps {
  currentUser: any;
  bankAccounts: BankAccount[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function PaymentReconciliationTab({
  currentUser,
  bankAccounts,
  showToast,
}: PaymentReconciliationTabProps) {
  const isSuperAdminOrFinance = ['super_admin', 'finance', 'executive', 'admin'].includes(currentUser.role);

  const [provider, setProvider] = useState<string>('all');
  const [bankAccountId, setBankAccountId] = useState<string>('all');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
  const [startDate, setStartDate] = useState<string>(`${currentYear}-${currentMonth}-01`);
  const [endDate, setEndDate] = useState<string>(`${currentYear}-${currentMonth}-28`);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeResult, setActiveResult] = useState<any>(null);
  const [pastBatches, setPastBatches] = useState<any[]>([]);
  const [isLoadingPast, setIsLoadingPast] = useState<boolean>(false);

  // Load past reconciliation batches
  const loadPastBatches = async () => {
    try {
      setIsLoadingPast(true);
      const res = await fetch('/api/donations/reconciliation');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPastBatches(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPast(false);
    }
  };

  useEffect(() => {
    loadPastBatches();
  }, []);

  const handleRunReconciliation = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/donations/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            provider,
            startDate,
            endDate,
            bankAccountId: bankAccountId === 'all' ? undefined : bankAccountId,
            notes: `กระทบยอด 3 ทางประจำงวด ${startDate} ถึง ${endDate}`,
          },
          actor: {
            id: currentUser.id || 'u-1',
            name: currentUser.name || 'เจ้าหน้าที่การเงิน',
            role: currentUser.role || 'finance',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'เกิดข้อผิดพลาดในการประมวลผลกระทบยอด', 'error');
        return;
      }

      setActiveResult(json.data);
      showToast(`ประมวลผลกระทบยอด ${json.data.batchNo} สำเร็จ`, 'success');
      loadPastBatches();
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-800" />
              <h2 className="text-base font-bold text-slate-900">
                ระบบกระทบยอด 3 ทาง (3-Way Payment & Bank Reconciliation)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ตรวจสอบเปรียบเทียบธุรกรรม 3 แหล่ง: รายการในระบบ ZMS ⟷ ข้อมูล Payment Gateway (GB Prime Pay / Opn) ⟷ รายการเดินบัญชีธนาคาร
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              มาตรฐานควบคุมภายใน (SoD Compliant)
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">ผู้ให้บริการ (Gateway)</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-700"
            >
              <option value="all">ทั้งหมด (All Gateways & Bank)</option>
              <option value="gbprimepay">GB Prime Pay (Thai QR)</option>
              <option value="omise">Opn Payments (Omise)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">บัญชีธนาคาร</label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-700"
            >
              <option value="all">ทุกบัญชีธนาคาร</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} - {b.accountNumber} ({b.accountName.slice(0, 20)}...)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">ตั้งแต่วันที่</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">ถึงวันที่</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <button
              onClick={handleRunReconciliation}
              disabled={isRunning || !isSuperAdminOrFinance}
              className="w-full px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 h-[36px]"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังกระทบยอด...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>ประมวลผลกระทบยอด</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Active Reconciliation Results */}
      {activeResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                ผลการกระทบยอด: {activeResult.batchNo}
              </h3>
              <p className="text-xs text-slate-500">
                ประมวลผลเมื่อ {new Date(activeResult.reconciledAt).toLocaleString('th-TH')}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              สถานะ: ตรวจสอบแล้ว (Audited)
            </span>
          </div>

          {/* KPI Summary 5 Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500">รายการใน ZMS</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {activeResult.summary.totalZmsCount} <span className="text-xs font-normal">รายการ</span>
              </p>
              <p className="text-[11px] text-emerald-800 font-mono font-bold mt-1">
                ฿{activeResult.summary.totalZmsAmount.toLocaleString()}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
              <div className="flex items-center gap-1 text-emerald-800 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ตรงกันสมบูรณ์</span>
              </div>
              <p className="text-base font-bold text-emerald-900 mt-0.5">
                {activeResult.summary.matchedCount} <span className="text-xs font-normal">รายการ</span>
              </p>
              <p className="text-[11px] text-emerald-700 font-mono font-bold mt-1">
                ฿{activeResult.summary.matchedAmount.toLocaleString()}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 shadow-2xs">
              <div className="flex items-center gap-1 text-rose-800 text-[11px] font-bold">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>ยอดเงินไม่ตรง</span>
              </div>
              <p className="text-base font-bold text-rose-900 mt-0.5">
                {activeResult.summary.mismatchCount} <span className="text-xs font-normal">รายการ</span>
              </p>
              <p className="text-[10px] text-rose-600 mt-1">ต้องตรวจสอบทันที</p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 shadow-2xs">
              <div className="flex items-center gap-1 text-amber-800 text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>พบในเกตเวย์ แต่ไม่มีใน ZMS</span>
              </div>
              <p className="text-base font-bold text-amber-900 mt-0.5">
                {activeResult.summary.missingInZmsCount} <span className="text-xs font-normal">รายการ</span>
              </p>
              <p className="text-[10px] text-amber-700 mt-1">เงินเข้าไม่ทราบที่มา</p>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 shadow-2xs">
              <div className="flex items-center gap-1 text-sky-800 text-[11px] font-bold">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>รอการยืนยัน / รอสลิป</span>
              </div>
              <p className="text-base font-bold text-sky-900 mt-0.5">
                {activeResult.summary.pendingClearanceCount} <span className="text-xs font-normal">รายการ</span>
              </p>
              <p className="text-[10px] text-sky-700 mt-1">อยู่ระหว่างตรวจสอบ</p>
            </div>
          </div>

          {/* Discrepancy Detail Tables */}
          {activeResult.details.mismatchItems.length > 0 ||
          activeResult.details.missingInZmsItems.length > 0 ||
          activeResult.details.missingInProviderItems.length > 0 ? (
            <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>รายการพบข้อแตกต่างที่ต้องตรวจสอบ (Discrepancy Investigation)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-50/60 text-slate-700 font-bold border-b border-rose-100">
                    <tr>
                      <th className="p-2.5">สถานะข้อแตกต่าง</th>
                      <th className="p-2.5">เลขอ้างอิง / Transaction</th>
                      <th className="p-2.5 text-right">ยอดใน ZMS</th>
                      <th className="p-2.5 text-right">ยอดใน Gateway</th>
                      <th className="p-2.5 text-right">ส่วนต่าง</th>
                      <th className="p-2.5">รายละเอียดข้อผิดพลาด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {activeResult.details.mismatchItems.map((item: any, idx: number) => (
                      <tr key={`mis-${idx}`} className="hover:bg-rose-50/40">
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            ยอดไม่ตรงกัน
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{item.transactionNo || item.referenceNo}</td>
                        <td className="p-2.5 text-right">฿{item.zmsAmount?.toLocaleString()}</td>
                        <td className="p-2.5 text-right">฿{item.providerAmount?.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-rose-600 font-bold">฿{item.difference?.toLocaleString()}</td>
                        <td className="p-2.5 font-sans text-slate-600">{item.description}</td>
                      </tr>
                    ))}
                    {activeResult.details.missingInZmsItems.map((item: any, idx: number) => (
                      <tr key={`mis-zms-${idx}`} className="hover:bg-amber-50/40">
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            ไม่มีใน ZMS
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{item.providerTxId || item.referenceNo}</td>
                        <td className="p-2.5 text-right text-slate-400">-</td>
                        <td className="p-2.5 text-right font-bold text-amber-900">฿{item.amount?.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-amber-600 font-bold">+฿{item.amount?.toLocaleString()}</td>
                        <td className="p-2.5 font-sans text-slate-600">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-900 text-sm">การกระทบยอดเสร็จสมบูรณ์: ยอดเงินตรงกัน 100%</h4>
              <p className="text-xs text-emerald-800/80 max-w-md mx-auto">
                ทุกรายการรับบริจาคใน ZMS มีหลักฐานการชำระเงินจาก Payment Provider และตรงกับยอดเดินบัญชีธนาคาร ไม่พบข้อผิดพลาด
              </p>
            </div>
          )}
        </div>
      )}

      {/* Past Reconciliation Batches History */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-xs">
              ประวัติการกระทบยอดบัญชีและเกตเวย์ย้อนหลัง (Reconciliation Audit Trail)
            </h3>
          </div>
          <button
            onClick={loadPastBatches}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="รีเฟรชประวัติ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPast ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {pastBatches.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">ยังไม่มีประวัติการประมวลผลกระทบยอด</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">รหัสชุดกระทบยอด</th>
                  <th className="p-2.5">วันเวลาที่ตรวจ</th>
                  <th className="p-2.5">ช่วงเวลาที่ตรวจ</th>
                  <th className="p-2.5 text-right">รายการ ZMS</th>
                  <th className="p-2.5 text-right">ตรงกัน</th>
                  <th className="p-2.5 text-right">ไม่ตรงกัน</th>
                  <th className="p-2.5">ผู้ตรวจสอบ</th>
                  <th className="p-2.5">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastBatches.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 font-mono text-[11px]">
                    <td className="p-2.5 font-bold text-slate-900">{b.batch_no}</td>
                    <td className="p-2.5 text-slate-600 font-sans">
                      {new Date(b.reconciled_at).toLocaleString('th-TH')}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {b.start_date} ~ {b.end_date}
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-800">
                      {b.total_zms_count} รายการ (฿{Number(b.total_zms_amount).toLocaleString()})
                    </td>
                    <td className="p-2.5 text-right text-emerald-700 font-bold">
                      {b.matched_count} รายการ
                    </td>
                    <td className="p-2.5 text-right">
                      {b.mismatch_count > 0 ? (
                        <span className="text-rose-600 font-bold">{b.mismatch_count} รายการ</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-700 font-sans">{b.auditor_name}</td>
                    <td className="p-2.5 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {b.status === 'completed' ? 'กระทบยอดแล้ว' : b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
