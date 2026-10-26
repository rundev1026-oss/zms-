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

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs pt-safe shrink-0">
      {/* 1. Top Sub-Bar: Organization Context & Quick Switcher */}
      <div className="bg-[#0b2545] text-white text-xs px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#143761]">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <ShieldCheck className="w-3 h-3 text-teal-400" />
            ADMIN PORTAL
          </span>
          <span className="text-slate-300 hidden md:inline">
            มูลนิธิซะกาตและสาธารณกุศล • ระบบบริหารจัดการภายในและควบคุมการเงิน
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Quick Role Switcher for RBAC Validation */}
          <div className="relative" ref={roleDropdownRef}>
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 hover:text-white transition-colors text-[11px] font-medium border border-white/15 min-h-[32px]"
              title="สลับบทบาทผู้ใช้เพื่อทดสอบการทำงาน"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>สลับบทบาท: <strong>{currentUser.roleTitleTh.split(' ')[0]}</strong></span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-medium text-[11px] transition-colors min-h-[32px]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เว็บไซต์ประชาชน</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Admin Navbar Bar (iPhone 15 touch target 44x44px for hamburger) */}
      <div className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0b2545]"
              aria-label={isMobileMenuOpen ? 'ปิดเมนูการจัดการ' : 'เปิดเมนูการจัดการ'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="admin-sidebar-drawer"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-[#0b2545]" /> : <Menu className="w-6 h-6 text-slate-700" />}
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0b2545] text-amber-300 font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
              ZMS
            </div>
            <div>
              <div className="text-[10px] sm:text-xs text-slate-400 font-semibold leading-none">
                ระบบจัดการเงินซะกาต • ส่วนผู้ดูแลระบบ
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5 truncate max-w-[180px] sm:max-w-md">
                <span className="truncate">{breadcrumbTitle}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Notifications, User Info & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pending Approvals alert badge */}
          {pendingApprovalsCount > 0 && (
            <button
              onClick={() => onNavigate('approvals')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors animate-soft-pulse min-h-[36px]"
              title="มีคำร้องรออนุมัติ"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>รออนุมัติ {pendingApprovalsCount}</span>
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
              <span>ติดตามผล {followUpBadgeCount}</span>
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
            className="w-10 h-10 min-w-[40px] min-h-[40px] sm:w-11 sm:h-11 sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
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
