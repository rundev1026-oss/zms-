'use client';

import React, { useState, useEffect } from 'react';
import { History, X, User, Calendar, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { ModalPortal } from '@/components/common/Modal';

interface BeneficiaryAuditModalProps {
  beneficiaryId: string;
  registryNumber: string;
  fullName: string;
  onClose: () => void;
}

export const BeneficiaryAuditModal: React.FC<BeneficiaryAuditModalProps> = ({
  beneficiaryId,
  registryNumber,
  fullName,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(`/api/registry/${beneficiaryId}/audit-history`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && Array.isArray(json.data)) {
          setLogs(json.data);
        } else {
          setError(json.error || 'ไม่สามารถดึงประวัติได้');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [beneficiaryId]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BENEFICIARY_CREATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">สร้างทะเบียน</span>;
      case 'BENEFICIARY_UPDATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">แก้ไขข้อมูล</span>;
      case 'BENEFICIARY_SOFT_DELETE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">จำหน่าย/ลบ</span>;
      case 'BENEFICIARY_RESTORE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">กู้คืนทะเบียน</span>;
      case 'BENEFICIARY_VIEW':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">เข้าดูข้อมูล</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden my-auto">
          {/* Header */}
          <div className="p-4 bg-[#0b2545] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl">
                <History className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-base">ประวัติการปฏิบัติงาน (Audit Trail)</h3>
                <p className="text-xs text-slate-300">
                  {registryNumber} • {fullName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-3">
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0b2545]" />
                <span>กำลังโหลดประวัติ Audit Log...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่พบประวัติการปฏิบัติงาน
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {logs.map((log) => {
                  const meta = log.metadata || {};
                  return (
                    <div key={log.id} className="relative text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#0b2545] ring-4 ring-white" />
                      
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getActionBadge(log.action)}
                            <span className="text-slate-500 text-[11px] flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(log.createdAt).toLocaleString('th-TH')}
                            </span>
                          </div>
                          <span className="text-slate-600 font-semibold flex items-center gap-1 text-[11px]">
                            <User className="w-3 h-3 text-slate-400" />
                            {log.actorName}
                          </span>
                        </div>

                        {/* Metadata Details */}
                        {meta.reason && (
                          <div className="text-slate-700 font-medium bg-white p-2 rounded-lg border border-slate-200/60 mt-1">
                            <span className="text-slate-400 text-[10px] block">เหตุผล/บันทึก:</span>
                            {meta.reason}
                          </div>
                        )}

                        {meta.reference && (
                          <div className="text-slate-500 text-[11px]">
                            เอกสารอ้างอิง: <span className="font-mono text-slate-800">{meta.reference}</span>
                          </div>
                        )}

                        {meta.deletedBy && (
                          <div className="text-slate-500 text-[10px]">
                            ผู้ดำเนินการ: {meta.deletedBy} {meta.ipAddress ? `(IP: ${meta.ipAddress})` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

