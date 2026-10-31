'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  KeyRound
} from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  // Password criteria check
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

  const criteriaCount = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;
  const isPasswordValid = criteriaCount === 5;
  const isPasswordMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token.trim()) {
      setErrorMessage('ไม่พบโทเคนรีเซ็ตรหัสผ่าน กรุณาใช้ลิงก์ที่ได้รับจากระบบ');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ');
      return;
    }
    if (!isPasswordMatch) {
      setErrorMessage('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: (() => {
            let val = token.trim();
            if (val.includes('token=')) {
              const match = val.match(/token=([a-zA-Z0-9_\-]+)/);
              if (match && match[1]) val = match[1];
            }
            return val;
          })(),
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'การรีเซ็ตรหัสผ่านล้มเหลว');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">ตั้งรหัสผ่านใหม่</h1>
        <p className="text-xs text-slate-500">
          กำหนดรหัสผ่านใหม่ที่มีความปลอดภัยสูงสำหรับบัญชีของท่าน
        </p>
      </div>

      {/* Success View */}
      {isSuccess ? (
        <div className="space-y-6 text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              รหัสผ่านใหม่ของท่านได้รับการบันทึกและเข้ารหัสแล้วเรียบร้อย และระบบได้ยกเลิก Session การเข้าสู่ระบบเดิมทั้งหมดเพื่อความปลอดภัยสูงสุด
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>เข้าสู่ระบบด้วยรหัสผ่านใหม่</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Reset Form */
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Token Display/Input */}
          {!tokenFromUrl && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                รหัสโทเคนรีเซ็ต (Reset Token) *
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => {
                  let val = e.target.value.trim();
                  if (val.includes('token=')) {
                    const match = val.match(/token=([a-zA-Z0-9_\-]+)/);
                    if (match && match[1]) val = match[1];
                  }
                  setToken(val);
                }}
                placeholder="วางโทเคน 64 ตัวอักษรที่ได้รับ"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-[11px] text-slate-900"
              />
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">รหัสผ่านใหม่ *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
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

          {/* Confirm New Password */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">ยืนยันรหัสผ่านใหม่ *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Criteria Checklist */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-[11px]">
            <div className="font-semibold text-slate-700">เกณฑ์ความปลอดภัยของรหัสผ่าน:</div>
            <div className="grid grid-cols-2 gap-1 text-slate-600">
              <div className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-700 font-bold' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>อย่างน้อย 8 ตัวอักษร</span>
              </div>
              <div className={`flex items-center gap-1 ${hasUpperCase ? 'text-emerald-700 font-bold' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpperCase ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>ตัวพิมพ์ใหญ่ (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1 ${hasLowerCase ? 'text-emerald-700 font-bold' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasLowerCase ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>ตัวพิมพ์เล็ก (a-z)</span>
              </div>
              <div className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-700 font-bold' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>ตัวเลขอารบิก (0-9)</span>
              </div>
              <div className={`flex items-center gap-1 col-span-2 ${hasSpecialChar ? 'text-emerald-700 font-bold' : ''}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecialChar ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>อักขระพิเศษ (!@#$%^&*)</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLoading ? 'กำลังบันทึกรหัสผ่าน...' : 'บันทึกรหัสผ่านใหม่'}</span>
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-slate-600 hover:text-emerald-800 text-xs font-semibold"
            >
              ยกเลิกและกลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div className="text-center py-12 text-slate-400">กำลังโหลด...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </main>

      <PublicFooter onNavigate={(view) => router.push(view === 'public-home' ? '/' : `/#${view.replace('public-', '')}`)} />
    </div>
  );
}
