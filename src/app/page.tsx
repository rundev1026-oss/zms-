'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

// Public Portal Views
import { PublicHomeView } from '@/components/views/public/PublicHomeView';
import { PublicAboutView } from '@/components/views/public/PublicAboutView';
import { PublicCalculatorView } from '@/components/views/public/PublicCalculatorView';
import { PublicPaymentView } from '@/components/views/public/PublicPaymentView';
import { PublicAssistanceView } from '@/components/views/public/PublicAssistanceView';
import { PublicTransparencyView } from '@/components/views/public/PublicTransparencyView';
import { PublicMyAccountView } from '@/components/views/public/PublicMyAccountView';
import { PublicAuthView } from '@/components/views/public/PublicAuthView';

// Admin / Internal Workbench Views
import { ExecutiveDashboard } from '@/components/views/ExecutiveDashboard';
import { UserManagementView } from '@/components/views/UserManagementView';
import { BeneficiaryRegistryView } from '@/components/views/BeneficiaryRegistryView';
import { AssistanceRequestsView } from '@/components/views/AssistanceRequestsView';
import { MultiStepRegistrationView } from '@/components/views/MultiStepRegistrationView';
import { AssessmentView } from '@/components/views/AssessmentView';
import { ApprovalsView } from '@/components/views/ApprovalsView';
import { DisbursementsView } from '@/components/views/DisbursementsView';
import { ZakatCalculatorView } from '@/components/views/ZakatCalculatorView';
import { PaymentAndMemberView } from '@/components/views/PaymentAndMemberView';
import { OfficerReportsAndAuditView } from '@/components/views/OfficerReportsAndAuditView';
import { BranchesAndDepartmentsView, AdminSettingsView } from '@/components/views/AdminOrgAndSettingsViews';
import { FollowUpMonitoringView } from '@/components/views/follow-up/FollowUpMonitoringView';
import { FinanceView } from '@/components/views/FinanceView';
import { useApp } from '@/context/AppContext';

