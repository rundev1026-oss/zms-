'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicAssistanceView } from '@/components/views/public/PublicAssistanceView';
import { DisbursementsView } from '@/components/views/DisbursementsView';
import { LoadingState } from '@/components/common/LoadingState';
import { useApp } from '@/context/AppContext';

function AssistanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, isAuthenticated } = useApp();
  const mode = searchParams.get('mode');

  const isStaffWorkbench = (isAuthenticated && currentUser.role !== 'public' && currentUser.role !== 'member') || mode === 'workbench';

  const handleNavigate = (view: string) => {
    if (view === 'public-home') router.push('/');
    else if (view === 'public-calculator') router.push('/zakat-calculator');
    else if (view === 'public-payment') router.push('/zakat-payment');
    else if (view === 'public-transparency') router.push('/transparency');
    else if (view === 'public-my-account') router.push('/my-account');
    else router.push(`/${view}`);
  };

  if (isStaffWorkbench) {
    return (
      <AppLayout breadcrumbTitle="บันทึกการช่วยเหลือ (Disbursements & Aid Delivery)">
        <DisbursementsView onNavigate={handleNavigate} />
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PublicHeader 
        currentView="public-assistance" 
        onNavigate={handleNavigate}
        onSwitchToAdmin={() => router.push('/dashboard')}
      />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <PublicAssistanceView onNavigate={handleNavigate} />
      </main>
      <PublicFooter onNavigate={handleNavigate} />
    </div>
  );
}

export default function AssistancePage() {
  return (
    <Suspense fallback={<LoadingState message="กำลังโหลดหน้าการขอความช่วยเหลือ..." />}>
      <AssistanceContent />
    </Suspense>
  );
}
