'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { DonationManagementView } from '@/components/views/DonationManagementView';
import { LoadingState } from '@/components/common/LoadingState';

export default function DonationsPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="รับบริจาค / จ่ายซะกาต (Donation Entry & Zakat Payments)">
      <Suspense fallback={<LoadingState message="กำลังโหลดระบบรับบริจาคและจ่ายซะกาต..." />}>
        <DonationManagementView
          onNavigate={(view) => router.push(`/${view}`)}
        />
      </Suspense>
    </AppLayout>
  );
}
