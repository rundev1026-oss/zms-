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
  Info,
  Sliders,
  UserX,
  Eye,
  MoreVertical,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { ModalPortal, lockBodyScroll, unlockBodyScroll } from '@/components/common/Modal';
import { RoleManagementModal } from './users/RoleManagementModal';
import { ManualPermissionModal } from './users/ManualPermissionModal';
import { UserDetailModal } from './users/UserDetailModal';

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
  const [rolesCount, setRolesCount] = useState<number>(7);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPasswordStatus, setSelectedPasswordStatus] = useState('all');
  const [selectedLastLoginFilter, setSelectedLastLoginFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

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
  }, [searchQuery, selectedRole, selectedBranch, selectedDept, selectedStatus, selectedPasswordStatus, selectedLastLoginFilter]);

  // Close card action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownUserId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter users by client-side criteria (e.g. Last Login and search fallback)
  const filteredUsers = useMemo(() => {
    return usersList.filter((user) => {
      // 1. Search filter: Name, Username, Email
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = (user.name || '').toLowerCase().includes(q) ||
          `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(q);
        const usernameMatch = ((user as any).username || '').toLowerCase().includes(q);
        const emailMatch = (user.email || '').toLowerCase().includes(q);
        const phoneMatch = (user.phone || '').includes(q);
        if (!nameMatch && !usernameMatch && !emailMatch && !phoneMatch) return false;
      }

      // 2. Role filter
      if (selectedRole !== 'all') {
        const uRole = (user.role || (user as any).primaryRoleCode || '').toLowerCase();
        if (uRole !== selectedRole.toLowerCase()) return false;
      }

      // 3. Branch filter
      if (selectedBranch !== 'all' && user.branchId !== selectedBranch) {
        return false;
      }

      // 4. Department filter
      if (selectedDept !== 'all' && user.departmentId !== selectedDept) {
        return false;
      }

      // 5. Status filter
      if (selectedStatus !== 'all') {
        const uStatus = user.status?.toLowerCase() || ((user as any).isActive ? 'active' : 'disabled');
        if (selectedStatus === 'active' && uStatus !== 'active') return false;
        if (selectedStatus === 'suspended' && uStatus !== 'suspended') return false;
        if (selectedStatus === 'disabled' && uStatus !== 'disabled' && uStatus !== 'inactive') return false;
      }

      // 6. Password Status filter
      if (selectedPasswordStatus !== 'all') {
        if (selectedPasswordStatus === 'pending_setup' && user.passwordSetupStatus !== 'pending_setup') return false;
        if (selectedPasswordStatus === 'completed' && user.passwordSetupStatus === 'pending_setup') return false;
      }

      // 7. Last Login filter
      if (selectedLastLoginFilter !== 'all') {
        const lastLoginDate = (user as any).lastLoginAt || user.lastLogin;
        if (selectedLastLoginFilter === 'never') {
          if (lastLoginDate) return false;
        } else if (selectedLastLoginFilter === '7days') {
          if (!lastLoginDate) return false;
          const diffDays = (Date.now() - new Date(lastLoginDate).getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (selectedLastLoginFilter === '30days') {
          if (!lastLoginDate) return false;
          const diffDays = (Date.now() - new Date(lastLoginDate).getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }
      }

      return true;
    });
  }, [usersList, searchQuery, selectedRole, selectedBranch, selectedDept, selectedStatus, selectedPasswordStatus, selectedLastLoginFilter]);

  // Pagination calculation
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedBranch('all');
    setSelectedDept('all');
    setSelectedStatus('all');
    setSelectedPasswordStatus('all');
    setSelectedLastLoginFilter('all');
    setCurrentPage(1);
    showToast('ล้างตัวกรองทั้งหมดแล้ว', 'info');
  };

  // Open Details Modal
  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

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

  const quickPersonaUsers = usersList.slice(0, 6);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* 1. Page Header (Modern Enterprise Design) */}
      <div className="bg-[#0B2545] text-white p-6 rounded-3xl border border-[#DFE7F0] shadow-md relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Subtle decorative glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#0D9488]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-60 -bottom-24 w-60 h-60 bg-[#00845A]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
              <Users className="w-6 h-6 text-[#0D9488]" />
              จัดการผู้ใช้งาน
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-teal-300 border border-teal-400/20 backdrop-blur-xs">
              Users Management
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0D9488] text-white">
              Super Admin Control
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            ระบบบริหารจัดการบุคลากร กำหนดบทบาท และควบคุมสิทธิ์การเข้าถึงข้อมูลรายบุคคล (Granular Overrides & Data Scope Control)
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="relative z-10 flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchUsers()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition-colors border border-white/15"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>

          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold transition-all shadow-xs backdrop-blur-xs"
            title="จัดการบทบาทและสิทธิ์ตั้งต้น"
          >
            <ShieldCheck className="w-4 h-4 text-teal-300" />
            จัดการ Role ({rolesCount})
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-[#0D9488] hover:bg-[#0b8075] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-950/40 border border-teal-400/30"
          >
            <UserPlus className="w-4 h-4" />
            + เพิ่มผู้ใช้งาน
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metrics Cards (Prompt Requirement 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Users */}
        <div className="bg-white p-4 rounded-2xl border border-[#DFE7F0] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ผู้ใช้งานทั้งหมด</div>
            <div className="text-2xl font-bold text-[#0B2545] mt-1">{totalCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">ในฐานข้อมูลระบบ ZMS</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#0B2545]/5 text-[#0B2545] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-white p-4 rounded-2xl border border-[#DFE7F0] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#00845A] uppercase tracking-wider">บัญชี Active</div>
            <div className="text-2xl font-bold text-[#00845A] mt-1">{activeCount}</div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">เปิดใช้งานปกติ</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00845A] flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Inactive Accounts */}
        <div className="bg-white p-4 rounded-2xl border border-[#DFE7F0] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">บัญชี Inactive</div>
            <div className="text-2xl font-bold text-slate-600 mt-1">{inactiveCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">ปิดใช้งานบัญชี</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        {/* Suspended Accounts */}
        <div className="bg-white p-4 rounded-2xl border border-[#DFE7F0] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">บัญชี Suspended</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{suspendedCount}</div>
            <div className="text-[10px] text-amber-600/80 mt-0.5">ระงับสิทธิ์ชั่วคราว</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Role Switcher for Test Personas */}
      <div className="bg-white p-4.5 rounded-2xl border border-[#DFE7F0] shadow-xs space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <LogIn className="w-4 h-4 text-[#0D9488]" />
            ทดสอบระบบตามบทบาท (Quick Persona Switcher)
          </h2>
          <span className="text-[11px] text-slate-400">สลับบทบาทเพื่อทดสอบมุมมองและขอบเขตสิทธิ์ของแต่ละฝ่าย</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {quickPersonaUsers.map((user) => {
            const isCurrent = currentUser?.id === user.id;
            const isPending = user.passwordSetupStatus === 'pending_setup';
            return (
              <button
                key={user.id}
                onClick={() => switchUserRole(user.role)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-teal-50 border-[#0D9488] ring-2 ring-teal-300/40 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                    isCurrent ? 'bg-[#0D9488] text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {user.name.slice(0, 2)}
                  </div>
                  {isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  ) : isPending ? (
                    <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                      รอรหัส
                    </span>
                  ) : null}
                </div>
                <div className="font-bold text-xs text-slate-900 truncate">{user.name}</div>
                <div className="text-[10px] text-teal-800 font-semibold truncate mt-0.5">
                  {user.roleTitleTh}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Comprehensive Filter Bar (Prompt Requirement 3) */}
      <div className="bg-white p-5 rounded-3xl border border-[#DFE7F0] shadow-xs space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545]">
            <Filter className="w-4 h-4 text-[#0D9488]" />
            ค้นหาและกรองข้อมูลบุคลากร (Search & Filters)
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              พบ <strong className="text-[#0B2545]">{filteredUsers.length}</strong> จากทั้งหมด {totalCount} บัญชี
            </span>
            <button
              onClick={handleClearFilters}
              className="text-xs text-[#0D9488] hover:text-[#0b8075] font-semibold hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              ล้างตัวกรอง
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Input: Name, Username, Email */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ–นามสกุล, Username (@...), หรือ Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0D9488] text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
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

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">ทุกสถานะบัญชี (All Status)</option>
              <option value="active">✓ ใช้งานปกติ (Active)</option>
              <option value="suspended">⚠️ ระงับการใช้งาน (Suspended)</option>
              <option value="disabled">✕ ปิดใช้งาน (Disabled / Inactive)</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">ทุกสาขา / สำนักงาน</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">ทุกแผนก / ฝ่ายงาน</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Last Login Filter */}
          <div>
            <select
              value={selectedLastLoginFilter}
              onChange={(e) => setSelectedLastLoginFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">การเข้าสู่ระบบทั้งหมด (All Logins)</option>
              <option value="7days">ภายใน 7 วันล่าสุด</option>
              <option value="30days">ภายใน 30 วันล่าสุด</option>
              <option value="never">ยังไม่เคยเข้าสู่ระบบ</option>
            </select>
          </div>

          {/* Password Status Filter */}
          <div>
            <select
              value={selectedPasswordStatus}
              onChange={(e) => setSelectedPasswordStatus(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-slate-700 font-medium"
            >
              <option value="all">สถานะรหัสผ่านทั้งหมด</option>
              <option value="pending_setup">⚠️ ยังไม่ตั้งรหัสผ่าน (Pending)</option>
              <option value="completed">✓ ตั้งรหัสผ่านแล้ว (Completed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Card-Based User Display Grid (Prompt Requirement 4) */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-[#DFE7F0] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0D9488]" />
            <span className="text-sm font-semibold text-slate-600">กำลังโหลดข้อมูลผู้ใช้งานระบบ...</span>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#DFE7F0] p-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <UserX className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขที่เลือก</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              ลองปรับเปลี่ยนคำค้นหา หรือคลิกปุ่มล้างตัวกรองเพื่อแสดงข้อมูลผู้ใช้ทั้งหมด
            </p>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-[#0D9488] text-white rounded-xl text-xs font-bold hover:bg-[#0b8075] transition-colors shadow-xs"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : isSuspended
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-800 border-rose-300';
              const statusBadgeText = isActive ? 'ใช้งานปกติ' : isSuspended ? 'ระงับชั่วคราว' : 'ปิดใช้งาน';

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
                'สำนักงานใหญ่';
              const deptName =
                user.departmentName ||
                departments.find((d) => d.id === user.departmentId)?.name ||
                'ส่วนกลาง';

              const lastLoginText = (user as any).lastLoginAt || user.lastLogin;
              const isDropdownOpen = activeDropdownUserId === user.id;

              return (
                <div
                  key={user.id}
                  className="bg-white rounded-3xl border border-[#DFE7F0] shadow-xs hover:shadow-md hover:border-[#0D9488]/40 transition-all duration-200 flex flex-col justify-between overflow-hidden relative group"
                >
                  {/* Top Bar Accent Line based on status */}
                  <div
                    className={`h-1 w-full ${
                      isActive ? 'bg-[#00845A]' : isSuspended ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  />

                  {/* Card Main Body */}
                  <div className="p-5 space-y-4">
                    {/* Header: Avatar, Name, Username, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0B2545] to-[#133e6f] text-white font-bold text-base flex items-center justify-center shadow-xs">
                            {userName.slice(0, 2).toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              isActive ? 'bg-emerald-500' : isSuspended ? 'bg-amber-500' : 'bg-slate-400'
                            }`}
                          />
                        </div>

                        {/* Name & Username */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-sm truncate max-w-[150px] sm:max-w-[180px]">
                              {userName}
                            </h3>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-800">
                                (คุณ)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#0D9488] font-semibold truncate">
                            @{username}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusBadgeColor}`}>
                        {statusBadgeText}
                      </span>
                    </div>

                    {/* Email and Phone Contact Row */}
                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between gap-1 font-mono text-[11px]">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                        <button
                          onClick={() => copyToClipboard(user.email)}
                          className="text-slate-400 hover:text-slate-700 shrink-0"
                          title="คัดลอกอีเมล"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{user.phone || '-'}</span>
                      </div>
                    </div>

                    {/* Organization and Position Information */}
                    <div className="space-y-2 text-xs">
                      {/* Role and Position */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadgeColor}`}>
                          {user.roleTitleTh || user.role}
                        </span>
                        <span className="text-[11px] text-slate-600 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">
                            {(user as any).position || 'เจ้าหน้าที่ฝ่าย'}
                          </span>
                        </span>
                      </div>

                      {/* Branch & Department */}
                      <div className="space-y-1 text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-700 truncate">{branchName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-500 truncate">{deptName}</span>
                        </div>
                      </div>

                      {/* Permission Type & Data Scope Pill */}
                      <div className="pt-1 flex items-center justify-between gap-1 flex-wrap text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-[#0B2545]/5 text-[#0B2545] font-mono font-bold border border-[#0B2545]/10">
                          Scope: {dataScope}
                        </span>

                        {overridesCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                            สิทธิ์พิเศษ (+{overridesCount})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            สิทธิ์ตามบทบาท
                          </span>
                        )}
                      </div>

                      {/* Security & Login row */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded font-semibold ${
                              is2FA
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            2FA: {is2FA ? 'เปิด' : 'ปิด'}
                          </span>

                          {isPendingPassword ? (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800">
                              รอตั้งรหัส
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-500">
                              รหัสผ่านแล้ว
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {lastLoginText ? (
                              new Date(lastLoginText).toLocaleDateString('th-TH')
                            ) : (
                              'ยังไม่เคยเข้าใช้'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Card Actions Toolbar (Prompt Requirement 4) */}
                  <div className="p-3 bg-[#F4F7FB] border-t border-[#DFE7F0] flex items-center justify-between gap-1.5">
                    {/* Primary Action Button: "ดูรายละเอียด" */}
                    <button
                      onClick={() => openDetailModal(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#0D9488] hover:bg-[#0b8075] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      title="ดูรายละเอียดข้อมูลเชิงลึกของผู้ใช้งาน"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      ดูรายละเอียด
                    </button>

                    {/* Manage Permissions */}
                    <button
                      onClick={() => {
                        setSelectedUserForPerm(user);
                        setShowManualPermissionModal(true);
                      }}
                      className="flex items-center justify-center gap-1 py-2 px-2.5 bg-white hover:bg-slate-100 text-[#0B2545] border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
                      title="กำหนดสิทธิ์เฉพาะบุคคล (Manual Permission Control)"
                    >
                      <Key className="w-3.5 h-3.5 text-[#0D9488]" />
                      สิทธิ์
                    </button>

                    {/* Edit User */}
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
                      title="แก้ไขข้อมูลผู้ใช้งาน"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-600" />
                    </button>

                    {/* Suspend / Activate Toggle */}
                    {!isSelf && (
                      <button
                        onClick={() => handleUpdateStatus(user, isActive ? 'suspended' : 'active')}
                        disabled={isSubmitting}
                        className={`p-2 border rounded-xl text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                        title={isActive ? 'ระงับบัญชีชั่วคราว' : 'เปิดใช้งานบัญชี'}
                      >
                        {isActive ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* More Menu Dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownUserId(isDropdownOpen ? null : user.id);
                        }}
                        className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs transition-colors"
                        title="เมนูเพิ่มเติม"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isDropdownOpen && (
                        <div
                          className="absolute right-0 bottom-full mb-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-20 text-xs animate-fadeIn space-y-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isPendingPassword ? (
                            <button
                              onClick={() => {
                                setActiveDropdownUserId(null);
                                handleSendInvite(user);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-amber-800 font-semibold"
                            >
                              <Send className="w-3.5 h-3.5 text-amber-600" />
                              ส่งคำเชิญตั้งรหัสผ่าน
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveDropdownUserId(null);
                                openResetPasswordModal(user);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-purple-800 font-semibold"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                              รีเซ็ตรหัสผ่าน
                            </button>
                          )}

                          <button
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
              );
            })}
          </div>
        )}

        {/* 6. Pagination Controls */}
        {totalItems > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-[#DFE7F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-500">
                แสดง <strong>{(currentPage - 1) * pageSize + 1}</strong> ถึง{' '}
                <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> จากทั้งหมด{' '}
                <strong>{totalItems}</strong> รายการ
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">ต่อหน้า:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-hidden"
                >
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                </select>
              </div>
            </div>

            {/* Page Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
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
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#0D9488] text-white shadow-xs'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors"
                title="หน้าถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
                  <Edit className="w-5 h-5 text-[#0D9488]" />
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
                      สาขา / สำนักงาน (เฉพาะที่เปิดใช้งาน) <span className="text-rose-500">*</span>
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
                      แผนก / ฝ่าย (เฉพาะที่เปิดใช้งาน) <span className="text-rose-500">*</span>
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
                    className="px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0b8075] text-white font-bold disabled:opacity-50 transition-colors"
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
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
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
                      className="px-3 py-1.5 bg-[#0D9488] hover:bg-[#0b8075] text-white rounded-lg font-semibold shrink-0 flex items-center gap-1 transition-colors"
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
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
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
                    <History className="w-5 h-5 text-[#0D9488]" />
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
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0D9488]" />
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
                  <UserPlus className="w-5 h-5 text-[#0D9488]" />
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
                      สาขา / สำนักงาน (เฉพาะที่เปิดใช้งาน) <span className="text-rose-500">*</span>
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
                      แผนก / ฝ่าย (เฉพาะที่เปิดใช้งาน) <span className="text-rose-500">*</span>
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
                      className="mt-0.5 rounded text-[#0D9488] focus:ring-[#0D9488]"
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
                    className="px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0b8075] text-white font-bold disabled:opacity-50 transition-colors"
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
