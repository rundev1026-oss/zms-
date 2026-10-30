'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Branch, Department } from '@/types';
import { MODULE_PERMISSION_CATALOG, ModuleCatalogItem } from '@zms/shared';
import { ModalPortal } from '@/components/common/Modal';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Layers,
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  Key,
  Sliders,
  History,
  Lock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  LogOut,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
  UserCheck,
  UserX,
  Send,
  RefreshCw,
  FileText,
  Smartphone,
  Laptop,
  Globe,
  Edit,
  Shield,
  Fingerprint,
  Calendar,
  CheckCircle
} from 'lucide-react';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  authToken?: string | null;
  actor?: any;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onEditUser: (user: User) => void;
  onManagePermissions: (user: User) => void;
  onStatusChange: (user: User, newStatus: 'active' | 'suspended' | 'disabled') => void;
  onResetPassword: (user: User) => void;
  onSendInvite: (user: User) => void;
  onRevokeSession: (user: User) => void;
  branches?: Branch[];
  departments?: Department[];
}

export type DetailTabType = 'profile' | 'organization' | 'permissions' | 'scope' | 'audit' | 'security';

export function UserDetailModal({
  isOpen,
  onClose,
  user,
  authToken,
  actor,
  showToast,
  onEditUser,
  onManagePermissions,
  onStatusChange,
  onResetPassword,
  onSendInvite,
  onRevokeSession,
  branches = [],
  departments = [],
}: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTabType>('profile');
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailedUser, setDetailedUser] = useState<any>(null);
  const [effectivePerms, setEffectivePerms] = useState<string[]>([]);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [overridesList, setOverridesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeModuleFilter, setActiveModuleFilter] = useState<'ALL' | 'CORE' | 'SUPPORT'>('ALL');
  const [permissionSearch, setPermissionSearch] = useState('');

  // Normalize user properties for cross-compatibility
  const targetUser = detailedUser || user;

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (actor?.id) {
      headers['x-actor-id'] = actor.id;
    }
    if (actor?.role) {
      headers['x-actor-role'] = actor.role;
    }
    return headers;
  }, [authToken, actor]);

  // Load deep user data from backend
  const fetchDeepUserData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoadingDetail(true);
      // Fetch user detail
      const res = await fetch(`/api/admin/users/${user.id}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDetailedUser(json.data);
      }

      // Fetch user permissions breakdown
      try {
        const permRes = await fetch(`/api/admin/users/${user.id}/permissions`, {
          headers: getAuthHeaders(),
        });
        const permJson = await permRes.json();
        if (permJson.success && permJson.data) {
          setRolePerms(permJson.data.rolePermissions || []);
          setOverridesList(permJson.data.overrides || []);
          setEffectivePerms(permJson.data.effectivePermissions || []);
        } else if (json.data?.effectivePermissions) {
          setEffectivePerms(json.data.effectivePermissions);
          setRolePerms(json.data.rolePermissions || []);
          setOverridesList(json.data.overrides || []);
        }
      } catch (err) {
        console.error('Failed to load user permissions:', err);
      }

      // Fetch audit logs
      setIsLoadingAudit(true);
      try {
        const auditRes = await fetch(`/api/admin/users/${user.id}/audit-logs`, {
          headers: getAuthHeaders(),
        });
        const auditJson = await auditRes.json();
        if (auditJson.success && Array.isArray(auditJson.data)) {
          setAuditLogs(auditJson.data);
        } else {
          setAuditLogs([]);
        }
      } catch (err) {
        setAuditLogs([]);
      } finally {
        setIsLoadingAudit(false);
      }
    } catch (err) {
      console.error('Failed to load detailed user data:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [user?.id, getAuthHeaders]);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchDeepUserData();
    }
  }, [isOpen, user?.id, fetchDeepUserData]);

  if (!isOpen || !user) return null;

  // Normalized display fields
  const userName =
    targetUser.name ||
    targetUser.displayName ||
    `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() ||
    targetUser.username ||
    targetUser.email.split('@')[0];
  const username = targetUser.username || targetUser.email.split('@')[0];
  const roleCode = targetUser.role || targetUser.primaryRoleCode?.toLowerCase() || 'officer';
  const roleTitle = targetUser.roleTitleTh || targetUser.primaryRoleName || roleCode;

  const isActive = targetUser.status === 'active' || targetUser.status === 'ACTIVE' || targetUser.isActive === true;
  const isSuspended = targetUser.status === 'suspended';
  const isDisabled = targetUser.status === 'disabled' || targetUser.status === 'INACTIVE' || (!isActive && !isSuspended);

  const statusLabel = isSuspended ? 'ระงับบัญชี' : isDisabled ? 'ไม่ได้ใช้งาน' : 'กำลังใช้งาน';
  const statusColor = isSuspended
    ? 'bg-amber-50 text-[#D97706] border-amber-200'
    : isDisabled
    ? 'bg-slate-50 text-[#64748B] border-slate-200'
    : 'bg-emerald-50 text-[#16A34A] border-emerald-200';

  const isPendingPassword =
    targetUser.passwordSetupStatus === 'pending_setup' || targetUser.hasPassword === false;
  const is2FA = Boolean(targetUser.mfaEnabled || targetUser.twoFactorEnabled);
  const dataScope = targetUser.dataScope?.scope || targetUser.dataScope || 'BRANCH';
  const approvalLimit = targetUser.dataScope?.approvalLimit ?? targetUser.approvalLimit;

  // Branch & Department names
  const branchName =
    targetUser.branchName ||
    targetUser.branch ||
    branches.find((b) => b.id === targetUser.branchId)?.name ||
    'สำนักงานใหญ่ (HQ)';
  const deptName =
    targetUser.departmentName ||
    departments.find((d) => d.id === targetUser.departmentId)?.name ||
    'ฝ่ายปฏิบัติการและสังคมสงเคราะห์';

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setIsCopied(true);
    showToast('คัดลอกลงคลิปบอร์ดแล้ว', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Filter modules
  const filteredModules = MODULE_PERMISSION_CATALOG.filter((mod) => {
    if (activeModuleFilter !== 'ALL' && mod.group !== activeModuleFilter) return false;
    if (permissionSearch.trim()) {
      const q = permissionSearch.toLowerCase();
      const matchMod = mod.nameTh.toLowerCase().includes(q) || mod.id.toLowerCase().includes(q);
      const matchAction = mod.actions.some(
        (a) => (a.labelTh || (a as any).nameTh || '').toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
      );
      return matchMod || matchAction;
    }
    return true;
  });

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/50 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="bg-white rounded-[16px] max-w-5xl w-full shadow-xl border border-[#E2E8F0] max-h-[calc(100dvh-20px)] flex flex-col overflow-hidden text-[#0B2545]"
        >
          {/* Header Bar: Clean Modern Enterprise Standard (White Card, Thin Border #E2E8F0) */}
          <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-5 sm:p-6 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Profile summary left */}
              <div className="flex items-start gap-3.5">
                {/* Big Avatar */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[10px] bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] font-bold text-lg sm:text-xl flex items-center justify-center">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      isActive ? 'bg-[#16A34A]' : isSuspended ? 'bg-[#D97706]' : 'bg-[#94A3B8]'
                    }`}
                    title={statusLabel}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold text-[#0B2545] tracking-tight">{userName}</h2>
                    <span className="font-mono text-xs sm:text-sm text-[#0D9488] font-medium">
                      @{username}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap text-xs text-[#64748B] pt-0.5">
                    <span className="px-2 py-0.5 rounded-[6px] bg-white text-[#0B2545] font-medium border border-[#E2E8F0]">
                      {roleTitle}
                    </span>
                    <span className="flex items-center gap-1 text-[#64748B]">
                      <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                      {targetUser.email}
                    </span>
                    {targetUser.phone && targetUser.phone !== '-' && (
                      <span className="flex items-center gap-1 text-[#64748B]">
                        <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                        {targetUser.phone}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#64748B] pt-0.5">
                    <span>
                      สาขา: <strong className="text-[#0B2545]">{branchName}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      แผนก: <strong className="text-[#0B2545]">{deptName}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Right: Buttons Radius 8px */}
              <div className="flex items-center gap-2 flex-wrap sm:self-start">
                <button
                  onClick={() => onEditUser(user)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F8FAFC] text-[#0B2545] rounded-[8px] text-xs font-medium border border-[#E2E8F0] transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  แก้ไข
                </button>
                <button
                  onClick={() => onManagePermissions(user)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-[8px] text-xs font-medium transition-colors shadow-xs"
                >
                  <Key className="w-3.5 h-3.5" />
                  กำหนดสิทธิ์ (Manual)
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-[8px] hover:bg-[#E2E8F0] text-[#94A3B8] hover:text-[#0B2545] transition-colors"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Top Quick Status Ribbon */}
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#64748B]">
                <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
                <div>
                  <span className="text-[#94A3B8] text-[10px]">Data Scope:</span>{' '}
                  <strong className="text-[#0B2545] font-mono">{dataScope}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[#64748B]">
                <Key className="w-4 h-4 text-[#0D9488] shrink-0" />
                <div>
                  <span className="text-[#94A3B8] text-[10px]">สิทธิ์สุทธิ:</span>{' '}
                  <strong className="text-[#0B2545] font-mono">{effectivePerms.length} Actions</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[#64748B]">
                <Lock className="w-4 h-4 text-[#2563EB] shrink-0" />
                <div>
                  <span className="text-[#94A3B8] text-[10px]">2FA Authentication:</span>{' '}
                  <strong className={is2FA ? 'text-[#16A34A]' : 'text-[#94A3B8]'}>
                    {is2FA ? 'เปิดใช้งาน' : 'ยังไม่เปิด'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[#64748B]">
                <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
                <div>
                  <span className="text-[#94A3B8] text-[10px]">เข้าใช้งานล่าสุด:</span>{' '}
                  <strong className="text-[#0B2545] truncate block max-w-[130px]">
                    {targetUser.lastLogin || targetUser.lastLoginAt ? (
                      new Date(targetUser.lastLogin || targetUser.lastLoginAt).toLocaleDateString('th-TH')
                    ) : (
                      'ยังไม่เคยเข้าใช้'
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 6 Tabs Navigation (Border #E2E8F0, Radius 8px pills or clean line) */}
          <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none">
            {[
              { id: 'profile', label: 'ข้อมูลผู้ใช้งาน', icon: UserIcon },
              { id: 'organization', label: 'บทบาทและสังกัด', icon: Building2 },
              { id: 'permissions', label: `สิทธิ์การใช้งาน (${effectivePerms.length})`, icon: ShieldCheck },
              { id: 'scope', label: `ขอบเขตข้อมูล (${dataScope})`, icon: Sliders },
              { id: 'audit', label: `ประวัติการทำงาน (${auditLogs.length})`, icon: History },
              { id: 'security', label: 'ความปลอดภัย', icon: Lock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActiveTab = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DetailTabType)}
                  className={`flex items-center gap-1.5 py-3 px-3.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActiveTab
                      ? 'border-[#0D9488] text-[#0D9488] bg-[#F0FDFA]'
                      : 'border-transparent text-[#64748B] hover:text-[#0B2545] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActiveTab ? 'text-[#0D9488]' : 'text-[#94A3B8]'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Modal Body / Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F4F7FB]">
            {isLoadingDetail && (
              <div className="p-3 bg-white rounded-[8px] border border-[#E2E8F0] text-[#0D9488] text-xs flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0D9488]" />
                กำลังโหลดรายละเอียดผู้ใช้งานล่าสุดจากฐานข้อมูลระบบ...
              </div>
            )}

            {/* TAB 1: ข้อมูลผู้ใช้งาน (Profile Information) */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Personal Information Card */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-[#0D9488]" />
                      ข้อมูลส่วนบุคคลและข้อมูลติดต่อ (Profile Information)
                    </h3>
                    <span className="text-[11px] text-[#94A3B8] font-mono">UID: {targetUser.id}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-[11px] text-[#64748B]">ชื่อ - นามสกุล</div>
                      <div className="font-semibold text-[#0B2545] text-sm mt-0.5">{userName}</div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">ชื่อผู้ใช้งาน (Username)</div>
                      <div className="font-mono font-medium text-[#0D9488] text-sm mt-0.5">
                        @{username}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">ตำแหน่งงาน (Position)</div>
                      <div className="font-medium text-[#0B2545] text-sm mt-0.5">
                        {targetUser.position || 'เจ้าหน้าที่ปฏิบัติการ'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">อีเมล (Email)</div>
                      <div className="font-mono text-[#0B2545] flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>{targetUser.email}</span>
                        <button
                          onClick={() => copyText(targetUser.email)}
                          className="text-[#94A3B8] hover:text-[#0B2545]"
                          title="คัดลอกอีเมล"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">หมายเลขโทรศัพท์ (Phone)</div>
                      <div className="font-mono text-[#0B2545] flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>{targetUser.phone || '-'}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">เลขประจำตัวประชาชน (National ID)</div>
                      <div className="font-mono text-[#64748B] mt-0.5">
                        {targetUser.nationalId ? `***-***-${targetUser.nationalId.slice(-4)}` : 'ไม่ได้ระบุ'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Lifecycle & Metadata Card */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                  <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                    <Calendar className="w-4 h-4 text-[#0D9488]" />
                    ข้อมูลวันที่และการปฏิบัติตามข้อกำหนด (Account Compliance)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-[11px] text-[#64748B]">วันที่สร้างบัญชี (Created At)</div>
                      <div className="text-[#0B2545] mt-0.5 font-medium">
                        {targetUser.createdAt
                          ? new Date(targetUser.createdAt).toLocaleString('th-TH')
                          : 'บันทึกพร้อมระบบเริ่มต้น'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">ปรับปรุงล่าสุด (Updated At)</div>
                      <div className="text-[#0B2545] mt-0.5 font-medium">
                        {targetUser.updatedAt
                          ? new Date(targetUser.updatedAt).toLocaleString('th-TH')
                          : 'ยังไม่มีการแก้ไข'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">การยืนยันตัวตนอีเมล (Email Verified)</div>
                      <div className="mt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-[#16A34A] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> ยืนยันแล้ว
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">ความยินยอม PDPA (Data Protection)</div>
                      <div className="text-[#0B2545] mt-0.5 font-medium">
                        {targetUser.pdpaConsentDate ? (
                          <span className="text-[#16A34A]">
                            ยินยอมแล้ว ({new Date(targetUser.pdpaConsentDate).toLocaleDateString('th-TH')}) v
                            {targetUser.pdpaConsentVersion || '1.0'}
                          </span>
                        ) : (
                          <span className="text-[#64748B]">ยินยอมตามนโยบายองค์กร</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">ช่องทางการแจ้งเตือนที่เปิดใช้</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[10px] font-medium text-[#0B2545]">
                          อีเมล
                        </span>
                        <span className="px-2 py-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[10px] font-medium text-[#0B2545]">
                          ระบบแอป
                        </span>
                        <span className="px-2 py-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[10px] text-[#94A3B8]">
                          SMS
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#64748B]">ประเภทบัญชีผู้ใช้ (Account Type)</div>
                      <div className="mt-0.5 font-medium text-[#0B2545]">
                        บุคลากรภายในมูลนิธิ (Internal Staff)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: บทบาทและสังกัด (Role & Organization) */}
            {activeTab === 'organization' && (
              <div className="space-y-4">
                {/* Primary Role Card */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                      บทบาทหลักและหน้าที่ความรับผิดชอบ (Primary System Role)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
                      {roleTitle}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-2 text-xs">
                    <div className="font-medium text-[#0B2545] flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#0D9488]" />
                      รหัสบทบาทในระบบ: <span className="font-mono text-[#0B2545] font-semibold">{roleCode.toUpperCase()}</span>
                    </div>
                    <p className="text-[#64748B] leading-relaxed text-[11px]">
                      บทบาทหลักเป็นชุดสิทธิ์เริ่มต้นที่กำหนดหน้าที่ความรับผิดชอบพื้นฐานของบุคลากรในระบบ ZMS
                      สิทธิ์ทั้งหมดจะถูกสืบทอดอัตโนมัติ และ Super Admin สามารถกำหนดสิทธิ์เฉพาะบุคคล (Manual Override)
                      เพิ่มเติมหรือเพิกถอนได้
                    </p>
                  </div>
                </div>

                {/* Organization Hierarchy Card */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                  <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                    <Building2 className="w-4 h-4 text-[#0D9488]" />
                    สังกัดและตำแหน่งในโครงสร้างองค์กร (Organizational Hierarchy)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-1">
                      <div className="text-[11px] font-medium text-[#64748B] flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#0D9488]" />
                        สาขา / สำนักงาน
                      </div>
                      <div className="font-semibold text-[#0B2545] text-sm">{branchName}</div>
                      <div className="text-[10px] text-[#94A3B8] font-mono">
                        ID: {targetUser.branchId || 'br-hq'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-1">
                      <div className="text-[11px] font-medium text-[#64748B] flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#0D9488]" />
                        แผนก / ฝ่ายงาน
                      </div>
                      <div className="font-semibold text-[#0B2545] text-sm">{deptName}</div>
                      <div className="text-[10px] text-[#94A3B8] font-mono">
                        ID: {targetUser.departmentId || 'dept-social'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-1">
                      <div className="text-[11px] font-medium text-[#64748B] flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-[#0D9488]" />
                        ตำแหน่งและสายการบังคับบัญชา
                      </div>
                      <div className="font-semibold text-[#0B2545] text-sm">
                        {targetUser.position || 'เจ้าหน้าที่ฝ่าย'}
                      </div>
                      <div className="text-[10px] text-[#64748B]">รายงานตรง: หัวหน้าฝ่าย/ผู้อำนวยการ</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: สิทธิ์การใช้งาน (Permissions & Module Access) - Prompt Section 9 Standard */}
            {activeTab === 'permissions' && (
              <div className="space-y-4">
                {/* Header Summary & Launch Button */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                      ภาพรวมสิทธิ์การใช้งาน 15 โมดูลระบบ (Effective Granular Permissions)
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      คำนวณตามสูตรความปลอดภัย: <strong>Effective = (Role Inherited + ALLOW) - DENY</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => onManagePermissions(user)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-[8px] text-xs font-medium transition-colors shadow-xs shrink-0"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    กำหนดสิทธิ์เฉพาะบุคคล (Manual Matrix)
                  </button>
                </div>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-[12px] border border-[#E2E8F0] shadow-xs flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-[#64748B]">สิทธิ์สุทธิที่ใช้งานได้</div>
                      <div className="text-2xl font-bold text-[#0B2545] mt-0.5">
                        {effectivePerms.length}{' '}
                        <span className="text-xs font-normal text-[#94A3B8]">/ 84 Actions</span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                  </div>

                  <div className="bg-white p-3.5 rounded-[12px] border border-[#E2E8F0] shadow-xs flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-[#64748B]">สิทธิ์จาก Role</div>
                      <div className="text-2xl font-bold text-[#0B2545] mt-0.5">
                        {rolePerms.length}{' '}
                        <span className="text-xs font-normal text-[#94A3B8]">สืบทอด</span>
                      </div>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-[#0D9488]" />
                  </div>

                  <div className="bg-white p-3.5 rounded-[12px] border border-[#E2E8F0] shadow-xs flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-[#64748B]">สิทธิ์ Overrides พิเศษ</div>
                      <div className="text-2xl font-bold text-[#0B2545] mt-0.5">
                        {overridesList.length}{' '}
                        <span className="text-xs font-normal text-[#94A3B8]">รายการ</span>
                      </div>
                    </div>
                    <Key className="w-6 h-6 text-[#2563EB]" />
                  </div>
                </div>

                {/* Filter and Search Bar for Permissions */}
                <div className="bg-white p-3.5 rounded-[12px] border border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    {(['ALL', 'CORE', 'SUPPORT'] as const).map((grp) => (
                      <button
                        key={grp}
                        onClick={() => setActiveModuleFilter(grp)}
                        className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors text-xs ${
                          activeModuleFilter === grp
                            ? 'bg-[#0D9488] text-white'
                            : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        {grp === 'ALL' ? 'ทุกกลุ่มโมดูล (15)' : grp === 'CORE' ? 'ภารกิจหลัก (9)' : 'สนับสนุน (6)'}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="ค้นหาชื่อโมดูล หรือการกระทำ (e.g. view, approve)..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="w-full sm:w-72 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-[8px] focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] focus:outline-hidden text-xs text-[#0B2545] placeholder-[#94A3B8]"
                  />
                </div>

                {/* Modules Grid */}
                <div className="space-y-3">
                  {filteredModules.map((mod: ModuleCatalogItem) => {
                    const grantedCount = mod.actions.filter((a) => effectivePerms.includes(a.code)).length;
                    const isAllGranted = grantedCount === mod.actions.length;

                    return (
                      <div
                        key={mod.id}
                        className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-xs overflow-hidden"
                      >
                        <div className="p-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isAllGranted ? 'bg-[#16A34A]' : grantedCount > 0 ? 'bg-[#0D9488]' : 'bg-[#94A3B8]'
                              }`}
                            />
                            <h4 className="font-semibold text-[#0B2545] text-xs">{mod.nameTh}</h4>
                            <span className="font-mono text-[10px] text-[#94A3B8]">({mod.id})</span>
                            <span
                              className={`px-2 py-0.2 rounded text-[9px] font-medium ${
                                mod.group === 'CORE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {mod.group === 'CORE' ? 'ภารกิจหลัก' : 'สนับสนุน'}
                            </span>
                          </div>

                          <span className="text-[11px] text-[#64748B]">
                            เข้าถึงได้: <strong className="text-[#0B2545] font-mono">{grantedCount}</strong> /{' '}
                            {mod.actions.length} ฟังก์ชัน
                          </span>
                        </div>

                        {/* Actions in module: Active Teal, Denied Soft Red, Inherited Slate, Override Teal */}
                        <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {mod.actions.map((act) => {
                            const isEffective = effectivePerms.includes(act.code);
                            const override = overridesList.find((o) => o.permissionCode === act.code);
                            const isAllowOverride = override?.effect === 'ALLOW';
                            const isDenyOverride = override?.effect === 'DENY';
                            const isRoleInherited = rolePerms.includes(act.code);

                            return (
                              <div
                                key={act.code}
                                className={`p-2.5 rounded-[8px] border flex items-start justify-between gap-2 transition-colors ${
                                  isEffective
                                    ? isAllowOverride
                                      ? 'bg-[#F0FDFA] border-[#0D9488]'
                                      : 'bg-[#F0FDFA] border-[#CCFBF1]'
                                    : isDenyOverride
                                    ? 'bg-[#FEF2F2] border-[#FECACA]'
                                    : 'bg-[#F8FAFC] border-[#E2E8F0]'
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="font-medium text-xs text-[#0B2545] flex items-center gap-1.5 truncate">
                                    {isEffective ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                                    ) : (
                                      <UserX className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                                    )}
                                    <span className="truncate">{act.labelTh}</span>
                                  </div>
                                  <div className="font-mono text-[10px] text-[#94A3B8] truncate">{act.code}</div>
                                </div>

                                <div className="shrink-0 text-right">
                                  {isAllowOverride ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#0D9488] text-white">
                                      ALLOW+
                                    </span>
                                  ) : isDenyOverride ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#DC2626] text-white">
                                      DENY-
                                    </span>
                                  ) : isRoleInherited ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                                      Role
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-[#94A3B8]">-</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: ขอบเขตข้อมูล (Data Scope & Limits) */}
            {activeTab === 'scope' && (
              <div className="space-y-4">
                {/* Current Data Scope Card */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#0D9488]" />
                      ระดับการมองเห็นและขอบเขตข้อมูล (Data Scope Level)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] font-mono">
                      {dataScope}
                    </span>
                  </div>

                  {/* 4 Scope Visual Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {[
                      {
                        scope: 'OWN',
                        title: 'เฉพาะตนเอง (Own)',
                        desc: 'เข้าถึงได้เฉพาะคำร้อง ผู้รับซะกาต และเอกสารที่ตนเองเป็นผู้สร้างหรือรับมอบหมาย',
                      },
                      {
                        scope: 'DEPARTMENT',
                        title: 'ระดับฝ่ายงาน (Department)',
                        desc: 'เข้าถึงข้อมูลทั้งหมดภายในแผนกหรือฝ่ายของตนเองในสาขาที่สังกัด',
                      },
                      {
                        scope: 'BRANCH',
                        title: 'ระดับสาขา (Branch)',
                        desc: 'เข้าถึงข้อมูลทุกฝ่ายงานภายในสาขา/สำนักงานพื้นที่ที่ตนเองสังกัด',
                      },
                      {
                        scope: 'ORGANIZATION',
                        title: 'ทั่วทั้งองค์กร (Organization)',
                        desc: 'เข้าถึงข้อมูลทั่วประเทศ ทุกสาขา และทุกแผนกของมูลนิธิ',
                      },
                    ].map((item) => {
                      const isCurrent = dataScope === item.scope;
                      return (
                        <div
                          key={item.scope}
                          className={`p-4 rounded-[12px] border transition-colors ${
                            isCurrent
                              ? 'bg-[#F0FDFA] border-[#0D9488]'
                              : 'bg-white border-[#E2E8F0]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-[#0B2545] text-xs">{item.title}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-[#0D9488] text-white">
                                ปัจจุบัน
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] leading-relaxed">{item.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Approval Limit & Financial Authority */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                  <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                    <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                    วงเงินอนุมัติสูงสุด (Financial Approval Limit)
                  </h3>

                  <div className="p-4 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#64748B]">วงเงินสูงสุดที่ผู้ใช้งานนี้สามารถอนุมัติได้ต่อรายการ:</div>
                      <div className="text-2xl font-bold text-[#0B2545] mt-1 font-mono">
                        {approvalLimit ? `฿${Number(approvalLimit).toLocaleString('th-TH')} บาท` : 'ไม่จำกัดวงเงิน (Unlimited)'}
                      </div>
                    </div>

                    <button
                      onClick={() => onManagePermissions(user)}
                      className="px-3.5 py-1.5 bg-white text-[#0B2545] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] text-xs font-medium shrink-0 transition-colors"
                    >
                      ปรับเปลี่ยนวงเงินและ Data Scope
                    </button>
                  </div>
                </div>

                {/* Segregation of Duties (SoD) Card */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-3">
                  <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                    <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                    มาตรการแบ่งแยกหน้าที่และความโปร่งใส (Segregation of Duties - SoD)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-1">
                      <div className="font-semibold text-[#0B2545] flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                        ป้องกันการอนุมัติตนเอง (Self-Approval Prevention)
                      </div>
                      <p className="text-[11px] text-[#64748B] leading-relaxed">
                        ระบบบล็อกไม่ให้ผู้ใช้สามารถอนุมัติคำร้องขอความช่วยเหลือที่ตนเองเป็นผู้บันทึกข้อมูล
                      </p>
                    </div>

                    <div className="p-3 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-1">
                      <div className="font-semibold text-[#0B2545] flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                        หลักการ Maker-Checker Separation
                      </div>
                      <p className="text-[11px] text-[#64748B] leading-relaxed">
                        แยกบทบาทผู้สำรวจภาคสนามและผู้อนุมัติทางการเงินอย่างเคร่งครัดตามหลักชะรีอะฮ์
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ประวัติการทำงาน (Activity & Audit Trail) */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2">
                        <History className="w-4 h-4 text-[#0D9488]" />
                        ประวัติการทำรายการและการเปลี่ยนแปลงสิทธิ์ (Security Audit Trail)
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        บันทึกการกระทำที่เกิดขึ้นกับบัญชีผู้ใช้นี้ตามมาตรฐาน ISO/IEC 27001
                      </p>
                    </div>

                    <button
                      onClick={fetchDeepUserData}
                      disabled={isLoadingAudit}
                      className="p-1.5 text-[#94A3B8] hover:text-[#0B2545] rounded-[6px] hover:bg-[#F8FAFC]"
                      title="รีเฟรชประวัติ"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {isLoadingAudit ? (
                    <div className="py-8 text-center text-[#94A3B8] flex items-center justify-center gap-2 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#0D9488]" />
                      กำลังโหลดประวัติ Audit Logs...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="py-8 text-center text-[#94A3B8] text-xs">
                      ไม่พบบันทึกการเปลี่ยนแปลงสิทธิ์สำหรับผู้ใช้นี้
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {auditLogs.map((log: any, idx: number) => (
                        <div
                          key={log.id || idx}
                          className="p-3 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-1.5 text-xs hover:bg-white transition-colors"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-[#94A3B8]">
                              {log.timestamp || (log.createdAt && new Date(log.createdAt).toLocaleString('th-TH'))}
                            </span>
                            <span className="px-2 py-0.5 rounded font-medium bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] text-[10px]">
                              {log.action}
                            </span>
                          </div>

                          <div className="text-[#0B2545] font-medium leading-relaxed">
                            {log.description || JSON.stringify(log.details || log.metadata || {})}
                          </div>

                          <div className="text-[10px] text-[#94A3B8] flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                            <span>
                              ผู้ดำเนินการ: <strong className="text-[#64748B]">{log.userName || log.actorId || 'Super Admin'}</strong>
                            </span>
                            <span className="font-mono">IP: {log.ipAddress || '127.0.0.1'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: ความปลอดภัย (Security & Sessions) */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                {/* Account Security Status */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                  <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                    <Lock className="w-4 h-4 text-[#0D9488]" />
                    สถานะความปลอดภัยและการเข้าถึง (Account Security Health)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                    {/* Status Toggle Card */}
                    <div className="p-4 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-3">
                      <div className="text-[#64748B] text-[11px]">สถานะบัญชีผู้ใช้งาน</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="pt-1">
                        {isActive ? (
                          <button
                            onClick={() => onStatusChange(user, 'suspended')}
                            className="w-full py-1.5 px-3 bg-white text-[#D97706] hover:bg-amber-50 border border-amber-200 rounded-[8px] font-medium text-xs transition-colors"
                          >
                            ระงับการใช้งานชั่วคราว
                          </button>
                        ) : (
                          <button
                            onClick={() => onStatusChange(user, 'active')}
                            className="w-full py-1.5 px-3 bg-white text-[#16A34A] hover:bg-emerald-50 border border-emerald-200 rounded-[8px] font-medium text-xs transition-colors"
                          >
                            เปิดใช้งานบัญชี
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2FA Card */}
                    <div className="p-4 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-3">
                      <div className="text-[#64748B] text-[11px]">Two-Factor Authentication (2FA)</div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            is2FA
                              ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                              : 'bg-white text-[#64748B] border-[#E2E8F0]'
                          }`}
                        >
                          {is2FA ? 'เปิดใช้งานแล้ว (TOTP Authenticator)' : 'ยังไม่ได้เปิดใช้งาน'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        {is2FA
                          ? 'ผู้ใช้ต้องยืนยันรหัส OTP 6 หลักทุกครั้งที่เข้าสู่ระบบ'
                          : 'แนะนำให้เปิดใช้งานสำหรับผู้ดูแลระบบและผู้อนุมัติ'}
                      </div>
                    </div>

                    {/* Password Status Card */}
                    <div className="p-4 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-3">
                      <div className="text-[#64748B] text-[11px]">สถานะรหัสผ่าน (Password Setup)</div>
                      <div className="flex items-center gap-2">
                        {isPendingPassword ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-[#D97706] border border-amber-200">
                            ยังไม่ได้กำหนดรหัสผ่าน
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[#16A34A] border border-emerald-200">
                            กำหนดรหัสผ่านแล้ว
                          </span>
                        )}
                      </div>
                      <div className="pt-1">
                        {isPendingPassword ? (
                          <button
                            onClick={() => onSendInvite(user)}
                            className="w-full py-1.5 px-3 bg-[#0D9488] text-white hover:bg-[#0F766E] rounded-[8px] font-medium text-xs transition-colors shadow-xs"
                          >
                            สร้างลิงก์คำเชิญตั้งรหัส
                          </button>
                        ) : (
                          <button
                            onClick={() => onResetPassword(user)}
                            className="w-full py-1.5 px-3 bg-white text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-[8px] font-medium text-xs transition-colors"
                          >
                            รีเซ็ตรหัสผ่าน (Super Admin)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Session Management */}
                <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <h3 className="text-sm font-semibold text-[#0B2545] flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-[#0D9488]" />
                      การจัดการเซสชันที่เชื่อมต่ออยู่ (Active Sessions)
                    </h3>
                    <button
                      onClick={() => onRevokeSession(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#DC2626] hover:bg-rose-50 border border-rose-200 rounded-[8px] text-xs font-medium transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      บังคับออกจากระบบทุกเครื่อง
                    </button>
                  </div>

                  <div className="p-3.5 bg-[#F8FAFC] rounded-[8px] border border-[#E2E8F0] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#0D9488]" />
                        <span className="font-semibold text-[#0B2545]">เว็บเบราว์เซอร์ปัจจุบัน</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-[#16A34A] border border-emerald-200">
                        Active
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      IP Address: <span className="font-mono text-[#0B2545]">127.0.0.1 (Local Environment)</span> •
                      เข้าใช้งานล่าสุด: {targetUser.lastLogin || 'ไม่กี่นาทีที่ผ่านมา'}
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">
                      * เมื่อกดปุ่มบังคับออกจากระบบ เซสชัน JWT และ Refresh Token ทั้งหมดจะถูกระงับทันทีตามนโยบาย OWASP
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-white border-t border-[#E2E8F0] shrink-0 flex items-center justify-between text-xs">
            <div className="text-[#94A3B8] text-[11px] hidden sm:block">
              ระบบจัดการผู้ใช้งานและสิทธิ์ ZMS • มาตรฐานความปลอดภัย Enterprise Dashboard
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[8px] bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0B2545] font-medium transition-colors text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
