'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  UserPlus, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Info,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [showPdpaModal, setShowPdpaModal] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{
    message: string;
    notificationStatus: string;
    userName: string;
  } | null>(null);

  // Password criteria check
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const criteriaCount = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;
  const isPasswordValid = criteriaCount === 5;
  const isPasswordMatch = password.length > 0 && password === confirmPassword;

  const getStrengthBadge = () => {
    if (criteriaCount <= 2) return { text: 'รหัสผ่านอ่อนมาก', color: 'bg-red-100 text-red-700 border-red-200' };
    if (criteriaCount <= 4) return { text: 'รหัสผ่านปานกลาง', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { text: 'รหัสผ่านปลอดภัยสูง', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('กรุณาระบุชื่อและนามสกุล');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('กรุณาระบุอีเมลที่ถูกต้อง');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ');
      return;
    }
    if (!isPasswordMatch) {
      setErrorMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (!pdpaConsent) {
      setErrorMessage('กรุณาอ่านและยอมรับนโยบายความเป็นส่วนตัว (PDPA) เพื่อดำเนินการต่อ');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
          confirmPassword,
          pdpaConsent,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'การสมัครสมาชิกล้มเหลว');
      }

      setSuccessData({
        message: json.message,
        notificationStatus: json.notificationStatus || 'ระบบยังไม่ได้เชื่อมต่อ SMS/Email Gateway ภายนอก',
        userName: `${firstName} ${lastName}`,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
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

      <main className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col justify-center">
        {/* Success Card */}
        {successData ? (
          <div className="bg-white rounded-3xl border border-emerald-200/80 shadow-xl p-8 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900">สมัครสมาชิกสำเร็จเรียบร้อย</h1>
              <p className="text-sm text-slate-600">
                ยินดีต้อนรับคุณ <strong className="text-emerald-800">{successData.userName}</strong> เข้าสู่ระบบซะกาตและสาธารณกุศล
              </p>
            </div>

            {/* Honest Provider Status */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-left text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>สถานะการแจ้งเตือนและการยืนยันบัญชี</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                {successData.notificationStatus} บัญชีของท่านได้รับการสร้างในฐานข้อมูลเรียบร้อยแล้วด้วยสิทธิ์สมาชิกทั่วไป (Member) โดยไม่ต้องรอรับรหัส OTP ท่านสามารถเข้าสู่ระบบเพื่อใช้งานได้ทันที
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>เข้าสู่ระบบด้วยบัญชีใหม่</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Registration Form Card */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
                ZMS
              </div>
              <h1 className="text-2xl font-black text-slate-900">สมัครสมาชิกใหม่</h1>
              <p className="text-xs text-slate-500">
                สร้างบัญชีผู้ใช้งานเพื่อจัดการประวัติการจ่ายซะกาต การบริจาค และติดตามคำร้อง
              </p>
            </div>

            {/* Honest Provider Banner */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">ระบบความปลอดภัยมาตรฐาน: </span>
                รหัสผ่านเข้ารหัส Salted HMAC-SHA256 ป้องกันการสร้างบัญชีซ้ำ บันทึกการยินยอม PDPA เวอร์ชัน v2569.1 และกำหนดสิทธิ์สมาชิก (Member) อย่างปลอดภัย
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ชื่อจริง *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="เช่น มูฮัมหมัด"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="เช่น ดำรงสุข"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">อีเมล *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">เบอร์โทรศัพท์ (ถ้ามี)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Password Fields */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">รหัสผ่าน *</label>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStrengthBadge().color}`}>
                      {getStrengthBadge().text}
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ยืนยันรหัสผ่าน *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="พิมพ์รหัสผ่านเดิมซ้ำอีกครั้ง"
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
              </div>

              {/* PDPA Consent Checkbox */}
              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdpaConsent}
                    onChange={(e) => setPdpaConsent(e.target.checked)}
                    className="w-4 h-4 text-emerald-700 rounded border-slate-300 mt-0.5 focus:ring-emerald-500 shrink-0"
                  />
                  <div className="text-[11px] text-slate-700 leading-relaxed">
                    ข้าพเจ้ายินยอมให้มูลนิธิฯ เก็บรวบรวม ใช้ และประมวลผลข้อมูลส่วนบุคคลตาม{' '}
                    <button
                      type="button"
                      onClick={() => setShowPdpaModal(true)}
                      className="text-emerald-800 font-bold underline hover:text-emerald-950 inline-flex items-center gap-0.5"
                    >
                      <span>นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA Version 2569.1)</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    {' '}เพื่อประโยชน์ในการบริหารจัดการเงินซะกาต ออกใบเสร็จ e-Donation และรับสิทธิประโยชน์ของสมาชิก
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการสมัครสมาชิก'}</span>
              </button>

              {/* Login Link */}
              <div className="text-center pt-2 text-slate-600 text-xs">
                มีบัญชีอยู่แล้ว?{' '}
                <Link
                  href="/login"
                  className="font-bold text-emerald-800 hover:underline"
                >
                  เข้าสู่ระบบที่นี่
                </Link>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* PDPA Policy Modal */}
      {showPdpaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl border max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <h3 className="font-black text-slate-900 text-base">นโยบายความเป็นส่วนตัว (PDPA v2569.1)</h3>
              <button
                onClick={() => setShowPdpaModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 text-xs text-slate-600 leading-relaxed pr-2">
              <p><strong>1. วัตถุประสงค์ในการจัดเก็บข้อมูล:</strong> มูลนิธิซะกาตและสาธารณกุศล เก็บรวบรวมข้อมูลส่วนบุคคลของท่าน (ชื่อ, อีเมล, เบอร์โทรศัพท์, บันทึกการทำธุรกรรม) เพื่อวัตถุประสงค์ในการออกใบสำคัญรับเงิน การส่งข้อมูลลดหย่อนภาษี e-Donation สรรพากร และการตรวจสอบบัญชีตามหลักศาสนบัญญัติและกฎหมาย</p>
              <p><strong>2. การรักษาความมั่นคงปลอดภัย:</strong> ข้อมูลรหัสผ่านของท่านจะถูกเข้ารหัสผ่านกลไกความปลอดภัยมาตรฐาน ไม่มีการจัดเก็บรหัสผ่านในรูปแบบข้อความธรรมดา (Plain text) และไม่มีการเปิดเผยข้อมูลแก่บุคคลภายนอกโดยไม่ได้รับอนุญาต</p>
              <p><strong>3. สิทธิของเจ้าของข้อมูล:</strong> ท่านมีสิทธิตรวจสอบ แก้ไข ขอสำเนา หรือขอลบข้อมูลส่วนบุคคลของตนเองได้ตลอดเวลาผ่านหน้าโปรไฟล์ หรือติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) ของมูลนิธิฯ</p>
            </div>

            <div className="pt-2 border-t shrink-0 flex justify-end">
              <button
                onClick={() => {
                  setPdpaConsent(true);
                  setShowPdpaModal(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800"
              >
                รับทราบนโยบายและยอมรับ
              </button>
            </div>
          </div>
        </div>
      )}

      <PublicFooter onNavigate={(view) => router.push(view === 'public-home' ? '/' : `/#${view.replace('public-', '')}`)} />
    </div>
  );
}
