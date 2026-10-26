'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Heart, 
  Receipt, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  Download, 
  Printer, 
  Building, 
  ArrowRight,
  ShieldCheck,
  User,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { CampaignItem } from '@/services/publicPortalService';

interface PublicPaymentViewProps {
  onNavigate: (view: string) => void;
  initialAmount?: number;
  initialCategory?: string;
  selectedCampaignId?: string;
  selectedCampaignTitle?: string;
  targetFundId?: string;
}

export function PublicPaymentView({
  onNavigate,
  initialAmount = 5000,
  initialCategory = 'ซะกาตทรัพย์สินทางการเงิน',
  selectedCampaignId,
  selectedCampaignTitle,
  targetFundId = 'fund-1'
}: PublicPaymentViewProps) {
  const { funds, showToast } = useApp();

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [donationType, setDonationType] = useState<'zakat' | 'sadaqah' | 'campaign'>(
    selectedCampaignId ? 'campaign' : 'zakat'
  );

  // Form states
  const [amount, setAmount] = useState<number>(initialAmount);
  const [selectedFundId, setSelectedFundId] = useState<string>(targetFundId);
  const [chosenCampaignId, setChosenCampaignId] = useState<string>(selectedCampaignId || '');
  const [categoryTitle, setCategoryTitle] = useState<string>(
    selectedCampaignTitle ? `บริจาคโครงการ: ${selectedCampaignTitle}` : initialCategory
  );

  const [donorName, setDonorName] = useState<string>('นาย ยูซุฟ มีลาภ');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [donorPhone, setDonorPhone] = useState<string>('082-999-4455');
  const [donorEmail, setDonorEmail] = useState<string>('yusuf.donor@email.com');
  const [donorTaxId, setDonorTaxId] = useState<string>('1100200334455');
  const [wantTaxReceipt, setWantTaxReceipt] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<'promptpay_qr' | 'bank_transfer'>('promptpay_qr');

  // Checkout steps: 'form' | 'awaiting_payment' | 'success'
  const [step, setStep] = useState<'form' | 'awaiting_payment' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(900); // 15 mins
  const [paymentRefNo, setPaymentRefNo] = useState<string>('');
  const [successResult, setSuccessResult] = useState<any>(null);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const res = await fetch('/api/public/campaigns');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setCampaigns(json.data);
        }
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      }
    }
    loadCampaigns();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (step === 'awaiting_payment' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timerSeconds]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartCheckout = () => {
    if (!amount || amount <= 0) {
      showToast('กรุณาระบุจำนวนเงินที่ถูกต้อง', 'error');
      return;
    }
    const newRef = `PP-${new Date().getFullYear() + 543}-${Math.floor(100000 + Math.random() * 900000)}`;
    setPaymentRefNo(newRef);
    setTimerSeconds(900);
    setStep('awaiting_payment');
  };

  const handleSimulateBankConfirmation = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/public/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundId: selectedFundId,
          campaignId: donationType === 'campaign' ? chosenCampaignId : undefined,
          donationType,
          categoryTitle,
          amount,
          donorName,
          isAnonymous,
          donorPhone,
          donorEmail,
          donorTaxId: wantTaxReceipt ? donorTaxId : undefined,
          paymentMethod,
          idempotencyKey: paymentRefNo,
          notes: wantTaxReceipt ? 'ขอรับใบเสร็จ e-Donation ลดหย่อนภาษี' : 'ไม่ประสงค์ลดหย่อนภาษี'
        })
      });

      const json = await res.json();
      if (json.success) {
        setSuccessResult(json.data);
        setStep('success');
        showToast('ธนาคารยืนยันยอดเงินเรียบร้อย ออกใบสำคัญรับเงินเสร็จสมบูรณ์', 'success');
      } else {
        showToast(json.error || 'เกิดข้อผิดพลาดในการบันทึกธุรกรรม', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Heart className="w-6 h-6 text-emerald-700" />
              <span>ระบบจ่ายซะกาตและร่วมบริจาคออนไลน์</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              PromptPay e-Donation
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ชำระตรงสู่บัญชีกองทุนซะกาตตามหลักชารีอะฮ์ พร้อมรับใบสำคัญรับเงินดิจิทัลเพื่อใช้ลดหย่อนภาษี
          </p>
        </div>

        {step !== 'form' && (
          <button
            onClick={() => setStep('form')}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            ← กลับไปแก้ไขข้อมูล
          </button>
        )}
      </div>

      {/* STEP 1: Form Fill */}
      {step === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            {/* Choose Donation Category */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. เลือกประเภทการสมทบทุน
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDonationType('zakat');
                    setCategoryTitle('ซะกาตทรัพย์สินทางการเงิน');
                    setSelectedFundId('fund-1');
                  }}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                    donationType === 'zakat'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  จ่ายซะกาต (8 จำพวก)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDonationType('sadaqah');
                    setCategoryTitle('ศอดะเกาะฮ์และเงินบริจาคทั่วไป');
                    setSelectedFundId('fund-5');
                  }}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                    donationType === 'sadaqah'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ศอดะเกาะฮ์ทั่วไป
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDonationType('campaign');
                    if (campaigns.length > 0) {
                      setChosenCampaignId(campaigns[0].id);
                      setCategoryTitle(`บริจาคโครงการ: ${campaigns[0].title}`);
                      setSelectedFundId(campaigns[0].fundId);
                    }
                  }}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                    donationType === 'campaign'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  โครงการระดมทุน
                </button>
              </div>
            </div>

            {/* Campaign Select (if campaign chosen) */}
            {donationType === 'campaign' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  เลือกโครงการที่ต้องการสนับสนุน
                </label>
                <select
                  value={chosenCampaignId}
                  onChange={(e) => {
                    const c = campaigns.find((camp) => camp.id === e.target.value);
                    if (c) {
                      setChosenCampaignId(c.id);
                      setCategoryTitle(`บริจาคโครงการ: ${c.title}`);
                      setSelectedFundId(c.fundId);
                    }
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (เป้าหมาย ฿{c.targetAmount.toLocaleString()} บ.)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fund Select (if Zakat) */}
            {donationType === 'zakat' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  เลือกกองทุนซะกาตตามวัตถุประสงค์
                </label>
                <select
                  value={selectedFundId}
                  onChange={(e) => setSelectedFundId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none"
                >
                  {funds
                    .filter((f) => f.category === 'zakat')
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. ระบุจำนวนเงิน (บาท)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-lg font-bold text-slate-400">฿</span>
                <input
                  type="number"
                  min="1"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Quick amount chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[500, 1000, 2500, 5000, 10000, 25000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      amount === val
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ฿{val.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Donor Info */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. ข้อมูลผู้บริจาค
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-700 rounded"
                  />
                  <span>ไม่ประสงค์ออกนาม</span>
                </label>
              </div>

              {!isAnonymous && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      ชื่อ - นามสกุล (สำหรับออกใบเสร็จ)
                    </label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">เบอร์โทรศัพท์</label>
                      <input
                        type="text"
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">อีเมล</label>
                      <input
                        type="email"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wantTaxReceipt}
                        onChange={(e) => setWantTaxReceipt(e.target.checked)}
                        className="w-4 h-4 text-emerald-700 rounded"
                      />
                      <span className="font-semibold text-emerald-950">
                        ต้องการใบรับเงินเพื่อใช้ลดหย่อนภาษี (e-Donation กรมสรรพากร)
                      </span>
                    </label>
                  </div>

                  {wantTaxReceipt && (
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">
                        เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน 13 หลัก
                      </label>
                      <input
                        type="text"
                        value={donorTaxId}
                        onChange={(e) => setDonorTaxId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none"
                        placeholder="1100200XXXXXX"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action CTA */}
            <button
              onClick={handleStartCheckout}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-700 text-white font-bold text-base shadow-md hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>ดำเนินการชำระเงิน (฿{amount.toLocaleString()} บาท)</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right Summary Card (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-800 space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  สรุปรายการทำบุญ
                </span>
                <h3 className="text-lg font-bold text-white">
                  รายละเอียดการชำระเงิน
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>วัตถุประสงค์:</span>
                  <span className="font-semibold text-white text-right max-w-[200px] truncate">
                    {categoryTitle}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>ประเภทเงิน:</span>
                  <span className="font-semibold text-emerald-300 uppercase">
                    {donationType === 'zakat' ? 'เงินซะกาตภาคบังคับ' : 'เงินศอดะเกาะฮ์/บริจาค'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>ช่องทางที่เลือก:</span>
                  <span className="font-semibold text-white">PromptPay QR Real-time</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>ผู้ทำรายการ:</span>
                  <span className="font-semibold text-white">
                    {isAnonymous ? 'ผู้ไม่ประสงค์ออกนาม' : donorName}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-center space-y-1">
                <div className="text-xs text-emerald-300">ยอดเงินรวมทั้งสิ้น</div>
                <div className="text-3xl font-black text-white">
                  ฿{amount.toLocaleString()}
                  <span className="text-xs font-normal text-emerald-200 ml-1.5">บาท</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ระบบความปลอดภัยทางการเงิน</span>
                </div>
                <p>
                  เงินทุกบาทจะถูกบันทึกเข้าสู่สมุดบัญชีกองทุนโดยตรง พร้อมออกใบสำคัญรับเงินที่มีรหัสอ้างอิงทางภาษีทันทีเมื่อธนาคารยืนยัน
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Awaiting Payment & QR Screen */}
      {step === 'awaiting_payment' && (
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-lg text-center space-y-6">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block">
              กรุณาสแกน QR เพื่อชำระเงิน
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              สแกน PromptPay QR บริจาค
            </h2>
            <p className="text-xs text-slate-500">
              เปิดแอปพลิเคชันธนาคารของท่านและสแกน QR Code ด้านล่างนี้
            </p>
          </div>

          {/* QR Container */}
          <div className="inline-block p-4 rounded-3xl bg-slate-50 border border-slate-200 shadow-inner">
            {/* Standard Mock QR SVG */}
            <div className="w-56 h-56 bg-white p-3 rounded-2xl border border-slate-300 mx-auto flex flex-col items-center justify-center relative">
              <QrCode className="w-44 h-44 text-slate-900" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                  ZMS
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs font-bold text-slate-700">
              PromptPay: 0-1255-69000-12-0 (มูลนิธิซะกาตฯ)
            </div>
          </div>

          {/* Amount & Timer */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-1">
            <div className="text-xs text-emerald-800">ยอดที่ต้องชำระ</div>
            <div className="text-2xl font-black text-emerald-950">
              ฿{amount.toLocaleString()} บาท
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5 pt-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>QR มีอายุ: <strong className="text-amber-800">{formatTimer(timerSeconds)}</strong> นาที</span>
            </div>
            <div className="text-[11px] text-slate-400">
              เลขอ้างอิง: <span className="font-mono">{paymentRefNo}</span>
            </div>
          </div>

          {/* Simulation Adapter Button (Crucial requirement from prompt) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              ระบบทดสอบการชำระเงิน (Bank Webhook Simulator)
            </div>
            <p className="text-[11px] text-slate-500">
              ในสภาพแวดล้อมทดสอบนี้ ท่านสามารถกดปุ่มด้านล่างเพื่อจำลองการยืนยันยอดเงินจากธนาคาร
            </p>
            <button
              onClick={handleSimulateBankConfirmation}
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-sm hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'จำลอง: ธนาคารยืนยันการโอนเงินสำเร็จ'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Payment Success & Official Digital Receipt */}
      {step === 'success' && successResult && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden space-y-6 pb-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/20 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black">
              การชำระเงินเสร็จสมบูรณ์
            </h2>
            <p className="text-xs text-emerald-100">
              ขออัลลอฮ์ทรงตอบแทนความดีงามและความจำเริญแก่ท่านและครอบครัว (ญะซากัลลอฮุ ค็อยร็อน)
            </p>
          </div>

          {/* Digital Receipt Card */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="font-extrabold text-sm text-slate-900">
                    มูลนิธิซะกาตและสาธารณกุศล
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ใบสำคัญรับเงินบริจาคดิจิทัล (Digital Donation Receipt)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-800 font-mono">
                    {successResult.receiptNo}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {successResult.date}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>ผู้ชำระเงิน:</span>
                  <span className="font-bold text-slate-900">{successResult.payerName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ประเภท:</span>
                  <span className="font-semibold text-slate-900">{successResult.categoryTitle}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>เข้าบัญชีกองทุน:</span>
                  <span className="font-semibold text-slate-900">{successResult.fundName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>เลขอ้างอิงธุรกรรม:</span>
                  <span className="font-mono text-slate-700">{successResult.transactionNo}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>สถานะการบันทึก:</span>
                  <span className="font-bold text-emerald-700">บันทึกเข้าสมุดบัญชีมูลนิธิแล้ว</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">จำนวนเงินสุทธิ:</span>
                <span className="text-2xl font-black text-emerald-900">
                  ฿{successResult.amount.toLocaleString()} บาท
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handlePrint}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ใบสำคัญรับเงิน</span>
              </button>

              <button
                onClick={() => {
                  showToast('ดาวน์โหลดใบรับเงินในรูปแบบไฟล์ PDF เรียบร้อย', 'success');
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด PDF</span>
              </button>

              <button
                onClick={() => {
                  setStep('form');
                  setAmount(1000);
                }}
                className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                ทำรายการอื่นต่อ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
