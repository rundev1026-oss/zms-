'use client';

import React, { useState, useEffect } from 'react';
import { formatPersonName } from '@zms/shared';
import { 
  Search, 
  Trash2, 
  RotateCcw, 
  History, 
  FileText, 
  DollarSign, 
  Users, 
  Calendar, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface DeletedBeneficiaryItem {
  id: string;
  registryNumber: string;
  status: string;
  title: string | null;
  firstName: string;
  lastName: string;
  identityType: string;
  identityNumber: string | null;
  phone: string | null;
  deletedAt: string;
  deletedById: string | null;
  deletedByName: string | null;
  deletionReason: string | null;
  deletionReference: string | null;
  counts?: {
    applications: number;
    disbursementItems: number;
    followUpRecords: number;
    documents: number;
  };
}

interface DeletedBeneficiariesTableProps {
  onRestore: (beneficiary: { id: string; registryNumber: string; fullName: string }) => void;
  onViewAudit: (beneficiary: { id: string; registryNumber: string; fullName: string }) => void;
  refreshTrigger: number;
}

export const DeletedBeneficiariesTable: React.FC<DeletedBeneficiariesTableProps> = ({
  onRestore,
  onViewAudit,
  refreshTrigger,
}) => {
  const [items, setItems] = useState<DeletedBeneficiaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;

  const fetchDeleted = async () => {
    setLoading(true);
    setError(null);
    try {
      const qParams = new URLSearchParams();
      if (search.trim()) qParams.set('q', search.trim());
      qParams.set('page', String(page));
      qParams.set('pageSize', String(pageSize));

      const res = await fetch(`/api/registry/deleted?${qParams.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setItems(json.data || []);
        setTotal(json.pagination?.total || 0);
      } else {
        setError(json.error || 'ไม่สามารถดึงข้อมูลทะเบียนที่ถูกลบได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, [page, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDeleted();
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-red-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขทะเบียน, ชื่อ, เลขบัตร หรือเหตุผลการลบ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </form>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => fetchDeleted()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Info notice */}
      <div className="p-3 bg-red-50/70 rounded-xl border border-red-200/70 text-xs text-red-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
          <span>
            แสดงทะเบียนที่ถูกจำหน่าย/ลบทั้งหมด (Soft Deleted) ข้อมูลประวัติการช่วยเหลือ การเงิน และเอกสารทั้งหมดยังคงอยู่ครบถ้วน
          </span>
        </div>
        <span className="font-bold text-red-700 shrink-0">{total} รายการ</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">เลขทะเบียน</th>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4">วันที่จำหน่าย/ลบ</th>
                <th className="py-3 px-4">ผู้จำหน่าย</th>
                <th className="py-3 px-4">เหตุผลในการจำหน่าย & อ้างอิง</th>
                <th className="py-3 px-4 text-center">ประวัติเดิมที่เก็บรักษา</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                      <span>กำลังโหลดทะเบียนที่ถูกจำหน่าย...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-red-600">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Trash2 className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                    <p className="font-semibold text-slate-600">ไม่มีข้อมูลทะเบียนที่ถูกจำหน่าย/ลบ</p>
                    <p className="text-[11px] mt-1 text-slate-400">ไม่มีรายการที่ถูกลบตามเงื่อนไขการค้นหานี้</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const fullName = formatPersonName({
                    prefix: item.title,
                    firstName: item.firstName,
                    lastName: item.lastName,
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Registration No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        <span className="line-through text-slate-400 mr-1.5">✕</span>
                        <span>{item.registryNumber}</span>
                      </td>

                      {/* Name & Masked ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {fullName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {item.identityNumber || '-'} {item.phone ? `• ${item.phone}` : ''}
                        </div>
                      </td>

                      {/* Deleted Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(item.deletedAt).toLocaleDateString('th-TH')}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.deletedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </div>
                      </td>

                      {/* Deleted By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-semibold text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.deletedByName || 'Super Admin'}</span>
                        </div>
                      </td>

                      {/* Deletion Reason & Reference */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-800 font-medium truncate" title={item.deletionReason || ''}>
                          {item.deletionReason || '-'}
                        </div>
                        {item.deletionReference && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                            อ้างอิง: <span className="font-mono text-slate-600">{item.deletionReference}</span>
                          </div>
                        )}
                      </td>

                      {/* Preserved Counts */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-600">
                          <span title="คำขอความช่วยเหลือ" className="flex items-center gap-0.5">
                            <FileText className="w-3 h-3 text-slate-400" />
                            {item.counts?.applications ?? 0}
                          </span>
                          <span>•</span>
                          <span title="การเบิกจ่าย" className="flex items-center gap-0.5">
                            <DollarSign className="w-3 h-3 text-slate-400" />
                            {item.counts?.disbursementItems ?? 0}
                          </span>
                          <span>•</span>
                          <span title="เอกสารแนบ" className="flex items-center gap-0.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            {item.counts?.documents ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Audit Log */}
                          <button
                            type="button"
                            onClick={() => onViewAudit({ id: item.id, registryNumber: item.registryNumber, fullName })}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b2545] hover:bg-slate-100 transition-colors"
                            title="ดูประวัติ Audit Log"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Restore Button */}
                          <button
                            type="button"
                            onClick={() => onRestore({ id: item.id, registryNumber: item.registryNumber, fullName })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                            title="กู้คืนทะเบียนกลับสู่ระบบ"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                            <span>กู้คืน</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            แสดง {total === 0 ? 0 : (page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, total)} จากทั้งหมด {total} รายการ
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800 px-2">
              หน้า {page} / {Math.ceil(total / pageSize) || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize) || 1, p + 1))}
              disabled={page >= Math.ceil(total / pageSize)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

