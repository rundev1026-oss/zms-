'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserManagementView } from '@/components/views/UserManagementView';
import { LoadingState } from '@/components/common/LoadingState';

export default function UsersPage() {
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle="จัดการผู้ใช้งานและสิทธิ์ (User Management & RBAC)">
      <Suspense fallback={<LoadingState message="กำลังโหลดระบบจัดการผู้ใช้งาน..." />}>
        <UserManagementView onNavigate={(view) => router.push(`/${view}`)} />
      </Suspense>
    </AppLayout>
  );
}
