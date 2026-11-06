'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { FundAccount, BankAccount, FinancialTransaction } from '@/types';
import { DonationKPICards, DonationKPIs } from './donations/DonationKPICards';
import { DonationCollectionTab } from './donations/DonationCollectionTab';
import { ZakatDisbursementTab } from './donations/ZakatDisbursementTab';
import { DonationTransactionHistoryTab } from './donations/DonationTransactionHistoryTab';
import { ReceivingBankAccountsTab } from './donations/ReceivingBankAccountsTab';
import { PaymentReconciliationTab } from './donations/PaymentReconciliationTab';
import {
  Receipt,
  Heart,
  History,
  Building2,
  Coins,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Scale
} from 'lucide-react';

interface DonationManagementViewProps {
  onNavigate?: (view: string) => void;
  initialTab?: 'collection' | 'disbursement' | 'history' | 'bank_accounts' | 'reconciliation';
}

export function DonationManagementView({
  onNavigate,
  initialTab = 'collection',
}: DonationManagementViewProps) {
  const { currentUser, funds, applications, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'collection' | 'disbursement' | 'history' | 'bank_accounts' | 'reconciliation'>(initialTab);

  // Real Database Data States
  const [kpis, setKpis] = useState<DonationKPIs>({
    todayDonations: 0,
    monthDonations: 0,
    pendingVerificationCount: 0,
    completedTransactionsCount: 0,
    totalZakatDisbursed: 0,
    auditedBalance: 0,
  });

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState<boolean>(true);
  const [isLoadingTxns, setIsLoadingTxns] = useState<boolean>(true);
  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(true);

  // 1. Fetch real KPIs from Database
  const fetchKPIs = useCallback(async () => {
    try {
      setIsLoadingKPIs(true);
      const res = await fetch('/api/donations/kpis');
      const json = await res.json();
      if (json.success && json.data) {
        setKpis(json.data);
      }
    } catch (err) {
      console.error('Failed to load KPIs:', err);
    } finally {
      setIsLoadingKPIs(false);
    }
  }, []);

  // 2. Fetch real transactions from Database
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoadingTxns(true);
      const res = await fetch('/api/donations');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTransactions(json.data);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoadingTxns(false);
    }
  }, []);

  // 3. Fetch real bank accounts from Database
  const fetchBankAccounts = useCallback(async () => {
    try {
      setIsLoadingBanks(true);
      const res = await fetch('/api/finance/bank-accounts');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBankAccounts(json.data);
      }
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
    } finally {
      setIsLoadingBanks(false);
    }
  }, []);

  // Refresh all
  const refreshAllData = useCallback(() => {
    fetchKPIs();
    fetchTransactions();
    fetchBankAccounts();
  }, [fetchKPIs, fetchTransactions, fetchBankAccounts]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const tabs = [
    {
      id: 'collection',
      label: 'รับบริจาค',
      subLabel: 'Donation Entry',
      icon: Coins,
      count: null,
    },
    {
      id: 'disbursement',
      label: 'จ่ายเงินช่วยเหลือ',
      subLabel: 'Disbursement',
      icon: Heart,
      count: applications.filter(a => a.status === 'wait_disbursement' || a.status === 'approved').length,
    },
    {
      id: 'bank_accounts',
      label: 'ตั้งค่าช่องทางรับเงิน',
      subLabel: 'Receiving Channels',
      icon: Building2,
      count: bankAccounts.length > 0 ? bankAccounts.length : null,
    },
    {
      id: 'history',
      label: 'ประวัติธุรกรรม',
      subLabel: 'Payment History',
      icon: History,
      count: kpis.pendingVerificationCount > 0 ? `${kpis.pendingVerificationCount} รอตรวจ` : null,
    },
    {
      id: 'reconciliation',
      label: 'กระทบยอด',
      subLabel: 'Reconciliation',
      icon: Scale,
      count: null,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Module Title Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-800 text-white shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                ระบบรับบริจาค & จ่ายซะกาต (Donation & Zakat Disbursement Management)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                บริหารจัดการการรับเงินบริจาค การจ่ายเงินซะกาต 8 อัสนัฟ ตรวจสอบสลิป และบัญชีธนาคารตามหลักการชะรีอะฮ์
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Shariah & GL Segregated</span>
          </span>
        </div>
      </div>

      {/* Top Real Database KPI Cards */}
      <DonationKPICards
        kpis={kpis}
        isLoading={isLoadingKPIs}
        onRefresh={refreshAllData}
      />

      {/* 4 Main Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white rounded-t-2xl px-2 pt-2 shadow-2xs">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto" aria-label="Donation Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 sm:px-4 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-emerald-800 text-emerald-950 bg-emerald-50/60'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-800' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'collection' && (
          <DonationCollectionTab
            currentUser={currentUser}
            funds={funds}
            bankAccounts={bankAccounts}
            onDonationSuccess={refreshAllData}
            showToast={showToast}
          />
        )}

        {activeTab === 'disbursement' && (
          <ZakatDisbursementTab
            currentUser={currentUser}
            funds={funds}
            bankAccounts={bankAccounts}
            applications={applications}
            onDisbursementSuccess={refreshAllData}
            showToast={showToast}
          />
        )}

        {activeTab === 'history' && (
          <DonationTransactionHistoryTab
            currentUser={currentUser}
            transactions={transactions}
            funds={funds}
            bankAccounts={bankAccounts}
            onActionSuccess={refreshAllData}
            showToast={showToast}
          />
        )}

        {activeTab === 'bank_accounts' && (
          <ReceivingBankAccountsTab
            currentUser={currentUser}
            bankAccounts={bankAccounts}
            onAccountsUpdated={refreshAllData}
            showToast={showToast}
          />
        )}

        {activeTab === 'reconciliation' && (
          <PaymentReconciliationTab
            currentUser={currentUser}
            bankAccounts={bankAccounts}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}

