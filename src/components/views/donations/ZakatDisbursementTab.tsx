'use client';

import React, { useState, useEffect } from 'react';
import { FundAccount, BankAccount, AssistanceApplication, FinancialTransaction } from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import { DigitalReceiptModal } from './DigitalReceiptModal';
import {
  Heart,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Building2,
  Wallet,
  ShieldCheck,
  Receipt,
  User,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  X,
  CreditCard
} from 'lucide-react';

interface ZakatDisbursementTabProps {
  currentUser: any;
  funds: FundAccount[];
  bankAccounts: BankAccount[];
  applications?: AssistanceApplication[];
  onDisbursementSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function ZakatDisbursementTab({
  currentUser,
  funds,
  bankAccounts,
  applications = [],
  onDisbursementSuccess,
  showToast,
}: ZakatDisbursementTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [asnafFilter, setAsnafFilter] = useState('all');
  const [approvedAppsList, setApprovedAppsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Disburse modal state
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [disburseAmount, setDisburseAmount] = useState<number>(0);
  const [selectedFundId, setSelectedFundId] = useState<string>('fund-1');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(bankAccounts[0]?.id || '');
  const [disbursementMethod, setDisbursementMethod] = useState<'bank_transfer' | 'promptpay' | 'cash'>('bank_transfer');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success voucher receipt
  const [disbursementVoucher, setDisbursementVoucher] = useState<FinancialTransaction | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState<boolean>(false);

  // Fetch real approved / wait_disbursement applications from API
  const fetchApprovedApps = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/finance/cash-flow?approved_apps=true');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setApprovedAppsList(json.data);
      }
    } catch (e) {
      console.error('Failed to load approved apps:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedApps();
  }, []);

