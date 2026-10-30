'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicCalculatorView } from '@/components/views/public/PublicCalculatorView';
import { ZakatCalculatorView } from '@/components/views/ZakatCalculatorView';
import { LoadingState } from '@/components/common/LoadingState';
import { useApp } from '@/context/AppContext';

function ZakatCalculatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, isAuthenticated } = useApp();
  const mode = searchParams.get('mode');

  const isStaffWorkbench = (isAuthenticated && currentUser.role !== 'public' && currentUser.role !== 'member') || mode === 'workbench';

  const handleNavigate = (view: string) => {
    if (view === 'public-home') router.push('/');
    else if (view === 'public-payment') router.push('/zakat-payment');
    else if (view === 'public-assistance') router.push('/assistance');
    else if (view === 'public-transparency') router.push('/transparency');
    else if (view === 'public-my-account') router.push('/my-account');
    else router.push(`/${view}`);
  };

  if (isStaffWorkbench) {
    return (
      <AppLayout breadcrumbTitle="เครื่องคำนวณซะกาต 5 หมวดหมู่ (Zakat Calculator Engine)">
        <ZakatCalculatorView
          onNavigate={handleNavigate}
          onSetCheckoutAmount={(amount, category) => {
            router.push(`/donations?amount=${amount}&category=${encodeURIComponent(category)}`);
          }}
        />
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PublicHeader 
        currentView="public-calculator" 
        onNavigate={handleNavigate}
        onSwitchToAdmin={() => router.push('/dashboard')}
      />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <PublicCalculatorView 
          onNavigate={handleNavigate}
          onSetCheckoutAmount={(amount, category) => {
            router.push(`/zakat-payment?amount=${amount}&category=${encodeURIComponent(category)}`);
          }}
        />
      </main>
      <PublicFooter onNavigate={handleNavigate} />
    </div>
  );
}

export default function ZakatCalculatorPage() {
  return (
    <Suspense fallback={<LoadingState message="กำลังโหลดเครื่องคำนวณซะกาต..." />}>
      <ZakatCalculatorContent />
    </Suspense>
  );
}
