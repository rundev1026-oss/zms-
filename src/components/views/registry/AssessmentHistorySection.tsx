'use client';

import React, { useState } from 'react';
import {
  BeneficiaryRegistryItem,
  BeneficiaryPeriodicAssessment,
} from '@/types';
import {
  History,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Calendar,
  UserCheck,
  ShieldCheck,
  X,
  RotateCcw,
  Lock,
} from 'lucide-react';

interface AssessmentHistorySectionProps {
  registry: BeneficiaryRegistryItem;
  assessments: BeneficiaryPeriodicAssessment[];
  isLoading: boolean;
  canAssess: boolean;
  canApprove: boolean;
  authToken?: string | null;
  onOpenNewAssessment: () => void;
  onRefreshAssessments: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function getAssessmentStatusMeta(status?: string | null) {
  const code = String(status || 'PENDING_ASSESSMENT').toUpperCase();
  switch (code) {
    case 'APPROVED':
      return { label: 'อนุมัติผลประเมินแล้ว', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'ELIGIBLE':
      return { label: 'ผ่านเกณฑ์', cls: 'bg-teal-100 text-teal-800 border-teal-300' };
    case 'NOT_ELIGIBLE':
      return { label: 'ไม่ผ่านเกณฑ์', cls: 'bg-rose-100 text-rose-800 border-rose-300' };
    case 'UNDER_REVIEW':
      return { label: 'กำลังพิจารณา', cls: 'bg-sky-100 text-sky-800 border-sky-300' };
    case 'PENDING_ASSESSMENT':
      return { label: 'รอประเมินสิทธิ์', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'RETURNED_FOR_CORRECTION':
      return { label: 'ส่งกลับแก้ไข', cls: 'bg-orange-100 text-orange-800 border-orange-300' };
    case 'CLOSED':
      return { label: 'ปิดรอบประเมิน', cls: 'bg-slate-200 text-slate-700 border-slate-300' };
    case 'DRAFT':
      return { label: 'ร่างการประเมิน', cls: 'bg-slate-100 text-slate-600 border-slate-300' };
    default:
      return { label: code, cls: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
}

export function getAssessmentTypeLabel(type?: string | null) {
  const code = String(type || 'PERIODIC').toUpperCase();
  if (code === 'INITIAL') return 'ประเมินครั้งแรก (Initial)';
  if (code === 'SPECIAL') return 'ประเมินกรณีพิเศษ (Special)';
  return 'ประเมินตามรอบระยะเวลา (Periodic)';
}

function extractSnapshotSummary(snap: any) {
  if (!snap || typeof snap !== 'object') return null;
  const memberObj = snap.member || snap.personal || {};
  const curAddr = snap.addresses?.current || snap.addresses?.registered || snap.address || {};
  const fin = snap.financial || snap.economy || {};
  const hh = snap.household || {};
  const cond = snap.currentCondition || {};

  const monthlyIncome = Number(fin.householdIncome ?? fin.monthlyIncome ?? fin.personalIncome ?? 0);
  const monthlyExpense = Number(fin.householdExpense ?? fin.monthlyExpense ?? fin.regularExpense ?? 0);
  const netMonthly = Number(fin.netMonthlyBalance ?? fin.netMonthly ?? monthlyIncome - monthlyExpense);
  const totalDebt = Number(fin.debtAmount ?? fin.totalDebt ?? fin.debtBurden ?? 0);
  const membersList = Array.isArray(hh.members) ? hh.members : [];
  const memberCount = Number(hh.memberCount ?? membersList.length ?? 0);

  return {
    capturedAt: snap.capturedAt || '',
    memberId: memberObj.memberId || snap.memberId || '',
    fullName: memberObj.fullName || [memberObj.title, memberObj.firstName, memberObj.lastName].filter(Boolean).join(' ') || '-',
    identityMasked: memberObj.identityMasked || memberObj.nationalIdMasked || '-',
    occupation: memberObj.occupation || '-',
    phone: memberObj.phone || '-',
    addressLine: curAddr.addressLine || curAddr.line1 || '-',
    community: curAddr.community || curAddr.villageOrMoo || '-',
    subdistrict: curAddr.subdistrict || '',
    district: curAddr.district || '',
    province: curAddr.province || '',
    housingCondition: hh.housingCondition || '-',
    monthlyIncome,
    monthlyExpense,
    netMonthly,
    totalDebt,
    memberCount,
    membersList,
    familySituation: cond.familySituationSummary || cond.familySituationNotes || '',
    urgentNeeds: cond.urgentNeeds || cond.urgentNeedsNotes || '',
    livingConstraints: cond.livingConstraints || cond.livingLimitations || '',
    officerNote: cond.officerNote || '',
  };
}

export function AssessmentHistorySection({
  registry,
  assessments,
  isLoading,
  canAssess,
  canApprove,
  authToken,
  onOpenNewAssessment,
  onRefreshAssessments,
  showToast,
}: AssessmentHistorySectionProps) {
  const [selectedSnapshotAsm, setSelectedSnapshotAsm] = useState<BeneficiaryPeriodicAssessment | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const memberCode = registry.memberCode || registry.memberId || registry.registrationNo;

  const handleUpdateAssessmentStatus = async (
    asm: BeneficiaryPeriodicAssessment,
    nextStatus: string,
    nextEligibility?: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING',
  ) => {
    setUpdatingId(asm.id);
    try {
      const token =
        authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token && token !== 'cookie-session') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/registry/${registry.id}/assessments/${asm.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          status: nextStatus,
          eligibilityResult: nextEligibility,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถอัปเดตสถานะการประเมินได้', 'error');
        return;
      }

      showToast(
        `อัปเดตสถานะระเบียน ${asm.assessmentNumber} เป็น "${getAssessmentStatusMeta(nextStatus).label}" สำเร็จ`,
        'success',
      );
      await onRefreshAssessments();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะการประเมิน', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const modalSnapshot = selectedSnapshotAsm?.memberSnapshot
    ? extractSnapshotSummary(selectedSnapshotAsm.memberSnapshot)
    : null;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <History className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              ประวัติการประเมินสิทธิ์ตามรอบระยะเวลา ({assessments.length} ครั้ง)
            </h3>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white text-emerald-800 border border-emerald-200">
              {memberCode}
            </span>
          </div>
          <p className="text-xs text-slate-600 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              ทุกครั้งที่ประเมินสิทธิ์ ระบบสร้างระเบียนใหม่แบบ Append-only พร้อมแช่แข็งข้อมูลสมาชิก (Immutable Snapshot) ณ วันประเมิน
            </span>
          </p>
        </div>

        {canAssess && (
          <button
            type="button"
            onClick={onOpenNewAssessment}
            className="zms-action inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors shrink-0"
          >
            <ClipboardCheck className="w-4 h-4" />
            ประเมินสิทธิ์ใหม่
          </button>
        )}
      </div>

      {/* Loading / Empty / Timeline List */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
          กำลังโหลดประวัติการประเมินสิทธิ์จากฐานข้อมูล...
        </div>
      ) : assessments.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
          <p className="text-sm font-semibold text-slate-700">ยังไม่มีประวัติระเบียนการประเมินสิทธิ์</p>
          <p className="text-xs text-slate-500">
            กดปุ่ม &ldquo;ประเมินสิทธิ์ใหม่&rdquo; เพื่อบันทึกผลการพิจารณาคุณสมบัติและ Snapshot รอบแรกของสมาชิก
          </p>
          {canAssess && (
            <button
              type="button"
              onClick={onOpenNewAssessment}
              className="zms-action inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
            >
              <ClipboardCheck className="w-4 h-4" />
              เริ่มประเมินสิทธิ์ครั้งแรก
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {assessments.map((asm, idx) => {
            const statusMeta = getAssessmentStatusMeta(asm.status);
            const snapSummary = extractSnapshotSummary(asm.memberSnapshot);
            const roundOrder = assessments.length - idx;

            return (
              <div
                key={asm.id}
                className={`rounded-2xl border p-4 sm:p-5 bg-white transition-all ${
                  idx === 0
                    ? 'border-emerald-300 shadow-xs ring-1 ring-emerald-500/10'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-900 text-white">
                        {asm.assessmentNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        ครั้งที่ {roundOrder}
                      </span>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                          รอบล่าสุด
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          asm.eligibilityResult === 'ELIGIBLE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : asm.eligibilityResult === 'NOT_ELIGIBLE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {asm.eligibilityResult === 'ELIGIBLE' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : asm.eligibilityResult === 'NOT_ELIGIBLE' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {asm.eligibilityResult === 'ELIGIBLE'
                          ? 'ผลประเมิน: ผ่านเกณฑ์'
                          : asm.eligibilityResult === 'NOT_ELIGIBLE'
                          ? 'ผลประเมิน: ไม่ผ่านเกณฑ์'
                          : 'ผลประเมิน: รอพิจารณา'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                      <span className="font-semibold text-slate-800">
                        รอบ: {asm.assessmentPeriod || 'ไม่ระบุรอบ'}
                      </span>
                      <span>ประเภท: {getAssessmentTypeLabel(asm.assessmentType)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        วันที่ประเมิน: {String(asm.assessmentDate || '').slice(0, 10)}
                      </span>
                      {asm.nextAssessmentDate && (
                        <span className="text-teal-700 font-medium">
                          นัดประเมินถัดไป: {asm.nextAssessmentDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Snapshot & Linked Requests Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {typeof asm.linkedRequestCount === 'number' && asm.linkedRequestCount > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold">
                        เชื่อมโยงคำร้อง {asm.linkedRequestCount} รายการ
                      </span>
                    )}
                    {snapSummary && (
                      <button
                        type="button"
                        onClick={() => setSelectedSnapshotAsm(asm)}
                        className="zms-action inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300/80 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5 text-teal-700" />
                        ดู Snapshot ณ วันประเมิน
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">หมวดผู้มีสิทธิ์ (อัสนัฟ)</span>
                    <span className="font-bold text-slate-800">{asm.asnafNameTh || (asm as any).asnaf?.nameTh || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">เจ้าหน้าที่ผู้ประเมิน</span>
                    <span className="font-semibold text-slate-700 inline-flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      {asm.assessorName || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ผู้อนุมัติผลการประเมิน</span>
                    <span className="font-semibold text-slate-700">
                      {asm.approvedByName
                        ? `${asm.approvedByName}${asm.approvedAt ? ` (${asm.approvedAt.slice(0, 10)})` : ''}`
                        : 'รออนุมัติ / บันทึกโดยเจ้าหน้าที่'}
                    </span>
                  </div>
                </div>

                {/* Frozen Snapshot Quick Strip */}
                {snapSummary && (
                  <div className="mt-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700">ข้อมูล ณ วันประเมิน (Snapshot):</span>
                    <span>รายได้ ฿{snapSummary.monthlyIncome.toLocaleString()}/ด.</span>
                    <span>รายจ่าย ฿{snapSummary.monthlyExpense.toLocaleString()}/ด.</span>
                    <span>หนี้สิน ฿{snapSummary.totalDebt.toLocaleString()}</span>
                    <span>สมาชิกครอบครัว {snapSummary.memberCount + 1} คน</span>
                    {snapSummary.province && (
                      <span>
                        พื้นที่: {snapSummary.community !== '-' ? snapSummary.community : snapSummary.subdistrict}{' '}
                        {snapSummary.province}
                      </span>
                    )}
                  </div>
                )}

                {/* Rationale & Notes */}
                <div className="mt-3 space-y-1.5 text-xs">
                  {asm.assessmentDetails && (
                    <div className="text-slate-700">
                      <span className="font-bold text-slate-800">ผลการตรวจสอบข้อมูลที่เปลี่ยนแปลง: </span>
                      {asm.assessmentDetails}
                    </div>
                  )}
                  <div className="text-slate-700">
                    <span className="font-bold text-slate-800">เหตุผลการพิจารณา: </span>
                    {asm.rationale}
                  </div>
                  {asm.recommendations && (
                    <div className="text-teal-800 bg-teal-50/60 px-3 py-1.5 rounded-lg border border-teal-100">
                      <span className="font-bold">ข้อเสนอแนะ: </span>
                      {asm.recommendations}
                    </div>
                  )}
                </div>

                {/* Approver / Officer Status Controls */}
                {(canApprove || canAssess) && asm.status !== 'CLOSED' && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-400">
                      การเปลี่ยนสถานะระเบียนประเมินนี้จะไม่เปลี่ยนแปลงรหัสสมาชิกและไม่แก้ไข Snapshot
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {canApprove && asm.status !== 'APPROVED' && (
                        <button
                          type="button"
                          disabled={updatingId === asm.id}
                          onClick={() => handleUpdateAssessmentStatus(asm, 'APPROVED', 'ELIGIBLE')}
                          className="zms-action inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          อนุมัติผลประเมิน
                        </button>
                      )}
                      {canAssess && asm.status !== 'ELIGIBLE' && asm.status !== 'APPROVED' && (
                        <button
                          type="button"
                          disabled={updatingId === asm.id}
                          onClick={() => handleUpdateAssessmentStatus(asm, 'ELIGIBLE', 'ELIGIBLE')}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold disabled:opacity-50"
                        >
                          กำหนดผ่านเกณฑ์
                        </button>
                      )}
                      {canAssess && asm.status !== 'NOT_ELIGIBLE' && (
                        <button
                          type="button"
                          disabled={updatingId === asm.id}
                          onClick={() => handleUpdateAssessmentStatus(asm, 'NOT_ELIGIBLE', 'NOT_ELIGIBLE')}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold disabled:opacity-50"
                        >
                          ไม่ผ่านเกณฑ์
                        </button>
                      )}
                      {canAssess && asm.status !== 'RETURNED_FOR_CORRECTION' && (
                        <button
                          type="button"
                          disabled={updatingId === asm.id}
                          onClick={() => handleUpdateAssessmentStatus(asm, 'RETURNED_FOR_CORRECTION', 'PENDING')}
                          className="zms-action inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          ส่งกลับแก้ไข
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Frozen Snapshot Viewer Modal */}
      {selectedSnapshotAsm && modalSnapshot && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm sm:text-base font-bold">
                    ข้อมูลสมาชิก ณ วันประเมินสิทธิ์ ({selectedSnapshotAsm.assessmentNumber})
                  </h4>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  บันทึก Snapshot เมื่อ: {modalSnapshot.capturedAt ? modalSnapshot.capturedAt.slice(0, 19).replace('T', ' ') : selectedSnapshotAsm.assessmentDate} | รหัสสมาชิก: {modalSnapshot.memberId || memberCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSnapshotAsm(null)}
                className="zms-action p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  ข้อมูลชุดนี้ถูกแช่แข็ง (Immutable Snapshot) ณ เวลาที่ประเมินสิทธิ์ แม้ภายหลังสมาชิกจะย้ายที่อยู่หรือมีรายได้เปลี่ยนแปลง ข้อมูลในรอบประเมินนี้จะยังคงเดิมทุกประการเพื่อการตรวจสอบย้อนหลัง
                </span>
              </div>

              {/* Personal & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                    ข้อมูลบุคคล ณ วันประเมิน
                  </div>
                  <div>ชื่อ-นามสกุล: <span className="font-semibold">{modalSnapshot.fullName}</span></div>
                  <div>เลขบัตรประชาชน: <span className="font-mono">{modalSnapshot.identityMasked}</span></div>
                  <div>อาชีพ: <span className="font-semibold">{modalSnapshot.occupation}</span></div>
                  <div>โทรศัพท์: <span className="font-semibold">{modalSnapshot.phone}</span></div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                    ที่อยู่อาศัย ณ วันประเมิน
                  </div>
                  <div>ที่อยู่: <span className="font-semibold">{modalSnapshot.addressLine}</span></div>
                  <div>ชุมชน/หมู่บ้าน: <span className="font-semibold">{modalSnapshot.community}</span></div>
                  <div>
                    ตำบล/อำเภอ/จังหวัด:{' '}
                    <span className="font-semibold">
                      {[modalSnapshot.subdistrict, modalSnapshot.district, modalSnapshot.province]
                        .filter(Boolean)
                        .join(' ') || '-'}
                    </span>
                  </div>
                  <div>สภาพบ้าน: <span className="font-semibold">{modalSnapshot.housingCondition}</span></div>
                </div>
              </div>

              {/* Economy */}
              <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                  ฐานะเศรษฐกิจ รายได้-รายจ่าย-หนี้สิน ณ วันประเมิน
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-50/70">
                    <div className="text-slate-500">รายได้ต่อเดือน</div>
                    <div className="font-bold text-emerald-800 text-sm">
                      ฿{modalSnapshot.monthlyIncome.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50/70">
                    <div className="text-slate-500">รายจ่ายต่อเดือน</div>
                    <div className="font-bold text-amber-800 text-sm">
                      ฿{modalSnapshot.monthlyExpense.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100">
                    <div className="text-slate-500">คงเหลือสุทธิ</div>
                    <div className="font-bold text-slate-800 text-sm">
                      ฿{modalSnapshot.netMonthly.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50/70">
                    <div className="text-slate-500">หนี้สินรวม</div>
                    <div className="font-bold text-rose-800 text-sm">
                      ฿{modalSnapshot.totalDebt.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Household Members */}
              <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                  สมาชิกในครอบครัว ณ วันประเมิน ({modalSnapshot.memberCount} คน ไม่รวมเจ้าบ้าน)
                </div>
                {modalSnapshot.membersList.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {modalSnapshot.membersList.map((m: any, i: number) => (
                      <div key={i} className="py-1.5 flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          {m.fullName} ({m.relationship || 'สมาชิก'})
                        </span>
                        <span className="text-slate-500">
                          อายุ {m.ageYears ?? '-'} ปี | อาชีพ {m.occupation || '-'} | รายได้ ฿
                          {Number(m.monthlyIncome || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400">ไม่มีรายการสมาชิกในครอบครัวเพิ่มเติม</div>
                )}
              </div>

              {/* Current Condition */}
              {(modalSnapshot.familySituation || modalSnapshot.urgentNeeds || modalSnapshot.livingConstraints) && (
                <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                    สภาพปัจจุบันและข้อจำกัด ณ วันประเมิน
                  </div>
                  {modalSnapshot.familySituation && <div>สภาพครอบครัว: {modalSnapshot.familySituation}</div>}
                  {modalSnapshot.livingConstraints && <div>ข้อจำกัดการดำรงชีพ: {modalSnapshot.livingConstraints}</div>}
                  {modalSnapshot.urgentNeeds && <div>ความจำเป็นเร่งด่วน: {modalSnapshot.urgentNeeds}</div>}
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSnapshotAsm(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                ปิดหน้าต่าง Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
