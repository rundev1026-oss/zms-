'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { FollowUpMonitoringView } from '@/components/views/follow-up/FollowUpMonitoringView';
import { LoadingState } from '@/components/common/LoadingState';

export default function FollowUpPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="ตรวจสอบและติดตามผล (Follow-up & Monitoring)">
      <Suspense fallback={<LoadingState message="กำลังโหลดระบบติดตามผล..." />}>
        <FollowUpMonitoringView onNavigate={(view) => router.push(`/${view}`)} />
      </Suspense>
    </AppLayout>
  );
}
