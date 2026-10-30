'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MODULE_PERMISSION_CATALOG, ModuleCatalogItem, ModulePermissionAction } from '@zms/shared';
import { 
  X, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  Ban, 
  RotateCcw, 
  Search, 
  Filter, 
  Sliders, 
  User as UserIcon, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { ModalPortal } from '@/components/common/Modal';

interface ManualPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onPermissionsSaved: () => void;
  authToken?: string | null;
  actor?: any;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function ManualPermissionModal({
  isOpen,
  onClose,
  user,
  onPermissionsSaved,
  authToken,
  showToast,
}: ManualPermissionModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'role' | 'matrix' | 'scope' | 'audit'>('matrix');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Permission Data
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Map<string, 'ALLOW' | 'DENY'>>(new Map());
  const [dataScope, setDataScope] = useState<'OWN' | 'DEPARTMENT' | 'BRANCH' | 'ORGANIZATION'>('BRANCH');
  const [approvalLimit, setApprovalLimit] = useState<string>('');
  const [isUnlimitedApproval, setIsUnlimitedApproval] = useState<boolean>(false);
  const [sodSelfApproval, setSodSelfApproval] = useState<boolean>(true);
  const [sodMakerChecker, setSodMakerChecker] = useState<boolean>(true);
  const [reason, setReason] = useState<string>('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | 'CORE' | 'SUPPORT'>('ALL');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Audit History
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // High Risk Confirmation
  const [showHighRiskModal, setShowHighRiskModal] = useState(false);
  const [highRiskChanges, setHighRiskChanges] = useState<string[]>([]);

  // Fetch User Permissions from BFF
  const loadUserPermissions = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/users/${user.id}/permissions`, { headers });
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        setRolePermissions(d.rolePermissions || []);
        
        const ovMap = new Map<string, 'ALLOW' | 'DENY'>();
        if (Array.isArray(d.overrides)) {
          d.overrides.forEach((o: any) => {
            if (o.effect === 'ALLOW' || o.effect === 'DENY') {
              ovMap.set(o.permissionCode, o.effect);
            }
          });
        }
        setOverrides(ovMap);

        if (d.dataScope) {
          setDataScope(d.dataScope);
        }
        if (d.approvalLimit !== null && d.approvalLimit !== undefined) {
          setApprovalLimit(String(d.approvalLimit));
          setIsUnlimitedApproval(false);
        } else {
          setIsUnlimitedApproval(true);
          setApprovalLimit('');
        }
      }
    } catch (err: any) {
      showToast('ไม่สามารถดึงข้อมูลสิทธิ์ของผู้ใช้งานได้', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, authToken, showToast]);

  // Load Audit History for this user
  const loadAuditHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoadingAudit(true);
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/permissions/audit-logs?targetUserId=${user.id}`, { headers });
      const json = await res.json();
      const logs = json.items || json.data;
      if (json.success && Array.isArray(logs)) {
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [user?.id, authToken]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadUserPermissions();
      // Initialize all modules as expanded by default
      const exp: Record<string, boolean> = {};
      MODULE_PERMISSION_CATALOG.forEach(m => exp[m.id] = true);
      setExpandedModules(exp);
    }
  }, [isOpen, user?.id, loadUserPermissions]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditHistory();
    }
  }, [activeTab, loadAuditHistory]);

  // Calculate Realtime Effective Permissions: (Role + ALLOW) - DENY
  const effectivePermissions = useMemo(() => {
    const effective = new Set(rolePermissions);
    overrides.forEach((effect, code) => {
      if (effect === 'ALLOW') effective.add(code);
      else if (effect === 'DENY') effective.delete(code);
    });
    return effective;
  }, [rolePermissions, overrides]);

  // Filter Modules by search and group
  const filteredModules = useMemo(() => {
    return MODULE_PERMISSION_CATALOG.filter((mod) => {
      if (selectedGroup !== 'ALL' && mod.group !== selectedGroup) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      const matchMod = mod.nameTh.toLowerCase().includes(q) || mod.description.toLowerCase().includes(q);
      const matchAction = mod.actions.some(a => a.labelTh.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
      return matchMod || matchAction;
    });
  }, [selectedGroup, searchTerm]);

  // Handle setting override for an action
  const handleSetOverride = (code: string, effect: 'ALLOW' | 'DENY' | 'INHERIT') => {
    setOverrides((prev) => {
      const next = new Map(prev);
      if (effect === 'INHERIT') {
        next.delete(code);
      } else {
        next.set(code, effect);
      }
      return next;
    });
  };

  // Quick module allow all / reset
  const handleAllowAllInModule = (module: ModuleCatalogItem) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      module.actions.forEach((act) => next.set(act.code, 'ALLOW'));
      return next;
    });
  };

  const handleResetModuleDefaults = (module: ModuleCatalogItem) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      module.actions.forEach((act) => next.delete(act.code));
      return next;
    });
  };

  const handleResetAllToRoleDefaults = () => {
    if (confirm('คุณต้องการรีเซ็ตสิทธิ์ทั้งหมดกลับเป็นค่าเริ่มต้นตาม Role ของผู้ใช้งานใช่หรือไม่?')) {
      setOverrides(new Map());
    }
  };

  // Pre-save validation: Check high risk permissions
  const handleInitiateSave = () => {
    // Check if user is adding ALLOW to high-risk permissions that were not in role
    const highRisks: string[] = [];
    const highRiskCodes = new Set([
      'finance.txn.approve',
      'finance.bank.manage',
      'finance.reconcile',
      'backup.create',
      'backup.restore',
      'users.suspend',
      'roles.manage',
      'permissions.manage',
      'beneficiaries.delete'
    ]);

    overrides.forEach((effect, code) => {
      if (effect === 'ALLOW' && highRiskCodes.has(code) && !rolePermissions.includes(code)) {
        highRisks.push(code);
      }
    });

    if (highRisks.length > 0) {
      setHighRiskChanges(highRisks);
      setShowHighRiskModal(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    try {
      setIsSaving(true);
      setShowHighRiskModal(false);

      // Convert overrides Map to Array
      const overridesArray: { permissionCode: string; effect: 'ALLOW' | 'DENY' | 'INHERIT'; reason?: string }[] = [];
      
      // All permissions in catalog
      const allCatalogCodes = new Set<string>();
      MODULE_PERMISSION_CATALOG.forEach(m => m.actions.forEach(a => allCatalogCodes.add(a.code)));

      allCatalogCodes.forEach((code) => {
        if (overrides.has(code)) {
          overridesArray.push({
            permissionCode: code,
            effect: overrides.get(code)!,
            reason: reason.trim() || undefined,
          });
        } else {
          // If was in original overrides, send INHERIT to clear it
          overridesArray.push({
            permissionCode: code,
            effect: 'INHERIT',
          });
        }
      });

      const payload = {
        overrides: overridesArray,
        dataScope,
        approvalLimit: isUnlimitedApproval ? null : (approvalLimit ? Number(approvalLimit) : null),
        reason: reason.trim() || 'กำหนดสิทธิ์เฉพาะบุคคล (Manual Override)',
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกสิทธิ์ได้');
      }

      showToast('บันทึกการกำหนดสิทธิ์เฉพาะบุคคลสำเร็จ', 'success');
      onPermissionsSaved();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-[1020] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          role="dialog"
          aria-modal="true"
          className="bg-white rounded-3xl max-w-5xl w-full h-[92vh] max-h-[860px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0b2545] text-white flex items-center justify-center font-bold text-sm shadow-md">
                {user.displayName ? user.displayName.slice(0, 2) : user.name?.slice(0, 2) || 'US'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    กำหนดสิทธิ์เฉพาะบุคคล (Manual Permission Control)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    {user.primaryRoleName || user.roleTitleTh || user.role || 'เจ้าหน้าที่'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    user.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {user.isActive !== false ? 'Active' : 'Suspended'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-slate-700">{user.displayName || user.name}</span>
                  <span>•</span>
                  <span>@{user.username || user.email?.split('@')[0]}</span>
                  <span>•</span>
                  <span>{user.email}</span>
                  <span>•</span>
                  <span className="text-slate-400">สาขา: {user.branch || 'สำนักงานใหญ่'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs (5 Tabs) */}
          <div className="px-6 bg-white border-b border-slate-200 flex items-center gap-1 shrink-0 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'matrix'
                  ? 'border-[#0b2545] text-[#0b2545] bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              กำหนดสิทธิ์ (Permission Matrix)
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold">
                {effectivePermissions.size}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('scope')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'scope'
                  ? 'border-[#0b2545] text-[#0b2545] bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              ขอบเขตข้อมูลและวงเงินอนุมัติ (Scope & Limits)
            </button>

            <button
              onClick={() => setActiveTab('role')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'role'
                  ? 'border-[#0b2545] text-[#0b2545] bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              บทบาท (Roles)
              <span className="ml-1 text-[10px] text-slate-400">({rolePermissions.length} สิทธิ์)</span>
            </button>

            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'info'
                  ? 'border-[#0b2545] text-[#0b2545] bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              ข้อมูลผู้ใช้ (User Info)
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-[#0b2545] text-[#0b2545] bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              ประวัติการเปลี่ยนแปลง (Audit History)
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-[#0b2545] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold">กำลังโหลดข้อมูลสิทธิ์และขอบเขตของผู้ใช้งาน...</p>
              </div>
            ) : (
              <>
                {/* TAB 1: PERMISSION MATRIX */}
                {activeTab === 'matrix' && (
                  <div className="space-y-4">
                    {/* Control Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Search & Filter */}
                      <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="ค้นหาชื่อเมนู, ฟังก์ชัน หรือ Permission Code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0b2545] text-xs"
                          />
                        </div>
                        <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                          <button
                            onClick={() => setSelectedGroup('ALL')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all ${
                              selectedGroup === 'ALL' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            ทั้งหมด
                          </button>
                          <button
                            onClick={() => setSelectedGroup('CORE')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all ${
                              selectedGroup === 'CORE' ? 'bg-white shadow-xs text-[#0b2545]' : 'text-slate-500'
                            }`}
                          >
                            งานหลัก (Core)
                          </button>
                          <button
                            onClick={() => setSelectedGroup('SUPPORT')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all ${
                              selectedGroup === 'SUPPORT' ? 'bg-white shadow-xs text-purple-700' : 'text-slate-500'
                            }`}
                          >
                            สนับสนุน (Support)
                          </button>
                        </div>
                      </div>

                      {/* Summary & Quick Reset */}
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          สิทธิ์ที่ได้รับจริง (Effective): <span>{effectivePermissions.size} / 84</span>
                        </div>
                        <button
                          onClick={handleResetAllToRoleDefaults}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center gap-1"
                          title="ล้างการ Override ทั้งหมดและใช้สิทธิ์ตาม Role"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          รีเซ็ตตาม Role
                        </button>
                      </div>
                    </div>

                    {/* Explanatory Banner */}
                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-[11px] text-blue-900 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong>หลักการคำนวณสิทธิ์ (Three-Tier Override):</strong> สิทธิ์เริ่มต้นได้รับมาจาก <strong>Role</strong> หากต้องการเปิดสิทธิ์เพิ่มให้เลือก <span className="font-bold text-emerald-700">อนุญาต (ALLOW)</span> หากต้องการปิดสิทธิ์เฉพาะบุคคลให้เลือก <span className="font-bold text-rose-700">ปฏิเสธ (DENY)</span> โดยระบบจะยึดสิทธิ์ปฏิเสธเป็นสำคัญเสมอ (Deny Wins)
                      </div>
                    </div>

                    {/* Module Accordions */}
                    <div className="space-y-3">
                      {filteredModules.map((mod) => {
                        const isExpanded = expandedModules[mod.id] ?? true;
                        const modEffectiveCount = mod.actions.filter(a => effectivePermissions.has(a.code)).length;
                        const isAllAllowed = modEffectiveCount === mod.actions.length;

                        return (
                          <div 
                            key={mod.id} 
                            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                          >
                            {/* Module Header */}
                            <div 
                              onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !isExpanded }))}
                              className="px-5 py-3.5 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between border-b border-slate-200/60"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  mod.group === 'CORE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {mod.group}
                                </span>
                                <div>
                                  <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                    <span>{mod.nameTh}</span>
                                    <span className="text-xs font-mono font-normal text-slate-400">({mod.actions.length} ฟังก์ชัน)</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">{mod.description}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                                  modEffectiveCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  ได้รับ {modEffectiveCount} / {mod.actions.length}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleAllowAllInModule(mod)}
                                  className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg text-[10px] font-bold transition-colors"
                                >
                                  เปิดทั้งหมด
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetModuleDefaults(mod)}
                                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors"
                                >
                                  ตาม Role
                                </button>

                                <div className={`p-1 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              </div>
                            </div>

                            {/* Action Matrix Grid */}
                            {isExpanded && (
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white">
                                {mod.actions.map((act) => {
                                  const isRoleGranted = rolePermissions.includes(act.code);
                                  const overrideEffect = overrides.get(act.code); // 'ALLOW' | 'DENY' | undefined
                                  const isEffective = effectivePermissions.has(act.code);

                                  return (
                                    <div 
                                      key={act.code}
                                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                                        overrideEffect === 'ALLOW'
                                          ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300/50'
                                          : overrideEffect === 'DENY'
                                          ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-300/50'
                                          : isEffective
                                          ? 'bg-blue-50/20 border-slate-200'
                                          : 'bg-slate-50/40 border-slate-200/80'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <div>
                                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                            <span>{act.labelTh}</span>
                                            {act.isHighRisk && (
                                              <span title="สิทธิ์ที่มีความเสี่ยงสูง (High-Risk)">
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[190px]">
                                            {act.code}
                                          </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div>
                                          {overrideEffect === 'ALLOW' ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-200 text-emerald-900">
                                              ALLOW (เจาะจง)
                                            </span>
                                          ) : overrideEffect === 'DENY' ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-200 text-rose-900">
                                              DENY (บล็อก)
                                            </span>
                                          ) : isRoleGranted ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                                              ตาม Role
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-400">
                                              ไม่มีสิทธิ์
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Three State Toggle Controls */}
                                      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200/60 text-[10px] font-bold">
                                        <button
                                          type="button"
                                          onClick={() => handleSetOverride(act.code, 'INHERIT')}
                                          className={`py-1 rounded-lg text-center transition-colors ${
                                            overrideEffect === undefined
                                              ? 'bg-slate-800 text-white shadow-xs'
                                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          }`}
                                        >
                                          ตาม Role
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSetOverride(act.code, 'ALLOW')}
                                          className={`py-1 rounded-lg text-center transition-colors flex items-center justify-center gap-0.5 ${
                                            overrideEffect === 'ALLOW'
                                              ? 'bg-emerald-600 text-white shadow-xs'
                                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                          }`}
                                        >
                                          <Check className="w-3 h-3" /> เปิด
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSetOverride(act.code, 'DENY')}
                                          className={`py-1 rounded-lg text-center transition-colors flex items-center justify-center gap-0.5 ${
                                            overrideEffect === 'DENY'
                                              ? 'bg-rose-600 text-white shadow-xs'
                                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                          }`}
                                        >
                                          <Ban className="w-3 h-3" /> ปิด
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: DATA SCOPE & APPROVAL LIMITS */}
                {activeTab === 'scope' && (
                  <div className="space-y-5 max-w-3xl mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                    {/* Data Scope */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-[#0b2545]" />
                        ขอบเขตการเข้าถึงข้อมูล (Data Scope Permission)
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">
                        กำหนดขอบเขตที่ผู้ใช้ท่านนี้ได้รับอนุญาตให้ค้นหา เรียกดู และทำรายการข้อมูลในระบบ (บังคับใช้ที่ระดับ Database Query)
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            id: 'OWN',
                            name: 'เฉพาะที่รับผิดชอบ (OWN)',
                            desc: 'ดูและจัดการเฉพาะเคส/คำร้อง/ธุรกรรมที่ตนเองได้รับมอบหมายเท่านั้น',
                          },
                          {
                            id: 'DEPARTMENT',
                            name: 'ระดับแผนก (DEPARTMENT)',
                            desc: 'ดูและจัดการข้อมูลของบุคลากรทุกคนที่สังกัดในแผนกเดียวกัน',
                          },
                          {
                            id: 'BRANCH',
                            name: 'ระดับสาขา (BRANCH)',
                            desc: 'ดูและจัดการข้อมูลทั้งหมดภายในสาขาตนเอง (เช่น สาขาภาคกลาง, สาขาหาดใหญ่)',
                          },
                          {
                            id: 'ORGANIZATION',
                            name: 'ทั้งองค์กร (ORGANIZATION)',
                            desc: 'ดูและจัดการข้อมูลทุกสาขาทั่วประเทศ (สำหรับผู้บริหารและ Super Admin)',
                          },
                        ].map((sc) => {
                          const isSelected = dataScope === sc.id;
                          return (
                            <div
                              key={sc.id}
                              onClick={() => setDataScope(sc.id as any)}
                              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-[#0b2545] bg-blue-50/30 shadow-xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs text-slate-900">{sc.name}</span>
                                <input
                                  type="radio"
                                  name="dataScope"
                                  checked={isSelected}
                                  onChange={() => setDataScope(sc.id as any)}
                                  className="w-4 h-4 text-[#0b2545]"
                                />
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">{sc.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Approval Limit */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                        <Key className="w-4 h-4 text-emerald-700" />
                        วงเงินอำนาจการอนุมัติ (Approval Limit)
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">
                        กำหนดเพดานวงเงินสูงสุดที่ผู้ใช้ท่านนี้สามารถกดอนุมัติคำขอความช่วยเหลือหรือการเบิกจ่ายเงินได้
                      </p>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isUnlimitedApproval}
                              onChange={(e) => {
                                setIsUnlimitedApproval(e.target.checked);
                                if (e.target.checked) setApprovalLimit('');
                              }}
                              className="w-4 h-4 rounded text-[#0b2545]"
                            />
                            ไม่จำกัดวงเงินอนุมัติ (ตามสิทธิ์ผู้มีอำนาจสูงสุด / บอร์ดบริหาร)
                          </label>
                        </div>

                        {!isUnlimitedApproval && (
                          <div className="max-w-xs">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              วงเงินสูงสุดที่อนุมัติได้ (บาท / รายการ):
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-slate-400 font-bold">฿</span>
                              <input
                                type="number"
                                placeholder="เช่น 50000"
                                value={approvalLimit}
                                onChange={(e) => setApprovalLimit(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-bold font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0b2545]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Separation of Duties (SoD) */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                        <ShieldAlert className="w-4 h-4 text-purple-700" />
                        หลักการแบ่งแยกหน้าที่และความปลอดภัย (Separation of Duties - SoD)
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">
                        ควบคุมการตรวจสอบไขว้เพื่อความโปร่งใสตามมาตรฐาน ASVS และระเบียบซะกาต
                      </p>

                      <div className="space-y-2">
                        <label className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sodSelfApproval}
                            onChange={(e) => setSodSelfApproval(e.target.checked)}
                            className="w-4 h-4 rounded text-[#0b2545]"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              ห้ามอนุมัติคำขอที่ตนเองเป็นผู้ยื่นหรือรับผิดชอบ (Self-Approval Restriction)
                            </div>
                            <div className="text-[11px] text-slate-500">
                              ผู้ยื่นคำร้องจะไม่สามารถกดอนุมัติคำร้องของตนเองได้ แม้จะมีสิทธิ์ Approver
                            </div>
                          </div>
                        </label>

                        <label className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sodMakerChecker}
                            onChange={(e) => setSodMakerChecker(e.target.checked)}
                            className="w-4 h-4 rounded text-[#0b2545]"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              ห้ามอนุมัติการจ่ายเงินในธุรกรรมที่ตนเองสร้าง (Maker-Checker Restriction)
                            </div>
                            <div className="text-[11px] text-slate-500">
                              ผู้บันทึกรายการจ่ายเงินจะไม่สามารถกดยืนยันการเบิกจ่ายธุรกรรมเดียวกันได้
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ROLES */}
                {activeTab === 'role' && (
                  <div className="max-w-3xl mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-[#0b2545]" />
                        บทบาทหลักของผู้ใช้ (Assigned Role)
                      </h3>
                      <p className="text-xs text-slate-500">
                        บทบาทเป็นชุดสิทธิ์พื้นฐานของตำแหน่งงาน เมื่อเปลี่ยน Role สิทธิ์พื้นฐานจะเปลี่ยนตาม แต่การ Override เฉพาะบุคคลจะยังคงอยู่
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">บทบาทปัจจุบัน</div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {user.primaryRoleName || user.roleTitleTh || 'เจ้าหน้าที่'}
                        </div>
                        <div className="text-xs font-mono text-purple-700 mt-0.5">
                          {user.primaryRoleCode || user.role}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">สิทธิ์พื้นฐานจาก Role</div>
                        <div className="text-2xl font-bold font-mono text-[#0b2545] mt-0.5">
                          {rolePermissions.length} <span className="text-xs font-normal text-slate-400">สิทธิ์</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        หากต้องการเปลี่ยนบทบาทของผู้ใช้งาน กรุณาใช้ปุ่ม <strong>แก้ไขผู้ใช้ (Edit User)</strong> ที่หน้ารายการผู้ใช้งาน
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: USER INFO */}
                {activeTab === 'info' && (
                  <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-xs">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                      <UserIcon className="w-4 h-4 text-[#0b2545]" />
                      รายละเอียดบัญชีผู้ใช้งาน
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-400">ชื่อ-นามสกุล:</label>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">{user.displayName || user.name}</div>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-400">ชื่อผู้ใช้ (Username):</label>
                        <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">@{user.username || user.email?.split('@')[0]}</div>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-400">อีเมล:</label>
                        <div className="font-semibold text-slate-800 mt-0.5">{user.email}</div>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-400">เบอร์โทรศัพท์:</label>
                        <div className="font-semibold text-slate-800 mt-0.5">{user.phone || '-'}</div>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-400">สาขาสังกัด:</label>
                        <div className="font-semibold text-slate-800 mt-0.5">{user.branch || 'สำนักงานใหญ่'}</div>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-400">แผนกงาน:</label>
                        <div className="font-semibold text-slate-800 mt-0.5">{user.departmentName || 'ฝ่ายบริการสังคม'}</div>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-400">สถานะ 2FA (TOTP):</label>
                        <div className="mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.mfaEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {user.mfaEnabled ? 'เปิดใช้งาน 2FA แล้ว' : 'ยังไม่เปิด 2FA'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-400">เข้าสู่ระบบล่าสุด:</label>
                        <div className="text-slate-600 mt-0.5">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('th-TH') : user.lastLogin || '-'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: AUDIT HISTORY */}
                {activeTab === 'audit' && (
                  <div className="max-w-3xl mx-auto space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-700" />
                        ประวัติการเปลี่ยนแปลงสิทธิ์ของผู้ใช้งานท่านนี้
                      </h3>
                      <button
                        onClick={loadAuditHistory}
                        className="text-xs text-purple-700 font-bold hover:underline"
                      >
                        รีเฟรชประวัติ
                      </button>
                    </div>

                    {isLoadingAudit ? (
                      <div className="py-12 text-center text-slate-400 text-xs">กำลังโหลดประวัติ...</div>
                    ) : auditLogs.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                        <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-xs">ยังไม่มีประวัติการปรับปรุงสิทธิ์ย้อนหลังสำหรับผู้ใช้นี้</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px]">
                                {log.action}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(log.createdAt).toLocaleString('th-TH')}
                              </span>
                            </div>
                            <div className="text-slate-600">
                              ดำเนินการโดย: <strong className="text-slate-900">{log.actor?.displayName || 'ผู้ดูแลระบบ'}</strong>
                            </div>
                            {log.reason && (
                              <div className="text-slate-500 italic">
                                เหตุผล: "{log.reason}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Save / Cancel Controls */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder="ระบุเหตุผลในการปรับปรุงสิทธิ์ (สำหรับ Audit Trail)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0b2545]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleInitiateSave}
                disabled={isSaving || isLoading}
                className="px-6 py-2 rounded-xl bg-[#0b2545] text-white text-xs font-bold hover:bg-[#133966] transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    บันทึกสิทธิ์เฉพาะบุคคล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* High-Risk Confirmation Modal */}
      {showHighRiskModal && (
        <div className="fixed inset-0 z-[1030] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                ยืนยันการมอบสิทธิ์ที่มีความเสี่ยงสูง (High-Risk Confirmation)
              </h3>
              <p className="text-xs text-slate-500">
                คุณกำลังมอบสิทธิ์สำคัญระดับผู้บริหารหรือการเงินให้แก่ผู้ใช้รายนี้:
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1 max-h-40 overflow-y-auto">
              {highRiskChanges.map((code) => (
                <div key={code} className="font-mono font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  {code}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              การเปลี่ยนแปลงนี้จะถูกบันทึกใน Audit Log และมีผลกับความปลอดภัยของระบบทันที
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowHighRiskModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                {isSaving ? 'กำลังบันทึก...' : 'ข้าพเจ้ายืนยันมอบสิทธิ์'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  );
}

