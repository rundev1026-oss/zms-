'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExecutiveDashboard } from '@/components/views/ExecutiveDashboard';
import { LoadingState } from '@/components/common/LoadingState';

export default function DashboardPage() {
  const router = useRouter();

  const handleNavigate = (view: string) => {
    switch (view) {
      case 'dashboard':
        router.push('/dashboard');
        break;
      case 'beneficiaries':
      case 'registry':
        router.push('/beneficiaries');
        break;
      case 'assistance-requests':
        router.push('/assistance-requests');
        break;
      case 'assessment':
        router.push('/assessment');
        break;
      case 'approvals':
        router.push('/approvals');
        break;
      case 'disbursements':
      case 'assistance':
        router.push('/assistance');
        break;
      case 'follow-up':
        router.push('/follow-up');
        break;
      case 'finance':
        router.push('/finance');
        break;
      case 'officer-reports':
      case 'reports':
        router.push('/reports');
        break;
      case 'users':
        router.push('/users');
        break;
      case 'branches-depts':
      case 'branches':
        router.push('/branches');
        break;
      case 'calculator':
      case 'zakat-calculator':
        router.push('/zakat-calculator');
        break;
      case 'payment':
      case 'donations':
        router.push('/donations');
        break;
      case 'audit-logs':
      case 'audit':
        router.push('/audit');
        break;
      case 'settings':
        router.push('/settings');
        break;
      case 'new-application':
        router.push('/beneficiaries/register');
        break;
      default:
        router.push(`/${view}`);
        break;
    }
  };

  return (
    <AppLayout breadcrumbTitle="Dashboard (ภาพรวมระบบ)">
      <Suspense fallback={<LoadingState message="กำลังโหลดแดชบอร์ดภาพรวม..." />}>
        <ExecutiveDashboard
          onNavigate={handleNavigate}
          onSelectApplication={(appId) => router.push(`/assistance-requests?id=${appId}`)}
        />
      </Suspense>
    </AppLayout>
  );
}
