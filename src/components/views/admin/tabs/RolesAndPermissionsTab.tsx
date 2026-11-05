'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Plus, 
  Copy, 
  Edit, 
  Trash2, 
  Users, 
  Key, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Filter, 
  Layers, 
  Lock,
  ChevronRight,
  Info,
  Sliders,
  UserCheck
} from 'lucide-react';
import { MODULE_PERMISSION_CATALOG, ModuleCatalogItem } from '@zms/shared';
import { RoleManagementModal, RoleItem } from '../../users/RoleManagementModal';
import { ManualPermissionModal } from '../../users/ManualPermissionModal';

export function RolesAndPermissionsTab() {
  const { showToast, authToken, currentUser } = useApp();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);

  // Active Sub-tab inside Roles & Permissions:
  // 1. 'roles-matrix': Role List & Matrix
  // 2. 'personal-overrides': Overrides & Data Scopes
  const [activeSubTab, setActiveSubTab] = useState<'roles-matrix' | 'personal-overrides'>('roles-matrix');

  // Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [selectedUserForOverride, setSelectedUserForOverride] = useState<any>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Matrix Editing State for selected role
  const [matrixRolePermissions, setMatrixRolePermissions] = useState<Set<string>>(new Set());
  const [isSavingMatrix, setIsSavingMatrix] = useState<boolean>(false);
  const [hasMatrixChanges, setHasMatrixChanges] = useState<boolean>(false);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/roles', {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const roleList: RoleItem[] = json.data || [];
        setRoles(roleList);
        if (!selectedRole && roleList.length > 0) {
          setSelectedRole(roleList[0]);
          setMatrixRolePermissions(new Set(roleList[0].permissions || []));
        } else if (selectedRole) {
          const updated = roleList.find((r) => r.id === selectedRole.id);
          if (updated) {
            setSelectedRole(updated);
            setMatrixRolePermissions(new Set(updated.permissions || []));
          }
        }
      } else {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลบทบาทได้');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการโหลดบทบาท', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSelectRole = (r: RoleItem) => {
    setSelectedRole(r);
    setMatrixRolePermissions(new Set(r.permissions || []));
    setHasMatrixChanges(false);
  };

  const togglePermission = (permCode: string) => {
    if (!selectedRole) return;
    const next = new Set(matrixRolePermissions);
    if (next.has(permCode)) {
      next.delete(permCode);
    } else {
      next.add(permCode);
    }
    setMatrixRolePermissions(next);
    setHasMatrixChanges(true);
  };

  const handleSaveMatrix = async () => {
    if (!selectedRole) return;
    try {
      setIsSavingMatrix(true);
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          permissions: Array.from(matrixRolePermissions),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`บันทึกสิทธิ์สำหรับบทบาท '${selectedRole.name}' สำเร็จ`, 'success');
        setHasMatrixChanges(false);
        fetchRoles();
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingMatrix(false);
    }
  };

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Access Control: Roles & RBAC Matrix</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">บทบาทและสิทธิ์การเข้าถึง (Roles & Permissions)</h2>
          <p className="text-xs text-slate-500 mt-1">
            ควบคุมการเข้าถึงตามหลักการความปลอดภัย Role-Based Access Control (RBAC), กำหนดสิทธิ์แยกตามโมดูล, สิทธิ์พิเศษเฉพาะบุคคล (Allow/Deny) และขอบเขตข้อมูล (Data Scope)
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchRoles}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsRoleModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-800 text-white font-semibold text-xs shadow-xs hover:bg-teal-900 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>จัดการบทบาททั้งหมด (Role Manager)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Roles List / Right Permission Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Roles Cards List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาบทบาท..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-800 mx-auto mb-2" />
                <span className="text-xs text-slate-500">กำลังโหลดรายการบทบาท...</span>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <span className="text-xs text-slate-600">ไม่พบบทบาทที่ค้นหา</span>
              </div>
            ) : (
              filteredRoles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/40 border-teal-600 shadow-sm ring-1 ring-teal-600'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{r.name}</span>
                          {r.isSystem && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              ระบบ
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-teal-900 mt-0.5">{r.code}</div>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {r.userCount || 0} ผู้ใช้
                      </span>
                    </div>

                    {r.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">{r.description}</p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>สิทธิ์ที่ได้รับ: {r.permissions?.length || matrixRolePermissions.size || 0} รายการ</span>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-700' : 'text-slate-400'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Permission Matrix for Selected Role (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedRole ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
              {/* Role Header & Matrix Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                      กำลังกำหนดสิทธิ์สำหรับ: {selectedRole.code}
                    </span>
                    <span className="text-xs text-slate-400">|</span>
                    <span className="text-xs text-slate-600 font-semibold">{selectedRole.name}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    ตารางสิทธิ์การใช้งานตามโมดูล (Module Permission Matrix)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveMatrix}
                    disabled={isSavingMatrix || !hasMatrixChanges}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 text-white font-semibold text-xs shadow-xs hover:bg-teal-900 active:scale-98 transition-all disabled:opacity-50"
                  >
                    {isSavingMatrix ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกสิทธิ์บทบาท</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Module Matrix Accordion / Table */}
              <div className="space-y-4">
                {MODULE_PERMISSION_CATALOG.map((mod) => (
                  <div key={mod.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-700" />
                        <h4 className="font-bold text-xs text-slate-900">{mod.nameTh}</h4>
                        <span className="text-[10px] font-mono text-slate-400">({mod.id})</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{mod.description}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                      {mod.actions.map((act) => {
                        const isChecked = matrixRolePermissions.has(act.code);
                        return (
                          <label
                            key={act.code}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-teal-50 border-teal-300 text-teal-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(act.code)}
                              className="rounded text-teal-800 focus:ring-teal-700"
                            />
                            <span className="truncate">{act.labelTh}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Scope & Personal Override Advisory Card */}
              <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200/80 text-xs text-teal-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-teal-900">
                  <Sliders className="w-4 h-4 text-teal-800" />
                  <span>การกำหนดสิทธิ์เฉพาะบุคคล (Personal Permission Override) & ขอบเขตข้อมูล (Data Scope)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  หากต้องการเพิ่มหรือตัดสิทธิ์เฉพาะเจ้าหน้าที่รายบุคคล (Allow/Deny) หรือปรับขอบเขตข้อมูลเป็นระดับ <strong>OWN (ตนเอง)</strong>, <strong>DEPARTMENT (แผนก)</strong>, <strong>BRANCH (สาขา)</strong> หรือ <strong>ORGANIZATION (ทั้งองค์กร)</strong> สามารถเปิดหน้า <strong>จัดการผู้ใช้งาน</strong> แล้วเลือกเมนู <em>&ldquo;กำหนดสิทธิ์เฉพาะบุคคล&rdquo;</em> บนการ์ดผู้ใช้นั้นๆ
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">กรุณาเลือกบทบาทจากรายการด้านซ้าย</p>
              <p className="text-xs text-slate-400 mt-1">เพื่อดูและกำหนดสิทธิ์ตามโมดูลและฟังก์ชันการทำงาน</p>
            </div>
          )}
        </div>
      </div>

      {/* Role Management Modal (Full CRUD on Roles) */}
      <RoleManagementModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          fetchRoles();
        }}
        authToken={authToken}
        showToast={showToast}
        onRolesUpdated={fetchRoles}
      />
    </div>
  );
}
