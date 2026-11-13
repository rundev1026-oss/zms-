'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FundAccount, BankAccount, FinancialTransaction } from '@/types';
import { PaymentGatewayAdapter } from '@/lib/paymentGatewayAdapter';
import { DigitalReceiptModal } from './DigitalReceiptModal';
import { DonationPaymentModal } from './DonationPaymentModal';
import {
  Coins,
  QrCode,
  Building2,
  Banknote,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Copy,
  Info
} from 'lucide-react';

interface DonationCollectionTabProps {
  currentUser: any;
  funds: FundAccount[];
  bankAccounts: BankAccount[];
  onDonationSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function DonationCollectionTab({
  currentUser,
  funds,
  bankAccounts,
  onDonationSuccess,
  showToast,
}: DonationCollectionTabProps) {
  // Preset quick amounts
  const presetAmounts = [500, 1000, 2500, 5000, 10000, 50000];

  // Dynamic Money Types derived from funds master data
  const moneyTypeOptions = [
    { value: 'zakat', label: 'เงินซะกาตภาคบังคับ (Pure Zakat - สำหรับ 8 อัสนัฟ)', allowedFunds: funds.filter(f => f.category === 'zakat') },
    { value: 'sadaqah', label: 'เงินศอดะเกาะฮ์ทั่วไป (General Sadaqah / สาธารณกุศล)', allowedFunds: funds.filter(f => (f.category as string) === 'sadaqah' || (f.category as string) === 'general') },
    { value: 'operational_admin', label: 'เงินบริจาคเพื่อค่าใช้จ่ายบริหารมูลนิธิ (Amil & Operations)', allowedFunds: funds.filter(f => f.category === 'operational') },
    { value: 'specific_purpose', label: 'เงินบริจาคเฉพาะวัตถุประสงค์ / โครงการพิเศษ', allowedFunds: funds },
  ];

  // Form State
  const [transactionNo, setTransactionNo] = useState(`TXN-REV-2569-${Math.floor(10000 + Math.random() * 90000)}`);
  const [amount, setAmount] = useState<number>(1000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('1000');
  const [selectedMoneyType, setSelectedMoneyType] = useState<string>('zakat');
  const [selectedFundId, setSelectedFundId] = useState<string>('');
  const [selectedAsnaf, setSelectedAsnaf] = useState<string>('faqir_miskin');
  const [purpose, setPurpose] = useState<string>('จ่ายซะกาตเพื่อการยังชีพและสงเคราะห์ผู้ยากไร้');
  const [branchId, setBranchId] = useState<string>('branch-1');
  const [notes, setNotes] = useState<string>('');

  // Active bank accounts that accept payments
  const activeBankAccounts = bankAccounts.filter((b) => b.status === 'active');

  // Filter bank accounts permitted for the selected money type (Payment Channel Mapping)
  const eligibleBankAccounts = useMemo(() => {
    return activeBankAccounts.filter((acc) => {
      const types = acc.moneyTypes || ['zakat', 'sadaqah'];
      if (selectedMoneyType === 'zakat') return types.includes('zakat');
      if (selectedMoneyType === 'sadaqah') return types.includes('sadaqah');
      if (selectedMoneyType === 'operational_admin') return types.includes('operational') || types.includes('operational_admin');
      if (selectedMoneyType === 'specific_purpose') return types.includes('specific_purpose') || types.includes('sadaqah');
      return true;
    });
  }, [activeBankAccounts, selectedMoneyType]);

  const defaultEligibleBank = eligibleBankAccounts.find((b) => b.isDefault) || eligibleBankAccounts[0] || null;

  // Payment Page Modal State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [activePaymentRef, setActivePaymentRef] = useState<string>(`REF-REV-2569-${Date.now().toString().slice(-5)}`);

  // Donor Details State
  const [donorType, setDonorType] = useState<'individual' | 'organization' | 'anonymous'>('individual');
  const [donorName, setDonorName] = useState<string>(currentUser?.name || 'นายยูซุฟ มีลาภ');
  const [donorPhone, setDonorPhone] = useState<string>('081-234-5678');
  const [donorEmail, setDonorEmail] = useState<string>('yusuf.donor@email.com');
  const [donorTaxId, setDonorTaxId] = useState<string>('');
  const [wantReceipt, setWantReceipt] = useState<boolean>(true);
  const [receiptAddress, setReceiptAddress] = useState<string>('');

  // Payment Method: 'promptpay_qr' | 'bank_transfer' | 'cash'
  const [paymentMethod, setPaymentMethod] = useState<'promptpay_qr' | 'bank_transfer' | 'cash'>('bank_transfer');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(defaultEligibleBank?.id || '');
  const [slipUrl, setSlipUrl] = useState<string>('');
  const [transferRef, setTransferRef] = useState<string>(`TF-${Date.now().toString().slice(-6)}`);
  const [cashOfficerName, setCashOfficerName] = useState<string>(currentUser?.name || 'เจ้าหน้าที่การเงิน');

  // Gateway Adapter status check
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [isLoadingGateway, setIsLoadingGateway] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success result & modal
  const [createdTxn, setCreatedTxn] = useState<FinancialTransaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Auto-select valid fund when money type changes
  useEffect(() => {
    const curMoneyTypeObj = moneyTypeOptions.find((m) => m.value === selectedMoneyType);
    if (curMoneyTypeObj && curMoneyTypeObj.allowedFunds.length > 0) {
      setSelectedFundId(curMoneyTypeObj.allowedFunds[0].id);
    }
  }, [selectedMoneyType, funds]);

  // Auto-switch bank account if current selection does not support the selected money type (Channel Mapping)
  useEffect(() => {
    if (eligibleBankAccounts.length > 0) {
      const isValid = eligibleBankAccounts.some((b) => b.id === selectedBankAccountId);
      if (!isValid) {
        setSelectedBankAccountId(defaultEligibleBank?.id || eligibleBankAccounts[0].id);
      }
    } else {
      setSelectedBankAccountId('');
    }
  }, [eligibleBankAccounts, selectedBankAccountId, defaultEligibleBank]);

  // Load gateway connection status
  useEffect(() => {
    async function checkGateway() {
      try {
        setIsLoadingGateway(true);
        const res = await fetch('/api/donations/gateway');
        const json = await res.json();
        if (json.success) setGatewayStatus(json.data);
      } catch (err) {
        console.error('Failed to load gateway status:', err);
      } finally {
        setIsLoadingGateway(false);
      }
    }
    checkGateway();
  }, []);

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setCustomAmountStr(val.toString());
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value.replace(/[^0-9.]/g, '');
    setCustomAmountStr(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
    }
  };

  const selectedFund = funds.find((f) => f.id === selectedFundId) || funds[0];
  const chosenBank = eligibleBankAccounts.find((b) => b.id === selectedBankAccountId) || defaultEligibleBank;

  const handleSubmitDonation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      showToast('กรุณาระบุจำนวนเงินที่ถูกต้อง', 'error');
      return;
    }

