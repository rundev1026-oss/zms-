'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  DollarSign,
  FileText,
  HeartHandshake,
  History,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AssistanceApplication,
  BeneficiaryPeriodicAssessment,
  BeneficiaryRegistryItem,
  EvaluatorChecklist,
  RegistrationStatus,
  ToastType,
} from '@/types';
import { PersonalSection, PersonalSubTab } from '@/components/views/registry/PersonalSection';
import { LocationSection } from '@/components/views/registry/LocationSection';
import { CoordinatorSection } from '@/components/views/registry/CoordinatorSection';
import { DocumentsSection } from '@/components/views/registry/DocumentsSection';
import { AssistanceHistorySection } from '@/components/views/registry/AssistanceHistorySection';
import { StatusSection } from '@/components/views/registry/StatusSection';
import { AssessmentHistorySection, getAssessmentStatusMeta } from '@/components/views/registry/AssessmentHistorySection';
import { MemberRequestsSection } from '@/components/views/registry/MemberRequestsSection';
import { registryAssessmentMeta, resolveRequestStats } from '@/components/views/registry/BeneficiaryRegistryCards';
import { MemberWorkflowTracker } from '@/components/views/registry/MemberWorkflowTracker';
import { LocationData } from '@/components/common/GoogleMapsLocationPicker';

export const PROFILE_SECTION_ANCHOR: Record<string, string> = {
  member_info: 'profile-personal',
  personal: 'profile-personal',
  family: 'profile-family',
  economy: 'profile-economy',
  limitations: 'profile-limitations',
  location: 'profile-location',
  coordinator: 'profile-coordinator',
  status: 'profile-status',
  assessments: 'profile-assessment',
  requests: 'profile-requests',
  aid_history: 'profile-aid',
  assistance_history: 'profile-aid',
  documents: 'profile-documents',
  audit: 'profile-audit',
};

const NAV_ITEMS = [
  { id: 'profile-overview', label: 'ภาพรวม' },
  { id: 'profile-personal', label: 'ข้อมูลสมาชิก' },
  { id: 'profile-family', label: 'ครอบครัว' },
  { id: 'profile-economy', label: 'รายได้ รายจ่าย และหนี้สิน' },
  { id: 'profile-limitations', label: 'สภาพปัจจุบัน' },
  { id: 'profile-location', label: 'พิกัดบ้าน' },
  { id: 'profile-coordinator', label: 'ผู้ประสานงาน' },
  { id: 'profile-status', label: 'สถานะและประวัติ' },
  { id: 'profile-requests', label: 'คำร้องและการช่วยเหลือ' },
  { id: 'profile-documents', label: 'เอกสารแนบ' },
  { id: 'profile-audit', label: 'ประวัติการแก้ไข' },
];

function moneyText(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'ยังไม่มีข้อมูล';
  return `฿${Number(value).toLocaleString('th-TH')}`;
}

function dateText(value?: string | null) {
  if (!value) return 'ยังไม่มีข้อมูล';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ยังไม่มีข้อมูล';
  return date.toLocaleDateString('th-TH');
}

function ProfileBlock({
  id,
  title,
  subtitle,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B2545] text-white">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[17px] font-bold leading-6 text-[#0B2545] sm:text-lg">{title}</span>
            <span className="mt-0.5 block text-[13px] leading-5 text-slate-500">{subtitle}</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-[#E2E8F0] bg-[#F4F7FB] p-3 sm:p-4">{children}</div>}
    </section>
  );
}

