'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ApprovalsView } from '@/components/views/ApprovalsView';
import { LoadingState } from '@/components/common/LoadingState';

export default function ApprovalsPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="พิจารณาอนุมัติคำขอ (Approvals Workbench)">
      <Suspense fallback={<LoadingState message="กำลังโหลดระบบพิจารณาอนุมัติคำขอ..." />}>
        <ApprovalsView onNavigate={(view) => router.push(`/${view}`)} />
      </Suspense>
    </AppLayout>
  );
}
