'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { OfficerReportsAndAuditView } from '@/components/views/OfficerReportsAndAuditView';
import { LoadingState } from '@/components/common/LoadingState';

export default function ReportsPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="รายงานและการวิเคราะห์ (Reports & Analytics)">
      <Suspense fallback={<LoadingState message="กำลังโหลดรายงานภาพรวม..." />}>
        <OfficerReportsAndAuditView
          onNavigate={(view) => router.push(`/${view}`)}
          defaultSubTab="officers"
        />
      </Suspense>
    </AppLayout>
  );
}
