'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { BeneficiaryRegistryItem, AssistanceApplication } from '@/types';
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  ExternalLink,
  ClipboardCheck,
} from 'lucide-react';

interface MemberRequestsSectionProps {
  registry: BeneficiaryRegistryItem;
  contextApplications: AssistanceApplication[];
  authToken?: string | null;
  canCreateRequest: boolean;
  onOpenCreateRequest: () => void;
  onNavigateToRequests?: (requestId?: string) => void;
}

function getRequestStatusBadge(status?: string) {
  const s = String(status || 'submitted').toLowerCase();
  if (s === 'disbursed' || s === 'completed' || s === 'closed') {
    return { label: 'ดำเนินการช่วยเหลือแล้ว', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }
  if (s === 'approved' || s === 'wait_disbursement' || s === 'pending_disbursement') {
    return { label: 'อนุมัติแล้ว รอเบิกจ่าย', cls: 'bg-teal-100 text-teal-800 border-teal-300' };
  }
  if (s === 'rejected' || s === 'cancelled') {
    return { label: 'ไม่อนุมัติ / ยกเลิก', cls: 'bg-rose-100 text-rose-800 border-rose-300' };
  }
  return { label: 'อยู่ระหว่างพิจารณาคำร้อง', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
}

export function MemberRequestsSection({
  registry,
  contextApplications,
  authToken,
  canCreateRequest,
  onOpenCreateRequest,
  onNavigateToRequests,
}: MemberRequestsSectionProps) {
  const [apiRequests, setApiRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const memberCode = registry.memberCode || registry.memberId || registry.registrationNo;

  const loadMemberRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const token =
        authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
      const headers: Record<string, string> = {};
      if (token && token !== 'cookie-session') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(
        `/api/assistance-requests?beneficiaryId=${encodeURIComponent(registry.id)}`,
        { headers, credentials: 'include' },
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && Array.isArray(json.data)) {
        setApiRequests(json.data);
      }
    } catch {
      // Fallback to contextApplications if offline
    } finally {
      setIsLoading(false);
    }
  }, [registry.id, authToken]);

  useEffect(() => {
    loadMemberRequests();
  }, [loadMemberRequests]);

  // Merge API requests & context applications without duplicates
  const mergedRequests = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const r of apiRequests) {
      map.set(r.id, r);
    }
    for (const c of contextApplications) {
      if (c.beneficiaryId === registry.id && !map.has(c.id)) {
        map.set(c.id, c);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      String(b.appliedDate || b.createdAt || '').localeCompare(String(a.appliedDate || a.createdAt || '')),
    );
  }, [apiRequests, contextApplications, registry.id]);

  const pendingCount = mergedRequests.filter((r) => {
    const s = String(r.status || '').toLowerCase();
    return !['approved', 'disbursed', 'completed', 'closed', 'rejected', 'cancelled'].includes(s);
  }).length;
  const approvedOrDisbursedCount = mergedRequests.filter((r) => {
    const s = String(r.status || '').toLowerCase();
    return ['approved', 'wait_disbursement', 'pending_disbursement', 'disbursed', 'completed', 'closed'].includes(s);
  }).length;

  return (
    <div className="space-y-4">
      {/* Header & Action */}
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50/90 to-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-5 h-5 text-sky-700" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              ประวัติคำร้องขอความช่วยเหลือของสมาชิก ({mergedRequests.length} รายการ)
            </h3>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white text-sky-800 border border-sky-200">
              {memberCode}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            สมาชิกหนึ่งคนสามารถยื่นคำร้องขอความช่วยเหลือได้หลายรายการตามความจำเป็น โดยสถานะคำร้องแยกอิสระจากสถานะสมาชิกและสถานะการประเมินสิทธิ์
          </p>
        </div>

        {canCreateRequest && (
          <button
            type="button"
            onClick={onOpenCreateRequest}
            className="zms-action inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            ยื่นคำร้องขอความช่วยเหลือ
          </button>
        )}
      </div>

      {/* Mini Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] text-slate-500">คำร้องสะสมทั้งหมด</div>
          <div className="text-lg font-extrabold text-slate-900 font-mono">{mergedRequests.length}</div>
        </div>
        <div className="p-3 rounded-xl bg-white border border-amber-200">
          <div className="text-[11px] text-amber-700">อยู่ระหว่างพิจารณา</div>
          <div className="text-lg font-extrabold text-amber-800 font-mono">{pendingCount}</div>
        </div>
        <div className="p-3 rounded-xl bg-white border border-emerald-200">
          <div className="text-[11px] text-emerald-700">อนุมัติ / ช่วยเหลือแล้ว</div>
          <div className="text-lg font-extrabold text-emerald-800 font-mono">{approvedOrDisbursedCount}</div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
          กำลังโหลดประวัติคำร้องขอความช่วยเหลือ...
        </div>
      ) : mergedRequests.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
          <p className="text-sm font-semibold text-slate-700">ยังไม่มีประวัติคำร้องขอความช่วยเหลือสำหรับสมาชิกนี้</p>
          <p className="text-xs text-slate-500">
            สมาชิกที่ขึ้นทะเบียนแล้วสามารถยื่นคำร้องขอรับความช่วยเหลือได้หลายครั้งโดยไม่ต้องขึ้นทะเบียนบุคคลซ้ำ
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mergedRequests.map((req) => {
            const badge = getRequestStatusBadge(req.status);
            const linkedAsmNo =
              req.periodicAssessment?.assessmentNumber ||
              req.assessmentNumber ||
              null;

            return (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-900 text-white">
                      {req.applicationNo}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {linkedAsmNo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ClipboardCheck className="w-3 h-3" />
                        อ้างอิงประเมิน: {linkedAsmNo}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>วันที่ยื่นคำร้อง: {req.appliedDate || req.createdAt?.slice(0, 10) || '-'}</span>
                    {onNavigateToRequests && (
                      <button
                        type="button"
                        onClick={() => onNavigateToRequests(req.id)}
                        className="zms-action inline-flex items-center gap-1 text-sky-700 hover:underline font-semibold"
                       aria-label="เปิดหน้าคำร้อง" title="เปิดหน้าคำร้อง">
                        <span>เปิดหน้าคำร้อง</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">ประเภทความช่วยเหลือ</span>
                    <span className="font-bold text-slate-800">
                      {req.assistanceTypeName || req.assistanceType || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">จำนวนเงินที่ขอ</span>
                    <span className="font-bold text-slate-800">
                      ฿{Number(req.requestedAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">วงเงินอนุมัติ</span>
                    <span className="font-bold text-teal-700">
                      {req.approvedAmount != null
                        ? `฿${Number(req.approvedAmount).toLocaleString()}`
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">จ่ายช่วยเหลือจริง</span>
                    <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5" />
                      {req.disbursedAmount != null && Number(req.disbursedAmount) > 0
                        ? `฿${Number(req.disbursedAmount).toLocaleString()}`
                        : '-'}
                    </span>
                  </div>
                </div>

                {(req.necessityDetails || req.purpose) && (
                  <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                    <span className="font-semibold text-slate-700">รายละเอียดคำร้อง: </span>
                    {req.necessityDetails || req.purpose}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