export default function Home() {
  const { currentUser } = useApp();

  // Mode: 'public' (Default for portal visitors) | 'admin' (Staff workbench)
  const [portalMode, setPortalMode] = useState<'public' | 'admin'>('public');
  const [currentView, setCurrentView] = useState<string>('public-home');

  // Shared state for navigation across views
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);
  const [checkoutAmount, setCheckoutAmount] = useState<number>(5000);
  const [checkoutCategory, setCheckoutCategory] = useState<string>('ซะกาตทรัพย์สินทางการเงิน');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined);
  const [selectedCampaignTitle, setSelectedCampaignTitle] = useState<string | undefined>(undefined);
  const [selectedCampaignFundId, setSelectedCampaignFundId] = useState<string>('fund-1');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Auto detect hash on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'admin' || hash === 'dashboard') {
        setPortalMode('admin');
        setCurrentView('dashboard');
      } else if (hash === 'disbursements') {
        setPortalMode('admin');
        setCurrentView('disbursements');
      } else if (hash === 'about') {
        setPortalMode('public');
        setCurrentView('public-about');
      } else if (hash === 'transparency') {
        setPortalMode('public');
        setCurrentView('public-transparency');
      } else if (hash === 'calculator') {
        setPortalMode('public');
        setCurrentView('public-calculator');
      } else if (hash === 'assistance') {
        setPortalMode('public');
        setCurrentView('public-assistance');
      } else if (hash === 'donate') {
        setPortalMode('public');
        setCurrentView('public-donate');
      } else if (hash === 'payment') {
        setPortalMode('public');
        setCurrentView('public-payment');
      }
    }
  }, []);

  const getBreadcrumbTitle = (view: string) => {
    switch (view) {
      case 'dashboard': return 'Dashboard (ภาพรวมระบบ)';
      case 'beneficiaries':
      case 'registry': return 'ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต (Beneficiary Master Registry)';
      case 'assistance-requests': return 'ยื่นคำร้องขอความช่วยเหลือ (Assistance Requests)';
      case 'disbursements': return 'บันทึกการช่วยเหลือ (Disbursements & Aid Records)';
      case 'follow-up': return 'ตรวจสอบและติดตามผล (Follow-up & Monitoring)';
      case 'finance': return 'การเงินและบัญชี (Financial & Accounting Module)';
      case 'officer-reports':
      case 'reports': return 'รายงาน (Reports & Analytics)';
      case 'users': return 'จัดการผู้ใช้งาน (User Management & RBAC)';
      case 'new-application': return 'แบบสำรวจขึ้นทะเบียนใหม่ (New Registration Survey)';
      case 'assessment': return 'ตรวจสอบและประเมินสิทธิ์ (Field Assessment)';
      case 'approvals': return 'พิจารณาอนุมัติคำร้อง (Approvals Workbench)';
      case 'calculator': return 'เครื่องคำนวณซะกาต 5 หมวดหมู่ (Zakat Calculator)';
      case 'payment': return 'บันทึกรับบริจาค / ชำระซะกาต (Donation Entry)';
      case 'member-history': return 'ประวัติและรายการธุรกรรม (Transaction History)';
      case 'branches-depts': return 'โครงสร้างสาขาและแผนก (Branches & Departments)';
      case 'transparency-reports': return 'รายงานและความโปร่งใส (Reports & Transparency)';
      case 'audit-logs': return 'บันทึกประวัติระบบ (Audit Trail Log)';
      case 'settings': return 'การตั้งค่าระบบ & สำรองข้อมูล (System Settings)';
      default: return 'ระบบจัดการเงินซะกาต';
    }
  };

  const handleSetCheckout = (amount: number, category: string) => {
    setCheckoutAmount(amount);
    setCheckoutCategory(category);
    setSelectedCampaignId(undefined);
    setSelectedCampaignTitle(undefined);
  };

  const handleSelectCampaign = (campId: string, campTitle: string, targetFund: string) => {
    setSelectedCampaignId(campId);
    setSelectedCampaignTitle(campTitle);
    setSelectedCampaignFundId(targetFund);
    setCheckoutCategory(`บริจาคโครงการ: ${campTitle}`);
  };

  // Switch to admin view handler
  const handleSwitchToAdmin = () => {
    setPortalMode('admin');
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch to public portal handler
  const handleSwitchToPublic = () => {
    setPortalMode('public');
    setCurrentView('public-home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // -------------------------------------------------------------
  // MODE 1: PUBLIC PORTAL (Default for Citizens & Donors)
  // -------------------------------------------------------------
  if (portalMode === 'public') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-emerald-200">
        {/* Public Header */}
        <PublicHeader
          currentView={currentView}
          onNavigate={(v) => {
            setCurrentView(v);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSwitchToAdmin={handleSwitchToAdmin}
        />

        {/* Public Main Stage */}
        <main className={`flex-1 w-full ${currentView === 'public-home' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8'}`}>
          {currentView === 'public-home' && (
            <PublicHomeView
              onNavigate={setCurrentView}
              onSelectCampaignForDonation={handleSelectCampaign}
              onSetCalculatorAmount={handleSetCheckout}
            />
          )}

          {currentView === 'public-about' && (
            <PublicAboutView onNavigate={setCurrentView} />
          )}

          {currentView === 'public-calculator' && (
            <PublicCalculatorView
              onNavigate={setCurrentView}
              onSetCheckoutAmount={handleSetCheckout}
            />
          )}

          {currentView === 'public-payment' && (
            <PublicPaymentView
              onNavigate={setCurrentView}
              initialAmount={checkoutAmount}
              initialCategory={checkoutCategory}
              selectedCampaignId={selectedCampaignId}
              selectedCampaignTitle={selectedCampaignTitle}
              targetFundId={selectedCampaignFundId}
            />
          )}

          {currentView === 'public-donate' && (
            <PublicPaymentView
              onNavigate={setCurrentView}
              initialAmount={1000}
              initialCategory="บริจาคทั่วไป (ศอดะเกาะฮ์สาธารณประโยชน์)"
              selectedCampaignId={selectedCampaignId}
              selectedCampaignTitle={selectedCampaignTitle}
              targetFundId="fund-3"
            />
          )}

          {currentView === 'public-assistance' && (
            <PublicAssistanceView onNavigate={setCurrentView} />
          )}

          {currentView === 'public-transparency' && (
            <PublicTransparencyView />
          )}

          {currentView === 'public-my-account' && (
            <PublicMyAccountView onNavigate={setCurrentView} />
          )}

          {currentView === 'public-auth' && (
            <PublicAuthView onNavigate={setCurrentView} />
          )}
        </main>

        {/* Public Footer */}
        <PublicFooter onNavigate={setCurrentView} />
      </div>
    );
  }

  // -------------------------------------------------------------
  // MODE 2: ADMIN & STAFF WORKBENCH
  // -------------------------------------------------------------
  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-slate-50 text-slate-800 selection:bg-emerald-200 overflow-hidden">
      {/* 1. Top Navbar / Top Bar (Full width, Fixed/Sticky at top, shrink-0, stays in place) */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        breadcrumbTitle={getBreadcrumbTitle(currentView)}
        isMobileMenuOpen={isMobileSidebarOpen}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onSwitchToPublic={handleSwitchToPublic}
      />

      {/* 2 & 3. Main Workspace Area: Sidebar + Main Content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        {/* 2. Left Sidebar (Independent scrolling if long, fixed desktop width, slide-over on mobile) */}
        <Sidebar
          currentView={currentView}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onNavigate={(view) => {
            setCurrentView(view);
            setIsMobileSidebarOpen(false);
          }}
        />

        {/* 3. Main Content (Primary scrollable viewport area, distinct bounds, no double scrollbars) */}
        <main
          id="main-content-scroll"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto focus:outline-hidden touch-scroll"
        >
          {currentView === 'dashboard' && (
            <ExecutiveDashboard
              onNavigate={setCurrentView}
              onSelectApplication={(id) => setSelectedAppId(id)}
            />
          )}

          {currentView === 'users' && (
            <UserManagementView onNavigate={setCurrentView} />
          )}

          {(currentView === 'beneficiaries' || currentView === 'registry') && (
            <BeneficiaryRegistryView
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'assistance-requests' && (
            <AssistanceRequestsView
              onNavigate={setCurrentView}
              selectedRequestId={selectedAppId}
            />
          )}

          {currentView === 'new-application' && (
            <MultiStepRegistrationView onNavigate={setCurrentView} />
          )}

          {currentView === 'assessment' && (
            <AssessmentView onNavigate={setCurrentView} />
          )}

          {currentView === 'approvals' && (
            <ApprovalsView onNavigate={setCurrentView} />
          )}

          {currentView === 'disbursements' && (
            <DisbursementsView onNavigate={setCurrentView} />
          )}

          {currentView === 'follow-up' && (
            <FollowUpMonitoringView onNavigate={setCurrentView} />
          )}

          {currentView === 'finance' && (
            <FinanceView onNavigate={setCurrentView} />
          )}

          {currentView === 'calculator' && (
            <ZakatCalculatorView
              onNavigate={setCurrentView}
              onSetCheckoutAmount={handleSetCheckout}
            />
          )}

          {currentView === 'payment' && (
            <PaymentAndMemberView
              onNavigate={setCurrentView}
              checkoutAmount={checkoutAmount}
              checkoutCategory={checkoutCategory}
            />
          )}

          {currentView === 'member-history' && (
            <PaymentAndMemberView
              onNavigate={setCurrentView}
              checkoutAmount={checkoutAmount}
              checkoutCategory={checkoutCategory}
            />
          )}

          {currentView === 'officer-reports' && (
            <OfficerReportsAndAuditView
              onNavigate={setCurrentView}
              defaultSubTab="officers"
            />
          )}

          {currentView === 'audit-logs' && (
            <OfficerReportsAndAuditView
              onNavigate={setCurrentView}
              defaultSubTab="audit"
            />
          )}

          {currentView === 'branches-depts' && (
            <BranchesAndDepartmentsView onNavigate={setCurrentView} />
          )}

          {currentView === 'transparency-reports' && (
            <PublicTransparencyView />
          )}

          {currentView === 'settings' && (
            <AdminSettingsView />
          )}
        </main>
      </div>
    </div>
  );
}
