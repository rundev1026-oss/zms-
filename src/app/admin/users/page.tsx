'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { UserManagementView } from '@/components/views/UserManagementView';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const router = useRouter();
  const { currentUser, isAuthLoading } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Authentication & Role check
  useEffect(() => {
    if (!isAuthLoading) {
      if (!currentUser || currentUser.role === 'public') {
        router.push('/login?redirect=/admin/users');
      }
    }
  }, [currentUser, isAuthLoading, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-purple-700 animate-spin" />
          <span className="text-sm font-semibold text-slate-600">กำลังตรวจสอบสิทธิ์การเข้าถึง...</span>
        </div>
      </div>
    );
  }

  // If user is not super_admin
  if (currentUser && currentUser.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            หน้าการจัดการผู้ใช้งานระดับระบบสงวนสิทธิ์เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้น บัญชีของท่านมีบทบาท <strong>{currentUser.roleTitleTh || currentUser.role}</strong>
          </p>
          <div className="pt-2">
            <Link
              href="/#dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับสู่หน้าหลัก</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-emerald-200">
      {/* Top Navbar */}
      <Navbar
        currentView="users"
        onNavigate={(view) => {
          if (view === 'users') return;
          router.push(`/#${view}`);
        }}
        breadcrumbTitle="จัดการบัญชีผู้ใช้งาน & สิทธิ์การเข้าถึง (Super Admin User Management)"
        isMobileMenuOpen={isMobileSidebarOpen}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onSwitchToPublic={() => router.push('/')}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentView="users"
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onNavigate={(view) => {
            setIsMobileSidebarOpen(false);
            if (view === 'users') return;
            router.push(`/#${view}`);
          }}
        />

        {/* User Management Stage */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <UserManagementView
            onNavigate={(view) => router.push(`/#${view}`)}
          />
        </main>
      </div>
    </div>
  );
}
