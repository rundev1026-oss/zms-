'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { DisbursementsView } from '@/components/views/DisbursementsView';
import { LoadingState } from '@/components/common/LoadingState';

export default function DisbursementsPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="บันทึกการช่วยเหลือ (Disbursements & Aid Delivery)">
      <Suspense fallback={<LoadingState message="กำลังโหลดระบบบันทึกการช่วยเหลือ..." />}>
        <DisbursementsView onNavigate={(view) => router.push(`/${view}`)} />
      </Suspense>
    </AppLayout>
  );
}
