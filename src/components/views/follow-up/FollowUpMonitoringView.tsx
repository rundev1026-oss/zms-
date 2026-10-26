'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { FollowUpPlan, FollowUpSummaryStats, FollowUpStatus } from '@/types';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  PlusCircle, 
  RefreshCw, 
  ChevronRight, 
  Building2, 
  UserCheck, 
  TrendingUp, 
  FileText,
  MapPin,
  Camera,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  ExternalLink,
  SlidersHorizontal,
  Settings
} from 'lucide-react';
import { FollowUpDetailModal } from './FollowUpDetailModal';
import { ManageFollowUpModal } from './ManageFollowUpModal';

interface FollowUpMonitoringViewProps {
  onNavigate?: (view: string, extra?: any) => void;
  initialPlanId?: string;
}

export function FollowUpMonitoringView({ onNavigate, initialPlanId }: FollowUpMonitoringViewProps) {
  const { currentUser, showToast } = useApp();

  const [plans, setPlans] = useState<FollowUpPlan[]>([]);
  const [stats, setStats] = useState<FollowUpSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // SECTION 3: Filters & Search States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRegistryNo, setFilterRegistryNo] = useState<string>('');
  const [filterAssistanceNo, setFilterAssistanceNo] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTabCard, setActiveTabCard] = useState<'all' | 'due' | 'overdue' | 'in_progress' | 'completed'>('all');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Popups & Modals States
  const [selectedPlanIdForDetail, setSelectedPlanIdForDetail] = useState<string | null>(initialPlanId || null);
  const [selectedPlanIdForManage, setSelectedPlanIdForManage] = useState<string | null>(null);
  const [manageInitialTab, setManageInitialTab] = useState<'record' | 'schedule' | 'assign' | 'settings' | 'history'>('record');

  // Fetch real data from database via API
  const fetchFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (filterRegistryNo.trim()) params.append('registrationNo', filterRegistryNo.trim());
      if (filterAssistanceNo.trim()) params.append('applicationNo', filterAssistanceNo.trim());
      if (selectedType !== 'all') params.append('assistanceType', selectedType);
      if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
      if (selectedOfficer !== 'all') params.append('officerId', selectedOfficer);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (activeTabCard !== 'all') params.append('filterTab', activeTabCard);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/follow-ups?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPlans(json.data || []);
        setStats(json.stats || null);
      } else {
        showToast(json.error || 'ดึงข้อมูลไม่สำเร็จ', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถดึงข้อมูลการติดตามผลได้', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchTerm,
    filterRegistryNo,
    filterAssistanceNo,
    selectedType,
    selectedBranch,
    selectedOfficer,
    selectedStatus,
    activeTabCard,
    startDate,
    endDate,
    showToast,
  ]);

  useEffect(() => {
    fetchFollowUps();
    setCurrentPage(1); // Reset to page 1 whenever filters change
  }, [fetchFollowUps]);

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterRegistryNo('');
    setFilterAssistanceNo('');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedBranch('all');
    setSelectedOfficer('all');
    setStartDate('');
    setEndDate('');
    setActiveTabCard('all');
    setCurrentPage(1);
    showToast('ล้างตัวกรองทั้งหมดเรียบร้อยแล้ว', 'info');
  };

  // Branch and Officer lists for dropdown options
  const branchList = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((p) => {
      if (p.branchId && p.branchName) map.set(p.branchId, p.branchName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [plans]);

  const officerList = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((p) => {
      if (p.assignedOfficerId && p.assignedOfficerName) {
        map.set(p.assignedOfficerId, p.assignedOfficerName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [plans]);

  // Status badge renderer
  const getStatusBadge = (status: FollowUpStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ติดตามครบตามเกณฑ์
          </span>
        );
      case 'partially_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" />
            กำลังติดตาม
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            ถึงกำหนดติดตาม
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            ค้างติดตาม / เกินกำหนด
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Calendar className="w-3 h-3 text-blue-600" />
            รอติดตาม
          </span>
        );
      case 'requires_additional':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Sparkles className="w-3 h-3 text-purple-600" />
            ต้องติดตามเพิ่มเติม
          </span>
        );
      case 'terminated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-500" />
            ยุติการติดตาม
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            ยังไม่เริ่มติดตาม
          </span>
        );
    }
  };

  // Section 1: CSV Export function with UTF-8 BOM for Thai Excel
  const handleExportCsv = () => {
    if (plans.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'info');
      return;
    }

    const headers = [
      'ลำดับ',
      'รหัสแผนติดตาม',
      'รหัสทะเบียน',
      'ชื่อผู้รับความช่วยเหลือ',
      'เลขที่คำร้อง',
      'เลขที่เบิกจ่าย',
      'ประเภทความช่วยเหลือ',
      'เกณฑ์ขั้นต่ำ (ครั้ง)',
      'บันทึกสำเร็จจริง (ครั้ง)',
      'คงเหลือ (ครั้ง)',
      'วันติดตามครั้งถัดไป',
      'เจ้าหน้าที่รับผิดชอบ',
      'สาขา/แผนก',
      'สถานะการติดตาม',
    ];

    const rows = plans.map((p, idx) => [
      idx + 1,
      p.id,
      p.registrationNo,
      `"${p.beneficiaryName.replace(/"/g, '""')}"`,
      p.applicationNo,
      p.disbursementRef || '-',
      `"${p.assistanceTypeName}"`,
      p.minVisits,
      p.completedVisits,
      p.remainingVisits,
      p.nextFollowupDate || 'ยังไม่ได้กำหนดวันติดตาม',
      `"${p.assignedOfficerName || 'เจ้าหน้าที่ภาคสนาม'}"`,
      `"${p.branchName || 'ส่วนกลาง'}"`,
      `"${p.statusTh || p.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zms_followup_monitoring_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`ส่งออกข้อมูลเรียบร้อยแล้ว (${plans.length} รายการ)`, 'success');
  };

  // Pagination calculation
  const totalItems = plans.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return plans.slice(start, start + pageSize);
  }, [plans, currentPage, pageSize]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* =========================================================================
          SECTION 1: หัวข้อและการดำเนินการ (Header & Actions)
          ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 text-white flex items-center justify-center shadow-md shrink-0">
              <ClipboardCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  ตรวจสอบและติดตามผล
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  Follow-up & Monitoring
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                ติดตามผลการช่วยเหลือและบันทึกหลักฐาน ตรวจสอบการลงพื้นที่และควบคุมเกณฑ์ความช่วยเหลือ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick search input in Section 1 */}
            <div className="relative w-full sm:w-56 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาด่วน..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchFollowUps()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors min-h-[36px]"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-700' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            {/* Export Button (CSV / Excel) */}
            <button
              onClick={handleExportCsv}
              disabled={isLoading || plans.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors min-h-[36px] shadow-2xs disabled:opacity-50"
              title="ส่งออกข้อมูลเป็น CSV รองรับ Excel ภาษาไทย"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกข้อมูล</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: DASHBOARD CARDS (5 รายการตามข้อกำหนด)
            ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          {/* Card 1: งานติดตามทั้งหมด */}
          <div 
            onClick={() => {
              setActiveTabCard('all');
              setSelectedStatus('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'all' && selectedStatus === 'all'
                ? 'bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs' 
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold">1. งานติดตามทั้งหมด</span>
              <FileText className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {stats?.totalPlans || 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>แผนช่วยเหลือจริง</span>
              <span className="text-teal-700 font-bold">คลิกกรอง</span>
            </div>
          </div>

          {/* Card 2: งานที่ถึงกำหนดติดตาม */}
          <div 
            onClick={() => {
              setActiveTabCard('due');
              setSelectedStatus('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'due' 
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-xs' 
                : 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
              <span className="font-bold">2. ถึงกำหนดติดตาม</span>
              <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-amber-900 font-mono">
              {stats?.dueCount || 0}
            </div>
            <div className="text-[10px] text-amber-700 mt-1 flex items-center justify-between">
              <span>ภายใน 3 วันหรือวันนี้</span>
              <span className="font-bold">คลิกกรอง</span>
            </div>
          </div>

          {/* Card 3: งานค้างติดตาม */}
          <div 
            onClick={() => {
              setActiveTabCard('overdue');
              setSelectedStatus('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'overdue' 
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-xs' 
                : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-rose-800 mb-1">
              <span className="font-bold">3. งานค้างติดตาม</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-900 font-mono">
              {stats?.overdueCount || 0}
            </div>
            <div className="text-[10px] text-rose-700 mt-1 flex items-center justify-between">
              <span>เลยกำหนดนัดหมาย</span>
              <span className="font-bold">คลิกกรอง</span>
            </div>
          </div>

          {/* Card 4: งานที่กำลังดำเนินการ */}
          <div 
            onClick={() => {
              setActiveTabCard('in_progress');
              setSelectedStatus('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'in_progress' 
                ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-500/20 shadow-xs' 
                : 'bg-sky-50/40 border-sky-200/80 hover:bg-sky-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-sky-800 mb-1">
              <span className="font-bold">4. กำลังดำเนินการ</span>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-sky-900 font-mono">
              {stats?.inProgressCount || 0}
            </div>
            <div className="text-[10px] text-sky-700 mt-1 flex items-center justify-between">
              <span>ติดตามอยู่ระหว่างทาง</span>
              <span className="font-bold">คลิกกรอง</span>
            </div>
          </div>

          {/* Card 5: งานที่ติดตามครบตามเกณฑ์ */}
          <div 
            onClick={() => {
              setActiveTabCard('completed');
              setSelectedStatus('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'completed' 
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs' 
                : 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-800 mb-1">
              <span className="font-bold">5. ครบตามเกณฑ์</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-900 font-mono">
              {stats?.completedCount || 0}
            </div>
            <div className="text-[10px] text-emerald-700 mt-1 flex items-center justify-between">
              <span>ครบเกณฑ์ขั้นต่ำ</span>
              <span className="font-bold">คลิกกรอง</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: ตัวกรองและค้นหา (Filters Toolbar & Pagination Settings)
          แถวเดียวบน Desktop, เรียงแนวตั้งบน Mobile
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        {/* Toolbar Header with Clear Filter Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-bold text-slate-800">
              ตัวกรองข้อมูลและค้นหาขั้นสูง
            </span>
            {(searchTerm || filterRegistryNo || filterAssistanceNo || selectedType !== 'all' || selectedStatus !== 'all' || selectedBranch !== 'all' || selectedOfficer !== 'all' || startDate || endDate || activeTabCard !== 'all') && (
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                กำลังใช้งานตัวกรอง
              </span>
            )}
          </div>

          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors self-end sm:self-auto"
            title="ล้างการตั้งค่าตัวกรองทั้งหมด"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ล้างตัวกรอง</span>
          </button>
        </div>

        {/* Desktop Single-Bar Grid Layout (Wraps cleanly, stacked on mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
          {/* 1. ค้นหาชื่อผู้รับความช่วยเหลือ */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              ค้นหาชื่อผู้รับความช่วยเหลือ
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ระบุชื่อหรือนามสกุล..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              />
            </div>
          </div>

          {/* 2. รหัสทะเบียน */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              รหัสทะเบียน
            </label>
            <input
              type="text"
              value={filterRegistryNo}
              onChange={(e) => setFilterRegistryNo(e.target.value)}
              placeholder="REG-..."
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            />
          </div>

          {/* 3. เลขที่รายการช่วยเหลือ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              เลขที่ช่วยเหลือ/คำร้อง
            </label>
            <input
              type="text"
              value={filterAssistanceNo}
              onChange={(e) => setFilterAssistanceNo(e.target.value)}
              placeholder="REQ / REF..."
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            />
          </div>

          {/* 4. ประเภทความช่วยเหลือ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              ประเภทความช่วยเหลือ
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="housing">ที่อยู่อาศัย (&gt;= 1 ครั้ง)</option>
              <option value="career">ต่อยอดอาชีพ (&gt;= 6 ครั้ง)</option>
              <option value="other">ประเภทอื่น ๆ</option>
            </select>
          </div>

          {/* 5. สถานะการติดตาม */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              สถานะการติดตาม
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="due">ถึงกำหนดติดตาม</option>
              <option value="in_progress">ค้างติดตาม / เกินกำหนด</option>
              <option value="partially_completed">กำลังติดตาม</option>
              <option value="completed">ติดตามครบตามเกณฑ์</option>
              <option value="pending">รอติดตาม</option>
              <option value="requires_additional">ต้องติดตามเพิ่ม</option>
              <option value="terminated">ยุติการติดตาม</option>
            </select>
          </div>

          {/* 6. สาขาและแผนก */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              สาขา/แผนก
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white truncate"
            >
              <option value="all">ทุกสาขา</option>
              {branchList.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* 7. เจ้าหน้าที่ผู้รับผิดชอบ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              ผู้รับผิดชอบ
            </label>
            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white truncate"
            >
              <option value="all">ทุกคน</option>
              {officerList.map((off) => (
                <option key={off.id} value={off.id}>{off.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Sub-Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-600">ช่วงวันที่ติดตาม:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-xl border border-slate-300 bg-white"
                placeholder="ตั้งแต่วันที่"
              />
              <span className="text-slate-400">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-xl border border-slate-300 bg-white"
                placeholder="ถึงวันที่"
              />
            </div>
          </div>

          {/* Rows per page selector in Toolbar */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] text-slate-500">แสดงแถวต่อหน้า:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white font-bold"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: รายการติดตามผล (Data Table - Clean & Readable)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3.5">รหัสรายการ</th>
                <th className="py-3 px-3.5">ผู้รับความช่วยเหลือ</th>
                <th className="py-3 px-3.5">ประเภทความช่วยเหลือ</th>
                <th className="py-3 px-3.5 text-center min-w-[130px]">ความคืบหน้าการติดตาม</th>
                <th className="py-3 px-3.5">วันติดตามครั้งถัดไป</th>
                <th className="py-3 px-3.5">ผู้รับผิดชอบ</th>
                <th className="py-3 px-3.5">สถานะ</th>
                <th className="py-3 px-3.5 text-right min-w-[170px]">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>กำลังโหลดข้อมูลการติดตามผล...</span>
                  </td>
                </tr>
              ) : paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">ไม่พบรายการติดตามผลที่ตรงกับเงื่อนไข</p>
                    <p className="text-[11px] text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือกดปุ่ม &quot;ล้างตัวกรอง&quot;</p>
                  </td>
                </tr>
              ) : (
                paginatedPlans.map((p) => {
                  const isCareer = p.assistanceTypeName.includes('อาชีพ') || p.assistanceType === 'career';
                  const isHousing = p.assistanceTypeName.includes('ที่อยู่อาศัย') || p.assistanceTypeName.includes('ซ่อม') || p.assistanceType === 'housing';
                  const progressPct = p.minVisits > 0 ? Math.min(100, Math.round((p.completedVisits / p.minVisits) * 100)) : 100;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. รหัสรายการ */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono text-slate-800 text-xs font-bold block">
                          {p.applicationNo}
                        </span>
                        {p.disbursementRef && (
                          <span className="font-mono text-slate-400 text-[10px] block">
                            Ref: {p.disbursementRef}
                          </span>
                        )}
                      </td>

                      {/* 2. ผู้รับความช่วยเหลือ (ชื่อ + รหัสทะเบียน) */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 text-xs">
                          {p.beneficiaryName}
                        </div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px] text-slate-600 border border-slate-200">
                          {p.registrationNo}
                        </span>
                      </td>

                      {/* 3. ประเภทความช่วยเหลือ */}
                      <td className="py-3 px-3.5">
                        <span className={`inline-block font-bold text-xs ${
                          isCareer ? 'text-amber-800' : isHousing ? 'text-teal-800' : 'text-slate-700'
                        }`}>
                          {p.assistanceTypeName}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {isCareer ? '(เกณฑ์ >= 6 ครั้ง)' : isHousing ? '(เกณฑ์ >= 1 ครั้ง)' : '(ทั่วไป)'}
                        </span>
                      </td>

                      {/* 4. ความคืบหน้าการติดตาม (นับเฉพาะครั้งที่มีรูปหลักฐานสมบูรณ์) */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex flex-col items-center w-full max-w-[120px]">
                          <span className="font-mono font-extrabold text-xs text-teal-800">
                            {p.completedVisits} / {p.minVisits} ครั้ง
                          </span>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-teal-600 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {progressPct >= 100 ? 'ครบเกณฑ์' : `คงเหลือ ${p.remainingVisits} ครั้ง`}
                          </span>
                        </div>
                      </td>

                      {/* 5. วันติดตามครั้งถัดไป */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {p.nextFollowupDate ? (
                          <span className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            {p.nextFollowupDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            ยังไม่ได้กำหนดวันติดตาม
                          </span>
                        )}
                      </td>

                      {/* 6. ผู้รับผิดชอบ */}
                      <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                        <span className="truncate block max-w-[130px] font-medium">
                          {p.assignedOfficerName || 'เจ้าหน้าที่ภาคสนาม'}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block max-w-[130px]">
                          {p.branchName || 'ส่วนกลาง'}
                        </span>
                      </td>

                      {/* 7. สถานะ */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getStatusBadge(p.status)}
                      </td>

                      {/* 8. การดำเนินการ (SECTION 5: Popup Actions) */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* ปุ่ม ดูรายละเอียด */}
                          <button
                            onClick={() => setSelectedPlanIdForDetail(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                            title="เปิดดูรายละเอียด 4 แท็บ: ภาพรวม, ประวัติ, รูปหลักฐาน, แผนงาน"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>ดูรายละเอียด</span>
                          </button>

                          {/* ปุ่ม จัดการติดตาม */}
                          <button
                            onClick={() => {
                              setSelectedPlanIdForManage(p.id);
                              setManageInitialTab('record');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors shadow-2xs"
                            title="บันทึกผล, กำหนดนัดหมาย, มอบหมายงาน หรือปรับแผน"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-teal-700" />
                            <span>จัดการติดตาม</span>
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

        {/* Pagination Controls Bar */}
        {totalItems > 0 && (
          <div className="p-3 sm:p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 text-[11px]">
              แสดงรายการที่{' '}
              <strong className="text-slate-800">
                {(currentPage - 1) * pageSize + 1}
              </strong>{' '}
              ถึง{' '}
              <strong className="text-slate-800">
                {Math.min(totalItems, currentPage * pageSize)}
              </strong>{' '}
              จากทั้งหมด <strong className="text-teal-800">{totalItems}</strong> รายการ
            </div>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="หน้าแรก"
              >
                <ChevronsLeft className="w-4 h-4 text-slate-600" />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              <span className="px-2 text-xs font-bold text-slate-700">
                หน้า {currentPage} / {totalPages}
              </span>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="หน้าถัดไป"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="หน้าสุดท้าย"
              >
                <ChevronsRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 5: POPUPS (ดูรายละเอียด & จัดการงานติดตาม)
          ========================================================================= */}

      {/* 1. Popup ดูรายละเอียดการติดตาม (4 แท็บ) */}
      {selectedPlanIdForDetail && (
        <FollowUpDetailModal
          isOpen={Boolean(selectedPlanIdForDetail)}
          onClose={() => setSelectedPlanIdForDetail(null)}
          planId={selectedPlanIdForDetail}
          onRefreshList={fetchFollowUps}
          onOpenBeneficiaryRegistry={(beneficiaryId) => {
            setSelectedPlanIdForDetail(null);
            if (onNavigate) {
              onNavigate('registry');
            }
          }}
          onOpenManageModal={(planId) => {
            setSelectedPlanIdForDetail(null);
            setSelectedPlanIdForManage(planId);
            setManageInitialTab('record');
          }}
        />
      )}

      {/* 2. Popup จัดการติดตามงาน (บันทึกผล, กำหนดนัด, มอบหมาย, ปรับแผน, ประวัติ) */}
      {selectedPlanIdForManage && (
        <ManageFollowUpModal
          isOpen={Boolean(selectedPlanIdForManage)}
          onClose={() => setSelectedPlanIdForManage(null)}
          planId={selectedPlanIdForManage}
          onSuccess={() => {
            fetchFollowUps();
          }}
          initialTab={manageInitialTab}
        />
      )}
    </div>
  );
}
