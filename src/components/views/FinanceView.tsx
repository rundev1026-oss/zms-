'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { BankAccount } from '@/types';
import { 
  BarChart3, 
  ArrowDownLeft, 
  Building, 
  ArrowLeftRight, 
  PieChart, 
  Layers, 
  HeartHandshake, 
  Briefcase, 
  FileSpreadsheet, 
  Settings, 
  ShieldCheck, 
  Wallet,
  Menu,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

// 11 Modular Sub-Tab Components
import { FinanceDashboardTab } from './finance/FinanceDashboardTab';
import { IncomeEntryTab } from './finance/IncomeEntryTab';
import { BankAccountsTab } from './finance/BankAccountsTab';
import { BankTransfersTab } from './finance/BankTransfersTab';
import { AsnafAllocationTab } from './finance/AsnafAllocationTab';
import { FaqirMiskinSubFundsTab } from './finance/FaqirMiskinSubFundsTab';
import { AidDisbursementsTab } from './finance/AidDisbursementsTab';
import { AdminExpensesTab } from './finance/AdminExpensesTab';
import { CashFlowWorkflowTab } from './finance/CashFlowWorkflowTab';
import { FinancialReportsTab } from './finance/FinancialReportsTab';
import { FinanceSettingsTab } from './finance/FinanceSettingsTab';
import { AuditAndLedgerTab } from './finance/AuditAndLedgerTab';

interface FinanceViewProps {
  onNavigate: (view: string) => void;
  initialSubTab?: FinanceTabKey;
}

export type FinanceTabKey = 
  | 'dashboard'
  | 'income'
  | 'bank_accounts'
  | 'asnaf_fund'
  | 'transfers'
  | 'aid_expenses'
  | 'admin_expenses'
  | 'cash_flow'
  | 'reports'
  | 'settings'
  | 'audit_ledger';

export function FinanceView({ onNavigate, initialSubTab = 'dashboard' }: FinanceViewProps) {
  const { 
    currentUser, 
    funds, 
    transactions, 
    applications, 
    recordIncome, 
    recordExpense, 
    reconcileFunds, 
    showToast, 
    refreshData 
  } = useApp();

  const [activeTab, setActiveTab] = useState<FinanceTabKey>(initialSubTab);
  const [asnafSubView, setAsnafSubView] = useState<'asnaf' | 'faqir_miskin'>('asnaf');
  const [cashFlowSubView, setCashFlowSubView] = useState<'workflows' | 'history' | 'handovers'>('workflows');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const fetchBankAccounts = () => {
    fetch('/api/finance/bank-accounts')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setBankAccounts(json.data);
        }
      })
      .catch((err) => console.error('Failed to load bank accounts in FinanceView:', err));
  };

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  // Sync if initialSubTab prop changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // 11 Menus mandated by Section 5 of Master Prompt
  const tabs = [
    { id: 'dashboard', label: '1. Dashboard การเงิน', icon: BarChart3, shortLabel: 'Dashboard' },
    { id: 'income', label: '2. บันทึกรายรับ', icon: ArrowDownLeft, shortLabel: 'บันทึกรายรับ' },
    { id: 'bank_accounts', label: '3. จัดการการเงินและบัญชีธนาคาร', icon: Building, shortLabel: 'บัญชีธนาคาร' },
    { id: 'asnaf_fund', label: '4. จัดสรรเงินซะกาตตามอัสนัฟและงบประมาณกองทุน', icon: PieChart, shortLabel: 'จัดสรรอัสนัฟและกองทุน' },
    { id: 'transfers', label: '5. ฝาก–ถอน–โอนเงิน', icon: ArrowLeftRight, shortLabel: 'ฝาก–ถอน–โอน' },
    { id: 'aid_expenses', label: '6. รายจ่ายและการช่วยเหลือ', icon: HeartHandshake, shortLabel: 'รายจ่ายช่วยเหลือ' },
    { id: 'admin_expenses', label: '7. ค่าใช้จ่ายบริหารสำนักงาน', icon: Briefcase, shortLabel: 'ค่าใช้จ่ายบริหาร' },
    { id: 'cash_flow', label: '8. เงินสดและเงินสำรองจ่าย', icon: Wallet, shortLabel: 'เงินสดสำรองจ่าย' },
    { id: 'reports', label: '9. รายงานการเงิน', icon: FileSpreadsheet, shortLabel: 'รายงานการเงิน' },
    { id: 'settings', label: '10. ตั้งค่าหมวดหมู่และวงเงิน', icon: Settings, shortLabel: 'ตั้งค่าและวงเงิน' },
    { id: 'audit_ledger', label: '11. ประวัติธุรกรรมและ Audit Log', icon: ShieldCheck, shortLabel: 'Audit Log' },
  ];

  const handleTabChange = (tabId: string) => {
    if (tabId === 'cash_flow_history' || tabId === 'disbursements_history') {
      setCashFlowSubView('history');
      setActiveTab('cash_flow');
    } else if (tabId === 'cash_flow_handovers') {
      setCashFlowSubView('handovers');
      setActiveTab('cash_flow');
    } else if (tabId === 'cash_flow') {
      setCashFlowSubView('workflows');
      setActiveTab('cash_flow');
    } else if (tabId === 'asnaf') {
      setAsnafSubView('asnaf');
      setActiveTab('asnaf_fund');
    } else if (tabId === 'faqir_miskin') {
      setAsnafSubView('faqir_miskin');
      setActiveTab('asnaf_fund');
    } else if (tabId === 'incomes') {
      setActiveTab('income');
    } else if (tabId === 'expenses') {
      setActiveTab('aid_expenses');
    } else if (tabId === 'reversals') {
      setActiveTab('audit_ledger');
    } else {
      setActiveTab(tabId as FinanceTabKey);
    }
    setIsMobileMenuOpen(false);
  };

  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-5 animate-fadeIn pb-20">
      {/* Top Banner / Breadcrumb & Status */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                ระบบการเงินและบัญชี ZMS (Zakat Management System)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                มูลนิธิซะกาตและสาธารณกุศล | ตรวจสอบย้อนหลังได้ ถูกต้องตามหลักชะรีอะฮ์ และแยกสิทธิ์การอนุมัติออกจากการจ่ายเงิน
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
            <span className="text-[11px] text-slate-500">
              {currentUser.role === 'super_admin' ? 'ผู้ดูแลระบบสูงสุด' : currentUser.role === 'finance' ? 'เจ้าหน้าที่การเงิน/บัญชี' : currentUser.role === 'executive' ? 'เหรัญญิก/ผู้บริหาร' : 'เจ้าหน้าที่'}
            </span>
          </div>
          <button
            onClick={() => {
              refreshData();
              fetchBankAccounts();
              showToast('อัปเดตข้อมูลการเงินและบัญชีล่าสุดเรียบร้อย', 'info');
            }}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="รีเฟรชข้อมูลทั้งหมด"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Switcher */}
      <div className="md:hidden relative">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs text-slate-800 font-bold text-sm"
        >
          <div className="flex items-center gap-2">
            <currentTabObj.icon className="w-5 h-5 text-emerald-700" />
            <span>{currentTabObj.label}</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-semibold transition-colors ${
                    isActive ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Horizontal 11-Tab Navigation Bar */}
      <div className="hidden md:block bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0b2545] text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tab Contents */}
      <div className="transition-opacity duration-200">
        {/* 1. Dashboard การเงิน */}
        {activeTab === 'dashboard' && (
          <FinanceDashboardTab onNavigateTab={handleTabChange} />
        )}

        {/* 2. บันทึกรายรับ */}
        {activeTab === 'income' && (
          <IncomeEntryTab 
            currentUser={currentUser}
            funds={funds}
            transactions={transactions}
            bankAccounts={bankAccounts}
            recordIncome={recordIncome}
            showToast={showToast}
            onRefresh={refreshData}
          />
        )}

        {/* 3. จัดการการเงินและบัญชีธนาคาร */}
        {activeTab === 'bank_accounts' && (
          <BankAccountsTab 
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {/* 4. จัดสรรเงินซะกาตตามอัสนัฟและงบประมาณกองทุน */}
        {activeTab === 'asnaf_fund' && (
          <div className="space-y-4">
            <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 max-w-md">
              <button
                onClick={() => setAsnafSubView('asnaf')}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  asnafSubView === 'asnaf'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <PieChart className="w-4 h-4" />
                สัดส่วน 8 อัสนัฟ (100%)
              </button>
              <button
                onClick={() => setAsnafSubView('faqir_miskin')}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  asnafSubView === 'faqir_miskin'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                5 กองทุนฟากีร-มิสกิน (100%)
              </button>
            </div>

            {asnafSubView === 'asnaf' ? (
              <AsnafAllocationTab 
                currentUser={currentUser}
                showToast={showToast}
              />
            ) : (
              <FaqirMiskinSubFundsTab 
                currentUser={currentUser}
                showToast={showToast}
              />
            )}
          </div>
        )}

        {/* 5. ฝาก–ถอน–โอนเงิน */}
        {activeTab === 'transfers' && (
          <BankTransfersTab
            currentUser={currentUser}
            bankAccounts={bankAccounts}
            showToast={showToast}
            onRefreshBankAccounts={fetchBankAccounts}
          />
        )}

        {/* 6. รายจ่ายและการช่วยเหลือ */}
        {activeTab === 'aid_expenses' && (
          <AidDisbursementsTab 
            currentUser={currentUser}
            funds={funds}
            transactions={transactions}
            applications={applications}
            bankAccounts={bankAccounts}
            recordExpense={recordExpense}
            showToast={showToast}
            onRefresh={refreshData}
          />
        )}

        {/* 7. ค่าใช้จ่ายบริหารสำนักงาน */}
        {activeTab === 'admin_expenses' && (
          <AdminExpensesTab 
            currentUser={currentUser}
            funds={funds}
            transactions={transactions}
            recordExpense={recordExpense}
            showToast={showToast}
            onRefresh={refreshData}
          />
        )}

        {/* 8. เงินสดและเงินสำรองจ่าย */}
        {activeTab === 'cash_flow' && (
          <CashFlowWorkflowTab 
            currentUser={currentUser}
            showToast={showToast}
            onNavigate={onNavigate}
            initialViewMode={cashFlowSubView}
          />
        )}

        {/* 9. รายงานการเงิน */}
        {activeTab === 'reports' && (
          <FinancialReportsTab />
        )}

        {/* 10. ตั้งค่าหมวดหมู่และวงเงิน */}
        {activeTab === 'settings' && (
          <FinanceSettingsTab onNavigateTab={handleTabChange} />
        )}

        {/* 11. ประวัติธุรกรรมและ Audit Log */}
        {activeTab === 'audit_ledger' && (
          <AuditAndLedgerTab />
        )}
      </div>
    </div>
  );
}
