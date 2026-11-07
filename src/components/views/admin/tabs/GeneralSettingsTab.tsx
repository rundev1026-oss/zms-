'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Settings, 
  Building2, 
  Globe, 
  Calendar, 
  FileText, 
  Bell, 
  Shield, 
  Database, 
  Check, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Lock,
  Download,
  ShieldCheck,
  Hash,
  Clock
} from 'lucide-react';

import { DatabaseBackupTab } from './DatabaseBackupTab';

export interface GeneralSettingsTabProps {
  initialSubSection?: 'org' | 'system' | 'docs' | 'notifications' | 'security' | 'backup';
}

export function GeneralSettingsTab({ initialSubSection = 'org' }: GeneralSettingsTabProps = {}) {
  // If backup mode, render DatabaseBackupTab directly without General Settings header/tabs
  if (initialSubSection === 'backup') {
    return <DatabaseBackupTab />;
  }
  const { showToast, authToken, currentUser, getAuthHeaders } = useApp();
  const [activeSubSection, setActiveSubSection] = useState<'org' | 'system' | 'docs' | 'notifications' | 'security' | 'backup'>(initialSubSection);

  useEffect(() => {
    if (initialSubSection) {
      setActiveSubSection(initialSubSection);
    }
  }, [initialSubSection]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form Fields State
  // A. Org Info
  const [orgNameTh, setOrgNameTh] = useState<string>('');
  const [orgNameEn, setOrgNameEn] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  // B. System Configuration
  const [activeFiscalYear, setActiveFiscalYear] = useState<string>('2569');
  const [currency, setCurrency] = useState<string>('THB');
  const [calendarType, setCalendarType] = useState<string>('buddhist');
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY');
  const [timezone, setTimezone] = useState<string>('Asia/Bangkok');
  const [pageSize, setPageSize] = useState<number>(10);
  const [approvalLimit1, setApprovalLimit1] = useState<number>(10000);
  const [approvalLimit2, setApprovalLimit2] = useState<number>(50000);
  const [approvalLimit3, setApprovalLimit3] = useState<number>(200000);

  // C. Document Formatting
  const [memberIdPattern, setMemberIdPattern] = useState<string>('MB-{YYYY}-{SEQ:6}');
  const [requestIdPattern, setRequestIdPattern] = useState<string>('REQ-{YYYY}-{SEQ:5}');
  const [docHeader, setDocHeader] = useState<string>('');
  const [docFooter, setDocFooter] = useState<string>('');

  // D. Notifications
  const [notifyNewRequest, setNotifyNewRequest] = useState<boolean>(true);
  const [notifyPendingApproval, setNotifyPendingApproval] = useState<boolean>(true);
  const [notifyFollowUp, setNotifyFollowUp] = useState<boolean>(true);

  // E. Security Policies
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(60);
  const [maxFailedLogins, setMaxFailedLogins] = useState<number>(5);
  const [passwordMinLength, setPasswordMinLength] = useState<number>(8);
  const [requireMfa, setRequireMfa] = useState<boolean>(false);

  // F. Backup State
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupResult, setBackupResult] = useState<{
    success: boolean;
    timestamp: string;
    checksum: string;
    filename: string;
  } | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const d = json.data;
        if (d) {
          setOrgNameTh(d.organizationNameTh || '');
          setOrgNameEn(d.organizationNameEn || '');
          setTaxId(d.taxId || '');
          setAddress(d.address || '');
          setPhone(d.phone || '');
          setEmail(d.email || '');
          setWebsite(d.website || 'https://zms.or.th');
          setLogoUrl(d.logoUrl || '/brand/zms-logo.svg');

          setActiveFiscalYear(d.activeFiscalYear || '2569');
          setCurrency(d.currency || 'THB');
          setCalendarType(d.calendarType || 'buddhist');
          setDateFormat(d.dateFormat || 'DD/MM/YYYY');
          setTimezone(d.timezone || 'Asia/Bangkok');
          setPageSize(d.pageSize || 10);
          setApprovalLimit1(d.approvalLimitTier1 || 10000);
          setApprovalLimit2(d.approvalLimitTier2 || 50000);
          setApprovalLimit3(d.approvalLimitTier3 || 200000);

          setMemberIdPattern(d.memberIdPattern || 'MB-{YYYY}-{SEQ:6}');
          setRequestIdPattern(d.requestIdPattern || 'REQ-{YYYY}-{SEQ:5}');
          setDocHeader(d.docHeader || 'มูลนิธิเพื่อการบริหารจัดการซะกาตและสาธารณกุศลแห่งประเทศไทย');
          setDocFooter(d.docFooter || 'เอกสารนี้ออกโดยระบบบริหารจัดการซะกาตอิเล็กทรอนิกส์ (ZMS Enterprise)');

          setNotifyNewRequest(d.notifyNewRequest !== undefined ? Boolean(d.notifyNewRequest) : true);
          setNotifyPendingApproval(d.notifyPendingApproval !== undefined ? Boolean(d.notifyPendingApproval) : true);
          setNotifyFollowUp(d.notifyFollowUp !== undefined ? Boolean(d.notifyFollowUp) : true);

          setSessionTimeoutMinutes(d.sessionTimeoutMinutes || 60);
          setMaxFailedLogins(d.maxFailedLogins || 5);
          setPasswordMinLength(d.passwordMinLength || 8);
          setRequireMfa(Boolean(d.requireMfa));
        }
      }
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถโหลดข้อมูลการตั้งค่าได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        organizationNameTh: orgNameTh.trim(),
        organizationNameEn: orgNameEn.trim(),
        taxId: taxId.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        logoUrl: logoUrl.trim(),

        activeFiscalYear,
        currency,
        calendarType,
        dateFormat,
        timezone,
        pageSize: Number(pageSize),
        approvalLimitTier1: Number(approvalLimit1),
        approvalLimitTier2: Number(approvalLimit2),
        approvalLimitTier3: Number(approvalLimit3),

        memberIdPattern: memberIdPattern.trim(),
        requestIdPattern: requestIdPattern.trim(),
        docHeader: docHeader.trim(),
        docFooter: docFooter.trim(),

        notifyNewRequest,
        notifyPendingApproval,
        notifyFollowUp,

        sessionTimeoutMinutes: Number(sessionTimeoutMinutes),
        maxFailedLogins: Number(maxFailedLogins),
        passwordMinLength: Number(passwordMinLength),
        requireMfa,
      };

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('บันทึกการตั้งค่าระบบและองค์กรสำเร็จ', 'success');
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await fetch('/api/system/backup', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBackupResult({
          success: true,
          timestamp: new Date().toLocaleString('th-TH'),
          checksum: json.data?.checksum || 'SHA256:7f8a9b2c3d4e5f...',
          filename: json.data?.filename || `zms-backup-${Date.now()}.db`,
        });
        showToast('สำรองข้อมูลระบบและคำนวณ Checksum สำเร็จ', 'success');
      } else {
        throw new Error(json.error || 'ไม่สามารถสำรองฐานข้อมูลได้');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Segmented Tabs Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubSection('org')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubSection === 'org' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>A. ข้อมูลองค์กร</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubSection('system')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubSection === 'system' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>B. การตั้งค่าระบบ & วงเงิน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubSection('docs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubSection === 'docs' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>C. รูปแบบเอกสาร & รหัส</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubSection('notifications')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubSection === 'notifications' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>D. การแจ้งเตือน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubSection('security')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubSection === 'security' ? 'bg-[#0B2545] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>E. ความปลอดภัย & Session</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 px-1">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="รีเฟรชการตั้งค่า"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Settings Form Container */}
      <form onSubmit={handleSaveAll} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        {/* A. ข้อมูลองค์กร */}
        {activeSubSection === 'org' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">A. ข้อมูลมูลนิธิและสำนักงานใหญ่</h3>
              <p className="text-xs text-slate-500">ข้อมูลนี้จะใช้แสดงผลบนส่วนหัวรายงาน เอกสารทางการ และระบบหน้าบ้าน</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อมูลนิธิ (ภาษาไทย) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={orgNameTh}
                  onChange={(e) => setOrgNameTh(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อมูลนิธิ (ภาษาอังกฤษ)</label>
                <input
                  type="text"
                  value={orgNameEn}
                  onChange={(e) => setOrgNameEn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลขทะเบียนมูลนิธิ / ผู้เสียภาษี</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อีเมลติดต่อทางการ</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เว็บไซต์ทางการ</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ที่อยู่สำนักงานใหญ่</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
          </div>
        )}

        {/* B. การตั้งค่าระบบ */}
        {activeSubSection === 'system' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">B. การตั้งค่าระบบ วันที่ และวงเงินอนุมัติ</h3>
              <p className="text-xs text-slate-500">กำหนดปฏิทินที่ใช้อ้างอิง รูปแบบวันที่ สกุลเงิน และเพดานวงเงินอนุมัติ 3 ระดับ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ปีงบประมาณปัจจุบัน</label>
                <input
                  type="text"
                  value={activeFiscalYear}
                  onChange={(e) => setActiveFiscalYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทปฏิทินที่ใช้อ้างอิง</label>
                <select
                  value={calendarType}
                  onChange={(e) => setCalendarType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value="buddhist">พุทธศักราช (พ.ศ.) - Buddhist Calendar</option>
                  <option value="gregorian">คริสต์ศักราช (ค.ศ.) - Gregorian Calendar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รูปแบบวันที่ (Date Format)</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value="DD/MM/YYYY">วัน/เดือน/ปี (DD/MM/YYYY)</option>
                  <option value="YYYY-MM-DD">ปี-เดือน-วัน (YYYY-MM-DD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">สกุลเงินหลัก</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เขตเวลา (Timezone)</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนรายการต่อหน้า (Page Size)</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
            </div>

            {/* Approval Limits */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-3">เพดานวงเงินอนุมัติคำร้องขอความช่วยเหลือ 3 ระดับ (Tiered Limits)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500">ขั้นที่ 1 (เจ้าหน้าที่ระดับต้น / สาขา):</span>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="number"
                      value={approvalLimit1}
                      onChange={(e) => setApprovalLimit1(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg"
                    />
                    <span className="text-xs text-slate-500">บาท</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500">ขั้นที่ 2 (หัวหน้าฝ่าย / คณะกรรมการย่อย):</span>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="number"
                      value={approvalLimit2}
                      onChange={(e) => setApprovalLimit2(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg"
                    />
                    <span className="text-xs text-slate-500">บาท</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500">ขั้นที่ 3 (คณะกรรมการบริหาร / อนุมัติพิเศษ):</span>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="number"
                      value={approvalLimit3}
                      onChange={(e) => setApprovalLimit3(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg"
                    />
                    <span className="text-xs text-slate-500">บาท</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* C. รูปแบบเอกสาร */}
        {activeSubSection === 'docs' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">C. รูปแบบเอกสารและโครงสร้างรหัสอ้างอิง</h3>
              <p className="text-xs text-slate-500">กำหนดรูปแบบรหัสสมาชิก รหัสคำร้อง และข้อความทางการบนเอกสารออกระบบ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รูปแบบรหัสสมาชิกถาวร (Member ID Pattern)
                </label>
                <input
                  type="text"
                  value={memberIdPattern}
                  onChange={(e) => setMemberIdPattern(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">ตัวอย่าง: MB-2569-000001</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รูปแบบรหัสคำร้องขอความช่วยเหลือ (Request ID Pattern)
                </label>
                <input
                  type="text"
                  value={requestIdPattern}
                  onChange={(e) => setRequestIdPattern(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">ตัวอย่าง: REQ-2569-00001</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ข้อความหัวกระดาษเอกสารทางการ (Document Header)</label>
              <input
                type="text"
                value={docHeader}
                onChange={(e) => setDocHeader(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ข้อความท้ายกระดาษเอกสารทางการ (Document Footer)</label>
              <input
                type="text"
                value={docFooter}
                onChange={(e) => setDocFooter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
          </div>
        )}

        {/* D. การแจ้งเตือน */}
        {activeSubSection === 'notifications' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">D. การแจ้งเตือนในระบบ (System Notifications)</h3>
              <p className="text-xs text-slate-500">เปิด/ปิดสวิตช์การแจ้งเตือนงานสำคัญแก่เจ้าหน้าที่และผู้เกี่ยวข้อง</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={notifyNewRequest}
                  onChange={(e) => setNotifyNewRequest(e.target.checked)}
                  className="mt-0.5 rounded text-teal-800 focus:ring-teal-700"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">แจ้งเตือนเมื่อมีคำร้องขอความช่วยเหลือใหม่</div>
                  <div className="text-[11px] text-slate-500">ส่งการแจ้งเตือนให้เจ้าหน้าที่ฝ่ายช่วยเหลือและผู้ดูแลสาขาทราบทันทีเมื่อมีคำร้องใหม่</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={notifyPendingApproval}
                  onChange={(e) => setNotifyPendingApproval(e.target.checked)}
                  className="mt-0.5 rounded text-teal-800 focus:ring-teal-700"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">แจ้งเตือนเมื่องานรอการอนุมัติ (Pending Approval)</div>
                  <div className="text-[11px] text-slate-500">ส่งแจ้งเตือนแก่ผู้มีอำนาจอนุมัติตามลำดับขั้นวงเงินเมื่อผลการประเมินสิทธิ์เสร็จสิ้น</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={notifyFollowUp}
                  onChange={(e) => setNotifyFollowUp(e.target.checked)}
                  className="mt-0.5 rounded text-teal-800 focus:ring-teal-700"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">แจ้งเตือนงานติดตามผล (Follow-Up Due Alerts)</div>
                  <div className="text-[11px] text-slate-500">แจ้งเตือนล่วงหน้า 7 วันเมื่อถึงกำหนดรอบลงพื้นที่ติดตามผลการช่วยเหลือ</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* E. ความปลอดภัย */}
        {activeSubSection === 'security' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">E. นโยบายความปลอดภัยและ Session (Security & Session Policies)</h3>
              <p className="text-xs text-slate-500">กำหนดระยะเวลาหมดอายุของบัญชี นโยบายรหัสผ่าน และการป้องกัน Brute Force</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ระยะเวลา Session หมดอายุ (นาที)
                </label>
                <input
                  type="number"
                  min={10}
                  max={480}
                  value={sessionTimeoutMinutes}
                  onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">มาตรฐาน: 60 นาที</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จำนวนครั้งสูงสุดที่รหัสผิดก่อนระงับ
                </label>
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={maxFailedLogins}
                  onChange={(e) => setMaxFailedLogins(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">ป้องกัน Brute Force: 5 ครั้ง</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ความยาวรหัสผ่านขั้นต่ำ (ตัวอักษร)
                </label>
                <input
                  type="number"
                  min={6}
                  max={32}
                  value={passwordMinLength}
                  onChange={(e) => setPasswordMinLength(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">แนะนำ: อย่างน้อย 8 ตัวอักษร</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireMfa}
                  onChange={(e) => setRequireMfa(e.target.checked)}
                  className="rounded text-teal-800 focus:ring-teal-700"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">บังคับใช้การยืนยันตัวตน 2 ขั้นตอน (2FA) สำหรับผู้ดูแลระบบ</div>
                  <div className="text-[11px] text-slate-500">บัญชีระดับ Super Admin และ Finance Officer ต้องตั้งค่า Authenticator App ก่อนเข้าใช้งาน</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* F. การสำรองข้อมูล */}
        {activeSubSection === 'backup' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">F. การสำรองข้อมูลและความปลอดภัย (Database Backup & Integrity)</h3>
              <p className="text-xs text-slate-500">สำรองฐานข้อมูล ZMS พร้อมคำนวณ Cryptographic SHA-256 Checksum ตรวจสอบความถูกต้องสมบูรณ์</p>
            </div>

            <div className="p-5 bg-teal-50/50 rounded-2xl border border-teal-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-teal-800" />
                  <h4 className="font-bold text-sm text-teal-950">สำรองฐานข้อมูลทันที (Manual Database Backup)</h4>
                </div>
                <p className="text-xs text-teal-800/80 mt-1">
                  ระบบจะสร้าง Snapshot ของฐานข้อมูล คำนวณ SHA-256 Checksum และบันทึกประวัติลง Audit Trail
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerBackup}
                disabled={isBackingUp}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 text-white font-bold text-xs shadow-xs hover:bg-teal-900 transition-all disabled:opacity-60 shrink-0"
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

            {backupResult && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>การสำรองข้อมูลล่าสุดสำเร็จ</span>
                </div>
                <div><strong>ไฟล์สำรอง:</strong> <span className="font-mono">{backupResult.filename}</span></div>
                <div><strong>เวลาดำเนินการ:</strong> {backupResult.timestamp}</div>
                <div><strong>SHA-256 Checksum:</strong> <span className="font-mono text-[11px] bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">{backupResult.checksum}</span></div>
              </div>
            )}
          </div>
        )}

        {/* Form Bottom Bar */}
        <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            ระบบบันทึก Audit Log ทุกครั้งที่มีการเปลี่ยนแปลงการตั้งค่าโดยผู้ดูแลระบบ
          </span>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-800 text-white font-bold text-xs shadow-xs hover:bg-teal-900 active:scale-98 transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่า</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