function AuditTimeline({ beneficiaryId, editHistory }: { beneficiaryId: string; editHistory?: BeneficiaryRegistryItem['editHistory'] }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/registry/${beneficiaryId}/audit-history`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.success && Array.isArray(json.data)) setLogs(json.data);
        else setError(json.error || 'ไม่สามารถดึงประวัติได้');
      })
      .catch((err) => {
        if (active) setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [beneficiaryId]);

  const fieldHistory = editHistory || [];

  return (
    <div className="space-y-4">
      {fieldHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#0B2545]">การเปลี่ยนแปลงรายฟิลด์</h4>
          {fieldHistory.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-slate-800">{item.editedByName || 'ไม่ระบุผู้แก้ไข'}</strong>
                <span className="font-mono text-slate-500">{dateText(item.timestamp)} {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
              {item.changesDetail && item.changesDetail.length > 0 ? (
                <ul className="mt-2 space-y-1 text-slate-700">
                  {item.changesDetail.map((change, index) => (
                    <li key={`${item.id}-${change.field}-${index}`}>
                      <span className="font-semibold">{change.fieldLabel || change.field}:</span>{' '}
                      {String(change.oldValue ?? '-')} → {String(change.newValue ?? '-')}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-slate-600">{item.changesSummary || 'มีการแก้ไขข้อมูลทะเบียน'}</p>
              )}
              {item.notes && <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-slate-600">เหตุผล: {item.notes}</p>}
            </article>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">กำลังโหลดประวัติการแก้ไข...</p>
      ) : error ? (
        <p className="text-xs font-semibold text-rose-700">{error}</p>
      ) : logs.length === 0 && fieldHistory.length === 0 ? (
        <p className="text-xs text-slate-500">ยังไม่มีประวัติการแก้ไข</p>
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#0B2545]">บันทึกการปฏิบัติงาน</h4>
          {logs.map((log) => {
            const meta = log.metadata || {};
            return (
              <article key={log.id} className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-slate-800">{log.actorName || 'ไม่ระบุผู้ดำเนินการ'}</strong>
                  <span className="font-mono text-slate-500">{log.createdAt ? new Date(log.createdAt).toLocaleString('th-TH') : '-'}</span>
                </div>
                <p className="mt-1 text-slate-600">{log.action}</p>
                {meta.reason && <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-slate-700">เหตุผล: {meta.reason}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface BeneficiaryIntegratedProfileProps {
  registry: BeneficiaryRegistryItem;
  applications: AssistanceApplication[];
  memberAssessments: BeneficiaryPeriodicAssessment[];
  isLoadingAssessments: boolean;
  isEditing: boolean;
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  canEdit: boolean;
  canAssess: boolean;
  canApprove: boolean;
  canViewUnmaskedId: boolean;
  authToken?: string | null;
  asnafLabels: Record<string, string>;
  statusLabels: Record<RegistrationStatus, { label: string; color: string; bg: string; border: string }>;
  focusRequest: { id: string; nonce: number } | null;
  isSavingLocation: boolean;
  isSavingChecklist: boolean;
  onStartEdit: (section: PersonalSubTab | 'coordinator') => void;
  onSaveLocationDirectly: (loc: LocationData, status: 'not_specified' | 'pending_verification' | 'verified') => Promise<boolean>;
  onOpenStatusDialog: () => void;
  onOpenHistoryModal: () => void;
  onSaveChecklist: (checklist: EvaluatorChecklist) => Promise<void>;
  onRefreshRegistry: () => Promise<void>;
  onOpenNewAssessment: () => void;
  onRefreshAssessments: () => Promise<void>;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  onOpenCreateRequest: () => void;
  onNavigateToRequests: (requestId?: string) => void;
  onOpenReceiptModal: (app: AssistanceApplication) => void;
}

export function BeneficiaryIntegratedProfile({
  registry,
  applications,
  memberAssessments,
  isLoadingAssessments,
  isEditing,
  editForm,
  setEditForm,
  canEdit,
  canAssess,
  canApprove,
  canViewUnmaskedId,
  authToken,
  asnafLabels,
  statusLabels,
  focusRequest,
  isSavingLocation,
  isSavingChecklist,
  onStartEdit,
  onSaveLocationDirectly,
  onOpenStatusDialog,
  onOpenHistoryModal,
  onSaveChecklist,
  onRefreshRegistry,
  onOpenNewAssessment,
  onRefreshAssessments,
  showToast,
  onOpenCreateRequest,
  onNavigateToRequests,
  onOpenReceiptModal,
}: BeneficiaryIntegratedProfileProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_ITEMS.map((item) => [item.id, true])),
  );
  const [activeId, setActiveId] = useState(NAV_ITEMS[0].id);

  useEffect(() => {
    if (!focusRequest?.id) return;
    const parent = focusRequest.id === 'profile-assessment'
      ? 'profile-status'
      : focusRequest.id === 'profile-aid'
        ? 'profile-requests'
        : focusRequest.id;
    setOpenIds((prev) => ({ ...prev, [parent]: true, [focusRequest.id]: true }));
    setActiveId(focusRequest.id);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(focusRequest.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest]);

  const latest = memberAssessments[0] || registry.latestAssessment || null;
  const assessment = latest
    ? registryAssessmentMeta({
        ...registry,
        latestAssessment: latest as BeneficiaryRegistryItem['latestAssessment'],
        registrationStatus: 'draft',
      })
    : { key: 'pending_assessment', label: 'ยังไม่ประเมิน', cls: 'bg-slate-50 text-slate-700 border-slate-200' };
  const workflow = latest ? getAssessmentStatusMeta(latest.status) : null;
  const stats = resolveRequestStats(registry, applications);
  const householdCount = Array.isArray(registry.householdMembers) ? registry.householdMembers.length : null;
  const income = registry.monthlyIncome === null || registry.monthlyIncome === undefined ? null : Number(registry.monthlyIncome);
  const expense = registry.monthlyExpense === null || registry.monthlyExpense === undefined ? null : Number(registry.monthlyExpense);
  const debt = registry.debtAmount === null || registry.debtAmount === undefined ? null : Number(registry.debtAmount);
  const net = income === null || expense === null || Number.isNaN(income) || Number.isNaN(expense) ? null : income - expense;
  const asOf = dateText(registry.updatedAt || registry.registeredDate);

  const toggle = (id: string) => {
    if (isEditing) return;
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const jump = (id: string) => {
    setActiveId(id);
    setOpenIds((prev) => ({ ...prev, [id]: true }));
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const personalProps = {
    registry,
    isEditing,
    editForm,
    setEditForm,
    canEdit,
    asnafLabels,
    canViewUnmaskedId,
    showSubNav: false,
    setActiveSubTab: () => undefined,
  };

  const kpis = [
    { label: 'สมาชิกครอบครัว', value: householdCount === null ? 'ยังไม่มีข้อมูล' : `${householdCount} คน`, icon: Users },
    { label: 'รายได้ต่อเดือน', value: moneyText(Number.isNaN(income as number) ? null : income), icon: Wallet },
    { label: 'รายจ่ายต่อเดือน', value: moneyText(Number.isNaN(expense as number) ? null : expense), icon: DollarSign },
    { label: 'หนี้สินรวม', value: moneyText(Number.isNaN(debt as number) ? null : debt), icon: AlertTriangle },
    { label: 'จำนวนคำร้อง', value: `${stats.total}`, icon: FileText },
    { label: 'ช่วยเหลือจริง', value: `${stats.disbursed} ครั้ง`, icon: HeartHandshake },
    { label: 'สถานะประเมิน', value: assessment.label, icon: ClipboardCheck },
    { label: 'วันที่ประเมิน', value: dateText(latest?.assessmentDate), icon: Calendar },
  ];

  return (
    <div className="member-profile-mobile space-y-2.5 md:space-y-4">
      <style>{`
        .member-profile-mobile { line-height: 1.6; }
        @media (max-width: 767px) {
          .member-profile-mobile .text-xs { font-size: 15px; line-height: 1.6; }
          .member-profile-mobile .text-\\[11px\\],
          .member-profile-mobile .text-\\[10px\\],
          .member-profile-mobile .text-\\[10\\.5px\\] { font-size: 13px; line-height: 1.5; }
          .member-profile-mobile input,
          .member-profile-mobile select,
          .member-profile-mobile textarea { min-height: 44px; font-size: 16px; }
        }
      `}</style>
      <section id="profile-overview" className="scroll-mt-24 rounded-2xl border border-[#E2E8F0] bg-white p-2.5 sm:p-4">
        <div className="mb-2">
          <h3 className="text-[17px] font-black leading-6 text-[#0B2545] sm:text-[18px] sm:leading-7">ภาพรวมสมาชิก</h3>
          <p className="text-[13px] leading-5 text-slate-500">ข้อมูลปัจจุบัน ณ {asOf} · อนุมัติแล้วยังไม่จ่าย {stats.approved} รายการ · คงเหลือสุทธิ {moneyText(net)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="flex min-h-[88px] flex-col rounded-xl border border-[#E2E8F0] bg-[#F4F7FB] p-2.5 sm:p-3">
                <div className="mb-1 flex items-start gap-1.5 text-[13px] font-semibold leading-5 text-slate-500">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
                  <span className="min-w-0">{item.label}</span>
                </div>
                <strong className="mt-auto block break-words text-[18px] font-black tabular-nums leading-6 text-[#0B2545] sm:text-[20px] sm:leading-7">{item.value}</strong>
              </article>
            );
          })}
        </div>
        {workflow && <p className="mt-3 text-[13px] leading-6 text-slate-500">สถานะงานประเมิน: {workflow.label}</p>}
      </section>

      <MemberWorkflowTracker
        registry={registry}
        assessments={memberAssessments}
        applications={applications}
        onOpenAssessment={() => jump('profile-assessment')}
        onOpenRequest={(id) => {
          jump('profile-requests');
          onNavigateToRequests(id);
        }}
        onCreateRequest={onOpenCreateRequest}
      />

      <div className="sticky top-0 z-20 md:hidden">
        <label htmlFor="profile-section-picker" className="sr-only">เลือกหมวดข้อมูล</label>
        <select
          id="profile-section-picker"
          value={NAV_ITEMS.some((item) => item.id === activeId) ? activeId : 'profile-overview'}
          onChange={(event) => jump(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[15px] font-bold text-[#0B2545] shadow-sm"
        >
          {NAV_ITEMS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>

      <nav className="sticky top-0 z-20 hidden overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white/95 px-2 py-2 shadow-sm backdrop-blur-sm md:block" aria-label="สารบัญข้อมูลสมาชิก">
        <div className="flex min-w-max gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => jump(item.id)}
              className={`min-h-11 rounded-lg px-3 text-[14px] font-bold whitespace-nowrap ${
                activeId === item.id ? 'bg-[#0B2545] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <ProfileBlock id="profile-personal" title="ข้อมูลส่วนบุคคลและที่อยู่" subtitle="คำนำหน้า ชื่อ นามสกุล บัตรประชาชน ที่อยู่ และช่องทางติดต่อ" icon={User} open={openIds['profile-personal']} onToggle={() => toggle('profile-personal')}>
        <PersonalSection {...personalProps} activeSubTab="info" onStartEdit={() => onStartEdit('info')} />
      </ProfileBlock>

      <ProfileBlock id="profile-family" title="ข้อมูลครอบครัวและสมาชิกในครัวเรือน" subtitle="แสดงสมาชิกทุกคนที่บันทึกไว้ในครัวเรือนนี้" icon={Users} open={openIds['profile-family']} onToggle={() => toggle('profile-family')}>
        <PersonalSection {...personalProps} activeSubTab="household" onStartEdit={() => onStartEdit('household')} />
      </ProfileBlock>

      <ProfileBlock id="profile-economy" title="รายได้ รายจ่าย และหนี้สิน" subtitle={`สุทธิต่อเดือน ${moneyText(net)} • หนี้คงเหลือ ${moneyText(Number.isNaN(debt as number) ? null : debt)}`} icon={DollarSign} open={openIds['profile-economy']} onToggle={() => toggle('profile-economy')}>
        <PersonalSection {...personalProps} activeSubTab="economy" onStartEdit={() => onStartEdit('economy')} />
      </ProfileBlock>

      <ProfileBlock id="profile-limitations" title="สภาพปัจจุบันและข้อจำกัด" subtitle="สภาพความเป็นอยู่ ความจำเป็นเร่งด่วน และความช่วยเหลือจากหน่วยงานอื่น" icon={AlertTriangle} open={openIds['profile-limitations']} onToggle={() => toggle('profile-limitations')}>
        <div className="space-y-4">
          <PersonalSection {...personalProps} activeSubTab="limitations" onStartEdit={() => onStartEdit('limitations')} />
          <PersonalSection {...personalProps} activeSubTab="other_aid" onStartEdit={() => onStartEdit('other_aid')} />
        </div>
      </ProfileBlock>

      <ProfileBlock id="profile-location" title="พิกัดบ้านและแผนที่" subtitle="ใช้เฉพาะพิกัดที่บันทึกไว้ของสมาชิก" icon={MapPin} open={openIds['profile-location']} onToggle={() => toggle('profile-location')}>
        <LocationSection
          registry={registry}
          canEdit={canEdit}
          onSaveLocationDirectly={onSaveLocationDirectly}
          isSavingLocation={isSavingLocation}
        />
      </ProfileBlock>

      <ProfileBlock id="profile-coordinator" title="ผู้ประสานงานและผู้รับผิดชอบ" subtitle="เจ้าหน้าที่ผู้ประสานงานและผู้รับรองจากข้อมูลทะเบียน" icon={Phone} open={openIds['profile-coordinator']} onToggle={() => toggle('profile-coordinator')}>
        <CoordinatorSection
          registry={registry}
          isEditing={isEditing}
          editForm={editForm}
          setEditForm={setEditForm}
          canEdit={canEdit}
          onStartEdit={() => onStartEdit('coordinator')}
        />
      </ProfileBlock>

      <ProfileBlock id="profile-status" title="สถานะสมาชิกและผลการประเมินสิทธิ์" subtitle="สมาชิกหนึ่งรายใช้รหัสถาวรเดียว และเก็บประวัติประเมินแยกแต่ละรอบ" icon={ShieldCheck} open={openIds['profile-status']} onToggle={() => toggle('profile-status')}>
        <div id="profile-assessment" className="scroll-mt-16 space-y-4">
          <StatusSection
            registry={registry}
            statusLabels={statusLabels}
            canEdit={canEdit}
            onOpenStatusDialog={onOpenStatusDialog}
            onOpenHistoryModal={onOpenHistoryModal}
            onSaveChecklist={onSaveChecklist}
            isSavingChecklist={isSavingChecklist}
          />
          <AssessmentHistorySection
            registry={registry}
            assessments={memberAssessments}
            isLoading={isLoadingAssessments}
            canAssess={canAssess}
            canApprove={canApprove}
            authToken={authToken}
            onOpenNewAssessment={onOpenNewAssessment}
            onRefreshAssessments={onRefreshAssessments}
            showToast={showToast}
          />
        </div>
      </ProfileBlock>

      <ProfileBlock id="profile-requests" title="ประวัติคำร้องและการช่วยเหลือ" subtitle={`คำร้อง ${stats.total} • อนุมัติแล้วยังไม่จ่าย ${stats.approved} • จ่ายจริง ${stats.disbursed}`} icon={HeartHandshake} open={openIds['profile-requests']} onToggle={() => toggle('profile-requests')}>
        <div className="space-y-4">
          <MemberRequestsSection
            registry={registry}
            contextApplications={applications}
            authToken={authToken}
            canCreateRequest
            onOpenCreateRequest={onOpenCreateRequest}
            onNavigateToRequests={onNavigateToRequests}
          />
          <div id="profile-aid" className="scroll-mt-16">
            <AssistanceHistorySection
              registry={registry}
              applications={applications}
              onOpenReceiptModal={onOpenReceiptModal}
              onOpenNewAssistanceDialog={onOpenCreateRequest}
              canEdit={canEdit}
            />
          </div>
        </div>
      </ProfileBlock>

      <ProfileBlock id="profile-documents" title="เอกสารแนบ" subtitle="ใช้คลังเอกสารเดิมของทะเบียนสมาชิก" icon={FileText} open={openIds['profile-documents']} onToggle={() => toggle('profile-documents')}>
        <DocumentsSection
          registry={registry}
          canEdit={canEdit}
          onRefreshRegistry={() => { void onRefreshRegistry(); }}
          onDocumentsUploaded={() => { void onRefreshRegistry(); }}
        />
      </ProfileBlock>

      <ProfileBlock id="profile-audit" title="ประวัติการแก้ไขข้อมูล" subtitle="เก็บบันทึกเดิมไว้ และไม่ลบประวัติเมื่อเปิดหน้านี้" icon={History} open={openIds['profile-audit']} onToggle={() => toggle('profile-audit')}>
        <AuditTimeline beneficiaryId={registry.id} editHistory={registry.editHistory} />
      </ProfileBlock>

    </div>
  );
}
