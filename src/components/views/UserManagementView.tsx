'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { User, UserRole, Branch, Department } from '@/types';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Building, 
  Phone, 
  Mail, 
  CheckCircle, 
  X,
  AlertTriangle,
  LogIn,
  Key,
  RefreshCw,
  Send,
  Copy,
  Check,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  Layers,
  Edit,
  RotateCcw,
  History,
  LogOut,
  ChevronDown,
  Info
} from 'lucide-react';
import { ModalPortal, lockBodyScroll, unlockBodyScroll } from '@/components/common/Modal';

interface UserManagementViewProps {
  onNavigate: (view: string) => void;
}

export function UserManagementView({ onNavigate }: UserManagementViewProps) {
  const { currentUser, switchUserRole, showToast, authToken } = useApp();

  // Data state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPasswordStatus, setSelectedPasswordStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Lock body scroll cleanly whenever any modal in this view is active
  const isAnyModalOpen = Boolean(
    showAddModal || 
    showEditModal || 
    showResetConfirmModal || 
    showInviteModal || 
    showAuditModal
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isAnyModalOpen]);

  // Active item in modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userAuditLogs, setUserAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [inviteModalData, setInviteModalData] = useState<{
    user?: User;
    setupUrl?: string;
    rawToken?: string;
    message?: string;
    emailStatus?: string;
    isReset?: boolean;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New user form state
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('officer');
  const [newBranchId, setNewBranchId] = useState('br-hq');
  const [newDepartmentId, setNewDepartmentId] = useState('dept-social');
  const [sendInviteOnCreate, setSendInviteOnCreate] = useState(true);

  // Edit user form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('officer');
  const [editBranchId, setEditBranchId] = useState('br-hq');
  const [editDepartmentId, setEditDepartmentId] = useState('dept-social');

  // Helper to fetch with token
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }, [authToken]);

  // Load Organization Structure (Branches & Departments)
  const fetchOrgStructure = useCallback(async () => {
    try {
      const res = await fetch('/api/organization/structure');
      const json = await res.json();
      if (json.success && json.data) {
        setBranches(json.data.branches || []);
        setDepartments(json.data.departments || []);
        if (json.data.branches?.length > 0) {
          setNewBranchId(json.data.branches[0].id);
        }
        if (json.data.departments?.length > 0) {
          setNewDepartmentId(json.data.departments[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load organization structure:', err);
    }
  }, []);

  // Fetch Users from API
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
      if (selectedDept !== 'all') params.append('departmentId', selectedDept);
      if (selectedRole !== 'all') params.append('role', selectedRole);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedPasswordStatus !== 'all') params.append('passwordSetupStatus', selectedPasswordStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();

      if (json.success && json.data) {
        setUsersList(json.data);
        setPendingCount(json.pendingSetupCount || 0);
      } else {
        if (res.status === 401 || res.status === 403) {
          showToast(json.error || 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้งาน (ต้องเป็น Super Admin)', 'error');
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch, selectedDept, selectedRole, selectedStatus, selectedPasswordStatus, searchQuery, getAuthHeaders, showToast]);

  useEffect(() => {
    fetchOrgStructure();
  }, [fetchOrgStructure]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Edit Modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFirstName(user.firstName || user.name.split(' ')[0] || '');
    setEditLastName(user.lastName || user.name.split(' ').slice(1).join(' ') || '');
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditBranchId(user.branchId || 'br-hq');
    setEditDepartmentId(user.departmentId || 'dept-social');
    setShowEditModal(true);
  };

  // Submit Edit User
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      showToast('กรุณาระบุชื่อ นามสกุล และอีเมลให้ครบถ้วน', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          role: editRole,
          branchId: editBranchId,
          departmentId: editDepartmentId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถแก้ไขข้อมูลผู้ใช้งานได้');
      }

      showToast(json.message || 'แก้ไขข้อมูลผู้ใช้สำเร็จ', 'success');
      setShowEditModal(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send First-Time Setup Invite (for pending_setup)
  const handleSendInvite = async (user: User) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users/${user.id}/invite`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถส่งคำเชิญตั้งรหัสผ่านได้');
      }

      showToast(json.message || `สร้างลิงก์คำเชิญสำหรับ ${user.name} สำเร็จ`, 'success');

      const fullUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}${json.setupUrl}`
        : json.setupUrl;

      setInviteModalData({
        user,
        setupUrl: fullUrl,
        rawToken: json.rawToken,
        message: json.message,
        isReset: false,
      });
      setShowInviteModal(true);
      setIsCopied(false);

      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการส่งคำเชิญ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Reset Password Confirmation Modal (for completed users)
  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setShowResetConfirmModal(true);
  };

  // Execute Password Reset by Super Admin
  const handleExecuteResetPassword = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
      }

      showToast(json.message || 'สร้างลิงก์รีเซ็ตรหัสผ่านสำเร็จ', 'success');
      setShowResetConfirmModal(false);

      const fullUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${json.resetUrl}`
        : json.resetUrl;

      setInviteModalData({
        user: selectedUser,
        setupUrl: fullUrl,
        rawToken: json.rawToken,
        message: json.message,
        emailStatus: json.emailStatus,
        isReset: true,
      });
      setShowInviteModal(true);
      setIsCopied(false);

      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revoke User Session
  const handleRevokeSession = async (user: User) => {
    if (!confirm(`คุณต้องการยกเลิก Session ที่ใช้งานอยู่ของ "${user.name}" ใช่หรือไม่?\nผู้ใช้งานจะถูกบังคับให้ออกจากระบบทันที`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users/${user.id}/revoke-session`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถยกเลิก Session ได้');
      }

      showToast(json.message || 'ยกเลิก Session สำเร็จ', 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการยกเลิก Session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // View User Audit Logs
  const handleViewAuditLogs = async (user: User) => {
    setSelectedUser(user);
    setShowAuditModal(true);
    setIsLoadingAudit(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/audit-logs`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setUserAuditLogs(json.data);
      } else {
        setUserAuditLogs([]);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setUserAuditLogs([]);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Handle User Status Change (active, suspended, disabled)
  const handleUpdateStatus = async (user: User, newStatus: 'active' | 'suspended' | 'disabled') => {
    const actionText = 
      newStatus === 'active' ? 'เปิดใช้งาน' :
      newStatus === 'suspended' ? 'ระงับการใช้งานชั่วคราว' : 'ปิดใช้งานบัญชี';

    if (!confirm(`คุณต้องการ ${actionText} บัญชีของ "${user.name}" ใช่หรือไม่?`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถแก้ไขสถานะผู้ใช้ได้');
      }

      showToast(json.message || `ปรับปรุงสถานะเรียบร้อย`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการแก้ไขสถานะ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) {
      showToast('กรุณากรอกชื่อ นามสกุล และอีเมลให้ครบถ้วน', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim(),
          role: newRole,
          branchId: newBranchId,
          departmentId: newDepartmentId,
          sendInvite: sendInviteOnCreate,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถสร้างผู้ใช้งานได้');
      }

      showToast(`สร้างบัญชีผู้ใช้ใหม่เรียบร้อย: ${newFirstName} ${newLastName}`, 'success');
      setShowAddModal(false);

      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPhone('');

      if (json.setupUrl) {
        const fullUrl = typeof window !== 'undefined'
          ? `${window.location.origin}${json.setupUrl}`
          : json.setupUrl;

        setInviteModalData({
          user: json.data,
          setupUrl: fullUrl,
          rawToken: json.setupToken,
          message: 'สร้างบัญชีสำเร็จและสร้างลิงก์คำเชิญตั้งรหัสผ่านเรียบร้อย',
          isReset: false,
        });
        setShowInviteModal(true);
        setIsCopied(false);
      }

      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('คัดลอกลิงก์ไปยังคลิปบอร์ดแล้ว', 'success');
    setTimeout(() => setIsCopied(false), 3000);
  };

  const quickPersonaUsers = usersList.slice(0, 6);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-700" />
              จัดการบัญชีผู้ใช้งาน & สิทธิ์การเข้าถึง (Super Admin User Management)
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Super Admin Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            บริหารบัญชีบุคลากรทุกสาขาและทุกแผนก จัดการสิทธิ์การเข้าถึง รีเซ็ตรหัสผ่าน และควบคุมความปลอดภัยองค์กร
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-semibold hover:bg-purple-800 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" /> เพิ่มผู้ใช้งานใหม่
          </button>
        </div>
      </div>

      {/* KPI & Status Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ผู้ใช้ทั้งหมด</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{usersList.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">ในฐานข้อมูลระบบ</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">บัญชีพร้อมใช้งาน</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {usersList.filter(u => u.status === 'active' && u.passwordSetupStatus === 'completed').length}
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">ตั้งรหัสผ่านและ Login ได้แล้ว</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-amber-600" /> รอตั้งรหัสผ่าน
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{pendingCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">ต้องส่งลิงก์คำเชิญให้ผู้ใช้ตั้งเอง</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ระงับ / ปิดใช้งาน</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {usersList.filter(u => u.status === 'suspended' || u.status === 'disabled').length}
            </div>
            <div className="text-[10px] text-rose-500 mt-0.5">ถูกบล็อกไม่ให้เข้าสู่ระบบ</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Login Role Cards (Demonstration Persona Switcher) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <LogIn className="w-4 h-4 text-emerald-700" />
            เข้าสู่ระบบด่วนตามบทบาทเพื่อทดสอบระบบ (Quick Switch Persona for Testing)
          </h2>
          <span className="text-[11px] text-slate-400">สลับบัญชีเพื่อทดสอบมุมมองและสิทธิ์แต่ละฝ่าย</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickPersonaUsers.map((user) => {
            const isCurrent = currentUser?.id === user.id;
            const isPending = user.passwordSetupStatus === 'pending_setup';
            return (
              <button
                key={user.id}
                onClick={() => switchUserRole(user.role)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/40 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {user.name.slice(0, 2)}
                  </div>
                  {isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ) : isPending ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                      รอรหัส
                    </span>
                  ) : null}
                </div>
                <div className="font-bold text-xs text-slate-900 truncate">{user.name}</div>
                <div className="text-[10px] text-emerald-700 font-semibold truncate mt-0.5">
                  {user.roleTitleTh}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-purple-700" />
          ตัวกรองข้อมูลบุคลากรแยกตามองค์กรและสถานะ
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">ทุกสาขา / สำนักงาน</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">ทุกแผนก / ฝ่าย</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">ทุกบทบาท (Roles)</option>
              <option value="super_admin">ผู้ดูแลระบบสูงสุด (Super Admin)</option>
              <option value="executive">ผู้บริหาร (Executive)</option>
              <option value="officer">เจ้าหน้าที่ลงพื้นที่ (Officer)</option>
              <option value="approver">ผู้อนุมัติคำร้อง (Approver)</option>
              <option value="finance">การเงินและบัญชี (Finance)</option>
              <option value="member">สมาชิกทั่วไป (Member)</option>
            </select>
          </div>

          {/* Password Setup Status Filter */}
          <div>
            <select
              value={selectedPasswordStatus}
              onChange={(e) => setSelectedPasswordStatus(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">สถานะรหัสผ่านทั้งหมด</option>
              <option value="pending_setup">⚠️ ยังไม่ตั้งรหัสผ่าน (Pending)</option>
              <option value="completed">✓ ตั้งรหัสผ่านแล้ว (Completed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              รายชื่อบุคลากรและบัญชีผู้ใช้งาน ({usersList.length} รายการ)
            </h2>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-600" />
                มี {pendingCount} บัญชียังไม่ได้กำหนดรหัสผ่าน
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            ระบบความปลอดภัย: รหัสผ่านไม่ปรากฏในหน้าจอ Super Admin และยกเลิก Session อัตโนมัติเมื่อมีการรีเซ็ตรหัสผ่าน
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4">อีเมล / เบอร์ติดต่อ</th>
                <th className="py-3 px-4">บทบาท (Role)</th>
                <th className="py-3 px-4">สาขา / แผนก</th>
                <th className="py-3 px-4 text-center">สถานะรหัสผ่าน</th>
                <th className="py-3 px-4 text-center">สถานะบัญชี</th>
                <th className="py-3 px-4 text-center">เข้าสู่ระบบล่าสุด</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                usersList.map((user) => {
                  const isPendingPassword = user.passwordSetupStatus === 'pending_setup';
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {user.name}
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                              (คุณ)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">UID: {user.id}</div>
                      </td>

                      {/* Email & Phone */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          {user.email}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          {user.phone || '-'}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block border ${
                          user.role === 'super_admin' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          user.role === 'executive' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                          user.role === 'officer' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          user.role === 'approver' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                          user.role === 'finance' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {user.roleTitleTh || user.role}
                        </span>
                      </td>

                      {/* Branch & Department */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          {user.branchName || user.branch}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                          {user.departmentName || 'ส่วนกลาง'}
                        </div>
                      </td>

                      {/* Password Setup Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isPendingPassword ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            ยังไม่ตั้งรหัสผ่าน
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            ตั้งรหัสผ่านแล้ว
                          </span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                          user.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : user.status === 'suspended'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {user.status === 'active' ? 'ใช้งานปกติ' : 
                           user.status === 'suspended' ? 'ระงับชั่วคราว' : 'ปิดใช้งาน'}
                        </span>
                      </td>

                      {/* Last Login & Created At */}
                      <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                        <div>{user.lastLogin || 'ยังไม่เคยเข้าสู่ระบบ'}</div>
                        {user.createdAt && (
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            สร้างเมื่อ: {new Date(user.createdAt).toLocaleDateString('th-TH')}
                          </div>
                        )}
                      </td>

                      {/* Actions Toolbar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Edit User Button */}
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold"
                            title="แก้ไขข้อมูลผู้ใช้"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          {/* Send Invite or Reset Password */}
                          {isPendingPassword ? (
                            <button
                              onClick={() => handleSendInvite(user)}
                              disabled={isSubmitting || user.status === 'disabled'}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500 text-white border border-amber-600 hover:bg-amber-600 shadow-xs transition-all disabled:opacity-50"
                              title="ส่งคำเชิญให้ตั้งรหัสผ่านครั้งแรก"
                            >
                              <Send className="w-3 h-3" />
                              ส่งคำเชิญตั้งรหัส
                            </button>
                          ) : (
                            <button
                              onClick={() => openResetPasswordModal(user)}
                              disabled={isSubmitting || user.status === 'disabled'}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all disabled:opacity-50"
                              title="รีเซ็ตรหัสผ่านสำหรับผู้ใช้"
                            >
                              <RotateCcw className="w-3 h-3" />
                              รีเซ็ตรหัสผ่าน
                            </button>
                          )}

                          {/* Revoke Session */}
                          <button
                            onClick={() => handleRevokeSession(user)}
                            disabled={isSubmitting}
                            className="p-1.5 bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 rounded-lg text-xs"
                            title="ยกเลิก Session (บังคับ Logout)"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>

                          {/* Status Management */}
                          {!isSelf && (
                            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-[10px]">
                              {user.status === 'active' ? (
                                <button
                                  onClick={() => handleUpdateStatus(user, 'suspended')}
                                  disabled={isSubmitting}
                                  className="px-2 py-1 bg-white text-amber-700 hover:bg-amber-50 font-semibold"
                                  title="ระงับบัญชีชั่วคราว"
                                >
                                  ระงับ
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateStatus(user, 'active')}
                                  disabled={isSubmitting}
                                  className="px-2 py-1 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
                                  title="เปิดใช้งานบัญชี"
                                >
                                  เปิดใช้
                                </button>
                              )}
                            </div>
                          )}

                          {/* Audit Logs */}
                          <button
                            onClick={() => handleViewAuditLogs(user)}
                            className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs"
                            title="ดูประวัติการเปลี่ยนแปลง (Audit Log)"
                          >
                            <History className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowEditModal(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden"
            >
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-purple-700" />
                แก้ไขข้อมูลผู้ใช้งาน: {selectedUser.name}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  อีเมล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  หมายเลขโทรศัพท์
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  บทบาท (Role) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="super_admin">ผู้ดูแลระบบสูงสุด (Super Admin)</option>
                  <option value="executive">ผู้บริหาร / ประธานมูลนิธิ (Executive)</option>
                  <option value="officer">เจ้าหน้าที่ช่วยเหลือสังคมและลงพื้นที่ (Help Officer)</option>
                  <option value="approver">ผู้อนุมัติคำร้อง / คณะกรรมการชะรีอะฮ์ (Approver)</option>
                  <option value="finance">หัวหน้าฝ่ายการเงินและบัญชี (Finance)</option>
                  <option value="member">สมาชิกทั่วไป (Member)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    สาขา / สำนักงาน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    แผนก / ฝ่าย <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* Reset Password Confirmation Modal */}
      {showResetConfirmModal && selectedUser && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowResetConfirmModal(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  ยืนยันการรีเซ็ตรหัสผ่าน
                </h2>
              </div>
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div><strong>ผู้ใช้งาน:</strong> {selectedUser.name}</div>
                <div><strong>อีเมล:</strong> {selectedUser.email}</div>
                <div><strong>บทบาท:</strong> {selectedUser.roleTitleTh || selectedUser.role}</div>
                <div><strong>แผนก:</strong> {selectedUser.departmentName || 'ส่วนกลาง'}</div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  มาตรการความปลอดภัย
                </div>
                <p className="leading-relaxed text-[11px]">
                  เมื่อดำเนินการ ระบบจะยกเลิก Session ที่ใช้งานอยู่ของผู้ใช้ทันที และสร้างโทเคนแบบใช้ครั้งเดียวที่มีอายุ 48 ชั่วโมงสำหรับให้ผู้ใช้กำหนดรหัสผ่านใหม่ด้วยตนเอง
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteResetPassword}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-800 disabled:opacity-50 text-xs"
              >
                {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันและสร้างลิงก์รีเซ็ต'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* Invite / Reset Token Modal */}
      {showInviteModal && inviteModalData && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowInviteModal(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {inviteModalData.isReset ? 'ลิงก์รีเซ็ตรหัสผ่าน (Password Reset)' : 'ลิงก์คำเชิญตั้งรหัสผ่าน (Password Setup)'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    สำหรับผู้ใช้: <strong className="text-slate-800">{inviteModalData.user?.name}</strong> ({inviteModalData.user?.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  ระบบได้สร้างโทเคนแบบใช้ได้ครั้งเดียว (One-Time Token) และเข้ารหัสด้วย SHA-256 บันทึกในฐานข้อมูลเรียบร้อยแล้ว ลิงก์นี้มีอายุใช้งาน <strong>48 ชั่วโมง</strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  URL สำหรับให้ผู้ใช้งานเปิดเพื่อกำหนดรหัสผ่านด้วยตนเอง:
                </label>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-[11px] text-slate-800 break-all select-all">
                  <span className="flex-1 overflow-x-auto">{inviteModalData.setupUrl}</span>
                  <button
                    onClick={() => copyToClipboard(inviteModalData.setupUrl || '')}
                    className="px-3 py-1.5 bg-purple-700 text-white rounded-lg font-semibold shrink-0 hover:bg-purple-800 flex items-center gap-1 transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                </div>
              </div>

              {inviteModalData.emailStatus && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{inviteModalData.emailStatus}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-600">
                <div className="font-semibold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                  หลักความปลอดภัยตามข้อกำหนด:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
                  <li>Super Admin ไม่สามารถดูหรือตั้งรหัสผ่านแทนผู้ใช้ได้</li>
                  <li>ระบบไม่เก็บบันทึกรหัสผ่านหรือ Secret เป็นข้อความธรรมดา</li>
                  <li>เมื่อตั้งรหัสผ่านสำเร็จ Session เดิมทั้งหมดจะถูกเพิกถอนทันที</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* Audit Log Modal */}
      {showAuditModal && selectedUser && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAuditModal(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden"
            >
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <History className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ประวัติการเปลี่ยนแปลงบัญชีและ Audit Log
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    เป้าหมาย: <strong className="text-slate-800">{selectedUser.name}</strong> ({selectedUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 text-xs pr-1">
              {isLoadingAudit ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังโหลดบันทึกประวัติ...
                </div>
              ) : userAuditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  ไม่พบประวัติการทำรายการสำหรับผู้ใช้นี้
                </div>
              ) : (
                userAuditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-400">{log.timestamp}</span>
                      <span className="px-2 py-0.5 rounded font-bold bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">
                        {log.action}
                      </span>
                    </div>
                    <div className="text-slate-800 leading-relaxed">{log.description}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>ผู้ดำเนินการ: <strong>{log.userName}</strong> ({log.userRole})</span>
                      <span className="font-mono">IP: {log.ipAddress}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t shrink-0">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAddModal(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden"
            >
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-700" />
                เพิ่มบุคลากรใหม่และส่งคำเชิญตั้งรหัสผ่าน
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ซะการียา"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น มะแซ"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  อีเมล (สำหรับเข้าสู่ระบบและรับคำเชิญ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="zakariya@zakatfoundation.or.th"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  หมายเลขโทรศัพท์
                </label>
                <input
                  type="tel"
                  placeholder="08X-XXX-XXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  บทบาทและสิทธิ์การใช้งาน (Role) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="officer">เจ้าหน้าที่ช่วยเหลือสังคมและลงพื้นที่ (Help Officer)</option>
                  <option value="approver">ผู้อนุมัติคำร้อง / คณะกรรมการชะรีอะฮ์ (Approver)</option>
                  <option value="finance">หัวหน้าฝ่ายการเงินและบัญชี (Finance)</option>
                  <option value="executive">ผู้บริหาร / ประธานมูลนิธิ (Executive)</option>
                  <option value="super_admin">ผู้ดูแลระบบสูงสุด (Super Admin)</option>
                  <option value="member">สมาชิกทั่วไป (Member)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    สาขา / สำนักงาน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    แผนก / ฝ่าย <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newDepartmentId}
                    onChange={(e) => setNewDepartmentId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendInviteOnCreate}
                    onChange={(e) => setSendInviteOnCreate(e.target.checked)}
                    className="mt-0.5 rounded text-purple-700 focus:ring-purple-500"
                  />
                  <div className="text-[11px] text-slate-700">
                    <span className="font-bold text-purple-900">สร้างและแสดงลิงก์คำเชิญตั้งรหัสผ่านทันที</span>
                    <p className="text-slate-500 mt-0.5">
                      ระบบจะสร้างบัญชีสถานะ <span className="font-semibold text-amber-700">"รอตั้งรหัสผ่าน (pending_setup)"</span> โดยไม่มีรหัสผ่านเริ่มต้น และสร้างลิงก์ปลอดภัยสำหรับส่งให้ผู้ใช้กำหนดรหัสผ่านเอง
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและสร้างบัญชี'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
      )}
    </div>
  );
}
