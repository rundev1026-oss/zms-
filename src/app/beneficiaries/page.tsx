'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { BeneficiaryRegistryView } from '@/components/views/BeneficiaryRegistryView';
import { LoadingState } from '@/components/common/LoadingState';

export default function BeneficiariesPage() {
  const router = useRouter();

  const handleNavigate = (view: string) => {
    if (view === 'new-application') {
      router.push('/beneficiaries/register');
    } else {
      router.push(`/${view}`);
    }
  };

  return (
    <AppLayout breadcrumbTitle="ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต (Beneficiary Master Registry)">
      <Suspense fallback={<LoadingState message="กำลังโหลดทะเบียนผู้มีสิทธิ์รับซะกาต..." />}>
        <BeneficiaryRegistryView
          onNavigate={handleNavigate}
          onSelectBeneficiaryForAssistance={(b) => {
            router.push(`/assistance-requests?beneficiaryId=${b.id}`);
          }}
        />
      </Suspense>
    </AppLayout>
  );
}
