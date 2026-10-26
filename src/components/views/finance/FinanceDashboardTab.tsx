'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building, 
  Wallet, 
  PieChart as PieChartIcon, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  ShieldCheck, 
  ChevronRight, 
  RefreshCw, 
  Eye, 
  FileSpreadsheet,
  HeartHandshake,
  ArrowRight,
  Search,
  ExternalLink,
  RotateCcw,
  Receipt,
  FileText,
  UserCheck,
  FileCheck2,
  X
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/common/Modal';
import { AidDrillDownItem } from '@/types';

interface FinanceDashboardTabProps {
  onNavigateTab: (tabKey: string) => void;
}

export function FinanceDashboardTab({ onNavigateTab }: FinanceDashboardTabProps) {
  const { funds, transactions, currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [zakatYear, setZakatYear] = useState('2569');
  const [moneyType, setMoneyType] = useState('all');
  const [bankAccountId, setBankAccountId] = useState('all');
  const [asnaf, setAsnaf] = useState('all');
  const [fundId, setFundId] = useState('all');

  const [activeChartTab, setActiveChartTab] = useState<'asnaf' | 'assistance_type' | 'faqir_miskin' | 'monthly' | 'admin'>('asnaf');

  // Task 4 Drill-down Modal state
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownSubtitle, setDrillDownSubtitle] = useState('');
  const [drillDownItems, setDrillDownItems] = useState<AidDrillDownItem[]>([]);
  const [drillDownSearch, setDrillDownSearch] = useState('');

  const openDrillDown = (title: string, subtitle: string, items: AidDrillDownItem[]) => {
    setDrillDownTitle(title);
    setDrillDownSubtitle(subtitle);
    setDrillDownItems(items || []);
    setDrillDownSearch('');
    setDrillDownModalOpen(true);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (zakatYear && zakatYear !== 'all') params.append('zakatYear', zakatYear);
      if (moneyType && moneyType !== 'all') params.append('moneyType', moneyType);
      if (bankAccountId && bankAccountId !== 'all') params.append('bankAccountId', bankAccountId);
      if (asnaf && asnaf !== 'all') params.append('asnaf', asnaf);
      if (fundId && fundId !== 'all') params.append('fundId', fundId);

      const res = await fetch(`/api/finance/dashboard?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [zakatYear, moneyType, bankAccountId, asnaf, fundId]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const handleResetFilter = () => {
    setDateFrom('');
    setDateTo('');
    setZakatYear('2569');
    setMoneyType('all');
    setBankAccountId('all');
    setAsnaf('all');
    setFundId('all');
  };

  const kpi = data?.kpi || {
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalBankBalance: 0,
    totalCashOnHand: 0,
    totalAllocatedBudget: 0,
    totalDisbursedAid: 0,
    totalAvailableFunds: 0,
    pendingApprovalsCount: 0,
    pendingReconciliationsCount: 0,
    totalVerifiedAidDisbursed: 0,
    totalHandedOverToCaseWorkers: 0,
    inProgressAssistanceAmount: 0,
    completedAssistanceAmount: 0,
    unspentHeldAmount: 0,
    totalRefundedAmount: 0,
    unclearedAmount: 0,
    missingProofCount: 0,
    missingProofAmount: 0,
  };

  const verifiedAid = data?.verifiedAid || {
    totalVerifiedAidDisbursed: 0,
    totalHandedOverToCaseWorkers: 0,
    inProgressAssistanceAmount: 0,
    completedAssistanceAmount: 0,
    unspentHeldAmount: 0,
    totalRefundedAmount: 0,
    unclearedAmount: 0,
    missingProofCount: 0,
    missingProofAmount: 0,
    breakdownByAsnaf: [],
    breakdownByAssistanceType: [],
    refundRecords: [],
    missingProofItems: [],
    drillDown: {
      verifiedAidItems: [],
      handedOverItems: [],
      inProgressItems: [],
      completedItems: [],
      unspentHeldItems: [],
      refundItems: [],
      missingProofItems: [],
    },
  };

  const charts = data?.charts || {
    incomeVsExpense: [],
    asnafAllocations: [],
    faqirMiskinSubFunds: [],
    adminExpenses: [],
    assistanceTypes: [],
  };

  const tables = data?.tables || {
    recentIncomes: [],
    recentExpenses: [],
    incompleteWorkflows: [],
    bankAccounts: [],
    funds: [],
    missingProofItems: [],
    refundRecords: [],
  };

  const operationalOverview = data?.operationalOverview || {
    cashOnHand: {
      title: 'เงินสดคงเหลือตรวจนับ',
      amount: kpi.totalCashOnHand,
      count: 0,
      description: 'เงินสดในตู้นิรภัยเหรัญญิกและเงินสดระหว่างดำเนินการ',
      targetTab: 'cash_flow',
    },
    pendingApprovals: {
      title: 'รายการรออนุมัติ',
      amount: 0,
      count: kpi.pendingApprovalsCount,
      description: 'ขั้นตอนเบิกเงินสดและใบสำคัญที่รออนุมัติ',
      targetTab: 'cash_flow',
    },
    pendingHandovers: {
      title: 'รายการรอส่งมอบให้ผู้ดูแลเคส',
      amount: 0,
      count: 0,
      description: 'ใบสำคัญที่เบิกแล้ว อยู่ระหว่างรอส่งมอบให้อาสาสมัคร',
      targetTab: 'cash_flow',
    },
    pendingAssistanceConfirmations: {
      title: 'รายการรอยืนยันการช่วยเหลือ',
      amount: verifiedAid.inProgressAssistanceAmount,
      count: verifiedAid.drillDown.inProgressItems?.length || 0,
      description: 'ส่งมอบเงินแล้ว รอลงพื้นที่และยืนยันหลักฐานผลการช่วย',
      targetTab: 'aid_expenses',
    },
    pendingPettyClearances: {
      title: 'รายการรอเคลียร์เงินสำนักงาน',
      amount: 0,
      count: 0,
      description: 'เงินสำรองจ่ายสำนักงานที่อยู่ระหว่างรอรวบรวมใบเสร็จ',
      targetTab: 'cash_flow',
    },
    recentDisbursements: {
      title: 'ประวัติการจ่ายล่าสุด',
      amount: verifiedAid.totalVerifiedAidDisbursed,
      count: 0,
      description: 'บันทึกรายจ่ายจริงที่ยืนยันผลแล้วล่าสุด',
      items: [],
      targetTab: 'cash_flow',
    },
  };

  // Filter items in modal by search query
  const modalFilteredItems = (drillDownItems || []).filter((item: AidDrillDownItem) => {
    if (!drillDownSearch.trim()) return true;
    const q = drillDownSearch.toLowerCase();
    return (
      (item.beneficiaryName || '').toLowerCase().includes(q) ||
      (item.applicationNo || '').toLowerCase().includes(q) ||
      (item.disbursementRef || '').toLowerCase().includes(q) ||
      (item.caseWorkerName || '').toLowerCase().includes(q) ||
      (item.delivererName || '').toLowerCase().includes(q) ||
      (item.asnafName || '').toLowerCase().includes(q) ||
      (item.assistanceTypeName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Dashboard ศูนย์ข้อมูลการเงินและงบประมาณ</h2>
                <p className="text-xs text-slate-500">
                  ระบบวิเคราะห์กระแสเงินสด จัดสรร 8 อัสนัฟ ควบคุมยอดคงค้าง และติดตามความโปร่งใสแบบ Real-time
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรชข้อมูล
            </button>
            <button
              onClick={() => onNavigateTab('reports')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              ดูรายงานทางการเงิน
            </button>
          </div>
        </div>

        {/* Section A: Comprehensive Filters */}
        <form onSubmit={handleApplyFilter} className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">รอบปีซะกาต</label>
            <select
              value={zakatYear}
              onChange={(e) => setZakatYear(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            >
              <option value="all">ทุกปีรอบบัญชี</option>
              <option value="2569">2569 (1448 H)</option>
              <option value="2568">2568 (1447 H)</option>
              <option value="2567">2567 (1446 H)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">ประเภทเงิน</label>
            <select
              value={moneyType}
              onChange={(e) => setMoneyType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            >
              <option value="all">ทุกประเภทเงิน</option>
              <option value="zakat">เงินซะกาต</option>
              <option value="sadaqah">ศอดะเกาะฮ์ทั่วไป</option>
              <option value="operational_admin">สำหรับบริหาร</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">บัญชีธนาคาร</label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 truncate"
            >
              <option value="all">ทุกบัญชีธนาคาร</option>
              {tables.bankAccounts?.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} - {b.accountName.split('—')[0]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">หมวดอัสนัฟ</label>
            <select
              value={asnaf}
              onChange={(e) => setAsnaf(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            >
              <option value="all">ทุกอัสนัฟ (8 หมวด)</option>
              <option value="ฟากีร-มิสกิน">ฟากีร-มิสกิน</option>
              <option value="อามีลีน">อามีลีน</option>
              <option value="มุอัลลัฟ">มุอัลลัฟ</option>
              <option value="อัล-ฆอรีมีน">อัล-ฆอรีมีน</option>
              <option value="ฟีซะบีลิลลาฮ์">ฟีซะบีลิลลาฮ์</option>
              <option value="อิบนุสสะบีล">อิบนุสสะบีล</option>
              <option value="มนุษยธรรม">มนุษยธรรม</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">ตั้งแต่วันที่</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">ถึงวันที่</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden"
            />
          </div>

          <div className="flex items-end gap-1.5">
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition-colors shadow-xs"
            >
              กรองข้อมูล
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-2.5 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="ล้างตัวกรอง"
            >
              ล้าง
            </button>
          </div>
        </form>
      </div>


      {/* ========================================================================= */}
      {/* TASK 5: ศูนย์รวมงานปฏิบัติการและสถานะการเงิน (Operational Action Hub)   */}
      {/* 6 ข้อมูลสำคัญพร้อมปุ่ม "ดูรายการ" ตรงไปตามแต่ละงาน เพื่อความสะดวกของผู้สูงวัย/ผู้ใช้งาน  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              ศูนย์รวมงานปฏิบัติการและสถานะการเงิน (Operational Action Hub)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงสถานะงานสำคัญ 6 ด้าน ติดตามรายการค้างดำเนินการ และกดเข้าสู่หน้างานที่เกี่ยวข้องได้ทันที
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 self-start sm:self-auto">
            อัปเดตข้อมูลอัตโนมัติแบบ Real-time
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: เงินสดคงเหลือ (Cash on Hand) */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/80 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  เงินสดพร้อมใช้
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mt-3">1. เงินสดคงเหลือ</h4>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                เงินสดในตู้นิรภัยเหรัญญิกสำหรับหมุนเวียนช่วยเหลือฉุกเฉิน
              </p>
              <div className="mt-3 text-2xl font-black text-emerald-900 font-mono">
                ฿{operationalOverview.cashOnHand.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">
                ตรวจนับแล้ว {operationalOverview.cashOnHand.count} รอบรายการ
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab(operationalOverview.cashOnHand.targetTab || 'cash_flow')}
              className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-xs cursor-pointer transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              ดูรายการ
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: รายการรออนุมัติ (Pending Approvals) */}
          <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/80 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Clock className="w-5 h-5" />
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  operationalOverview.pendingApprovals.count > 0
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {operationalOverview.pendingApprovals.count > 0 ? 'รอการอนุมัติ' : 'ไม่มีรายการค้าง'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mt-3">2. รายการรออนุมัติ</h4>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                ขั้นตอนเบิกเงินสดและใบสำคัญจ่ายที่รอผู้มีอำนาจอนุมัติ
              </p>
              <div className="mt-3 text-2xl font-black text-amber-900 font-mono">
                {operationalOverview.pendingApprovals.count} <span className="text-base font-bold text-amber-800 font-sans">รายการ</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-1">
                ยอดเงินรวม ฿{operationalOverview.pendingApprovals.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab(operationalOverview.pendingApprovals.targetTab || 'cash_flow')}
              className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-sm shadow-xs cursor-pointer transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              ดูรายการ
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: รายการรอส่งมอบ (Pending Handovers) */}
          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200/80 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  operationalOverview.pendingHandovers.count > 0
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <UserCheck className="w-3.5 h-3.5" />
                  {operationalOverview.pendingHandovers.count > 0 ? 'รอส่งมอบให้อาสา' : 'ส่งมอบครบแล้ว'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mt-3">3. รายการรอส่งมอบ</h4>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                เบิกเงินสดแล้ว อยู่ระหว่างรอส่งมอบเงินให้ผู้ดูแลเคส
              </p>
              <div className="mt-3 text-2xl font-black text-blue-900 font-mono">
                {operationalOverview.pendingHandovers.count} <span className="text-base font-bold text-blue-800 font-sans">รายการ</span>
              </div>
              <div className="text-[11px] text-blue-700 font-medium mt-1">
                ยอดเงินรอส่งมอบ ฿{operationalOverview.pendingHandovers.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab(operationalOverview.pendingHandovers.targetTab || 'cash_flow_handovers')}
              className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-xs cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              ดูรายการ
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 4: รายการรอยืนยันการช่วยเหลือ (Pending Assistance Confirmations) */}
          <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-200/80 shadow-2xs flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  operationalOverview.pendingAssistanceConfirmations.count > 0
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <Calendar className="w-3.5 h-3.5" />
                  {operationalOverview.pendingAssistanceConfirmations.count > 0 ? 'อยู่ระหว่างลงพื้นที่' : 'ยืนยันครบถ้วน'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mt-3">4. รายการรอยืนยันการช่วยเหลือ</h4>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                ส่งมอบเงินแล้ว อยู่ระหว่างลงพื้นที่และยืนยันหลักฐานผลการช่วย
              </p>
              <div className="mt-3 text-2xl font-black text-indigo-900 font-mono">
                {operationalOverview.pendingAssistanceConfirmations.count} <span className="text-base font-bold text-indigo-800 font-sans">เคส</span>
              </div>
              <div className="text-[11px] text-indigo-700 font-medium mt-1">
                ยอดเงินหมุนเวียน ฿{operationalOverview.pendingAssistanceConfirmations.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab(operationalOverview.pendingAssistanceConfirmations.targetTab || 'aid_expenses')}
              className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold text-sm shadow-xs cursor-pointer transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              ดูรายการ
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 5: รายการรอเคลียร์เงินสำนักงาน (Pending Office Clearances) */}
          <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-200/80 shadow-2xs flex flex-col justify-between hover:border-rose-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="p-2 bg-rose-100 text-rose-800 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  operationalOverview.pendingPettyClearances.count > 0
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <FileText className="w-3.5 h-3.5" />
                  {operationalOverview.pendingPettyClearances.count > 0 ? 'รอส่งใบเสร็จ/คืนเงิน' : 'เคลียร์ครบถ้วน'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mt-3">5. รายการรอเคลียร์เงินสำนักงาน</h4>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                เงินสำรองจ่ายค่าใช้จ่ายสำนักงานที่รอเคลียร์ใบเสร็จหรือคืนเงินทอน
              </p>
              <div className="mt-3 text-2xl font-black text-rose-900 font-mono">
                {operationalOverview.pendingPettyClearances.count} <span className="text-base font-bold text-rose-800 font-sans">รายการ</span>
              </div>
              <div className="text-[11px] text-rose-700 font-medium mt-1">
                ยอดรอเคลียร์ ฿{operationalOverview.pendingPettyClearances.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab(operationalOverview.pendingPettyClearances.targetTab || 'cash_flow_history')}
              className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold text-sm shadow-xs cursor-pointer transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            >
              ดูรายการ
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 6: ประวัติการจ่ายล่าสุด (Recent Disbursements) */}
          <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-200/80 shadow-2xs flex flex-col justify-between hover:border-teal-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <FileCheck2 className="w-5 h-5" />
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  จ่ายจริงสมบูรณ์
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mt-3">6. ประวัติการจ่ายล่าสุด</h4>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                ประวัติการจ่ายเงินช่วยเหลือและค่าใช้จ่ายสำนักงานรวมในหน้าเดียว
              </p>
              <div className="mt-3 text-2xl font-black text-teal-900 font-mono">
                ฿{operationalOverview.recentDisbursements.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-teal-700 font-medium mt-1">
                บันทึกจ่ายแล้ว {operationalOverview.recentDisbursements.count} รายการ
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab(operationalOverview.recentDisbursements.targetTab || 'cash_flow_history')}
              className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-sm shadow-xs cursor-pointer transition-colors focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            >
              ดูรายการ
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Highlights of Recent 5 Disbursements if available */}
        {operationalOverview.recentDisbursements.items && operationalOverview.recentDisbursements.items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                ตัวอย่าง 5 รายการจ่ายจริงล่าสุด:
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab('cash_flow_history')}
                className="text-xs text-teal-700 font-bold hover:underline inline-flex items-center gap-1"
              >
                ดูประวัติทั้งหมด ({operationalOverview.recentDisbursements.count} รายการ)
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {operationalOverview.recentDisbursements.items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateTab('cash_flow_history')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 cursor-pointer transition-all text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{item.voucherNo}</span>
                    <span>{item.date?.slice(0, 10)}</span>
                  </div>
                  <div className="font-bold text-slate-800 truncate mt-1">
                    {item.payeeName}
                  </div>
                  <div className="text-[11px] font-extrabold text-teal-800 font-mono mt-0.5">
                    ฿{item.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TASK 4: VERIFIED AID EXPENSES, SEGREGATION & RECONCILIATION BANNER        */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-5 text-white shadow-md border border-emerald-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  ระบบคำนวณและตรวจสอบรายจ่ายจากการช่วยเหลือจริง (Verified Aid Execution)
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Reconciled & Audited
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  แยกการเคลื่อนย้ายสภาพคล่อง (เบิกเงินสด) การส่งมอบสิทธิ์ถือครอง (ผู้ดูแลเคส) และการช่วยเหลือจริงที่ยืนยันผลพร้อมหลักฐาน (Zero Double-Counting)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openDrillDown(
                'รายการรายจ่ายช่วยเหลือที่ยืนยันผลแล้วทั้งหมด',
                `รอบปีซะกาต ${zakatYear} — กระทบยอดธุรกรรมจริงที่ผ่านการช่วยเหลือและมีหลักฐานครบถ้วน`,
                verifiedAid.drillDown.verifiedAidItems
              )}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              ดูรายการแจกแจงทั้งหมด ({verifiedAid.drillDown.verifiedAidItems.length} รายการ)
            </button>
          </div>
        </div>

        {/* 3-Step Segregation Process & Custody Flow */}
        <div className="mt-4 p-3.5 bg-white/5 rounded-xl border border-white/10 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">ขั้นที่ 1 เคลื่อนย้ายสภาพคล่อง</div>
              <div className="text-slate-200 font-medium">เบิกเงินสดธนาคาร → เหรัญญิก</div>
              <div className="text-[10px] text-emerald-400">เงินสดตรวจนับ ฿{kpi.totalCashOnHand.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">ขั้นที่ 2 ส่งมอบสิทธิ์ถือครอง</div>
              <div className="text-blue-300 font-bold">฿{verifiedAid.totalHandedOverToCaseWorkers.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
              <div className="text-[10px] text-slate-400">ส่งมอบให้อาสา/จนท. ผู้ดูแลเคส</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">ขั้นที่ 3 ช่วยเหลือจริง & หลักฐาน</div>
              <div className="text-teal-300 font-bold">฿{verifiedAid.totalVerifiedAidDisbursed.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
              <div className="text-[10px] text-slate-400">ยืนยันผลพร้อมแนบหลักฐานจริง</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-black/20 p-2.5 rounded-lg border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              ∑
            </div>
            <div>
              <div className="text-[10px] text-amber-300 uppercase tracking-wider font-semibold">เงินสดคงค้างรอเคลียร์ (Unspent)</div>
              <div className="text-amber-400 font-bold">฿{verifiedAid.unspentHeldAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
              <div className="text-[9px] text-slate-400">= ส่งมอบ - ช่วยเหลือแล้ว - ส่งคืน</div>
            </div>
          </div>
        </div>

        {/* 4 Interactive Task 4 Metric Cards */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Verified Disbursed */}
          <div 
            onClick={() => openDrillDown(
              'รายการรายจ่ายช่วยเหลือที่ยืนยันผลแล้ว (Verified Disbursed Aid)',
              'ธุรกรรมการจ่ายเงินช่วยเหลือจริงที่ผู้ดูแลเคสส่งมอบและยืนยันผลสำเร็จตามเกณฑ์มูลนิธิ (Zero Double-Counting)',
              verifiedAid.drillDown.verifiedAidItems
            )}
            className="bg-white/10 hover:bg-white/15 p-3.5 rounded-xl border border-emerald-400/30 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                รายจ่ายช่วยเหลือยืนยันผลแล้ว
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-xl font-bold text-white mt-1.5 font-mono">
              ฿{verifiedAid.totalVerifiedAidDisbursed.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-300">
              <span className="text-emerald-300">เสร็จสิ้น ฿{verifiedAid.completedAssistanceAmount.toLocaleString()}</span>
              <span>•</span>
              <span className="text-amber-300">ระหว่างงวด ฿{verifiedAid.inProgressAssistanceAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Card 2: Handed Over to Case Workers */}
          <div 
            onClick={() => openDrillDown(
              'รายการส่งมอบเงินสดให้ผู้ดูแลเคส (Handed-Over Cash to Caregivers)',
              'เงินสดที่ฝ่ายการเงินส่งมอบให้อาสาสมัครและเจ้าหน้าที่เคสเพื่อนำไปช่วยเหลือผู้รับประโยชน์',
              verifiedAid.drillDown.handedOverItems
            )}
            className="bg-white/10 hover:bg-white/15 p-3.5 rounded-xl border border-blue-400/30 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-blue-400" />
                เงินสดส่งมอบให้ผู้ดูแลเคส
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-xl font-bold text-white mt-1.5 font-mono">
              ฿{verifiedAid.totalHandedOverToCaseWorkers.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[10px] text-slate-300">
              ถือครองโดยผู้ดูแลเคสเพื่อรอส่งมอบ ({verifiedAid.drillDown.handedOverItems.length} เคส)
            </div>
          </div>

          {/* Card 3: Unspent Held Cash */}
          <div 
            onClick={() => openDrillDown(
              'เงินสดคงค้างในมือผู้ดูแลเคส (Unspent Held Cash)',
              'ยอดเงินสดที่ผู้ดูแลเคสยังถือครองอยู่ รอส่งมอบงวดถัดไปหรือบันทึกส่งคืนเข้ากองทุน',
              verifiedAid.drillDown.unspentHeldItems
            )}
            className="bg-white/10 hover:bg-white/15 p-3.5 rounded-xl border border-amber-400/30 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-400" />
                เงินสดคงค้างในมือผู้ดูแล
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-xl font-bold text-amber-300 mt-1.5 font-mono">
              ฿{verifiedAid.unspentHeldAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[10px] text-slate-300">
              {verifiedAid.unspentHeldAmount === 0 ? '✓ เคลียร์เงินสดครบถ้วน 0.00 บาท' : 'รอส่งมอบงวดต่อไปหรือส่งคืน'}
            </div>
          </div>

          {/* Card 4: Assistance Refunds */}
          <div 
            onClick={() => openDrillDown(
              'ประวัติการส่งคืนเงินช่วยเหลือเข้ากองทุน (Assistance Refunds)',
              'รายการเงินสดที่ผู้ดูแลเคสส่งคืนเนื่องจากใช้ไม่หมดหรือยกเลิกการช่วยเหลือ บันทึกกลับรายการเข้ากองทุนจริง',
              verifiedAid.drillDown.refundItems
            )}
            className="bg-white/10 hover:bg-white/15 p-3.5 rounded-xl border border-purple-400/30 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-purple-400" />
                ส่งคืนเงินเข้ากองทุน (Refunds)
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-xl font-bold text-white mt-1.5 font-mono">
              ฿{verifiedAid.totalRefundedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[10px] text-slate-300">
              {verifiedAid.refundRecords?.length || 0} รายการส่งคืน (Reversal Ledger)
            </div>
          </div>
        </div>

        {/* Missing Proof Alert Notification Banner */}
        {verifiedAid.missingProofCount > 0 && (
          <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>แจ้งเตือนฝ่ายการเงิน:</strong> ตรวจพบ <strong>{verifiedAid.missingProofCount} รายการ</strong> ที่มีการเบิกจ่ายแต่หลักฐานยังไม่สมบูรณ์ (รวมมูลค่า <strong>฿{verifiedAid.missingProofAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>)
              </span>
            </div>
            <button
              onClick={() => openDrillDown(
                'รายการที่หลักฐานยังไม่สมบูรณ์ (Missing Proof Items)',
                'รายการที่บันทึกผลการช่วยเหลือแต่ยังขาดใบเสร็จ ภาพถ่าย หรือหลักฐานส่งมอบตามนโยบาย',
                verifiedAid.drillDown.missingProofItems
              )}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors shrink-0 text-center"
            >
              ตรวจสอบ {verifiedAid.missingProofCount} รายการที่ขาดหลักฐาน
            </button>
          </div>
        )}
      </div>

      {/* Section B: 10 KPI Cards (as specified in Master Prompt Section 9) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. รายรับรวม */}
        <div 
          onClick={() => onNavigateTab('income')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">1. รายรับรวม</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-900 truncate">
              ฿{kpi.totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 mt-0.5">
              <span>ซะกาต & บริจาคจริง</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* 2. รายจ่ายรวม */}
        <div 
          onClick={() => onNavigateTab('aid_expenses')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">2. รายจ่ายรวม</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-900 truncate">
              ฿{kpi.totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5 mt-0.5">
              <span>ช่วยเหลือ + บริหาร</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* 3. ยอดเงินสุทธิ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">3. ยอดเงินสุทธิ</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-900 truncate">
              ฿{kpi.netBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              รายรับหักรายจ่าย
            </p>
          </div>
        </div>

        {/* 4. ยอดคงเหลือในบัญชีธนาคาร */}
        <div 
          onClick={() => onNavigateTab('bank_accounts')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">4. เงินในบัญชีธนาคาร</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-emerald-800 truncate">
              ฿{kpi.totalBankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5 mt-0.5">
              <span>3 บัญชีหลักของมูลนิธิ</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* 5. เงินสดคงเหลือที่บันทึกและตรวจนับแล้ว */}
        <div 
          onClick={() => onNavigateTab('cash_flow')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">5. เงินสดคงเหลือตรวจนับ</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-amber-700 truncate">
              ฿{kpi.totalCashOnHand.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5 mt-0.5">
              <span>เงินสดในมือเหรัญญิก/เบิก</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* 6. งบประมาณที่จัดสรร */}
        <div 
          onClick={() => onNavigateTab('asnaf')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">6. งบประมาณจัดสรร</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PieChartIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-purple-800 truncate">
              ฿{kpi.totalAllocatedBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-purple-600 font-medium flex items-center gap-0.5 mt-0.5">
              <span>ฐานคำนวณตาม 8 อัสนัฟ</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* 7. ยอดจ่ายช่วยเหลือจริง */}
        <div 
          onClick={() => onNavigateTab('aid_expenses')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">7. จ่ายช่วยเหลือจริง</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-teal-800 truncate">
              ฿{kpi.totalDisbursedAid.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-teal-600 font-medium flex items-center gap-0.5 mt-0.5">
              <span>โอนเข้าบัญชีผู้ยากไร้</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* 8. ยอดคงเหลือของกองทุน */}
        <div 
          onClick={() => onNavigateTab('funds_statement')}
          className="bg-white p-4 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/40 to-white shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold">8. กองทุนคงเหลือใช้ได้</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-emerald-900 truncate">
              ฿{kpi.totalAvailableFunds.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5 mt-0.5">
              <span>หักยอดผูกพันแล้ว (Solvent)</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* 9. รายการรออนุมัติ */}
        <div 
          onClick={() => onNavigateTab('cash_flow')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">9. รายการรออนุมัติ</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-amber-700">
              {kpi.pendingApprovalsCount} รายการ
            </div>
            <p className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5 mt-0.5">
              <span>กระบวนการเบิกเงินสด 5 ขั้นตอน</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* 10. รายการรอกระทบยอด */}
        <div 
          onClick={() => onNavigateTab('bank_accounts')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">10. รอกระทบยอด</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-rose-700">
              {kpi.pendingReconciliationsCount} บัญชี
            </div>
            <p className="text-[10px] text-rose-600 font-medium flex items-center gap-0.5 mt-0.5">
              <span>ส่วนต่างยอดสเตตเมนต์</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>
      </div>

      {/* Section C: Interactive Graphs & Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Asnaf & Sub-Funds Budget vs Actual (Takes 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                กราฟเปรียบเทียบงบประมาณเป้าหมาย vs ยอดใช้จริง
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกแถบแท็บด้านขวาเพื่อสลับดูตาม 8 อัสนัฟ หรือกองทุนย่อยฟากีร-มิสกิน
              </p>
            </div>

            <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1">
              <button
                onClick={() => setActiveChartTab('asnaf')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeChartTab === 'asnaf'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                8 อัสนัฟ (Asnaf)
              </button>
              <button
                onClick={() => setActiveChartTab('assistance_type')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeChartTab === 'assistance_type'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ประเภทการช่วยเหลือ (Assistance Types)
              </button>
              <button
                onClick={() => setActiveChartTab('faqir_miskin')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeChartTab === 'faqir_miskin'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                5 กองทุนฟากีร-มิสกิน
              </button>
              <button
                onClick={() => setActiveChartTab('admin')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeChartTab === 'admin'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ค่าบริหาร 10 หมวด
              </button>
            </div>
          </div>

          {/* Chart View based on activeChartTab */}
          <div className="mt-5">
            {activeChartTab === 'asnaf' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span>หมวดหมู่อัสนัฟ & สัดส่วนนโยบาย (คลิกที่แถวเพื่อดูรายการแจกแจง)</span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span>
                      งบเป้าหมาย (Target)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>
                      เบิกจ่ายจริง (Disbursed)
                    </span>
                  </div>
                </div>

                {charts.asnafAllocations.map((item: any, idx: number) => {
                  const maxVal = Math.max(...charts.asnafAllocations.map((a: any) => a.targetAmount), 1);
                  const targetWidth = Math.min(100, Math.round((item.targetAmount / maxVal) * 100));
                  const disbursedWidth = Math.min(100, Math.round((item.disbursedAmount / maxVal) * 100));
                  const pctUsed = item.targetAmount > 0 ? (item.disbursedAmount / item.targetAmount) * 100 : 0;

                  // Find matching verified aid items for this asnaf
                  const asnafVerifiedObj = verifiedAid.breakdownByAsnaf?.find(
                    (a: any) => a.asnafCode === item.asnafCode || a.asnafCode === item.id || a.asnafName === item.name
                  );
                  const drillItems = asnafVerifiedObj?.items || verifiedAid.drillDown?.verifiedAidItems?.filter(
                    (v: any) => v.asnafCode === item.asnafCode || (v.asnafName && v.asnafName.includes(item.name))
                  ) || [];

                  return (
                    <div 
                      key={idx} 
                      onClick={() => openDrillDown(
                        `รายการแจกแจงอัสนัฟ: ${item.fullName}`,
                        `หมวดอัสนัฟ ${item.fullName} (สัดส่วนเป้าหมาย ${item.percentage}%) — จ่ายจริง ฿${item.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
                        drillItems
                      )}
                      className="group hover:bg-slate-50 p-2.5 rounded-xl border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-800 flex items-center gap-1.5">
                          <span>{item.fullName}</span>
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                            {item.percentage}%
                          </span>
                          {drillItems.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
                              {drillItems.length} รายการ
                            </span>
                          )}
                        </span>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <span className="text-emerald-700 font-bold">
                              ฿{item.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-slate-400 font-normal"> / ฿{item.targetAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            <span className="ml-2 text-[10px] text-slate-500">({pctUsed.toFixed(1)}%)</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>

                      {/* Dual Progress Bars */}
                      <div className="space-y-1">
                        {/* Target bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${targetWidth}%` }}
                          />
                        </div>
                        {/* Actual bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${disbursedWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TASK 4: Breakdown by Standard Assistance Types */}
            {activeChartTab === 'assistance_type' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
                  <span>จำแนกตามประเภทความช่วยเหลือ 6 หมวดมาตรฐาน (คลิกเพื่อเปิดตารางแจกแจง)</span>
                  <span className="text-emerald-700 font-bold font-mono">
                    ยอดรวมจ่ายจริง: ฿{verifiedAid.totalVerifiedAidDisbursed.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {(!verifiedAid.breakdownByAssistanceType || verifiedAid.breakdownByAssistanceType.length === 0) ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    ยังไม่มีข้อมูลประเภทการช่วยเหลือในรอบบัญชีนี้
                  </div>
                ) : (
                  verifiedAid.breakdownByAssistanceType.map((t: any, idx: number) => {
                    const maxVal = Math.max(...verifiedAid.breakdownByAssistanceType.map((item: any) => item.disbursedAmount), 1);
                    const barWidth = Math.min(100, Math.round((t.disbursedAmount / maxVal) * 100));

                    return (
                      <div 
                        key={idx} 
                        onClick={() => openDrillDown(
                          `รายการแจกแจง: ${t.typeName} (${t.typeCode})`,
                          `ประเภทความช่วยเหลือ ${t.typeName} (หมวด ${t.categoryLabel}) — จ่ายจริง ฿${t.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} จาก ${t.caseCount} เคส`,
                          t.items || []
                        )}
                        className="group hover:bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-emerald-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-800 font-bold">{t.typeName}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded">
                              {t.typeCode}
                            </span>
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded font-medium">
                              {t.caseCount} เคส ({t.confirmedCount} ยืนยันผลแล้ว)
                            </span>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <span className="text-emerald-700 font-bold font-mono text-sm">
                              ฿{t.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-600 to-teal-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(t.disbursedAmount > 0 ? 5 : 0, barWidth)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeChartTab === 'faqir_miskin' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-xs text-emerald-900 flex items-center justify-between">
                  <span>ฐานงบประมาณกองทุนฟากีร-มิสกิน (70%):</span>
                  <span className="font-bold text-sm">
                    ฿{charts.faqirMiskinSubFunds.reduce((acc: number, f: any) => acc + f.targetAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {charts.faqirMiskinSubFunds.map((sub: any, idx: number) => {
                  const maxVal = Math.max(...charts.faqirMiskinSubFunds.map((s: any) => s.targetAmount), 1);
                  const width = Math.min(100, Math.round((sub.targetAmount / maxVal) * 100));
                  const spentWidth = sub.targetAmount > 0 ? Math.min(100, (sub.disbursedAmount / sub.targetAmount) * 100) : 0;

                  return (
                    <div key={idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{sub.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                            {sub.percentage}%
                          </span>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-bold text-emerald-800">
                            ฿{sub.targetAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            จ่ายแล้ว: ฿{sub.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-600 to-teal-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, spentWidth)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeChartTab === 'admin' && (
              <div className="space-y-2.5">
                <div className="text-xs text-slate-500 mb-2">
                  จำแนกตาม 10 หมวดหมู่ค่าใช้จ่ายดำเนินงานมูลนิธิ (Operating Admin Expenses)
                </div>
                {charts.adminExpenses.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    ยังไม่มีรายการค่าใช้จ่ายบริหารในรอบบัญชีนี้
                  </div>
                ) : (
                  charts.adminExpenses.map((adm: any, idx: number) => {
                    const maxVal = Math.max(...charts.adminExpenses.map((a: any) => a.amount), 1);
                    const width = Math.min(100, Math.round((adm.amount / maxVal) * 100));

                    return (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-700 font-medium w-48 truncate">{adm.category}</span>
                        <div className="flex-1 mx-4 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-slate-700 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${width}%` }} 
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-900 w-24 text-right">
                          ฿{adm.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Monthly Income vs Expense Trend & Donut Summary */}
        <div className="space-y-6">
          {/* Monthly Comparison Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              กระแสเงินสดรายรับ vs รายจ่าย (ปี 2569)
            </h3>

            <div className="mt-4 flex items-end justify-between h-40 pt-4 px-2">
              {charts.incomeVsExpense.map((item: any, idx: number) => {
                const maxVal = Math.max(
                  ...charts.incomeVsExpense.map((m: any) => Math.max(m.income, m.expense)),
                  50000
                );
                const incHeight = Math.min(100, Math.max(4, Math.round((item.income / maxVal) * 100)));
                const expHeight = Math.min(100, Math.max(4, Math.round((item.expense / maxVal) * 100)));

                return (
                  <div key={idx} className="flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      <div>รับ: ฿{item.income.toLocaleString()}</div>
                      <div>จ่าย: ฿{item.expense.toLocaleString()}</div>
                    </div>

                    <div className="flex items-end gap-1 h-28">
                      {/* Income Bar */}
                      <div
                        className="w-2.5 sm:w-3 bg-emerald-600 rounded-t-sm transition-all duration-300 group-hover:bg-emerald-500"
                        style={{ height: `${incHeight}%` }}
                      />
                      {/* Expense Bar */}
                      <div
                        className="w-2.5 sm:w-3 bg-blue-500 rounded-t-sm transition-all duration-300 group-hover:bg-blue-400"
                        style={{ height: `${expHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">{item.month}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center gap-6 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                <span>รายรับ (Income)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                <span>รายจ่าย (Expense)</span>
              </div>
            </div>
          </div>

          {/* Quick Bank Accounts Balance Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-700" />
                สถานะ 3 บัญชีธนาคาร
              </h3>
              <button
                onClick={() => onNavigateTab('bank_accounts')}
                className="text-xs text-emerald-700 hover:underline font-semibold"
              >
                ดูทั้งหมด
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {tables.bankAccounts?.map((b: any) => (
                <div key={b.id} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 truncate max-w-[170px]">{b.accountName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{b.bankName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-800">
                      ฿{b.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {b.status === 'active' ? '● ปกติ' : 'ระงับ'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section D: Quick Action & Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incomes Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              รายรับล่าสุด (Recent Incomes)
            </h3>
            <button
              onClick={() => onNavigateTab('income')}
              className="text-xs text-emerald-700 font-semibold hover:underline"
            >
              ดูทั้งหมด ({tables.recentIncomes.length})
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/60">
                <tr>
                  <th className="px-3.5 py-2.5">เลขที่ / วันที่</th>
                  <th className="px-3.5 py-2.5">ผู้บริจาค / แหล่งเงิน</th>
                  <th className="px-3.5 py-2.5 text-right">จำนวนเงิน (฿)</th>
                  <th className="px-3.5 py-2.5 text-center">ประเภท</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tables.recentIncomes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      ไม่พบรายการรับเงิน
                    </td>
                  </tr>
                ) : (
                  tables.recentIncomes.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="font-mono font-bold text-slate-800">{t.transactionNo}</div>
                        <div className="text-[10px] text-slate-400">{t.date}</div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-900 truncate max-w-[150px]">{t.payerOrPayee}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{t.fundName}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700">
                        +฿{t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t.moneyType === 'zakat' ? 'ซะกาต' : t.moneyType === 'sadaqah' ? 'ศอดะเกาะฮ์' : 'บริหาร'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Card List (TASK 5) */}
          <div className="md:hidden divide-y divide-slate-100">
            {tables.recentIncomes.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                ไม่พบรายการรับเงิน
              </div>
            ) : (
              tables.recentIncomes.map((t: any) => (
                <div key={t.id} className="p-3.5 space-y-2 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-800">{t.transactionNo}</span>
                    <span className="text-slate-400 text-[11px]">{t.date}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{t.payerOrPayee}</div>
                      <div className="text-[11px] text-slate-500">{t.fundName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-emerald-700 font-mono">
                        +฿{t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {t.moneyType === 'zakat' ? 'ซะกาต' : t.moneyType === 'sadaqah' ? 'ศอดะเกาะฮ์' : 'บริหาร'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Incomplete Cash Flow Workflows */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              การเบิกเงินสดที่อยู่ระหว่างดำเนินการ (In-Progress Workflows)
            </h3>
            <button
              onClick={() => onNavigateTab('cash_flow')}
              className="text-xs text-amber-700 font-semibold hover:underline"
            >
              ดำเนินการต่อ ({tables.incompleteWorkflows.length})
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/60">
                <tr>
                  <th className="px-3.5 py-2.5">เลขที่ / วัตถุประสงค์</th>
                  <th className="px-3.5 py-2.5">ขั้นตอนปัจจุบัน</th>
                  <th className="px-3.5 py-2.5 text-right">ยอดเบิก (฿)</th>
                  <th className="px-3.5 py-2.5 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tables.incompleteWorkflows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      ไม่มีรายการเบิกเงินสดค้างดำเนินการ (ทุกรายการเสร็จสิ้นครบ 5 ขั้นตอน)
                    </td>
                  </tr>
                ) : (
                  tables.incompleteWorkflows.map((w: any) => (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="font-mono font-bold text-slate-900">{w.workflowNo}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{w.title}</div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          ขั้นที่ {w.currentStep}/5: {w.currentStep === 1 ? 'เบิกธนาคาร' : w.currentStep === 2 ? 'เหรัญญิกรับฝาก' : w.currentStep === 3 ? 'เบิกสดช่วยเหลือ' : w.currentStep === 4 ? 'จัดสรรเงิน' : 'ตรวจสอบปิดยอด'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                        ฿{w.step1WithdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          onClick={() => onNavigateTab('cash_flow')}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          ตรวจสอบ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Card List (TASK 5) */}
          <div className="md:hidden divide-y divide-slate-100">
            {tables.incompleteWorkflows.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                ไม่มีรายการเบิกเงินสดค้างดำเนินการ (ทุกรายการเสร็จสิ้นครบ 5 ขั้นตอน)
              </div>
            ) : (
              tables.incompleteWorkflows.map((w: any) => (
                <div key={w.id} className="p-3.5 space-y-2 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">{w.workflowNo}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      ขั้นที่ {w.currentStep}/5: {w.currentStep === 1 ? 'เบิกธนาคาร' : w.currentStep === 2 ? 'เหรัญญิกรับฝาก' : w.currentStep === 3 ? 'เบิกสดช่วยเหลือ' : w.currentStep === 4 ? 'จัดสรรเงิน' : 'ปิดรอบ'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">{w.title}</div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-slate-500">
                      ยอดเบิก: <strong className="text-slate-900 font-mono">฿{w.step1WithdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <button
                      onClick={() => onNavigateTab('cash_flow')}
                      className="min-h-[44px] px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      ตรวจสอบ / ทำต่อ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Section E: Assistance Refunds History & Reversals */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-purple-600" />
              รายการส่งคืนเงินสวัสดิการเข้ากองทุน (Assistance Refunds & Reversal Ledger)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              เงินสดคงเหลือที่ผู้ดูแลเคสส่งคืน กลับรายการเข้าบัญชี/กองทุนจริง ไม่ลบประวัติเดิม
            </p>
          </div>
          <button
            onClick={() => openDrillDown(
              'ประวัติการส่งคืนเงินช่วยเหลือเข้ากองทุน (Assistance Refunds)',
              'รายการเงินสดที่ผู้ดูแลเคสส่งคืน บันทึกกลับรายการเข้ากองทุนจริงพร้อมหลักฐานใบเสร็จ',
              verifiedAid.drillDown.refundItems
            )}
            className="text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1"
          >
            <span>ดูทั้งหมด ({verifiedAid.refundRecords?.length || 0})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/60">
              <tr>
                <th className="px-3.5 py-2.5 whitespace-nowrap">เลขที่ใบคืนเงิน</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">วันที่ / เวลา</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">ผู้ส่งคืน (Caregiver)</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">ผู้รับคืน (Finance)</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap text-right">จำนวนเงินคืน (฿)</th>
                <th className="px-3.5 py-2.5">เหตุผลการส่งคืน</th>
                <th className="px-3.5 py-2.5 text-center whitespace-nowrap">หลักฐาน</th>
                <th className="px-3.5 py-2.5 text-center whitespace-nowrap">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!verifiedAid.refundRecords || verifiedAid.refundRecords.length === 0) ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-400">
                    ยังไม่มีรายการส่งคืนเงินสวัสดิการในรอบบัญชีนี้
                  </td>
                </tr>
              ) : (
                verifiedAid.refundRecords.slice(0, 5).map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-purple-800">{r.refundNo}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {r.applicationId ? `คำร้อง: ${r.applicationId}` : 'เบิกเงินสด'}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="text-slate-800">{r.refundDate}</div>
                      <div className="text-[10px] text-slate-400">{r.refundTime}</div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-800">
                      {r.returnedByName}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-800">
                      {r.receivedByName}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-purple-700 whitespace-nowrap">
                      ฿{Number(r.refundAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600 truncate max-w-[200px]">
                      {r.refundReason}
                    </td>
                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                      {r.proofUrl ? (
                        <a
                          href={r.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          ใบเสร็จ
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'completed' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.status === 'completed' ? 'คืนเงินสำเร็จ' : r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TASK 4: DRILL-DOWN MODAL DIALOG                                           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={drillDownModalOpen}
        onClose={() => setDrillDownModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-white">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>{drillDownTitle}</span>
          </div>
        }
        subtitle={drillDownSubtitle}
        size="full"
        badge={
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold">
            กระทบยอดแล้ว (Reconciled)
          </span>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-500">
              * ข้อมูลอ้างอิงจากฐานข้อมูลธุรกรรมจริงและการยืนยันผลพร้อมหลักฐาน (Zero Double-Counting)
            </div>
            <button
              onClick={() => setDrillDownModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Modal Header Controls & Reconciled Total */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อผู้รับประโยชน์, เลขที่คำร้อง, เลขที่ Voucher, ผู้ส่งมอบ, อัสนัฟ..."
                value={drillDownSearch}
                onChange={(e) => setDrillDownSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 focus:outline-hidden"
              />
              {drillDownSearch && (
                <button
                  onClick={() => setDrillDownSearch('')}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">ยอดรวมกระทบยอดแล้ว:</span>
                <span className="text-sm font-bold text-emerald-800 font-mono">
                  ฿{modalFilteredItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg">
                {modalFilteredItems.length} รายการ
              </span>
            </div>
          </div>

          {/* Drill-down Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-xs">
                <tr>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">เลขที่อ้างอิง / Voucher</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">คำร้อง / ผู้รับประโยชน์</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">ผู้ดูแลเคส / ผู้ส่งมอบ</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">อัสนัฟ / ประเภท</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap text-right">จำนวนเงิน (฿)</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">วันที่ช่วยเหลือจริง</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap text-center">หลักฐาน</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modalFilteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  modalFilteredItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">
                          {item.disbursementRef || item.recordId || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.recordType === 'execution_record' ? 'งวดที่ดำเนินการ' : item.recordType === 'direct_disbursement' ? 'โอนตรงบัญชี' : item.recordType === 'refund' ? 'ส่งคืนกองทุน' : 'ส่งมอบสิทธิ์'}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-900">{item.beneficiaryName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.applicationNo ? `คำร้อง: ${item.applicationNo}` : item.nationalId || '-'}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="text-slate-800 font-medium">{item.caseWorkerName || item.delivererName || '-'}</div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 w-fit">
                            {item.asnafName || item.asnafCode}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 w-fit">
                            {item.assistanceTypeName || item.assistanceTypeCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ฿{Number(item.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="text-slate-800">{item.eventDate || '-'}</div>
                        <div className="text-[10px] text-slate-400">{item.eventDatetime ? item.eventDatetime.split(' ')[1] : ''}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        {item.hasValidProof && item.proofUrl ? (
                          <a
                            href={item.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            ดูหลักฐาน
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            ขาดหลักฐาน
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'refunded'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.statusLabel || item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
