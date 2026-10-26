'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicAboutView } from '@/components/views/public/PublicAboutView';

export default function AboutPage() {
  const router = useRouter();

  const handleNavigate = (view: string) => {
    if (view === 'public-home') router.push('/');
    else if (view === 'public-about') router.push('/about');
    else if (view === 'public-calculator') router.push('/zakat-calculator');
    else if (view === 'public-payment') router.push('/zakat-payment');
    else if (view === 'public-assistance') router.push('/assistance');
    else if (view === 'public-transparency') router.push('/transparency');
    else if (view === 'public-my-account') router.push('/my-account');
    else router.push(`/#${view.replace('public-', '')}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PublicHeader 
        currentView="public-about" 
        onNavigate={handleNavigate}
        onSwitchToAdmin={() => router.push('/#admin')}
      />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <PublicAboutView onNavigate={handleNavigate} />
      </main>
      <PublicFooter onNavigate={handleNavigate} />
    </div>
  );
}
