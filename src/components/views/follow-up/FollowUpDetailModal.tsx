'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import { FollowUpPlan, FollowUpRecord, FollowUpAttachment } from '@/types';
import { useApp } from '@/context/AppContext';
import { 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Camera, 
  FileText, 
  Sparkles, 
  Download, 
  Eye, 
  X, 
  PlusCircle, 
  ShieldCheck, 
  ExternalLink,
  History,
  Settings,
  PhoneCall,
  Video,
  Building,
  TrendingUp,
  Image as ImageIcon,
  AlertTriangle,
  ArrowRight,
  Info
} from 'lucide-react';

interface FollowUpDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  onRefreshList?: () => void;
  onOpenBeneficiaryRegistry?: (beneficiaryId: string) => void;
  onOpenManageModal?: (planId: string) => void;
}

export function FollowUpDetailModal({
  isOpen,
  onClose,
  planId,
  onRefreshList,
  onOpenBeneficiaryRegistry,
  onOpenManageModal,
}: FollowUpDetailModalProps) {
  const { currentUser, showToast } = useApp();
  const [plan, setPlan] = useState<FollowUpPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // 4 Specific Tabs required:
  // 1: ภาพรวม (overview)
  // 2: ประวัติการติดตาม (history)
  // 3: รูปหลักฐาน (photos)
  // 4: แผนการติดตาม (plan)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'photos' | 'plan'>('overview');

  // Selected visit record for detailed view modal ("ดูรายละเอียดครั้งนี้")
  const [selectedVisitRecord, setSelectedVisitRecord] = useState<FollowUpRecord | null>(null);

  // Lightbox preview for photo gallery
  const [previewPhoto, setPreviewPhoto] = useState<{
    attachment: FollowUpAttachment;
    visitInfo?: string;
  } | null>(null);

  const fetchPlanDetail = async () => {
    if (!planId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/follow-ups/${planId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPlan(json.data);
      } else {
        showToast(json.error || 'ไม่พบข้อมูลรายการติดตาม', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถดึงข้อมูลรายละเอียดได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && planId) {
      setActiveTab('overview');
      fetchPlanDetail();
    }
  }, [isOpen, planId]);

  // Tab 2: Records sorted from newest to oldest
  const sortedRecords = useMemo(() => {
    if (!plan?.records) return [];
    return [...plan.records].sort((a, b) => {
      // Sort newest date or highest visitNumber first
      if (b.visitNumber !== a.visitNumber) {
        return b.visitNumber - a.visitNumber;
      }
      return new Date(b.followupDate).getTime() - new Date(a.followupDate).getTime();
    });
  }, [plan?.records]);

  // Tab 3: All photo attachments aggregated across records
  const allPhotoAttachments = useMemo(() => {
    if (!plan?.records) return [];
    const list: {
      attachment: FollowUpAttachment;
      visitNumber: number;
      visitDate: string;
      inspectorName: string;
      visitFormat: string;
    }[] = [];

    // Traverse sorted records so photos are ordered newest visit first
    sortedRecords.forEach((rec) => {
      if (rec.attachments && Array.isArray(rec.attachments)) {
        rec.attachments.forEach((att) => {
          list.push({
            attachment: att,
            visitNumber: rec.visitNumber,
            visitDate: rec.followupDate,
            inspectorName: rec.inspectorName,
            visitFormat: rec.visitFormat,
          });
        });
      }
    });

    return list;
  }, [sortedRecords]);

  if (!isOpen) return null;

  const isCareer = plan ? (plan.assistanceTypeName.includes('อาชีพ') || plan.assistanceType === 'career') : false;
  const isHousing = plan ? (plan.assistanceTypeName.includes('ที่อยู่อาศัย') || plan.assistanceTypeName.includes('ซ่อม') || plan.assistanceType === 'housing') : false;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ติดตามครบตามเกณฑ์
          </span>
        );
      case 'partially_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            กำลังดำเนินการ / ติดตามบางส่วน
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            ถึงกำหนดติดตาม
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            ค้างติดตาม / กำลังดำเนินการ
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            รอติดตามตามนัด
          </span>
        );
      case 'requires_additional':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            ต้องติดตามเพิ่มเติม
          </span>
        );
      case 'terminated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <X className="w-3.5 h-3.5 text-slate-500" />
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

  const getFormatBadge = (fmt: string) => {
    switch (fmt) {
      case 'field_visit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <MapPin className="w-3 h-3 text-emerald-600" />
            ลงพื้นที่จริง
          </span>
        );
      case 'phone':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <PhoneCall className="w-3 h-3 text-blue-600" />
            โทรศัพท์
          </span>
        );
      case 'video_call':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Video className="w-3 h-3 text-purple-600" />
            วิดีโอคอล
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
            {fmt}
          </span>
        );
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`รายละเอียดการติดตามผล — ${plan?.beneficiaryName || 'กำลังโหลด...'}`}
        subtitle="ระบบตรวจสอบและติดตามผลการช่วยเหลือ (Follow-up & Monitoring)"
        size="xl"
      >
        {isLoading || !plan ? (
          <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
            <span>กำลังโหลดรายละเอียดการติดตามผล...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header Strip with Beneficiary Quick Info */}
            <div className="bg-gradient-to-r from-slate-900 via-[#0b2545] to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-xs border border-teal-500/30 font-mono">
                      {plan.registrationNo}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 text-xs font-mono">
                      คำร้อง: {plan.applicationNo}
                    </span>
                    {getStatusBadge(plan.status)}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {plan.beneficiaryName}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{plan.address || 'ที่อยู่ตามทะเบียน'}</span>
                    {plan.phone && <span>• โทร: {plan.phone}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onOpenManageModal && (
                    <button
                      onClick={() => onOpenManageModal(plan.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>จัดการติดตาม</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-center">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">ประเภทความช่วยเหลือ</span>
                  <span className="font-bold text-amber-300 text-xs block truncate mt-0.5">
                    {plan.assistanceTypeName}
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">เกณฑ์ขั้นต่ำ</span>
                  <span className="font-extrabold text-white text-sm block mt-0.5">
                    {plan.minVisits} <span className="text-[11px] font-normal text-slate-400">ครั้ง</span>
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">บันทึกสำเร็จจริง</span>
                  <span className="font-extrabold text-teal-400 text-sm block mt-0.5">
                    {plan.completedVisits} <span className="text-[11px] font-normal text-slate-400">ครั้ง</span>
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">นัดหมายถัดไป</span>
                  <span className="font-bold text-slate-200 text-xs block truncate mt-0.5">
                    {plan.nextFollowupDate || 'ยังไม่ได้กำหนด'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Required Tabs Navigation */}
            <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'overview'
                    ? 'border-teal-700 text-teal-900 bg-teal-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>แท็บ 1: ภาพรวม</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'history'
                    ? 'border-teal-700 text-teal-900 bg-teal-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>แท็บ 2: ประวัติการติดตาม ({sortedRecords.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('photos')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'photos'
                    ? 'border-teal-700 text-teal-900 bg-teal-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>แท็บ 3: รูปหลักฐาน ({allPhotoAttachments.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('plan')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'plan'
                    ? 'border-teal-700 text-teal-900 bg-teal-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>แท็บ 4: แผนการติดตาม</span>
              </button>
            </div>

            {/* TAB 1: ภาพรวม (Overview) */}
            {activeTab === 'overview' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-700" />
                      ข้อมูลทั่วไปและการช่วยเหลือ
                    </h4>
                    
                    {/* Button to open individual beneficiary registry */}
                    <button
                      onClick={() => {
                        if (onOpenBeneficiaryRegistry) {
                          onOpenBeneficiaryRegistry(plan.beneficiaryId);
                        } else {
                          showToast('เปิดหน้ารายละเอียดทะเบียนผู้มีสิทธิ์', 'info');
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition-colors"
                      title="เปิดดูข้อมูลครอบครัว สภาพความเป็นอยู่ และเอกสารทั้งหมดในทะเบียน"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-teal-700" />
                      <span>เปิดดูทะเบียนรายบุคคล</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-400 block mb-0.5">ชื่อผู้รับความช่วยเหลือ</span>
                      <span className="font-bold text-slate-900 text-sm">{plan.beneficiaryName}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-400 block mb-0.5">รหัสทะเบียน</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">{plan.registrationNo}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-400 block mb-0.5">ประเภทความช่วยเหลือ</span>
                      <span className="font-bold text-teal-800 text-xs">{plan.assistanceTypeName}</span>
                      <span className="block text-[10px] text-slate-400">
                        {isCareer ? '(เกณฑ์บังคับ >= 6 ครั้ง)' : isHousing ? '(เกณฑ์บังคับ >= 1 ครั้ง)' : '(ทั่วไป)'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-400 block mb-0.5">วันที่ได้รับความช่วยเหลือ</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {plan.disbursementDate || 'ตามบันทึกการเบิกจ่าย'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-400 block mb-0.5">เจ้าหน้าที่ผู้รับผิดชอบ</span>
                      <span className="font-bold text-slate-800 text-xs">{plan.assignedOfficerName || 'เจ้าหน้าที่ภาคสนาม'}</span>
                      <span className="block text-[10px] text-slate-400">{plan.branchName || 'สาขาส่วนกลาง'}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-400 block mb-0.5">สถานะการติดตาม</span>
                      <div className="mt-0.5">{getStatusBadge(plan.status)}</div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-400 block mb-0.5">จำนวนครั้งขั้นต่ำตามเกณฑ์</span>
                      <span className="font-extrabold text-slate-800 text-sm font-mono">{plan.minVisits} ครั้ง</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-400 block mb-0.5">จำนวนครั้งที่บันทึกสำเร็จจริง</span>
                      <span className="font-extrabold text-teal-700 text-sm font-mono">{plan.completedVisits} ครั้ง</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-400 block mb-0.5">วันนัดติดตามครั้งถัดไป</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {plan.nextFollowupDate ? (
                          <span className="text-teal-700 font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {plan.nextFollowupDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">ยังไม่ได้กำหนดวันติดตาม</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar in Tab 1 */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/70">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                      <span className="font-bold text-slate-700">ความก้าวหน้าการติดตาม (นับเฉพาะครั้งที่มีรูปหลักฐานสมบูรณ์)</span>
                      <span className="font-mono font-extrabold text-teal-800">
                        {plan.completedVisits} / {plan.minVisits} ครั้ง (
                        {plan.minVisits > 0 
                          ? `${Math.min(100, Math.round((plan.completedVisits / plan.minVisits) * 100))}%`
                          : '100%'}
                        )
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (plan.completedVisits / Math.max(1, plan.minVisits)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ประวัติการติดตาม (Timeline/History - Newest to Oldest) */}
            {activeTab === 'history' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    เรียงลำดับจากครั้งล่าสุดไปหาครั้งแรก (มีทั้งหมด {sortedRecords.length} บันทึก)
                  </span>
                  {onOpenManageModal && (
                    <button
                      onClick={() => onOpenManageModal(plan.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>บันทึกผลครั้งใหม่</span>
                    </button>
                  )}
                </div>

                {sortedRecords.length === 0 ? (
                  <div className="py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">ยังไม่มีประวัติการบันทึกผลการติดตาม</p>
                    <p className="text-[11px] text-slate-400 mt-1 mb-3">
                      เมื่อเจ้าหน้าที่ลงพื้นที่และแนบรูปหลักฐาน ข้อมูลจะแสดงเรียงจากใหม่ไปเก่าที่นี่
                    </p>
                    {onOpenManageModal && (
                      <button
                        onClick={() => onOpenManageModal(plan.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>เริ่มบันทึกการติดตาม</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {sortedRecords.map((rec) => {
                      const photoCount = rec.attachments?.length || 0;
                      return (
                        <div
                          key={rec.id}
                          className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                        >
                          {/* Visit Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 font-extrabold flex items-center justify-center text-xs border border-teal-200 shrink-0">
                                #{rec.visitNumber}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs">
                                    ครั้งที่ {rec.visitNumber}
                                  </span>
                                  {getFormatBadge(rec.visitFormat)}
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {rec.followupDate}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  เจ้าหน้าที่ผู้ติดตาม: <strong className="text-slate-600">{rec.inspectorName}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                <Camera className="w-3 h-3 text-teal-600" />
                                {photoCount} รูปหลักฐาน
                              </span>
                              <button
                                onClick={() => setSelectedVisitRecord(rec)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>ดูรายละเอียดครั้งนี้</span>
                              </button>
                            </div>
                          </div>

                          {/* Quick preview of visit contents */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                            <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                              <span className="font-bold text-slate-700 block text-[11px] mb-0.5">
                                สรุปผลการติดตาม:
                              </span>
                              <p className="text-slate-600 line-clamp-2">
                                {rec.visitResult}
                              </p>
                            </div>

                            <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                              <span className="font-bold text-emerald-900 block text-[11px] mb-0.5">
                                ความก้าวหน้า:
                              </span>
                              <p className="text-emerald-800 line-clamp-2">
                                {rec.progressAssessment}
                              </p>
                            </div>
                          </div>

                          {/* Problem and Next Appointment if any */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 border-t border-slate-50 text-slate-500">
                            <div>
                              {rec.problemsAndObstacles ? (
                                <span className="text-rose-700 text-[11px]">
                                  <strong>ปัญหา/อุปสรรค:</strong> {rec.problemsAndObstacles}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">ไม่มีปัญหาหรืออุปสรรคร้ายแรง</span>
                              )}
                            </div>
                            <div className="text-[11px]">
                              {rec.nextAppointmentDate ? (
                                <span>วันติดตามครั้งถัดไป: <strong className="text-teal-800">{rec.nextAppointmentDate}</strong></span>
                              ) : (
                                <span className="text-slate-400 italic">ไม่ได้ระบุวันนัดถัดไป</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: รูปหลักฐาน (Photo Evidence Gallery) */}
            {activeTab === 'photos' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    รูปหลักฐานจากการลงพื้นที่ติดตามจริงทั้งหมด ({allPhotoAttachments.length} รูป)
                  </span>
                  <span className="text-[11px] text-teal-700 font-bold">
                    คลิกที่รูปเพื่อดูภาพขนาดใหญ่และดาวน์โหลด
                  </span>
                </div>

                {allPhotoAttachments.length === 0 ? (
                  <div className="py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">ยังไม่มีรูปภาพหลักฐาน</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      ระบบกำหนดให้ทุกครั้งที่บันทึกผลการติดตาม ต้องแนบรูปภาพหลักฐานอย่างน้อย 1 รูป
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {allPhotoAttachments.map((item, idx) => (
                      <div
                        key={item.attachment.id || idx}
                        onClick={() =>
                          setPreviewPhoto({
                            attachment: item.attachment,
                            visitInfo: `การติดตามครั้งที่ ${item.visitNumber} (${item.visitDate}) โดย ${item.inspectorName}`,
                          })
                        }
                        className="group relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-2xs hover:shadow-md transition-all aspect-4/3 flex flex-col justify-end"
                      >
                        <img
                          src={item.attachment.filePath}
                          alt={item.attachment.caption || item.attachment.fileName}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          <span className="p-2 rounded-xl bg-white/90 text-slate-800 shadow-xs">
                            <Eye className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="relative z-10 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 text-white">
                          <span className="block text-[10px] font-bold truncate">
                            ครั้งที่ {item.visitNumber} • {item.visitDate}
                          </span>
                          {item.attachment.caption && (
                            <span className="block text-[9px] text-slate-200 truncate mt-0.5">
                              {item.attachment.caption}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: แผนการติดตาม (Follow-up Plan & Rules) */}
            {activeTab === 'plan' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Rule Card according to assistance type */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <ShieldCheck className="w-5 h-5 text-teal-700" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        ข้อกำหนดแผนการติดตามผลตามประเภทความช่วยเหลือ
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        เกณฑ์มาตรฐานของระบบ ZMS ตรวจสอบความถูกต้องจากฝั่งเซิร์ฟเวอร์
                      </p>
                    </div>
                  </div>

                  {/* Criteria Badge */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        ประเภท: <span className="text-teal-800">{plan.assistanceTypeName}</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {isHousing ? 'งานที่อยู่อาศัย (ขั้นต่ำ 1 ครั้ง)' : isCareer ? 'งานต่อยอดอาชีพ (ขั้นต่ำ 6 ครั้ง)' : 'ความช่วยเหลือทั่วไป'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {isHousing && 'กติกา: ต้องติดตามอย่างน้อย 1 ครั้ง เพื่อตรวจสอบสภาพที่อยู่อาศัย ความปลอดภัย และความคืบหน้าการซ่อมแซม พร้อมแนบรูปถ่ายหลักฐานทุกครั้ง'}
                      {isCareer && 'กติกา: ต้องติดตามอย่างน้อย 6 ครั้ง เพื่อประเมินความก้าวหน้าด้านอาชีพ รายได้ครัวเรือน ปัญหาอุปสรรค และความต้องการสนับสนุนเพิ่มเติม พร้อมแนบรูปถ่ายหลักฐานทุกครั้ง'}
                      {!isHousing && !isCareer && 'กติกา: ผู้ใช้งานที่มีสิทธิ์สามารถเลือกได้ว่าจะติดตามหรือไม่ หากเลือกติดตามให้กำหนดจำนวนครั้งตามความเหมาะสม หากเลือกไม่ติดตามต้องระบุเหตุผล'}
                    </p>
                  </div>

                  {/* Status Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-400 block">จำนวนครั้งขั้นต่ำ</span>
                      <span className="font-extrabold text-slate-900 text-lg font-mono">{plan.minVisits}</span>
                      <span className="text-[10px] text-slate-400 block">ครั้ง</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-400 block">จำนวนครั้งที่บันทึกสำเร็จ</span>
                      <span className="font-extrabold text-teal-700 text-lg font-mono">{plan.completedVisits}</span>
                      <span className="text-[10px] text-teal-600 block">มีรูปหลักฐานครบถ้วน</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-400 block">จำนวนครั้งที่ยังต้องดำเนินการ</span>
                      <span className="font-extrabold text-amber-700 text-lg font-mono">{plan.remainingVisits}</span>
                      <span className="text-[10px] text-amber-600 block">ครั้งคงเหลือ</span>
                    </div>
                  </div>

                  {/* Next Date & Officer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block mb-0.5">วันนัดติดตามครั้งถัดไป</span>
                      <span className="font-bold text-slate-800">
                        {plan.nextFollowupDate || 'ยังไม่ได้กำหนดวันติดตาม'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block mb-0.5">เจ้าหน้าที่รับผิดชอบ</span>
                      <span className="font-bold text-slate-800">{plan.assignedOfficerName || 'เจ้าหน้าที่ภาคสนาม'}</span>
                      <span className="text-[10px] text-slate-400 block">{plan.branchName || 'ส่วนกลาง'}</span>
                    </div>
                  </div>

                  {/* Opt-out display if applicable */}
                  {!isHousing && !isCareer && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-800 block mb-1">
                        สถานะการเลือกติดตามผล:
                      </span>
                      {plan.requiresFollowup ? (
                        <span className="text-teal-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          ผู้ใช้งานเลือกติดตามผลสำหรับรายการช่วยเหลือนี้
                        </span>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                          <span className="font-bold block">ผู้ใช้งานเลือก &quot;ไม่ติดตามผล&quot;</span>
                          <span className="block mt-0.5 text-[11px]">
                            <strong>เหตุผล:</strong> {plan.optOutReason || 'ไม่ระบุเหตุผล'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes & Remarks */}
                  {plan.notes && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-700 block mb-1">
                        หมายเหตุและแผนดำเนินงาน:
                      </span>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                        {plan.notes}
                      </p>
                    </div>
                  )}

                  {/* Audit Logs List */}
                  {plan.auditLogs && plan.auditLogs.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        ประวัติการปรับปรุงแผนและข้อกำหนด ({plan.auditLogs.length} รายการ)
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {plan.auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] flex items-start justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <strong className="text-slate-800">{log.action}</strong>
                                <span className="text-slate-400">• โดย {log.actorName}</span>
                              </div>
                              {log.notes && <p className="text-slate-600 mt-0.5">{log.notes}</p>}
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(log.createdAt).toLocaleDateString('th-TH')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Detail Modal for a single Visit Record ("ดูรายละเอียดครั้งนี้") */}
      {selectedVisitRecord && (
        <Modal
          isOpen={Boolean(selectedVisitRecord)}
          onClose={() => setSelectedVisitRecord(null)}
          title={`รายละเอียดการติดตามครั้งที่ ${selectedVisitRecord.visitNumber} — ${plan?.beneficiaryName || ''}`}
          subtitle={`วันที่ ${selectedVisitRecord.followupDate} • ผู้ตรวจ: ${selectedVisitRecord.inspectorName}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">รูปแบบการติดตาม</span>
                <div className="mt-0.5">{getFormatBadge(selectedVisitRecord.visitFormat)}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] block">วันนัดติดตามครั้งถัดไป</span>
                <span className="font-bold text-slate-800">
                  {selectedVisitRecord.nextAppointmentDate || 'ไม่ได้ระบุ'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">รายละเอียดสิ่งที่ตรวจสอบ:</span>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {selectedVisitRecord.inspectionDetails}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">ผลการติดตาม & ความเป็นอยู่:</span>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {selectedVisitRecord.visitResult}
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <span className="font-bold text-emerald-900 block mb-1">ความก้าวหน้าของการช่วยเหลือ:</span>
                <p className="text-emerald-800 whitespace-pre-line leading-relaxed">
                  {selectedVisitRecord.progressAssessment}
                </p>
              </div>

              {selectedVisitRecord.problemsAndObstacles && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <span className="font-bold text-rose-900 block mb-1">ปัญหาและอุปสรรค:</span>
                  <p className="text-rose-800 whitespace-pre-line leading-relaxed">
                    {selectedVisitRecord.problemsAndObstacles}
                  </p>
                </div>
              )}

              {selectedVisitRecord.officerRecommendation && (
                <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl">
                  <span className="font-bold text-sky-900 block mb-1">ข้อเสนอแนะเจ้าหน้าที่:</span>
                  <p className="text-sky-800 whitespace-pre-line leading-relaxed">
                    {selectedVisitRecord.officerRecommendation}
                  </p>
                </div>
              )}
            </div>

            {/* Photos of this visit */}
            <div className="pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-800 block mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-700" />
                รูปหลักฐานการตรวจครั้งนี้ ({selectedVisitRecord.attachments?.length || 0} ภาพ)
              </span>

              {(!selectedVisitRecord.attachments || selectedVisitRecord.attachments.length === 0) ? (
                <p className="text-xs text-slate-400 italic">ไม่มีรูปภาพแนบสำหรับบันทึกนี้</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {selectedVisitRecord.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() =>
                        setPreviewPhoto({
                          attachment: att,
                          visitInfo: `ครั้งที่ ${selectedVisitRecord.visitNumber} (${selectedVisitRecord.followupDate})`,
                        })
                      }
                      className="group relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                    >
                      <img
                        src={att.filePath}
                        alt={att.caption || att.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="p-1.5 rounded-lg bg-white/90 text-slate-800 shadow-xs">
                          <Eye className="w-4 h-4" />
                        </span>
                      </div>
                      {att.caption && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white truncate">
                          {att.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Lightbox Modal for Photo Preview */}
      {previewPhoto && (
        <Modal
          isOpen={Boolean(previewPhoto)}
          onClose={() => setPreviewPhoto(null)}
          title={previewPhoto.attachment.caption || previewPhoto.attachment.fileName}
          subtitle={previewPhoto.visitInfo || 'รูปหลักฐานการลงพื้นที่'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="max-h-[65vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center p-2">
              <img
                src={previewPhoto.attachment.filePath}
                alt={previewPhoto.attachment.fileName}
                className="max-h-[60vh] max-w-full object-contain mx-auto rounded"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-800 block text-xs">{previewPhoto.attachment.fileName}</span>
                <span className="text-[11px] text-slate-400">
                  ขนาด: {(previewPhoto.attachment.fileSize / 1024).toFixed(1)} KB • วันที่บันทึก: {new Date(previewPhoto.attachment.createdAt).toLocaleDateString('th-TH')}
                </span>
                {previewPhoto.attachment.caption && (
                  <p className="text-slate-700 mt-1 italic">&quot;{previewPhoto.attachment.caption}&quot;</p>
                )}
              </div>

              <a
                href={previewPhoto.attachment.filePath}
                download={previewPhoto.attachment.fileName}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-colors shadow-2xs shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดรูปภาพ</span>
              </a>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
