'use client';

import React from 'react';
import { ClipboardCheck, Edit, Eye, FilePlus2, HeartHandshake, MapPin, Phone, Trash2 } from 'lucide-react';
import { CardViewGrid } from '@/components/common/CardViewGrid';
import { SIZE_PRESETS, cardInnerGap, type CardViewLayout } from '@/lib/cardViewSettings';
import type { AssistanceApplication, BeneficiaryRegistryItem } from '@/types';

const PENDING_REQUEST_STATUSES = new Set([
  'draft',
  'submitted',
  'doc_review',
  'field_inspection',
  'pending_approval',
  'assessment',
  'assessing',
  'need_info',
  'under_review',
]);
const APPROVED_REQUEST_STATUSES = new Set(['approved', 'wait_disbursement', 'pending_disbursement']);

export interface RegistryRequestStats {
  total: number;
  pending: number;
  approved: number;
  disbursed: number;
}

export function resolveRequestStats(
  reg: BeneficiaryRegistryItem,
  applications: AssistanceApplication[],
): RegistryRequestStats {
  if (
    typeof reg.pendingRequestCount === 'number' &&
    typeof reg.approvedRequestCount === 'number' &&
    typeof reg.disbursedAidCount === 'number'
  ) {
    const classified = reg.pendingRequestCount + reg.approvedRequestCount + reg.disbursedAidCount;
    if (classified > 0 || (reg.assistanceApplicationsCount ?? 0) === 0) {
      return {
        total: reg.assistanceApplicationsCount ?? classified,
        pending: reg.pendingRequestCount,
        approved: reg.approvedRequestCount,
        disbursed: reg.disbursedAidCount,
      };
    }
  }

  const mine = applications.filter(
    (app) => app.beneficiaryId === reg.id || (reg.memberId && app.memberId === reg.memberId),
  );
  let pending = 0;
  let approved = 0;
  let disbursed = 0;
  for (const app of mine) {
    const status = String(app.status || '').toLowerCase();
    const paid = Number(app.disbursedAmount || 0) > 0;
    const actuallyPaid =
      status === 'disbursed' ||
      status === 'completed' ||
      (paid && ['disbursed', 'completed', 'closed', 'followup'].includes(status));
    if (actuallyPaid) disbursed += 1;
    else if (APPROVED_REQUEST_STATUSES.has(status)) approved += 1;
    else if (PENDING_REQUEST_STATUSES.has(status)) pending += 1;
  }
  return {
    total: reg.assistanceApplicationsCount ?? mine.length,
    pending,
    approved,
    disbursed,
  };
}

export function registryAssessmentMeta(reg: BeneficiaryRegistryItem): { key: string; label: string; cls: string } {
  const latest = reg.latestAssessment;
  const status = String(latest?.status || '').toUpperCase();
  const eligibility = String(latest?.eligibilityResult || (latest as { resultCode?: string } | null | undefined)?.resultCode || '').toUpperCase();
  if (status === 'NOT_ELIGIBLE' || eligibility === 'NOT_ELIGIBLE' || (!latest && reg.registrationStatus === 'disqualified')) {
    return { key: 'ineligible', label: 'ไม่มีคุณสมบัติตามเกณฑ์', cls: 'bg-rose-50 text-rose-800 border-rose-200' };
  }
  if (status === 'ELIGIBLE' || status === 'APPROVED' || eligibility === 'ELIGIBLE' || (!latest && reg.registrationStatus === 'qualified')) {
    return { key: 'eligible', label: 'มีคุณสมบัติตามเกณฑ์', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  }
  if (status === 'RETURNED_FOR_CORRECTION' || status === 'NEEDS_CORRECTION' || (!latest && reg.registrationStatus === 'need_more_info')) {
    return { key: 'reassess', label: 'ต้องประเมินใหม่', cls: 'bg-orange-50 text-orange-800 border-orange-200' };
  }
  if (
    status === 'UNDER_REVIEW' ||
    status === 'DRAFT' ||
    status === 'PENDING_REVIEW' ||
    (!latest && ['pending_verification', 'pending_survey', 'pending_qualification'].includes(reg.registrationStatus))
  ) {
    return { key: 'review', label: 'รอตรวจสอบ', cls: 'bg-sky-50 text-sky-800 border-sky-200' };
  }
  return { key: 'pending_assessment', label: 'รอประเมิน', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
}

function maskCardNationalId(value?: string | null) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 13 && !raw.includes('X')) {
    return `${digits[0]}-${digits.slice(1, 5)}-XXXXX-${digits.slice(10, 12)}-${digits[12]}`;
  }
  return raw || '-';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('th-TH');
}

interface BeneficiaryRegistryCardsProps {
  items: BeneficiaryRegistryItem[];
  applications: AssistanceApplication[];
  layout: CardViewLayout;
  memberCode: (reg: BeneficiaryRegistryItem) => string;
  memberStatus: (reg: BeneficiaryRegistryItem) => { label: string; cls: string };
  asnafLabel: (reg: BeneficiaryRegistryItem) => string;
  personName: (reg: BeneficiaryRegistryItem) => string;
  canEdit: (reg: BeneficiaryRegistryItem) => boolean;
  canAssess: boolean;
  canDelete: boolean;
  onOpen: (reg: BeneficiaryRegistryItem, section?: 'member_info' | 'aid_history') => void;
  onEdit: (reg: BeneficiaryRegistryItem) => void;
  onAssess: (reg: BeneficiaryRegistryItem) => void;
  onRequest: (reg: BeneficiaryRegistryItem) => void;
  onDelete: (reg: BeneficiaryRegistryItem) => void;
}

