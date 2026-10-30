'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminSettingsView } from '@/components/views/AdminOrgAndSettingsViews';
import { LoadingState } from '@/components/common/LoadingState';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="การตั้งค่าระบบและสำรองข้อมูล (System Settings & Backup)">
      <Suspense fallback={<LoadingState message="กำลังโหลดการตั้งค่าระบบ..." />}>
        <AdminSettingsView />
      </Suspense>
    </AppLayout>
  );
}
