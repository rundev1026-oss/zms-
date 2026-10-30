'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { AssessmentView } from '@/components/views/AssessmentView';
import { LoadingState } from '@/components/common/LoadingState';

export default function AssessmentPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="ตรวจสอบและประเมินสิทธิ์ (Field Assessment)">
      <Suspense fallback={<LoadingState message="กำลังโหลดระบบประเมินสิทธิ์..." />}>
        <AssessmentView onNavigate={(view) => router.push(`/${view}`)} />
      </Suspense>
    </AppLayout>
  );
}
