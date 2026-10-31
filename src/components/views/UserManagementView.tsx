'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { User, UserRole, Branch, Department } from '@/types';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Building, 
  Building2,
  Phone, 
  Mail, 
  CheckCircle, 
  X,
  AlertTriangle,
  AlertCircle,
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
  Info,
  Sliders,
  UserX,
  Eye,
  MoreVertical,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Shield,
  Plus,
  Power,
  Ban
} from 'lucide-react';
import { ModalPortal, lockBodyScroll, unlockBodyScroll } from '@/components/common/Modal';
import { RoleManagementModal } from './users/RoleManagementModal';
import { ManualPermissionModal } from './users/ManualPermissionModal';
import { UserDetailModal } from './users/UserDetailModal';

interface UserManagementViewProps {
  onNavigate?: (view: string) => void;
}

export function UserManagementView({ onNavigate }: UserManagementViewProps = {}) {
  const { currentUser, showToast, authToken } = useApp();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Main Tabs (like Branches & Departments)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');

  // Data state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [rolesCount, setRolesCount] = useState<number>(7);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPasswordStatus, setSelectedPasswordStatus] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showManualPermissionModal, setShowManualPermissionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Active user selections
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserForPerm, setSelectedUserForPerm] = useState<User | null>(null);
  const [userAuditLogs, setUserAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [activeDropdownUserId, setActiveDropdownUserId] = useState<string | null>(null);

  // Invite modal feedback
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

  // Lock body scroll cleanly whenever any modal in this view is active
  const isAnyModalOpen = Boolean(
    showAddModal || 
    showEditModal || 
    showResetConfirmModal || 
    showInviteModal || 
    showAuditModal ||
    showRoleModal ||
    showManualPermissionModal ||
    showDetailModal
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isAnyModalOpen]);

  // Helper to fetch with token + RBAC actor headers
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (currentUser?.id) {
      headers['x-actor-id'] = currentUser.id;
    }
    if (currentUser?.role) {
      headers['x-actor-role'] = currentUser.role;
    }
    return headers;
  }, [authToken, currentUser]);

  // Load Organization Structure (Branches & Departments)
  const fetchOrgStructure = useCallback(async () => {
    try {
      const res = await fetch('/api/organization/structure');
      const json = await res.json();
      if (json.success && json.data) {
        const loadedBranches: Branch[] = json.data.branches || [];
        const loadedDepts: Department[] = json.data.departments || [];
        setBranches(loadedBranches);
        setDepartments(loadedDepts);
        const firstActiveBranch = loadedBranches.find(b => b.status !== 'inactive') || loadedBranches[0];
        const firstActiveDept = loadedDepts.find(d => d.status !== 'inactive') || loadedDepts[0];
        if (firstActiveBranch) {
          setNewBranchId(firstActiveBranch.id);
        }
        if (firstActiveDept) {
          setNewDepartmentId(firstActiveDept.id);
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

  const fetchRolesCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/roles', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRolesCount(json.data.length);
      }
    } catch {}
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchOrgStructure();
  }, [fetchOrgStructure]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRolesCount();
  }, [fetchRolesCount]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedRole, selectedBranch, selectedDept, selectedStatus, selectedPasswordStatus]);

  // Close card action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownUserId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter users by client-side criteria and active tab
  const filteredUsers = useMemo(() => {
    return usersList.filter((user) => {
      const uStatus = user.status?.toLowerCase() || ((user as any).isActive ? 'active' : 'disabled');
      const isPending = user.passwordSetupStatus === 'pending_setup';

      // Tab switcher filter
      if (activeTab === 'active' && uStatus !== 'active') return false;
      if (activeTab === 'inactive' && uStatus !== 'disabled' && uStatus !== 'suspended' && uStatus !== 'inactive') return false;
      if (activeTab === 'pending' && !isPending) return false;

      // Search filter: Name, Username, Email, Phone
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = (user.name || '').toLowerCase().includes(q) ||
          `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(q);
        const usernameMatch = ((user as any).username || '').toLowerCase().includes(q);
        const emailMatch = (user.email || '').toLowerCase().includes(q);
        const phoneMatch = (user.phone || '').includes(q);
        if (!nameMatch && !usernameMatch && !emailMatch && !phoneMatch) return false;
      }

      // Role filter
      if (selectedRole !== 'all') {
        const uRole = (user.role || (user as any).primaryRoleCode || '').toLowerCase();
        if (uRole !== selectedRole.toLowerCase()) return false;
      }

      // Branch filter
      if (selectedBranch !== 'all' && user.branchId !== selectedBranch) {
        return false;
      }

      // Department filter
      if (selectedDept !== 'all' && user.departmentId !== selectedDept) {
        return false;
      }

      // Status dropdown filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'active' && uStatus !== 'active') return false;
        if (selectedStatus === 'suspended' && uStatus !== 'suspended') return false;
        if (selectedStatus === 'disabled' && uStatus !== 'disabled' && uStatus !== 'inactive') return false;
      }

      // Password Status filter
      if (selectedPasswordStatus !== 'all') {
        if (selectedPasswordStatus === 'pending_setup' && !isPending) return false;
        if (selectedPasswordStatus === 'completed' && isPending) return false;
      }

      return true;
    });
  }, [usersList, activeTab, searchQuery, selectedRole, selectedBranch, selectedDept, selectedStatus, selectedPasswordStatus]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedRole !== 'all' ||
    selectedBranch !== 'all' ||
    selectedDept !== 'all' ||
    selectedStatus !== 'all' ||
    selectedPasswordStatus !== 'all' ||
    activeTab !== 'all';

  const handleClearFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedBranch('all');
    setSelectedDept('all');
    setSelectedStatus('all');
    setSelectedPasswordStatus('all');
    setCurrentPage(1);
    showToast('ล้างตัวกรองทั้งหมดแล้ว', 'info');
  };

  // Pagination calculation
  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Open Details Modal
  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  // Open Edit Modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    const fullName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.name || (user as any).displayName || '');
    const nameParts = fullName.split(' ');
    setEditFirstName(user.firstName || nameParts[0] || '');
    setEditLastName(user.lastName || nameParts.slice(1).join(' ') || '');
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

  // Send First-Time Setup Invite
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

  // Open Reset Password Confirmation Modal
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

  // Top summary counters
  const totalCount = usersList.length;
  const activeCount = usersList.filter(u => u.status === 'active' || (u as any).isActive === true).length;
  const inactiveCount = usersList.filter(u => u.status === 'disabled' || (u as any).status === 'inactive' || (u as any).isActive === false).length;
  const suspendedCount = usersList.filter(u => u.status === 'suspended').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & PRIMARY ACTIONS (Matching Branches & Departments) */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4" /> การบริหารจัดการและการกระจายอำนาจ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            จัดการผู้ใช้งานและสิทธิ์ (Users & Permissions)
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            บริหารบัญชีผู้ใช้งาน บทบาท สิทธิ์การเข้าถึง และขอบเขตข้อมูลขององค์กร กำหนดสิทธิ์แบบ Granular Overrides และควบคุม Data Scope เชื่อมโยงกับฐานข้อมูลจริง
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#0b2545] hover:bg-[#133e6f] text-white font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>เพิ่มผู้ใช้งาน</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRoleModal(true)}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-teal-200" />
            <span>เพิ่มบทบาท (Role)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY KPI CARDS (Matching Branches & Departments 4-Card System) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ผู้ใช้งานทั้งหมด */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            setSelectedStatus('all');
          }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white border-teal-500 ring-2 ring-teal-500/15 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-teal-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ผู้ใช้งานทั้งหมดในระบบ</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {totalCount} <span className="text-sm font-bold text-slate-500">บัญชี</span>
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            เปิดใช้งาน {activeCount} คน
            {inactiveCount > 0 && (
              <span className="text-slate-400 font-normal"> • ปิดใช้งาน {inactiveCount} คน</span>
            )}
          </div>
        </button>

        {/* Card 2: ผู้ใช้งานที่กำลังใช้งาน */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('active');
            setSelectedStatus('active');
          }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/15 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ผู้ใช้งานที่กำลังใช้งาน</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {activeCount} <span className="text-sm font-bold text-slate-500">บัญชี</span>
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            พร้อมเข้าสู่ระบบและปฏิบัติงานตามสิทธิ์
          </div>
        </button>

        {/* Card 3: บทบาทผู้ใช้งานทั้งหมด */}
        <button
          type="button"
          onClick={() => setShowRoleModal(true)}
          className="p-5 rounded-2xl border text-left transition-all cursor-pointer bg-white border-slate-200/80 hover:border-indigo-300 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">บทบาทผู้ใช้งานทั้งหมด</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {rolesCount} <span className="text-sm font-bold text-slate-500">บทบาท</span>
          </div>
          <div className="text-xs text-indigo-700 font-semibold mt-1">
            บทบาทมาตรฐานและบทบาทที่กำหนดเอง
          </div>
        </button>

        {/* Card 4: ผู้ใช้งานที่รอกำหนดสิทธิ์ */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('pending');
            setSelectedPasswordStatus('pending_setup');
          }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/15 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">รอกำหนดสิทธิ์ / ตั้งรหัสผ่าน</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {pendingCount}{' '}
            <span className="text-sm font-bold text-slate-500">รายการที่ต้องดูแล</span>
          </div>
          <div className="text-xs font-semibold mt-1 text-slate-600">
            {pendingCount > 0 ? (
              <span className="text-amber-700">มีบัญชีที่รอส่งคำเชิญหรือตั้งรหัสผ่าน</span>
            ) : (
              <span className="text-emerald-700">บุคลากรทุกคนกำหนดรหัสผ่านครบถ้วน</span>
            )}
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. NAVIGATION TABS + SEARCH & FILTER PANEL (Matching Branches & Departments) */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Tab Switcher */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200 self-start flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedStatus('all');
                setSelectedPasswordStatus('all');
              }}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              ผู้ใช้งานทั้งหมด ({usersList.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('active');
                setSelectedStatus('active');
                setSelectedPasswordStatus('all');
              }}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              กำลังใช้งาน ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('inactive');
                setSelectedStatus('all');
                setSelectedPasswordStatus('all');
              }}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'inactive'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              ระงับ / ปิดใช้งาน ({inactiveCount + suspendedCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('pending');
                setSelectedPasswordStatus('pending_setup');
              }}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              รอกำหนดสิทธิ์ ({pendingCount})
            </button>
          </div>

          {/* Refresh & Clear Filters */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
            <button
              type="button"
              onClick={fetchUsers}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="รีเฟรชข้อมูลจากฐานข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Search & Multi-Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              ค้นหาข้อมูล (ชื่อ, นามสกุล, Username, Email, เบอร์โทร)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="พิมพ์ชื่อ–นามสกุล, @username, หรืออีเมลผู้ใช้..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Filter by Role */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">กรองตามบทบาท (Role)</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">ทุกบทบาท (All Roles)</option>
              <option value="super_admin">ผู้ดูแลระบบสูงสุด (Super Admin)</option>
              <option value="executive">ผู้บริหาร (Executive)</option>
              <option value="officer">เจ้าหน้าที่ลงพื้นที่ (Officer)</option>
              <option value="approver">ผู้อนุมัติคำร้อง (Approver)</option>
              <option value="finance">การเงินและบัญชี (Finance)</option>
              <option value="member">สมาชิกทั่วไป (Member)</option>
            </select>
          </div>

          {/* Filter by Branch */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">กรองตามสาขา</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">ทุกสาขา ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Department */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">กรองตามแผนก</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">ทุกแผนก ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LOADING / ERROR / EMPTY STATES */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <div className="text-base font-bold text-slate-800">กำลังโหลดข้อมูลผู้ใช้งานและสิทธิ์จากฐานข้อมูล...</div>
          <p className="text-xs text-slate-500">กรุณารอสักครู่ ระบบกำลังคำนวณสิทธิ์ บทบาท และการเชื่อมโยงข้อมูล</p>
        </div>
      ) : totalItems === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</h3>
            <p className="text-sm text-slate-500">
              ลองเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อแสดงรายการผู้ใช้งานทั้งหมดในระบบ
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#0b2545] text-white text-sm font-bold hover:bg-[#133e6f] inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* 5. USER CARD GRID (Matching Branches & Departments Card Design) */
        /* ========================================================================= */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {paginatedUsers.map((user) => {
              const isSelf = currentUser?.id === user.id;
              const userName =
                user.name ||
                (user as any).displayName ||
                `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                user.email.split('@')[0];
              const username = (user as any).username || user.email.split('@')[0];
              const isPendingPassword = user.passwordSetupStatus === 'pending_setup';
              const is2FA = Boolean((user as any).mfaEnabled || (user as any).twoFactorEnabled);
              const dataScope = (user as any).dataScope?.scope || (user as any).dataScope || 'BRANCH';
              const overridesCount = (user as any).overridesCount || 0;

              const isSuspended = user.status === 'suspended';
              const isDisabled = user.status === 'disabled' || (user as any).status === 'inactive' || (user as any).isActive === false;
              const isActive = !isSuspended && !isDisabled;

              const statusBadgeColor = isActive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : isSuspended
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200';
              const statusBadgeText = isActive ? 'กำลังใช้งาน' : isSuspended ? 'ระงับบัญชี' : 'ปิดใช้งาน';

              const roleBadgeColor =
                user.role === 'super_admin'
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : user.role === 'executive'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : user.role === 'officer'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : user.role === 'approver'
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : user.role === 'finance'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200';

              const branchName =
                user.branchName ||
                user.branch ||
                branches.find((b) => b.id === user.branchId)?.name ||
                'สำนักงานใหญ่ (HQ)';
              const deptName =
                user.departmentName ||
                departments.find((d) => d.id === user.departmentId)?.name ||
                'ส่วนกลาง';

              const lastLoginText = (user as any).lastLoginAt || user.lastLogin;
              const isDropdownOpen = activeDropdownUserId === user.id;

              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-2xl border p-6 shadow-xs transition-all flex flex-col justify-between space-y-5 ${
                    !isActive
                      ? 'border-slate-300 bg-slate-50/60 opacity-90'
                      : 'border-slate-200/90 hover:border-teal-400'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Card Header Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-2xl bg-[#0b2545] text-amber-300 font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                          {userName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#0b2545] text-amber-300 font-mono">
                              @{username}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${roleBadgeColor}`}>
                              {user.roleTitleTh || user.role}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 font-mono">
                              Scope: {dataScope}
                            </span>
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-100 text-teal-800">
                                บัญชีคุณ
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-black text-slate-900 leading-snug">{userName}</h3>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{user.email}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 border ${statusBadgeColor}`}
                      >
                        {statusBadgeText}
                      </span>
                    </div>

                    {/* Middle Section: Branch, Department, Position, Phone */}
                    <div className="space-y-2.5 text-sm text-slate-700 border-t border-slate-100 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>สาขา: <strong className="text-slate-900">{branchName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>แผนก: <strong className="text-slate-900">{deptName}</strong></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>ตำแหน่ง: <strong className="text-slate-900">{(user as any).position || 'เจ้าหน้าที่'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>เบอร์โทร: {user.phone || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Real-time Counts Box (Just like Branch Database Counts Box) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                      <div>
                        <div className="text-[11px] font-bold text-slate-500">สิทธิ์เฉพาะบุคคล</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">
                          {overridesCount > 0 ? (
                            <span className="text-purple-700 font-bold">+{overridesCount} พิเศษ</span>
                          ) : (
                            <span className="text-slate-600 font-semibold text-xs">ตามบทบาท</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-500">2FA Security</div>
                        <div className="text-base font-black mt-0.5">
                          {is2FA ? (
                            <span className="text-emerald-700 text-xs font-bold">เปิดใช้งาน</span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">ปิดใช้งาน</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-500">สถานะรหัสผ่าน</div>
                        <div className="text-base font-black mt-0.5">
                          {isPendingPassword ? (
                            <span className="text-amber-700 text-xs font-bold">รอตั้งรหัส</span>
                          ) : (
                            <span className="text-teal-700 text-xs font-bold">ตั้งรหัสแล้ว</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-500">เข้าใช้งานล่าสุด</div>
                        <div className="text-xs font-bold text-slate-700 mt-1 truncate">
                          {lastLoginText ? new Date(lastLoginText).toLocaleDateString('th-TH') : 'ยังไม่เคย'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Buttons (Matching Branch Card Footer) */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDetailModal(user)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Eye className="w-4 h-4" />
                        <span>ดูรายละเอียด</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserForPerm(user);
                          setShowManualPermissionModal(true);
                        }}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-teal-700" />
                        <span>จัดการสิทธิ์</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-teal-700" />
                        <span>แก้ไข</span>
                      </button>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(user, isActive ? 'suspended' : 'active')}
                          disabled={isSubmitting}
                          className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isActive
                              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {isActive ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          <span>{isActive ? 'ระงับบัญชี' : 'เปิดใช้งาน'}</span>
                        </button>
                      )}

                      {/* More menu dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownUserId(isDropdownOpen ? null : user.id);
                          }}
                          className="min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isDropdownOpen && (
                          <div
                            className="absolute right-0 bottom-full mb-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 text-xs space-y-0.5 animate-fadeIn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isPendingPassword ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownUserId(null);
                                  handleSendInvite(user);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-amber-800 font-bold"
                              >
                                <Send className="w-3.5 h-3.5 text-amber-600" />
                                ส่งคำเชิญตั้งรหัสผ่าน
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownUserId(null);
                                  openResetPasswordModal(user);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-purple-800 font-bold"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                                รีเซ็ตรหัสผ่าน
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownUserId(null);
                                handleRevokeSession(user);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                            >
                              <LogOut className="w-3.5 h-3.5 text-slate-500" />
                              ยกเลิก Session
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownUserId(null);
                                handleViewAuditLogs(user);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500" />
                              ดูประวัติ (Audit Log)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* 6. PAGINATION CONTROLS (Matching Branches & Departments) */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-600">
                แสดง <strong>{(currentPage - 1) * pageSize + 1}</strong> ถึง{' '}
                <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> จากทั้งหมด{' '}
                <strong>{totalItems}</strong> รายการ
              </span>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">ต่อหน้า:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none"
                >
                  <option value={4}>4</option>
                  <option value={6}>6</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            {/* Page Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 font-bold text-xs transition-colors"
                title="หน้าก่อนหน้า"
              >
                ก่อนหน้า
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((pageNum, idx, arr) => {
                  const prev = arr[idx - 1];
                  const hasGap = prev && pageNum - prev > 1;
                  return (
                    <React.Fragment key={pageNum}>
                      {hasGap && <span className="px-1 text-slate-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#0b2545] text-white shadow-xs'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 font-bold text-xs transition-colors"
                title="หน้าถัดไป"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODALS & SUB-COMPONENTS */}
      {/* ========================================================================= */}

      {/* User Detail Page / Drawer Modal (6 Tabs) */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          authToken={authToken}
          actor={currentUser}
          showToast={showToast}
          branches={branches}
          departments={departments}
          onEditUser={(u) => {
            setShowDetailModal(false);
            openEditModal(u);
          }}
          onManagePermissions={(u) => {
            setShowDetailModal(false);
            setSelectedUserForPerm(u);
            setShowManualPermissionModal(true);
          }}
          onStatusChange={(u, newStat) => {
            handleUpdateStatus(u, newStat);
          }}
          onResetPassword={(u) => {
            openResetPasswordModal(u);
          }}
          onSendInvite={(u) => {
            handleSendInvite(u);
          }}
          onRevokeSession={(u) => {
            handleRevokeSession(u);
          }}
        />
      )}

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
                  <Edit className="w-5 h-5 text-teal-700" />
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
                      {branches.filter(b => b.status !== 'inactive').map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
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
                      {departments
                        .filter(d => d.status !== 'inactive' && (!d.branchId || d.branchId === editBranchId))
                        .map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
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
                    className="px-5 py-2 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-600 disabled:opacity-50"
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
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteResetPassword}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-600 disabled:opacity-50 text-xs"
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
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
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
                      className="px-3 py-1.5 bg-teal-700 text-white rounded-lg font-semibold shrink-0 hover:bg-teal-600 flex items-center gap-1 transition-colors"
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
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
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
                    <History className="w-5 h-5 text-teal-700" />
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
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
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
                        <span className="px-2 py-0.5 rounded font-bold bg-teal-50 text-teal-800 border border-teal-200 text-[10px]">
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
                  <UserPlus className="w-5 h-5 text-teal-700" />
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
                      {branches.filter(b => b.status !== 'inactive').map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
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
                      {departments
                        .filter(d => d.status !== 'inactive' && (!d.branchId || d.branchId === newBranchId))
                        .map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendInviteOnCreate}
                      onChange={(e) => setSendInviteOnCreate(e.target.checked)}
                      className="mt-0.5 rounded text-teal-700 focus:ring-teal-500"
                    />
                    <div className="text-[11px] text-slate-700">
                      <span className="font-bold text-teal-900">สร้างและแสดงลิงก์คำเชิญตั้งรหัสผ่านทันที</span>
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
                    className="px-5 py-2 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-600 disabled:opacity-50"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและสร้างบัญชี'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Role Management Modal */}
      {showRoleModal && (
        <RoleManagementModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          authToken={authToken}
          showToast={showToast}
          onRolesUpdated={() => {
            fetchRolesCount();
            fetchUsers();
          }}
        />
      )}

      {/* Manual Permission Matrix & Scope Modal */}
      {showManualPermissionModal && selectedUserForPerm && (
        <ManualPermissionModal
          isOpen={showManualPermissionModal}
          onClose={() => {
            setShowManualPermissionModal(false);
            setSelectedUserForPerm(null);
          }}
          user={selectedUserForPerm}
          authToken={authToken}
          actor={currentUser}
          showToast={showToast}
          onPermissionsSaved={() => {
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
