'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  LogIn, 
  UserPlus, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface PublicAuthViewProps {
  onNavigate: (view: string) => void;
  defaultMode?: 'login' | 'register';
}

export function PublicAuthView({ onNavigate, defaultMode = 'login' }: PublicAuthViewProps) {
  const { showToast, currentUser, switchUserRole } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);

  // Form states
  const [email, setEmail] = useState('yusuf.donor@email.com');
  const [password, setPassword] = useState('Zms@Secure2569!');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pdpaConsent, setPdpaConsent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('กรุณากรอกอีเมลและรหัสผ่าน', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const json = await res.json();
      if (json.success) {
        if (json.token) {
          localStorage.setItem('zms_auth_token', json.token);
        }
        showToast(`ยินดีต้อนรับคุณ ${json.user.name} เข้าสู่ระบบ`, 'success');
        switchUserRole(json.user.role);
        onNavigate('public-my-account');
      } else {
        showToast(json.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', 'error');
      return;
    }
    if (!pdpaConsent) {
      showToast('กรุณายินยอมตามเงื่อนไขนโยบายความเป็นส่วนตัว PDPA', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || fullName.trim();
      const lastName = nameParts.slice(1).join(' ') || '-';

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
          confirmPassword,
          pdpaConsent,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'การสมัครสมาชิกล้มเหลว', 'error');
        return;
      }

      showToast(json.message || 'สมัครสมาชิกสำเร็จเรียบร้อย ท่านสามารถเข้าสู่ระบบได้ทันที', 'success');
      setMode('login');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('กรุณากรอกอีเมลที่ลงทะเบียนไว้', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'การขอรีเซ็ตรหัสผ่านล้มเหลว', 'error');
        return;
      }

      showToast(json.message, 'success');
      setMode('login');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6 animate-fadeIn pb-10">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
          ZMS
        </div>
        <h1 className="text-xl font-black text-slate-900">
          {mode === 'login' && 'เข้าสู่ระบบสมาชิกและประชาชน'}
          {mode === 'register' && 'สมัครสมาชิกระบบซะกาตออนไลน์'}
          {mode === 'forgot' && 'กู้คืนรหัสผ่าน'}
        </h1>
        <p className="text-xs text-slate-500">
          {mode === 'login' && 'เข้าถึงประวัติการทำรายการ ดาวน์โหลดใบเสร็จ และติดตามคำร้อง'}
          {mode === 'register' && 'สร้างบัญชีเพื่อจัดการประวัติการจ่ายซะกาตและสิทธิลดหย่อนภาษี'}
          {mode === 'forgot' && 'ระบุอีเมลที่ใช้สมัครเพื่อรับคำแนะนำในการรีเซ็ตรหัสผ่าน'}
        </p>
      </div>

      {/* LOGIN FORM */}
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">อีเมลผู้ใช้งาน</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                placeholder="example@email.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-semibold">รหัสผ่าน</label>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-[11px] text-emerald-700 hover:underline"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}</span>
          </button>

          <div className="text-center pt-2 text-slate-600">
            ยังไม่มีบัญชีสมาชิก?{' '}
            <button
              type="button"
              onClick={() => setMode('register')}
              className="font-bold text-emerald-800 hover:underline"
            >
              สมัครสมาชิกใหม่
            </button>
          </div>
        </form>
      )}

      {/* REGISTER FORM */}
      {mode === 'register' && (
        <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">ชื่อ - นามสกุล *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
              placeholder="นาย สมชาย ใจดี"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">อีเมล *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">เบอร์โทรศัพท์</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
              placeholder="08X-XXX-XXXX"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">รหัสผ่าน *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">ยืนยันรหัสผ่าน *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 p-2 bg-emerald-50/50 rounded-xl border border-emerald-200 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={pdpaConsent}
              onChange={(e) => setPdpaConsent(e.target.checked)}
              className="w-4 h-4 text-emerald-700 rounded mt-0.5"
            />
            <span className="text-emerald-950 font-medium">
              ข้าพเจ้ายอมรับนโยบายความเป็นส่วนตัว (PDPA) และยินยอมให้ระบบจัดเก็บข้อมูลเพื่อการจัดการซะกาต
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>ยืนยันการสมัครสมาชิก</span>
          </button>

          <div className="text-center pt-1 text-slate-600">
            มีบัญชีอยู่แล้ว?{' '}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="font-bold text-emerald-800 hover:underline"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </form>
      )}

      {/* FORGOT PASSWORD FORM */}
      {mode === 'forgot' && (
        <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">อีเมลที่ลงทะเบียน</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
              placeholder="example@email.com"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
          >
            ส่งคำขอรีเซ็ตรหัสผ่าน
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-emerald-700 font-semibold hover:underline"
            >
              ← กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
