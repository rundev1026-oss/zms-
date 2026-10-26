'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Coins, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  TrendingUp, 
  PieChart, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Lock,
  ArrowUpRight
} from 'lucide-react';

interface TransparencyData {
  funds: {
    id: string;
    code: string;
    name: string;
    category: string;
    totalReceived: number;
    committedAmount: number;
    disbursedAmount: number;
    availableAmount: number;
  }[];
  recentTransactions: {
    type: string;
    fundName: string;
    category: string;
    amount: number;
    date: string;
  }[];
  asnafDistribution: {
    category: string;
    count: number;
    totalRequested: number;
  }[];
  reportGeneratedAt: string;
}

export function PublicTransparencyView() {
  const [data, setData] = useState<TransparencyData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadReport() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/public/transparency');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setData(json.data);
        }
      } catch (err) {
        console.error('Failed to load transparency report:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, []);

  const totalReceived = data?.funds.reduce((acc, f) => acc + f.totalReceived, 0) || 0;
  const totalDisbursed = data?.funds.reduce((acc, f) => acc + f.disbursedAmount, 0) || 0;
  const totalCommitted = data?.funds.reduce((acc, f) => acc + f.committedAmount, 0) || 0;
  const totalAvailable = data?.funds.reduce((acc, f) => acc + f.availableAmount, 0) || 0;

  const handleExportCSV = () => {
    if (!data) return;
    const header = '\uFEFFรหัสกองทุน,ชื่อกองทุน,หมวดหมู่,ยอดรับจริงทั้งสิ้น (บาท),ยอดผูกพันรอจ่าย (บาท),ยอดจ่ายจริงแล้ว (บาท),ยอดคงเหลือจัดสรรได้ (บาท)\n';
    const rows = data.funds.map((f) => 
      `"${f.code}","${f.name}","${f.category}",${f.totalReceived},${f.committedAmount},${f.disbursedAmount},${f.availableAmount}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ZMS-Transparency-Report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>รายงานความโปร่งใสและธรรมาภิบาลต่อสาธารณะ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            รายงานสถานะการเงินและการจัดสรรซะกาต
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            เปิดเผยยอดรับ ยอดจ่ายจริง ยอดผูกพัน และยอดคงเหลือตามหลักการบริหารบัญชีแยกกองทุน (Fund Accounting)
            รายงานอัปเดต ณ {data?.reportGeneratedAt || 'กำลังโหลด...'}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>ส่งออก CSV (Excel)</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* Summary 4-Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500">ยอดรับจริงสะสม</div>
          <div className="text-2xl font-black text-slate-900">
            ฿{isLoading ? '...' : totalReceived.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">ยืนยันเข้าบัญชีเรียบร้อย</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500">ยอดจ่ายสวัสดิการจริง</div>
          <div className="text-2xl font-black text-slate-900">
            ฿{isLoading ? '...' : totalDisbursed.toLocaleString()}
          </div>
          <div className="text-[11px] text-teal-700 font-medium">ส่งมอบถึงมือผู้รับแล้ว</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500">ยอดผูกพันรอจ่าย</div>
          <div className="text-2xl font-black text-amber-900">
            ฿{isLoading ? '...' : totalCommitted.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-700 font-medium">อนุมัติแล้ว รอตัดรอบจ่าย</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500">ยอดคงเหลือจัดสรรได้</div>
          <div className="text-2xl font-black text-emerald-800">
            ฿{isLoading ? '...' : totalAvailable.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">พร้อมช่วยเหลือเคสถัดไป</div>
        </div>
      </div>

      {/* Fund Accounts Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              สถานะเงินกองทุนแยกตามวัตถุประสงค์ (Fund Accounts Ledger)
            </h2>
            <p className="text-xs text-slate-500">
              ห้ามโอนข้ามกองทุนซะกาตตามหลักชารีอะฮ์ และแยกค่าใช้จ่ายดำเนินงานชัดเจน
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            กระทบยอดบัญชีตรง 100%
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-y">
              <tr>
                <th className="py-3 px-3">รหัส</th>
                <th className="py-3 px-3">ชื่อกองทุน</th>
                <th className="py-3 px-3">หมวดหมู่</th>
                <th className="py-3 px-3 text-right">ยอดรับทั้งสิ้น</th>
                <th className="py-3 px-3 text-right">ยอดผูกพันรอจ่าย</th>
                <th className="py-3 px-3 text-right">ยอดจ่ายแล้ว</th>
                <th className="py-3 px-3 text-right">คงเหลือจัดสรรได้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.funds.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-500">{f.code}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">{f.name}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      f.category === 'zakat' ? 'bg-emerald-100 text-emerald-800' :
                      f.category === 'sadaqah' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {f.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold">฿{f.totalReceived.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-amber-700 font-medium">฿{f.committedAmount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-600">฿{f.disbursedAmount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-800">฿{f.availableAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="space-y-3 md:hidden">
          {data?.funds.map((f) => (
            <div key={f.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-400 font-bold">{f.code}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {f.category}
                </span>
              </div>
              <div className="font-bold text-slate-900">{f.name}</div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t text-slate-600">
                <div>รับทั้งสิ้น: <strong className="text-slate-900">฿{f.totalReceived.toLocaleString()}</strong></div>
                <div>จ่ายแล้ว: <strong className="text-slate-900">฿{f.disbursedAmount.toLocaleString()}</strong></div>
                <div>ผูกพัน: <span className="text-amber-800 font-semibold">฿{f.committedAmount.toLocaleString()}</span></div>
                <div>คงเหลือ: <span className="text-emerald-800 font-bold">฿{f.availableAmount.toLocaleString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PDPA Privacy Protection Assurance */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Lock className="w-4 h-4" />
            <span>มาตรฐานความปลอดภัยและการปกป้องข้อมูลส่วนบุคคล (PDPA)</span>
          </div>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            รายงานความโปร่งใสนี้เปิดเผยเฉพาะตัวเลขสรุปทางบัญชีและสถิติภาพรวม โดยไม่เปิดเผยชื่อผู้รับความช่วยเหลือ, 
            เลขบัตรประชาชน, ที่อยู่ หรือยอดหนี้สินส่วนบุคคล เพื่อรักษาเกียรติและศักดิ์ศรีของผู้รับความช่วยเหลือตามกฎหมาย
          </p>
        </div>

        <div className="shrink-0 text-center sm:text-right text-xs">
          <div className="font-bold text-emerald-300">รับรองโดย</div>
          <div className="text-slate-400">คณะกรรมการชะรีอะฮ์และฝ่ายตรวจสอบ</div>
        </div>
      </div>
    </div>
  );
}