export function BeneficiaryRegistryCards({
  items,
  applications,
  layout,
  memberCode,
  memberStatus,
  asnafLabel,
  personName,
  canEdit,
  canAssess,
  canDelete,
  onOpen,
  onEdit,
  onAssess,
  onRequest,
  onDelete,
}: BeneficiaryRegistryCardsProps) {
  const preset = SIZE_PRESETS[layout.size];
  const innerGap = cardInnerGap(layout);

  if (items.length === 0) {
    return (
      <div className="px-6 py-14 text-center text-slate-400">
        <p className="font-semibold text-slate-600">ไม่พบข้อมูลสมาชิกตามเงื่อนไขที่เลือก</p>
        <p className="mt-1 text-[11px]">ลองปรับคำค้นหา หรือตัวกรอง แล้วดูรายการอีกครั้ง</p>
      </div>
    );
  }

  return (
    <CardViewGrid layout={layout} className="p-4">
      {items.map((reg) => {
        const code = memberCode(reg);
        const status = memberStatus(reg);
        const assessment = registryAssessmentMeta(reg);
        const requests = resolveRequestStats(reg, applications);
        const place = [reg.community, reg.subdistrict, reg.district, reg.province].filter(Boolean).join(' / ') || '-';
        const maskedId = maskCardNationalId(reg.nationalIdMasked);

        return (
          <article
            key={reg.id}
            className="flex min-w-0 flex-col rounded-2xl border border-[#E2E8F0] bg-white shadow-xs transition-shadow hover:border-[#0D9488] hover:shadow-md"
            style={{
              padding: layout.paddingPx,
              minHeight: layout.minHeightPx,
              gap: innerGap,
              fontSize: preset.bodyPx,
            }}
          >
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono font-bold text-[#0B2545]" style={{ fontSize: preset.titlePx - 1 }}>{code}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">ขึ้นทะเบียน {formatDate(reg.registeredDate)}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${status.cls}`}>{status.label}</span>
            </header>

            <div className="min-w-0 space-y-1">
              <h3 className="font-black leading-tight text-[#0B2545]" style={{ fontSize: preset.titlePx + 2 }}>{personName(reg)}</h3>
              <p className="text-slate-600">
                {typeof reg.age === 'number' && reg.age > 0 ? `${reg.age} ปี` : 'ไม่ระบุอายุ'}
                <span className="mx-1.5 text-slate-300">•</span>
                <Phone className="mr-1 inline h-3 w-3" />
                {reg.phone || '-'}
              </p>
              <p className="text-[11px] text-slate-400">บัตรประชาชน {maskedId}</p>
              <p className="flex items-start gap-1 text-slate-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0D9488]" />
                <span>{place}</span>
              </p>
              <p className="text-slate-600">สาขา: {reg.branchName || 'ไม่ระบุสาขา'}</p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F4F7FB] p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-teal-800">{asnafLabel(reg)}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${assessment.cls}`}>{assessment.label}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                ประเมินล่าสุด {formatDate(reg.latestAssessment?.assessmentDate)} • รอบ {reg.latestAssessment?.assessmentPeriod || 'ไม่ระบุรอบ'}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <dt className="text-slate-500">คำร้องทั้งหมด</dt>
                <dd className="font-black text-slate-900">{requests.total}</dd>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-1.5">
                <dt className="text-amber-800">รอพิจารณา</dt>
                <dd className="font-black text-amber-950">{requests.pending}</dd>
              </div>
              <div className="rounded-lg bg-sky-50 px-2 py-1.5">
                <dt className="text-sky-800">อนุมัติแล้ว</dt>
                <dd className="font-black text-sky-950">{requests.approved}</dd>
              </div>
              <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
                <dt className="text-emerald-800">ช่วยเหลือจริง</dt>
                <dd className="font-black text-emerald-950">{requests.disbursed}</dd>
              </div>
            </dl>

            <div className="mt-auto flex flex-wrap gap-1.5">
              <button type="button" onClick={() => onOpen(reg, 'member_info')} className="zms-action inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-[#0B2545] hover:bg-slate-50">
                <Eye className="h-3.5 w-3.5" /> ดูรายละเอียด
              </button>
              {canEdit(reg) && (
                <button type="button" onClick={() => onEdit(reg)} className="zms-action inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100">
                  <Edit className="h-3.5 w-3.5" /> แก้ไข
                </button>
              )}
              {canAssess && (
                <button type="button" onClick={() => onAssess(reg)} className="zms-action inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-800 hover:bg-teal-100">
                  <ClipboardCheck className="h-3.5 w-3.5" /> ประเมินสิทธิ์
                </button>
              )}
              <button type="button" onClick={() => onRequest(reg)} className="zms-action inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100">
                <FilePlus2 className="h-3.5 w-3.5" /> ยื่นคำร้อง
              </button>
              <button type="button" onClick={() => onOpen(reg, 'aid_history')} className="zms-action inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                <HeartHandshake className="h-3.5 w-3.5" /> ประวัติการช่วยเหลือ
              </button>
              {canDelete && (
                <button type="button" onClick={() => onDelete(reg)} className="zms-action inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50">
                  <Trash2 className="h-3.5 w-3.5" /> จำหน่าย
                </button>
              )}
            </div>
          </article>
        );
      })}
    </CardViewGrid>
  );
}
