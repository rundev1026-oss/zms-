'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { AssistanceRequestsView } from '@/components/views/AssistanceRequestsView';
import { LoadingState } from '@/components/common/LoadingState';

function AssistanceRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id') || undefined;

  const handleNavigate = (view: string) => {
    if (view === 'new-application') {
      router.push('/beneficiaries/register');
    } else {
      router.push(`/${view}`);
    }
  };

  return (
    <AssistanceRequestsView
      onNavigate={handleNavigate}
      selectedRequestId={selectedId}
    />
  );
}

export default function AssistanceRequestsPage() {
  return (
    <AppLayout breadcrumbTitle="ยื่นคำร้องขอความช่วยเหลือ (Assistance Requests)">
      <Suspense fallback={<LoadingState message="กำลังโหลดรายการคำร้อง..." />}>
        <AssistanceRequestsContent />
      </Suspense>
    </AppLayout>
  );
}