    if (paymentMethod === 'promptpay_qr') {
      setActivePaymentRef(transactionNo);
      setShowPaymentModal(true);
      return;
    }

    if (paymentMethod === 'bank_transfer' && !transferRef.trim()) {
      showToast('กรุณาระบุเลขอ้างอิงการโอนเงินเพื่อป้องกันรายการซ้ำ', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            fundId: selectedFundId,
            category: selectedFund?.name || 'ซะกาตเพื่อการสงเคราะห์',
            amount,
            moneyType: selectedMoneyType,
            asnafCategory: selectedMoneyType === 'zakat' ? selectedAsnaf : undefined,
            purpose,
            branchId,
            branchName: branchId === 'branch-1' ? 'สำนักงานใหญ่ กรุงเทพมหานคร' : 'สาขายะลา',
            notes,
            donorType,
            donorName: donorType === 'anonymous' ? 'ผู้ไม่ประสงค์ออกนาม' : donorName.trim(),
            donorPhone: donorType === 'anonymous' ? undefined : donorPhone,
            donorEmail: donorType === 'anonymous' ? undefined : donorEmail,
            donorTaxId: wantReceipt ? donorTaxId : undefined,
            receiptRequired: wantReceipt,
            receiptAddress: wantReceipt ? receiptAddress : undefined,
            paymentMethod,
            bankAccountId: paymentMethod === 'bank_transfer' ? selectedBankAccountId : undefined,
            referenceNo: paymentMethod === 'bank_transfer' ? transferRef.trim() : `CASH-${Date.now().toString().slice(-6)}`,
            slipUrl: paymentMethod === 'bank_transfer' ? (slipUrl || '/slips/sample-transfer-slip.jpg') : undefined,
          },
          actor: {
            id: currentUser.id || 'u-1',
            name: currentUser.name || 'เจ้าหน้าที่ฝ่ายการเงิน',
            role: currentUser.role || 'finance',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'เกิดข้อผิดพลาดในการบันทึกการรับเงิน', 'error');
        return;
      }

