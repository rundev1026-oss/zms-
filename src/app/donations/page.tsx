'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PaymentAndMemberView } from '@/components/views/PaymentAndMemberView';
import { LoadingState } from '@/components/common/LoadingState';

export default function DonationsPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="รับบริจาค / ชำระซะกาต (Donation Entry & Zakat Payments)">
      <Suspense fallback={<LoadingState message="กำลังโหลดระบบรับบริจาค..." />}>
        <PaymentAndMemberView
          onNavigate={(view) => router.push(`/${view}`)}
        />
      </Suspense>
    </AppLayout>
  );
}
