'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import { 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  Bell, 
  ChevronRight, 
  Users, 
  HelpCircle,
  Menu,
  X,
  LogOut,
  Globe,
  CheckCircle2,
  AlertCircle,
  User,
  ExternalLink,
  ChevronDown,
  ClipboardCheck
} from 'lucide-react';
import { NotificationCenterPopover } from '@/components/common/NotificationCenterPopover';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  breadcrumbTitle?: string;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onSwitchToPublic?: () => void;
}

export function Navbar({ 
  currentView, 
  onNavigate, 
  breadcrumbTitle = 'แดชบอร์ดภาพรวม',
  isMobileMenuOpen,
  onToggleMobileMenu,
  onSwitchToPublic
}: NavbarProps) {
  const { currentUser, switchUserRole, applications, followUpBadgeCount, logoutUser } = useApp();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const pendingApprovalsCount = applications.filter((a) => a.status === 'pending_approval').length;
  const pendingDisbursementsCount = applications.filter((a) => a.status === 'wait_disbursement').length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleOptions: { role: UserRole; title: string; badge: string; color: string }[] = [
    { role: 'super_admin', title: 'ผู้ดูแลระบบสูงสุด (Super Admin)', badge: 'ADMIN', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { role: 'executive', title: 'ผู้บริหารองค์กร (Executive)', badge: 'EXEC', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { role: 'officer', title: 'เจ้าหน้าที่ภาคสนาม (Field Officer)', badge: 'OFFICER', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { role: 'approver', title: 'กรรมการอนุมัติ (Shariah Approver)', badge: 'APPROVER', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { role: 'finance', title: 'เจ้าหน้าที่การเงิน (Finance Officer)', badge: 'FINANCE', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    { role: 'member', title: 'สมาชิกทั่วไป (Member)', badge: 'MEMBER', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  ];

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = '/login?logout=success';
  };

  const mobileTitle = breadcrumbTitle.split('(')[0].trim() || breadcrumbTitle;
  const roleShort = currentUser.roleTitleTh.split(' ')[0];

  return (
    <header className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-200 bg-white/95 pt-safe shadow-2xs backdrop-blur-md">
      {/* 1. Top Sub-Bar: Organization Context & Quick Switcher */}
      <div className="flex items-center justify-between gap-2 border-b border-[#143761] bg-[#0b2545] py-1 pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] text-xs text-white sm:px-6 sm:py-1.5">
        <div className="flex min-w-0 items-center gap-2 text-[11px]">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/20 px-2 py-0.5 font-bold text-teal-300">
            <ShieldCheck className="h-3 w-3 text-teal-400" />
            ADMIN PORTAL
          </span>
          <span className="hidden truncate text-slate-300 md:inline">
            มูลนิธิซะกาตและสาธารณกุศล • ระบบบริหารจัดการภายในและควบคุมการเงิน
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* Quick Role Switcher for RBAC Validation */}
          <div className="relative" ref={roleDropdownRef}>
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-medium text-sky-200 transition-colors hover:bg-white/20 hover:text-white"
              title={`สลับบทบาท: ${currentUser.roleTitleTh}`}
              aria-label={`สลับบทบาท: ${currentUser.roleTitleTh}`}
            >
              <UserCheck className="h-3.5 w-3.5 text-amber-300" />
              <span className="max-w-[5.5rem] truncate md:hidden">{roleShort}</span>
              <span className="hidden md:inline">สลับบทบาท: <strong>{roleShort}</strong></span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white text-slate-800 rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 animate-fadeIn text-xs">
                <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-600 text-[10px] uppercase tracking-wider">
                  จำลองบทบาทผู้ใช้งาน (RBAC Switcher)
                </div>
                {roleOptions.map((opt) => (
                  <button
                    key={opt.role}
                    onClick={() => {
                      switchUserRole(opt.role);
                      setIsRoleDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                      currentUser.role === opt.role ? 'bg-sky-50 font-bold text-[#0b2545]' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{opt.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${opt.color}`}>
                      {opt.badge}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Switch to Public Website CTA */}
          {onSwitchToPublic && (
            <button
              onClick={onSwitchToPublic}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-teal-700 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-teal-600"
              title="เว็บไซต์ประชาชน"
              aria-label="เว็บไซต์ประชาชน"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden md:inline">เว็บไซต์ประชาชน</span>
              <ChevronRight className="hidden h-3 w-3 md:inline" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Admin Navbar Bar (iPhone 15 touch target 44x44px for hamburger) */}
      <div className="flex items-center justify-between gap-2 py-1.5 pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] sm:gap-4 sm:px-6 sm:py-3">
        {/* Left: Brand & Breadcrumb */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0b2545] md:hidden"
              aria-label={isMobileMenuOpen ? 'ปิดเมนูการจัดการ' : 'เปิดเมนูการจัดการ'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="admin-sidebar-drawer"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6 text-[#0b2545]" /> : <Menu className="h-6 w-6 text-slate-700" />}
            </button>
          )}

          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b2545] text-sm font-extrabold text-amber-300 shadow-xs sm:h-10 sm:w-10">
              ZMS
            </div>
            <div className="min-w-0">
              <div className="hidden text-xs font-semibold leading-none text-slate-400 sm:block">
                ระบบจัดการเงินซะกาต • ส่วนผู้ดูแลระบบ
              </div>
              <div className="truncate text-[15px] font-extrabold leading-5 text-slate-900 sm:mt-0.5 sm:text-sm">
                <span className="sm:hidden">{mobileTitle}</span>
                <span className="hidden sm:inline">{breadcrumbTitle}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Notifications, User Info & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Notification Center */}
          <NotificationCenterPopover onNavigate={onNavigate} />

          {/* Pending Approvals alert badge */}
          {pendingApprovalsCount > 0 && (
            <button
              onClick={() => onNavigate('approvals')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors animate-soft-pulse min-h-[36px]"
              title="มีคำร้องรออนุมัติ"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span className="md:hidden">{pendingApprovalsCount}</span>
              <span className="hidden md:inline">รออนุมัติ {pendingApprovalsCount}</span>
            </button>
          )}

          {/* Pending Disbursements alert badge */}
          {pendingDisbursementsCount > 0 && (
            <button
              onClick={() => onNavigate('disbursements')}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-colors min-h-[36px]"
              title="มีรายการรอจ่ายเงิน"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>รอจ่าย {pendingDisbursementsCount}</span>
            </button>
          )}

          {/* Follow-up Due / Overdue alert badge */}
          {followUpBadgeCount > 0 && (
            <button
              onClick={() => onNavigate('follow-up')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors animate-soft-pulse min-h-[36px]"
              title="มีรายการที่ถึงกำหนดหรือค้างติดตามผล"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
              <span className="md:hidden">{followUpBadgeCount}</span>
              <span className="hidden md:inline">ติดตามผล {followUpBadgeCount}</span>
            </button>
          )}

          {/* User Profile Summary */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
            <div className="w-7 h-7 rounded-lg bg-[#0b2545] text-white font-bold flex items-center justify-center text-xs">
              {currentUser.name.slice(0, 1)}
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-teal-700 font-medium">
                {currentUser.roleTitleTh} • {currentUser.branch}
              </div>
            </div>
          </div>

          {/* Logout Action (Min 44x44 touch target) */}
          <button
            onClick={handleLogout}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-transparent text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
