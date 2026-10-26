'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  User, 
  Receipt, 
  Clock, 
  ShieldCheck, 
  Printer, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Building2, 
  Calendar, 
  LogOut, 
  ChevronRight, 
  Heart, 
  FileText, 
  ExternalLink,
  Plus,
  RefreshCw,
  FolderOpen,
  Eye,
  X
} from 'lucide-react';
import { BeneficiaryDocument } from '@/types';
import { DocumentListTable } from '@/components/common/DocumentListTable';

interface TransactionItem {
  id: string;
  transactionNo: string;
  date: string;
  type: string;
  fundId: string;
  fundName: string;
  category: string;
  amount: number;
  paymentMethod: string;
  payerOrPayee: string;
  referenceNo: string;
  receiptUrl?: string;
  status: string;
  createdAt: string;
}

interface ApplicationItem {
  id: string;
  applicationNo: string;
  asnafCategory: string;
  requestedAmount: number;
  approvedAmount?: number | null;
  status: string;
  submittedAt: string;
  approvedAt?: string | null;
  documents?: BeneficiaryDocument[];
}

export default function MyAccountPage() {
  const router = useRouter();
  const { showToast, logoutUser } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'payments' | 'assistance' | 'tax-summary'>('payments');

  // Account Data
  const [userData, setUserData] = useState<any>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [summary, setSummary] = useState({
    totalDonations: 0,
    transactionCount: 0,
    applicationCount: 0,
  });

  // Filters for transactions
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected receipt modal
  const [selectedTxn, setSelectedTxn] = useState<TransactionItem | null>(null);
  // Selected application modal
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('zms_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/my-account', { headers, credentials: 'include' });
      const json = await res.json();

      if (!res.ok || !json.success) {
        router.push('/login');
        return;
      }

      setUserData(json.data.user);
      setTransactions(json.data.transactions || []);
      setApplications(json.data.applications || []);
      setSummary(json.data.summary || { totalDonations: 0, transactionCount: 0, applicationCount: 0 });
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถโหลดข้อมูลบัญชีได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login?logout=success');
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = 
      t.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fundName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || t.category.includes(categoryFilter);
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PublicHeader 
        currentView="public-my-account" 
        onNavigate={(view) => {
          if (view === 'public-home') router.push('/');
          else if (view === 'public-my-account') router.push('/my-account');
          else router.push(`/#${view.replace('public-', '')}`);
        }} 
        onSwitchToAdmin={() => router.push('/#admin')}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn pb-16">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full mx-auto mb-3"></div>
            <span>กำลังโหลดข้อมูลบัญชีสมาชิกจากฐานข้อมูล...</span>
          </div>
        ) : (
          <>
            {/* Top User Profile Banner */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-800 via-emerald-700 to-teal-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {userData?.name?.slice(0, 1) || 'U'}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                      {userData?.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {userData?.roleTitleTh || 'สมาชิกผู้บริจาค'}
                    </span>
                    {userData?.emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> ยืนยันอีเมลแล้ว
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        รอยืนยันอีเมล
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    อีเมล: <strong className="text-slate-700">{userData?.email}</strong> • เบอร์โทร: <strong className="text-slate-700">{userData?.phone || 'ยังไม่ได้ระบุ'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    สังกัด: {userData?.branchName} • {userData?.departmentName}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  href="/profile"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>แก้ไขโปรไฟล์ & รหัสผ่าน</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-emerald-600" />
                  <span>ยอดจ่ายซะกาต/บริจาคของตนเอง</span>
                </div>
                <div className="text-2xl font-black text-emerald-900">
                  ฿{summary.totalDonations.toLocaleString()} บาท
                </div>
                <div className="text-[11px] text-emerald-700">ดึงข้อมูลจากบัญชีจริง มีสิทธิ์ลดหย่อนภาษี 100%</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  <span>จำนวนธุรกรรมที่บันทึกแล้ว</span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {summary.transactionCount} รายการ
                </div>
                <div className="text-[11px] text-slate-400">ตรวจสอบและพิมพ์ใบสำคัญรับเงินได้ทุกรายการ</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>คำขอรับความช่วยเหลือ</span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {summary.applicationCount} คำขอ
                </div>
                <div className="text-[11px] text-slate-400">เฉพาะคำขอที่ผูกกับบัญชีของผู้ใช้ท่านนี้</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-bold gap-2">
              <button
                onClick={() => setActiveTab('payments')}
                className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === 'payments'
                    ? 'border-emerald-700 text-emerald-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>ประวัติการจ่ายซะกาต & บริจาค ({transactions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('assistance')}
                className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === 'assistance'
                    ? 'border-emerald-700 text-emerald-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>คำขอรับความช่วยเหลือ ({applications.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('tax-summary')}
                className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === 'tax-summary'
                    ? 'border-emerald-700 text-emerald-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>หนังสือรับรองการบริจาคประจำปี</span>
              </button>
            </div>

            {/* TAB 1: Payment History */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ค้นหาเลขที่รายการ / กองทุน..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
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

                    <Link
                      href="/zakat-payment"
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ทำรายการใหม่</span>
                    </Link>
                  </div>
                </div>

                {/* Table View (Desktop) */}
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
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <FolderOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <div className="font-semibold text-slate-600">ไม่พบประวัติรายการชำระเงินของบัญชีนี้</div>
                            <div className="text-[11px] text-slate-400 mt-1">เมื่อท่านทำรายการบริจาคหรือชำระซะกาต รายการจะปรากฏที่นี่โดยอัตโนมัติ</div>
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((t) => (
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
                  {filteredTransactions.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                      ไม่พบประวัติการทำรายการของบัญชีนี้
                    </div>
                  ) : (
                    filteredTransactions.map((t) => (
                      <div key={t.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-800">{t.transactionNo}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                            {t.status === 'completed' ? 'สำเร็จ' : t.status}
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
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Assistance Applications */}
            {activeTab === 'assistance' && (
              <div className="space-y-4">
                {applications.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3">
                    <FolderOpen className="w-12 h-12 mx-auto text-slate-300" />
                    <h3 className="font-bold text-slate-800 text-base">ไม่พบประวัติคำขอรับความช่วยเหลือ</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      ท่านยังไม่มีคำขอรับความช่วยเหลือที่ยื่นไว้กับมูลนิธิฯ หรือข้อมูลบัตรประชาชนไม่ได้ผูกกับบัญชีสมาชิกนี้
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/assistance"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>ยื่นคำขอรับความช่วยเหลือ</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Desktop Table View */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden hidden md:block">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                          <tr>
                            <th className="py-3.5 px-4">เลขที่คำขอ</th>
                            <th className="py-3.5 px-4">วันที่ยื่น</th>
                            <th className="py-3.5 px-4">ประเภทอัสนาฟ</th>
                            <th className="py-3.5 px-4 text-right">วงเงินที่ขอ</th>
                            <th className="py-3.5 px-4 text-right">วงเงินอนุมัติ</th>
                            <th className="py-3.5 px-4 text-center">สถานะ</th>
                            <th className="py-3.5 px-4 text-center">เอกสารแนบ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {applications.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{a.applicationNo}</td>
                              <td className="py-3.5 px-4 text-slate-600">{a.submittedAt}</td>
                              <td className="py-3.5 px-4 font-semibold text-slate-900">{a.asnafCategory}</td>
                              <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                                ฿{a.requestedAmount.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 text-right font-black text-emerald-900">
                                {a.approvedAmount ? `฿${a.approvedAmount.toLocaleString()}` : '-'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {a.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedApp(a)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1.5 border border-emerald-200 transition-colors cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>เปิดดูเอกสาร ({a.documents?.length || 0})</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="space-y-3 md:hidden">
                      {applications.map((a) => (
                        <div key={a.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-800">{a.applicationNo}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800">
                              {a.status}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{a.asnafCategory}</div>
                            <div className="text-slate-500 text-[11px] mt-0.5">ยื่นเมื่อ {a.submittedAt}</div>
                          </div>
                          <div className="pt-2 border-t flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block">วงเงินที่ขอ</span>
                              <span className="text-sm font-black text-emerald-900">฿{a.requestedAmount.toLocaleString()}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedApp(a)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>เปิดดูเอกสาร ({a.documents?.length || 0})</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Tax Summary */}
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
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์เอกสาร</span>
                  </button>
                </div>

                <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                  <p>
                    หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า <strong>{userData?.name}</strong> ได้ร่วมบริจาคเงินซะกาตและเงินสาธารณกุศลแก่มูลนิธิฯ ในรอบปีภาษี พ.ศ. 2569 รวมทั้งสิ้น:
                  </p>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
                    <div className="text-xs text-emerald-800">ยอดเงินบริจาคสะสมทั้งปี (Total Eligible Donation)</div>
                    <div className="text-3xl font-black text-emerald-950">
                      ฿{summary.totalDonations.toLocaleString()} บาท
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      (นำส่งข้อมูลผ่านระบบบริจาคอิเล็กทรอนิกส์ e-Donation กรมสรรพากรแล้ว)
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <div className="font-bold text-slate-900">รายการธุรกรรมที่ได้รับการรับรอง:</div>
                    {filteredTransactions.length === 0 ? (
                      <div className="text-slate-400 italic">ยังไม่มีรายการชำระเงินที่สมบูรณ์ในปีภาษีนี้</div>
                    ) : (
                      <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
                        {filteredTransactions.map((t) => (
                          <li key={t.id}>
                            {t.date} - {t.category} ({t.fundName}) ยอดเงิน ฿{t.amount.toLocaleString()} บาท (อ้างอิง: {t.transactionNo})
                          </li>
                        ))}
                      </ul>
                    )}
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
          </>
        )}

        {/* Single Receipt Modal */}
        {selectedTxn && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl border">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-slate-900 text-base">ใบสำคัญรับเงินบริจาค / ซะกาต</h3>
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>เลขที่ใบสำคัญ:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTxn.transactionNo}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>วันที่ทำรายการ:</span>
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
                <div className="flex justify-between text-slate-600">
                  <span>ช่องทางชำระเงิน:</span>
                  <span className="text-slate-900">{selectedTxn.paymentMethod}</span>
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบสำคัญรับเงิน</span>
                </button>
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Member Application Documents Modal */}
        {selectedApp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-200">
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
                    ประเภทอัสนาฟ: {selectedApp.asnafCategory} • ยื่นเมื่อ {selectedApp.submittedAt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">วงเงินที่ยื่นขอ</span>
                  <span className="font-bold text-slate-900 text-sm">฿{selectedApp.requestedAmount.toLocaleString()} บาท</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">วงเงินอนุมัติ</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {selectedApp.approvedAmount ? `฿${selectedApp.approvedAmount.toLocaleString()} บาท` : 'รอการพิจารณา'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[10px]">เอกสารแนบทั้งหมด</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedApp.documents?.length || 0} ไฟล์</span>
                </div>
              </div>

              {/* Documents List */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span>เอกสารและหลักฐานประกอบคำขอที่แนบไว้</span>
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
        )}
      </main>

      <PublicFooter onNavigate={(view) => router.push(view === 'public-home' ? '/' : `/#${view.replace('public-', '')}`)} />
    </div>
  );
}
