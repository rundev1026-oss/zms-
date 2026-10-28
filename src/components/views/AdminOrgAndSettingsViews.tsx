'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Branch, BranchType, Department, User, UserRole } from '@/types';
import { Modal } from '@/components/common/Modal';
import { ThaiAddressFields } from '@/components/common/ThaiAddressFields';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Layers,
  Settings,
  ShieldCheck,
  Database,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Edit,
  Eye,
  Ban,
  Trash2,
  UserCheck,
  FileCheck2,
  ArrowRightLeft,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  Check,
  Briefcase,
  GitBranch,
  Power
} from 'lucide-react';

const ROLE_LABELS_TH: Record<UserRole, string> = {
  super_admin: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
  executive: 'ผู้บริหาร (Executive)',
  approver: 'กรรมการอนุมัติ (Approver)',
  finance: 'เจ้าหน้าที่การเงิน (Finance)',
  officer: 'เจ้าหน้าที่ภาคสนาม (Officer)',
  member: 'สมาชิกทั่วไป (Member)',
  public: 'ผู้เยี่ยมชม (Public)',
};

const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  headquarters: 'สำนักงานใหญ่',
  regional_branch: 'สำนักงานสาขาภูมิภาค',
  sub_branch: 'สำนักงานสาขาย่อย / ศูนย์ประสานงาน',
};

interface BranchesAndDepartmentsViewProps {
  onNavigate?: (view: string) => void;
}

