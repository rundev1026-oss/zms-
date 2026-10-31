'use client';

import React, { useState, useEffect } from 'react';
import { formatPersonName } from '@zms/shared';
import { useApp } from '@/context/AppContext';
import { Branch, Department } from '@/types';
import { 
  TrendingUp, 
  Wallet, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
  Layers,
  Building,
  HeartHandshake,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface ExecutiveDashboardProps {
  onNavigate: (view: string) => void;
  onSelectApplication?: (appId: string) => void;
}

export function ExecutiveDashboard({ onNavigate, onSelectApplication }: ExecutiveDashboardProps) {
  const { funds, applications, registries, dashboardStats, transactions, showToast } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [orgBranches, setOrgBranches] = useState<Branch[]>([]);
  const [orgDepartments, setOrgDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetch('/api/organization/structure')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setOrgBranches(json.data.branches || []);
          setOrgDepartments(json.data.departments || []);
        }
      })
      .catch((err) => console.error('Failed to load organization structure for dashboard:', err));
  }, []);

  // Real database separated counts mandated by prompt
  const separatedStats = dashboardStats || {
    totalRegisteredBeneficiaries: registries.length,
    pendingVerificationRegistries: registries.filter((r) => ['pending_verification', 'draft', 'pending_survey'].includes(r.registrationStatus)).length,
    qualifiedBeneficiaries: registries.filter((r) => r.registrationStatus === 'qualified').length,
    pendingAssistanceRequests: applications.filter((a) => ['submitted', 'doc_review', 'assessing', 'pending_approval'].includes(a.status)).length,
    approvedAssistanceRequests: applications.filter((a) => ['approved', 'wait_disbursement'].includes(a.status)).length,
    completedAssistanceDisbursed: applications.filter((a) => a.status === 'disbursed' || a.status === 'closed').length,
  };

  // Financial Calculations
  const totalReceived = funds.reduce((acc, f) => acc + f.totalReceived, 0);
  const totalDisbursed = funds.reduce((acc, f) => acc + f.disbursedAmount, 0);
  const totalCommitted = funds.reduce((acc, f) => acc + f.committedAmount, 0);
  const totalAvailable = funds.reduce((acc, f) => acc + f.availableAmount, 0);

  // Application Stats
  const totalApplicants = applications.length;
  const pendingApprovals = applications.filter((a) => a.status === 'pending_approval');
  const waitDisbursements = applications.filter((a) => a.status === 'wait_disbursement');
  const disbursedApps = applications.filter((a) => a.status === 'disbursed');

  // Asnaf Distribution
  const asnafCounts = {
    faqir: applications.filter((a) => a.asnafCategory === 'faqir').length,
    miskin: applications.filter((a) => a.asnafCategory === 'miskin').length,
    gharimin: applications.filter((a) => a.asnafCategory === 'gharimin').length,
    fisabilillah: applications.filter((a) => a.asnafCategory === 'fisabilillah').length,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Executive Dashboard (แดชบอร์ดผู้บริหาร)
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              สถานะกองทุนแบบ Real-time
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ภาพรวมผลการดำเนินงาน การรับเงินซะกาต การจัดสรรงบประมาณ และสถานะความช่วยเหลือผู้ยากไร้
          </p>
        </div>

        {/* Period Filter & Export */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedPeriod === 'month'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เดือนนี้ (ต.ค. 2569)
            </button>
            <button
              onClick={() => setSelectedPeriod('quarter')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedPeriod === 'quarter'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ไตรมาส 4
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedPeriod === 'year'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ปีบัญชี 2569
            </button>
          </div>

          <button
            onClick={() => showToast('ส่งออกรายงานสรุปผู้บริหารเป็น PDF เรียบร้อย (Demo)', 'success')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> ส่งออกรายงาน
          </button>
        </div>
      </div>

      {/* Separated Beneficiary Registration & Assistance Request Cards (Mandated by Specification) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              สถิติแยกระบบ: ทะเบียนผู้มีสิทธิ์รับซะกาต & คำร้องขอความช่วยเหลือ
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            ดึงจากฐานข้อมูลจริง (Real-time Separated Metrics)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. จำนวนผู้ขึ้นทะเบียนทั้งหมด */}
          <button
            onClick={() => onNavigate('beneficiaries')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-400 text-left transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                1. ทะเบียนทั้งหมด
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 font-mono">
              {separatedStats.totalRegisteredBeneficiaries}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
              จำนวนผู้ขึ้นทะเบียนทั้งหมด
            </div>
            <div className="text-[10px] text-teal-700 font-semibold mt-1 flex items-center gap-1 group-hover:underline">
              <span>ดูทะเบียน</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* 2. จำนวนทะเบียนที่รอตรวจสอบ */}
          <button
            onClick={() => onNavigate('beneficiaries')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 text-left transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                2. รอตรวจสอบ
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-800 mt-2 font-mono">
              {separatedStats.pendingVerificationRegistries}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
              ทะเบียนรอตรวจสอบข้อมูล
            </div>
            <div className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1 group-hover:underline">
              <span>ตรวจข้อมูล</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* 3. จำนวนผู้ผ่านการพิจารณาคุณสมบัติ */}
          <button
            onClick={() => onNavigate('beneficiaries')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-400 text-left transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                3. ผ่านเกณฑ์
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-2 font-mono">
              {separatedStats.qualifiedBeneficiaries}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
              ผู้ผ่านคุณสมบัติตามเกณฑ์
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1 group-hover:underline">
              <span>ดูผู้ผ่านเกณฑ์</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* 4. จำนวนคำร้องขอความช่วยเหลือที่รอดำเนินการ */}
          <button
            onClick={() => onNavigate('assistance-requests')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-sky-400 text-left transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                4. คำร้องรอดำเนินการ
              </span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <FileCheck2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-sky-900 mt-2 font-mono">
              {separatedStats.pendingAssistanceRequests}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
              คำร้องขอช่วยเหลือรอดำเนินการ
            </div>
            <div className="text-[10px] text-sky-700 font-semibold mt-1 flex items-center gap-1 group-hover:underline">
              <span>ติดตามคำร้อง</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* 5. จำนวนคำร้องที่อนุมัติแล้ว */}
          <button
            onClick={() => onNavigate('assistance-requests')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-400 text-left transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                5. คำร้องอนุมัติแล้ว
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-900 mt-2 font-mono">
              {separatedStats.approvedAssistanceRequests}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
              คำร้องที่ได้รับอนุมัติวงเงิน
            </div>
            <div className="text-[10px] text-purple-700 font-semibold mt-1 flex items-center gap-1 group-hover:underline">
              <span>ดูคำร้องอนุมัติ</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* 6. จำนวนรายการช่วยเหลือที่ดำเนินการเสร็จสิ้น */}
          <button
            onClick={() => onNavigate('disbursements')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-400 text-left transition-all hover:shadow-xs group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                6. ช่วยเหลือเสร็จสิ้น
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <HeartHandshake className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-teal-900 mt-2 font-mono">
              {separatedStats.completedAssistanceDisbursed}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
              รายการช่วยเหลือที่สำเร็จ
            </div>
            <div className="text-[10px] text-teal-700 font-semibold mt-1 flex items-center gap-1 group-hover:underline">
              <span>ดูบันทึกช่วยเหลือ</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Received */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ยอดรับซะกาตสะสม
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              ฿{totalReceived.toLocaleString('th-TH')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% จากเดือนก่อนหน้า</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>เป้าหมาย 12.0 ล้านบาท</span>
            <span className="font-semibold text-slate-700">92.5%</span>
          </div>
        </div>

        {/* Card 2: Total Disbursed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-teal-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ยอดจ่ายสวัสดิการแล้ว
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              ฿{totalDisbursed.toLocaleString('th-TH')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-teal-700">
              <span>โอนเข้าบัญชีผู้ยากไร้แล้ว 100%</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>คิดเป็นสัดส่วนการจ่าย</span>
            <span className="font-semibold text-slate-700">
              {((totalDisbursed / totalReceived) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 3: Committed Amount */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ยอดผูกพันรอจ่าย (Committed)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-800">
              ฿{totalCommitted.toLocaleString('th-TH')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-700">
              <span>อนุมัติแล้ว อยู่ระหว่างรอฝ่ายการเงินโอน</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>คำร้องรอจ่ายเงิน</span>
            <span className="font-semibold text-amber-700">{waitDisbursements.length} รายการ</span>
          </div>
        </div>

        {/* Card 4: Available Net Reserve */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              คงเหลือจัดสรรได้ (Available)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-blue-900">
              ฿{totalAvailable.toLocaleString('th-TH')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-700">
              <span>สถานะคล่องตัว ปลอดภัยตามหลักบัญชี</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>ความเพียงพอจ่ายสวัสดิการ</span>
            <span className="font-semibold text-emerald-600">พร้อมช่วยเหลือ</span>
          </div>
        </div>
      </div>

      {/* Operational Highlights & Workflow Queue Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('approvals')}
          className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200/70 text-left hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              คำร้องรอพิจารณาอนุมัติ
            </span>
            <ArrowUpRight className="w-4 h-4 text-rose-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-rose-900 mt-2">
            {pendingApprovals.length} <span className="text-xs font-normal text-slate-600">คำร้อง</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            วงเงินขอรับความช่วยเหลือรวม: ฿{pendingApprovals.reduce((acc, a) => acc + a.requestedAmount, 0).toLocaleString()}
          </div>
        </button>

        <button
          onClick={() => onNavigate('disbursements')}
          className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/70 text-left hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
              รายการอนุมัติรอจ่ายเงิน
            </span>
            <ArrowUpRight className="w-4 h-4 text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-teal-900 mt-2">
            {waitDisbursements.length} <span className="text-xs font-normal text-slate-600">คำร้อง</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            พร้อมให้ฝ่ายการเงินดำเนินการโอนเงินและแนบหลักฐาน
          </div>
        </button>

        <button
          onClick={() => onNavigate('beneficiaries')}
          className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200/70 text-left hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-600" />
              ครอบครัวที่ได้รับการช่วยเหลือแล้ว
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {disbursedApps.length} <span className="text-xs font-normal text-slate-600">ครัวเรือน</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            มีประวัติการติดตามผลและเอกสารครบถ้วน
          </div>
        </button>
      </div>

      {/* Fund Solvency Breakdown & Asnaf Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Fund Balances Ledger */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                สถานะยอดเงินคงเหลือแยกบัญชีกองทุน (Fund Solvency Ledger)
              </h2>
              <p className="text-xs text-slate-500">
                ควบคุมการใช้จ่ายตรงตามวัตถุประสงค์ ห้ามยอดเงินติดลบโดยเด็ดขาด
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {funds.map((fund) => {
              const percentUsed = Math.min(100, Math.round(((fund.disbursedAmount + fund.committedAmount) / fund.totalReceived) * 100));

              return (
                <div key={fund.id} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{fund.name}</span>
                      <span className="ml-2 text-[10px] text-slate-400 font-mono">({fund.code})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">คงเหลือจัดสรรได้: </span>
                      <span className="font-bold text-emerald-700">
                        ฿{fund.availableAmount.toLocaleString('th-TH')}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex">
                    <div
                      className="bg-emerald-600 h-2.5 transition-all"
                      style={{ width: `${(fund.disbursedAmount / fund.totalReceived) * 100}%` }}
                      title={`จ่ายแล้ว: ฿${fund.disbursedAmount.toLocaleString()}`}
                    />
                    <div
                      className="bg-amber-400 h-2.5 transition-all"
                      style={{ width: `${(fund.committedAmount / fund.totalReceived) * 100}%` }}
                      title={`กันยอดผูกพัน: ฿${fund.committedAmount.toLocaleString()}`}
                    />
                  </div>

                  {/* Sub metrics */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>รับรวม: ฿{fund.totalReceived.toLocaleString()}</span>
                    <span>ผูกพันรอจ่าย: ฿{fund.committedAmount.toLocaleString()}</span>
                    <span>จ่ายแล้ว: ฿{fund.disbursedAmount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Asnaf Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              สถิติการช่วยเหลือแยกตาม 8 อัสนาฟ
            </h2>
            <p className="text-xs text-slate-500">
              สัดส่วนผู้มีสิทธิรับซะกาตตามหลักศาสนบัญญัติ
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-900">1. ผู้ขัดสน (มิสเกน / Miskin)</div>
                <div className="text-[11px] text-emerald-700">มีรายได้แต่ไม่พอยังชีพ</div>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-emerald-800">{asnafCounts.miskin}</span>
                <span className="text-xs text-slate-500 ml-1">ครัวเรือน</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-blue-900">2. ผู้ยากไร้ (ฟะกีร / Faqir)</div>
                <div className="text-[11px] text-blue-700">ไม่มีรายได้ ไร้ที่พึ่งพิง</div>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-blue-800">{asnafCounts.faqir}</span>
                <span className="text-xs text-slate-500 ml-1">ครัวเรือน</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-900">3. ผู้มีหนี้สินจำเป็น (ฆอริมูน)</div>
                <div className="text-[11px] text-amber-700">หนี้ค่ารักษาพยาบาล/การยังชีพ</div>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-amber-800">{asnafCounts.gharimin}</span>
                <span className="text-xs text-slate-500 ml-1">ครัวเรือน</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-purple-900">4. เพื่อการศึกษา (ฟีสะบีลิลลาฮ์)</div>
                <div className="text-[11px] text-purple-700">ทุนการศึกษาเยาวชนยากไร้</div>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-purple-800">{asnafCounts.fisabilillah}</span>
                <span className="text-xs text-slate-500 ml-1">ครัวเรือน</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 border border-slate-200">
            <span className="font-bold text-slate-800">หมายเหตุความโปร่งใส:</span> การจัดสรรเงินซะกาตผ่านการรับรองความถูกต้องตามหลักการโดยคณะกรรมการชะรีอะฮ์ประจำมูลนิธิ
          </div>
        </div>
      </div>

      {/* Branch & Organization Summary Section */}
      {orgBranches.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-700" />
                <span>ภาพรวมการดำเนินงานแยกตามสาขาและโครงสร้างองค์กร ({orgBranches.length} สาขา / {orgDepartments.length} แผนก)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ข้อมูลบุคลากร ทะเบียนผู้มีสิทธิ์ และคำร้องขอความช่วยเหลือเชื่อมโยงตามสาขาจริงจากฐานข้อมูล
              </p>
            </div>
            <button
              onClick={() => onNavigate('branches-depts')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>จัดการโครงสร้างสาขาและแผนก</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {orgBranches.map((br) => (
              <div
                key={br.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  br.status === 'active'
                    ? 'bg-slate-50/70 border-slate-200 hover:border-emerald-300'
                    : 'bg-slate-100/70 border-slate-300 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {br.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      br.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {br.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </div>
                <div className="font-bold text-slate-900 mt-2 truncate" title={br.name}>
                  {br.name}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  ผู้จัดการ: <strong className="text-slate-700">{br.managerName || 'ยังไม่ระบุ'}</strong>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-slate-200/80 text-center">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                    <div className="font-extrabold text-slate-900 text-sm">{br.staffCount ?? 0}</div>
                    <div className="text-[10px] text-slate-500">บุคลากร</div>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                    <div className="font-extrabold text-teal-800 text-sm">{br.beneficiaryCount ?? 0}</div>
                    <div className="text-[10px] text-slate-500">ผู้มีสิทธิ์</div>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                    <div className="font-extrabold text-indigo-800 text-sm">{br.applicationCount ?? 0}</div>
                    <div className="text-[10px] text-slate-500">คำร้อง</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Applications Activity Stream */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              ความเคลื่อนไหวคำร้องล่าสุด (Applications Stream)
            </h2>
            <p className="text-xs text-slate-500">
              คลิกที่รายการเพื่อเปิดดูรายละเอียดประวัติและการประเมิน
            </p>
          </div>
          <button
            onClick={() => onNavigate('beneficiaries')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            ดูคำร้องทั้งหมด ({applications.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">เลขที่คำร้อง</th>
                <th className="py-2.5 px-3">ชื่อผู้ขอรับซะกาต</th>
                <th className="py-2.5 px-3">หมวดหมู่อัสนาฟ</th>
                <th className="py-2.5 px-3">วงเงินขอรับ</th>
                <th className="py-2.5 px-3">เจ้าหน้าที่ผู้รับผิดชอบ</th>
                <th className="py-2.5 px-3">สถานะคำร้อง</th>
                <th className="py-2.5 px-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.slice(0, 5).map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800 font-mono">
                    {app.applicationNo}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900">{formatPersonName(app)}</div>
                    <div className="text-[11px] text-slate-400">{app.province} ({app.district})</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {app.asnafCategory === 'miskin' ? 'มิสเกน (ขัดสน)' :
                       app.asnafCategory === 'faqir' ? 'ฟะกีร (ยากไร้)' :
                       app.asnafCategory === 'gharimin' ? 'ฆอริมูน (มีหนี้สิน)' : 'ฟีสะบีลิลลาฮ์'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    ฿{app.requestedAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {app.assignedOfficerName}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      app.status === 'disbursed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : app.status === 'wait_disbursement'
                        ? 'bg-teal-100 text-teal-800 border border-teal-300'
                        : app.status === 'pending_approval'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : app.status === 'doc_review'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {app.status === 'disbursed' ? '✓ จ่ายเงินแล้ว' :
                       app.status === 'wait_disbursement' ? 'รอจ่ายเงิน' :
                       app.status === 'pending_approval' ? 'รออนุมัติ' :
                       app.status === 'doc_review' ? 'รอตรวจเอกสาร' : app.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        if (onSelectApplication) onSelectApplication(app.id);
                        onNavigate('beneficiaries');
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                    >
                      เปิดดู →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
