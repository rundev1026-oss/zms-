'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { SystemAdminCenterView } from '@/components/views/admin/SystemAdminCenterView';
import { LoadingState } from '@/components/common/LoadingState';

export default function AdminSettingsPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="การตั้งค่าทั่วไป (General Settings)">
      <Suspense fallback={<LoadingState message="กำลังโหลดการตั้งค่าทั่วไป..." />}>
        <SystemAdminCenterView
          initialTab="admin-settings"
          onNavigate={(view) => router.push(view === 'dashboard' ? '/dashboard' : `/${view}`)}
        />
      </Suspense>
    </AppLayout>
  );
}
