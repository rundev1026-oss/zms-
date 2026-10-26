'use client';

import React, { useState, useEffect } from 'react';
import { FinancialTransaction, FundAccount, AdminExpenseCategory } from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  Receipt, 
  RefreshCw,
  Building2,
  Car,
  Wifi,
  Utensils,
  Zap,
  TrendingDown,
  DollarSign
} from 'lucide-react';

interface AdminExpensesTabProps {
  currentUser: any;
  funds: FundAccount[];
  transactions: FinancialTransaction[];
  recordExpense: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export function AdminExpensesTab({
  currentUser,
  funds,
  transactions,
  recordExpense,
  showToast,
  onRefresh,
}: AdminExpensesTabProps) {
  const [categories, setCategories] = useState<AdminExpenseCategory[]>([]);
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState('ค่าตอบแทนเจ้าหน้าที่');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(5000);
  const [expenseFundId, setExpenseFundId] = useState('fund-6'); // Default to operational fund
  const [expensePayee, setExpensePayee] = useState('');
  const [expenseRefNo, setExpenseRefNo] = useState(`INV-EXP-${Date.now().toString().slice(-4)}`);
  const [expenseProofUrl, setExpenseProofUrl] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/finance/admin-expenses/categories');
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch {}
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const [showConfirmSummaryModal, setShowConfirmSummaryModal] = useState(false);

  const handlePrepareExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expensePayee.trim() || !expenseRefNo.trim() || expenseAmount <= 0) {
      showToast('กรุณากรอกข้อมูลผู้รับเงิน เลขที่เอกสารอ้างอิง และจำนวนเงิน', 'error');
      return;
    }

    // Shariah check on client side
    const targetFund = funds.find((f) => f.id === expenseFundId);
    if (targetFund?.category === 'zakat') {
      showToast('การละเมิดหลักชะรีอะฮ์: เงินซะกาตไม่สามารถนำมาใช้เป็นค่าใช้จ่ายบริหารได้!', 'error');
      return;
    }

