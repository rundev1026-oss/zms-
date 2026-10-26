'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import { FollowUpPlan, FollowUpRecord, FollowUpAttachment, FollowUpVisitFormat } from '@/types';
import { useApp } from '@/context/AppContext';
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  AlertTriangle, 
  Camera, 
  Eye, 
  Download, 
  TrendingUp, 
  PlusCircle, 
  PhoneCall, 
  Video, 
  X, 
  Info,
  ShieldCheck,
  ChevronRight,
  FileText
} from 'lucide-react';
import { ManageFollowUpModal } from '../follow-up/ManageFollowUpModal';

interface AssistanceFollowUpHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  beneficiaryName: string;
  registrationNo: string;
  assistanceNo: string;
  assistanceType: string;
  onRefresh?: () => void;
  canEdit?: boolean;
}

export function AssistanceFollowUpHistoryModal({
  isOpen,
  onClose,
  planId,
  beneficiaryName,
  registrationNo,
  assistanceNo,
  assistanceType,
  onRefresh,
  canEdit = true,
}: AssistanceFollowUpHistoryModalProps) {
  const { showToast } = useApp();
  const [plan, setPlan] = useState<FollowUpPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-modal states
  const [selectedVisitRecord, setSelectedVisitRecord] = useState<FollowUpRecord | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{
    attachment: FollowUpAttachment;
    visitInfo: string;
  } | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);

  // Fetch plan details including records and attachments
  const fetchPlanData = async () => {
    if (!planId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/follow-ups/${planId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPlan(json.data);
      } else {
        setError(json.error || 'ไม่สามารถโหลดประวัติการติดตามผลได้');
      }
    } catch (err: any) {
      console.error('Error fetching plan history:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && planId) {
      fetchPlanData();
    }
  }, [isOpen, planId]);

  // Sort records from newest to oldest
  const sortedRecords = useMemo(() => {
    if (!plan?.records) return [];
    return [...plan.records].sort((a, b) => {
      if (b.visitNumber !== a.visitNumber) {
        return b.visitNumber - a.visitNumber;
      }
      return new Date(b.followupDate).getTime() - new Date(a.followupDate).getTime();
    });
  }, [plan?.records]);

  if (!isOpen) return null;

  const getFormatBadge = (fmt: FollowUpVisitFormat | string) => {
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
            กำลังติดตาม
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
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ค้างติดตาม / เกินกำหนด
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            รอติดตาม
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

  const progressPct = plan && plan.minVisits > 0 
    ? Math.min(100, Math.round((plan.completedVisits / plan.minVisits) * 100))
    : 100;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="ประวัติการติดตามผลการช่วยเหลือ"
        subtitle={`เลขที่รายการ: ${assistanceNo} • ผู้มีสิทธิ์: ${beneficiaryName}`}
        size="xl"
      >
        <div className="space-y-5">
          {/* =========================================================================
              1. ส่วนหัวและข้อมูลผู้รับความช่วยเหลือ (Header Strip)
              ========================================================================= */}
          <div className="bg-gradient-to-r from-slate-900 via-[#0b2545] to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-xs border border-teal-500/30 font-mono">
                    {registrationNo}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 text-xs font-mono">
                    คำร้อง: {assistanceNo}
                  </span>
                  {plan && getStatusBadge(plan.status)}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {beneficiaryName}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>ประเภท: <strong className="text-amber-300">{assistanceType}</strong></span>
                  {plan?.assignedOfficerName && <span>• ผู้รับผิดชอบ: <strong>{plan.assignedOfficerName}</strong></span>}
                </p>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0 self-start sm:self-center"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>บันทึกผลการติดตาม</span>
                </button>
              )}
            </div>

            {/* =========================================================================
                2. ส่วนสรุปความคืบหน้า (Progress Summary)
                ========================================================================= */}
            {plan && (
              <div className="pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">เกณฑ์ขั้นต่ำที่ต้องติดตาม</span>
                    <span className="font-extrabold text-white text-sm block mt-0.5 font-mono">
                      {plan.minVisits} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                    </span>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">ติดตามสำเร็จแล้ว</span>
                    <span className="font-extrabold text-teal-300 text-sm block mt-0.5 font-mono">
                      {plan.completedVisits} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                    </span>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">คงเหลือตามเกณฑ์</span>
                    <span className="font-extrabold text-amber-300 text-sm block mt-0.5 font-mono">
                      {plan.remainingVisits} <span className="text-[10px] font-normal text-slate-400">ครั้ง</span>
                    </span>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">วันติดตามครั้งถัดไป</span>
                    <span className="font-bold text-slate-200 text-xs block truncate mt-0.5">
                      {plan.nextFollowupDate || 'ยังไม่ได้กำหนด'}
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                    <span>ความก้าวหน้าการติดตาม (นับเฉพาะครั้งที่มีรูปหลักฐานสมบูรณ์)</span>
                    <span className="font-mono font-bold text-teal-300">
                      {plan.completedVisits} / {plan.minVisits} ครั้ง ({progressPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              3. ส่วนรายการติดตาม (Follow-up Records Timeline - Newest to Oldest)
              ========================================================================= */}
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
              <span>กำลังโหลดประวัติการติดตามผล...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          ) : sortedRecords.length === 0 ? (
            /* Empty State */
            <div className="py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">ยังไม่มีประวัติการติดตาม</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                ยังไม่มีการบันทึกผลการติดตามสำหรับการช่วยเหลือรายการนี้ เมื่อเจ้าหน้าที่ลงพื้นที่และแนบรูปหลักฐาน ข้อมูลจะแสดงเรียงจากใหม่ไปเก่าที่นี่
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>บันทึกการติดตามครั้งแรก</span>
                </button>
              )}
            </div>
          ) : (
            /* Timeline List */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
                <span>ประวัติการลงพื้นที่ทั้งหมด ({sortedRecords.length} ครั้ง) เรียงจากล่าสุดไปหาครั้งแรก</span>
                <span className="text-[11px] text-teal-700 font-bold">ข้อมูลเชื่อมโยงกับเมนูตรวจสอบและติดตามผล</span>
              </div>

              {sortedRecords.map((rec) => {
                const photoCount = rec.attachments?.length || 0;

                return (
                  <div
                    key={rec.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                  >
                    {/* Visit Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 font-extrabold flex items-center justify-center text-xs border border-teal-200 shrink-0">
                          #{rec.visitNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">
                              ครั้งที่ {rec.visitNumber}
                            </span>
                            {getFormatBadge(rec.visitFormat)}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                              {rec.followupDate}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            เจ้าหน้าที่ผู้ติดตาม: <strong className="text-slate-600">{rec.inspectorName}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          <Camera className="w-3 h-3 text-teal-600" />
                          {photoCount} รูปหลักฐาน
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedVisitRecord(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>ดูรายละเอียดครั้งนี้</span>
                        </button>
                      </div>
                    </div>

                    {/* Visit Content Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-700 block text-[11px]">
                          รายละเอียดและสิ่งที่ตรวจสอบ:
                        </span>
                        <p className="text-slate-600 line-clamp-3 leading-relaxed">
                          {rec.inspectionDetails}
                        </p>
                      </div>

                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-700 block text-[11px]">
                          ผลการตรวจสอบ:
                        </span>
                        <p className="text-slate-600 line-clamp-3 leading-relaxed">
                          {rec.visitResult}
                        </p>
                      </div>
                    </div>

                    {/* Progress Assessment */}
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-xs">
                      <span className="font-bold text-emerald-900 block text-[11px] mb-0.5 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                        ความก้าวหน้าของการช่วยเหลือ:
                      </span>
                      <p className="text-emerald-800 leading-relaxed">
                        {rec.progressAssessment}
                      </p>
                    </div>

                    {/* Obstacles & Recommendations if any */}
                    {(rec.problemsAndObstacles || rec.officerRecommendation || rec.additionalSupportNeeded) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {rec.problemsAndObstacles && (
                          <div className="p-2.5 bg-rose-50/60 border border-rose-100 rounded-xl">
                            <span className="font-bold text-rose-800 block text-[10px] mb-0.5">
                              ปัญหาและอุปสรรค:
                            </span>
                            <span className="text-rose-900 text-[11px]">{rec.problemsAndObstacles}</span>
                          </div>
                        )}

                        {(rec.officerRecommendation || rec.additionalSupportNeeded) && (
                          <div className="p-2.5 bg-sky-50/60 border border-sky-100 rounded-xl">
                            <span className="font-bold text-sky-800 block text-[10px] mb-0.5">
                              ข้อเสนอแนะ / ความต้องการเพิ่มเติม:
                            </span>
                            <span className="text-sky-900 text-[11px]">
                              {rec.officerRecommendation || rec.additionalSupportNeeded}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* =========================================================================
                        4. รูปหลักฐานการติดตามของการติดตามครั้งนี้ (Photo Evidence)
                        แยกรูปภาพตามครั้งที่ติดตาม ไม่นำมาปะปนกัน
                        ========================================================================= */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-teal-700" />
                          รูปหลักฐานของการติดตามครั้งที่ {rec.visitNumber} ({photoCount} รูป):
                        </span>
                        <span className="text-[10px] text-slate-400">
                          คลิกที่รูปเพื่อเปิดดูภาพขนาดใหญ่และดาวน์โหลด
                        </span>
                      </div>

                      {photoCount === 0 ? (
                        <p className="text-[11px] text-rose-500 italic bg-rose-50 p-2 rounded-lg border border-rose-100">
                          ไม่มีรูปหลักฐานแนบ (ไม่เป็นไปตามเกณฑ์มาตรฐาน)
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {rec.attachments.map((att) => (
                            <div
                              key={att.id}
                              onClick={() =>
                                setPreviewPhoto({
                                  attachment: att,
                                  visitInfo: `การติดตามครั้งที่ ${rec.visitNumber} (${rec.followupDate}) โดย ${rec.inspectorName}`,
                                })
                              }
                              className="group relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-2xs hover:shadow-md transition-all flex flex-col justify-end"
                            >
                              <img
                                src={att.filePath}
                                alt={att.caption || att.fileName}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                <span className="p-1.5 rounded-lg bg-white/90 text-slate-800 shadow-xs">
                                  <Eye className="w-3.5 h-3.5" />
                                </span>
                              </div>
                              <div className="relative z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1.5 text-white">
                                <span className="block text-[10px] font-bold truncate">
                                  {att.fileName}
                                </span>
                                {att.caption && (
                                  <span className="block text-[9px] text-slate-200 truncate mt-0.5">
                                    {att.caption}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Next Appointment Date footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                      <span className="text-[11px]">
                        วันนัดติดตามครั้งถัดไป:{' '}
                        {rec.nextAppointmentDate ? (
                          <strong className="text-teal-800">{rec.nextAppointmentDate}</strong>
                        ) : (
                          <span className="text-slate-400 italic">ไม่ได้ระบุ</span>
                        )}
                      </span>

                      <span className="text-[10px] text-slate-400">
                        บันทึกเมื่อ: {new Date(rec.createdAt).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Sub-Modal: Full Visit Details Modal ("ดูรายละเอียดครั้งนี้") */}
      {selectedVisitRecord && (
        <Modal
          isOpen={Boolean(selectedVisitRecord)}
          onClose={() => setSelectedVisitRecord(null)}
          title={`รายละเอียดการติดตามครั้งที่ ${selectedVisitRecord.visitNumber}`}
          subtitle={`วันที่ ${selectedVisitRecord.followupDate} • ผู้ตรวจ: ${selectedVisitRecord.inspectorName}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
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

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 block">รายละเอียดสิ่งที่ตรวจสอบ:</span>
              <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                {selectedVisitRecord.inspectionDetails}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 block">ผลการตรวจสอบ:</span>
              <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                {selectedVisitRecord.visitResult}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-1">
              <span className="font-bold text-emerald-900 block">ความก้าวหน้าของการช่วยเหลือ:</span>
              <p className="text-emerald-800 whitespace-pre-line leading-relaxed">
                {selectedVisitRecord.progressAssessment}
              </p>
            </div>

            {selectedVisitRecord.problemsAndObstacles && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-1">
                <span className="font-bold text-rose-900 block">ปัญหาและอุปสรรค:</span>
                <p className="text-rose-800 whitespace-pre-line leading-relaxed">
                  {selectedVisitRecord.problemsAndObstacles}
                </p>
              </div>
            )}

            {selectedVisitRecord.officerRecommendation && (
              <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl space-y-1">
                <span className="font-bold text-sky-900 block">ข้อเสนอแนะ:</span>
                <p className="text-sky-800 whitespace-pre-line leading-relaxed">
                  {selectedVisitRecord.officerRecommendation}
                </p>
              </div>
            )}

            {/* Photos in this record */}
            <div className="pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-800 block mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-700" />
                รูปหลักฐานการตรวจ ({selectedVisitRecord.attachments?.length || 0} ภาพ)
              </span>

              {(!selectedVisitRecord.attachments || selectedVisitRecord.attachments.length === 0) ? (
                <p className="text-slate-400 italic">ไม่มีรูปภาพแนบสำหรับบันทึกนี้</p>
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

      {/* Action Sub-Modal: Record / Manage Follow-up Modal */}
      {isManageModalOpen && plan && (
        <ManageFollowUpModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          planId={plan.id}
          onSuccess={() => {
            fetchPlanData();
            if (onRefresh) onRefresh();
          }}
          initialTab="record"
        />
      )}
    </>
  );
}
