'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MODULE_PERMISSION_CATALOG, ModuleCatalogItem } from '@zms/shared';
import { 
  X, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  RotateCcw, 
  Search, 
  Filter, 
  Plus, 
  Copy, 
  Edit, 
  Trash2, 
  Users, 
  Key, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ChevronRight,
  Info
} from 'lucide-react';
import { ModalPortal } from '@/components/common/Modal';

export interface RoleItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isCustom: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  userCount: number;
  permissionCount: number;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  authToken?: string | null;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRolesUpdated?: () => void;
}

export function RoleManagementModal({
  isOpen,
  onClose,
  authToken,
  showToast,
  onRolesUpdated,
}: RoleManagementModalProps) {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SYSTEM' | 'CUSTOM' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Selected Role for Permission Editing
  const [activeRoleForPerms, setActiveRoleForPerms] = useState<RoleItem | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [permSearchTerm, setPermSearchTerm] = useState('');
  const [permSelectedGroup, setPermSelectedGroup] = useState<'ALL' | 'CORE' | 'SUPPORT'>('ALL');
  const [permReason, setPermReason] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Sub-modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSourceRole, setCloneSourceRole] = useState<RoleItem | null>(null);
  const [cloneRoleCode, setCloneRoleCode] = useState('');
  const [cloneRoleName, setCloneRoleName] = useState('');
  const [cloneRoleDesc, setCloneRoleDesc] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [editRoleStatus, setEditRoleStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Load Roles
  const fetchRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/admin/roles', { headers });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRoles(json.data);
      } else {
        setRoles([]);
      }
    } catch (err: any) {
      console.error('Failed to load roles:', err);
      showToast('ไม่สามารถดึงรายการบทบาทได้', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen, fetchRoles]);

  // Open Permission Matrix for Role
  const openPermissionEditor = async (role: RoleItem) => {
    setActiveRoleForPerms(role);
    setPermReason('');
    // Expand first 3 modules by default
    const initExpanded: Record<string, boolean> = {};
    MODULE_PERMISSION_CATALOG.slice(0, 3).forEach(m => { initExpanded[m.id] = true; });
    setExpandedModules(initExpanded);

    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/roles/${role.id}/permissions`, { headers });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRolePermissions(new Set(json.data));
      } else if (Array.isArray(role.permissions)) {
        setRolePermissions(new Set(role.permissions));
      } else {
        setRolePermissions(new Set());
      }
    } catch {
      setRolePermissions(new Set(role.permissions || []));
    }
  };

  // Toggle single permission for role
  const toggleRolePermission = (permCode: string) => {
    setRolePermissions(prev => {
      const next = new Set(prev);
      if (next.has(permCode)) {
        next.delete(permCode);
      } else {
        next.add(permCode);
      }
      return next;
    });
  };

  // Batch toggle module
  const handleBatchModule = (moduleItem: ModuleCatalogItem, action: 'grant' | 'clear' | 'viewOnly') => {
    setRolePermissions(prev => {
      const next = new Set(prev);
      moduleItem.actions.forEach(a => {
        if (action === 'grant') {
          next.add(a.code);
        } else if (action === 'clear') {
          next.delete(a.code);
        } else if (action === 'viewOnly') {
          if (a.action === 'view') {
            next.add(a.code);
          } else {
            next.delete(a.code);
          }
        }
      });
      return next;
    });
  };

  // Save Role Permissions
  const handleSaveRolePermissions = async () => {
    if (!activeRoleForPerms) return;
    try {
      setIsSubmitting(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/roles/${activeRoleForPerms.id}/permissions`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          permissions: Array.from(rolePermissions),
          reason: permReason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกสิทธิ์ของบทบาทได้');
      }

      showToast(`บันทึกสิทธิ์สำหรับบทบาท "${activeRoleForPerms.name}" เรียบร้อยแล้ว`, 'success');
      setActiveRoleForPerms(null);
      fetchRoles();
      if (onRolesUpdated) onRolesUpdated();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleCode.trim() || !newRoleName.trim()) {
      showToast('กรุณากรอกรหัสบทบาทและชื่อบทบาท', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: newRoleCode.trim().toUpperCase(),
          name: newRoleName.trim(),
          description: newRoleDesc.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถสร้างบทบาทได้');
      }

      showToast('สร้างบทบาทใหม่สำเร็จ', 'success');
      setShowCreateModal(false);
      setNewRoleCode('');
      setNewRoleName('');
      setNewRoleDesc('');
      fetchRoles();
      if (onRolesUpdated) onRolesUpdated();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการสร้างบทบาท', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Clone Role
  const handleCloneRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneSourceRole || !cloneRoleCode.trim() || !cloneRoleName.trim()) {
      showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/roles/${cloneSourceRole.id}/clone`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: cloneRoleCode.trim().toUpperCase(),
          name: cloneRoleName.trim(),
          description: cloneRoleDesc.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถคัดลอกบทบาทได้');
      }

      showToast(`คัดลอกบทบาทสำเร็จ (${cloneRoleName})`, 'success');
      setShowCloneModal(false);
      setCloneSourceRole(null);
      setCloneRoleCode('');
      setCloneRoleName('');
      setCloneRoleDesc('');
      fetchRoles();
      if (onRolesUpdated) onRolesUpdated();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการคัดลอกบทบาท', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Role
  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editRoleName.trim()) {
      showToast('กรุณากรอกชื่อบทบาท', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          name: editRoleName.trim(),
          description: editRoleDesc.trim() || undefined,
          status: editRoleStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถแก้ไขบทบาทได้');
      }

      showToast('แก้ไขข้อมูลบทบาทเรียบร้อย', 'success');
      setShowEditModal(false);
      setEditingRole(null);
      fetchRoles();
      if (onRolesUpdated) onRolesUpdated();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการแก้ไขบทบาท', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        r.name.toLowerCase().includes(q) || 
        r.code.toLowerCase().includes(q) || 
        (r.description && r.description.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterType === 'SYSTEM') return r.isSystem;
      if (filterType === 'CUSTOM') return r.isCustom;
      if (filterType === 'ACTIVE') return r.status === 'ACTIVE';
      if (filterType === 'INACTIVE') return r.status === 'INACTIVE';
      return true;
    });
  }, [roles, searchQuery, filterType]);

  // Filtered Modules for Permission Matrix
  const filteredModules = useMemo(() => {
    return MODULE_PERMISSION_CATALOG.filter(m => {
      if (permSelectedGroup !== 'ALL' && m.group !== permSelectedGroup) return false;
      if (!permSearchTerm.trim()) return true;
      const term = permSearchTerm.toLowerCase();
      const nameMatch = m.nameTh.toLowerCase().includes(term);
      const descMatch = m.description.toLowerCase().includes(term);
      const actionMatch = m.actions.some(a => a.labelTh.toLowerCase().includes(term) || a.code.toLowerCase().includes(term));
      return nameMatch || descMatch || actionMatch;
    });
  }, [permSearchTerm, permSelectedGroup]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-5 sm:p-6 bg-linear-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Shield className="w-6 h-6 text-indigo-200" />
              </div>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  จัดการบทบาทและสิทธิ์ตั้งต้น (Role & Permission Management)
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200">
                    {roles.length} บทบาท
                  </span>
                </h2>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  กำหนดชุดสิทธิ์พื้นฐานสำหรับบทบาทมาตรฐานของระบบ และสร้างบทบาทเฉพาะบุคคลตามโครงสร้างองค์กร
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-900 text-xs font-bold hover:bg-indigo-50 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> สร้างบทบาทใหม่
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50">
            
            {/* If currently editing permissions for a specific role */}
            {activeRoleForPerms ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveRoleForPerms(null)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs font-semibold flex items-center gap-1"
                    >
                      ← กลับหน้ารายการ
                    </button>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        กำหนดสิทธิ์สำหรับบทบาท: <span className="text-indigo-700">{activeRoleForPerms.name}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {activeRoleForPerms.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        เลือกสิทธิ์ที่บทบาทนี้ได้รับโดยอัตโนมัติ (เลือกแล้ว {rolePermissions.size} จาก 84 สิทธิ์)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setRolePermissions(new Set())}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium"
                    >
                      ล้างสิทธิ์ทั้งหมด
                    </button>
                    <button
                      onClick={handleSaveRolePermissions}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> บันทึกสิทธิ์บทบาท
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar for Permissions */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ค้นหาโมดูลหรือฟังก์ชัน..."
                      value={permSearchTerm}
                      onChange={(e) => setPermSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    {(['ALL', 'CORE', 'SUPPORT'] as const).map(grp => (
                      <button
                        key={grp}
                        onClick={() => setPermSelectedGroup(grp)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          permSelectedGroup === grp
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {grp === 'ALL' ? 'ทุกกลุ่มโมดูล' : grp === 'CORE' ? 'ภารกิจหลัก (Core)' : 'งานสนับสนุน (Support)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason input */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700 shrink-0">เหตุผลประกอบการแก้ไข:</span>
                  <input
                    type="text"
                    placeholder="เช่น ปรับปรุงสิทธิ์ประจำไตรมาส, เพิ่มสิทธิ์ดูรายงาน..."
                    value={permReason}
                    onChange={(e) => setPermReason(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>

                {/* 15 Modules Permission Matrix */}
                <div className="space-y-3">
                  {filteredModules.map((moduleItem) => {
                    const isExpanded = expandedModules[moduleItem.id] ?? false;
                    const modulePermCodes = moduleItem.actions.map(a => a.code);
                    const grantedCount = modulePermCodes.filter(c => rolePermissions.has(c)).length;

                    return (
                      <div
                        key={moduleItem.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                      >
                        <div
                          onClick={() => setExpandedModules(prev => ({ ...prev, [moduleItem.id]: !isExpanded }))}
                          className="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between border-b border-slate-100 select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                {moduleItem.nameTh}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  moduleItem.group === 'CORE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                                }`}>
                                  {moduleItem.group}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{moduleItem.description}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                            <span className="text-xs font-semibold text-slate-500">
                              {grantedCount} / {moduleItem.actions.length} สิทธิ์
                            </span>
                            <div className="hidden sm:flex items-center gap-1 text-[11px]">
                              <button
                                onClick={() => handleBatchModule(moduleItem, 'grant')}
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                              >
                                ทั้งหมด
                              </button>
                              <button
                                onClick={() => handleBatchModule(moduleItem, 'viewOnly')}
                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                              >
                                เฉพาะอ่าน
                              </button>
                              <button
                                onClick={() => handleBatchModule(moduleItem, 'clear')}
                                className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium"
                              >
                                ปิดทั้งหมด
                              </button>
                            </div>
                            <span className="text-slate-400 font-mono text-xs">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {/* Module Action Rows */}
                        {isExpanded && (
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white">
                            {moduleItem.actions.map(action => {
                              const isChecked = rolePermissions.has(action.code);
                              return (
                                <label
                                  key={action.code}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                                    isChecked
                                      ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
                                      : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleRolePermission(action.code)}
                                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold flex items-center justify-between">
                                      <span className="truncate">{action.labelTh}</span>
                                      {action.isHighRisk && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                                          ความเสี่ยงสูง
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                                      {action.code}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Roles Catalog List View */
              <div className="space-y-4">
                
                {/* Search & Filter Tabs */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อบทบาท, รหัส หรือคำอธิบาย..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {(['ALL', 'SYSTEM', 'CUSTOM', 'ACTIVE', 'INACTIVE'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          filterType === type
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {type === 'ALL' ? 'ทั้งหมด' :
                         type === 'SYSTEM' ? 'บทบาทระบบ' :
                         type === 'CUSTOM' ? 'บทบาทสร้างเอง' :
                         type === 'ACTIVE' ? 'ใช้งานปกติ' : 'ระงับการใช้'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Roles Cards Grid */}
                {isLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    กำลังโหลดข้อมูลบทบาทและสิทธิ์...
                  </div>
                ) : filteredRoles.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                    ไม่พบบทบาทตามเงื่อนไขที่ค้นหา
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRoles.map(role => {
                      return (
                        <div
                          key={role.id}
                          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all p-5 flex flex-col justify-between space-y-4"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    role.isSystem
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {role.isSystem ? 'บทบาทระบบ (System)' : 'กำหนดเอง (Custom)'}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    role.status === 'ACTIVE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {role.status === 'ACTIVE' ? 'ใช้งานปกติ' : 'ระงับ'}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 mt-1">
                                  CODE: {role.code}
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                              {role.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับบทบาทนี้'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                              <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                {role.userCount} ผู้ใช้งาน
                              </span>
                              <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                <Key className="w-3.5 h-3.5 text-indigo-500" />
                                {role.permissionCount} / 84 สิทธิ์
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Edit Permissions Matrix Button */}
                              <button
                                onClick={() => openPermissionEditor(role)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                                title="กำหนดสิทธิ์การใช้งานสำหรับบทบาทนี้"
                              >
                                <Key className="w-3.5 h-3.5" /> สิทธิ์
                              </button>

                              {/* Clone Role Button */}
                              <button
                                onClick={() => {
                                  setCloneSourceRole(role);
                                  setCloneRoleCode(`${role.code}_COPY`);
                                  setCloneRoleName(`${role.name} (คัดลอก)`);
                                  setCloneRoleDesc(role.description || '');
                                  setShowCloneModal(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                                title="คัดลอกบทบาท (Clone Role)"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Role Details Button */}
                              <button
                                onClick={() => {
                                  setEditingRole(role);
                                  setEditRoleName(role.name);
                                  setEditRoleDesc(role.description || '');
                                  setEditRoleStatus(role.status);
                                  setShowEditModal(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                                title="แก้ไขชื่อ/คำอธิบายบทบาท"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div>
              ระบบสิทธิ์แบบ Role-Based Access Control (RBAC) พร้อมระบบตรวจสอบประวัติ (Audit Trail)
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Modal: Create New Role */}
      {showCreateModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" /> สร้างบทบาทใหม่ (Create Custom Role)
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รหัสบทบาท (Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น BRANCH_OFFICER, REGISTRAR"
                    value={newRoleCode}
                    onChange={(e) => setNewRoleCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono text-xs focus:bg-white focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    ตัวอักษรภาษาอังกฤษตัวพิมพ์ใหญ่และขีดล่างเท่านั้น
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อบทบาทแสดงผล (Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เจ้าหน้าที่สาขาประจำภูมิภาค"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">คำอธิบายหน้าที่และขอบเขตงาน</label>
                  <textarea
                    rows={3}
                    placeholder="ระบุความรับผิดชอบของบทบาทนี้..."
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'กำลังสร้าง...' : 'สร้างบทบาท'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Sub-Modal: Clone Role */}
      {showCloneModal && cloneSourceRole && (
        <ModalPortal>
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Copy className="w-4 h-4 text-indigo-600" /> คัดลอกบทบาท (Clone Role)
                </h3>
                <button onClick={() => setShowCloneModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                คัดลอกจาก: <span className="font-bold">{cloneSourceRole.name}</span> ({cloneSourceRole.code})
                <div className="text-[11px] text-indigo-700 mt-0.5">
                  สิทธิ์ทั้งหมด ({cloneSourceRole.permissionCount} สิทธิ์) จะถูกคัดลอกไปยังบทบาทใหม่โดยอัตโนมัติ
                </div>
              </div>

              <form onSubmit={handleCloneRole} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รหัสบทบาทใหม่ (Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cloneRoleCode}
                    onChange={(e) => setCloneRoleCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อบทบาทใหม่ (Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cloneRoleName}
                    onChange={(e) => setCloneRoleName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">คำอธิบาย</label>
                  <textarea
                    rows={2}
                    value={cloneRoleDesc}
                    onChange={(e) => setCloneRoleDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCloneModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'กำลังคัดลอก...' : 'ยืนยันคัดลอกบทบาท'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Sub-Modal: Edit Role Details */}
      {showEditModal && editingRole && (
        <ModalPortal>
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Edit className="w-4 h-4 text-indigo-600" /> แก้ไขข้อมูลบทบาท ({editingRole.code})
                </h3>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditRole} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อบทบาท <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">คำอธิบาย</label>
                  <textarea
                    rows={3}
                    value={editRoleDesc}
                    onChange={(e) => setEditRoleDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สถานะการใช้งาน</label>
                  <select
                    value={editRoleStatus}
                    onChange={(e) => setEditRoleStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  >
                    <option value="ACTIVE">ใช้งานปกติ (Active)</option>
                    <option value="INACTIVE">ระงับการใช้งาน (Inactive)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

    </ModalPortal>
  );
}
