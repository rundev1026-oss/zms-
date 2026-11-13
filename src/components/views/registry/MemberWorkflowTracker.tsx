'use client';

import React, { useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  ClipboardCheck,
  FilePlus2,
  Scale,
  UserCheck,
} from 'lucide-react';
import {
  AssistanceApplication,
  BeneficiaryPeriodicAssessment,
  BeneficiaryRegistryItem,
} from '@/types';
import { registryAssessmentMeta, resolveRequestStats } from '@/components/views/registry/BeneficiaryRegistryCards';

type Tone = 'done' | 'wait' | 'problem' | 'idle';

interface StepModel {
  id: string;
  title: string;
  status: string;
  date: string;
  tone: Tone;
  details: { label: string; value: string }[];
  actions?: { label: string; onClick: () => void }[];
}

const TONE_DOT: Record<Tone, string> = {
  done: 'bg-emerald-500',
  wait: 'bg-amber-400',
  problem: 'bg-rose-500',
  idle: 'bg-slate-300',
};

const TONE_TEXT: Record<Tone, string> = {
  done: 'text-emerald-700',
  wait: 'text-amber-800',
  problem: 'text-rose-700',
  idle: 'text-slate-500',
};

function dateText(value?: string | null) {
  if (!value) return 'ยังไม่มีวันที่';
  const raw = String(value).trim();
  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    const year = Number(slash[3]);
    return `${Number(slash[1])}/${Number(slash[2])}/${year > 2400 ? year : year + 543}`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  if (date.getFullYear() > 2400) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }
  return date.toLocaleDateString('th-TH');
}

function money(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'ยังไม่มีข้อมูล';
  return `฿${Number(value).toLocaleString('th-TH')}`;
}

function memberApps(registry: BeneficiaryRegistryItem, applications: AssistanceApplication[]) {
  return applications.filter(
    (app) => app.beneficiaryId === registry.id || (registry.memberId && app.memberId === registry.memberId),
  );
}

function requestLabel(status: string) {
  const key = status.toLowerCase();
  const labels: Record<string, string> = {
    draft: 'ร่าง',
    submitted: 'ยื่นคำร้องแล้ว',
    doc_review: 'รอตรวจสอบ',
    field_inspection: 'รอประเมิน',
    assessment: 'รอประเมิน',
    assessing: 'รอประเมิน',
    pending_approval: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    wait_disbursement: 'อนุมัติแล้ว',
    rejected: 'ไม่อนุมัติ',
    need_info: 'ส่งกลับแก้ไข',
    disbursed: 'อนุมัติแล้ว',
    closed: 'อนุมัติแล้ว',
    followup: 'อนุมัติแล้ว',
    cancelled: 'ไม่อนุมัติ',
  };
  return labels[key] || status || 'ยังไม่มีคำร้อง';
}

