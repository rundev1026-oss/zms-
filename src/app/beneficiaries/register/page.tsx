'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { MultiStepRegistrationView } from '@/components/views/MultiStepRegistrationView';
import { LoadingState } from '@/components/common/LoadingState';

export default function BeneficiaryRegisterPage() {
  const router = useRouter();

  const handleNavigate = (view: string) => {
    if (view === 'beneficiaries' || view === 'registry') {
      router.push('/beneficiaries');
    } else {
      router.push(`/${view}`);
    }
  };

  return (
    <AppLayout breadcrumbTitle="แบบสำรวจขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต 5 ขั้นตอน (5-Step Form)">
      <Suspense fallback={<LoadingState message="กำลังโหลดแบบฟอร์มขึ้นทะเบียน..." />}>
        <MultiStepRegistrationView onNavigate={handleNavigate} />
      </Suspense>
    </AppLayout>
  );
}
