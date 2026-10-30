'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { OfficerReportsAndAuditView } from '@/components/views/OfficerReportsAndAuditView';
import { LoadingState } from '@/components/common/LoadingState';

export default function AuditPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="บันทึกประวัติการทำงาน (Audit Trail & Activity Logs)">
      <Suspense fallback={<LoadingState message="กำลังโหลดบันทึกประวัติการทำงาน..." />}>
        <OfficerReportsAndAuditView
          onNavigate={(view) => router.push(`/${view}`)}
          defaultSubTab="audit"
        />
      </Suspense>
    </AppLayout>
  );
}
