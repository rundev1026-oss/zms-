'use client';

import React, { useState, useEffect } from 'react';
import { FinancialTransaction, FundAccount, BankAccount, AssistanceApplication } from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import { 
  Heart, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Receipt, 
  User, 
  Home, 
  GraduationCap, 
  Briefcase, 
  Zap,
  TrendingDown,
  Building2,
  Clock,
  ArrowRight,
  RefreshCw,
  Wallet,
  FileCheck
} from 'lucide-react';

interface AidDisbursementsTabProps {
  currentUser: any;
  funds: FundAccount[];
  transactions: FinancialTransaction[];
  applications?: AssistanceApplication[];
  bankAccounts: BankAccount[];
  recordExpense: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export function AidDisbursementsTab({
  currentUser,
  funds,
  transactions,
  applications = [],
  bankAccounts,
  recordExpense,
  showToast,
  onRefresh,
}: AidDisbursementsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'history'>('queue');
  const [selectedAsnafFilter, setSelectedAsnafFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [approvedAppsList, setApprovedAppsList] = useState<any[]>([]);

  // Form states
  const [asnafCategory, setAsnafCategory] = useState('faqir_miskin');
  const [subFundCategory, setSubFundCategory] = useState('living');
  const [aidFormat, setAidFormat] = useState('ปัจจัยยังชีพ');
  const [fundId, setFundId] = useState('fund-1');
  const [amount, setAmount] = useState<number>(10000);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'promptpay_qr' | 'cash'>('bank_transfer');
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [referenceNo, setReferenceNo] = useState(`DISB-REF-${Date.now().toString().slice(-5)}`);
  const [notes, setNotes] = useState('');
  const [slipUrl, setSlipUrl] = useState('');

  // Fetch real approved / wait_disbursement applications from API
  const fetchApprovedApps = async () => {
    setIsLoadingApps(true);
    try {
      const res = await fetch('/api/finance/cash-flow?approved_apps=true');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setApprovedAppsList(json.data);
      }
    } catch (e) {
      console.error('Failed to load approved apps:', e);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchApprovedApps();
  }, []);

  // Combined applications pool
  const allApplications = approvedAppsList.length > 0 
    ? approvedAppsList 
    : applications.map(a => ({
        id: a.id,
        applicationNo: a.applicationNo,
        beneficiaryName: a.fullName,
        nationalId: a.nationalId || '-',
        asnafCategory: a.asnafCategory,
        assistanceType: 'เงินช่วยเหลือยังชีพ',
        approvedAmount: a.approvedAmount || a.requestedAmount,
        remainingAmount: a.approvedAmount || a.requestedAmount,
        status: a.status,
        approverId: (a as any).approverId,
        approvedBy: (a as any).approvedBy,
      }));

  // Handle Application Auto-fill if user selects from existing pending applications
  const handleSelectApplication = (appId: string) => {
    setApplicationId(appId);
    if (!appId) return;
    const app = allApplications.find((a) => a.id === appId);
    if (app) {
      setBeneficiaryName(app.beneficiaryName || 'ผู้ขอรับความช่วยเหลือ');
      setAmount(app.remainingAmount || app.approvedAmount || 10000);
      setAsnafCategory(app.asnafCategory || 'faqir_miskin');
      setSubFundCategory((app as any).specificFundCode || 'living');
      setAidFormat(app.assistanceType || 'ปัจจัยยังชีพ');
      setNotes(`จ่ายเงินสวัสดิการตามคำร้องเลขที่ ${app.applicationNo}`);
    }
  };

  const handleQuickDisburse = (app: any) => {
    setApplicationId(app.id);
    setBeneficiaryName(app.beneficiaryName || 'ผู้ขอรับความช่วยเหลือ');
    setAmount(app.remainingAmount || app.approvedAmount || 10000);
    setAsnafCategory(app.asnafCategory || 'faqir_miskin');
    setAidFormat(app.assistanceType || 'ปัจจัยยังชีพ');
    setNotes(`จ่ายเงินสวัสดิการตามคำร้องเลขที่ ${app.applicationNo}`);
    setReferenceNo(`DISB-REF-${Date.now().toString().slice(-5)}`);
    setShowAddModal(true);
  };

  // Check separation of duties for currently selected application
  const selectedAppObj = allApplications.find(a => a.id === applicationId);
  const isApproverBlocked = Boolean(
    selectedAppObj && (
      (selectedAppObj.approverId && selectedAppObj.approverId === currentUser.id) ||
      (selectedAppObj.approvedBy && selectedAppObj.approvedBy.trim() === currentUser.name?.trim())
    )
  );

  const [showConfirmSummaryModal, setShowConfirmSummaryModal] = useState(false);

  // Step 1: Validate and open confirmation summary
  const handlePrepareDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiaryName.trim() || amount <= 0 || !referenceNo.trim()) {
      showToast('กรุณาระบุชื่อผู้รับความช่วยเหลือ จำนวนเงิน และเลขอ้างอิงการจ่าย', 'error');
      return;
    }

