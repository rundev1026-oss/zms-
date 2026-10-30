'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { BranchesAndDepartmentsView } from '@/components/views/AdminOrgAndSettingsViews';
import { LoadingState } from '@/components/common/LoadingState';

export default function BranchesPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="สาขาและแผนกองค์กร (Branches & Organizational Structure)">
      <Suspense fallback={<LoadingState message="กำลังโหลดข้อมูลสาขาและแผนกองค์กร..." />}>
        <BranchesAndDepartmentsView onNavigate={(view) => router.push(`/${view}`)} />
      </Suspense>
    </AppLayout>
  );
}
