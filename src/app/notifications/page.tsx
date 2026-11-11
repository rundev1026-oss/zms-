'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationsView } from '@/components/views/NotificationsView';
import { LoadingState } from '@/components/common/LoadingState';

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="ศูนย์การแจ้งเตือนระบบ (Global Notifications)">
      <Suspense fallback={<LoadingState message="กำลังโหลดศูนย์การแจ้งเตือนระบบ..." />}>
        <NotificationsView onNavigate={(view) => router.push(`/${view}`)} />
      </Suspense>
    </AppLayout>
  );
}
