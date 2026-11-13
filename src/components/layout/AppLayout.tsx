'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useApp } from '@/context/AppContext';

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbTitle?: string;
}

export function AppLayout({ children, breadcrumbTitle }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Map route pathname to currentView for Sidebar active styling
  const getViewFromPath = (path: string): string => {
    const clean = path.replace(/^\//, '');
    if (!clean || clean === 'dashboard') return 'dashboard';
    if (clean.startsWith('beneficiar')) return 'beneficiaries';
    if (clean.startsWith('assistance-request')) return 'assistance-requests';
    if (clean.startsWith('assessment')) return 'assessment';
    if (clean.startsWith('approval')) return 'approvals';
    if (clean.startsWith('disbursement') || clean.startsWith('assistance')) return 'disbursements';
    if (clean.startsWith('follow-up')) return 'follow-up';
    if (clean === 'finance' || clean.startsWith('finance/')) {
      const slug = clean.split('/')[1] || 'dashboard';
      return `finance/${slug}`;
    }
    if (clean.startsWith('report') || clean.startsWith('officer-report')) return 'officer-reports';
    if (clean.startsWith('user')) return 'users';
    if (clean.startsWith('branch')) return 'branches-depts';
    if (clean.startsWith('zakat-calc') || clean.startsWith('calculator')) return 'calculator';
    if (clean.startsWith('donation') || clean.startsWith('payment')) return 'payment';
    if (clean.startsWith('audit')) return 'audit-logs';
    if (clean.startsWith('setting')) return 'settings';
    if (clean.startsWith('notification')) return 'notifications';
    return clean;
  };

  const currentView = getViewFromPath(pathname || '');
  const financeLayout = currentView.startsWith('finance');

  const handleNavigate = (view: string) => {
    setIsMobileSidebarOpen(false);

    // Direct Route navigation
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
        router.push('/finance/dashboard');
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
      default:
        router.push(`/${view}`);
        break;
    }
  };

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#F4F7FB] font-sarabun text-slate-800 antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        breadcrumbTitle={breadcrumbTitle}
        isMobileMenuOpen={isMobileSidebarOpen}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onSwitchToPublic={() => router.push('/')}
      />

      {/* Main Workbench Body with Sidebar & Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content View Area */}
        <main
          ref={mainRef}
          className={`min-h-0 min-w-0 flex-1 touch-scroll overscroll-y-contain ${
          isMobileSidebarOpen ? 'max-md:overflow-hidden md:overflow-x-hidden md:overflow-y-auto' : 'overflow-x-hidden overflow-y-auto'
        } ${
          financeLayout
            ? 'p-3 sm:p-5 lg:px-6 lg:py-5'
            : currentView === 'follow-up'
              ? 'px-2.5 py-3 sm:p-6 lg:p-8'
              : 'p-4 sm:p-6 lg:p-8'
        }`}>
          <div className={`${
            financeLayout
              ? 'w-full max-w-none space-y-6 animate-fadeIn m-0'
              : 'max-w-7xl mx-auto space-y-6 animate-fadeIn'
          }`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

