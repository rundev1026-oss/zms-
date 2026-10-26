'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  LogIn, 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  UserCheck
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, loginUser } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLocked(false);

    if (!identifier.trim() || !password) {
      setErrorMessage('กรุณากรอกอีเมลหรือเบอร์โทรศัพท์ และรหัสผ่าน');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          rememberMe,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (res.status === 423 || (json.error && json.error.includes('ถูกระงับชั่วคราว'))) {
          setIsLocked(true);
        }
        throw new Error(json.error || 'อีเมล หมายเลขโทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง');
      }

      // Synchronize login state across AppContext
      loginUser(json.token, json.user);
      showToast(`ยินดีต้อนรับคุณ ${json.user.name} เข้าสู่ระบบ`, 'success');

      // Safe verified redirection (Anti-Open-Redirect check)
      const redirectParam = searchParams.get('redirect');
      const isSafeRedirect = Boolean(
        redirectParam && 
        redirectParam.startsWith('/') && 
        !redirectParam.startsWith('//') && 
        !redirectParam.startsWith('/\\') && 
        !redirectParam.includes('://')
      );
      const destination = isSafeRedirect && redirectParam ? redirectParam : (json.redirectUrl || '/my-account');

      router.push(destination);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6 animate-fadeIn">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
          ZMS
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          Zakat Management System
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          เข้าสู่ระบบสมาชิกและเจ้าหน้าที่มูลนิธิซะกาตและสาธารณกุศล
        </p>
      </div>

      {/* Logout Success Notification */}
      {searchParams.get('logout') === 'success' && !errorMessage && (
        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>ออกจากระบบเรียบร้อยแล้ว ขอบคุณที่ใช้งานระบบ Zakat Management System</span>
        </div>
      )}

      {/* Account Lockout Alert */}
      {isLocked && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-900 space-y-1.5 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>บัญชีถูกระงับชั่วคราว (15 นาที)</span>
          </div>
          <p className="leading-relaxed text-[11px] text-amber-800">
            เนื่องจากมีการกรอกรหัสผ่านผิดเกิน 5 ครั้งต่อเนื่อง เพื่อความปลอดภัยของข้อมูล ระบบได้ระงับการเข้าสู่ระบบชั่วคราว ท่านสามารถลองใหม่ในภายหลัง หรือใช้ฟังก์ชันลืมรหัสผ่านเพื่อตั้งค่าใหม่
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && !isLocked && (
        <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        {/* Identifier (Email or Phone) */}
        <div>
          <label className="block text-slate-700 font-semibold mb-1">
            อีเมล หรือ เบอร์โทรศัพท์ *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="เช่น donor@example.com หรือ 0812345678"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            รองรับทั้งอีเมลหรือเบอร์โทรศัพท์ที่ลงทะเบียนไว้ในระบบ
          </p>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-slate-700 font-semibold">รหัสผ่าน *</label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold hover:underline"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span>จดจำการเข้าสู่ระบบบนอุปกรณ์นี้</span>
          </label>
        </div>

        {/* Submit Button with Loading State */}
        <button
          type="submit"
          disabled={isLoading || isLocked}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          <span>{isLoading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}</span>
        </button>

        {/* Register Link */}
        <div className="text-center pt-2 text-slate-600 text-xs">
          ยังไม่มีบัญชีสมาชิก?{' '}
          <Link
            href="/register"
            className="font-bold text-emerald-800 hover:underline"
          >
            สมัครสมาชิกใหม่ที่นี่
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PublicHeader 
        currentView="public-auth" 
        onNavigate={(view) => {
          if (view === 'public-home') router.push('/');
          else if (view === 'public-my-account') router.push('/my-account');
          else router.push(`/#${view.replace('public-', '')}`);
        }} 
        onSwitchToAdmin={() => router.push('/#admin')}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 sm:px-6 py-12 flex flex-col justify-center">
        <Suspense fallback={<div className="text-center py-12 text-slate-400">กำลังโหลดแบบฟอร์ม...</div>}>
          <LoginForm />
        </Suspense>
      </main>

      <PublicFooter onNavigate={(view) => router.push(view === 'public-home' ? '/' : `/#${view.replace('public-', '')}`)} />
    </div>
  );
}