      const isPending = json.data.isPendingVerification;
      showToast(
        isPending
          ? `บันทึกรายการโอนเงินบริจาคเรียบร้อย (${json.data.transactionNo}) อยู่ในสถานะรอเจ้าหน้าที่ตรวจสอบสลิป`
          : `บันทึกรับเงินบริจาค ฿${amount.toLocaleString()} สำเร็จ ออกใบสำคัญรับเงินเรียบร้อย (${json.data.transactionNo})`,
        'success'
      );

      // Construct transaction object for receipt modal
      const newTxn: FinancialTransaction = {
        id: json.data.transactionId,
        transactionNo: json.data.transactionNo,
        date: json.data.date || new Date().toLocaleString('th-TH'),
        type: 'income',
        fundId: selectedFundId,
        fundName: selectedFund?.name || 'กองทุนซะกาต',
        category: selectedFund?.name || 'รับบริจาคเงิน',
        amount,
        paymentMethod,
        payerOrPayee: donorType === 'anonymous' ? 'ผู้ไม่ประสงค์ออกนาม' : donorName,
        referenceNo: paymentMethod === 'bank_transfer' ? transferRef : `CASH-${Date.now().toString().slice(-6)}`,
        receiptUrl: `/receipts/${json.data.receiptNo}.pdf`,
        status: isPending ? 'pending' : 'completed',
        recordedBy: currentUser.name || 'เจ้าหน้าที่รับเงิน',
        bankAccountId: selectedBankAccountId,
        moneyType: selectedMoneyType as any,
        donorName: donorType === 'anonymous' ? 'ผู้ไม่ประสงค์ออกนาม' : donorName,
        isAnonymous: donorType === 'anonymous',
        donorTaxId,
        donorPhone,
        donorEmail,
        receiptAddress,
      };

      setCreatedTxn(newTxn);
      if (!isPending && wantReceipt) {
        setShowReceiptModal(true);
      }

