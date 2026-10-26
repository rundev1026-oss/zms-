'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  DollarSign, 
  FileText, 
  Package, 
  CheckCircle2, 
  Clock, 
  FilePlus2, 
  Printer, 
  Download, 
  Eye, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Receipt,
  ClipboardCheck,
  Camera,
  Sparkles,
  History,
  PlusCircle,
  AlertTriangle,
  Calendar,
  UserCheck
} from 'lucide-react';
import { BeneficiaryRegistryItem, AssistanceApplication, FollowUpPlan, FollowUpStatus } from '@/types';
import { AssistanceFollowUpHistoryModal } from './AssistanceFollowUpHistoryModal';
import { ManageFollowUpModal } from '../follow-up/ManageFollowUpModal';

interface AssistanceHistorySectionProps {
  registry: BeneficiaryRegistryItem;
  applications: AssistanceApplication[];
  onOpenReceiptModal: (app: AssistanceApplication) => void;
  onOpenNewAssistanceDialog: () => void;
  canEdit: boolean;
}

export function AssistanceHistorySection({
  registry,
  applications,
  onOpenReceiptModal,
  onOpenNewAssistanceDialog,
  canEdit,
}: AssistanceHistorySectionProps) {
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [followUpPlans, setFollowUpPlans] = useState<FollowUpPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);

  // Level 2 Follow-up History Modal states
  const [selectedPlanForHistory, setSelectedPlanForHistory] = useState<FollowUpPlan | null>(null);
  const [selectedAidForHistory, setSelectedAidForHistory] = useState<AssistanceApplication | null>(null);

  // Manage / Record Follow-up Modal state
  const [selectedPlanIdForManage, setSelectedPlanIdForManage] = useState<string | null>(null);

  // Fetch follow-up plans linked to this individual beneficiary
  const fetchFollowUpPlans = async () => {
    if (!registry?.id) return;
    try {
      setIsLoadingPlans(true);
      const res = await fetch(`/api/follow-ups?beneficiaryId=${registry.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setFollowUpPlans(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch follow-ups for registry:', e);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchFollowUpPlans();
  }, [registry?.id]);

  // 1. Filter applications for this individual beneficiary
  const beneficiaryApps = useMemo(() => {
    return applications.filter(
      (app) => app.beneficiaryId === registry.id || 
               (registry.registrationNo && app.registrationNo === registry.registrationNo) ||
               (registry.nationalId && app.nationalId === registry.nationalId)
    );
  }, [applications, registry]);

  // 2. Real executed / completed assistance records (strict filtering: disbursed or positive disbursedAmount)
  const executedAidList = useMemo(() => {
    return beneficiaryApps.filter(
      (app) => app.status === 'disbursed' || (app.disbursedAmount && app.disbursedAmount > 0)
    );
  }, [beneficiaryApps]);

  // 3. In-progress / Pending assistance requests (strictly separated from executed aid)
  const pendingAidList = useMemo(() => {
    return beneficiaryApps.filter(
      (app) => app.status !== 'disbursed' && 
               app.status !== 'rejected' && 
               app.status !== 'cancelled' && 
               (!app.disbursedAmount || app.disbursedAmount === 0)
    );
  }, [beneficiaryApps]);

  // 4. Summaries (computed strictly from executed aid only, avoiding duplicate counting)
  const totalAssistanceTimes = executedAidList.length;
  const totalCashDisbursed = executedAidList.reduce(
    (sum, a) => sum + (a.disbursedAmount || a.approvedAmount || 0), 
    0
  );
  const totalInKindTimes = executedAidList.filter(
    (a) => a.assistanceType === 'in_kind' || 
           a.assistanceType === 'emergency_relief' || 
           a.assistanceType === 'housing' ||
           Boolean(a.assistanceTypeDetails?.includes('สิ่งของ') || a.assistanceTypeDetails?.includes('ถุงยังชีพ'))
  ).length;

  const handlePrintSummary = () => {
    window.print();
  };

  const getStatusBadge = (status?: FollowUpStatus | string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ติดตามครบตามเกณฑ์
          </span>
        );
      case 'partially_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <Clock className="w-3 h-3 text-sky-600" />
            กำลังติดตาม
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            ถึงกำหนดติดตาม
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            ค้างติดตาม / เกินกำหนด
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Calendar className="w-3 h-3 text-blue-600" />
            รอติดตาม
          </span>
        );
      case 'requires_additional':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Sparkles className="w-3 h-3 text-purple-600" />
            ต้องติดตามเพิ่มเติม
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            ยังไม่เริ่มติดตาม
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                5. ส่วนประวัติการช่วยเหลือและติดตามผล
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ข้อมูลจริงจากระบบ ({executedAidList.length} รายการส่งมอบแล้ว)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ประวัติการส่งมอบความช่วยเหลือ เอกสารใบสำคัญจ่าย และประวัติการติดตามผลการลงพื้นที่จริง
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrintSummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>พิมพ์รายงานประวัติ</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={onOpenNewAssistanceDialog}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-amber-300" />
              <span>ยื่นคำร้องใหม่ให้บุคคลนี้</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Three Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">จำนวนครั้งที่ได้รับความช่วยเหลือ</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {totalAssistanceTimes} <span className="text-xs font-medium text-slate-500">ครั้ง</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-xs bg-gradient-to-br from-emerald-50/60 to-white flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-emerald-800 font-semibold block">ยอดเงินช่วยเหลือสะสม</span>
            <span className="text-xl font-extrabold text-emerald-900 font-mono">
              ฿{totalCashDisbursed.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">ช่วยเหลือด้านสิ่งของ/ไม่ใช่เงิน</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {totalInKindTimes} <span className="text-xs font-medium text-slate-500">ครั้ง</span>
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ระดับที่ 1: รายการความช่วยเหลือที่ส่งมอบแล้วจริง
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-700" />
            <span>ระดับที่ 1: รายการความช่วยเหลือที่ส่งมอบแล้ว ({executedAidList.length} รายการ)</span>
          </span>
          <span className="text-[11px] text-slate-500">
            เชื่อมโยงข้อมูลกับระบบติดตามผลจริง (Follow-up & Monitoring)
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {executedAidList.length === 0 ? (
            /* Empty State */
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">ยังไม่มีประวัติการช่วยเหลือ</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ผู้ขึ้นทะเบียนรายนี้ยังไม่มีประวัติการได้รับเงินหรือสิ่งของช่วยเหลือที่ดำเนินการส่งมอบเรียบร้อยแล้วในระบบ
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={onOpenNewAssistanceDialog}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>ยื่นคำร้องขอรับความช่วยเหลือ</span>
                </button>
              )}
            </div>
          ) : (
            /* Executed Aid Items List */
            <div className="space-y-4">
              {executedAidList.map((aid) => {
                const isExpanded = expandedAppId === aid.id;
                const aidAmount = aid.disbursedAmount || aid.approvedAmount || aid.requestedAmount || 0;
                const dateText = aid.disbursementDate
                  ? new Date(aid.disbursementDate).toLocaleDateString('th-TH')
                  : (aid.appliedDate || '-');

                // Find linked follow-up plan
                const linkedPlan = followUpPlans.find(
                  (p) => p.assistanceRecordId === aid.id || p.applicationNo === aid.applicationNo
                );

                const aidType = aid.assistanceType || '';
                const isCareer = aidType.includes('อาชีพ') || linkedPlan?.assistanceType === 'career';
                const isHousing = aidType.includes('ที่อยู่อาศัย') || aidType.includes('ซ่อม') || linkedPlan?.assistanceType === 'housing';
                const minVisits = linkedPlan ? linkedPlan.minVisits : (isCareer ? 6 : (isHousing ? 1 : 1));
                const completedVisits = linkedPlan ? linkedPlan.completedVisits : 0;
                const remainingVisits = linkedPlan ? linkedPlan.remainingVisits : Math.max(0, minVisits - completedVisits);
                const nextFollowupDate = linkedPlan?.nextFollowupDate || 'ยังไม่ได้กำหนดวันติดตาม';
                const progressPct = minVisits > 0 ? Math.min(100, Math.round((completedVisits / minVisits) * 100)) : 100;

                return (
                  <div
                    key={aid.id}
                    className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white hover:border-emerald-300 transition-all shadow-2xs space-y-3.5"
                  >
                    {/* Top Row: Aid ID, Status, Amount */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {aid.applicationNo}
                          </span>
                          {aid.disbursementRef && (
                            <span className="font-mono text-slate-600 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                              ใบสำคัญ: {aid.disbursementRef}
                            </span>
                          )}
                          {aid.status === 'disbursed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ส่งมอบความช่วยเหลือเรียบร้อยแล้ว</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>จ่ายแล้วบางส่วน (฿{(aid.disbursedAmount || 0).toLocaleString()} / ฿{(aid.approvedAmount || 0).toLocaleString()})</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                          <span>ประเภท: <strong className="text-slate-900">{aid.assistanceType}</strong></span>
                          <span>• วันที่จ่าย: <strong className="text-slate-900">{dateText}</strong></span>
                        </p>
                      </div>

                      {/* Right Amount Display */}
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">จำนวนเงิน / สิ่งของที่ได้รับ</span>
                        <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                          ฿{aidAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Assistance Description */}
                    <div className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-800 block text-[11px] mb-0.5">
                        รายละเอียดการช่วยเหลือ:
                      </span>
                      <p className="text-slate-600 leading-relaxed">
                        {aid.necessityDetails || aid.assistanceTypeDetails || 'ตามการพิจารณาอนุมัติของคณะกรรมการ'}
                      </p>
                    </div>

                    {/* =========================================================================
                        Follow-up Monitoring Summary Strip (ตามข้อกำหนดระดับที่ 1)
                        ========================================================================= */}
                    <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/40 border border-teal-200/80 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/50 pb-2">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4 text-teal-700" />
                          <span className="font-bold text-slate-900 text-xs">
                            การติดตามผลการช่วยเหลือ:
                          </span>
                          {getStatusBadge(linkedPlan?.status)}
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="font-mono font-bold text-teal-800 text-xs">
                            {completedVisits} / {minVisits} ครั้ง ({progressPct}%)
                          </span>
                          <div className="w-20 sm:w-28 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-teal-600 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px]">บันทึกสำเร็จจริง:</span>
                          <span className="font-extrabold text-teal-800 text-xs font-mono">
                            {completedVisits} ครั้ง
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">เกณฑ์ขั้นต่ำ:</span>
                          <span className="font-bold text-slate-800 text-xs font-mono">
                            {minVisits} ครั้ง
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">คงเหลือตามเกณฑ์:</span>
                          <span className="font-bold text-amber-800 text-xs font-mono">
                            {remainingVisits} ครั้ง
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">วันติดตามครั้งถัดไป:</span>
                          <span className="font-bold text-slate-800 text-xs truncate block">
                            {nextFollowupDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* =========================================================================
                        Action Buttons (ระดับที่ 1)
                        1. ปุ่ม “ดูรายละเอียด” (เอกสารช่วยเหลือ ใบเสร็จ ใบสำคัญจ่าย)
                        2. ปุ่ม “ดูประวัติการติดตาม” (เปิด Popup ระดับที่ 2)
                        3. ปุ่ม “บันทึกการติดตาม”
                        ========================================================================= */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {/* 1. ปุ่ม ดูรายละเอียด (เปิดดูใบเสร็จและเอกสารช่วยเหลือ) */}
                        <button
                          type="button"
                          onClick={() => onOpenReceiptModal(aid)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                          title="เปิดดูใบสำคัญจ่าย ใบเสร็จรับเงิน สลิปโอนเงิน และเอกสารส่งมอบ"
                        >
                          <Receipt className="w-3.5 h-3.5 text-slate-600" />
                          <span>ดูรายละเอียด & ใบเสร็จ</span>
                        </button>

                        {/* Toggle Inline Details */}
                        <button
                          type="button"
                          onClick={() => setExpandedAppId(isExpanded ? null : aid.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium"
                        >
                          <span>{isExpanded ? 'ย่อข้อมูล' : 'ข้อมูลเพิ่มเติม'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 2. ปุ่ม ดูประวัติการติดตาม (ระดับที่ 2 Popup) */}
                        {linkedPlan ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanForHistory(linkedPlan);
                              setSelectedAidForHistory(aid);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs active:scale-95"
                            title="เปิดดูประวัติการลงพื้นที่ติดตามทุกครั้ง เรียงจากใหม่ไปเก่า พร้อมรูปหลักฐาน"
                          >
                            <History className="w-3.5 h-3.5 text-amber-300" />
                            <span>ดูประวัติการติดตาม ({linkedPlan.completedVisits} ครั้ง)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={fetchFollowUpPlans}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                          >
                            <span>โหลดแผนติดตาม...</span>
                          </button>
                        )}

                        {/* 3. ปุ่ม บันทึกการติดตาม (ถ้ามีสิทธิ์) */}
                        {canEdit && linkedPlan && (
                          <button
                            type="button"
                            onClick={() => setSelectedPlanIdForManage(linkedPlan.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                            title="บันทึกผลการลงพื้นที่จริง พร้อมแนบรูปถ่าย"
                          >
                            <Camera className="w-3.5 h-3.5 text-teal-700" />
                            <span>บันทึกการติดตาม</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Details Area */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 space-y-3 text-xs bg-slate-50/70 p-3.5 rounded-xl animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <span className="text-slate-400 block text-[10px]">หน่วยงาน/โครงการรับผิดชอบ:</span>
                            <span className="text-slate-800 font-medium block">
                              {aid.branchName || 'กองทุนซะกาตกลาง มูลนิธิฯ'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">ผู้ดำเนินการจ่าย / เจ้าหน้าที่:</span>
                            <span className="text-slate-800 font-medium block">
                              {aid.disbursedBy || aid.assignedOfficerName || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">ผู้อนุมัติ:</span>
                            <span className="text-slate-800 font-medium block">
                              {aid.approvedBy || 'คณะกรรมการพิจารณาซะกาต'}
                              {aid.approvedDate ? ` (${new Date(aid.approvedDate).toLocaleDateString('th-TH')})` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">หมายเลขอ้างอิงการจ่าย:</span>
                            <span className="text-slate-800 font-mono block font-bold">
                              {aid.disbursementRef || aid.applicationNo}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">บันทึกการส่งมอบ:</span>
                            <span className="text-slate-700 italic block">
                              {aid.disbursementNotes || aid.approvalNotes || 'ดำเนินการส่งมอบความช่วยเหลือครบถ้วน'}
                            </span>
                          </div>
                        </div>

                        {/* Evidence preview thumbnail */}
                        {aid.disbursementProofUrl && (
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>มีไฟล์สลิป/หลักฐานส่งมอบแนบในระบบ</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => onOpenReceiptModal(aid)}
                              className="text-blue-700 hover:text-blue-900 font-bold text-xs inline-flex items-center gap-1"
                            >
                              <span>ดูหลักฐานภาพถ่าย</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          ระดับที่ 2: Popup ประวัติการติดตามผล (AssistanceFollowUpHistoryModal)
          ========================================================================= */}
      {selectedPlanForHistory && selectedAidForHistory && (
        <AssistanceFollowUpHistoryModal
          isOpen={Boolean(selectedPlanForHistory)}
          onClose={() => {
            setSelectedPlanForHistory(null);
            setSelectedAidForHistory(null);
          }}
          planId={selectedPlanForHistory.id}
          beneficiaryName={registry.fullName}
          registrationNo={registry.registrationNo}
          assistanceNo={selectedAidForHistory.applicationNo}
          assistanceType={selectedAidForHistory.assistanceType || selectedPlanForHistory.assistanceTypeName || 'ความช่วยเหลือทั่วไป'}
          onRefresh={fetchFollowUpPlans}
          canEdit={canEdit}
        />
      )}

      {/* Action Sub-Modal: Manage / Record Follow-up */}
      {selectedPlanIdForManage && (
        <ManageFollowUpModal
          isOpen={Boolean(selectedPlanIdForManage)}
          onClose={() => setSelectedPlanIdForManage(null)}
          planId={selectedPlanIdForManage}
          onSuccess={fetchFollowUpPlans}
          initialTab="record"
        />
      )}

      {/* 4. In-Progress Requests Section (Strictly Separated from executed assistance!) */}
      {pendingAidList.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between">
            <span className="font-bold text-sky-950 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-700" />
              <span>คำร้องที่อยู่ระหว่างการพิจารณา ({pendingAidList.length} รายการ)</span>
            </span>
            <span className="text-[11px] text-sky-800">
              * คำร้องเหล่านี้ยังไม่ผ่านการส่งมอบ จึงไม่นับรวมในยอดเงินช่วยเหลือที่ได้รับแล้ว
            </span>
          </div>

          <div className="p-4 space-y-2.5">
            {pendingAidList.map((app) => (
              <div
                key={app.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">{app.applicationNo}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      อยู่ระหว่างพิจารณา ({app.status})
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    ประเภท: {app.assistanceType} • ยื่นเมื่อ: {app.appliedDate || '-'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">ยอดที่ขอรับ</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    ฿{app.requestedAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
