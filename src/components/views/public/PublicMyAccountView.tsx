'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  User, 
  Receipt, 
  Clock, 
  ShieldCheck, 
  Download, 
  Printer, 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  Lock, 
  Phone, 
  Mail, 
  MapPin, 
  Heart,
  ChevronRight,
  LogOut,
  Calendar,
  Sparkles
} from 'lucide-react';
import { FinancialTransaction, AssistanceApplication } from '@/types';
import { DocumentListTable } from '@/components/common/DocumentListTable';
import { ModalPortal } from '@/components/common/Modal';

interface PublicMyAccountViewProps {
  onNavigate: (view: string) => void;
}

export function PublicMyAccountView({ onNavigate }: PublicMyAccountViewProps) {
  const { currentUser, transactions, applications, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'payments' | 'assistance' | 'profile' | 'tax-summary'>('payments');
  const [selectedApp, setSelectedApp] = useState<AssistanceApplication | null>(null);

  // Filter states for payments
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Profile Form States
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '082-999-4455');
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Selected receipt modal
  const [selectedTxn, setSelectedTxn] = useState<FinancialTransaction | null>(null);

  // Filter transactions: for a member, show transactions associated with this user
  const userTransactions = transactions.filter((t) => {
    // In demo environment, show user's transactions or income transactions
    const matchesUser = t.payerOrPayee.includes(currentUser.name.split(' ')[0]) || 
                        t.payerOrPayee.includes('ยูซุฟ') || 
                        t.type === 'income';
    const matchesSearch = t.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.fundName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category.includes(categoryFilter);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

    return matchesUser && matchesSearch && matchesCategory && matchesStatus;
  });

  const totalUserDonation = userTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : 0), 0);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('บันทึกการแก้ไขข้อมูลส่วนตัวสำเร็จ', 'success');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('กรุณากรอกรหัสผ่านให้ครบถ้วน', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', 'error');
      return;
    }
    showToast('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePrintAnnualTax = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Header Profile Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {currentUser.name.slice(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {currentUser.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {currentUser.roleTitleTh}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              อีเมล: {currentUser.email} | เบอร์โทรศัพท์: {currentUser.phone || '082-999-4455'}
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'payments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ประวัติการจ่าย (Payments)
          </button>
          <button
            onClick={() => setActiveTab('assistance')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'assistance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            คำขอรับความช่วยเหลือ & เอกสารแนบ
          </button>
          <button
            onClick={() => setActiveTab('tax-summary')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'tax-summary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            สรุปลดหย่อนภาษีปี 2569
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'profile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ข้อมูลส่วนตัว & รหัสผ่าน
          </button>
        </div>
      </div>

      {/* TAB 1: Payment History & Receipts */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Quick Stats banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">ยอดจ่ายซะกาต/บริจาคสะสม</div>
              <div className="text-2xl font-black text-emerald-900">
                ฿{totalUserDonation.toLocaleString()} บาท
              </div>
              <div className="text-[11px] text-emerald-700">มีสิทธิ์นำไปลดหย่อนภาษีได้ 100%</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">จำนวนรายการธุรกรรม</div>
              <div className="text-2xl font-black text-slate-900">
                {userTransactions.length} รายการ
              </div>
              <div className="text-[11px] text-slate-400">ตรวจสอบและดาวน์โหลดใบเสร็จได้ทุกรายการ</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500">หนังสือรับรองประจำปี</div>
                <div className="text-sm font-bold text-slate-900 mt-1">ประจำปีภาษี 2569</div>
                <div className="text-[11px] text-slate-400">แบบสรุป e-Donation</div>
              </div>
              <button
                onClick={() => setActiveTab('tax-summary')}
                className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800"
              >
                ดูสรุป
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่รายการ / กองทุน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
              >
                <option value="all">ทุกประเภทการชำระ</option>
                <option value="ซะกาต">ซะกาต</option>
                <option value="ศอดะเกาะฮ์">ศอดะเกาะฮ์/บริจาคทั่วไป</option>
              </select>

              <button
                onClick={() => onNavigate('public-payment')}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors shrink-0"
              >
                + ทำรายการใหม่
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden hidden md:block">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                <tr>
                  <th className="py-3.5 px-4">เลขที่รายการ</th>
                  <th className="py-3.5 px-4">วันที่ทำรายการ</th>
                  <th className="py-3.5 px-4">ประเภท/วัตถุประสงค์</th>
                  <th className="py-3.5 px-4">กองทุน</th>
                  <th className="py-3.5 px-4 text-right">จำนวนเงิน</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-center">หลักฐาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      ไม่พบรายการธุรกรรมตามเงื่อนไขที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  userTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{t.transactionNo}</td>
                      <td className="py-3.5 px-4 text-slate-600">{t.date}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{t.category}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">{t.fundName}</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-900">
                        ฿{t.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {t.status === 'completed' ? 'สำเร็จ' : t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedTxn(t)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                        >
                          ดูใบเสร็จ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="space-y-3 md:hidden">
            {userTransactions.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800">{t.transactionNo}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                    สำเร็จ
                  </span>
                </div>
                <div className="font-bold text-slate-900">{t.category}</div>
                <div className="text-slate-500 text-[11px]">{t.fundName} • {t.date}</div>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-lg font-black text-emerald-900">฿{t.amount.toLocaleString()} บาท</span>
                  <button
                    onClick={() => setSelectedTxn(t)}
                    className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                  >
                    ดูใบเสร็จ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Assistance Applications & Attached Documents */}
      {activeTab === 'assistance' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">คำขอรับความช่วยเหลือและเอกสารแนบในระบบ</h3>
                <p className="text-xs text-slate-500">ตรวจสอบสถานะคำขอ พร้อมเปิดดูตัวอย่างและดาวน์โหลดเอกสารหลักฐานที่ยื่นไว้</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('assistance')}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>+ ยื่นคำขอใหม่</span>
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <div className="font-semibold text-slate-600 text-sm">ไม่พบคำขอรับความช่วยเหลือในบัญชีนี้</div>
                <div className="text-xs text-slate-400">เมื่อท่านยื่นแบบคำร้อง เอกสารแนบจะปรากฏที่นี่โดยอัตโนมัติ</div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Desktop Table View */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 hidden md:block">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                      <tr>
                        <th className="py-3 px-4">เลขที่คำขอ</th>
                        <th className="py-3 px-4">วันที่ยื่น</th>
                        <th className="py-3 px-4">ประเภทอัสนาฟ</th>
                        <th className="py-3 px-4 text-right">วงเงินที่ขอ</th>
                        <th className="py-3 px-4 text-center">สถานะ</th>
                        <th className="py-3 px-4 text-center">เอกสารแนบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">{app.applicationNo}</td>
                          <td className="py-3 px-4 text-slate-600">{app.appliedDate}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{app.asnafCategory}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">
                            ฿{app.requestedAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedApp(app)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1.5 border border-emerald-200 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>เปิดดูเอกสาร ({app.documents?.length || 0})</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="space-y-3 md:hidden">
                  {applications.map((app) => (
                    <div key={app.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800">{app.applicationNo}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800">
                          {app.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">{app.asnafCategory}</div>
                      <div className="text-slate-500 text-[11px]">ยื่นเมื่อ {app.appliedDate} • วงเงินขอ ฿{app.requestedAmount.toLocaleString()}</div>
                      <div className="pt-2 border-t flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="w-full py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>เปิดดูเอกสาร ({app.documents?.length || 0})</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Annual Tax Summary Statement */}
      {activeTab === 'tax-summary' && (
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="font-black text-base text-slate-900">
                มูลนิธิซะกาตและสาธารณกุศล (ประเทศไทย)
              </div>
              <div className="text-xs text-slate-500">
                หนังสือรับรองการบริจาคเพื่อการลดหย่อนภาษีเงินได้ ประจำปีภาษี พ.ศ. 2569
              </div>
            </div>
            <button
              onClick={handlePrintAnnualTax}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร</span>
            </button>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-slate-700">
            <p>
              หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า <strong>{currentUser.name}</strong> เลขประจำตัวผู้เสียภาษี/บัตรประชาชน <strong>1-1002-XXXXX-45-5</strong> ได้ร่วมบริจาคเงินซะกาตและเงินสาธารณกุศลแก่มูลนิธิฯ ในรอบปีภาษี พ.ศ. 2569 รวมทั้งสิ้น:
            </p>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
              <div className="text-xs text-emerald-800">ยอดเงินบริจาคสะสมทั้งปี (Total Eligible Donation)</div>
              <div className="text-3xl font-black text-emerald-950">
                ฿{totalUserDonation.toLocaleString()} บาท
              </div>
              <div className="text-[11px] text-emerald-700">
                (นำส่งข้อมูลผ่านระบบบริจาคอิเล็กทรอนิกส์ e-Donation กรมสรรพากรแล้ว)
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="font-bold text-slate-900">รายการธุรกรรมที่ได้รับการรับรอง:</div>
              <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
                {userTransactions.map((t) => (
                  <li key={t.id}>
                    {t.date} - {t.category} ({t.fundName}) ยอดเงิน ฿{t.amount.toLocaleString()} บาท (อ้างอิง: {t.transactionNo})
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 border-t flex justify-between items-end text-xs text-slate-500">
              <div>
                <div>ออกเอกสารเมื่อ: {new Date().toLocaleDateString('th-TH')}</div>
                <div>นายทะเบียนมูลนิธิซะกาตและสาธารณกุศล</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-800">ลายมือชื่ออิเล็กทรอนิกส์</div>
                <div className="text-[10px] text-emerald-700">Verified by ZMS Security Core</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Profile & Password Change */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Profile Details Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2">
              ข้อมูลบัญชีผู้ใช้งาน
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">อีเมล</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors"
              >
                บันทึกการแก้ไข
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2">
              เปลี่ยนรหัสผ่าน (Password Security)
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
              >
                อัปเดตรหัสผ่านใหม่
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Single Receipt Modal */}
      {selectedTxn && (
        <ModalPortal>
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[1050] flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedTxn(null);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl border max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden"
            >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">ใบสำคัญรับเงินบริจาค</h3>
              <button
                onClick={() => setSelectedTxn(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>เลขที่ใบสำคัญ:</span>
                <span className="font-mono font-bold text-slate-900">{selectedTxn.transactionNo}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>วันที่:</span>
                <span className="text-slate-900">{selectedTxn.date}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ผู้บริจาค:</span>
                <span className="font-bold text-slate-900">{selectedTxn.payerOrPayee}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>วัตถุประสงค์:</span>
                <span className="text-slate-900">{selectedTxn.category}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>กองทุน:</span>
                <span className="text-slate-900">{selectedTxn.fundName}</span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center text-sm font-bold">
                <span>ยอดเงิน:</span>
                <span className="text-emerald-800 text-xl font-black">
                  ฿{selectedTxn.amount.toLocaleString()} บาท
                </span>
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                พิมพ์ใบสำคัญ
              </button>
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* Member Application Documents Modal */}
      {selectedApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[1050] flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedApp(null);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl p-5 sm:p-8 max-w-4xl w-full max-h-[calc(100dvh-24px)] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-lg">
                    คำขอรับความช่วยเหลือ {selectedApp.applicationNo}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {selectedApp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ประเภทอัสนาฟ: {selectedApp.asnafCategory} • ยื่นเมื่อ {selectedApp.appliedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Documents List */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>เอกสารและหลักฐานประกอบคำขอที่แนบไว้ ({selectedApp.documents?.length || 0} ไฟล์)</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  ท่านสามารถเปิดดูตัวอย่างและดาวน์โหลดไฟล์ต้นฉบับได้ตลอดเวลา
                </span>
              </div>

              <DocumentListTable
                documents={selectedApp.documents || []}
                readOnly={true}
              />
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}
    </div>
  );
}
