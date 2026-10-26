'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  KeyRound, 
  Mail, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Info, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('yusuf.donor@email.com');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resultData, setResultData] = useState<{
    message: string;
    emailStatus?: string;
    rawToken?: string;
    resetUrl?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResultData(null);

    if (!identifier.trim()) {
      setErrorMessage('กรุณาระบุอีเมลหรือเบอร์โทรศัพท์ที่ลงทะเบียน');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการขอรีเซ็ตรหัสผ่าน');
      }

      setResultData({
        message: json.message,
        emailStatus: json.emailStatus,
        rawToken: json.rawToken,
        resetUrl: json.resetUrl,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">ลืมรหัสผ่าน</h1>
            <p className="text-xs text-slate-500">
              ระบุอีเมลหรือเบอร์โทรศัพท์ที่ใช้ลงทะเบียนเพื่อสร้างคำขอตั้งรหัสผ่านใหม่
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Response State */}
          {resultData ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>คำขอถูกประมวลผลเรียบร้อย</span>
                </div>
                <p className="leading-relaxed text-[11px] text-emerald-800">
                  {resultData.message}
                </p>
              </div>

              {/* Honest Gateway Status */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>สถานะการส่งข้อความภายนอก (External Gateway Status)</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-800">
                  {resultData.emailStatus || 'ระบบยังไม่ได้เชื่อมต่อ SMTP Server จริง โทเคนถูกสร้างและเข้ารหัส SHA-256 บันทึกในฐานข้อมูลแล้ว'}
                </p>
                {resultData.resetUrl && (
                  <div className="pt-2 border-t border-amber-200">
                    <div className="font-semibold text-amber-900 mb-1">ลิงก์ตั้งรหัสผ่านใหม่ (สำหรับทดสอบในระบบ):</div>
                    <Link
                      href={resultData.resetUrl}
                      className="p-2.5 bg-white rounded-xl border border-amber-200 text-[11px] text-emerald-800 font-mono break-all flex items-center justify-between gap-2 hover:bg-emerald-50 transition-colors"
                    >
                      <span className="truncate">{resultData.resetUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {resultData.resetUrl ? (
                  <Link
                    href={resultData.resetUrl}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs text-center shadow-md transition-colors"
                  >
                    ไปที่หน้าตั้งรหัสผ่านใหม่
                  </Link>
                ) : null}
                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs text-center transition-colors"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </div>
            </div>
          ) : (
            /* Request Form */
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  อีเมล หรือ เบอร์โทรศัพท์ที่ลงทะเบียน *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="เช่น user@email.com หรือ 0812345678"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  ระบบจำกัดการขอไม่เกิน 3 ครั้งต่อชั่วโมง เพื่อความปลอดภัยของข้อมูล
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'กำลังประมวลผลคำขอ...' : 'ส่งคำขอรีเซ็ตรหัสผ่าน'}</span>
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-800 font-semibold transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>กลับไปหน้าเข้าสู่ระบบ</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <PublicFooter onNavigate={(view) => router.push(view === 'public-home' ? '/' : `/#${view.replace('public-', '')}`)} />
    </div>
  );
}
