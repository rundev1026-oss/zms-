'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicPaymentView } from '@/components/views/public/PublicPaymentView';

function DonateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const amountParam = Number(searchParams.get('amount')) || 1000;
  const categoryParam = searchParams.get('category') || 'บริจาคทั่วไป (ศอดะเกาะฮ์สาธารณประโยชน์)';
  const campaignIdParam = searchParams.get('campaignId') || undefined;
  const campaignTitleParam = searchParams.get('campaignTitle') || undefined;

  const handleNavigate = (view: string) => {
    if (view === 'public-home') router.push('/');
    else if (view === 'public-about') router.push('/about');
    else if (view === 'public-calculator') router.push('/zakat-calculator');
    else if (view === 'public-payment') router.push('/zakat-payment');
    else if (view === 'public-donate') router.push('/donate');
    else if (view === 'public-assistance') router.push('/assistance');
    else if (view === 'public-transparency') router.push('/transparency');
    else if (view === 'public-my-account') router.push('/my-account');
    else router.push(`/#${view.replace('public-', '')}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PublicHeader 
        currentView="public-donate" 
        onNavigate={handleNavigate}
        onSwitchToAdmin={() => router.push('/#admin')}
      />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <PublicPaymentView 
          onNavigate={handleNavigate}
          initialAmount={amountParam}
          initialCategory={categoryParam}
          selectedCampaignId={campaignIdParam}
          selectedCampaignTitle={campaignTitleParam}
          targetFundId="fund-3"
        />
      </main>
      <PublicFooter onNavigate={handleNavigate} />
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">กำลังโหลด...</div>}>
      <DonateContent />
    </Suspense>
  );
}
