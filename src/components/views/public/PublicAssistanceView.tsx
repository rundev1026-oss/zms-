'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  User, 
  Home, 
  Coins, 
  Upload, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  Info,
  Calendar,
  Phone,
  MapPin,
  Lock
} from 'lucide-react';
import { PublicAssistanceInput } from '@/services/publicPortalService';

interface PublicAssistanceViewProps {
  onNavigate: (view: string) => void;
}

export function PublicAssistanceView({ onNavigate }: PublicAssistanceViewProps) {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'apply' | 'track'>('apply');

  // Application Wizard Step: 1 - 8
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);

  // Application Form State
  const [fullName, setFullName] = useState<string>('นาย ดาโอะ มะแซ');
  const [nationalId, setNationalId] = useState<string>('1940200881920');
  const [phone, setPhone] = useState<string>('089-112-3344');
  const [email, setEmail] = useState<string>('daoh.m@email.com');
  const [address, setAddress] = useState<string>('44/1 หมู่ 3');
  const [province, setProvince] = useState<string>('ปัตตานี');
  const [district, setDistrict] = useState<string>('เมืองปัตตานี');
  const [subdistrict, setSubdistrict] = useState<string>('จะบังติกอ');
  const [community, setCommunity] = useState<string>('ชุมชนริมคลองจะบังติกอ');

  // Step 3: Members
  const [householdMembers, setHouseholdMembers] = useState([
    { fullName: 'นาง ซาเราะฮ์ มะแซ', relation: 'คู่สมรส', age: 48, occupation: 'แม่บ้าน', monthlyIncome: 0, healthStatus: 'healthy', healthNotes: '' },
    { fullName: 'ด.ช. อานัส มะแซ', relation: 'บุตร', age: 11, occupation: 'นักเรียน', monthlyIncome: 0, healthStatus: 'healthy', healthNotes: '' },
  ]);

  // Step 4: Finances & Housing
  const [monthlyIncome, setMonthlyIncome] = useState<number>(4500);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(7500);
  const [debtAmount, setDebtAmount] = useState<number>(35000);
  const [debtPurpose, setDebtPurpose] = useState<string>('กู้ยืมเพื่อเป็นค่ารักษาพยาบาลฉุกเฉินและค่าครองชีพ');
  const [housingCondition, setHousingCondition] = useState<string>('poor');
  const [housingNotes, setHousingNotes] = useState<string>('บ้านไม้ชั้นเดียว หลังคารั่ว ฝาผนังผุพัง');

  // Step 5: Asnaf Category & Request
  const [asnafCategory, setAsnafCategory] = useState<string>('faqir');
  const [requestedAmount, setRequestedAmount] = useState<number>(10000);
  const [urgencyLevel, setUrgencyLevel] = useState<'urgent' | 'high' | 'normal'>('high');
  const [assistanceReason, setAssistanceReason] = useState<string>(
    'ขาดแคลนรายได้ยังชีพ มีภาระดูแลบุตรวัยเรียนและต้องชำระหนี้สินค่ารักษาพยาบาล'
  );

  // Step 6: Documents
  const [documents, setDocuments] = useState([
    { name: 'สำเนาบัตรประชาชนผู้ขอรับ', category: 'id_card', fileUrl: '/docs/demo-id.pdf' },
    { name: 'สำเนาทะเบียนบ้าน', category: 'house_reg', fileUrl: '/docs/demo-house.pdf' },
    { name: 'หนังสือรับรองความยากจน/ผู้นำชุมชน', category: 'field_photo', fileUrl: '/docs/cert.pdf' },
  ]);

  // Step 7: Consent
  const [pdpaConsent, setPdpaConsent] = useState<boolean>(true);
  const [truthDeclaration, setTruthDeclaration] = useState<boolean>(true);

  // Tracking State
  const [trackAppNo, setTrackAppNo] = useState<string>('APP-2569-001');
  const [trackLast4, setTrackLast4] = useState<string>('1920');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [isTrackLoading, setIsTrackLoading] = useState<boolean>(false);

  const handleAddMember = () => {
    setHouseholdMembers([
      ...householdMembers,
      { fullName: '', relation: 'บุตร', age: 0, occupation: 'ไม่มี', monthlyIncome: 0, healthStatus: 'healthy', healthNotes: '' }
    ]);
  };

  const handleRemoveMember = (idx: number) => {
    setHouseholdMembers(householdMembers.filter((_, i) => i !== idx));
  };

  const handleSubmitApplication = async () => {
    if (!pdpaConsent || !truthDeclaration) {
      showToast('กรุณายินยอมตามเงื่อนไข PDPA และรับรองความถูกต้องของข้อมูล', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/public/assistance/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          nationalId,
          phone,
          email,
          address,
          province,
          district,
          subdistrict,
          community,
          asnafCategory,
          requestedAmount,
          urgencyLevel,
          monthlyIncome,
          monthlyExpense,
          debtAmount,
          debtPurpose,
          housingCondition,
          housingNotes,
          householdMembers,
          documents
        })
      });

      const json = await res.json();
      if (json.success) {
        setSubmittedResult(json.data);
        setCurrentStep(8);
        showToast('ยื่นคำร้องสำเร็จ ระบบได้ออกรหัสติดตามให้ท่านแล้ว', 'success');
      } else {
        showToast(json.error || 'เกิดข้อผิดพลาดในการยื่นคำร้อง', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถติดต่อระบบได้', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackAppNo || !trackLast4) {
      showToast('กรุณาระบุเลขที่คำร้องและเลข 4 หลักสุดท้าย', 'error');
      return;
    }

    try {
      setIsTrackLoading(true);
      setTrackResult(null);
      const res = await fetch('/api/public/assistance/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationNo: trackAppNo,
          last4Digits: trackLast4
        })
      });

      const json = await res.json();
      if (json.success) {
        setTrackResult(json.data);
      } else {
        showToast(json.error || 'ไม่พบข้อมูลคำร้อง', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setIsTrackLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return { text: 'ยื่นคำร้องแล้ว', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'doc_review': return { text: 'รอตรวจเอกสาร', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'assessment': return { text: 'อยู่ระหว่างลงพื้นที่ประเมิน', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'pending_approval': return { text: 'เสนอคณะกรรมการพิจารณา', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'approved': return { text: 'อนุมัติเรียบร้อย', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'wait_disbursement': return { text: 'รอรอบการโอนเงิน', color: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'disbursed': return { text: 'โอนเงินสวัสดิการแล้ว', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'rejected': return { text: 'ไม่ผ่านเกณฑ์การพิจารณา', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      default: return { text: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Top Banner & Tab Toggle */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-700" />
            <span>ระบบยื่นขอรับความช่วยเหลือและติดตามสถานะ</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เปิดโอกาสให้ประชาชนผู้มีความจำเป็นยื่นคำร้องออนไลน์ และตรวจสอบความคืบหน้าอย่างโปร่งใส
          </p>
        </div>

        <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('apply')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'apply'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ยื่นคำร้องใหม่ (8 ขั้นตอน)
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'track'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ติดตามสถานะคำร้องของฉัน
          </button>
        </div>
      </div>

      {/* TAB 1: 8-STEP APPLICATION WIZARD */}
      {activeTab === 'apply' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-10 space-y-8">
          {/* Step Progress Indicators */}
          <div className="border-b border-slate-100 pb-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
              <span>ขั้นตอนที่ {currentStep} จาก 8</span>
              <span className="text-emerald-700 font-extrabold">
                {currentStep === 1 && 'อ่านเงื่อนไขและประเภทความช่วยเหลือ'}
                {currentStep === 2 && 'ข้อมูลส่วนตัวผู้สมัคร'}
                {currentStep === 3 && 'ข้อมูลครัวเรือนและสมาชิก'}
                {currentStep === 4 && 'รายได้ ค่าใช้จ่าย และหนี้สิน'}
                {currentStep === 5 && 'ประเภทความช่วยเหลือที่ขอ'}
                {currentStep === 6 && 'แนบเอกสารจำเป็น'}
                {currentStep === 7 && 'ตรวจสอบและยืนยันคำร้อง'}
                {currentStep === 8 && 'ยื่นคำร้องสำเร็จ'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 8) * 100}%` }}
              />
            </div>
          </div>

          {/* STEP 1: Conditions & Guidelines */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-2 leading-relaxed">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>หลักเกณฑ์คุณสมบัติเบื้องต้นของผู้ขอรับซะกาต</span>
                </div>
                <p>
                  1. เป็นบุคคลผู้มีสิทธิ์ตามเกณฑ์ 8 จำพวก (Asnaf) แห่งศาสนบัญญัติอิสลาม เช่น ผู้ยากไร้, ผู้ขัดสน, ผู้มีหนี้สินจำเป็น หรือทุนการศึกษา
                </p>
                <p>
                  2. มีที่พำนักอาศัยในราชอาณาจักรไทย และมีเอกสารยืนยันตัวตนที่สามารถตรวจสอบได้
                </p>
                <p>
                  3. ยินยอมให้เจ้าหน้าที่มูลนิธิฯ ลงพื้นที่เยี่ยมบ้าน ตรวจสอบสภาพความเป็นอยู่จริง และสัมภาษณ์ผู้นำชุมชน
                </p>
                <p>
                  4. ข้อมูลและเอกสารทั้งหมดจะได้รับการคุ้มครองตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 rounded-2xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors flex items-center gap-2"
                >
                  <span>รับทราบและเริ่มกรอกข้อมูล</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Personal Info */}
          {currentStep === 2 && (
            <div className="space-y-5 max-w-2xl text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เลขประจำตัวประชาชน 13 หลัก * (ได้รับการ Masking)
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ที่ติดต่อได้ *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อีเมล (ถ้ามี)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ที่อยู่ปัจจุบันตามจริง *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">จังหวัด *</label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อำเภอ/เขต *</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชุมชน/หมู่บ้าน</label>
                  <input
                    type="text"
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-bold"
                >
                  ถัดไป: ข้อมูลครัวเรือน
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Household Members */}
          {currentStep === 3 && (
            <div className="space-y-5 max-w-3xl text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">สมาชิกในครัวเรือนที่อาศัยอยู่ร่วมกัน</h3>
                  <p className="text-slate-500">ระบุสมาชิกทุกคนเพื่อใช้คำนวณภาระค่าใช้จ่ายต่อคน</p>
                </div>
                <button
                  onClick={handleAddMember}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                >
                  + เพิ่มสมาชิก
                </button>
              </div>

              <div className="space-y-3">
                {householdMembers.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">สมาชิกคนที่ {idx + 1}</span>
                      {householdMembers.length > 1 && (
                        <button
                          onClick={() => handleRemoveMember(idx)}
                          className="text-rose-600 hover:underline"
                        >
                          ลบออก
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 mb-0.5">ชื่อ-นามสกุล</label>
                        <input
                          type="text"
                          value={m.fullName}
                          onChange={(e) => {
                            const updated = [...householdMembers];
                            updated[idx].fullName = e.target.value;
                            setHouseholdMembers(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-0.5">ความสัมพันธ์</label>
                        <input
                          type="text"
                          value={m.relation}
                          onChange={(e) => {
                            const updated = [...householdMembers];
                            updated[idx].relation = e.target.value;
                            setHouseholdMembers(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-0.5">อายุ (ปี)</label>
                        <input
                          type="number"
                          value={m.age || ''}
                          onChange={(e) => {
                            const updated = [...householdMembers];
                            updated[idx].age = Number(e.target.value);
                            setHouseholdMembers(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-bold"
                >
                  ถัดไป: ข้อมูลรายได้-หนี้สิน
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Income, Expense, Debt & Housing */}
          {currentStep === 4 && (
            <div className="space-y-5 max-w-2xl text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รายได้ครัวเรือนรวมต่อเดือน (บาท) *</label>
                  <input
                    type="number"
                    value={monthlyIncome || ''}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ค่าใช้จ่ายจำเป็นต่อเดือน (บาท) *</label>
                  <input
                    type="number"
                    value={monthlyExpense || ''}
                    onChange={(e) => setMonthlyExpense(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ยอดหนี้สินจำเป็นคงค้าง (บาท)</label>
                  <input
                    type="number"
                    value={debtAmount || ''}
                    onChange={(e) => setDebtAmount(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สภาพที่อยู่อาศัย</label>
                  <select
                    value={housingCondition}
                    onChange={(e) => setHousingCondition(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  >
                    <option value="dilapidated">ชำรุดทรุดโทรมมาก / อันตราย</option>
                    <option value="poor">ทรุดโทรม ขาดสุขอนามัย</option>
                    <option value="rented">บ้านเช่า / มีภาระค่าเช่า</option>
                    <option value="fair">สภาพพอใช้</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เหตุผลและรายละเอียดหนี้สิน</label>
                <input
                  type="text"
                  value={debtPurpose}
                  onChange={(e) => setDebtPurpose(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-bold"
                >
                  ถัดไป: ประเภทความช่วยเหลือ
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Asnaf Category & Amount */}
          {currentStep === 5 && (
            <div className="space-y-5 max-w-2xl text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ประเภทอัศนาฟตามหลักศาสนบัญญัติที่เข้าข่าย *
                </label>
                <select
                  value={asnafCategory}
                  onChange={(e) => setAsnafCategory(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                >
                  <option value="faqir">ผู้ยากไร้ (Faqir) - ไม่มีรายได้เพียงพอยังชีพ</option>
                  <option value="miskin">ผู้ขัดสน (Miskin) - รายได้ไม่พอกินอยู่</option>
                  <option value="gharimin">ผู้มีหนี้สินล้นพ้นตัว (Gharimin)</option>
                  <option value="fisabilillah">ทุนการศึกษาเพื่อเยาวชน (Fi Sabilillah)</option>
                  <option value="ibnsabil">ผู้เดินทางตกยาก (Ibn Sabil)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    วงเงินที่ขอรับความช่วยเหลือ (บาท) *
                  </label>
                  <input
                    type="number"
                    value={requestedAmount || ''}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ระดับความเร่งด่วน</label>
                  <select
                    value={urgencyLevel}
                    onChange={(e) => setUrgencyLevel(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                  >
                    <option value="urgent">เร่งด่วนมาก (วิกฤต/ฉุกเฉิน)</option>
                    <option value="high">จำเป็นสูง</option>
                    <option value="normal">ปกติ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เหตุผลความจำเป็นและสภาพปัญหา *
                </label>
                <textarea
                  rows={3}
                  value={assistanceReason}
                  onChange={(e) => setAssistanceReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-bold"
                >
                  ถัดไป: แนบเอกสาร
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Document Attachment */}
          {currentStep === 6 && (
            <div className="space-y-5 max-w-2xl text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed">
                <strong>รายการเอกสารจำเป็น:</strong> กรุณาแนบภาพถ่ายหรือไฟล์สำเนาบัตรประชาชน ทะเบียนบ้าน และเอกสารแสดงความเดือดร้อน
              </div>

              <div className="space-y-3">
                {documents.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span className="font-semibold text-slate-800">{d.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      แนบเรียบร้อย
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={() => setCurrentStep(7)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-bold"
                >
                  ถัดไป: ยืนยันคำร้อง
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: Review & Consent */}
          {currentStep === 7 && (
            <div className="space-y-6 max-w-2xl text-xs">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">สรุปข้อมูลคำร้อง</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>ผู้ยื่น: <strong className="text-slate-900">{fullName}</strong></div>
                  <div>เบอร์โทร: <strong className="text-slate-900">{phone}</strong></div>
                  <div>ประเภทอัศนาฟ: <strong className="text-emerald-800">{asnafCategory}</strong></div>
                  <div>วงเงินที่ขอ: <strong className="text-slate-900">฿{requestedAmount.toLocaleString()} บาท</strong></div>
                  <div>ที่อยู่: <span className="text-slate-900">{address} {district} {province}</span></div>
                  <div>จำนวนสมาชิก: <span className="text-slate-900">{householdMembers.length} คน</span></div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdpaConsent}
                    onChange={(e) => setPdpaConsent(e.target.checked)}
                    className="w-4 h-4 text-emerald-700 rounded mt-0.5"
                  />
                  <span className="text-emerald-950 font-medium leading-relaxed">
                    ข้าพเจ้ายินยอมให้มูลนิธิฯ เก็บรวบรวม ใช้ และประมวลผลข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) เพื่อประโยชน์ในการพิจารณาจัดสรรเงินซะกาต
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={truthDeclaration}
                    onChange={(e) => setTruthDeclaration(e.target.checked)}
                    className="w-4 h-4 text-emerald-700 rounded mt-0.5"
                  />
                  <span className="text-slate-800 font-medium leading-relaxed">
                    ข้าพเจ้าขอรับรองว่าข้อมูลและเอกสารทั้งหมดข้างต้นเป็นความจริงทุกประการ หากมีข้อมูลเท็จ ข้าพเจ้ายินยอมให้ยกเลิกคำร้องทันที
                  </span>
                </label>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setCurrentStep(6)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={handleSubmitApplication}
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-2xl bg-emerald-700 text-white font-bold text-sm shadow-md hover:bg-emerald-800 transition-all"
                >
                  {isSubmitting ? 'กำลังส่งคำร้อง...' : 'ยืนยันและส่งคำร้องขอรับความช่วยเหลือ'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: Success Screen */}
          {currentStep === 8 && submittedResult && (
            <div className="max-w-xl mx-auto text-center space-y-6 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900">
                  ยื่นคำร้องสำเร็จเรียบร้อย
                </h3>
                <p className="text-xs text-slate-500">
                  คำร้องของท่านได้เข้าสู่ระบบฐานข้อมูลมูลนิธิฯ แล้ว
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-xs text-slate-500">เลขที่คำร้อง (Application No.):</span>
                  <span className="text-base font-black text-emerald-800 font-mono">
                    {submittedResult.applicationNo}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b pb-2 text-xs">
                  <span className="text-slate-500">ผู้ยื่นคำร้อง:</span>
                  <span className="font-bold text-slate-800">{submittedResult.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">รหัสยืนยันการติดตาม (4 หลักท้าย):</span>
                  <span className="font-mono font-bold text-slate-800">{submittedResult.trackingKey}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setTrackAppNo(submittedResult.applicationNo);
                    setTrackLast4(submittedResult.trackingKey);
                    setActiveTab('track');
                  }}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800"
                >
                  ไปที่หน้าติดตามสถานะคำร้องนี้
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(1);
                  }}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  ยื่นคำร้องอื่น
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRACK STATUS OF MY APPLICATION */}
      {activeTab === 'track' && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs max-w-2xl mx-auto">
            <form onSubmit={handleTrackSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  ค้นหาสถานะคำร้องขอรับความช่วยเหลือ
                </h3>
                <p className="text-xs text-slate-500">
                  กรอกเลขที่คำร้องและเลข 4 หลักสุดท้ายของบัตรประชาชนหรือเบอร์โทรศัพท์เพื่อยืนยันตัวตน
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 mb-1 font-semibold">เลขที่คำร้อง</label>
                  <input
                    type="text"
                    value={trackAppNo}
                    onChange={(e) => setTrackAppNo(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none uppercase"
                    placeholder="APP-2569-001"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">เลข 4 หลักสุดท้าย</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={trackLast4}
                    onChange={(e) => setTrackLast4(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 text-center outline-none"
                    placeholder="1920"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isTrackLoading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-sm hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>{isTrackLoading ? 'กำลังค้นหา...' : 'ตรวจสอบสถานะคำร้อง'}</span>
              </button>
            </form>
          </div>

          {/* Tracking Result Display */}
          {trackResult && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-lg max-w-3xl mx-auto space-y-6">
              {/* Header result */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="text-xs text-slate-400">เลขที่คำร้อง</div>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {trackResult.applicationNo}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ผู้ยื่น: {trackResult.maskedName} ({trackResult.district}, {trackResult.province})
                  </div>
                </div>

                <div className="text-right sm:text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(trackResult.status).color}`}>
                    {getStatusBadge(trackResult.status).text}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1">
                    ยื่นเมื่อ: {trackResult.appliedDate}
                  </div>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ลำดับขั้นตอนการพิจารณา (Progress Timeline)
                </h4>

                <div className="relative pl-6 space-y-6 border-l-2 border-emerald-200 ml-3">
                  {trackResult.history.map((h: any, idx: number) => (
                    <div key={idx} className="relative group">
                      {/* Timeline circle */}
                      <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">
                          {getStatusBadge(h.status).text}
                        </div>
                        <div className="text-[11px] text-slate-400">{h.timestamp}</div>
                        <div className="text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {h.notes}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Notice */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>ข้อมูลความคืบหน้า:</strong> เจ้าหน้าที่กำลังดำเนินการตามกระบวนการตรวจสอบ หากต้องการข้อมูลเพิ่มเติม เจ้าหน้าที่จะติดต่อผ่านเบอร์โทรศัพท์ที่ท่านระบุไว้
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
