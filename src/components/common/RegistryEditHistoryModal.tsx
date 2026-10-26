'use client';

import React from 'react';
import { 
  History, 
  X, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck,
  FileText,
  ArrowRight
} from 'lucide-react';
import { RegistryEditHistoryItem } from '@/types';
import { ModalPortal } from '@/components/common/Modal';

interface RegistryEditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaryName: string;
  registrationNo: string;
  historyList: RegistryEditHistoryItem[];
  isLoading?: boolean;
}

const ROLE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  super_admin: { label: 'Super Admin', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  officer: { label: 'เจ้าหน้าที่สำรวจ', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  approver: { label: 'ผู้มีอำนาจอนุมัติ', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  member: { label: 'สมาชิก (เจ้าของทะเบียน)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  executive: { label: 'ผู้บริหารมูลนิธิ', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

export function RegistryEditHistoryModal({
  isOpen,
  onClose,
  beneficiaryName,
  registrationNo,
  historyList,
  isLoading = false,
}: RegistryEditHistoryModalProps) {
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-[1020] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          role="dialog"
          aria-modal="true"
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0b2545] to-[#133e6f] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
                <History className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  ประวัติการแก้ไขข้อมูลทะเบียนรายบุคคล
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20 text-amber-200 font-bold">
                  {registrationNo}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ผู้มีสิทธิ์: <strong className="text-white">{beneficiaryName}</strong> • บันทึกการเปลี่ยนแปลงทุกรายการอย่างโปร่งใสตามหลัก PDPA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>กำลังโหลดประวัติการแก้ไข...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">ยังไม่มีประวัติการแก้ไขข้อมูลสำหรับทะเบียนนี้</p>
              <p className="text-[11px] text-slate-400">เมื่อมีการแก้ไขข้อมูลส่วนบุคคล ที่อยู่ พิกัดแผนที่ หรือข้อมูลอื่น ระบบจะบันทึกที่นี่โดยอัตโนมัติ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((item, idx) => {
                const isExpanded = expandedItems[item.id] ?? (idx === 0);
                const roleMeta = ROLE_BADGES[item.editedByRole] || {
                  label: item.editedByRole,
                  bg: 'bg-slate-100',
                  text: 'text-slate-700',
                  border: 'border-slate-200',
                };
                const hasDetails = item.changesDetail && item.changesDetail.length > 0;

                return (
                  <div 
                    key={item.id} 
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs transition-all"
                  >
                    {/* Item Summary Bar */}
                    <div 
                      onClick={() => hasDetails && toggleExpand(item.id)}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${hasDetails ? 'cursor-pointer hover:bg-slate-50/80' : ''}`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {item.editedByName}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleMeta.bg} ${roleMeta.text} ${roleMeta.border}`}>
                            {roleMeta.label}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{item.timestamp}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          {item.changesSummary || 'บันทึกการปรับปรุงข้อมูลทะเบียน'}
                        </p>
                        {item.notes && (
                          <p className="text-[11px] text-slate-500 italic">
                            หมายเหตุ: {item.notes}
                          </p>
                        )}
                      </div>

                      {hasDetails && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 self-end sm:self-center shrink-0">
                          <span>{item.changesDetail?.length} รายการที่เปลี่ยน</span>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      )}
                    </div>

                    {/* Expandable Diffs Table */}
                    {hasDetails && isExpanded && (
                      <div className="p-3 bg-slate-50 border-t border-slate-200 overflow-x-auto animate-fadeIn">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                              <th className="py-1.5 px-2">ข้อมูลที่แก้ไข</th>
                              <th className="py-1.5 px-2">ค่าเดิม (Before)</th>
                              <th className="py-1.5 px-2 text-center w-8">→</th>
                              <th className="py-1.5 px-2">ค่าใหม่ (After)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 font-sans">
                            {item.changesDetail?.map((c, cIdx) => (
                              <tr key={cIdx} className="hover:bg-white/80">
                                <td className="py-2 px-2 font-bold text-slate-800 whitespace-nowrap">
                                  {c.fieldLabel || c.field}
                                </td>
                                <td className="py-2 px-2 text-rose-800 font-mono text-[11px] bg-rose-50/60 rounded">
                                  {String(c.oldValue || '-')}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-400">
                                  <ArrowRight className="w-3 h-3 mx-auto" />
                                </td>
                                <td className="py-2 px-2 text-emerald-800 font-bold font-mono text-[11px] bg-emerald-50/60 rounded">
                                  {String(c.newValue || '-')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ระบบเก็บประวัติการแก้ไขและบันทึกลง Audit Log ทุกครั้งโดยอัตโนมัติ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
  );
}
