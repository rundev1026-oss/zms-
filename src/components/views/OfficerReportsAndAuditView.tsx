'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  BarChart3, 
  ShieldAlert, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface OfficerReportsAndAuditViewProps {
  onNavigate: (view: string) => void;
  defaultSubTab?: 'officers' | 'audit';
}

export function OfficerReportsAndAuditView({ onNavigate, defaultSubTab = 'officers' }: OfficerReportsAndAuditViewProps) {
  const { auditLogs, applications, currentUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'officers' | 'audit'>(defaultSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;

    return matchesSearch && matchesEntity;
  });

  const officersPerformance = [
    {
      id: 'u-3',
      name: 'อุสมาน เจริญสุข',
      role: 'เจ้าหน้าที่ช่วยเหลือสังคม (Field Officer)',
      assignedCount: applications.length,
      docReviewedCount: applications.filter((a) => a.status !== 'draft').length,
      assessmentCompleted: applications.filter((a) => a.assessment).length,
      forwardedApproval: applications.filter((a) => a.status === 'pending_approval' || a.status === 'approved' || a.status === 'wait_disbursement' || a.status === 'disbursed').length,
      pendingTasks: applications.filter((a) => a.status === 'doc_review' || a.status === 'assessment').length,
      avgTurnaroundDays: 2.4,
      qualityScore: 98,
    },
    {
      id: 'u-7',
      name: 'ซะการียา มะแซ',
      role: 'เจ้าหน้าที่ลงพื้นที่ ชุมชนปริมณฑล',
      assignedCount: 8,
      docReviewedCount: 7,
      assessmentCompleted: 6,
      forwardedApproval: 5,
      pendingTasks: 2,
      avgTurnaroundDays: 3.1,
      qualityScore: 94,
    },
    {
      id: 'u-8',
      name: 'นูรีซัน สะมาแอ',
      role: 'เจ้าหน้าที่สงเคราะห์ ประจำสาขาใต้',
      assignedCount: 14,
      docReviewedCount: 13,
      assessmentCompleted: 12,
      forwardedApproval: 10,
      pendingTasks: 1,
      avgTurnaroundDays: 1.8,
      qualityScore: 99,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
              รายงานการทำงานเจ้าหน้าที่ & บันทึก Audit Log
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 font-mono">
              Immutable Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ติดตามประสิทธิภาพการลงพื้นที่ เวลาเฉลี่ยในการดำเนินการ และประวัติการทำธุรกรรมสำคัญที่ไม่สามารถลบได้
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('officers')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'officers'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รายงานประสิทธิภาพเจ้าหน้าที่
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              บันทึกระบบ (Audit Log)
            </button>
          </div>

          <button
            onClick={() => showToast('ส่งออกบันทึกรายงานเป็น Excel เรียบร้อย', 'success')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> ส่งออก Excel
          </button>
        </div>
      </div>

      {/* TAB 1: Officer Performance Scorecard */}
      {activeTab === 'officers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">เจ้าหน้าที่ลงพื้นที่</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">3 นาย</div>
              <div className="text-[11px] text-emerald-600 mt-1">ครอบคลุมทุกสาขา</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">คำร้องที่ดำเนินการแล้ว</span>
              <div className="text-2xl font-extrabold text-emerald-800 mt-1">27 รายการ</div>
              <div className="text-[11px] text-slate-500 mt-1">ส่งพิจารณาอนุมัติแล้ว 92%</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">เวลาเฉลี่ยถึงขั้นอนุมัติ</span>
              <div className="text-2xl font-extrabold text-indigo-800 mt-1">2.4 วัน</div>
              <div className="text-[11px] text-indigo-600 mt-1">เร็วกว่าเกณฑ์มาตรฐาน (5 วัน)</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">ดัชนีคุณภาพเอกสาร</span>
              <div className="text-2xl font-extrabold text-teal-800 mt-1">97.0%</div>
              <div className="text-[11px] text-teal-600 mt-1">ส่งกลับแก้ไขน้อยกว่า 3%</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                ตารางวัดผลการดำเนินงานบุคลากรรายบุคคล (Officer Workload & Metrics)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ชื่อเจ้าหน้าที่</th>
                    <th className="py-3 px-4 text-center">คำร้องรับผิดชอบ</th>
                    <th className="py-3 px-4 text-center">ตรวจเอกสารแล้ว</th>
                    <th className="py-3 px-4 text-center">ประเมินเสร็จสิ้น</th>
                    <th className="py-3 px-4 text-center">ส่งต่ออนุมัติ</th>
                    <th className="py-3 px-4 text-center">งานค้างส่ง</th>
                    <th className="py-3 px-4 text-center">เวลาเฉลี่ย</th>
                    <th className="py-3 px-4 text-center">คะแนนคุณภาพ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {officersPerformance.map((officer) => (
                    <tr key={officer.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{officer.name}</div>
                        <div className="text-[10px] text-slate-400">{officer.role}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {officer.assignedCount}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-700">
                        {officer.docReviewedCount}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-700">
                        {officer.assessmentCompleted}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                        {officer.forwardedApproval}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          officer.pendingTasks > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {officer.pendingTasks} งาน
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                        {officer.avgTurnaroundDays} วัน
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                        {officer.qualityScore}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Immutable Audit Log Viewer */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-purple-700" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  บันทึกประวัติการเปลี่ยนแปลงและธุรกรรม (Audit Trail Log)
                </h2>
                <p className="text-[11px] text-slate-400">
                  ระบบบันทึกแบบ Append-only ไม่สามารถแก้ไขหรือลบย้อนหลังได้ตามระเบียบความปลอดภัย
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา Action, ชื่อผู้ใช้, อ้างอิง..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="all">ทุก Entity</option>
                <option value="application">คำร้อง (Application)</option>
                <option value="disbursement">การจ่ายเงิน (Disbursement)</option>
                <option value="income">รายรับ (Income)</option>
                <option value="user">ผู้ใช้ (User)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">วัน-เวลา (พ.ศ.)</th>
                  <th className="py-3 px-4">ผู้กระทำ (User)</th>
                  <th className="py-3 px-4">การกระทำ (Action)</th>
                  <th className="py-3 px-4">เป้าหมาย (Entity)</th>
                  <th className="py-3 px-4">รายละเอียดการดำเนินการ</th>
                  <th className="py-3 px-4 font-mono">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-emerald-800 font-semibold whitespace-nowrap">
                      {log.entityId}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
