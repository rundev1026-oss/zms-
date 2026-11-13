import React, { Suspense } from 'react';
import { FinanceShell } from '@/components/views/finance/FinanceShell';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">กำลังโหลดการเงินและบัญชี...</div>}>
      <FinanceShell>{children}</FinanceShell>
    </Suspense>
  );
}
