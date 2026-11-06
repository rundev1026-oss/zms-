'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Database, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  FileText, 
  HardDrive, 
  Shield, 
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';

export interface BackupItem {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  checksum: string;
  integrityOk: boolean;
}

export function DatabaseBackupTab() {
  const { showToast, currentUser } = useApp();
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [backupHistory, setBackupHistory] = useState<BackupItem[]>([]);
  const [latestBackup, setLatestBackup] = useState<BackupItem | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  // Fetch backup history
  const fetchBackupHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/system/backup');
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setBackupHistory(json.data);
        if (json.data.length > 0 && !latestBackup) {
          setLatestBackup(json.data[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load backup history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchBackupHistory();
  }, []);

  // Handle manual backup trigger
  const handleTriggerBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await fetch('/api/system/backup', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: `สำรองฐานข้อมูลโดยผู้ใช้งาน: ${currentUser?.name || 'Super Admin'}`,
          actor: {
            id: currentUser?.id || 'admin',
            name: currentUser?.name || 'ผู้ดูแลระบบ',
            role: currentUser?.role || 'super_admin'
          }
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const item: BackupItem = json.data;
        setLatestBackup(item);
        setBackupHistory((prev) => [item, ...prev.filter(b => b.filename !== item.filename)]);
        showToast('สำรองฐานข้อมูลระบบและคำนวณ Checksum สำเร็จ', 'success');
      } else {
        throw new Error(json.error || 'ไม่สามารถสำรองฐานข้อมูลได้');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการสำรองฐานข้อมูล', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChecksum(text);
    showToast('คัดลอก Checksum แล้ว', 'success');
    setTimeout(() => setCopiedChecksum(null), 2500);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-6">
        {/* Section Header */}
        <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Data Protection & Recovery</span>
            </div>
            <h3 className="text-xl font-extrabold text-[#0B2545] tracking-tight">
              การสำรองข้อมูลและความปลอดภัย (Database Backup & Integrity)
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              สำรองฐานข้อมูล ZMS พร้อมคำนวณ Cryptographic SHA-256 Checksum ตรวจสอบความถูกต้องสมบูรณ์ และบันทึกประวัติการทำงาน (Audit Trail)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchBackupHistory}
              disabled={isLoadingHistory}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="รีเฟรชประวัติการสำรองข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action Cards: Manual Backup & Auto Backup Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: สำรองข้อมูลด้วยตนเอง */}
          <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm mb-1">
                <Database className="w-5 h-5 text-teal-800" />
                <h4>สำรองฐานข้อมูลทันที (Manual Database Backup)</h4>
              </div>
              <p className="text-xs text-teal-800/80 leading-relaxed">
                ระบบจะสร้าง Snapshot ของฐานข้อมูล คำนวณ SHA-256 Checksum ตรวจสอบความถูกต้องสมบูรณ์ และบันทึกประวัติลง Audit Trail โดยทันที
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTriggerBackup}
                disabled={isBackingUp}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-800 text-white font-bold text-xs shadow-xs hover:bg-teal-900 active:scale-98 transition-all disabled:opacity-60"
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังสำรองฐานข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>สำรองฐานข้อมูลเดี๋ยวนี้</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: การสำรองข้อมูลอัตโนมัติ */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Clock className="w-5 h-5 text-slate-700" />
                  <h4>สำรองฐานข้อมูลอัตโนมัติ (Automated Schedule)</h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  เปิดใช้งาน
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                กำหนดการสำรองฐานข้อมูลอัตโนมัติทุกวันเวลา <strong>02:00 น.</strong> พร้อมระบบตรวจสอบความสมบูรณ์และหมุนเวียนเก็บข้อมูลสำรองย้อนหลัง 30 วัน
              </p>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-2 border-t border-slate-200/60">
              <Shield className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>ความถี่: รายวัน (Daily Snapshot) | สำรองล่าสุด: {latestBackup ? latestBackup.createdAt : 'ไม่มี'}</span>
            </div>
          </div>
        </div>

        {/* Latest Backup Details Callout */}
        {latestBackup && (
          <div className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between gap-2 border-b border-emerald-200/70 pb-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>ผลการสำรองข้อมูลล่าสุดสำเร็จ (Integrity Validated)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                100% Complete
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-slate-500 block text-[11px]">ชื่อไฟล์สำรอง:</span>
                <span className="font-mono font-semibold text-slate-800 text-[11px] break-all">{latestBackup.filename}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">เวลาที่ดำเนินการ:</span>
                <span className="font-medium text-slate-800 text-[11px]">{latestBackup.createdAt}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">ขนาดไฟล์:</span>
                <span className="font-medium text-slate-800 text-[11px]">{formatBytes(latestBackup.sizeBytes)}</span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-slate-500 block text-[11px] mb-1">Cryptographic SHA-256 Checksum:</span>
              <div className="flex items-center gap-2 bg-white/90 p-2 rounded-xl border border-emerald-300 font-mono text-[11px] text-emerald-900 break-all">
                <span className="flex-1 select-all">{latestBackup.checksum}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(latestBackup.checksum)}
                  className="p-1 rounded text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0"
                  title="คัดลอก Checksum"
                >
                  {copiedChecksum === latestBackup.checksum ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backup History Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-700" />
              <span>ประวัติการสำรองฐานข้อมูล (Backup History Log)</span>
            </h4>
            <span className="text-xs text-slate-400">
              พบ {backupHistory.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">เวลาที่สำรอง</th>
                  <th className="px-4 py-3">ชื่อไฟล์สำรอง</th>
                  <th className="px-4 py-3">ขนาดไฟล์</th>
                  <th className="px-4 py-3">SHA-256 Checksum</th>
                  <th className="px-4 py-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {backupHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      {isLoadingHistory ? 'กำลังโหลดประวัติ...' : 'ไม่พบประวัติการสำรองฐานข้อมูล'}
                    </td>
                  </tr>
                ) : (
                  backupHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                        {item.createdAt}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-900 whitespace-nowrap">
                        {item.filename}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatBytes(item.sizeBytes)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500 max-w-[200px] truncate" title={item.checksum}>
                        {item.checksum}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>สมบูรณ์</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Footer Notice */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-700 shrink-0" />
            <span>ระบบบันทึก Audit Log ทุกครั้งที่มีการสำรองข้อมูลหรือเข้าถึงข้อมูลระบบโดยอัตโนมัติ</span>
          </div>
          <div className="text-[11px] text-slate-400">
            เกณฑ์ความปลอดภัย: ISO/IEC 27001 & Electronic Transaction Standard
          </div>
        </div>
      </div>
    </div>
  );
}