function buildSteps(
  registry: BeneficiaryRegistryItem,
  assessments: BeneficiaryPeriodicAssessment[],
  applications: AssistanceApplication[],
  onOpenAssessment: () => void,
  onOpenRequest: (id?: string) => void,
  onCreateRequest: () => void,
): StepModel[] {
  const latest = assessments[0] || registry.latestAssessment || null;
  const apps = memberApps(registry, applications).sort(
    (a, b) => new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime(),
  );
  const latestApp = apps[0];
  const stats = resolveRequestStats(registry, applications);
  const memberStatus = String(registry.memberStatus || 'ACTIVE').toUpperCase();
  const missingCore = !registry.phone || !(registry.address || registry.province) || !registry.nationalIdMasked;
  const incomplete = missingCore || registry.registrationStatus === 'need_more_info';
  const registered = Boolean(registry.registeredDate) || memberStatus === 'ACTIVE' || memberStatus === 'PENDING_VERIFICATION';

  let registration: StepModel;
  if (memberStatus === 'ARCHIVED') {
    registration = { id: 'register', title: 'ทะเบียนสมาชิก', status: 'ลบแบบ Soft Delete', date: dateText(registry.updatedAt), tone: 'problem', details: [] };
  } else if (memberStatus === 'SUSPENDED' || registry.registrationStatus === 'suspended') {
    registration = { id: 'register', title: 'ทะเบียนสมาชิก', status: 'ถูกระงับ', date: dateText(registry.registeredDate), tone: 'problem', details: [] };
  } else if (!registered) {
    registration = { id: 'register', title: 'ทะเบียนสมาชิก', status: 'ยังไม่ลงทะเบียน', date: 'ยังไม่มีวันที่', tone: 'idle', details: [] };
  } else {
    registration = {
      id: 'register',
      title: 'ทะเบียนสมาชิก',
      status: 'ลงทะเบียนแล้ว',
      date: dateText(registry.registeredDate),
      tone: incomplete ? 'wait' : 'done',
      details: [],
    };
  }
  registration.details = [
    { label: 'รหัสสมาชิก', value: registry.memberCode || registry.registrationNo || '-' },
    { label: 'วันที่ขึ้นทะเบียน', value: dateText(registry.registeredDate) },
    { label: 'ความครบของข้อมูล', value: incomplete ? 'กรอกข้อมูลไม่ครบ' : 'ข้อมูลหลักครบ' },
  ];

  const assessmentMeta = latest
    ? registryAssessmentMeta({ ...registry, latestAssessment: latest as BeneficiaryRegistryItem['latestAssessment'], registrationStatus: 'draft' })
    : null;
  const assessmentTone: Tone = !latest
    ? 'idle'
    : assessmentMeta?.key === 'eligible'
      ? 'done'
      : assessmentMeta?.key === 'ineligible'
        ? 'problem'
        : 'wait';
  const assessmentStatus = !latest
    ? 'ยังไม่ประเมิน'
    : assessmentMeta?.key === 'eligible'
      ? 'ผ่านเกณฑ์'
      : assessmentMeta?.key === 'ineligible'
        ? 'ไม่ผ่านเกณฑ์'
        : assessmentMeta?.key === 'reassess'
          ? 'รอประเมินใหม่'
          : assessmentMeta?.key === 'review'
            ? 'กำลังประเมิน'
            : 'รอประเมิน';

  const approvedApps = apps.filter((app) => {
    const status = String(app.status || '').toLowerCase();
    return app.approvalStatus === 'approved' || ['approved', 'wait_disbursement', 'disbursed', 'closed', 'followup'].includes(status);
  });
  const leadApproval = apps.find((app) => app.approvalStatus) || apps.find((app) =>
    ['pending_approval', 'approved', 'rejected', 'need_info', 'wait_disbursement', 'disbursed', 'closed', 'followup'].includes(String(app.status || '').toLowerCase()),
  );
  const approvedAmount = approvedApps.reduce((sum, app) => sum + Number(app.approvedAmount || 0), 0);
  const paidAmount = apps.reduce((sum, app) => sum + (Number(app.disbursedAmount || 0) > 0 ? Number(app.disbursedAmount) : 0), 0);

  let approvalStatus = 'ยังไม่เข้าสู่การพิจารณา';
  let approvalTone: Tone = 'idle';
  const approvalCode = String(leadApproval?.approvalStatus || '').toLowerCase();
  const approvalFallback = String(leadApproval?.status || '').toLowerCase();
  if (approvalCode === 'in_review') {
    approvalStatus = 'อยู่ระหว่างการพิจารณา';
    approvalTone = 'wait';
  } else if (approvalCode === 'pending' || approvalFallback === 'pending_approval') {
    approvalStatus = 'รอพิจารณา';
    approvalTone = 'wait';
  } else if (approvalCode === 'rejected' || (approvalFallback === 'rejected' && approvedApps.length === 0)) {
    approvalStatus = 'ไม่อนุมัติ';
    approvalTone = 'problem';
  } else if (approvalFallback === 'need_info' && approvedApps.length === 0) {
    approvalStatus = 'ส่งกลับแก้ไข';
    approvalTone = 'wait';
  } else if (approvalCode === 'approved' || approvedApps.length > 0) {
    approvalStatus = 'อนุมัติแล้ว';
    approvalTone = 'done';
  }

  const leadPayment = approvedApps[0] || null;
  let paymentStatus = 'ยังไม่ถึงขั้นตอนการจ่าย';
  let paymentTone: Tone = 'idle';
  if (leadPayment) {
    const pay = String(leadPayment.paymentStatus || '').toLowerCase();
    const delivery = String(leadPayment.deliveryStatus || '').toLowerCase();
    const follow = String(leadPayment.followupStatus || '').toLowerCase();
    const completion = String(leadPayment.completionStatus || '').toLowerCase();
    const status = String(leadPayment.status || '').toLowerCase();
    if (completion === 'closed' || status === 'closed') {
      paymentStatus = 'ปิดงานแล้ว';
      paymentTone = 'done';
    } else if (['in_progress', 'scheduled', 'pending_schedule'].includes(follow) || status === 'followup') {
      paymentStatus = 'ติดตามผล';
      paymentTone = 'wait';
    } else if (paidAmount > 0 && approvedAmount > paidAmount) {
      paymentStatus = 'จ่ายบางส่วน';
      paymentTone = 'wait';
    } else if (paidAmount > 0 && (pay === 'paid' || status === 'disbursed')) {
      paymentStatus = 'จ่ายแล้ว';
      paymentTone = 'done';
    } else if (delivery === 'delivered' && paidAmount <= 0) {
      paymentStatus = 'ส่งมอบเงินแล้ว';
      paymentTone = 'wait';
    } else {
      paymentStatus = 'รอเบิกจ่าย';
      paymentTone = 'wait';
    }
  }

  return [
    registration,
    {
      id: 'assessment',
      title: 'ประเมินสิทธิ์',
      status: assessmentStatus,
      date: dateText(latest?.assessmentDate),
      tone: assessmentTone,
      details: [
        { label: 'ผลการประเมิน', value: assessmentMeta?.label || 'ยังไม่ประเมิน' },
        { label: 'วันที่ประเมิน', value: dateText(latest?.assessmentDate) },
        { label: 'ปีหรือรอบประเมิน', value: latest?.assessmentPeriod || 'ยังไม่มีรอบ' },
        { label: 'ผู้ประเมิน', value: latest?.assessorName || 'ยังไม่มีชื่อผู้ประเมิน' },
        { label: 'จำนวนรอบ', value: String(assessments.length || registry.assessmentCount || 0) },
      ],
      actions: [{ label: 'ดูรายละเอียดประเมิน', onClick: onOpenAssessment }],
    },
    {
      id: 'request',
      title: 'คำร้องขอความช่วยเหลือ',
      status: apps.length === 0 ? 'ยังไม่มีคำร้อง' : requestLabel(String(latestApp?.status || '')),
      date: dateText(latestApp?.appliedDate),
      tone: apps.length === 0 ? 'idle' : ['rejected', 'cancelled'].includes(String(latestApp?.status || '').toLowerCase()) ? 'problem' : approvedApps.length > 0 ? 'done' : 'wait',
      details: [
        { label: 'จำนวนคำร้อง', value: String(stats.total) },
        { label: 'รหัสคำร้องล่าสุด', value: latestApp?.applicationNo || 'ยังไม่มีคำร้อง' },
        { label: 'ประเภท', value: latestApp?.assistanceType || latestApp?.classificationSnapshot?.assistanceTypeName || 'ยังไม่มีข้อมูล' },
        { label: 'วันที่ยื่น', value: dateText(latestApp?.appliedDate) },
      ],
      actions: [
        ...(latestApp ? [{ label: 'ดูคำร้อง', onClick: () => onOpenRequest(latestApp.id) }] : []),
        { label: 'ยื่นคำร้องใหม่', onClick: onCreateRequest },
      ],
    },
    {
      id: 'approval',
      title: 'พิจารณาอนุมัติ',
      status: approvalStatus,
      date: dateText(approvedApps[0]?.approvedDate || leadApproval?.approvedDate || leadApproval?.appliedDate),
      tone: approvalTone,
      details: [
        { label: 'สถานะการพิจารณา', value: approvalStatus },
        { label: 'วงเงินที่อนุมัติ', value: approvedApps.length > 0 ? money(approvedAmount) : 'ยังไม่มีวงเงินอนุมัติ' },
        { label: 'จำนวนคำร้องที่อนุมัติ', value: String(approvedApps.length) },
      ],
    },
    {
      id: 'payment',
      title: 'การจ่ายเงินและติดตามผล',
      status: paymentStatus,
      date: dateText(apps.find((app) => Number(app.disbursedAmount || 0) > 0)?.disbursementDate),
      tone: paymentTone,
      details: [
        { label: 'วงเงินที่อนุมัติ', value: approvedApps.length > 0 ? money(approvedAmount) : 'ยังไม่มีวงเงินอนุมัติ' },
        { label: 'เงินที่จ่ายจริง', value: paidAmount > 0 ? money(paidAmount) : 'ยังไม่มีการจ่าย' },
        { label: 'คงเหลือจากรายการคำร้อง', value: approvedAmount > 0 ? money(Math.max(0, approvedAmount - paidAmount)) : 'ยังไม่มีข้อมูล' },
      ],
    },
  ];
}