    setShowConfirmSummaryModal(true);
  };

  const handleFinalExpense = async () => {
    setIsSubmitting(true);
    try {
      const success = await recordExpense(
        expenseFundId,
        expenseCategory,
        expenseAmount,
        expensePayee.trim(),
        expenseDescription,
        expenseRefNo.trim(),
        {
          adminCategoryCode: expenseCategory,
        }
      );

      if (success) {
        setShowConfirmSummaryModal(false);
        setShowAddModal(false);
        setExpensePayee('');
        setExpenseDescription('');
        setExpenseRefNo(`INV-EXP-${Date.now().toString().slice(-4)}`);
        showToast(`บันทึกค่าใช้จ่ายบริหาร ฿${expenseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท สำเร็จ`, 'success');
        onRefresh();
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered admin expenses
  const adminExpenses = transactions.filter((t) => {
    const isExpense = t.type === 'expense' && t.status !== 'reversed';
    const matchesCat = selectedCatFilter === 'all' || t.category === selectedCatFilter;
    const matchesSearch =
      t.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.payerOrPayee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

    return isExpense && matchesCat && matchesSearch;
  });

  const totalAdminExpense = adminExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Group icons map
  const getCatIcon = (name: string) => {
    if (name.includes('น้ำมัน')) return <Car className="w-4 h-4 text-amber-600" />;
    if (name.includes('รถ')) return <Car className="w-4 h-4 text-indigo-600" />;
    if (name.includes('อินเทอร์เน็ต')) return <Wifi className="w-4 h-4 text-sky-600" />;
    if (name.includes('อาหาร')) return <Utensils className="w-4 h-4 text-emerald-600" />;
    if (name.includes('ไฟฟ้า')) return <Zap className="w-4 h-4 text-yellow-600" />;
    return <Briefcase className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-emerald-600" />
            ระบบจัดการค่าใช้จ่ายบริหาร (Administrative & Operational Expenses)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            ควบคุมรายจ่ายดำเนินงาน 10 หมวดหมู่ พร้อมการตรวจสอบตามหลักการศาสนา (ห้ามนำเงินซะกาตมาใช้จ่ายบริหาร)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {['super_admin', 'finance'].includes(currentUser.role) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              บันทึกค่าใช้จ่ายบริหาร
            </button>
          )}
        </div>
      </div>

      {/* 10 Default Categories Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
          หมวดค่าใช้จ่ายบริหารตั้งต้น 10 หมวดหมู่
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCatFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCatFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatFilter(cat.name)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCatFilter === cat.name
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              {getCatIcon(cat.name)}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาตามเลขที่, ผู้รับเงิน, รายละเอียด..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="text-xs text-slate-600 font-medium">
          ยอดรวมค่าใช้จ่ายบริหารที่แสดง: <span className="font-bold text-slate-900 font-mono text-sm">฿{totalAdminExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="p-3.5">เลขที่รายการ</th>
                <th className="p-3.5">วันที่</th>
                <th className="p-3.5">หมวดค่าใช้จ่าย</th>
                <th className="p-3.5">รายละเอียด / วัตถุประสงค์</th>
                <th className="p-3.5">กองทุนแหล่งเงิน</th>
                <th className="p-3.5">ผู้รับเงิน / ร้านค้า</th>
                <th className="p-3.5">เลขอ้างอิงใบสำคัญ</th>
                <th className="p-3.5 text-right">จำนวนเงิน</th>
                <th className="p-3.5">ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {adminExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    ไม่พบรายการค่าใช้จ่ายบริหารตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                adminExpenses.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-semibold text-slate-900">{t.transactionNo}</td>
                    <td className="p-3.5 font-medium">{t.date}</td>
                    <td className="p-3.5 font-medium">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-semibold">
                        {getCatIcon(t.category)}
                        {t.category}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs truncate text-slate-600">{t.notes || '-'}</td>
                    <td className="p-3.5">
                      <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {t.fundName.split(' ')[0]}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">{t.payerOrPayee}</td>
                    <td className="p-3.5 font-mono text-slate-500">{t.referenceNo}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                      ฿{t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-slate-500">{t.recordedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Admin Expense */}
      {showAddModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-600" />
                  บันทึกค่าใช้จ่ายบริหารและดำเนินงาน
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <form onSubmit={handlePrepareExpense} className="p-6 space-y-4">
                {/* Shariah Rule Alert */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">กฎระเบียบชะรีอะฮ์และการเงิน:</p>
                    <p className="mt-0.5 text-[11px] text-amber-800">
                      ห้ามนำเงินซะกาตมาใช้เป็นค่าใช้จ่ายบริหารโดยเด็ดขาด! ค่าใช้จ่ายบริหารต้องเบิกจ่ายจากกองทุนค่าดำเนินงาน FND-OPR-01 หรือกองทุนศอดะเกาะฮ์เท่านั้น
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่ค่าใช้จ่าย *</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">แหล่งเงินที่อนุญาตให้ใช้ *</label>
                    <select
                      value={expenseFundId}
                      onChange={(e) => setExpenseFundId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {funds.filter((f) => f.category !== 'zakat').map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} (คงเหลือ ฿{f.availableAmount.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนเงิน (บาท) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold"
                    />
                    {expenseAmount > 10000 && (
                      <p className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>ยอดเงินเกิน 10,000 บาท ต้องมีใบเสร็จ/อนุมัติแนบ</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ผู้รับเงิน / ร้านค้า / เจ้าหน้าที่ *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น บจก. ปตท. น้ำมัน, การไฟฟ้านครหลวง"
                      value={expensePayee}
                      onChange={(e) => setExpensePayee(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เลขที่ใบเสร็จ / ใบสำคัญอ้างอิง *</label>
                  <input
                    type="text"
                    required
                    value={expenseRefNo}
                    onChange={(e) => setExpenseRefNo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รายละเอียดการจ่าย</label>
                  <textarea
                    rows={2}
                    placeholder="รายละเอียด เช่น เติมน้ำมันรถยนต์ส่วนกลางทะเบียน ฮข-9821 ลงพื้นที่สำรวจ..."
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] px-6 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    ตรวจสอบข้อมูลและดำเนินการต่อ →
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Pre-Confirmation Summary for Admin Expense */}
      {showConfirmSummaryModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-amber-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-6 h-6 text-amber-200" />
                  <div>
                    <h3 className="font-bold text-lg leading-tight">สรุปข้อมูลค่าใช้จ่ายบริหารสำนักงาน</h3>
                    <p className="text-xs text-amber-100">โปรดตรวจสอบรายละเอียดและยอดเงินก่อนบันทึกจริง</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfirmSummaryModal(false)}
                  disabled={isSubmitting}
                  className="text-amber-200 hover:text-white p-1 text-lg font-bold"
                >✕</button>
              </div>

              <div className="p-6 space-y-4">
                {/* Large amount callout */}
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-center">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">ยอดค่าใช้จ่ายที่บันทึก</p>
                  <div className="text-3xl font-extrabold text-amber-800 font-mono mt-1">
                    ฿{expenseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                  </div>
                  <p className="text-xs text-amber-700 mt-1 font-medium">({expenseCategory})</p>
                </div>

                {expenseAmount > 10000 && (
                  <div className="bg-amber-100 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900">⚠️ แจ้งเตือนยอดค่าใช้จ่ายสูงเป็นพิเศษ (เกิน 10,000 บาท)</p>
                      <p className="mt-0.5 text-slate-700">รายการนี้มียอดเบิกจ่าย ฿{expenseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท ซึ่งเกินเกณฑ์ 10,000 บาท โปรดตรวจสอบใบเสร็จรับเงิน ใบกำกับภาษี หรือใบสำคัญจ่าย พร้อมการลงนามอนุมัติก่อนยืนยัน</p>
                    </div>
                  </div>
                )}

                {/* Summary Table */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">ผู้รับเงิน / ร้านค้า:</span>
                    <span className="font-bold text-slate-900 text-base">{expensePayee}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">หมวดหมู่ค่าใช้จ่าย:</span>
                    <span className="font-semibold text-slate-800">{expenseCategory}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">กองทุนต้นทาง:</span>
                    <span className="font-semibold text-slate-800">{funds.find(f => f.id === expenseFundId)?.name || expenseFundId}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">เลขที่เอกสารอ้างอิง:</span>
                    <span className="font-mono text-slate-700">{expenseRefNo}</span>
                  </div>
                  {expenseDescription && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 text-xs">รายละเอียด:</span>
                      <span className="text-slate-700 text-xs truncate max-w-[240px]">{expenseDescription}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 text-xs">ผู้บันทึกรายการ:</span>
                    <span className="text-slate-700 font-medium">{currentUser.name} ({currentUser.role})</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
                  <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>การรับรองความถูกต้อง:</strong> รายการนี้ตัดจ่ายจากกองทุนค่าดำเนินงานมูลนิธิ (ไม่กระทบเงินซะกาต 100%)
                  </p>
                </div>

                {/* Big Action Buttons */}
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowConfirmSummaryModal(false)}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-base transition-all"
                  >
                    ← แก้ไขข้อมูล
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinalExpense}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <Receipt className="w-5 h-5 text-amber-200" />
                        ยืนยันบันทึกรายจ่าย
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