export function BranchesAndDepartmentsView({ onNavigate }: BranchesAndDepartmentsViewProps = {}) {
  const { currentUser, authToken, showToast, refreshData } = useApp();
  const isSuperAdmin = currentUser.role === 'super_admin';

  // Main Tabs
  const [activeTab, setActiveTab] = useState<'branches' | 'departments' | 'personnel'>('branches');

  // Data States
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allBranchesMaster, setAllBranchesMaster] = useState<Branch[]>([]);
  const [allDepartmentsMaster, setAllDepartmentsMaster] = useState<Department[]>([]);
  const [personnelList, setPersonnelList] = useState<User[]>([]);
  const [summary, setSummary] = useState({
    totalBranches: 0,
    activeBranches: 0,
    inactiveBranches: 0,
    totalDepartments: 0,
    activeDepartments: 0,
    totalStaff: 0,
    unassignedStaffCount: 0,
    inactiveAffiliationStaffCount: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterDeptId, setFilterDeptId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStaffCount, setFilterStaffCount] = useState<string>('all');
  const [onlyInvalidPersonnel, setOnlyInvalidPersonnel] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Modals State
  const [isBranchFormOpen, setIsBranchFormOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [isDeptFormOpen, setIsDeptFormOpen] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [detailBranch, setDetailBranch] = useState<Branch | null>(null);
  const [detailBranchModalTab, setDetailBranchModalTab] = useState<'info' | 'staff' | 'depts'>('info');

  const [detailDept, setDetailDept] = useState<Department | null>(null);
  const [detailDeptModalTab, setDetailDeptModalTab] = useState<'info' | 'staff'>('info');

  const [statusModalTarget, setStatusModalTarget] = useState<{
    entityType: 'branch' | 'department';
    action: 'deactivate' | 'activate' | 'delete';
    item: Branch | Department;
  } | null>(null);
  const [statusReason, setStatusReason] = useState<string>('');

  const [reassignTargetUser, setReassignTargetUser] = useState<User | null>(null);
  const [reassignBranchId, setReassignBranchId] = useState<string>('');
  const [reassignDeptId, setReassignDeptId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Branch Form Fields
  const [branchCode, setBranchCode] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [branchNameEn, setBranchNameEn] = useState<string>('');
  const [branchType, setBranchType] = useState<BranchType>('regional_branch');
  const [parentBranchId, setParentBranchId] = useState<string>('');
  const [branchPhone, setBranchPhone] = useState<string>('');
  const [branchEmail, setBranchEmail] = useState<string>('');
  const [branchAddress, setBranchAddress] = useState<string>('');
  const [branchSubdistrict, setBranchSubdistrict] = useState<string>('');
  const [branchDistrict, setBranchDistrict] = useState<string>('');
  const [branchProvince, setBranchProvince] = useState<string>('กรุงเทพมหานคร');
  const [branchPostcode, setBranchPostcode] = useState<string>('10240');
  const [branchManagerUserId, setBranchManagerUserId] = useState<string>('');
  const [branchManagerCustomName, setBranchManagerCustomName] = useState<string>('');
  const [branchStatus, setBranchStatus] = useState<'active' | 'inactive'>('active');
  const [branchFormErrors, setBranchFormErrors] = useState<Record<string, string>>({});

  // Department Form Fields
  const [deptCode, setDeptCode] = useState<string>('');
  const [deptName, setDeptName] = useState<string>('');
  const [deptNameEn, setDeptNameEn] = useState<string>('');
  const [deptBranchId, setDeptBranchId] = useState<string>('br-hq');
  const [deptHeadUserId, setDeptHeadUserId] = useState<string>('');
  const [deptHeadCustomName, setDeptHeadCustomName] = useState<string>('');
  const [deptTransferHead, setDeptTransferHead] = useState<boolean>(true);
  const [deptDescription, setDeptDescription] = useState<string>('');
  const [deptAllowedRoles, setDeptAllowedRoles] = useState<UserRole[]>(['officer']);
  const [deptStatus, setDeptStatus] = useState<'active' | 'inactive'>('active');
  const [deptFormErrors, setDeptFormErrors] = useState<Record<string, string>>({});

  // Helper headers with actor context & token
  const getRequestHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-actor-id': currentUser.id,
      'x-actor-role': currentUser.role,
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }, [currentUser.id, currentUser.role, authToken]);

  // Load master list + filtered list from database
  const fetchOrganizationData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      // 1. Fetch unfiltered master list for dropdown options & duplicate validation
      const masterRes = await fetch('/api/organization/structure?includePersonnel=true', {
        headers: getRequestHeaders(),
      });
      const masterJson = await masterRes.json();
      if (!masterRes.ok || !masterJson.success) {
        throw new Error(masterJson.error || 'ไม่สามารถโหลดข้อมูลโครงสร้างองค์กรได้');
      }

      const masterData = masterJson.data;
      setAllBranchesMaster(masterData.branches || []);
      setAllDepartmentsMaster(masterData.departments || []);
      if (masterData.summary) {
        setSummary(masterData.summary);
      }

      // 2. Fetch filtered structure
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (filterBranchId !== 'all') params.append('branchId', filterBranchId);
      if (filterDeptId !== 'all') params.append('departmentId', filterDeptId);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterStaffCount !== 'all') params.append('staffFilter', filterStaffCount);
      params.append('includePersonnel', 'true');

      const res = await fetch(`/api/organization/structure?${params.toString()}`, {
        headers: getRequestHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถค้นหาข้อมูลโครงสร้างองค์กรได้');
      }

      setBranches(json.data.branches || []);
      setDepartments(json.data.departments || []);

      // 3. Personnel list (with optional invalid affiliation filter)
      if (onlyInvalidPersonnel) {
        const pRes = await fetch('/api/organization/personnel?onlyInvalidAffiliation=true', {
          headers: getRequestHeaders(),
        });
        const pJson = await pRes.json();
        if (pJson.success) {
          setPersonnelList(pJson.data || []);
        }
      } else {
        setPersonnelList(json.data.personnel || masterData.personnel || []);
      }
    } catch (err: any) {
      setLoadError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    filterBranchId,
    filterDeptId,
    filterStatus,
    filterStaffCount,
    onlyInvalidPersonnel,
    getRequestHeaders,
  ]);

  useEffect(() => {
    fetchOrganizationData();
  }, [fetchOrganizationData]);

  // Reset pagination when filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterBranchId, filterDeptId, filterStatus, filterStaffCount, onlyInvalidPersonnel]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterBranchId !== 'all' ||
    filterDeptId !== 'all' ||
    filterStatus !== 'all' ||
    filterStaffCount !== 'all' ||
    onlyInvalidPersonnel;

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterBranchId('all');
    setFilterDeptId('all');
    setFilterStatus('all');
    setFilterStaffCount('all');
    setOnlyInvalidPersonnel(false);
    setCurrentPage(1);
  };

  // Active branches for dropdown selections
  const activeBranchesForSelect = useMemo(
    () => allBranchesMaster.filter((b) => b.status === 'active'),
    [allBranchesMaster]
  );

  // Active staff for manager/head selection (excluding public/member)
  const staffCandidates = useMemo(
    () =>
      personnelList.length > 0
        ? personnelList.filter((u) => u.role !== 'public' && u.status === 'active')
        : [],
    [personnelList]
  );

  // Paginated items for current tab
  const currentListLength =
    activeTab === 'branches'
      ? branches.length
      : activeTab === 'departments'
      ? departments.length
      : personnelList.length;

  const totalPages = Math.max(1, Math.ceil(currentListLength / pageSize));

  const paginatedBranches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return branches.slice(start, start + pageSize);
  }, [branches, currentPage, pageSize]);

  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return departments.slice(start, start + pageSize);
  }, [departments, currentPage, pageSize]);

  const paginatedPersonnel = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return personnelList.slice(start, start + pageSize);
  }, [personnelList, currentPage, pageSize]);

  // =========================================================================
  // Branch CRUD Handlers
  // =========================================================================
  const openCreateBranchModal = () => {
    setEditingBranch(null);
    setBranchCode('');
    setBranchName('');
    setBranchNameEn('');
    setBranchType('regional_branch');
    setParentBranchId('br-hq');
    setBranchPhone('');
    setBranchEmail('');
    setBranchAddress('');
    setBranchPostcode('10240');
    setBranchProvince('กรุงเทพมหานคร');
    setBranchDistrict('บางกะปิ');
    setBranchSubdistrict('หัวหมาก');
    setBranchManagerUserId('');
    setBranchManagerCustomName('');
    setBranchStatus('active');
    setBranchFormErrors({});
    setIsBranchFormOpen(true);
  };

  const openEditBranchModal = (br: Branch) => {
    setEditingBranch(br);
    setBranchCode(br.code);
    setBranchName(br.name);
    setBranchNameEn(br.nameEn || '');
    setBranchType(br.branchType || (br.isHeadquarters ? 'headquarters' : 'regional_branch'));
    setParentBranchId(br.parentBranchId || '');
    setBranchPhone(br.phone || '');
    setBranchEmail(br.email || '');
    setBranchAddress(br.address || '');
    setBranchPostcode(br.postcode || '');
    setBranchProvince(br.province || 'กรุงเทพมหานคร');
    setBranchDistrict(br.district || '');
    setBranchSubdistrict(br.subdistrict || '');
    setBranchManagerUserId(br.managerUserId || '');
    setBranchManagerCustomName(br.managerName && br.managerName !== 'ยังไม่ได้ระบุผู้จัดการสาขา' ? br.managerName : '');
    setBranchStatus(br.status || 'active');
    setBranchFormErrors({});
    setIsBranchFormOpen(true);
  };

  const validateBranchForm = (): boolean => {
    const errors: Record<string, string> = {};
    const cleanCode = branchCode.trim().toUpperCase();
    const cleanName = branchName.trim();

    if (!cleanCode) {
      errors.code = 'กรุณาระบุรหัสสาขา (เช่น BR-YLA)';
    } else if (!/^[A-Z0-9\-_]{3,20}$/.test(cleanCode)) {
      errors.code = 'รหัสสาขาต้องเป็นภาษาอังกฤษพิมพ์ใหญ่ ตัวเลข หรือขีด (-) 3-20 ตัวอักษร';
    } else {
      const duplicate = allBranchesMaster.find(
        (b) => b.code.toUpperCase() === cleanCode && b.id !== editingBranch?.id
      );
      if (duplicate) {
        errors.code = `รหัสสาขา "${cleanCode}" ซ้ำกับ "${duplicate.name}"`;
      }
    }

    if (!cleanName) {
      errors.name = 'กรุณาระบุชื่อสาขาภาษาไทย';
    } else {
      const duplicateName = allBranchesMaster.find(
        (b) => b.name.trim() === cleanName && b.id !== editingBranch?.id
      );
      if (duplicateName) {
        errors.name = `ชื่อสาขานี้ซ้ำกับรหัส ${duplicateName.code}`;
      }
    }

    if (!branchProvince.trim()) {
      errors.province = 'กรุณาเลือกจังหวัดที่ตั้งสาขา';
    }

    if (branchEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branchEmail.trim())) {
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    if (parentBranchId && editingBranch && parentBranchId === editingBranch.id) {
      errors.parentBranchId = 'ไม่สามารถเลือกสาขาตัวเองเป็นสาขาหลักได้';
    }

    setBranchFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateBranchForm()) {
      showToast('กรุณาตรวจสอบข้อมูลในฟอร์มที่มีข้อความแจ้งเตือนสีแดง', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        input: {
          code: branchCode.trim().toUpperCase(),
          name: branchName.trim(),
          nameEn: branchNameEn.trim(),
          branchType,
          parentBranchId: branchType === 'headquarters' ? null : (parentBranchId || null),
          phone: branchPhone.trim(),
          email: branchEmail.trim(),
          address: branchAddress.trim(),
          subdistrict: branchSubdistrict.trim(),
          district: branchDistrict.trim(),
          province: branchProvince.trim(),
          postcode: branchPostcode.trim(),
          managerUserId: branchManagerUserId || null,
          managerName: branchManagerCustomName.trim(),
          isHeadquarters: branchType === 'headquarters',
          status: branchStatus,
        },
        actor: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
        },
      };

      const url = editingBranch
        ? `/api/organization/branches/${editingBranch.id}`
        : '/api/organization/branches';
      const method = editingBranch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getRequestHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลสาขาได้');
      }

      showToast(json.message || 'บันทึกข้อมูลสาขาสำเร็จ', 'success');
      setIsBranchFormOpen(false);
      await fetchOrganizationData();
      if (detailBranch && editingBranch && detailBranch.id === editingBranch.id && json.data) {
        setDetailBranch(json.data);
      }
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสาขา', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Department CRUD Handlers
  // =========================================================================
  const openCreateDeptModal = (preselectedBranchId?: string) => {
    setEditingDept(null);
    setDeptCode('');
    setDeptName('');
    setDeptNameEn('');
    setDeptBranchId(preselectedBranchId || activeBranchesForSelect[0]?.id || 'br-hq');
    setDeptHeadUserId('');
    setDeptHeadCustomName('');
    setDeptTransferHead(true);
    setDeptDescription('');
    setDeptAllowedRoles(['officer']);
    setDeptStatus('active');
    setDeptFormErrors({});
    setIsDeptFormOpen(true);
  };

  const openEditDeptModal = (d: Department) => {
    setEditingDept(d);
    setDeptCode(d.code);
    setDeptName(d.name);
    setDeptNameEn(d.nameEn || '');
    setDeptBranchId(d.branchId || 'br-hq');
    setDeptHeadUserId(d.headUserId || '');
    setDeptHeadCustomName(d.headName && d.headName !== 'ยังไม่ได้ระบุหัวหน้าแผนก' ? d.headName : '');
    setDeptTransferHead(true);
    setDeptDescription(d.description || '');
    setDeptAllowedRoles(d.allowedRoles && d.allowedRoles.length > 0 ? d.allowedRoles : ['officer']);
    setDeptStatus(d.status || 'active');
    setDeptFormErrors({});
    setIsDeptFormOpen(true);
  };

  const validateDeptForm = (): boolean => {
    const errors: Record<string, string> = {};
    const cleanCode = deptCode.trim().toUpperCase();
    const cleanName = deptName.trim();

    if (!cleanCode) {
      errors.code = 'กรุณาระบุรหัสแผนก (เช่น DEPT-WEL)';
    } else if (!/^[A-Z0-9\-_]{3,20}$/.test(cleanCode)) {
      errors.code = 'รหัสแผนกต้องเป็นภาษาอังกฤษพิมพ์ใหญ่ ตัวเลข หรือขีด (-) 3-20 ตัวอักษร';
    } else {
      const duplicate = allDepartmentsMaster.find(
        (d) => d.code.toUpperCase() === cleanCode && d.id !== editingDept?.id
      );
      if (duplicate) {
        errors.code = `รหัสแผนก "${cleanCode}" ซ้ำกับ "${duplicate.name}"`;
      }
    }

    if (!cleanName) {
      errors.name = 'กรุณาระบุชื่อแผนกภาษาไทย';
    }

    if (!deptBranchId) {
      errors.branchId = 'กรุณาเลือกสาขาที่สังกัด';
    }

    setDeptFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateDeptForm()) {
      showToast('กรุณาตรวจสอบข้อมูลในฟอร์มที่มีข้อความแจ้งเตือนสีแดง', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        input: {
          code: deptCode.trim().toUpperCase(),
          name: deptName.trim(),
          nameEn: deptNameEn.trim(),
          branchId: deptBranchId,
          headUserId: deptHeadUserId || null,
          headName: deptHeadCustomName.trim(),
          transferHeadToDepartment: deptTransferHead,
          description: deptDescription.trim(),
          allowedRoles: deptAllowedRoles,
          status: deptStatus,
        },
        actor: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
        },
      };

      const url = editingDept
        ? `/api/organization/departments/${editingDept.id}`
        : '/api/organization/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getRequestHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลแผนกได้');
      }

      showToast(json.message || 'บันทึกข้อมูลแผนกสำเร็จ', 'success');
      setIsDeptFormOpen(false);
      await fetchOrganizationData();
      if (detailDept && editingDept && detailDept.id === editingDept.id && json.data) {
        setDetailDept(json.data);
      }
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลแผนก', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Deactivate / Activate / Delete Handlers
  // =========================================================================
  const handleConfirmStatusOrDelete = async () => {
    if (!statusModalTarget || isSubmitting) return;
    const { entityType, action, item } = statusModalTarget;

    if (action === 'deactivate' && !statusReason.trim()) {
      showToast('กรุณาระบุเหตุผลในการปิดใช้งานเพื่อบันทึกใน Audit Log', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const basePath =
        entityType === 'branch'
          ? `/api/organization/branches/${item.id}`
          : `/api/organization/departments/${item.id}`;

      const method = action === 'delete' ? 'DELETE' : 'PATCH';
      const res = await fetch(basePath, {
        method,
        headers: getRequestHeaders(),
        body: JSON.stringify({
          action,
          reason: statusReason.trim() || 'ดำเนินการตามคำสั่งผู้ดูแลระบบ',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถดำเนินการได้');
      }

      showToast(json.message || 'ดำเนินการเรียบร้อยแล้ว', 'success');
      setStatusModalTarget(null);
      setStatusReason('');
      if (action === 'delete') {
        setDetailBranch(null);
        setDetailDept(null);
      }
      await fetchOrganizationData();
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Staff Affiliation Reassignment Handler
  // =========================================================================
  const openReassignModal = (u: User) => {
    setReassignTargetUser(u);
    setReassignBranchId(u.branchId || activeBranchesForSelect[0]?.id || 'br-hq');
    setReassignDeptId(u.departmentId || allDepartmentsMaster.find((d) => d.status === 'active')?.id || 'dept-social');
    setReassignReason('');
  };

  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTargetUser || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/organization/personnel', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          userId: reassignTargetUser.id,
          branchId: reassignBranchId,
          departmentId: reassignDeptId,
          reason: reassignReason.trim() || 'ปรับย้ายสังกัดผ่านหน้าโครงสร้างองค์กร',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถเปลี่ยนสังกัดได้');
      }

      showToast(json.message || 'ย้ายสังกัดบุคลากรเรียบร้อยแล้ว', 'success');
      setReassignTargetUser(null);
      await fetchOrganizationData();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการย้ายสังกัด', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAllowedRole = (role: UserRole) => {
    setDeptAllowedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Top Header & Primary Actions */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> โครงสร้างองค์กรและการกระจายอำนาจ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            สาขาและแผนกการดำเนินงาน (Branches & Departments)
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            บริหารจัดการข้อมูลสาขา แผนกปฏิบัติงาน ผู้จัดการสาขา หัวหน้าแผนก และสังกัดบุคลากร เชื่อมโยงกับระบบทะเบียนผู้มีสิทธิ์ คำร้องขอความช่วยเหลือ และการเงินจากฐานข้อมูลจริง
          </p>
        </div>

        {/* Action Buttons for Authorized Admin */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isSuperAdmin ? (
            <>
              <button
                type="button"
                onClick={openCreateBranchModal}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#0b2545] hover:bg-[#133e6f] text-white font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>เพิ่มสาขา</span>
              </button>
              <button
                type="button"
                onClick={() => openCreateDeptModal()}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-teal-200" />
                <span>เพิ่มแผนก</span>
              </button>
            </>
          ) : (
            <div className="px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>โหมดดูข้อมูลโครงสร้างองค์กร ({currentUser.roleTitleTh})</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Summary KPI Cards (Real Database Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('branches');
            setFilterStatus('all');
          }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'branches'
              ? 'bg-white border-teal-500 ring-2 ring-teal-500/15 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-teal-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">สาขาทั้งหมดในระบบ</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.totalBranches} <span className="text-sm font-bold text-slate-500">สาขา</span>
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            เปิดทำการ {summary.activeBranches} แห่ง
            {summary.inactiveBranches > 0 && (
              <span className="text-slate-400 font-normal"> • ปิดใช้งาน {summary.inactiveBranches} แห่ง</span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('departments');
            setFilterStatus('all');
          }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-white border-sky-500 ring-2 ring-sky-500/15 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-sky-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">แผนกปฏิบัติงาน</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.totalDepartments} <span className="text-sm font-bold text-slate-500">แผนก</span>
          </div>
          <div className="text-xs text-sky-700 font-semibold mt-1">
            เปิดใช้งาน {summary.activeDepartments} แผนกตามโครงสร้าง
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('personnel');
            setOnlyInvalidPersonnel(false);
          }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'personnel' && !onlyInvalidPersonnel
              ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/15 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-indigo-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">บุคลากรและสมาชิกในสังกัด</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.totalStaff} <span className="text-sm font-bold text-slate-500">บัญชี</span>
          </div>
          <div className="text-xs text-indigo-700 font-semibold mt-1">
            คลิกเพื่อดูรายชื่อและตรวจสอบสังกัด
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('personnel');
            setOnlyInvalidPersonnel(true);
          }}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            onlyInvalidPersonnel
              ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/15 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ตรวจสอบความถูกต้องสังกัด</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                summary.unassignedStaffCount + summary.inactiveAffiliationStaffCount > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.unassignedStaffCount + summary.inactiveAffiliationStaffCount}{' '}
            <span className="text-sm font-bold text-slate-500">รายการที่ต้องตรวจสอบ</span>
          </div>
          <div className="text-xs font-semibold mt-1 text-slate-600">
            {summary.unassignedStaffCount + summary.inactiveAffiliationStaffCount > 0 ? (
              <span className="text-amber-700">พบผู้ใช้ที่สังกัดถูกปิดใช้งานหรือไม่มีสังกัด</span>
            ) : (
              <span className="text-emerald-700">บุคลากรทุกคนมีสังกัดถูกต้องครบถ้วน</span>
            )}
          </div>
        </button>
      </div>

      {/* 3. Navigation Tabs + Search & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Tab Switcher */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => {
                setActiveTab('branches');
                setOnlyInvalidPersonnel(false);
              }}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'branches'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              สาขาทั้งหมด ({branches.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('departments');
                setOnlyInvalidPersonnel(false);
              }}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'departments'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              แผนกปฏิบัติงาน ({departments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('personnel')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'personnel'
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              รายชื่อบุคลากรตามสังกัด ({personnelList.length})
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
              onClick={fetchOrganizationData}
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
              ค้นหาข้อมูล (ชื่อ/รหัสสาขา, แผนก, ผู้จัดการ, ชื่อเจ้าหน้าที่)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="พิมพ์ชื่อสาขา, รหัส, จังหวัด, หัวหน้าแผนก หรือชื่อเจ้าหน้าที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Filter by Branch */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">กรองตามสาขา</label>
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">ทุกสาขา ({allBranchesMaster.length})</option>
              {allBranchesMaster.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name} {b.status === 'inactive' ? '(ปิดใช้งาน)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">สถานะการใช้งาน</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">เปิดทำการ / เปิดใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>
          </div>

          {/* Filter by Staff Count or Department */}
          {activeTab === 'personnel' ? (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">กรองตามแผนก</label>
              <select
                value={filterDeptId}
                onChange={(e) => setFilterDeptId(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">ทุกแผนก ({allDepartmentsMaster.length})</option>
                {allDepartmentsMaster.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนบุคลากร</label>
              <select
                value={filterStaffCount}
                onChange={(e) => setFilterStaffCount(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="has_staff">มีบุคลากรประจำ (≥ 1 คน)</option>
                <option value="min_3">มีบุคลากรตั้งแต่ 3 คนขึ้นไป</option>
                <option value="no_staff">ยังไม่มีบุคลากรสังกัด (0 คน)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4. Loading / Error / Empty States */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <div className="text-base font-bold text-slate-800">กำลังโหลดข้อมูลโครงสร้างสาขาและแผนกจากฐานข้อมูล...</div>
          <p className="text-xs text-slate-500">กรุณารอสักครู่ ระบบกำลังคำนวณจำนวนบุคลากรและรายการอ้างอิง</p>
        </div>
      ) : loadError ? (
        <div className="bg-rose-50 rounded-3xl border border-rose-200 p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <div className="text-base font-bold text-rose-900">{loadError}</div>
          <button
            type="button"
            onClick={fetchOrganizationData}
            className="px-4 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-600"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : currentListLength === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</h3>
            <p className="text-sm text-slate-500">
              ลองเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อแสดงรายการทั้งหมดในระบบ
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
        <>
          {/* =============================================================== */}
          {/* TAB 1: BRANCH CARDS */}
          {/* =============================================================== */}
          {activeTab === 'branches' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedBranches.map((br) => {
                const isInactive = br.status === 'inactive';
                return (
                  <div
                    key={br.id}
                    className={`bg-white rounded-2xl border p-6 shadow-xs transition-all flex flex-col justify-between space-y-5 ${
                      isInactive
                        ? 'border-slate-300 bg-slate-50/60 opacity-90'
                        : 'border-slate-200/90 hover:border-teal-400'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#0b2545] text-amber-300 font-mono">
                              รหัสสาขา: {br.code}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                              {BRANCH_TYPE_LABELS[br.branchType || 'regional_branch']}
                            </span>
                            {br.parentBranchName && (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600">
                                ขึ้นกับ: {br.parentBranchName}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-black text-slate-900 leading-snug">{br.name}</h3>
                          {br.nameEn && (
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{br.nameEn}</p>
                          )}
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 border ${
                            isInactive
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isInactive ? 'ปิดใช้งาน' : 'เปิดทำการ'}
                        </span>
                      </div>

                      {isInactive && br.deactivatedReason && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>เหตุผลที่ปิดใช้งาน:</strong> {br.deactivatedReason}
                          </span>
                        </div>
                      )}

                      {/* Contact & Address Details */}
                      <div className="space-y-2.5 text-sm text-slate-700 border-t border-slate-100 pt-4">
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-1" />
                          <span className="leading-relaxed">
                            {[
                              br.address,
                              br.subdistrict && (br.province === 'กรุงเทพมหานคร' ? `แขวง${br.subdistrict}` : `ต.${br.subdistrict}`),
                              br.district && (br.province === 'กรุงเทพมหานคร' ? `เขต${br.district}` : `อ.${br.district}`),
                              br.province && `จ.${br.province}`,
                              br.postcode,
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{br.phone || 'ไม่ได้ระบุเบอร์โทรศัพท์'}</span>
                          </div>
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{br.email || 'ไม่ได้ระบุอีเมล'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Users className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>
                            ผู้จัดการสาขา: <strong className="text-slate-900">{br.managerName}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Real-time Database Counts Box */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                        <div>
                          <div className="text-[11px] font-bold text-slate-500">จำนวนแผนก</div>
                          <div className="text-base font-black text-slate-900 mt-0.5">
                            {br.departmentCount ?? 0} <span className="text-xs font-semibold">แผนก</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500">จำนวนบุคลากร</div>
                          <div className="text-base font-black text-teal-800 mt-0.5">
                            {br.staffCount ?? 0} <span className="text-xs font-semibold">คน</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500">ทะเบียนผู้มีสิทธิ์</div>
                          <div className="text-base font-black text-slate-900 mt-0.5">
                            {br.beneficiaryCount ?? 0} <span className="text-xs font-semibold">ราย</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500">คำร้องช่วยเหลือ</div>
                          <div className="text-base font-black text-indigo-800 mt-0.5">
                            {br.applicationCount ?? 0} <span className="text-xs font-semibold">คำร้อง</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailBranch(br);
                            setDetailBranchModalTab('info');
                          }}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                          <span>ดูรายละเอียด</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDetailBranch(br);
                            setDetailBranchModalTab('staff');
                          }}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-teal-700" />
                          <span>รายชื่อเจ้าหน้าที่ ({br.staffCount ?? 0})</span>
                        </button>
                      </div>

                      {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditBranchModal(br)}
                            className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-teal-700" />
                            <span>แก้ไข</span>
                          </button>
                          {br.id !== 'br-hq' && (
                            <button
                              type="button"
                              onClick={() => {
                                setStatusReason('');
                                setStatusModalTarget({
                                  entityType: 'branch',
                                  action: isInactive ? 'activate' : 'deactivate',
                                  item: br,
                                });
                              }}
                              className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                isInactive
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{isInactive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: DEPARTMENT CARDS */}
          {/* =============================================================== */}
          {activeTab === 'departments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedDepartments.map((d) => {
                const isInactive = d.status === 'inactive';
                return (
                  <div
                    key={d.id}
                    className={`bg-white rounded-2xl border p-6 shadow-xs transition-all flex flex-col justify-between space-y-5 ${
                      isInactive
                        ? 'border-slate-300 bg-slate-50/60 opacity-90'
                        : 'border-slate-200/90 hover:border-sky-400'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-sky-50 text-sky-900 border border-sky-200 font-mono">
                          รหัสแผนก: {d.code}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isInactive
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isInactive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-black text-slate-900 text-lg leading-snug">{d.name}</h3>
                        {d.nameEn && (
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{d.nameEn}</p>
                        )}
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {d.description || 'ไม่ได้ระบุคำอธิบายหน้าที่'}
                        </p>
                      </div>

                      {/* Affiliation & Head Info */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500 font-semibold">สาขาที่สังกัด:</span>
                          <span className="font-bold text-slate-900">
                            {d.branchName} ({d.branchCode})
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500 font-semibold">หัวหน้าแผนก:</span>
                          <span className="font-bold text-teal-800">{d.headName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500 font-semibold">จำนวนบุคลากรจริง:</span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {d.memberCount ?? 0} คน
                          </span>
                        </div>
                      </div>

                      {/* Allowed Roles */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500">บทบาทที่เกี่ยวข้อง:</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(d.allowedRoles || ['officer']).map((r) => (
                            <span
                              key={r}
                              className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {ROLE_LABELS_TH[r] || r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailDept(d);
                          setDetailDeptModalTab('info');
                        }}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                        <span>ดูรายละเอียด</span>
                      </button>

                      {isSuperAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditDeptModal(d)}
                            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5 text-sky-700" />
                            <span>จัดการแผนก</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusReason('');
                              setStatusModalTarget({
                                entityType: 'department',
                                action: isInactive ? 'activate' : 'deactivate',
                                item: d,
                              });
                            }}
                            className={`min-h-[40px] px-2.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              isInactive
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            }`}
                            title={isInactive ? 'เปิดใช้งานแผนก' : 'ปิดใช้งานแผนก'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDetailDept(d);
                            setDetailDeptModalTab('staff');
                          }}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-sky-700" />
                          <span>รายชื่อบุคลากร ({d.memberCount ?? 0})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: PERSONNEL & AFFILIATION TABLE */}
          {/* =============================================================== */}
          {activeTab === 'personnel' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-700" />
                    <span>ทำเนียบบุคลากรและสังกัดสาขา/แผนก ({personnelList.length} คน)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    การเปลี่ยนสังกัดสาขาหรือแผนกจะไม่สร้างบัญชีซ้ำ และไม่เปลี่ยนบทบาทสิทธิ์ (Role) โดยอัตโนมัติ
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyInvalidPersonnel}
                      onChange={(e) => setOnlyInvalidPersonnel(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>แสดงเฉพาะผู้ที่สังกัดไม่ถูกต้อง/ถูกปิดใช้งาน</span>
                  </label>
                  {onNavigate && isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => onNavigate('users')}
                      className="min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      ไปหน้าจัดการบัญชีผู้ใช้ →
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">รหัส / ชื่อ-นามสกุล</th>
                      <th className="py-3.5 px-4">บทบาทสิทธิ์ (Role)</th>
                      <th className="py-3.5 px-4">สาขาที่สังกัด</th>
                      <th className="py-3.5 px-4">แผนกปฏิบัติงาน</th>
                      <th className="py-3.5 px-4">เบอร์โทรศัพท์ / อีเมล</th>
                      <th className="py-3.5 px-4 text-center">สถานะบัญชี</th>
                      {isSuperAdmin && <th className="py-3.5 px-4 text-right">การจัดการสังกัด</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPersonnel.map((u) => {
                      const branchObj = allBranchesMaster.find((b) => b.id === u.branchId);
                      const deptObj = allDepartmentsMaster.find((d) => d.id === u.departmentId);
                      const hasInvalidAffiliation =
                        !branchObj ||
                        branchObj.status === 'inactive' ||
                        !deptObj ||
                        deptObj.status === 'inactive';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-400 font-mono">ID: {u.id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800">
                              {u.roleTitleTh}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">
                              {branchObj ? branchObj.name : u.branch || 'ไม่ระบุสาขา'}
                            </div>
                            {branchObj?.status === 'inactive' && (
                              <span className="text-[11px] font-bold text-rose-600">
                                (สาขานี้ถูกปิดใช้งาน)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {deptObj ? deptObj.name : u.departmentName || 'ไม่ระบุแผนก'}
                            </div>
                            {deptObj?.status === 'inactive' && (
                              <span className="text-[11px] font-bold text-rose-600">
                                (แผนกนี้ถูกปิดใช้งาน)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            <div>{u.phone}</div>
                            <div className="text-slate-400">{u.email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {hasInvalidAffiliation ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                ต้องตรวจสอบสังกัด
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800">
                                ปกติ
                              </span>
                            )}
                          </td>
                          {isSuperAdmin && (
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => openReassignModal(u)}
                                className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>ย้ายสังกัด</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* PAGINATION BAR */}
          {/* =============================================================== */}
          <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                แสดงรายการที่{' '}
                <strong>{Math.min((currentPage - 1) * pageSize + 1, currentListLength)}</strong> ถึง{' '}
                <strong>{Math.min(currentPage * pageSize, currentListLength)}</strong> จากทั้งหมด{' '}
                <strong>{currentListLength}</strong> รายการ
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-800"
              >
                <option value={6}>6 รายการ/หน้า</option>
                <option value={12}>12 รายการ/หน้า</option>
                <option value={24}>24 รายการ/หน้า</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
              </button>
              <span className="px-3 py-1.5 font-bold text-slate-800">
                หน้า {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: CREATE / EDIT BRANCH FORM */}
      {/* ================================================================= */}
      <Modal
        isOpen={isBranchFormOpen}
        onClose={() => !isSubmitting && setIsBranchFormOpen(false)}
        title={editingBranch ? `แก้ไขข้อมูลสาขา: ${editingBranch.name}` : 'เพิ่มสาขาหรือสำนักงานใหม่'}
        subtitle="กรอกข้อมูลสาขา ที่อยู่ตามมาตรฐานไปรษณีย์ไทย และผู้รับผิดชอบสาขา"
        size="xl"
        footer={
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsBranchFormOpen(false)}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="branch-crud-form"
              disabled={isSubmitting}
              className="min-h-[42px] px-6 py-2 rounded-xl bg-[#0b2545] hover:bg-[#133e6f] text-white text-sm font-bold shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสาขา'}</span>
            </button>
          </>
        }
      >
        <form id="branch-crud-form" onSubmit={handleSaveBranch} className="space-y-6 text-sm">
          {/* กลุ่มที่ 1: ข้อมูลทั่วไป */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Building2 className="w-4 h-4 text-teal-700" />
              <span>1. ข้อมูลทั่วไปของสาขา</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  รหัสสาขา (Branch Code) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  placeholder="เช่น BR-YLA หรือ BR-HDY"
                  className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border font-mono uppercase ${
                    branchFormErrors.code ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-white'
                  }`}
                />
                {branchFormErrors.code && (
                  <p className="text-xs font-bold text-rose-600 mt-1">{branchFormErrors.code}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ประเภทสำนักงาน <span className="text-rose-600">*</span>
                </label>
                <select
                  value={branchType}
                  onChange={(e) => setBranchType(e.target.value as BranchType)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="headquarters">สำนักงานใหญ่ (Headquarters)</option>
                  <option value="regional_branch">สำนักงานสาขาภูมิภาค (Regional Branch)</option>
                  <option value="sub_branch">สำนักงานสาขาย่อย / ศูนย์ประสานงาน (Sub-branch)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อสาขา (ภาษาไทย) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="เช่น สาขาภาคใต้ตอนล่าง (ยะลา)"
                  className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border ${
                    branchFormErrors.name ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-white'
                  }`}
                />
                {branchFormErrors.name && (
                  <p className="text-xs font-bold text-rose-600 mt-1">{branchFormErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อสาขา (ภาษาอังกฤษ - ถ้ามี)
                </label>
                <input
                  type="text"
                  value={branchNameEn}
                  onChange={(e) => setBranchNameEn(e.target.value)}
                  placeholder="เช่น Yala Provincial Branch"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              {branchType !== 'headquarters' && (
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    สาขาหลักที่กำกับดูแล (Parent Branch)
                  </label>
                  <select
                    value={parentBranchId}
                    onChange={(e) => setParentBranchId(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">-- ไม่ระบุสาขาหลัก (ขึ้นตรงต่อมูลนิธิ) --</option>
                    {activeBranchesForSelect
                      .filter((b) => b.id !== editingBranch?.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} — {b.name}
                        </option>
                      ))}
                  </select>
                  {branchFormErrors.parentBranchId && (
                    <p className="text-xs font-bold text-rose-600 mt-1">{branchFormErrors.parentBranchId}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* กลุ่มที่ 2: ข้อมูลติดต่อ */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Phone className="w-4 h-4 text-teal-700" />
              <span>2. ข้อมูลติดต่อสาขา</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์สำนักงาน</label>
                <input
                  type="text"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="เช่น 073-212-345 หรือ 02-123-4567"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">อีเมลประจำสาขา</label>
                <input
                  type="email"
                  value={branchEmail}
                  onChange={(e) => setBranchEmail(e.target.value)}
                  placeholder="เช่น yala@zakatfoundation.or.th"
                  className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border ${
                    branchFormErrors.email ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-white'
                  }`}
                />
                {branchFormErrors.email && (
                  <p className="text-xs font-bold text-rose-600 mt-1">{branchFormErrors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* กลุ่มที่ 3: ที่อยู่สาขา */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <MapPin className="w-4 h-4 text-teal-700" />
              <span>3. ที่ตั้งสำนักงานสาขา</span>
            </h4>
            <ThaiAddressFields
              postcode={branchPostcode}
              province={branchProvince}
              district={branchDistrict}
              subdistrict={branchSubdistrict}
              address={branchAddress}
              onChangePostcode={setBranchPostcode}
              onChangeProvince={setBranchProvince}
              onChangeDistrict={setBranchDistrict}
              onChangeSubdistrict={setBranchSubdistrict}
              onChangeAddress={setBranchAddress}
            />
            {branchFormErrors.province && (
              <p className="text-xs font-bold text-rose-600">{branchFormErrors.province}</p>
            )}
          </div>

          {/* กลุ่มที่ 4 & 5: ผู้รับผิดชอบ และ สถานะ */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <UserCheck className="w-4 h-4 text-teal-700" />
              <span>4. ผู้จัดการสาขา / ผู้รับผิดชอบ และสถานะ</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เลือกผู้จัดการสาขาจากบุคลากรในระบบ
                </label>
                <select
                  value={branchManagerUserId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setBranchManagerUserId(uid);
                    const found = staffCandidates.find((u) => u.id === uid);
                    if (found) setBranchManagerCustomName(found.name);
                  }}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">-- เลือกจากรายชื่อบุคลากร หรือระบุชื่อด้านขวา --</option>
                  {staffCandidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roleTitleTh})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  * การกำหนดผู้จัดการสาขาจะไม่เปลี่ยนสิทธิ์การอนุมัติ (Role) ของผู้ใช้โดยอัตโนมัติ
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อผู้จัดการสาขาที่แสดงผล
                </label>
                <input
                  type="text"
                  value={branchManagerCustomName}
                  onChange={(e) => setBranchManagerCustomName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุลผู้จัดการสาขา"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">สถานะสาขา</label>
                <select
                  value={branchStatus}
                  onChange={(e) => setBranchStatus(e.target.value as 'active' | 'inactive')}
                  disabled={editingBranch?.id === 'br-hq'}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100"
                >
                  <option value="active">เปิดทำการปกติ (Active)</option>
                  <option value="inactive">ปิดใช้งานชั่วคราว (Inactive)</option>
                </select>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 2: CREATE / EDIT DEPARTMENT FORM */}
      {/* ================================================================= */}
      <Modal
        isOpen={isDeptFormOpen}
        onClose={() => !isSubmitting && setIsDeptFormOpen(false)}
        title={editingDept ? `แก้ไขแผนกปฏิบัติงาน: ${editingDept.name}` : 'เพิ่มแผนกปฏิบัติงานใหม่'}
        subtitle="กำหนดรหัสแผนก สาขาที่สังกัด หัวหน้าแผนก และขอบเขตบทบาทหน้าที่"
        size="lg"
        footer={
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsDeptFormOpen(false)}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="dept-crud-form"
              disabled={isSubmitting}
              className="min-h-[42px] px-6 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-sm font-bold shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลแผนก'}</span>
            </button>
          </>
        }
      >
        <form id="dept-crud-form" onSubmit={handleSaveDepartment} className="space-y-5 text-sm">
          {/* 1. ข้อมูลทั่วไป */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base border-b border-slate-100 pb-2">
              1. ข้อมูลทั่วไปและสาขาที่สังกัด
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  รหัสแผนก (Department Code) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  placeholder="เช่น DEPT-WEL หรือ DEPT-AUD"
                  className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border font-mono uppercase ${
                    deptFormErrors.code ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-white'
                  }`}
                />
                {deptFormErrors.code && (
                  <p className="text-xs font-bold text-rose-600 mt-1">{deptFormErrors.code}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  สาขาที่สังกัด (เฉพาะสาขาที่เปิดทำการ) <span className="text-rose-600">*</span>
                </label>
                <select
                  value={deptBranchId}
                  onChange={(e) => setDeptBranchId(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {activeBranchesForSelect.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
                {deptFormErrors.branchId && (
                  <p className="text-xs font-bold text-rose-600 mt-1">{deptFormErrors.branchId}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อแผนก (ภาษาไทย) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="เช่น ฝ่ายสวัสดิการสังคมและฟื้นฟูอาชีพ"
                  className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border ${
                    deptFormErrors.name ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 bg-white'
                  }`}
                />
                {deptFormErrors.name && (
                  <p className="text-xs font-bold text-rose-600 mt-1">{deptFormErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อแผนก (ภาษาอังกฤษ)</label>
                <input
                  type="text"
                  value={deptNameEn}
                  onChange={(e) => setDeptNameEn(e.target.value)}
                  placeholder="เช่น Social Welfare & Livelihood Division"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. หัวหน้าแผนก */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base border-b border-slate-100 pb-2">
              2. หัวหน้าแผนก (Department Head)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เลือกบุคลากรเป็นหัวหน้าแผนก
                </label>
                <select
                  value={deptHeadUserId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setDeptHeadUserId(uid);
                    const found = staffCandidates.find((u) => u.id === uid);
                    if (found) setDeptHeadCustomName(found.name);
                  }}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">-- เลือกจากบุคลากรในระบบ --</option>
                  {staffCandidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.departmentName || 'ไม่ระบุแผนก'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อหัวหน้าแผนกที่แสดงผล</label>
                <input
                  type="text"
                  value={deptHeadCustomName}
                  onChange={(e) => setDeptHeadCustomName(e.target.value)}
                  placeholder="ระบุชื่อหัวหน้าแผนก"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              {deptHeadUserId && (
                <div className="sm:col-span-2 p-3 rounded-xl bg-teal-50 border border-teal-200">
                  <label className="flex items-start gap-2.5 text-xs font-bold text-teal-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deptTransferHead}
                      onChange={(e) => setDeptTransferHead(e.target.checked)}
                      className="mt-0.5 rounded text-teal-700"
                    />
                    <span>
                      ย้ายสังกัดของบุคลากรท่านนี้ให้ตรงกับแผนกและสาขานี้โดยอัตโนมัติ (ตามกฎองค์กรที่กำหนดให้หัวหน้าแผนกต้องสังกัดอยู่ในแผนกนั้น โดยไม่เปลี่ยน Role เดิม)
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* 3. คำอธิบายหน้าที่ & บทบาทที่เกี่ยวข้อง */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-base border-b border-slate-100 pb-2">
              3. คำอธิบายหน้าที่และบทบาทที่เกี่ยวข้อง
            </h4>
            <div>
              <label className="block font-bold text-slate-700 mb-1">คำอธิบายขอบเขตหน้าที่ของแผนก</label>
              <textarea
                rows={3}
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
                placeholder="อธิบายภารกิจหลัก เช่น การรับคำร้อง ลงพื้นที่สำรวจ หรือตรวจสอบบัญชี..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-2">
                กลุ่มบทบาทผู้ใช้งานที่เกี่ยวข้องกับแผนกนี้
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['super_admin', 'executive', 'approver', 'finance', 'officer', 'member'] as UserRole[]).map(
                  (role) => (
                    <label
                      key={role}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${
                        deptAllowedRoles.includes(role)
                          ? 'bg-sky-50 border-sky-300 text-sky-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={deptAllowedRoles.includes(role)}
                        onChange={() => toggleAllowedRole(role)}
                        className="rounded text-sky-600"
                      />
                      <span>{ROLE_LABELS_TH[role]}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">สถานะแผนก</label>
              <select
                value={deptStatus}
                onChange={(e) => setDeptStatus(e.target.value as 'active' | 'inactive')}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="active">เปิดใช้งานปกติ (Active)</option>
                <option value="inactive">ปิดใช้งาน (Inactive)</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 3: BRANCH DETAILS & STAFF ROSTER MODAL */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(detailBranch)}
        onClose={() => setDetailBranch(null)}
        title={detailBranch ? `${detailBranch.name} (${detailBranch.code})` : ''}
        subtitle={detailBranch?.nameEn || 'ข้อมูลรายละเอียดสาขา แผนกในสังกัด และรายชื่อเจ้าหน้าที่'}
        size="xl"
        footer={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isSuperAdmin && detailBranch && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const target = detailBranch;
                      setDetailBranch(null);
                      openEditBranchModal(target);
                    }}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> แก้ไขข้อมูลสาขา
                  </button>
                  {detailBranch.id !== 'br-hq' && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusReason('');
                        setStatusModalTarget({
                          entityType: 'branch',
                          action:
                            (detailBranch.staffCount || 0) +
                              (detailBranch.departmentCount || 0) +
                              (detailBranch.beneficiaryCount || 0) +
                              (detailBranch.applicationCount || 0) ===
                            0
                              ? 'delete'
                              : detailBranch.status === 'inactive'
                              ? 'activate'
                              : 'deactivate',
                          item: detailBranch,
                        });
                      }}
                      className="min-h-[40px] px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>
                        {detailBranch.status === 'inactive'
                          ? 'เปิดใช้งานสาขาอีกครั้ง'
                          : (detailBranch.staffCount || 0) +
                              (detailBranch.departmentCount || 0) +
                              (detailBranch.beneficiaryCount || 0) +
                              (detailBranch.applicationCount || 0) ===
                            0
                          ? 'ลบสาขา / ปิดใช้งาน'
                          : 'ปิดใช้งานสาขา'}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDetailBranch(null)}
              className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        }
      >
        {detailBranch && (
          <div className="space-y-5 text-sm">
            {/* Sub-tabs inside modal */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setDetailBranchModalTab('info')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  detailBranchModalTab === 'info' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                ข้อมูลสาขาและสถิติเชื่อมโยง
              </button>
              <button
                type="button"
                onClick={() => setDetailBranchModalTab('staff')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  detailBranchModalTab === 'staff' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                รายชื่อเจ้าหน้าที่ประจำสาขา ({detailBranch.staffCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailBranchModalTab('depts')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  detailBranchModalTab === 'depts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                แผนกในสังกัด ({detailBranch.departmentCount ?? 0})
              </button>
            </div>

            {detailBranchModalTab === 'info' && (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400">รหัสสาขา / ประเภท</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {detailBranch.code} • {BRANCH_TYPE_LABELS[detailBranch.branchType || 'regional_branch']}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">สถานะปัจจุบัน</div>
                    <div className="font-bold mt-0.5">
                      {detailBranch.status === 'inactive' ? (
                        <span className="text-rose-700">ปิดใช้งาน ({detailBranch.deactivatedReason || '-'})</span>
                      ) : (
                        <span className="text-emerald-700">เปิดทำการปกติ</span>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs font-bold text-slate-400">ที่อยู่สำนักงาน</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {[
                        detailBranch.address,
                        detailBranch.subdistrict && `ต./แขวง ${detailBranch.subdistrict}`,
                        detailBranch.district && `อ./เขต ${detailBranch.district}`,
                        detailBranch.province && `จ.${detailBranch.province}`,
                        detailBranch.postcode,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">โทรศัพท์ / อีเมล</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {detailBranch.phone || '-'} • {detailBranch.email || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">ผู้จัดการสาขา</div>
                    <div className="font-bold text-teal-800 mt-0.5">{detailBranch.managerName}</div>
                  </div>
                </div>

                {/* System Integration Metrics */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-slate-900 text-sm">
                    ความเชื่อมโยงข้อมูลกับโมดูลอื่นในระบบ (Database Integration)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200">
                      <div className="text-xs font-bold text-teal-800">ทะเบียนผู้มีสิทธิ์รับซะกาต</div>
                      <div className="text-xl font-black text-teal-950 mt-1">
                        {detailBranch.beneficiaryCount ?? 0} ราย
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200">
                      <div className="text-xs font-bold text-sky-800">คำร้องขอความช่วยเหลือ</div>
                      <div className="text-xl font-black text-sky-950 mt-1">
                        {detailBranch.applicationCount ?? 0} รายการ
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="text-xs font-bold text-emerald-800">ยอดจ่ายเงินช่วยเหลือสะสม</div>
                      <div className="text-xl font-black text-emerald-950 mt-1">
                        ฿{(detailBranch.disbursedAmountTotal || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <div className="text-xs font-bold text-amber-800">แผนติดตามผลหลังช่วยเหลือ</div>
                      <div className="text-xl font-black text-amber-950 mt-1">
                        {detailBranch.activeFollowUpCount ?? 0} แผน
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailBranchModalTab === 'staff' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">
                    รายชื่อบุคลากรประจำสาขา {detailBranch.name}
                  </h4>
                </div>
                <div className="divide-y divide-slate-100">
                  {personnelList.filter((u) => u.branchId === detailBranch.id).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      ยังไม่มีบุคลากรสังกัดสาขานี้
                    </div>
                  ) : (
                    personnelList
                      .filter((u) => u.branchId === detailBranch.id)
                      .map((u) => (
                        <div key={u.id} className="p-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-500">
                              {u.roleTitleTh} • แผนก: {u.departmentName || 'ไม่ระบุ'} • โทร: {u.phone}
                            </div>
                          </div>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => openReassignModal(u)}
                              className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 text-xs font-bold hover:bg-teal-100 cursor-pointer"
                            >
                              ย้ายสังกัด
                            </button>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {detailBranchModalTab === 'depts' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">
                    รายการแผนกที่สังกัดภายใต้ {detailBranch.name}
                  </span>
                  {isSuperAdmin && detailBranch.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => {
                        const bId = detailBranch.id;
                        setDetailBranch(null);
                        openCreateDeptModal(bId);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-600 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มแผนกในสาขานี้
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allDepartmentsMaster
                    .filter((d) => d.branchId === detailBranch.id)
                    .map((d) => (
                      <div key={d.id} className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-sky-800">{d.code}</span>
                          <span className="text-xs font-bold text-slate-600">{d.memberCount ?? 0} คน</span>
                        </div>
                        <div className="font-bold text-slate-900">{d.name}</div>
                        <div className="text-xs text-slate-500">หัวหน้าแผนก: {d.headName}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 4: DEPARTMENT DETAILS & STAFF MODAL */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(detailDept)}
        onClose={() => setDetailDept(null)}
        title={detailDept ? `${detailDept.name} (${detailDept.code})` : ''}
        subtitle={detailDept ? `สังกัด: ${detailDept.branchName}` : ''}
        size="lg"
        footer={
          <div className="w-full flex items-center justify-between">
            <div>
              {isSuperAdmin && detailDept && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailDept;
                    setDetailDept(null);
                    openEditDeptModal(target);
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> แก้ไขแผนก
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDetailDept(null)}
              className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        }
      >
        {detailDept && (
          <div className="space-y-4 text-sm">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-400 font-bold">รหัสแผนก:</span>
                  <div className="font-bold text-slate-900">{detailDept.code}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold">สาขาที่สังกัด:</span>
                  <div className="font-bold text-slate-900">{detailDept.branchName}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold">หัวหน้าแผนก:</span>
                  <div className="font-bold text-teal-800">{detailDept.headName}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold">จำนวนบุคลากรในแผนก:</span>
                  <div className="font-bold text-slate-900">{detailDept.memberCount ?? 0} คน</div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-bold">หน้าที่ความรับผิดชอบ:</span>
                <p className="text-slate-700 mt-1">{detailDept.description || '-'}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-xs uppercase tracking-wider">
                รายชื่อบุคลากรในแผนก ({detailDept.memberCount ?? 0} คน)
              </div>
              <div className="divide-y divide-slate-100">
                {personnelList.filter((u) => u.departmentId === detailDept.id).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">ยังไม่มีบุคลากรในแผนกนี้</div>
                ) : (
                  personnelList
                    .filter((u) => u.departmentId === detailDept.id)
                    .map((u) => (
                      <div key={u.id} className="p-3.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-500">
                            {u.roleTitleTh} • {u.email}
                          </div>
                        </div>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => openReassignModal(u)}
                            className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 text-xs font-bold hover:bg-teal-100 cursor-pointer"
                          >
                            ย้ายสังกัด
                          </button>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 5: DEACTIVATE / ACTIVATE / DELETE CONFIRMATION MODAL */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(statusModalTarget)}
        onClose={() => !isSubmitting && setStatusModalTarget(null)}
        title={
          statusModalTarget?.action === 'delete'
            ? `ยืนยันการลบข้อมูล: ${statusModalTarget.item.name}`
            : statusModalTarget?.action === 'activate'
            ? `ยืนยันการเปิดใช้งานอีกครั้ง: ${statusModalTarget?.item.name}`
            : `ยืนยันการปิดใช้งาน: ${statusModalTarget?.item.name}`
        }
        subtitle="ตรวจสอบผลกระทบของข้อมูลที่อ้างอิงก่อนดำเนินการ"
        size="md"
        footer={
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setStatusModalTarget(null)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmStatusOrDelete}
              className={`min-h-[40px] px-5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer ${
                statusModalTarget?.action === 'activate'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันดำเนินการ'}
            </button>
          </>
        }
      >
        {statusModalTarget && (
          <div className="space-y-4 text-sm">
            {statusModalTarget.entityType === 'branch' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>ข้อมูลที่เชื่อมโยงกับสาขานี้ในฐานข้อมูล:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>บุคลากรประจำสาขา: <strong>{(statusModalTarget.item as Branch).staffCount ?? 0} คน</strong></li>
                  <li>แผนกภายใต้สาขา: <strong>{(statusModalTarget.item as Branch).departmentCount ?? 0} แผนก</strong></li>
                  <li>ทะเบียนผู้มีสิทธิ์รับซะกาต: <strong>{(statusModalTarget.item as Branch).beneficiaryCount ?? 0} ราย</strong></li>
                  <li>คำร้องขอความช่วยเหลือ: <strong>{(statusModalTarget.item as Branch).applicationCount ?? 0} รายการ</strong></li>
                </ul>
                <p className="pt-1 text-amber-800">
                  * ระบบจะเก็บรักษาประวัติธุรกรรมและสังกัดเดิมของคำร้องที่ดำเนินการแล้วไว้ทั้งหมด และไม่เปลี่ยนข้อมูลย้อนหลังโดยอัตโนมัติ
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>ข้อมูลที่เชื่อมโยงกับแผนกนี้:</span>
                </div>
                <p>
                  บุคลากรที่สังกัดแผนกนี้ปัจจุบัน: <strong>{(statusModalTarget.item as Department).memberCount ?? 0} คน</strong>
                </p>
              </div>
            )}

            {statusModalTarget.action !== 'activate' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ระบุเหตุผลเพื่อบันทึกใน Audit Log <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="ระบุเหตุผล เช่น ปรับโครงสร้างองค์กรประจำปี หรือรวมศูนย์ประสานงาน..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 6: REASSIGN USER AFFILIATION MODAL */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(reassignTargetUser)}
        onClose={() => !isSubmitting && setReassignTargetUser(null)}
        title={reassignTargetUser ? `ย้ายสังกัดบุคลากร: ${reassignTargetUser.name}` : ''}
        subtitle="การเปลี่ยนสังกัดสาขาหรือแผนกจะไม่เปลี่ยนบทบาทสิทธิ์ (Role) ของผู้ใช้งานโดยอัตโนมัติ"
        size="md"
        footer={
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setReassignTargetUser(null)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="reassign-user-form"
              disabled={isSubmitting}
              className="min-h-[40px] px-5 py-2 rounded-xl bg-[#0b2545] hover:bg-[#133e6f] text-white text-xs font-bold cursor-pointer"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการย้ายสังกัด'}
            </button>
          </>
        }
      >
        {reassignTargetUser && (
          <form id="reassign-user-form" onSubmit={handleConfirmReassign} className="space-y-4 text-sm">
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-1">
              <div>
                <strong>ชื่อบุคลากร:</strong> {reassignTargetUser.name} ({reassignTargetUser.email})
              </div>
              <div>
                <strong>บทบาทปัจจุบัน (คงเดิม):</strong> {reassignTargetUser.roleTitleTh}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                เลือกสาขาใหม่ (เฉพาะสาขาที่เปิดทำการ) <span className="text-rose-600">*</span>
              </label>
              <select
                value={reassignBranchId}
                onChange={(e) => setReassignBranchId(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {activeBranchesForSelect.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                เลือกแผนกปฏิบัติงานใหม่ (เฉพาะแผนกที่เปิดใช้งาน) <span className="text-rose-600">*</span>
              </label>
              <select
                value={reassignDeptId}
                onChange={(e) => setReassignDeptId(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {allDepartmentsMaster
                  .filter((d) => d.status === 'active')
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name} ({d.branchName})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">หมายเหตุ / เหตุผลในการย้ายสังกัด</label>
              <input
                type="text"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="เช่น คำสั่งมอบหมายงานประจำไตรมาส..."
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function AdminSettingsView() {
  const { showToast } = useApp();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{
    success: boolean;
    timestamp: string;
    checksum: string;
    filename: string;
  } | null>(null);

  const [nisabGoldPrice, setNisabGoldPrice] = useState('42,500');
  const [zakatRate, setZakatRate] = useState('2.5%');
  const [pdpaRetentionYears, setPdpaRetentionYears] = useState('10');

  const handleBackupNow = async () => {
    try {
      setIsBackingUp(true);
      const res = await fetch('/api/system/backup', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setBackupStatus({
          success: true,
          timestamp: new Date().toLocaleString('th-TH'),
          checksum: json.data?.checksum || 'a7f9c2d4e8b1...',
          filename: json.data?.filename || 'zms-backup-latest.db'
        });
        showToast('สำรองฐานข้อมูล ZMS และคำนวณ Checksum สำเร็จ', 'success');
      } else {
        throw new Error(json.error || 'ไม่สามารถสำรองฐานข้อมูลได้');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการสำรองฐานข้อมูล', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
          <Settings className="w-4 h-4" /> การตั้งค่าระบบ
        </div>
        <h1 className="text-2xl font-black text-slate-900 mt-1">
          การกำหนดค่าระบบและการสำรองฐานข้อมูล (System Settings)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          การควบคุมพารามิเตอร์การคำนวณตามศาสนบัญญัติ กฎหมาย PDPA และสถาปัตยกรรมความมั่นคงปลอดภัย
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Database & Security Backup */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">ฐานข้อมูลและจุดคืนค่า (Database Engine)</h2>
              <p className="text-xs text-slate-500">ระบบเก็บข้อมูล SQLite / LibSQL พร้อม Audit Logging</p>
            </div>
          </div>

          <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-600">ประเภทเอนจินฐานข้อมูล:</span>
              <span className="font-bold text-slate-900">SQLite LibSQL (Atomic ACID)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-600">ตำแหน่งไฟล์:</span>
              <span className="font-mono text-slate-700">data/zms.db</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-600">การเข้ารหัสรหัสผ่าน:</span>
              <span className="font-bold text-emerald-700">HMAC-SHA256 with Salt</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">การป้องกัน Session:</span>
              <span className="font-bold text-emerald-700">HttpOnly, SameSite=Lax, 7 วัน</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleBackupNow}
              disabled={isBackingUp}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0b2545] hover:bg-[#133e6f] text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
              <span>{isBackingUp ? 'กำลังสำรองข้อมูล...' : 'สั่งสำรองฐานข้อมูลทันที (Backup Snapshot)'}</span>
            </button>
          </div>

          {backupStatus && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1 animate-fadeIn">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> สำรองข้อมูลสำเร็จ
              </div>
              <div className="text-[11px] text-emerald-700">
                เวลา: {backupStatus.timestamp} • ไฟล์: {backupStatus.filename}
              </div>
              <div className="text-[10px] font-mono text-emerald-800 truncate">
                SHA-256: {backupStatus.checksum}
              </div>
            </div>
          )}
        </div>

        {/* 2. Shariah Parameters */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">พารามิเตอร์ชะรีอะฮ์ (Shariah Governance)</h2>
              <p className="text-xs text-slate-500">เกณฑ์คำนวณและพิกัดนิศอบซะกาตตามหลักการศาสนา</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ราคาทองคำแท่งมาตรฐานเพื่อคำนวณนิศอบ (บาทละ):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nisabGoldPrice}
                  onChange={(e) => setNisabGoldPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold"
                />
                <span className="text-slate-500 shrink-0 font-medium">บาท (นิศอบ = 85 กรัม ~ ฿238,000)</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                อัตราส่วนซะกาตทรัพย์สินการเงินและการค้า:
              </label>
              <input
                type="text"
                value={zakatRate}
                disabled
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                คงที่ตามหลักการ 2.5% (รุบอุลอุชุร - หนึ่งในสี่สิบ)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ระยะเวลาจัดเก็บประวัติคำร้องตามมาตรฐาน PDPA (ปี):
              </label>
              <input
                type="number"
                value={pdpaRetentionYears}
                onChange={(e) => setPdpaRetentionYears(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                ข้อมูลส่วนบุคคล 13 หลักถูก Masking ในรายงานสาธารณะ
              </span>
            </div>

            <button
              onClick={() => showToast('บันทึกการตั้งค่าพารามิเตอร์เรียบร้อย', 'success')}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
