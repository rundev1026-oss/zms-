'use client';

import React, { useState, useEffect } from 'react';
import {
  BeneficiaryRegistryItem,
  BeneficiaryPeriodicAssessment,
  EvaluatorChecklist,
} from '@/types';
import {
  X,
  ClipboardCheck,
  UserCheck,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Edit3,
  ShieldCheck,
  FileCheck2,
  Sparkles,
} from 'lucide-react';

interface PeriodicAssessmentModalProps {
  isOpen: boolean;
  registry: BeneficiaryRegistryItem;
  previousAssessment?: BeneficiaryPeriodicAssessment | null;
  assessmentCount?: number;
  authToken?: string | null;
  onClose: () => void;
  onEditMemberFirst?: () => void;
  onSaved: (created: BeneficiaryPeriodicAssessment) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const ASNAF_OPTIONS = [
  { code: 'faqir', label: 'ฟะกีร (ผู้ยากไร้ ไม่มีรายได้หรือมีไม่ถึงครึ่งของความจำเป็น)' },
  { code: 'miskin', label: 'มิสกีน (ผู้ขัดสน มีรายได้แต่ไม่เพียงพอยังชีพ)' },
  { code: 'gharimin', label: 'ฆอริมีน (ผู้มีหนี้สินล้นพ้นตัวเพื่อความจำเป็นพื้นฐาน)' },
  { code: 'muallaf', label: 'มุอัลลัฟ (ผู้เข้ารับอิสลามใหม่)' },
  { code: 'fisabilillah', label: 'ฟีสะบีลิลลาฮ์ (เพื่อหนทางของอัลลอฮ์ / การศึกษา / สาธารณประโยชน์)' },
  { code: 'ibnsabil', label: 'อิบนุสสะบีล (ผู้เดินทางตกยาก)' },
  { code: 'amil', label: 'อามิล (ผู้ปฏิบัติงานจัดเก็บและบริหารซะกาต)' },
  { code: 'riqab', label: 'ริกอบ (การปลดปล่อยภาระผูกพัน)' },
];

const CHECKLIST_ITEMS: { key: keyof EvaluatorChecklist; label: string }[] = [
  { key: 'asnafVulnerability', label: 'เข้าเกณฑ์ผู้มีสิทธิ์รับซะกาตตามหลักการ 8 อัสนัฟ' },
  { key: 'economicStatus', label: 'ตรวจสอบรายได้ รายจ่าย และภาระหนี้สินเป็นปัจจุบันแล้ว' },
  { key: 'dependentBurdens', label: 'ตรวจสอบข้อมูลสมาชิกครอบครัวและผู้พึ่งพิงแล้ว' },
  { key: 'housingCondition', label: 'ตรวจสอบสภาพที่อยู่อาศัยและพิกัดที่ตั้งแล้ว' },
  { key: 'amalIbadah', label: 'การปฏิบัติศาสนกิจและการดำรงตนเหมาะสม' },
  { key: 'leaderEndorsement', label: 'ได้รับการยืนยันข้อมูลจากผู้นำศาสนา/ผู้นำชุมชน' },
];

export function PeriodicAssessmentModal({
  isOpen,
  registry,
  previousAssessment,
  assessmentCount = 0,
  authToken,
  onClose,
  onEditMemberFirst,
  onSaved,
  showToast,
}: PeriodicAssessmentModalProps) {
  const thaiYear = new Date().getFullYear() + 543;
  const nextRoundNo = Math.max(1, assessmentCount + 1);
  const todayStr = new Date().toISOString().split('T')[0];

  const [assessmentType, setAssessmentType] = useState<'PERIODIC' | 'SPECIAL' | 'INITIAL'>(
    assessmentCount > 0 ? 'PERIODIC' : 'INITIAL',
  );
  const [assessmentPeriod, setAssessmentPeriod] = useState<string>(
    assessmentCount > 0 ? `ประจำปี ${thaiYear} รอบที่ ${nextRoundNo}` : `ประจำปี ${thaiYear} (ขึ้นทะเบียนครั้งแรก)`,
  );
  const [assessmentDate, setAssessmentDate] = useState<string>(todayStr);
  const [asnafCode, setAsnafCode] = useState<string>(
    (previousAssessment?.asnafCode || registry.asnafCategory || 'miskin').toLowerCase(),
  );
  const [assessmentDetails, setAssessmentDetails] = useState<string>('');
  const [eligibilityResult, setEligibilityResult] = useState<'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING'>('ELIGIBLE');
  const [status, setStatus] = useState<string>('ELIGIBLE');
  const [rationale, setRationale] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [nextAssessmentDate, setNextAssessmentDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    asnafVulnerability: true,
    economicStatus: true,
    dependentBurdens: true,
    housingCondition: true,
    amalIbadah: true,
    leaderEndorsement: true,
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const round = Math.max(1, assessmentCount + 1);
    setAssessmentType(assessmentCount > 0 ? 'PERIODIC' : 'INITIAL');
    setAssessmentPeriod(
      assessmentCount > 0
        ? `ประจำปี ${thaiYear} รอบที่ ${round}`
        : `ประจำปี ${thaiYear} (ขึ้นทะเบียนครั้งแรก)`,
    );
    setAssessmentDate(todayStr);
    setAsnafCode((previousAssessment?.asnafCode || registry.asnafCategory || 'miskin').toLowerCase());
    setAssessmentDetails('');
    setEligibilityResult('ELIGIBLE');
    setStatus('ELIGIBLE');
    setRationale('');
    setRecommendations('');
  }, [isOpen, registry.id, assessmentCount, previousAssessment?.asnafCode, registry.asnafCategory, thaiYear, todayStr]);

