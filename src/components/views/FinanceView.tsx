'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { financeSlugFromPath } from '@/lib/financeMenu';
import { BankAccount } from '@/types';
import { FinanceWorkspace } from './finance/workspace/FinanceWorkspace';

interface FinanceViewProps {
  onNavigate: (view: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'ผู้ดูแลระบบ',
  finance: 'เจ้าหน้าที่การเงิน',
  executive: 'ผู้บริหาร',
  officer: 'เจ้าหน้าที่',
  approver: 'ผู้อนุมัติ',
};

export function FinanceView({ onNavigate }: FinanceViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onFinanceRoute = pathname.startsWith('/finance');
  const section = onFinanceRoute ? (financeSlugFromPath(pathname) || 'dashboard') : null;
  const reportTab = searchParams.get('tab') === 'transactions' || section === 'transactions' ? 'transactions' : 'reports';
  const bankReconcile = searchParams.get('view') === 'reconcile' || section === 'reconciliation';
  const { currentUser, funds, transactions, applications, recordIncome, showToast, refreshData } = useApp();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const loadBanks = () => {
    fetch('/api/finance/bank-accounts')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setBankAccounts(json.data);
      })
      .catch(() => setBankAccounts([]));
  };

  useEffect(() => {
    loadBanks();
  }, []);

  return (
    <FinanceWorkspace
      userName={currentUser.name}
      roleLabel={ROLE_LABELS[currentUser.role] || 'ผู้ใช้งาน'}
      funds={funds}
      transactions={transactions}
      applications={applications}
      bankAccounts={bankAccounts}
      actor={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
      onBanksChanged={loadBanks}
      onRefresh={() => {
        refreshData();
        loadBanks();
        showToast('อัปเดตข้อมูลการเงินล่าสุดแล้ว', 'info');
      }}
      onRecordIncome={async (fundId, category, amount, payer, method, refNo, notes, extra) => {
        const ok = await recordIncome(fundId, category, amount, payer, method, refNo, notes, extra);
        if (ok) showToast('บันทึกรายรับแล้ว', 'success');
        return ok;
      }}
      onOpenApprovals={() => onNavigate('approvals')}
      section={section}
      reportTab={reportTab}
      bankReconcile={bankReconcile}
      onSectionChange={(target) => {
        if (!onFinanceRoute) return;
        router.push(target.startsWith('/') ? target : `/finance/${target}`);
      }}
    />
  );
}