export function MemberWorkflowTracker({
  registry,
  assessments,
  applications,
  onOpenAssessment,
  onOpenRequest,
  onCreateRequest,
}: {
  registry: BeneficiaryRegistryItem;
  assessments: BeneficiaryPeriodicAssessment[];
  applications: AssistanceApplication[];
  onOpenAssessment: () => void;
  onOpenRequest: (id?: string) => void;
  onCreateRequest: () => void;
}) {
  const steps = buildSteps(registry, assessments, applications, onOpenAssessment, onOpenRequest, onCreateRequest);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = steps.find((step) => step.id === openId) || null;

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4" aria-label="สถานะการดำเนินงานของสมาชิก">
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .member-workflow-step { transition: none; }
        }
      `}</style>
      <div className="mb-3">
        <h3 className="text-[17px] font-black leading-6 text-[#0B2545]">สถานะการดำเนินงาน</h3>
        <p className="text-[13px] leading-5 text-slate-500">อ่านจากทะเบียน การประเมิน และคำร้องที่มีอยู่ในระบบ</p>
      </div>
      <ol className="flex flex-col lg:flex-row lg:items-start">
        {steps.map((step, index) => {
          const Icon = [UserCheck, ClipboardCheck, FilePlus2, Scale, Banknote][index] || BadgeCheck;
          const detail = openId === step.id ? (
            <div className="member-workflow-step mt-2 rounded-xl bg-[#F4F7FB] p-3 transition-opacity">
              <p className={`text-[14px] font-black ${TONE_TEXT[step.tone]}`}>{step.title}: {step.status}</p>
              <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {step.details.map((item) => (
                  <div key={item.label}>
                    <dt className="text-[12px] font-bold text-slate-500">{item.label}</dt>
                    <dd className="text-[14px] font-semibold text-[#0B2545]">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {step.actions && step.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {step.actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      className="min-h-11 rounded-xl bg-[#0B2545] px-3 text-[13px] font-bold text-white"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null;
          return (
            <li key={step.id} className="relative min-w-0 flex-1">
              {index < steps.length - 1 && (
                <span
                  className={`absolute left-[18px] top-9 h-[calc(100%-4px)] w-0.5 lg:left-[calc(50%+22px)] lg:top-[18px] lg:h-0.5 lg:w-[calc(100%-44px)] ${step.tone === 'done' ? 'bg-emerald-400' : 'bg-slate-200'}`}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                onClick={() => setOpenId((current) => current === step.id ? null : step.id)}
                aria-expanded={openId === step.id}
                className="member-workflow-step relative flex w-full items-start gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-slate-50 lg:flex-col lg:items-center lg:px-2 lg:text-center"
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${TONE_DOT[step.tone]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-bold text-slate-500">{index + 1}. {step.title}</span>
                  <span className={`block text-[14px] font-black leading-5 ${TONE_TEXT[step.tone]}`}>{step.status}</span>
                  <span className="block text-[12px] text-slate-500">{step.date}</span>
                </span>
              </button>
              <div className="pb-3 pl-12 lg:hidden">{detail}</div>
            </li>
          );
        })}
      </ol>
      {open && (
        <div className="mt-3 hidden rounded-xl bg-[#F4F7FB] p-3 lg:block">
          <p className={`text-[14px] font-black ${TONE_TEXT[open.tone]}`}>{open.title}: {open.status}</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-3">
            {open.details.map((item) => (
              <div key={item.label}>
                <dt className="text-[12px] font-bold text-slate-500">{item.label}</dt>
                <dd className="text-[14px] font-semibold text-[#0B2545]">{item.value}</dd>
              </div>
            ))}
          </dl>
          {open.actions && open.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {open.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="min-h-11 rounded-xl bg-[#0B2545] px-3 text-[13px] font-bold text-white"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
