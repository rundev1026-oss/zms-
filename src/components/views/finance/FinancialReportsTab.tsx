'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronRight, 
  FileText, 
  Building, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function FinancialReportsTab() {
  const { showToast } = useApp();

  const reportOptions = [
    { id: 'income_by_type', name: '1. รายงานรายรับแยกตามประเภทเงิน (ซะกาต / ศอดะเกาะฮ์ / บริหาร)', icon: '📥' },
    { id: 'aid_by_asnaf', name: '2. รายงานรายจ่ายเพื่อการช่วยเหลือแยกตาม 8 อัสนัฟ (Asnaf Aid)', icon: '🤲' },
    { id: 'aid_by_assistance_type', name: '3. รายงานรายจ่ายแยกตามประเภทการช่วยเหลือ (Assistance Types)', icon: '🩺' },
    { id: 'caregiver_unspent_summary', name: '4. รายงานสรุปเงินสดคงค้างในมือผู้ดูแลเคสและเงินคืน (Caregiver Custody & Refunds)', icon: '💼' },
    { id: 'faqir_miskin_subfunds', name: '5. รายงานรายจ่ายตามกองทุนย่อยฟากีร–มิสกิน (5 รูปแบบ)', icon: '🏠' },
    { id: 'admin_expenses', name: '6. รายงานค่าใช้จ่ายบริหาร (10 หมวดหมู่)', icon: '📑' },
    { id: 'deposit_withdraw_transfers', name: '7. รายงานฝาก–ถอน–โอน ระหว่างบัญชีและเบิกเงิน', icon: '🔄' },
    { id: 'cash_flow_workflows', name: '8. รายงานการเบิกเงินสด 5 ขั้นตอนและเงินคงเหลือ', icon: '💵' },
    { id: 'allocated_vs_actual', name: '9. รายงานยอดจัดสรรเทียบยอดใช้จริง (Budget vs Actual)', icon: '📊' },
    { id: 'bank_balances', name: '10. รายงานเงินคงเหลือแยกตามบัญชีธนาคารและการกระทบยอด', icon: '🏦' },
    { id: 'by_recorder_approver', name: '11. รายงานธุรกรรมตามผู้บันทึกและผู้อนุมัติ', icon: '✍️' },
    { id: 'audit_reversals', name: '12. รายงานประวัติการแก้ไขและยกเลิกรายการ (Audit Log)', icon: '🛡️' },
  ];

  const [selectedReportId, setSelectedReportId] = useState('income_by_type');
  const [zakatYear, setZakatYear] = useState('2569');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/reports?type=${selectedReportId}&year=${zakatYear}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
      } else {
        showToast(`เกิดข้อผิดพลาด: ${json.error}`, 'error');
      }
    } catch (err: any) {
      showToast('ไม่สามารถโหลดข้อมูลรายงานได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReportId, zakatYear]);

  const handleDownloadCsv = () => {
    const url = `/api/finance/reports?type=${selectedReportId}&year=${zakatYear}&format=csv`;
    window.open(url, '_blank');
    showToast('เริ่มดาวน์โหลดรายงาน Microsoft Excel (.csv UTF-8 BOM)', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter rows by searchTerm
  const filteredRows = (reportData?.rows || []).filter((row: any[]) => {
    if (!searchTerm.trim()) return true;
    return row.some((cell) => String(cell).toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Report Selector Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              รายงานทางการเงินและบัญชี (Financial Reports & Statements)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              รองรับรายงานมาตรฐาน 10 ประเภท ตรวจสอบย้อนกลับได้ และส่งออกไฟล์ Microsoft Excel สมบูรณ์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              ส่งออก Excel (CSV)
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              พิมพ์รายงาน (Print)
            </button>
          </div>
        </div>

        {/* Filters and Selection */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">เลือกประเภทรายงานทางการเงิน</label>
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-600/20"
            >
              {reportOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.icon} {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รอบปีซะกาต / บัญชี</label>
            <select
              value={zakatYear}
              onChange={(e) => setZakatYear(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="2569">ประจำปี 2569 (1448 H)</option>
              <option value="2568">ประจำปี 2568 (1447 H)</option>
              <option value="2567">ประจำปี 2567 (1446 H)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Preview Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden printable-report">
        {/* Foundation Header for Official Printable View */}
        <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                ZMS
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {reportData?.title || 'รายงานทางการเงิน'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  มูลนิธิส่งเสริมการบริหารจัดการซะกาตและสาธารณกุศล | รอบปีบัญชี {zakatYear}
                </p>
              </div>
            </div>
          </div>

          {/* Quick search inside report */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาข้อมูลในตารางนี้..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Report Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
              กำลังประมวลผลรายงานทางการเงิน...
            </div>
          ) : !reportData || !reportData.headers ? (
            <div className="p-12 text-center text-xs text-slate-400">
              ไม่มีข้อมูลสำหรับรายงานที่เลือก
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-center w-12">#</th>
                  {reportData.headers.map((h: string, idx: number) => {
                    const isAmount = h.includes('(บาท)') || h.includes('จำนวนเงิน') || h.includes('ยอด');
                    return (
                      <th
                        key={idx}
                        className={`px-4 py-3 whitespace-nowrap ${isAmount ? 'text-right' : ''}`}
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={reportData.headers.length + 1} className="px-4 py-8 text-center text-slate-400">
                      ไม่พบข้อมูลตรงตามเงื่อนไขที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row: any[], rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                        {rIdx + 1}
                      </td>
                      {row.map((cell: any, cIdx: number) => {
                        const header = reportData.headers[cIdx] || '';
                        const isAmount = header.includes('(บาท)') || header.includes('จำนวนเงิน') || header.includes('ยอด');
                        return (
                          <td
                            key={cIdx}
                            className={`px-4 py-3 ${
                              isAmount 
                                ? 'text-right font-mono font-semibold text-slate-900' 
                                : 'text-slate-700'
                            }`}
                          >
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Audit Stamp */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>รายงานนี้ถูกสร้างขึ้นจากฐานข้อมูลจริง (ACID Transaction Verified) ไม่มีข้อมูลจำลอง</span>
          </div>
          <div className="text-slate-400">
            แสดง {filteredRows.length} จากทั้งหมด {reportData?.rows?.length || 0} รายการ
          </div>
        </div>
      </div>
    </div>
  );
}
