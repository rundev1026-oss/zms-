'use client';

import React, { useState, useEffect } from 'react';
import { BankAccount, BankReconciliation } from '@/types';
import { maskAccountNumber } from '@/lib/financeUtils';
import { ModalPortal } from '@/components/common/Modal';
import { 
  Building2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Clock, 
  ShieldCheck, 
  Search,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';

interface BankAccountsTabProps {
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function BankAccountsTab({ currentUser, showToast }: BankAccountsTabProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  // Add Account Form
  const [newAccountName, setNewAccountName] = useState('');
  const [newBankName, setNewBankName] = useState('ธนาคารอิสลามแห่งประเทศไทย');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState<number>(0);

  // Reconcile Form
  const [statementBalance, setStatementBalance] = useState<number>(0);
  const [reconcileDate, setReconcileDate] = useState(new Date().toISOString().slice(0, 10));
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [reconcileProofUrl, setReconcileProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBankData = async () => {
    setIsLoading(true);
    try {
      const [accRes, recRes] = await Promise.all([
        fetch('/api/finance/bank-accounts'),
        fetch('/api/finance/bank-accounts/reconcile')
      ]);
      const accJson = await accRes.json();
      const recJson = await recRes.json();

      if (accJson.success) setAccounts(accJson.data);
      if (recJson.success) setReconciliations(recJson.data);
    } catch (err: any) {
      showToast('ไม่สามารถโหลดข้อมูลบัญชีธนาคารได้: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim() || !newAccountNumber.trim()) {
      showToast('กรุณากรอกชื่อบัญชีและเลขที่บัญชี', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            accountName: newAccountName,
            bankName: newBankName,
            accountNumber: newAccountNumber,
            branchName: newBranchName,
            openingBalance: newOpeningBalance,
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'เกิดข้อผิดพลาดในการเพิ่มบัญชี');

      showToast('เพิ่มบัญชีธนาคารเรียบร้อยแล้ว', 'success');
      setShowAddAccountModal(false);
      setNewAccountName('');
      setNewAccountNumber('');
      setNewOpeningBalance(0);
      fetchBankData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReconcile = (account: BankAccount) => {
    setSelectedAccount(account);
    setStatementBalance(account.currentBalance);
    setReconcileNotes('');
    setReconcileProofUrl('');
    setShowReconcileModal(true);
  };

  const handleSubmitReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/bank-accounts/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            bankAccountId: selectedAccount.id,
            reconciliationDate: reconcileDate,
            statementBalance: Number(statementBalance),
            notes: reconcileNotes,
            proofUrl: reconcileProofUrl,
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'เกิดข้อผิดพลาดในการกระทบยอด');

      showToast(
        `กระทบยอดธนาคารสำเร็จ (${json.data.status === 'balanced' ? 'ยอดตรงกันสมบูรณ์' : `มีผลต่าง ฿${Math.abs(json.data.difference).toLocaleString()} บาท`})`,
        json.data.status === 'balanced' ? 'success' : 'info'
      );
      setShowReconcileModal(false);
      fetchBankData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (account: BankAccount) => {
    const nextStatus = account.status === 'active' ? 'closed' : 'active';
    const confirmMsg = nextStatus === 'closed'
      ? `คุณแน่ใจหรือไม่ว่าต้องการปิดการใช้งานบัญชี "${account.accountName}"? (ประวัติธุรกรรมเดิมทั้งหมดจะไม่ถูกลบ)`
      : `คุณต้องการเปิดใช้งานบัญชี "${account.accountName}" อีกครั้งหรือไม่?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/finance/bank-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: account.id,
          status: nextStatus,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'เกิดข้อผิดพลาด');

      showToast(`เปลี่ยนสถานะบัญชีเป็น "${nextStatus === 'active' ? 'เปิดใช้งาน' : 'ปิดบัญชี'}" เรียบร้อย`, 'success');
      fetchBankData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const totalBankBalance = accounts
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            จัดการการเงินและบัญชีธนาคาร (Bank Accounts & Reconciliation)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            บริหารจัดการบัญชีธนาคารหลักของมูลนิธิ กระทบยอดสเตตเมนต์ธนาคาร และตรวจสอบยอดเงินสดจริง
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBankData}
            className="p-2 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {['super_admin', 'finance'].includes(currentUser.role) && (
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              เพิ่มบัญชีธนาคาร
            </button>
          )}
        </div>
      </div>

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">ยอดเงินรวมในบัญชีธนาคาร</p>
            <h3 className="text-2xl font-bold mt-1">฿{totalBankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</h3>
            <p className="text-emerald-200 text-xs mt-1">จาก {accounts.filter((a) => a.status === 'active').length} บัญชีที่เปิดใช้งาน</p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">บัญชีที่ตรงกับสเตตเมนต์</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {accounts.filter((a) => a.currentBalance === a.reconciledBalance && a.lastReconciledAt).length} / {accounts.length}
            </h3>
            <p className="text-emerald-600 text-xs font-medium mt-1">กระทบยอดสมบูรณ์</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">รายการกระทบยอดล่าสุด</p>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {reconciliations[0]?.reconciliationDate || 'ยังไม่มีรายการ'}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {reconciliations[0]?.auditorName ? `โดย ${reconciliations[0]?.auditorName}` : 'รอการกระทบยอด'}
            </p>
          </div>
          <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-sky-600" />
          </div>
        </div>
      </div>

      {/* Bank Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const isBalanced = Math.abs(acc.currentBalance - acc.reconciledBalance) < 0.01 && acc.lastReconciledAt;
          return (
            <div
              key={acc.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                acc.status === 'closed' ? 'opacity-60 bg-slate-50 border-slate-300' : 'border-slate-200/80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      {acc.bankName.includes('อิสลาม') ? 'iBank' : acc.bankName.includes('กรุงไทย') ? 'KTB' : 'BANK'}
                    </div>
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {acc.bankName}
                      </span>
                      {acc.isDefault && (
                        <span className="ml-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          บัญชีหลัก
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      acc.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : acc.status === 'closed'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {acc.status === 'active' ? 'เปิดใช้งาน' : acc.status === 'closed' ? 'ปิดบัญชี' : 'ระงับ'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 mt-3 text-base leading-snug">{acc.accountName}</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  เลขที่บัญชี: <span className="font-semibold text-slate-700">{maskAccountNumber(acc.accountNumber)}</span>
                </p>
                {acc.branchName && (
                  <p className="text-xs text-slate-400 mt-0.5">สาขา: {acc.branchName}</p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">ยอดยกมา:</span>
                    {acc.openingBalance > 0 ? (
                      <span className="text-xs font-medium text-slate-700">
                        ฿{acc.openingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded font-medium">
                        ยังไม่ได้ตั้งค่ายอดยกมา
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">ยอดคงเหลือตามระบบ:</span>
                    <span className="text-base font-bold text-emerald-700 font-mono">
                      ฿{acc.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">ยอดสเตตเมนต์ล่าสุด:</span>
                    <span className="text-xs font-medium text-slate-600 font-mono">
                      ฿{acc.reconciledBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  {isBalanced ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      กระทบยอดตรงกัน ({acc.lastReconciledAt})
                    </span>
                  ) : acc.lastReconciledAt ? (
                    <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      ผลต่าง ฿{Math.abs(acc.currentBalance - acc.reconciledBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      ยังไม่เคยกระทบยอด
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenReconcile(acc)}
                  disabled={acc.status === 'closed'}
                  className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  กระทบยอดธนาคาร
                </button>
                {['super_admin', 'finance'].includes(currentUser.role) && (
                  <button
                    onClick={() => handleToggleStatus(acc)}
                    className="text-xs text-slate-400 hover:text-slate-700 py-1.5 px-2.5 rounded-lg border border-slate-200 transition-colors"
                    title={acc.status === 'active' ? 'ปิดบัญชี (ไม่ลบประวัติเดิม)' : 'เปิดใช้งานบัญชี'}
                  >
                    {acc.status === 'active' ? 'ปิดบัญชี' : 'เปิดใหม่'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reconciliation History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">ประวัติการกระทบยอดธนาคาร (Reconciliation Audit Trail)</h3>
            <p className="text-xs text-slate-500 mt-0.5">บันทึกผลการตรวจสอบยอดเงินระบบเทียบกับใบแจ้งยอดธนาคาร (Statement)</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="p-3.5">วันที่กระทบยอด</th>
                <th className="p-3.5">บัญชีธนาคาร</th>
                <th className="p-3.5 text-right">ยอดคงเหลือในระบบ</th>
                <th className="p-3.5 text-right">ยอดตามสเตตเมนต์</th>
                <th className="p-3.5 text-right">ผลต่าง</th>
                <th className="p-3.5 text-center">สถานะ</th>
                <th className="p-3.5">ผู้ตรวจสอบ</th>
                <th className="p-3.5">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {reconciliations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    ยังไม่มีประวัติการกระทบยอดธนาคาร
                  </td>
                </tr>
              ) : (
                reconciliations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-medium text-slate-800">{rec.reconciliationDate}</td>
                    <td className="p-3.5 font-medium">{rec.bankAccountName || 'บัญชีธนาคาร'}</td>
                    <td className="p-3.5 text-right font-mono font-medium">
                      ฿{rec.systemBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-slate-900">
                      ฿{rec.statementBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold">
                      <span className={Math.abs(rec.difference) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}>
                        {rec.difference > 0 ? `+฿${rec.difference.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : `฿${rec.difference.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                          rec.status === 'balanced'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.status === 'balanced' ? 'ตรงกัน' : 'มียอดผลต่าง'}
                      </span>
                    </td>
                    <td className="p-3.5">{rec.auditorName}</td>
                    <td className="p-3.5 text-slate-500 max-w-xs truncate">{rec.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Bank Account */}
      {showAddAccountModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  เพิ่มบัญชีธนาคารใหม่
                </h3>
                <button
                  onClick={() => setShowAddAccountModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อบัญชี *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น มูลนิธิซะกาตและสาธารณกุศล (โครงการพิเศษ)"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ธนาคาร *</label>
                    <select
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="ธนาคารอิสลามแห่งประเทศไทย">ธนาคารอิสลามแห่งประเทศไทย</option>
                      <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย</option>
                      <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย</option>
                      <option value="ธนาคารไทยพาณิชย์">ธนาคารไทยพาณิชย์</option>
                      <option value="ธนาคารกรุงเทพ">ธนาคารกรุงเทพ</option>
                      <option value="ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร">ธ.ก.ส.</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">สาขา</label>
                    <input
                      type="text"
                      placeholder="เช่น สำนักงานใหญ่ หรือ ยะลา"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เลขที่บัญชี *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 095-1-23456-7"
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">เลขบัญชีจะถูกแสดงแบบปกปิด (Masked) ในหน้าระบบทั่วไป</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ยอดยกมาเริ่มต้น (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newOpeningBalance}
                    onChange={(e) => setNewOpeningBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกบัญชี'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Reconcile Bank Account */}
      {showReconcileModal && selectedAccount && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-emerald-600" />
                    กระทบยอดธนาคาร (Bank Reconciliation)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedAccount.accountName}</p>
                </div>
                <button
                  onClick={() => setShowReconcileModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitReconciliation} className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">เลขที่บัญชี (Masked):</span>
                    <span className="font-mono font-bold text-slate-800">{maskAccountNumber(selectedAccount.accountNumber)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ยอดเงินคงเหลือตามระบบบัญชี:</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      ฿{selectedAccount.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่ตรวจยอดสเตตเมนต์ *</label>
                    <input
                      type="date"
                      required
                      value={reconcileDate}
                      onChange={(e) => setReconcileDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ยอดเงินตาม Statement (บาท) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={statementBalance}
                      onChange={(e) => setStatementBalance(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Real-time Difference Preview */}
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
                  Math.abs(selectedAccount.currentBalance - statementBalance) < 0.01
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <span className="flex items-center gap-1.5">
                    {Math.abs(selectedAccount.currentBalance - statementBalance) < 0.01 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    ผลต่าง (ระบบ - สเตตเมนต์):
                  </span>
                  <span className="font-mono font-bold text-sm">
                    ฿{(selectedAccount.currentBalance - statementBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ / คำอธิบายผลต่าง</label>
                  <textarea
                    rows={2}
                    placeholder="เช่น เช็คจ่ายระหว่างเคลียริ่ง, ดอกเบี้ยรับรอปรับปรุง..."
                    value={reconcileNotes}
                    onChange={(e) => setReconcileNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ไฟล์หลักฐาน Statement</label>
                  <input
                    type="text"
                    placeholder="เช่น /statements/bank1-2569-10.pdf"
                    value={reconcileProofUrl}
                    onChange={(e) => setReconcileProofUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReconcileModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันผลกระทบยอด'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
