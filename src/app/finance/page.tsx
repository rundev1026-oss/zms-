'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { FinanceView } from '@/components/views/FinanceView';
import { LoadingState } from '@/components/common/LoadingState';

export default function FinancePage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="การเงินและบัญชี (Financial & Accounting Module)">
      <Suspense fallback={<LoadingState message="กำลังโหลดระบบการเงินและบัญชี..." />}>
        <FinanceView onNavigate={(view) => router.push(`/${view}`)} />
      </Suspense>
    </AppLayout>
  );
}