      // Generate new transaction No for next entry
      setTransactionNo(`TXN-REV-2569-${Math.floor(10000 + Math.random() * 90000)}`);
      onDonationSuccess();
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmitDonation} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Donation & Financial Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: ข้อมูลการบริจาค (Donation Financials) */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <Coins className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">ข้อมูลการรับบริจาค (Donation Entry)</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">เลขที่รายการอัตโนมัติ:</span>
                  <span className="font-mono text-xs font-bold text-emerald-900">{transactionNo}</span>
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  จำนวนเงินบริจาค (บาท) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2.5">
                  {presetAmounts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleAmountSelect(p)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        amount === p && customAmountStr === p.toString()
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ฿{p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ฿
                  </span>
                  <input
                    type="text"
                    value={customAmountStr}
                    onChange={handleCustomAmountChange}
                    placeholder="ระบุจำนวนเงินที่ต้องการ"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold text-base focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Money Type & Shariah Segregation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ประเภทเงิน (Money Type Master) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedMoneyType}
                    onChange={(e) => setSelectedMoneyType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                  >
                    {moneyTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    กองทุนปลายทาง (Target Fund Account) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedFundId}
                    onChange={(e) => setSelectedFundId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                  >
                    {funds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} - {f.name} (คงเหลือ: ฿{f.availableAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Field: Asnaf Selection for Pure Zakat */}
              {selectedMoneyType === 'zakat' && (
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-emerald-950">
                      กลุ่มเป้าหมายอัสนัฟ (Asnaf Category) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      เฉพาะเงินประเภทซะกาต 8 อัสนัฟ
                    </span>
                  </div>
                  <select
                    value={selectedAsnaf}
                    onChange={(e) => setSelectedAsnaf(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  >
                    <option value="faqir_miskin">1. ฟากีรและมิสกีน (ผู้ยากไร้และขัดสน - ลำดับความสำคัญสูงสุด)</option>
                    <option value="amil">2. อามิล (เจ้าหน้าที่จัดเก็บและบริหารซะกาต)</option>
                    <option value="muallaf">3. มุอัลลัฟ (ผู้มีจิตใจโน้มเอียงสู่อิสลาม)</option>
                    <option value="riqab">4. ริกอบ (การปลดปล่อยทาสและคุ้มครองอิสรภาพ)</option>
                    <option value="gharimin">5. ฆอริมีน (ผู้มีภาระหนี้สินจำเป็นล้นพ้นตัว)</option>
                    <option value="fisabilillah">6. ฟีสะบีลิลลาฮ์ (การดำเนินงานในหนทางของอัลลอฮ์/การศึกษา)</option>
                    <option value="ibn_sabil">7. อิบนุสสะบีล (ผู้เดินทางไกลที่ขาดแคลนเสบียง/ผู้ประสบภัย)</option>
                    <option value="all_asnaf">8. จัดสรรรวมทุกอัสนัฟตามมติคณะกรรมการชะรีอะฮ์</option>
                  </select>
                </div>
              )}

              {/* Shariah Segregation Notice */}
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs flex items-start gap-2 text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <span className="font-bold">หลักการชะรีอะฮ์:</span> เงินประเภทซะกาตจะถูกแยกบัญชีและจัดสรรเข้าสู่กองทุน 8 อัสนัฟโดยตรง ห้ามนำไปปะปนกับเงินค่าใช้จ่ายบริหารมูลนิธิโดยเด็ดขาด
                </p>
              </div>

              {/* Purpose & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สาขาที่รับบริจาค
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                  >
                    <option value="branch-1">สำนักงานใหญ่ กรุงเทพมหานคร</option>
                    <option value="branch-2">สาขาจังหวัดยะลา (บัยตุลมาล ยะลา)</option>
                    <option value="branch-3">สาขาจังหวัดปัตตานี</option>
                    <option value="branch-4">สาขาจังหวัดนราธิวาส</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เจ้าหน้าที่ผู้รับรายการ
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${currentUser?.name || 'นายยูซุฟ เจ้าหน้าที่'} (${currentUser?.role || 'staff'})`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วัตถุประสงค์ / หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="เช่น ซะกาตรายได้ประจำปี 2569, ศอดะเกาะฮ์สร้างอาคารเรียน ฯลฯ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Card 2: ข้อมูลผู้บริจาค (Donor Information) */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">ข้อมูลผู้บริจาค (Donor Details)</h3>
                </div>

                {/* Donor Type Selector */}
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setDonorType('individual')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      donorType === 'individual' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    บุคคลธรรมดา
                  </button>
                  <button
                    type="button"
                    onClick={() => setDonorType('organization')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      donorType === 'organization' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    นิติบุคคล/องค์กร
                  </button>
                  <button
                    type="button"
                    onClick={() => setDonorType('anonymous')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      donorType === 'anonymous' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    ไม่ประสงค์ออกนาม
                  </button>
                </div>
              </div>

              {donorType !== 'anonymous' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {donorType === 'organization' ? 'ชื่อองค์กร / บริษัท' : 'ชื่อ-นามสกุล ผู้บริจาค'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        placeholder="กรอกชื่อผู้บริจาค"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เบอร์โทรศัพท์ติดต่อ
                      </label>
                      <input
                        type="tel"
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        placeholder="08X-XXX-XXXX"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        อีเมล (สำหรับส่งใบเสร็จอิเล็กทรอนิกส์)
                      </label>
                      <input
                        type="email"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        placeholder="donor@example.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เลขประจำตัวผู้เสียภาษี (สำหรับใบเสร็จลดหย่อนภาษี)
                      </label>
                      <input
                        type="text"
                        value={donorTaxId}
                        onChange={(e) => setDonorTaxId(e.target.value)}
                        placeholder="เลข 13 หลัก (ถ้ามี)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  {/* Receipt toggle */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wantReceipt}
                        onChange={(e) => setWantReceipt(e.target.checked)}
                        className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                      />
                      <span>ต้องการออกใบเสร็จรับเงินอย่างเป็นทางการ (Official Receipt)</span>
                    </label>

                    {wantReceipt && (
                      <div className="mt-2.5">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          ที่อยู่สำหรับออกใบเสร็จ / จัดส่ง
                        </label>
                        <input
                          type="text"
                          value={receiptAddress}
                          onChange={(e) => setReceiptAddress(e.target.value)}
                          placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
                  <User className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-800">ผู้บริจาคไม่ประสงค์ออกนาม</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ระบบจะบันทึกรายการในนาม &quot;ผู้ไม่ประสงค์ออกนาม&quot; เพื่อความประสงค์ส่วนบุคคลและเป็นไปตามหลักการกุศล
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Payment Channel Selection & Verification */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">ช่องทางการชำระเงิน (Payment Channel)</h3>
                <p className="text-xs text-slate-500 mt-0.5">เลือกช่องทางรับชำระเงินที่ต้องการบันทึก</p>
              </div>

              {/* Channel Tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`zms-action p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                 aria-label="โอนธนาคาร" title="โอนธนาคาร">
                  <Building2 className="w-5 h-5 text-emerald-700" />
                  <span>โอนธนาคาร</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`zms-action p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                 aria-label="เงินสด (Cash)" title="เงินสด (Cash)">
                  <Banknote className="w-5 h-5 text-emerald-700" />
                  <span>เงินสด (Cash)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('promptpay_qr')}
                  className={`zms-action p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                    paymentMethod === 'promptpay_qr'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                 aria-label="PromptPay QR" title="PromptPay QR">
                  <QrCode className="w-5 h-5 text-emerald-700" />
                  <span>PromptPay QR</span>
                </button>
              </div>

              {/* Channel Details */}
              {/* Channel 1: Bank Transfer */}
              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เลือกบัญชีธนาคารรับเงินของมูลนิธิ (คัดกรองตามประเภทเงินที่เลือก) <span className="text-rose-500">*</span>
                    </label>
                    {eligibleBankAccounts.length > 0 ? (
                      <select
                        value={selectedBankAccountId}
                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                      >
                        {eligibleBankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountName} ({b.accountNumber}) {b.isDefault ? '★ บัญชีหลัก' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">ไม่มีบัญชีธนาคารที่รองรับประเภทเงินนี้</p>
                          <p className="text-[11px] text-rose-700 mt-0.5">
                            กรุณาติดต่อผู้ดูแลระบบ (Super Admin) เพื่อเพิ่มหรือแก้ไขสิทธิ์ประเภทเงินของบัญชีธนาคารในแท็บ &quot;ตั้งค่าบัญชีธนาคาร&quot;
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Destination Bank Card Display */}
                  {chosenBank && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{chosenBank.bankName}</span>
                        {chosenBank.isDefault && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            บัญชีหลัก
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600">ชื่อบัญชี: {chosenBank.accountName}</p>
                      <p className="font-mono font-bold text-emerald-900 text-sm">{chosenBank.accountNumber}</p>
                      <p className="text-[11px] text-slate-500">สาขา: {chosenBank.branchName || 'สำนักงานใหญ่'}</p>
                      {chosenBank.promptpayId && (
                        <p className="text-[11px] text-slate-600 font-mono">
                          PromptPay ID: {chosenBank.promptpayId}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Transfer Reference & Slip Attachment */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      หมายเลขอ้างอิงการโอนเงิน (จากสลิป / Ref No.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      placeholder="เช่น BBL-1234567 หรือ KBANK-987654"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      ระบบจะตรวจสอบความซ้ำซ้อนกับฐานข้อมูล เพื่อป้องกันการนำสลิปเก่ามาใช้ซ้ำ
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      หลักฐานการโอนเงิน (สลิปโอนเงิน)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-slate-700">แนบไฟล์ภาพสลิปโอนเงิน (JPG / PNG)</p>
                      <p className="text-[10px] text-slate-400">หรือระบุ URL รูปภาพสลิปในช่องด้านล่าง</p>
                    </div>
                    <input
                      type="text"
                      value={slipUrl}
                      onChange={(e) => setSlipUrl(e.target.value)}
                      placeholder="URL ภาพสลิป (เช่น /slips/transfer-01.jpg)"
                      className="w-full mt-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <span className="font-bold">เงื่อนไขการตรวจสอบ:</span> การแนบสลิปจะสร้างรายการในสถานะ <span className="font-bold underline">&quot;รอตรวจสอบ (Pending)&quot;</span> ยอดเงินจะยังไม่ถูกนำเข้ากองทุนจนกว่าเจ้าหน้าที่การเงินจะตรวจสอบยอดจริงในบัญชีธนาคาร
                    </p>
                  </div>
                </div>
              )}

              {/* Channel 2: Cash */}
              {paymentMethod === 'cash' && (
                <div className="space-y-4 pt-1">
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <Banknote className="w-4 h-4 text-emerald-700" />
                      <span>บันทึกรับเงินสดจริง ณ จุดบริการ (Cash Ledger)</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      รายการเงินสดจะถูกบันทึกเข้าสู่สมุดเงินสดของมูลนิธิทันที พร้อมออกใบรับเงินดิจิทัล
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เจ้าหน้าที่ผู้รับเงินสดตัวจริง <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cashOfficerName}
                      onChange={(e) => setCashOfficerName(e.target.value)}
                      placeholder="ระบุชื่อเจ้าหน้าที่ผู้รับเงินสด"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ยอดเงินสดที่นับได้จริง (บาท)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-900 font-mono font-bold text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Channel 3: PromptPay Dynamic QR (Adapter Enforcement) */}
              {paymentMethod === 'promptpay_qr' && (
                <div className="space-y-4 pt-1">
                  {/* Adapter Status Alert */}
                  {gatewayStatus && !gatewayStatus.isConnected ? (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-xs">สถานะเกตเวย์: ยังไม่ได้เชื่อมต่อ Payment Gateway</p>
                          <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                            ตามมาตรฐานความถูกต้องทางการเงิน: ระบบไม่อนุญาตให้แสดง QR ปลอมหรือจำลองปุ่มยืนยันเงินสำเร็จโดยไม่มี Payment Gateway จริง
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-white/80 rounded-xl border border-rose-200/80 text-[11px] space-y-1.5 text-slate-700">
                        <p className="font-bold text-slate-800">ขั้นตอนการตั้งค่าเกตเวย์ (Setup Guide):</p>
                        <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                          <li>ขอรับ Merchant ID และ Secret Key จากผู้ให้บริการ (เช่น GB Prime Pay หรือ 2C2P)</li>
                          <li>นำ Webhook URL ไปลงทะเบียน: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">{gatewayStatus.webhookUrl}</code></li>
                          <li>ตั้งค่าระบบใน Tab &quot;ตั้งค่าบัญชีรับเงิน&quot; เพื่อเปิดใช้งาน Dynamic QR</li>
                        </ol>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className="zms-action w-full py-2 px-3 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors flex items-center justify-center gap-1.5"
                       aria-label="สลับไปใช้การโอนเงินผ่านธนาคาร (มีบัญชีรองรับ)" title="สลับไปใช้การโอนเงินผ่านธนาคาร (มีบัญชีรองรับ)">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>สลับไปใช้การโอนเงินผ่านธนาคาร (มีบัญชีรองรับ)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Payment Gateway เชื่อมต่อสมบูรณ์ (พร้อมสร้าง Dynamic QR)</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        ระบบจะสร้าง Dynamic PromptPay QR พร้อมเลขที่อ้างอิงและรอ Webhook ยืนยันยอดอัตโนมัติ
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || (paymentMethod === 'promptpay_qr' && gatewayStatus && !gatewayStatus.isConnected)}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึกรายการ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {paymentMethod === 'bank_transfer'
                          ? `บันทึกรายการโอนเงิน ฿${amount.toLocaleString()} (รอตรวจสอบ)`
                          : `ยืนยันรับเงินบริจาค ฿${amount.toLocaleString()} บาท`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Digital Receipt Modal */}
      {showReceiptModal && createdTxn && (
        <DigitalReceiptModal
          transaction={createdTxn}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* Donation Payment Page Modal */}
      {showPaymentModal && (
        <DonationPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          referenceNo={activePaymentRef}
          transactionNo={transactionNo}
          amount={amount}
          fundName={selectedFund?.name || 'กองทุนซะกาต'}
          moneyType={selectedMoneyType}
          donorName={donorType === 'anonymous' ? 'ผู้ไม่ประสงค์ออกนาม' : donorName}
          bankAccount={chosenBank || defaultEligibleBank}
          paymentMethod={paymentMethod}
          gatewayStatus={gatewayStatus}
          onPaymentVerified={(txn) => {
            setCreatedTxn(txn);
            onDonationSuccess();
            setShowPaymentModal(false);
            if (wantReceipt) setShowReceiptModal(true);
          }}
          onCancel={() => {
            setShowPaymentModal(false);
            showToast('ยกเลิกรายการชำระเงินเรียบร้อยแล้ว', 'info');
          }}
          onViewReceipt={() => {
            setShowPaymentModal(false);
            setShowReceiptModal(true);
          }}
        />
      )}
    </div>
  );
}
