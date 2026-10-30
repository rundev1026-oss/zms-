'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  RotateCcw, 
  Printer, 
  Trash2, 
  ShieldAlert, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle, 
  Download,
  Calendar,
  Lock,
  Layers
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { FinancialTransaction } from '@/types';
import { ModalPortal } from '@/components/common/Modal';

export function AuditAndLedgerTab() {
  const { 
    transactions, 
    currentUser, 
    reverseTransaction, 
    attemptDeleteTransaction, 
    showToast 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [selectedTxnForReversal, setSelectedTxnForReversal] = useState<FinancialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [selectedTxnForVoucher, setSelectedTxnForVoucher] = useState<FinancialTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter logic
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.payerOrPayee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fundName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.referenceNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxnForReversal) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      showToast('กรุณาระบุเหตุผลในการกลับรายการบัญชีอย่างชัดเจน (อย่างน้อย 5 ตัวอักษร)', 'error');
      return;
    }

    setIsSubmitting(true);
    const success = await reverseTransaction(selectedTxnForReversal.id, reversalReason);
    setIsSubmitting(false);

    if (success) {
      setSelectedTxnForReversal(null);
      setReversalReason('');
    }
  };

  const handleTestDirectDelete = async (txn: FinancialTransaction) => {
    const res = await attemptDeleteTransaction(txn.id);
    if (!res.success) {
      alert(`[นโยบายความถูกต้องทางบัญชี (Accounting Non-Deletion Rule)]:\n\n${res.message}`);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/finance/export?format=csv', '_blank');
    showToast('ดาวน์โหลดสมุดรายวันทั่วไปสำหรับ Microsoft Excel (UTF-8 BOM) เรียบร้อย', 'success');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              สมุดรายวันทั่วไป และประวัติการตรวจสอบ (General Ledger & Audit Log)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกทุกความเคลื่อนไหวทางการเงิน มีรหัสตรวจสอบย้อนกลับ นโยบายห้ามลบรายการ และระบบกลับรายการบัญชี (Reversals)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              ส่งออกสมุดรายวัน (CSV)
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่รายการ, ผู้รับ/ผู้จ่าย, กองทุน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            >
              <option value="all">ทุกประเภทรายการ</option>
              <option value="income">รายรับ (Income)</option>
              <option value="disbursement">จ่ายช่วยเหลือสวัสดิการ (Disbursement)</option>
              <option value="expense">รายจ่ายดำเนินงาน (Admin Expense)</option>
              <option value="reversal">รายการกลับบัญชี (Reversal Entry)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="completed">สมบูรณ์ (Completed)</option>
              <option value="reversed">กลับรายการแล้ว (Reversed)</option>
              <option value="pending">รอดำเนินการ (Pending)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">เลขที่ / วันที่</th>
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3">กองทุน / หมวดหมู่</th>
                <th className="px-4 py-3">ผู้จ่าย / ผู้รับเงิน</th>
                <th className="px-4 py-3 text-right">จำนวนเงิน (฿)</th>
                <th className="px-4 py-3">หมายเลขอ้างอิง</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    ไม่พบรายการบัญชีตรงตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const isIncome = t.type === 'income';
                  const isReversal = t.type === 'reversal';
                  const isReversed = t.status === 'reversed';

                  return (
                    <tr key={t.id} className={`hover:bg-slate-50/80 transition-colors ${isReversed ? 'opacity-60 bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{t.transactionNo}</div>
                        <div className="text-[11px] text-slate-400">{t.date}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isIncome
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isReversal
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : isReversal ? <RotateCcw className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isIncome ? 'รายรับ' : isReversal ? 'กลับรายการ' : t.type === 'disbursement' ? 'จ่ายสวัสดิการ' : 'รายจ่ายดำเนินงาน'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]">{t.fundName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{t.category}</div>
                        {t.subFundCategory && (
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              กองทุน: {t.subFundCategory}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 truncate max-w-[180px]">{t.payerOrPayee}</div>
                        <div className="text-[10px] text-slate-400">ผู้บันทึก: {t.recordedBy}</div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono font-bold ${
                          isIncome 
                            ? 'text-emerald-700' 
                            : isReversal 
                            ? 'text-purple-700' 
                            : 'text-slate-900'
                        }`}>
                          {isIncome ? '+' : isReversal ? '' : '-'}฿{Math.abs(t.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {t.referenceNo}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isReversed
                            ? 'bg-amber-100 text-amber-800'
                            : t.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isReversed ? 'กลับรายการแล้ว' : 'สมบูรณ์'}
                        </span>
                        {t.reversalReason && (
                          <div className="text-[10px] text-red-600 truncate max-w-[150px] mt-0.5">
                            {t.reversalReason}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print Voucher */}
                          <button
                            onClick={() => setSelectedTxnForVoucher(t)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                            title="พิมพ์ใบสำคัญ (Voucher)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Reversal Entry */}
                          {t.status === 'completed' && t.type !== 'reversal' && ['finance', 'super_admin'].includes(currentUser.role) && (
                            <button
                              onClick={() => {
                                setSelectedTxnForReversal(t);
                                setReversalReason('');
                              }}
                              className="p-1.5 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors"
                              title="กลับรายการบัญชี (Reversal Entry)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Test Non-Deletion Rule */}
                          <button
                            onClick={() => handleTestDirectDelete(t)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            title="ทดสอบนโยบายห้ามลบรายการบัญชี (Audit Trail Integrity)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* Reversal Entry Modal */}
      {selectedTxnForReversal && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedTxnForReversal(null);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden"
            >
              <div className="flex items-center gap-2 text-purple-700">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  บันทึกกลับรายการบัญชี / ปรับปรุง (Reversal Entry)
                </h3>
              </div>

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs space-y-1.5 text-purple-900">
                <div className="flex justify-between">
                  <span>เลขที่รายการเดิม:</span>
                  <strong className="font-mono">{selectedTxnForReversal.transactionNo}</strong>
                </div>
                <div className="flex justify-between">
                  <span>กองทุน:</span>
                  <strong>{selectedTxnForReversal.fundName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>จำนวนเงิน:</span>
                  <strong className="text-sm">฿{selectedTxnForReversal.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong>
                </div>
                <div className="flex justify-between">
                  <span>คู่สัญญา:</span>
                  <strong>{selectedTxnForReversal.payerOrPayee}</strong>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                * การกลับรายการจะสร้างรายการปรับปรุงลดยอด (Offsetting Counter-Entry) และปรับยอดคงเหลือกองทุนกลับคืนโดยอัตโนมัติ โดยรักษาประวัติรายการเดิมไว้ตามมาตรฐานการบัญชี
              </p>

              <form onSubmit={handleConfirmReversal} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เหตุผลในการกลับรายการบัญชี * (ระบุอย่างละเอียด)
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="เช่น ระบุยอดเงินผิดพลาด, โอนเงินคืนผู้บริจาค, หรือเอกสารซ้ำซ้อน..."
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setSelectedTxnForReversal(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-800 disabled:opacity-50"
                  >
                    {isSubmitting ? 'กำลังกลับรายการ...' : 'ยืนยันการกลับรายการบัญชี'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Printable Voucher Modal */}
      {selectedTxnForVoucher && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedTxnForVoucher(null);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 text-slate-800 max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden"
            >
              {/* Voucher Header */}
              <div className="text-center border-b pb-4">
                <h3 className="text-base font-bold text-slate-900">
                  มูลนิธิส่งเสริมการบริหารจัดการซะกาตและสาธารณกุศล (ZMS Foundation)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  สำนักงานใหญ่ จ.ยะลา | ทะเบียนมูลนิธิเลขที่ ม.ยล. 04/2565
                </p>
                <div className="mt-3 inline-block px-4 py-1 bg-slate-100 rounded-full font-bold text-xs uppercase tracking-wider text-slate-800">
                  {selectedTxnForVoucher.type === 'income' 
                    ? 'ใบสำคัญรับเงิน (Receipt Voucher)' 
                    : selectedTxnForVoucher.type === 'reversal'
                    ? 'ใบสำคัญปรับปรุงบัญชี (Adjustment Voucher)'
                    : 'ใบสำคัญจ่ายเงิน (Payment Voucher)'}
                </div>
              </div>

              {/* Voucher Body */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">เลขที่ใบสำคัญ:</span>
                  <p className="font-mono font-bold text-slate-900">{selectedTxnForVoucher.transactionNo}</p>
                </div>
                <div>
                  <span className="text-slate-400">วันที่ทำรายการ:</span>
                  <p className="font-medium text-slate-900">{selectedTxnForVoucher.date}</p>
                </div>
                <div>
                  <span className="text-slate-400">{selectedTxnForVoucher.type === 'income' ? 'รับเงินจาก:' : 'จ่ายให้แก่:'}</span>
                  <p className="font-bold text-slate-900">{selectedTxnForVoucher.payerOrPayee}</p>
                </div>
                <div>
                  <span className="text-slate-400">หมายเลขอ้างอิง:</span>
                  <p className="font-mono text-slate-900">{selectedTxnForVoucher.referenceNo}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">กองทุนและหมวดหมู่:</span>
                  <p className="font-medium text-slate-900">{selectedTxnForVoucher.fundName} - {selectedTxnForVoucher.category}</p>
                </div>
              </div>

              {/* Amount Box */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">จำนวนเงินสุทธิ (Net Amount):</span>
                <span className="text-xl font-bold text-emerald-800">
                  ฿{Math.abs(selectedTxnForVoucher.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-4 border-t text-xs text-center">
                <div>
                  <div className="h-12 border-b border-dashed border-slate-300"></div>
                  <p className="mt-2 font-medium text-slate-700">({selectedTxnForVoucher.recordedBy})</p>
                  <p className="text-[11px] text-slate-400">เจ้าหน้าที่การเงินผู้จัดทำ</p>
                </div>
                <div>
                  <div className="h-12 border-b border-dashed border-slate-300"></div>
                  <p className="mt-2 font-medium text-slate-700">(อิหม่ามฟารุก อาลี / คณะกรรมการ)</p>
                  <p className="text-[11px] text-slate-400">ผู้อนุมัติจ่าย / ตรวจสอบความถูกต้อง</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedTxnForVoucher(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800"
                >
                  <Printer className="w-4 h-4" /> สั่งพิมพ์ใบสำคัญ (Print)
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