    if (isApproverBlocked) {
      showToast('การละเมิด Separation of Duties: คุณเป็นผู้อนุมัติคำร้องนี้ ไม่สามารถเป็นผู้จ่ายเงินได้', 'error');
      return;
    }

    setShowConfirmSummaryModal(true);
  };

  // Step 2: Final confirmed disbursement
  const handleFinalDisbursement = async () => {
    setIsSubmitting(true);
    try {
      const categoryLabel = `จ่ายเงินสวัสดิการช่วยเหลือ (${aidFormat})`;
      const success = await recordExpense(
        fundId,
        categoryLabel,
        amount,
        beneficiaryName.trim(),
        notes.trim(),
        referenceNo.trim(),
        {
          bankAccountId: paymentMethod !== 'cash' ? bankAccountId : undefined,
          asnafCategory,
          subFundCategory,
          specificFundId: (selectedAppObj as any)?.specificFundId,
          assistanceTypeId: (selectedAppObj as any)?.assistanceTypeId,
          beneficiaryId: applicationId ? `ben-${applicationId}` : undefined,
          applicationId: applicationId || undefined,
        }
      );

      if (success) {
        setShowConfirmSummaryModal(false);
        setShowAddModal(false);
        setBeneficiaryName('');
        setApplicationId('');
        setNotes('');
        setReferenceNo(`DISB-REF-${Date.now().toString().slice(-5)}`);
        showToast(`ยืนยันการจ่ายเงินช่วยเหลือ ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท สำเร็จ`, 'success');
        onRefresh();
        fetchApprovedApps();
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกจ่ายเงิน', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered pending queue applications
  const pendingQueue = allApplications.filter((a) => {
    const isPending = a.status === 'wait_disbursement' || a.status === 'approved' || a.status === 'partially_disbursed';
    const matchesAsnaf = selectedAsnafFilter === 'all' || a.asnafCategory === selectedAsnafFilter;
    const matchesSearch =
      (a.applicationNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.beneficiaryName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.nationalId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.assistanceType || '').toLowerCase().includes(searchTerm.toLowerCase());
    return isPending && matchesAsnaf && matchesSearch;
  });

  // Filtered disbursements history
  const aidDisbursements = transactions.filter((t) => {
    const isDisb = (t.type === 'disbursement' || (t.type === 'expense' && t.category.includes('สวัสดิการ'))) && t.status !== 'reversed';
    const matchesAsnaf = selectedAsnafFilter === 'all' || t.asnafCategory === selectedAsnafFilter;
    const matchesSearch =
      t.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.payerOrPayee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.referenceNo.toLowerCase().includes(searchTerm.toLowerCase());

    return isDisb && matchesAsnaf && matchesSearch;
  });

  const totalDisbursed = aidDisbursements.reduce((sum, t) => sum + t.amount, 0);
  const totalPendingAmount = pendingQueue.reduce((sum, a) => sum + (a.remainingAmount || a.approvedAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-600" />
            ระบบเบิกจ่ายเงินช่วยเหลือและสวัสดิการ (Aid Disbursements & Welfare)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            เชื่อมโยงคำร้องขอรับความช่วยเหลือจริง แยกสิทธิ์การอนุมัติออกจากการจ่ายเงิน (Separation of Duties)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchApprovedApps();
              onRefresh();
              showToast('รีเฟรชข้อมูลคิวและรายการจ่ายเรียบร้อย', 'info');
            }}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl"
            title="รีเฟรช"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingApps ? 'animate-spin' : ''}`} />
          </button>
          {['super_admin', 'finance'].includes(currentUser.role) && (
            <button
              onClick={() => {
                setApplicationId('');
                setBeneficiaryName('');
                setAmount(10000);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              บันทึกจ่ายเงินช่วยเหลือ
            </button>
          )}
        </div>
      </div>

      {/* View Switcher Tabs: Queue vs History */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'queue'
              ? 'bg-[#0b2545] text-amber-300 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>คิวคำร้องรอเบิกจ่าย</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
            {pendingQueue.length} รายการ
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'history'
              ? 'bg-[#0b2545] text-amber-300 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>ประวัติการจ่ายเงินช่วยเหลือ</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            {aidDisbursements.length} รายการ
          </span>
        </button>
      </div>

      {/* Asnaf Filter Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
          กรองตามหมวดอัสนัฟ
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAsnafFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedAsnafFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setSelectedAsnafFilter('faqir_miskin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedAsnafFilter === 'faqir_miskin'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-800'
            }`}
          >
            ฟากีร–มิสกิน (70%)
          </button>
          <button
            onClick={() => setSelectedAsnafFilter('amil')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedAsnafFilter === 'amil'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            อามีลีน (12%)
          </button>
          <button
            onClick={() => setSelectedAsnafFilter('muallaf')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedAsnafFilter === 'muallaf'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            มุสลิมใหม่ (3%)
          </button>
          <button
            onClick={() => setSelectedAsnafFilter('gharimin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedAsnafFilter === 'gharimin'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-800'
            }`}
          >
            หนี้สินล้นตัว (3%)
          </button>
          <button
            onClick={() => setSelectedAsnafFilter('fisabilillah')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedAsnafFilter === 'fisabilillah'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800'
            }`}
          >
            ฟีสาบิลิลละฮฺ (7%)
          </button>
          <button
            onClick={() => setSelectedAsnafFilter('ibnsabil')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedAsnafFilter === 'ibnsabil'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800'
            }`}
          >
            ผู้เดินทาง (1%)
          </button>
          <button
            onClick={() => setSelectedAsnafFilter('humanitarian')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedAsnafFilter === 'humanitarian'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-800'
            }`}
          >
            มนุษยธรรม (4%)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={activeSubTab === 'queue' ? "ค้นหาเลขคำร้อง, ผู้ขอรับความช่วยเหลือ..." : "ค้นหาตามเลขที่, ผู้รับการช่วยเหลือ..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="text-xs text-slate-600 font-medium">
          {activeSubTab === 'queue' ? (
            <>ยอดเงินรอเบิกจ่ายรวม: <span className="font-bold text-amber-700 font-mono text-sm">฿{totalPendingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></>
          ) : (
            <>ยอดรวมจ่ายช่วยเหลือที่แสดง: <span className="font-bold text-slate-900 font-mono text-sm">฿{totalDisbursed.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></>
          )}
        </div>
      </div>

      {/* Content View 1: Pending Queue */}
      {activeSubTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="p-3.5">เลขที่คำร้อง</th>
                  <th className="p-3.5">ผู้ขอรับความช่วยเหลือ</th>
                  <th className="p-3.5">หมวดอัสนัฟ</th>
                  <th className="p-3.5">ประเภทการช่วยเหลือ</th>
                  <th className="p-3.5">พื้นที่ / สังกัด</th>
                  <th className="p-3.5 text-right">ยอดอนุมัติ</th>
                  <th className="p-3.5 text-right">ยอดคงเหลือรอจ่าย</th>
                  <th className="p-3.5 text-center">สถานะ</th>
                  <th className="p-3.5 text-center">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {pendingQueue.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      ไม่พบคำร้องที่รอการเบิกจ่ายตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  pendingQueue.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-semibold text-slate-900">{app.applicationNo}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{app.beneficiaryName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">บัตร ปชช: {app.nationalId}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                          {app.asnafCategory === 'faqir_miskin' || app.asnafCategory === 'faqir' || app.asnafCategory === 'miskin' ? 'ฟากีร–มิสกิน' : app.asnafCategory}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{app.assistanceType || 'เงินช่วยเหลือยังชีพ'}</td>
                      <td className="p-3.5 text-slate-500">{app.areaInfo || '-'}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700">
                        ฿{(app.approvedAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                        ฿{(app.remainingAmount || app.approvedAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          รอเบิกจ่าย
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {['super_admin', 'finance'].includes(currentUser.role) ? (
                          <button
                            onClick={() => handleQuickDisburse(app)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                          >
                            <span>เบิกจ่ายเงิน</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">เฉพาะการเงิน</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content View 2: Disbursements History */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="p-3.5">เลขที่รายการ</th>
                  <th className="p-3.5">วันที่จ่าย</th>
                  <th className="p-3.5">หมวดอัสนัฟ</th>
                  <th className="p-3.5">ผู้รับความช่วยเหลือ</th>
                  <th className="p-3.5">รูปแบบความช่วยเหลือ</th>
                  <th className="p-3.5">กองทุนต้นทาง</th>
                  <th className="p-3.5">ช่องทางจ่าย</th>
                  <th className="p-3.5 text-right">จำนวนเงิน</th>
                  <th className="p-3.5">ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {aidDisbursements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      ไม่พบรายการจ่ายเงินช่วยเหลือตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  aidDisbursements.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-semibold text-slate-900">{t.transactionNo}</td>
                      <td className="p-3.5 font-medium">{t.date}</td>
                      <td className="p-3.5 font-medium">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                          {t.asnafCategory === 'faqir_miskin' || t.asnafCategory === 'faqir' || t.asnafCategory === 'miskin' ? 'ฟากีร–มิสกิน' : t.asnafCategory || 'ซะกาตช่วยเหลือ'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{t.payerOrPayee}</td>
                      <td className="p-3.5 text-slate-600">{t.category}</td>
                      <td className="p-3.5 text-slate-500">{t.fundName.split(' ')[0]}</td>
                      <td className="p-3.5 text-slate-500">
                        {t.paymentMethod === 'bank_transfer' ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Building2 className="w-3 h-3 text-sky-600" /> โอนธนาคาร
                          </span>
                        ) : t.paymentMethod === 'promptpay_qr' ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Zap className="w-3 h-3 text-indigo-600" /> PromptPay
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <Wallet className="w-3 h-3 text-emerald-600" /> เงินสด
                          </span>
                        )}
                      </td>
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
      )}

      {/* Modal: Add Disbursement */}
      {showAddModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-600" />
                  บันทึกการจ่ายเงินช่วยเหลือสวัสดิการ
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <form onSubmit={handlePrepareDisbursement} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Separation of Duties Warning if approver tries to disburse */}
                {isApproverBlocked && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">การละเมิดหลักการแบ่งแยกหน้าที่ (Separation of Duties):</p>
                      <p className="mt-0.5 text-[11px] text-rose-700">
                        คุณคือผู้อนุมัติคำร้องนี้ ({selectedAppObj?.approvedBy}) จึงไม่มีสิทธิ์ทำรายการเบิกจ่ายเงินด้วยตนเอง กรุณาให้เจ้าหน้าที่การเงินท่านอื่นดำเนินการแทนเพื่อความโปร่งใส
                      </p>
                    </div>
                  </div>
                )}

                {/* Link to Application if available */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลือกคำร้องขอความช่วยเหลือที่ได้รับอนุมัติ (Queue: {allApplications.length} รายการ)
                  </label>
                  <select
                    value={applicationId}
                    onChange={(e) => handleSelectApplication(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                  >
                    <option value="">-- บันทึกแบบระบุรายชื่อโดยตรง --</option>
                    {allApplications
                      .filter((a) => a.status === 'wait_disbursement' || a.status === 'approved' || a.status === 'partially_disbursed')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.applicationNo} - {a.beneficiaryName} (อนุมัติ ฿{(a.approvedAmount || 0).toLocaleString()} บาท)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดอัสนัฟ *</label>
                    <select
                      value={asnafCategory}
                      onChange={(e) => setAsnafCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="faqir_miskin">ฟากีร–มิสกิน (70%)</option>
                      <option value="amil">อามีลีน (12%)</option>
                      <option value="muallaf">มุสลิมใหม่ (3%)</option>
                      <option value="gharimin">ผู้มีหนี้สินล้นตัว (3%)</option>
                      <option value="fisabilillah">ฟีสาบิลิลละฮฺ (7%)</option>
                      <option value="ibnsabil">ผู้เดินทาง (1%)</option>
                      <option value="humanitarian">มนุษยธรรม (4%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">รูปแบบความช่วยเหลือ *</label>
                    <select
                      value={aidFormat}
                      onChange={(e) => setAidFormat(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="ปัจจัยยังชีพ">ปัจจัยยังชีพ</option>
                      <option value="ปัจจัยยังชีพรายเดือน">ปัจจัยยังชีพรายเดือน</option>
                      <option value="ซ่อมและสร้างที่อยู่อาศัย">ซ่อมและสร้างที่อยู่อาศัย</option>
                      <option value="สนับสนุนอาชีพ">สนับสนุนอาชีพ</option>
                      <option value="ทุนการศึกษา">ทุนการศึกษา</option>
                      <option value="ช่วยเหลือฉุกเฉิน">ช่วยเหลือฉุกเฉิน</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้รับความช่วยเหลือ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นางมัยมูนะฮ์ หวังดี"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนเงินช่วยเหลือ (บาท) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold text-rose-600"
                    />
                    {amount > 10000 && (
                      <p className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>ยอดเงินเกิน 10,000 บาท ต้องมีเอกสารอนุมัติกำกับ</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">กองทุนต้นทาง *</label>
                    <select
                      value={fundId}
                      onChange={(e) => setFundId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {funds.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} (คงเหลือ ฿{f.availableAmount.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ช่องทางจ่ายเงิน *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="bank_transfer">โอนเงินผ่านธนาคาร</option>
                      <option value="promptpay_qr">PromptPay</option>
                      <option value="cash">เงินสด (Cash Float / สำรองจ่าย)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">บัญชีธนาคารต้นทาง</label>
                    <select
                      disabled={paymentMethod === 'cash'}
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                    >
                      {bankAccounts.filter((b) => b.status === 'active').map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.accountName.split('—')[0]} (คงเหลือ ฿{b.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเลขอ้างอิงสลิป / ใบสำคัญจ่าย *</label>
                  <input
                    type="text"
                    required
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isApproverBlocked}
                    className="min-h-[44px] px-6 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    {isApproverBlocked ? 'ไม่อนุญาต (เป็นผู้อนุมัติ)' : 'ตรวจสอบข้อมูลและดำเนินการต่อ →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Pre-Confirmation Summary (ขั้นตอนที่ 8: แสดงหน้าสรุปยอดและผู้รับเงินก่อนยืนยันจริง) */}
      {showConfirmSummaryModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-200" />
                  <div>
                    <h3 className="font-bold text-lg leading-tight">สรุปข้อมูลก่อนยืนยันจ่ายเงินจริง</h3>
                    <p className="text-xs text-emerald-100">โปรดตรวจสอบความถูกต้องของผู้รับเงินและยอดเงิน</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfirmSummaryModal(false)}
                  disabled={isSubmitting}
                  className="text-emerald-200 hover:text-white p-1 text-lg font-bold"
                >✕</button>
              </div>

              <div className="p-6 space-y-4">
                {/* Large amount callout */}
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-center">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">ยอดเงินที่ต้องจ่ายสุทธิ</p>
                  <div className="text-3xl font-extrabold text-emerald-700 font-mono mt-1">
                    ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                  </div>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">({aidFormat} • {asnafCategory === 'faqir_miskin' ? 'ฟากีร–มิสกิน' : asnafCategory})</p>
                </div>

                {amount > 10000 && (
                  <div className="bg-amber-100 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900">⚠️ แจ้งเตือนยอดเงินสูงเป็นพิเศษ (เกิน 10,000 บาท)</p>
                      <p className="mt-0.5 text-slate-700">ยอดจ่ายนี้มีมูลค่า ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท ซึ่งเกินเกณฑ์ 10,000 บาท โปรดตรวจสอบเอกสารอนุมัติ ลายมือชื่อ และหลักฐานของผู้รับอย่างรอบคอบก่อนทำรายการ</p>
                    </div>
                  </div>
                )}

                {/* Summary Table */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">ผู้รับความช่วยเหลือ:</span>
                    <span className="font-bold text-slate-900 text-base">{beneficiaryName}</span>
                  </div>
                  {applicationId && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 text-xs">เลขอ้างอิงคำร้อง:</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedAppObj?.applicationNo || applicationId}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">กองทุนต้นทาง:</span>
                    <span className="font-semibold text-slate-800">{funds.find(f => f.id === fundId)?.name || fundId}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">ช่องทางการจ่าย:</span>
                    <span className="font-semibold text-slate-800">
                      {paymentMethod === 'bank_transfer' ? 'โอนเงินผ่านธนาคาร' : paymentMethod === 'promptpay_qr' ? 'PromptPay QR' : 'เงินสด (Cash)'}
                      {paymentMethod !== 'cash' && bankAccounts.find(b => b.id === bankAccountId) && ` (${bankAccounts.find(b => b.id === bankAccountId)?.accountName.split('—')[0]})`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">เลขอ้างอิงใบสำคัญ:</span>
                    <span className="font-mono text-slate-700">{referenceNo}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 text-xs">ผู้บันทึกจ่ายเงิน:</span>
                    <span className="text-slate-700 font-medium">{currentUser.name} ({currentUser.role === 'finance' ? 'เจ้าหน้าที่การเงิน' : currentUser.role})</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>คำเตือน:</strong> เมื่อกดยืนยันแล้ว ระบบจะบันทึกตัดยอดเงินจริงทันที และอัปเดตสถานะคำร้องเป็น "จ่ายแล้ว" โดยไม่สามารถลบธุรกรรมได้
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
                    onClick={handleFinalDisbursement}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        กำลังบันทึกจ่ายเงิน...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                        ยืนยันการจ่ายเงินจริง
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