  if (!isOpen) return null;

  const memberCode = registry.memberCode || registry.memberId || registry.registrationNo;

  const handleEligibilityChange = (next: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING') => {
    setEligibilityResult(next);
    if (next === 'ELIGIBLE') setStatus('ELIGIBLE');
    else if (next === 'NOT_ELIGIBLE') setStatus('NOT_ELIGIBLE');
    else setStatus('UNDER_REVIEW');
  };

  const setNextDateOffsetMonths = (months: number) => {
    const base = assessmentDate ? new Date(assessmentDate) : new Date();
    base.setMonth(base.getMonth() + months);
    setNextAssessmentDate(base.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rationale.trim() || rationale.trim().length < 3) {
      showToast('กรุณาระบุเหตุผลประกอบการพิจารณาสิทธิ์อย่างน้อย 3 ตัวอักษร', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token =
        authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token && token !== 'cookie-session') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/registry/${registry.id}/assessments`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          asnafCode,
          assessmentType,
          assessmentPeriod: assessmentPeriod.trim(),
          assessmentDate,
          assessmentDetails: assessmentDetails.trim() || undefined,
          eligibilityResult,
          status,
          rationale: rationale.trim(),
          recommendations: recommendations.trim() || undefined,
          nextAssessmentDate: nextAssessmentDate || null,
          checklist,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึกผลการประเมินสิทธิ์รอบใหม่ได้', 'error');
        return;
      }

      const created: BeneficiaryPeriodicAssessment = json.data;
      showToast(
        `บันทึกการประเมินสิทธิ์รอบใหม่สำเร็จ (${created.assessmentNumber}) โดยใช้รหัสสมาชิกเดิม ${memberCode}`,
        'success',
      );
      onSaved(created);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบประเมินสิทธิ์', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <ClipboardCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">
                  ประเมินสิทธิ์ผู้รับซะกาตรอบใหม่ (Periodic Re-Assessment)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                  รหัสสมาชิกถาวร: {memberCode}
                </span>
              </div>
              <p className="text-xs text-emerald-100/85 mt-0.5">
                สร้างระเบียนผลการประเมินใหม่ (ASM-...) พร้อมบันทึก Snapshot ข้อมูลสมาชิก ณ วันประเมิน โดยไม่สร้างทะเบียนบุคคลซ้ำ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Step 1 & 2: Current Member Data Verification Banner */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                  1. ข้อมูลสมาชิกปัจจุบันที่จะถูกบันทึกเป็น Snapshot ในรอบประเมินนี้
                </span>
              </div>
              {onEditMemberFirst && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditMemberFirst();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-teal-300 text-teal-800 hover:bg-teal-100 text-xs font-semibold transition-colors shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  ข้อมูลสมาชิกเปลี่ยน? แก้ไขข้อมูลปัจจุบันก่อนประเมิน
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                <div className="text-slate-400">ชื่อ-นามสกุล</div>
                <div className="font-bold text-slate-800 mt-0.5">{registry.fullName}</div>
                <div className="text-[11px] text-slate-500">
                  สมาชิกครัวเรือน {(registry.householdMembers?.length || 0) + 1} คน
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                <div className="text-slate-400">รายได้ / รายจ่ายต่อเดือน</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  ฿{(registry.monthlyIncome || 0).toLocaleString()} / ฿{(registry.monthlyExpense || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">
                  สุทธิ: ฿{(registry.netIncome || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                <div className="text-slate-400">ภาระหนี้สินรวม</div>
                <div className="font-bold text-rose-700 mt-0.5">
                  ฿{(registry.debtAmount || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {registry.occupation || 'ไม่ระบุอาชีพ'}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                <div className="text-slate-400">พื้นที่ / ชุมชน</div>
                <div className="font-bold text-slate-800 mt-0.5 truncate">
                  {registry.community || registry.subdistrict || '-'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {registry.district} {registry.province}
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Previous Assessment Summary */}
          {previousAssessment ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. ผลการประเมินสิทธิ์ครั้งล่าสุด ({previousAssessment.assessmentNumber})
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  วันที่ประเมิน: {previousAssessment.assessmentDate} | รอบ: {previousAssessment.assessmentPeriod || '-'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">หมวดอัสนัฟเดิม: </span>
                  <span className="font-semibold text-slate-800">{previousAssessment.asnafNameTh}</span>
                </div>
                <div>
                  <span className="text-slate-500">ผลการประเมินเดิม: </span>
                  <span
                    className={`font-bold ${
                      previousAssessment.eligibilityResult === 'ELIGIBLE'
                        ? 'text-emerald-700'
                        : previousAssessment.eligibilityResult === 'NOT_ELIGIBLE'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {previousAssessment.eligibilityResult === 'ELIGIBLE'
                      ? 'ผ่านเกณฑ์'
                      : previousAssessment.eligibilityResult === 'NOT_ELIGIBLE'
                      ? 'ไม่ผ่านเกณฑ์'
                      : 'รอพิจารณา'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">ผู้ประเมินเดิม: </span>
                  <span className="font-medium text-slate-700">{previousAssessment.assessorName || '-'}</span>
                </div>
              </div>
              {previousAssessment.rationale && (
                <div className="mt-2 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200/80">
                  <span className="font-semibold text-slate-700">เหตุผลครั้งก่อน: </span>
                  {previousAssessment.rationale}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-center gap-2.5 text-xs text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>สมาชิกนี้ยังไม่มีประวัติระเบียนการประเมินสิทธิ์ ระบบจะบันทึกเป็นการประเมินสิทธิ์รอบแรกของสมาชิก</span>
            </div>
          )}

          {/* Step 4: Assessment Round Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ประเภทการประเมิน <span className="text-rose-500">*</span>
              </label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="PERIODIC">ประเมินสิทธิ์ตามรอบระยะเวลา (Periodic)</option>
                <option value="SPECIAL">ประเมินกรณีพิเศษ / เหตุฉุกเฉิน (Special)</option>
                <option value="INITIAL">ประเมินเมื่อขึ้นทะเบียนครั้งแรก (Initial)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รอบการประเมิน (Assessment Period) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={assessmentPeriod}
                onChange={(e) => setAssessmentPeriod(e.target.value)}
                placeholder={`เช่น ประจำปี ${thaiYear} รอบที่ ${nextRoundNo}`}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {[
                  `ประจำปี ${thaiYear} รอบที่ 1`,
                  `ประจำปี ${thaiYear} รอบที่ 2`,
                  `ทบทวนสิทธิ์ครึ่งปีหลัง ${thaiYear}`,
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAssessmentPeriod(preset)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่ประเมินสิทธิ์ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Asnaf Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              กลุ่มผู้มีสิทธิ์รับซะกาต (อัสนัฟ 8 ประเภท) ในรอบประเมินนี้ <span className="text-rose-500">*</span>
            </label>
            <select
              value={asnafCode}
              onChange={(e) => setAsnafCode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {ASNAF_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Verification Checklist */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <FileCheck2 className="w-4 h-4 text-emerald-700" />
              <span>รายการตรวจสอบข้อมูลประกอบการประเมินสิทธิ์ (Checklist)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CHECKLIST_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-2.5 p-2 rounded-lg border border-slate-200/80 hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checklist[item.key])}
                    onChange={(e) =>
                      setChecklist((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Eligibility Decision & Workflow Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ผลการพิจารณาสิทธิ์ (Eligibility Result) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleEligibilityChange('ELIGIBLE')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    eligibilityResult === 'ELIGIBLE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ผ่านเกณฑ์</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEligibilityChange('NOT_ELIGIBLE')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    eligibilityResult === 'NOT_ELIGIBLE'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>ไม่ผ่านเกณฑ์</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEligibilityChange('PENDING')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    eligibilityResult === 'PENDING'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>รอพิจารณา</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                สถานะการประเมินสิทธิ์ (แยกจากสถานะสมาชิก) <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="ELIGIBLE">ผ่านเกณฑ์ (ELIGIBLE)</option>
                <option value="APPROVED">อนุมัติผลการประเมินแล้ว (APPROVED)</option>
                <option value="UNDER_REVIEW">กำลังพิจารณาตรวจสอบ (UNDER_REVIEW)</option>
                <option value="PENDING_ASSESSMENT">รอประเมินสิทธิ์ (PENDING_ASSESSMENT)</option>
                <option value="NOT_ELIGIBLE">ไม่ผ่านเกณฑ์ (NOT_ELIGIBLE)</option>
                <option value="RETURNED_FOR_CORRECTION">ส่งกลับแก้ไขข้อมูลประเมิน (RETURNED_FOR_CORRECTION)</option>
                <option value="DRAFT">ร่างการประเมิน (DRAFT)</option>
              </select>
            </div>
          </div>

          {/* Assessment Details & Rationale */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รายละเอียดการตรวจสอบข้อมูลที่เปลี่ยนแปลง / สภาพปัจจุบัน
              </label>
              <textarea
                rows={3}
                value={assessmentDetails}
                onChange={(e) => setAssessmentDetails(e.target.value)}
                placeholder="บันทึกรายละเอียดจากการลงพื้นที่หรือสัมภาษณ์ เช่น รายได้ครัวเรือนลดลง มีผู้ป่วยติดเตียงเพิ่ม หรือปลดหนี้บางส่วน..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เหตุผลประกอบการพิจารณาสิทธิ์ <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="ระบุเหตุผลที่ให้ผ่านเกณฑ์ / ไม่ผ่านเกณฑ์ / รอพิจารณา เพื่อใช้อ้างอิงในประวัติการประเมิน..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Recommendations & Next Assessment Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ข้อเสนอแนะแนวทางการช่วยเหลือ (Recommendations)
              </label>
              <input
                type="text"
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="เช่น เห็นควรเสนอรับทุนยังชีพรายเดือน หรือทุนซ่อมแซมที่อยู่อาศัย..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                กำหนดวันประเมินสิทธิ์รอบถัดไป (Next Assessment Date)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={nextAssessmentDate}
                  onChange={(e) => setNextAssessmentDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setNextDateOffsetMonths(6)}
                  className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  +6 เดือน
                </button>
                <button
                  type="button"
                  onClick={() => setNextDateOffsetMonths(12)}
                  className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  +1 ปี
                </button>
              </div>
            </div>
          </div>

          {/* Safety Guarantee Note */}
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3 flex items-start gap-2.5 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">หลักการทะเบียนสมาชิกเดียว (Single Member Registry):</span>{' '}
              การบันทึกครั้งนี้จะสร้างเฉพาะระเบียนประเมินสิทธิ์ใหม่ภายใต้รหัสสมาชิก{' '}
              <span className="font-mono font-bold">{memberCode}</span> โดยไม่ลบหรือแก้ไขประวัติการประเมินเดิม
              และข้อมูล Snapshot ณ วันประเมินจะถูกเก็บไว้เป็นหลักฐานถาวร
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-60"
            >
              <ClipboardCheck className="w-4 h-4" />
              {isSubmitting ? 'กำลังบันทึกผลการประเมิน...' : 'บันทึกผลการประเมินสิทธิ์รอบใหม่'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

