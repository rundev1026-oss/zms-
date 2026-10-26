'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Building2, 
  Calendar, 
  Eye, 
  EyeOff,
  ArrowLeft,
  Save,
  Check
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');

  // Profile data
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Notification toggles
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationSms, setNotificationSms] = useState(false);
  const [notificationApp, setNotificationApp] = useState(true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('zms_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/profile', { headers, credentials: 'include' });
      const json = await res.json();

      if (!res.ok || !json.success) {
        // If not authenticated, redirect to login
        router.push('/login');
        return;
      }

      const u = json.data;
      setUser(u);
      setFirstName(u.firstName || u.name?.split(' ')[0] || '');
      setLastName(u.lastName || u.name?.split(' ').slice(1).join(' ') || '');
      setPhone(u.phone || '');
      setNotificationEmail(u.notificationEmail ?? true);
      setNotificationSms(u.notificationSms ?? false);
      setNotificationApp(u.notificationApp ?? true);
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setProfileSuccessMessage('');

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('กรุณาระบุชื่อและนามสกุล');
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('zms_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          notificationEmail,
          notificationSms,
          notificationApp,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      setUser(json.data);
      setProfileSuccessMessage('บันทึกข้อมูลส่วนตัวและการตั้งค่าแจ้งเตือนสำเร็จ');
      showToast('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว', 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setPasswordSuccessMessage('');

    if (!currentPassword) {
      setErrorMessage('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setIsChangingPass(true);
      const token = localStorage.getItem('zms_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'การเปลี่ยนรหัสผ่านล้มเหลว');
      }

      setPasswordSuccessMessage('เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว');
      showToast('เปลี่ยนรหัสผ่านใหม่สำเร็จ', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setIsChangingPass(false);
    }
  };

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

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/my-account"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับไปหน้าบัญชีสมาชิก (Dashboard)</span>
          </Link>
          <span className="text-xs text-slate-400 font-medium">จัดการข้อมูลส่วนตัวและความปลอดภัย</span>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-20 text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full mx-auto mb-3"></div>
            <span>กำลังโหลดข้อมูลโปรไฟล์...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Account Overview & Verification Badges */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {user?.name?.slice(0, 1) || 'U'}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">{user?.name}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {user?.roleTitleTh || 'สมาชิกทั่วไป'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t text-xs text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">อีเมล:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[170px]">{user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">ยืนยันอีเมล:</span>
                    {user?.emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ยืนยันแล้ว
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        รอยืนยัน (Unverified)
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">ยืนยันเบอร์โทร:</span>
                    {user?.phoneVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ยืนยันแล้ว
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        ยังไม่ได้ยืนยัน
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">นโยบาย PDPA:</span>
                    <span className="text-[11px] font-mono text-emerald-800 font-bold">
                      {user?.pdpaConsentVersion || 'v2569.1'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">สร้างบัญชีเมื่อ:</span>
                    <span className="text-[11px] text-slate-600">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '16 ต.ค. 2569'}
                    </span>
                  </div>
                </div>

                {/* Organization Details (Read-only for security) */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>สังกัดและสิทธิ์การเข้าถึง</span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div>• สาขา: <span className="font-semibold text-slate-800">{user?.branchId === 'br-hq' ? 'สำนักงานใหญ่ (กรุงเทพฯ)' : (user?.branchId || 'ส่วนกลาง')}</span></div>
                    <div>• แผนก: <span className="font-semibold text-slate-800">{user?.departmentId === 'dept-public' ? 'ประชาชนและผู้บริจาคทั่วไป' : (user?.departmentId || 'สมาชิก')}</span></div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      * สิทธิ์และสาขาควบคุมโดยผู้ดูแลระบบ ไม่อนุญาตให้แก้ไขด้วยตนเอง
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Edit Profile & Password Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Form 1: Personal Details & Notifications */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="border-b pb-3">
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>แก้ไขข้อมูลส่วนตัว</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    อัปเดตชื่อ นามสกุล และเบอร์โทรศัพท์สำหรับรับการแจ้งเตือน
                  </p>
                </div>

                {profileSuccessMessage && (
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{profileSuccessMessage}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">ชื่อจริง *</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">นามสกุล *</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">อีเมล (บัญชีหลัก)</label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        อีเมลใช้เป็นตัวระบุบัญชีหลัก หากต้องการเปลี่ยนกรุณาติดต่อเจ้าหน้าที่
                      </span>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">เบอร์โทรศัพท์</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08X-XXX-XXXX"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Notification Preferences */}
                  <div className="pt-3 border-t space-y-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-emerald-700" />
                      <span>การตั้งค่าการแจ้งเตือน (Notification Preferences)</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                        <div>
                          <div className="font-semibold text-slate-800">แจ้งเตือนผ่านอีเมล (Email Notification)</div>
                          <div className="text-[10px] text-slate-500">รับใบเสร็จ e-Donation และสรุปการบริจาคประจำปี</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationEmail}
                          onChange={(e) => setNotificationEmail(e.target.checked)}
                          className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                        <div>
                          <div className="font-semibold text-slate-800">แจ้งเตือนผ่าน SMS</div>
                          <div className="text-[10px] text-slate-500">รับรหัสยืนยันและข้อความแจ้งผลการอนุมัติคำร้อง</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationSms}
                          onChange={(e) => setNotificationSms(e.target.checked)}
                          className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                        <div>
                          <div className="font-semibold text-slate-800">แจ้งเตือนในระบบ (In-App Notifications)</div>
                          <div className="text-[10px] text-slate-500">แสดงรายการแจ้งเตือนบนแถบเมนูด้านบนของเว็บไซต์</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationApp}
                          onChange={(e) => setNotificationApp(e.target.checked)}
                          className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขโปรไฟล์'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Form 2: Change Password */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="border-b pb-3">
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-700" />
                    <span>เปลี่ยนรหัสผ่าน (Change Password)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    ต้องยืนยันรหัสผ่านปัจจุบันเพื่อความปลอดภัยของข้อมูล
                  </p>
                </div>

                {passwordSuccessMessage && (
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{passwordSuccessMessage}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">รหัสผ่านปัจจุบัน *</label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pr-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">รหัสผ่านใหม่ *</label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="อย่างน้อย 8 ตัวอักษร"
                          className="w-full pr-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">ยืนยันรหัสผ่านใหม่ *</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      {isChangingPass ? 'กำลังเปลี่ยน...' : 'อัปเดตรหัสผ่านใหม่'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      <PublicFooter onNavigate={(view) => router.push(view === 'public-home' ? '/' : `/#${view.replace('public-', '')}`)} />
    </div>
  );
}