  // Merge with applications from AppContext if approvedAppsList is empty
  const pendingQueue = approvedAppsList.length > 0
    ? approvedAppsList
    : applications
        .filter((a) => a.status === 'wait_disbursement' || a.status === 'approved')
        .map((a) => ({
          id: a.id,
          applicationNo: a.applicationNo,
          beneficiaryName: a.fullName,
          nationalId: a.nationalId || '-',
          asnafCategory: a.asnafCategory,
          assistanceType: a.assistanceType || 'เงินสงเคราะห์เพื่อการยังชีพ',
          approvedAmount: a.approvedAmount || a.requestedAmount || 5000,
          approvedFundId: a.approvedFundId || 'fund-1',
          approvedById: (a as any).approvedById || a.approvedBy,
          approvedByName: (a as any).approvedByName || a.approvedBy,
          status: a.status,
          bankName: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)',
          bankAccountNo: '020-1-88990-2',
        }));

  // Filtering
  const filteredQueue = pendingQueue.filter((item) => {
    const matchAsnaf = asnafFilter === 'all' || item.asnafCategory === asnafFilter;
    const matchSearch =
      searchTerm.trim() === '' ||
      item.beneficiaryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.applicationNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nationalId?.includes(searchTerm);
    return matchAsnaf && matchSearch;
  });

  const totalWaitingAmount = pendingQueue.reduce((acc, curr) => acc + (Number(curr.approvedAmount) || 0), 0);

  const handleOpenDisburseModal = (app: any) => {
    setSelectedApp(app);
    setDisburseAmount(Number(app.approvedAmount) || 0);
    setSelectedFundId(app.approvedFundId || 'fund-1');
    setSelectedBankAccountId(bankAccounts[0]?.id || '');
    setPaymentRef(`DISB-TX-${Date.now().toString().slice(-6)}`);
    setNotes(`จ่ายเงินสงเคราะห์ซะกาตตามคำร้อง ${app.applicationNo}`);
  };

  const handleConfirmDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    // Segregation of Duties Check
    if (
      currentUser.role !== 'super_admin' &&
      selectedApp.approvedById &&
      selectedApp.approvedById === currentUser.id
    ) {
      showToast(
        `การละเมิดหลักการแบ่งแยกหน้าที่ (SoD): ท่านเป็นผู้อนุมัติคำร้องนี้ (${selectedApp.approvedByName}) จึงไม่มีสิทธิ์ทำรายการเบิกจ่ายด้วยตนเอง กรุณาให้เจ้าหน้าที่การเงินท่านอื่นดำเนินการ`,
        'error'
      );
      return;
    }

    const fund = funds.find((f) => f.id === selectedFundId) || funds[0];
    if (fund && fund.availableAmount < disburseAmount) {
      showToast(
        `ยอดเงินคงเหลือในกองทุน "${fund.name}" (฿${fund.availableAmount.toLocaleString()}) ไม่เพียงพอสำหรับจ่าย ฿${disburseAmount.toLocaleString()}`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          amount: disburseAmount,
          bankAccountId: selectedBankAccountId,
          paymentMethod: disbursementMethod,
          paymentRef: paymentRef.trim(),
          notes,
          actor: {
            id: currentUser.id || 'u-1',
            name: currentUser.name || 'เจ้าหน้าที่ฝ่ายการเงิน',
            role: currentUser.role || 'finance',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'เกิดข้อผิดพลาดในการเบิกจ่ายเงิน', 'error');
        return;
      }

      showToast(
        `เบิกจ่ายเงินซะกาตสำเร็จ ฿${disburseAmount.toLocaleString()} บาท แก่คุณ ${selectedApp.beneficiaryName}`,
        'success'
      );

      // Create voucher object for receipt modal
      const voucher: FinancialTransaction = {
        id: json.data?.id || `txn-${Date.now()}`,
        transactionNo: json.data?.transactionNo || `TXN-DISB-2569-${Date.now().toString().slice(-5)}`,
        date: new Date().toLocaleString('th-TH'),
        type: 'disbursement',
        fundId: selectedFundId,
        fundName: fund?.name || 'กองทุนซะกาต',
        category: `จ่ายซะกาต (${selectedApp.asnafCategory || 'ผู้ยากไร้'})`,
        amount: disburseAmount,
        paymentMethod: disbursementMethod === 'cash' ? 'cash' : disbursementMethod === 'promptpay' ? 'promptpay_qr' : 'bank_transfer',
        payerOrPayee: selectedApp.beneficiaryName,
        referenceNo: paymentRef,
        receiptUrl: `/receipts/VOUCHER-${Date.now().toString().slice(-6)}.pdf`,
        status: 'completed',
        recordedBy: currentUser.name || 'เจ้าหน้าที่ฝ่ายการเงิน',
        notes: notes || `จ่ายเงินสงเคราะห์ตามคำร้อง ${selectedApp.applicationNo}`,
      };

      setDisbursementVoucher(voucher);
      setShowVoucherModal(true);
      setSelectedApp(null);
      fetchApprovedApps();
      onDisbursementSuccess();
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const asnafNameMap: Record<string, string> = {
    faqir_miskin: 'ฟากีร-มิสกิน (ผู้ยากไร้และขัดสน)',
    gharimin: 'อัล-ฆอรีมีน (ผู้มีหนี้สินล้นตัว)',
    muallaf: 'มุอัลลัฟ (มุสลิมใหม่)',
    fisabilillah: 'ฟีสะบีลิลลาฮ์ (หนทางของอัลลอฮ์)',
    ibnsabil: 'อิบนุสสะบีล (ผู้เดินทางตกยาก)',
    amil: 'อามีล (เจ้าหน้าที่จัดการ)',
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
            Zakat Disbursement Workflow
          </span>
          <h2 className="text-lg font-black mt-1">คิวรอเบิกจ่ายเงินสงเคราะห์ซะกาต (Approved Queue)</h2>
          <p className="text-xs text-emerald-100/80 mt-0.5">
            คำร้องที่ผ่านการพิจารณาอนุมัติแล้ว พร้อมให้เจ้าหน้าที่การเงินเบิกจ่ายเข้าบัญชีผู้มีสิทธิ์ 8 อัสนัฟ
          </p>
        </div>

        <div className="flex items-center gap-6 bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/20">
          <div>
            <p className="text-[11px] text-emerald-200">รอเบิกจ่ายทั้งหมด</p>
            <p className="text-xl font-black font-mono">{pendingQueue.length} รายการ</p>
          </div>
          <div className="border-l border-white/20 pl-6">
            <p className="text-[11px] text-emerald-200">ยอดรวมรอเบิกจ่าย</p>
            <p className="text-xl font-black font-mono text-amber-300">
              ฿{totalWaitingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อผู้รับ, เลขคำร้อง, เลขบัตร..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={asnafFilter}
            onChange={(e) => setAsnafFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
          >
            <option value="all">ทุกหมวดหมู่อัสนัฟ (All Asnaf)</option>
            <option value="faqir_miskin">ฟากีร-มิสกิน (ผู้ยากไร้)</option>
            <option value="gharimin">อัล-ฆอรีมีน (หนี้สิน)</option>
            <option value="muallaf">มุอัลลัฟ (มุสลิมใหม่)</option>
            <option value="fisabilillah">ฟีสะบีลิลลาฮ์</option>
            <option value="ibnsabil">อิบนุสสะบีล</option>
          </select>

          <button
            onClick={fetchApprovedApps}
            disabled={isLoading}
            className="zms-action p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="รีเฟรชข้อมูลคิว"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Applications Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredQueue.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-bold text-slate-800 text-sm">ไม่มีคำร้องค้างรอเบิกจ่าย</p>
            <p className="text-xs text-slate-500 mt-1">
              คำร้องขอความช่วยเหลือที่ได้รับการอนุมัติทั้งหมดถูกเบิกจ่ายเรียบร้อยแล้ว
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">เลขที่คำร้อง</th>
                  <th className="py-3 px-4">ชื่อผู้มีสิทธิ์รับซะกาต</th>
                  <th className="py-3 px-4">หมวดหมู่อัสนัฟ</th>
                  <th className="py-3 px-4">ประเภทการช่วยเหลือ</th>
                  <th className="py-3 px-4 text-right">ยอดอนุมัติ</th>
                  <th className="py-3 px-4">ผู้อนุมัติคำร้อง</th>
                  <th className="py-3 px-4 text-center">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-900">
                      {item.applicationNo}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{item.beneficiaryName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">บัตร: {item.nationalId}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {asnafNameMap[item.asnafCategory] || item.asnafCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.assistanceType}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-sm text-slate-900">
                      ฿{Number(item.approvedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {item.approvedByName || 'คณะกรรมการอนุมัติ'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenDisburseModal(item)}
                        className="zms-action px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 mx-auto"
                       aria-label="จ่ายเงินซะกาต" title="จ่ายเงินซะกาต">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>จ่ายเงินซะกาต</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disburse Action Modal */}
      {selectedApp && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
              <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-300" />
                  <h3 className="font-bold text-sm">เบิกจ่ายเงินซะกาตตามคำร้อง (Disbursement)</h3>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="zms-action p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmDisbursement} className="p-6 space-y-4 text-xs">
                {/* Beneficiary Summary Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{selectedApp.beneficiaryName}</span>
                      <p className="text-[10px] text-slate-500 font-mono">เลขบัตร ปชช: {selectedApp.nationalId}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-emerald-900 font-bold block">{selectedApp.applicationNo}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {selectedApp.status === 'wait_disbursement' ? 'รอเบิกจ่าย' : 'อนุมัติแล้ว'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400">หมวดหมู่อัสนัฟ:</span>
                      <p className="font-semibold text-emerald-950">{asnafNameMap[selectedApp.asnafCategory] || selectedApp.asnafCategory}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">ประเภทความช่วยเหลือ:</span>
                      <p className="font-semibold text-slate-800">{selectedApp.assistanceType}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">บัญชีผู้รับเงิน:</span>
                      <p className="font-mono font-bold text-slate-900">{selectedApp.bankName || 'ธ.ก.ส.'} ({selectedApp.bankAccountNo || '020-1-88990-2'})</p>
                    </div>
                    <div>
                      <span className="text-slate-400">ผู้อนุมัติคำร้อง:</span>
                      <p className="font-semibold text-slate-700">{selectedApp.approvedByName || 'คณะกรรมการพิจารณา'}</p>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ยอดเงินที่ต้องเบิกจ่าย (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={disburseAmount}
                    onChange={(e) => setDisburseAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    required
                  />
                </div>

                {/* Source Fund */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ตัดจ่ายจากบัญชีกองทุนซะกาต (Source Fund) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedFundId}
                    onChange={(e) => setSelectedFundId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                  >
                    {funds.filter(f => f.category === 'zakat').map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} - {f.name} (คงเหลือ: ฿{f.availableAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>

                  {/* Fund Solvency Check Indicator */}
                  {(() => {
                    const chosenFund = funds.find(f => f.id === selectedFundId);
                    const available = chosenFund ? chosenFund.availableAmount : 0;
                    const isSolvent = available >= disburseAmount;
                    return (
                      <div className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between mt-2 ${
                        isSolvent
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold">
                          {isSolvent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                          <span>ตรวจสอบสภาพคล่อง (Fund Solvency):</span>
                        </div>
                        <span className="font-mono font-bold">
                          {isSolvent
                            ? `✓ พร้อมจ่าย (คงเหลือ ฿${available.toLocaleString()})`
                            : `✕ ยอดเงินในกองทุนไม่เพียงพอ (ขาด ฿${(disburseAmount - available).toLocaleString()})`}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Disbursement Method */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    วิธีการจ่ายเงิน <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDisbursementMethod('bank_transfer')}
                      className={`py-2 px-2 rounded-lg border text-center font-bold transition-all ${
                        disbursementMethod === 'bank_transfer'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      โอนบัญชีธนาคาร
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisbursementMethod('promptpay')}
                      className={`py-2 px-2 rounded-lg border text-center font-bold transition-all ${
                        disbursementMethod === 'promptpay'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      PromptPay
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisbursementMethod('cash')}
                      className={`py-2 px-2 rounded-lg border text-center font-bold transition-all ${
                        disbursementMethod === 'cash'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      เงินสด (Cash)
                    </button>
                  </div>
                </div>

                {/* Bank Account Source */}
                {disbursementMethod !== 'cash' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      จ่ายออกจากบัญชีธนาคารมูลนิธิ
                    </label>
                    <select
                      value={selectedBankAccountId}
                      onChange={(e) => setSelectedBankAccountId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                    >
                      {bankAccounts.filter(b => b.status === 'active').map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountName} ({b.accountNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Payment Reference */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เลขอ้างอิงการทำธุรกรรม (Payment Reference / เช็ค / สลิป) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    required
                  />
                </div>

                {/* SoD Notice */}
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    การแบ่งแยกหน้าที่ (SoD): ผู้อนุมัติคำร้องจะไม่มีสิทธิ์เบิกจ่ายเงินด้วยตนเอง รายการนี้ทำโดย {currentUser.name} ({currentUser.role})
                  </span>
                </div>

                {/* Submit Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedApp(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="zms-action px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                   aria-label="กำลังประมวลผล..." title="กำลังประมวลผล...">
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังประมวลผล...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ยืนยันการจ่ายเงินซะกาต</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Voucher Modal */}
      {showVoucherModal && disbursementVoucher && (
        <DigitalReceiptModal
          transaction={disbursementVoucher}
          onClose={() => setShowVoucherModal(false)}
        />
      )}
    </div>
  );
}
