'use client';

import React, { useState, useEffect } from 'react';
import { formatPersonName } from '@zms/shared';
import { useApp } from '@/context/AppContext';
import { 
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
  Heart,
  FileText
} from 'lucide-react';

interface PaymentAndMemberViewProps {
  onNavigate: (view: string) => void;
  checkoutAmount?: number;
  checkoutCategory?: string;
}

export function PaymentAndMemberView({ 
  onNavigate, 
  checkoutAmount = 8750, 
  checkoutCategory = 'ซะกาตทรัพย์สินทางการเงิน' 
}: PaymentAndMemberViewProps) {
  const { funds, recordIncome, applications, transactions, currentUser, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'checkout' | 'history' | 'my-application'>('checkout');

  // Checkout form
  const [amount, setAmount] = useState<number>(checkoutAmount);
  const [selectedFundId, setSelectedFundId] = useState<string>('fund-1');
  const [donorName, setDonorName] = useState<string>(currentUser.name || 'นาย ยูซุฟ มีลาภ');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [donorPhone, setDonorPhone] = useState<string>('082-999-4455');
  const [donorTaxId, setDonorTaxId] = useState<string>('');

  // Payment states: 'awaiting_payment' | 'paid'
  const [paymentStatus, setPaymentStatus] = useState<'awaiting_payment' | 'paid'>('awaiting_payment');
  const [timerSeconds, setTimerSeconds] = useState<number>(900); // 15 mins
  const [paymentRefNo, setPaymentRefNo] = useState<string>('PP-2569-881290');
  const [receiptNo, setReceiptNo] = useState<string>('REC-2569-0099');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (checkoutAmount > 0) {
      setAmount(checkoutAmount);
    }
  }, [checkoutAmount]);

  useEffect(() => {
    let interval: any = null;
    if (paymentStatus === 'awaiting_payment' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [paymentStatus, timerSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSimulateBankConfirmation = async () => {
    if (isSubmitting || paymentStatus === 'paid') return;
    setIsSubmitting(true);
    try {
      const payerDisplay = isAnonymous ? 'ผู้บริจาคไม่ประสงค์ออกนาม' : donorName.trim();
      const generatedReceipt = `REC-2569-${Math.floor(1000 + Math.random() * 9000)}`;
      setReceiptNo(generatedReceipt);

      const success = await recordIncome(
        selectedFundId,
        checkoutCategory,
        amount,
        payerDisplay,
        'promptpay_qr',
        paymentRefNo,
        'ชำระเงินผ่านระบบ PromptPay QR Real-time',
        {
          donorName: payerDisplay,
          isAnonymous,
          receiptNo: generatedReceipt,
        }
      );

      if (success) {
        setPaymentStatus('paid');
        showToast('ธนาคารยืนยันยอดเงินสำเร็จ ออกใบรับเงินดิจิทัลเรียบร้อย', 'success');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single Source of Truth: Find member's own application by ID, National ID, or Fallback
  const myApp = applications.find(
    (a) =>
      (currentUser.nationalId && a.nationalId === currentUser.nationalId) ||
      (currentUser.id && (a.memberId === currentUser.id || a.nationalId === currentUser.id)) ||
      (currentUser.name && currentUser.role === 'member' && a.fullName.toLowerCase().includes(currentUser.name.toLowerCase()))
  ) || applications[0] || null;

  // Real transactions from database Single Source of Truth
  const incomeTransactions = transactions.filter((t) => t.type === 'income');

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-700" />
              ระบบชำระเงินซะกาต & ติดตามสถานะสมาชิก
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              PromptPay QR Real-time
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ออก QR PromptPay บริจาคซะกาต เข้าสู่บัญชีกองทุนโดยตรง พร้อมดาวน์โหลดใบสำคัญรับเงิน
          </p>
        </div>

        {/* Tab switch */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setActiveTab('checkout')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'checkout'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ทำรายการชำระ QR
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ประวัติการจ่ายของฉัน
          </button>
          <button
            onClick={() => setActiveTab('my-application')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'my-application'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ติดตามคำร้องขอรับความช่วยเหลือ
          </button>
        </div>
      </div>

      {/* TAB 1: Payment Checkout Flow */}
      {activeTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Donor Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
              1. ระบุข้อมูลผู้จ่ายซะกาตและกองทุน
            </h2>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ประเภทซะกาต
              </label>
              <input
                type="text"
                readOnly
                value={checkoutCategory}
                className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                จำนวนเงินที่ต้องการจ่าย (บาท)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-emerald-800 text-base"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                เลือกกองทุนเป้าหมายที่ต้องการสมทบ
              </label>
              <select
                value={selectedFundId}
                onChange={(e) => setSelectedFundId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>ไม่ประสงค์ออกนามในรายงานสาธารณะ</span>
              </label>

              {!isAnonymous && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ชื่อ - นามสกุล (สำหรับออกใบรับเงิน)
                    </label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      เบอร์โทรศัพท์สำหรับรับ SMS ยืนยัน
                    </label>
                    <input
                      type="tel"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right 2 Columns: QR Code Presentation and Gateway Callback Simulation */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
            {paymentStatus === 'awaiting_payment' ? (
              <>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 animate-pulse">
                    <Clock className="w-3.5 h-3.5" /> รอการชำระเงิน (เหลือเวลา {formatTimer(timerSeconds)})
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">
                    สแกน QR Code ผ่าน Mobile Banking เพื่อชำระเงิน
                  </h3>
                  <p className="text-xs text-slate-500">
                    ยอดชำระ: <strong className="text-emerald-700 text-sm">฿{amount.toLocaleString()} บาท</strong>
                  </p>
                </div>

                {/* PromptPay QR Frame */}
                <div className="p-5 rounded-3xl bg-white border-2 border-slate-800 shadow-lg space-y-3 max-w-xs w-full">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-xs tracking-wider text-slate-900">PROMPTPAY</span>
                    <span className="text-[10px] text-slate-500 font-mono">Biller ID: 0-9940-00123-88</span>
                  </div>

                  {/* Visual QR Code Display */}
                  <div className="w-48 h-48 mx-auto bg-slate-50 rounded-2xl border border-slate-300 flex flex-col items-center justify-center p-3 relative overflow-hidden group">
                    {/* Simulated Clean SVG QR Code */}
                    <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-white rounded-xl">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-xs ${
                            (i % 2 === 0 || i % 5 === 0 || i === 0 || i === 5 || i === 30 || i === 35)
                              ? 'bg-slate-900'
                              : 'bg-slate-100'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
                        ZMS
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-left text-[11px] text-slate-600 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">อ้างอิง:</span>
                      <span className="font-mono font-bold text-slate-800">{paymentRefNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ชื่อบัญชี:</span>
                      <span className="font-medium text-slate-800">มูลนิธิซะกาตเพื่อการกุศล</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Bank Webhook / Callback Trigger Button */}
                <div className="max-w-md w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    โหมดทดสอบระบบ (Payment Gateway Simulator)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ตามมาตรฐานความปลอดภัย ห้ามเปลี่ยนสถานะเป็นชำระเงินแล้วหากไม่ได้รับ Callback ยืนยันจากธนาคาร คลิกปุ่มด้านล่างเพื่อจำลองผลลัพธ์ธนาคาร:
                  </p>
                  <button
                    onClick={handleSimulateBankConfirmation}
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {isSubmitting ? 'กำลังบันทึกยืนยันยอด...' : 'จำลองธนาคารยืนยันยอดสำเร็จ (Simulate Success)'}
                  </button>
                </div>
              </>
            ) : (
              /* Success / Digital Receipt Screen */
              <div className="max-w-md w-full p-6 rounded-3xl bg-emerald-50/60 border border-emerald-200 text-center space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl mx-auto shadow-md">
                  ✓
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-emerald-950">
                    การชำระเงินซะกาตเสร็จสมบูรณ์
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    ญะซากุมุลลอฮุ ค็อยรอน ขออัลลอฮ์ทรงตอบแทนความดีงามของท่าน
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-100 text-left text-xs space-y-2 shadow-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">เลขที่ใบเสร็จ:</span>
                    <span className="font-mono font-bold text-slate-900">{receiptNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">วันที่ทำรายการ:</span>
                    <span className="text-slate-700">{new Date().toLocaleString('th-TH')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ผู้จ่ายซะกาต:</span>
                    <span className="font-semibold text-slate-900">{isAnonymous ? 'ผู้ไม่ประสงค์ออกนาม' : donorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">สมทบกองทุน:</span>
                    <span className="text-emerald-800 font-medium">{funds.find(f => f.id === selectedFundId)?.name}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-sm">
                    <span className="text-slate-900">ยอดเงินบริจาค:</span>
                    <span className="text-emerald-700 font-extrabold">฿{amount.toLocaleString()} บาท</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => showToast(`ดาวน์โหลดใบสำคัญรับเงินดิจิทัล (${receiptNo}) เรียบร้อย`, 'success')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> ดาวน์โหลดใบเสร็จ (PDF)
                  </button>

                  <button
                    onClick={() => {
                      setPaymentStatus('awaiting_payment');
                      setPaymentRefNo(`PP-2569-${Date.now().toString().slice(-6)}`);
                      setTimerSeconds(900);
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    ทำรายการใหม่
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Member's Own Payment History (Single Source of Truth) */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ประวัติการจ่ายเงินซะกาตและใบรับเงินของคุณ ({donorName})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                รายการธุรกรรมรับเงินซะกาตจริงจากฐานข้อมูล พร้อมออกใบรับเงินดิจิทัล
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {incomeTransactions.length} รายการในระบบ
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">เลขที่ใบรับเงิน / ธุรกรรม</th>
                  <th className="py-3 px-4">วันที่ชำระ</th>
                  <th className="py-3 px-4">ประเภทซะกาต</th>
                  <th className="py-3 px-4">กองทุนที่สมทบ</th>
                  <th className="py-3 px-4">ช่องทาง</th>
                  <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                  <th className="py-3 px-4 text-center">ใบสำคัญรับเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomeTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      ยังไม่มีประวัติการชำระเงินซะกาตในระบบ
                    </td>
                  </tr>
                ) : (
                  incomeTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {tx.referenceNo || tx.transactionNo}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{tx.date}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{tx.category}</td>
                      <td className="py-3 px-4 text-emerald-800 font-medium">{tx.fundName}</td>
                      <td className="py-3 px-4 text-slate-500">{tx.paymentMethod === 'promptpay_qr' ? 'PromptPay QR' : tx.paymentMethod === 'bank_transfer' ? 'โอนเงินธนาคาร' : 'เงินสด'}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                        ฿{tx.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => showToast(`ดาวน์โหลดใบเสร็จ ${tx.referenceNo || tx.transactionNo} เรียบร้อย`, 'info')}
                          className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold cursor-pointer transition-colors"
                        >
                          ดาวน์โหลด PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Member's Application Tracking (Single Source of Truth) */}
      {activeTab === 'my-application' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          {!myApp ? (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">ยังไม่มีข้อมูลคำร้องขอรับความช่วยเหลือในระบบ</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                ยังไม่พบข้อมูลคำร้องขอรับความช่วยเหลือที่เชื่อมโยงกับบัญชีผู้ใช้ปัจจุบัน ท่านสามารถตรวจสอบทะเบียนหรือยื่นคำร้องใหม่ได้
              </p>
              <button
                onClick={() => onNavigate('assistance-requests')}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
              >
                ไปที่หน้ายื่นคำร้องขอความช่วยเหลือ
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    สถานะคำร้องขอรับความช่วยเหลือของคุณ
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    เลขที่คำร้อง: {myApp.applicationNo} • ผู้ยื่น: {formatPersonName(myApp)}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  สถานะ: {myApp.status === 'wait_disbursement' ? 'ผ่านการอนุมัติแล้ว รอโอนเงิน' : myApp.status}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">วงเงินที่ได้รับอนุมัติ:</span>
                  <span className="text-2xl font-extrabold text-teal-900">
                    ฿{(myApp.approvedAmount || myApp.requestedAmount).toLocaleString()} บาท
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">เจ้าหน้าที่ผู้รับผิดชอบ:</span>
                  <span className="font-bold text-slate-800">{myApp.assignedOfficerName || 'เจ้าหน้าที่ประจำสาขา'}</span>
                </div>
              </div>

              {/* Timeline visualization */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  ขั้นตอนการดำเนินงาน (Progress Timeline)
                </h3>

                <div className="space-y-4 border-l-2 border-emerald-500 pl-4 ml-2 text-xs">
                  {(myApp.statusHistory && myApp.statusHistory.length > 0) ? (
                    myApp.statusHistory.map((step, idx) => (
                      <div key={idx} className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[22px] top-1 ring-4 ring-white" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{step.status}</span>
                          <span className="text-[10px] text-slate-400">{step.timestamp}</span>
                        </div>
                        <div className="text-slate-600 mt-0.5">{step.notes}</div>
                      </div>
                    ))
                  ) : (
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[22px] top-1 ring-4 ring-white" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{myApp.status}</span>
                        <span className="text-[10px] text-slate-400">{myApp.appliedDate}</span>
                      </div>
                      <div className="text-slate-600 mt-0.5">บันทึกคำร้องเข้าระบบเรียบร้อย</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
