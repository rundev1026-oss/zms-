'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { FINANCE_MENU } from '@/lib/financeMenu';
import { 
  LayoutDashboard, 
  Users, 
  FileCheck2, 
  CheckCircle2, 
  Wallet, 
  ArrowUpRight, 
  Calculator, 
  Clock, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown,
  ClipboardCheck, 
  Landmark, 
  ArrowDownLeft,
  ArrowLeftRight,
  PieChart,
  FileSpreadsheet,
  Database,
  Building2,
  HeartHandshake,
  FileText,
  Bookmark,
  Sliders,
  Grid,
  Layers,
  LogOut,
  X 
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface SubMenuItem {
  id: string;
  aliases?: string[];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: string[];
}

interface SubMenuGroup {
  title: string;
  items: SubMenuItem[];
}

export function Sidebar({ currentView, onNavigate, isMobileOpen, onCloseMobile }: SidebarProps) {
  const { currentUser, applications, registries, followUpBadgeCount, logoutUser } = useApp();

  const pendingApprovals = applications.filter((a) => a.status === 'pending_approval').length;
  const pendingDisbursements = applications.filter((a) => a.status === 'wait_disbursement').length;
  const pendingDocReviews = applications.filter((a) => a.status === 'doc_review').length;
  const [pendingTreasurerApprovals, setPendingTreasurerApprovals] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchTreasurerPending = async () => {
      try {
        const res = await fetch('/api/finance/workflow-actions?view=batch_list&tab=pending_approval');
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          const count = json.data.badgeCounts?.pending_approval ?? json.data.counts?.pending_approval ?? json.data.items?.length ?? 0;
          setPendingTreasurerApprovals(count);
        }
      } catch (e) {
        // non-fatal
      }
    };
    fetchTreasurerPending();
    const interval = setInterval(fetchTreasurerPending, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const adminViewsList = [
    'admin-center',
    'admin-users',
    'users',
    'admin-roles',
    'roles-permissions',
    'admin-org',
    'branches-depts',
    'admin-matrix',
    'matrix',
    'relationship-matrix',
    'admin-models',
    'assistance-models',
    'admin-types',
    'assistance-types',
    'admin-formats',
    'formats',
    'assistance-formats',
    'admin-asnaf',
    'asnaf-categories',
    'admin-settings',
    'settings',
  ];

  const isAdminView = adminViewsList.includes(currentView);
  const [isAdminExpanded, setIsAdminExpanded] = useState<boolean>(true);
  const financeRoute = currentView.startsWith('finance');
  const [financeOpen, setFinanceOpen] = useState(true);
  const financeItems = FINANCE_MENU.filter((item) => item.roles.includes(currentUser.role));
  const financeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    dashboard: LayoutDashboard,
    income: ArrowDownLeft,
    'bank-accounts': Building2,
    'asnaf-allocation': PieChart,
    transfers: ArrowLeftRight,
    'disbursement-approval': ShieldCheck,
    expenses: Wallet,
    reports: FileSpreadsheet,
  };

  // Auto-expand admin menu when currently viewing any admin section
  useEffect(() => {
    if (isAdminView) {
      setIsAdminExpanded(true);
    }
  }, [isAdminView]);

  useEffect(() => {
    const saved = window.localStorage.getItem('zms_finance_menu_open');
    if (saved === '0') setFinanceOpen(false);
    if (saved === '1') setFinanceOpen(true);
  }, []);

  useEffect(() => {
    if (financeRoute) setFinanceOpen(true);
  }, [financeRoute]);

  // CANONICAL MENU STRUCTURE (Strict Specification)
  // กลุ่มที่ 1: ระบบงานหลัก (Main Operations) - 9 รายการ
  const mainOperationsItems = [
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
  ];

  // 2.1 การตั้งค่าและบริหารระบบ - เมนูย่อย 2 กลุ่ม
  const adminSubGroups: SubMenuGroup[] = [
    {
      title: 'A. การบริหารระบบ',
      items: [
        {
          id: 'admin-users',
          aliases: ['users'],
          label: 'จัดการผู้ใช้งาน',
          icon: Users,
          allowedRoles: ['super_admin', 'executive', 'admin'],
        },
        {
          id: 'admin-roles',
          aliases: ['roles', 'roles-permissions'],
          label: 'บทบาทและสิทธิ์การเข้าถึง',
          icon: ShieldCheck,
          allowedRoles: ['super_admin'],
        },
        {
          id: 'admin-org',
          aliases: ['org', 'branches-depts'],
          label: 'โครงสร้างองค์กรและหน่วยงาน',
          icon: Building2,
          allowedRoles: ['super_admin', 'executive', 'admin'],
        },
      ],
    },
    {
      title: 'B. การตั้งค่าข้อมูลพื้นฐาน',
      items: [
        {
          id: 'admin-matrix',
          aliases: ['matrix', 'relationship-matrix'],
          label: 'เมทริกซ์ความสัมพันธ์ 3 ระดับ',
          icon: Grid,
          allowedRoles: ['super_admin', 'executive', 'admin'],
        },
        {
          id: 'admin-asnaf',
          aliases: ['asnaf', 'asnaf-categories'],
          label: 'หมวดหมู่อัสนัฟ (Asnaf)',
          icon: Bookmark,
          allowedRoles: ['super_admin', 'executive', 'admin'],
        },
        {
          id: 'admin-types',
          aliases: ['types', 'assistance-types'],
          label: 'ประเภทความช่วยเหลือ (Assistance Types)',
          icon: FileText,
          allowedRoles: ['super_admin', 'executive', 'admin'],
        },
        {
          id: 'admin-formats',
          aliases: ['formats', 'assistance-formats'],
          label: 'รูปแบบการส่งมอบ (Delivery Formats)',
          icon: Layers,
          allowedRoles: ['super_admin', 'executive', 'admin'],
        },
        {
          id: 'admin-models',
          aliases: ['models', 'assistance-models'],
          label: 'รูปแบบการช่วยเหลือ (Models)',
          icon: HeartHandshake,
          allowedRoles: ['super_admin', 'executive', 'admin'],
        },
        {
          id: 'admin-settings',
          aliases: ['settings', 'general', 'general-settings'],
          label: 'การตั้งค่าทั่วไป',
          icon: Sliders,
          allowedRoles: ['super_admin'],
        },
      ],
    },
  ];

  // Check if current user has permission for any admin sub-item
  const allowedAdminSubGroups = adminSubGroups.map(group => ({
    ...group,
    items: group.items.filter(item => item.allowedRoles.includes(currentUser.role)),
  })).filter(group => group.items.length > 0);

  const canAccessAdmin = allowedAdminSubGroups.length > 0;

  // Filter Group 1 items by user role
  const visibleMainItems = mainOperationsItems.filter((item) =>
    item.allowedRoles.includes(currentUser.role)
  );

  const handleNavigate = (view: string) => {
    onNavigate(view);
    if (onCloseMobile) onCloseMobile();
  };

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
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto w-72 sm:w-80 max-w-[85vw] bg-white border-r border-slate-200 flex h-full min-h-0 shrink-0 flex-col overflow-hidden transition-transform duration-300 ease-in-out pt-safe pb-safe ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Drawer Header with Close Button */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 p-3.5 md:hidden">
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

        {/* Sidebar Content (Scrollable) */}
        <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-4 touch-scroll">
          {/* ============================================================ */}
          {/* กลุ่มที่ 1: ระบบงานหลัก (Main Operations) - 9 รายการ */}
          {/* ============================================================ */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              กลุ่มที่ 1: ระบบงานหลัก
            </div>

            <div className="space-y-0.5 pt-0.5">
              {visibleMainItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                if (item.id === 'finance') {
                  const parentActive = financeRoute;
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className={`flex min-h-[42px] items-center justify-between rounded-xl px-3 py-2 text-xs font-medium ${
                        parentActive ? 'bg-[#0b2545] text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}>
                        <button
                          type="button"
                          onClick={() => handleNavigate('finance/dashboard')}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          title="การเงินและบัญชี (Financial & Accounting)"
                        >
                          <Landmark className={`h-4 w-4 shrink-0 ${parentActive ? 'text-amber-300' : 'text-slate-400'}`} />
                          <span className="truncate">การเงินและบัญชี</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFinanceOpen((open) => {
                              const next = !open;
                              window.localStorage.setItem('zms_finance_menu_open', next ? '1' : '0');
                              return next;
                            });
                          }}
                          className="ml-1 shrink-0 rounded-lg p-1 hover:bg-white/20"
                          aria-label={financeOpen ? 'ยุบเมนูการเงินและบัญชี' : 'ขยายเมนูการเงินและบัญชี'}
                          title={financeOpen ? 'ยุบเมนูย่อย' : 'ขยายเมนูย่อย'}
                        >
                          {financeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                      {financeOpen && (
                        <div className="ml-4 space-y-0.5 border-l-2 border-slate-200 py-1 pl-2">
                          {financeItems.map((subItem, index) => {
                            const SubIcon = financeIcons[subItem.slug] || Landmark;
                            const routeSlug = currentView.startsWith('finance/') ? currentView.slice('finance/'.length) : '';
                            const visibleSlug = routeSlug === 'reconciliation' ? 'bank-accounts' : routeSlug === 'transactions' ? 'reports' : routeSlug;
                            const subActive = subItem.slug === visibleSlug;
                            const showTreasurerGroup = subItem.group === 'treasurer' && financeItems[index - 1]?.group !== 'treasurer';
                            return (
                              <React.Fragment key={subItem.slug}>
                                {showTreasurerGroup ? (
                                  <div className="px-2.5 pb-1 pt-3 text-[10px] font-bold tracking-wide text-[#0B2545]">
                                    กลุ่มงานเหรัญญิก
                                  </div>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => handleNavigate(`finance/${subItem.slug}`)}
                                  className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${
                                    subActive ? 'border border-teal-200/80 bg-teal-50 font-bold text-teal-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                                  title={`${subItem.label} (${subItem.english})`}
                                >
                                  <SubIcon className={`h-3.5 w-3.5 shrink-0 ${subActive ? 'text-teal-700' : 'text-slate-400'}`} />
                                  <span className="min-w-0 flex-1 truncate">{subItem.label}</span>
                                  {subItem.slug === 'disbursement-approval' && pendingTreasurerApprovals > 0 && (
                                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{pendingTreasurerApprovals}</span>
                                  )}
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
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

          {/* ============================================================ */}
          {/* กลุ่มที่ 2: ระบบงานและเครื่องมือสนับสนุน (System & Support Tools) */}
          {/* ============================================================ */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              กลุ่มที่ 2: ระบบงานและเครื่องมือสนับสนุน
            </div>

            <div className="space-y-1 pt-0.5">
              {/* 2.1 การตั้งค่าและบริหารระบบ (Parent with Expandable/Collapsible Sub-menu) */}
              {canAccessAdmin && (
                <div className="space-y-1">
                  <div
                    className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all select-none ${
                      isAdminView
                        ? 'bg-[#0b2545] text-white shadow-xs font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {/* Click title to open Admin Hub */}
                    <button
                      type="button"
                      onClick={() => handleNavigate('admin-center')}
                      className="flex-1 flex items-center gap-2.5 text-left truncate"
                    >
                      <Settings
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isAdminView ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">การตั้งค่าและบริหารระบบ</span>
                    </button>

                    {/* Toggle Chevron for Expand/Collapse */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAdminExpanded(!isAdminExpanded);
                      }}
                      className="p-1 rounded-lg hover:bg-white/20 transition-colors text-inherit ml-1 shrink-0"
                      aria-label={isAdminExpanded ? 'ยุบเมนูย่อย' : 'ขยายเมนูย่อย'}
                      title={isAdminExpanded ? 'ยุบเมนูย่อย' : 'ขยายเมนูย่อย'}
                    >
                      {isAdminExpanded ? (
                        <ChevronDown className="w-4 h-4 text-inherit" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-inherit" />
                      )}
                    </button>
                  </div>

                  {/* Sub-menu groups & items (Indented & Collapsible) */}
                  {isAdminExpanded && (
                    <div className="pl-3 pr-1 pt-1 pb-2 space-y-3 border-l-2 border-slate-200 ml-4 animate-fadeIn">
                      {allowedAdminSubGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1">
                          {/* Sub-Group Header */}
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-0.5">
                            {group.title}
                          </div>

                          {/* Sub-Group Items */}
                          <div className="space-y-0.5">
                            {group.items.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive =
                                currentView === subItem.id ||
                                (subItem.aliases && subItem.aliases.includes(currentView));

                              return (
                                <button
                                  key={subItem.id}
                                  onClick={() => handleNavigate(subItem.id)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left ${
                                    isSubActive
                                      ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200/80 shadow-2xs'
                                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                                >
                                  <SubIcon
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      isSubActive ? 'text-teal-700' : 'text-slate-400'
                                    }`}
                                  />
                                  <span className="truncate">{subItem.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2.2 คำนวณซะกาต 5 หมวด */}
              {['super_admin', 'finance', 'officer', 'member', 'executive'].includes(currentUser.role) && (
                <button
                  onClick={() => handleNavigate('calculator')}
                  className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    currentView === 'calculator'
                      ? 'bg-[#0b2545] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Calculator
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        currentView === 'calculator' ? 'text-amber-300' : 'text-slate-400 group-hover:text-teal-700'
                      }`}
                    />
                    <span className="truncate">คำนวณซะกาต 5 หมวด</span>
                  </div>
                </button>
              )}

              {/* 2.3 รับบริจาค / จ่ายซะกาต */}
              {['super_admin', 'finance', 'officer', 'executive'].includes(currentUser.role) && (
                <button
                  onClick={() => handleNavigate('payment')}
                  className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    currentView === 'payment'
                      ? 'bg-[#0b2545] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ArrowUpRight
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        currentView === 'payment' ? 'text-amber-300' : 'text-slate-400 group-hover:text-teal-700'
                      }`}
                    />
                    <span className="truncate">รับบริจาค / จ่ายซะกาต</span>
                  </div>
                </button>
              )}

              {/* 2.4 บันทึกประวัติการทำงาน (Audit) */}
              {['super_admin', 'executive'].includes(currentUser.role) && (
                <button
                  onClick={() => handleNavigate('audit-logs')}
                  className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    currentView === 'audit-logs'
                      ? 'bg-[#0b2545] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Clock
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        currentView === 'audit-logs' ? 'text-amber-300' : 'text-slate-400 group-hover:text-teal-700'
                      }`}
                    />
                    <span className="truncate">บันทึกประวัติการทำงาน (Audit)</span>
                  </div>
                </button>
              )}

              {/* 2.5 สำรองข้อมูล (Backup) */}
              {['super_admin', 'executive'].includes(currentUser.role) && (
                <button
                  onClick={() => handleNavigate('backup')}
                  className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    currentView === 'backup'
                      ? 'bg-[#0b2545] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Database
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        currentView === 'backup' ? 'text-amber-300' : 'text-slate-400 group-hover:text-teal-700'
                      }`}
                    />
                    <span className="truncate">สำรองข้อมูล</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info Box */}
        <div className="shrink-0 space-y-2 border-t border-slate-200 bg-slate-50 p-3">
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
