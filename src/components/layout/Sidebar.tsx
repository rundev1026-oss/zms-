'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  FileCheck2, 
  CheckCircle2, 
  Wallet, 
  ArrowUpRight, 
  Calculator, 
  Receipt, 
  Clock, 
  BarChart3, 
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet,
  LogOut,
  Building2,
  Settings,
  ShieldCheck,
  ChevronRight,
  ClipboardCheck,
  Landmark,
  X
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  allowedRoles: string[];
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ currentView, onNavigate, isMobileOpen, onCloseMobile }: SidebarProps) {
  const { currentUser, applications, registries, followUpBadgeCount, logoutUser } = useApp();

  const pendingApprovals = applications.filter((a) => a.status === 'pending_approval').length;
  const pendingDisbursements = applications.filter((a) => a.status === 'wait_disbursement').length;
  const pendingDocReviews = applications.filter((a) => a.status === 'doc_review').length;

  // Structure strictly mandated by Section 1 of the Prompt:
  // กลุ่มที่ 1: ระบบงานหลัก
  // 1. Dashboard (ภาพรวมระบบ)
  // 2. ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต
  // 3. ยื่นคำร้องขอความช่วยเหลือ
  // 4. ตรวจสอบ & ประเมินสิทธิ์
  // 5. พิจารณาอนุมัติคำร้อง
  // 6. บันทึกการช่วยเหลือ
  // 7. ตรวจสอบและติดตามผล
  // 8. การเงินและบัญชี
  // 9. รายงาน
  //
  // กลุ่มที่ 2: ระบบงานและเครื่องมือสนับสนุน
  // 1. จัดการผู้ใช้งาน
  // 2. สาขาและแผนกองค์กร
  // 3. คำนวณซะกาต 5 หมวด
  // 4. รับบริจาค / จ่ายซะกาต
  // 5. บันทึกประวัติการทำงาน (Audit)
  // 6. การตั้งค่าระบบ & สำรองข้อมูล
  const navGroups: SidebarGroup[] = [
    {
      title: 'กลุ่มที่ 1: ระบบงานหลัก',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard (ภาพรวมระบบ)',
          icon: LayoutDashboard,
          allowedRoles: ['super_admin', 'executive', 'officer', 'approver', 'finance', 'member'],
        },
        {
          id: 'beneficiaries',
          label: 'ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต',
          icon: Users,
          badge: registries.length.toString(),
          badgeColor: 'bg-teal-100 text-teal-800',
          allowedRoles: ['super_admin', 'executive', 'officer', 'approver', 'finance', 'member'],
        },
        {
          id: 'assistance-requests',
          label: 'ยื่นคำร้องขอความช่วยเหลือ',
          icon: FileCheck2,
          badge: applications.length.toString(),
          badgeColor: 'bg-sky-100 text-sky-800',
          allowedRoles: ['super_admin', 'executive', 'officer', 'approver', 'finance', 'member'],
        },
        {
          id: 'assessment',
          label: 'ตรวจสอบ & ประเมินสิทธิ์',
          icon: FileCheck2,
          badge: pendingDocReviews > 0 ? pendingDocReviews.toString() : undefined,
          badgeColor: 'bg-amber-100 text-amber-800',
          allowedRoles: ['super_admin', 'officer', 'approver'],
        },
        {
          id: 'approvals',
          label: 'พิจารณาอนุมัติคำร้อง',
          icon: CheckCircle2,
          badge: pendingApprovals > 0 ? pendingApprovals.toString() : undefined,
          badgeColor: 'bg-rose-100 text-rose-800',
          allowedRoles: ['super_admin', 'executive', 'approver'],
        },
        {
          id: 'disbursements',
          label: 'บันทึกการช่วยเหลือ',
          icon: Wallet,
          badge: pendingDisbursements > 0 ? pendingDisbursements.toString() : undefined,
          badgeColor: 'bg-emerald-100 text-emerald-800',
          allowedRoles: ['super_admin', 'executive', 'finance', 'officer'],
        },
        {
          id: 'follow-up',
          label: 'ตรวจสอบและติดตามผล',
          icon: ClipboardCheck,
          badge: followUpBadgeCount > 0 ? followUpBadgeCount.toString() : undefined,
          badgeColor: 'bg-amber-100 text-amber-800',
          allowedRoles: ['super_admin', 'executive', 'officer', 'approver', 'finance'],
        },
        {
          id: 'finance',
          label: 'การเงินและบัญชี',
          icon: Landmark,
          allowedRoles: ['super_admin', 'executive', 'finance', 'officer'],
        },
        {
          id: 'officer-reports',
          label: 'รายงาน',
          icon: BarChart3,
          allowedRoles: ['super_admin', 'executive', 'officer', 'approver', 'finance'],
        },
      ],
    },
    {
      title: 'กลุ่มที่ 2: ระบบงานและเครื่องมือสนับสนุน',
      items: [
        {
          id: 'users',
          label: 'จัดการผู้ใช้งาน',
          icon: ShieldAlert,
          allowedRoles: ['super_admin'],
        },
        {
          id: 'branches-depts',
          label: 'สาขาและแผนกองค์กร',
          icon: Building2,
          allowedRoles: ['super_admin', 'executive'],
        },
        {
          id: 'calculator',
          label: 'คำนวณซะกาต 5 หมวด',
          icon: Calculator,
          allowedRoles: ['super_admin', 'finance', 'officer', 'member'],
        },
        {
          id: 'payment',
          label: 'รับบริจาค / จ่ายซะกาต',
          icon: ArrowUpRight,
          allowedRoles: ['super_admin', 'finance', 'officer'],
        },
        {
          id: 'audit-logs',
          label: 'บันทึกประวัติการทำงาน (Audit)',
          icon: Clock,
          allowedRoles: ['super_admin', 'executive'],
        },
        {
          id: 'settings',
          label: 'การตั้งค่าระบบ & สำรองข้อมูล',
          icon: Settings,
          allowedRoles: ['super_admin'],
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#0b2545]/60 backdrop-blur-xs z-40 md:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-sidebar-drawer"
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto w-72 sm:w-80 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full md:min-h-0 transition-transform duration-300 ease-in-out pt-safe pb-safe ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Drawer Header with Close Button (44x44px touch area) */}
        <div className="md:hidden p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0b2545] text-amber-300 font-bold flex items-center justify-center text-xs">
              ZMS
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-900 leading-tight">เมนูระบบจัดการ</div>
              <div className="text-[10px] text-slate-500">มูลนิธิซะกาตและสาธารณกุศล</div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-colors"
            aria-label="ปิดเมนูการจัดการ"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Sidebar Content (Scrollable with touch momentum) */}
        <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto touch-scroll">
          {navGroups.map((group, idx) => {
            // Role-based authorization filter: only show menu items allowed for current user role
            const visibleItems = group.items.filter((item) =>
              item.allowedRoles.includes(currentUser.role)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </div>

                <div className="space-y-0.5 pt-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          if (onCloseMobile) onCloseMobile();
                        }}
                        className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-[#0b2545] text-white shadow-xs font-bold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-teal-700'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : item.badgeColor || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info Box */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
              <span>บทบาท:</span>
              <span className="text-teal-700">{currentUser.roleTitleTh}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              สังกัด: {currentUser.branch}
            </div>
          </div>

          <button
            onClick={async () => {
              if (onCloseMobile) onCloseMobile();
              await logoutUser();
              window.location.href = '/login?logout=success';
            }}
            className="w-full min-h-[44px] py-2 px-3 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors text-xs font-bold flex items-center justify-center gap-1.5"
            title="ออกจากระบบ"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            <span>ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
}
