'use client';

import React, { useState, useEffect } from 'react';
import { BankAccount, FinancialTransaction } from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import {
  QrCode,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Copy,
  Download,
  Receipt,
  ShieldCheck,
  ExternalLink,
  Ban,
  Code2,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface DonationPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceNo: string;
  transactionNo: string;
  amount: number;
  fundName: string;
  moneyType: string;
  donorName: string;
  bankAccount: BankAccount;
  paymentMethod: 'promptpay_qr' | 'bank_transfer' | 'cash';
  gatewayStatus?: any;
  onPaymentVerified: (txn: any) => void;
  onCancel: () => void;
  onViewReceipt: () => void;
}

export function DonationPaymentModal({
  isOpen,
  onClose,
  referenceNo,
  transactionNo,
  amount,
  fundName,
  moneyType,
  donorName,
  bankAccount,
  paymentMethod,
  gatewayStatus,
  onPaymentVerified,
  onCancel,
  onViewReceipt,
}: DonationPaymentModalProps) {
  // 15 Minutes Countdown Timer (900 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'paid' | 'expired'>('pending');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('กำลังรอการสแกนชำระเงินผ่าน Mobile Banking');

  // Dynamic QR Code State
  const [qrData, setQrData] = useState<{
    payload: string;
    crc: string;
    dataUrl: string;
    formattedTarget: string;
    promptpayType: string;
  } | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);
  const [qrError, setQrError] = useState<string | null>(null);
  const [showTlvBreakdown, setShowTlvBreakdown] = useState<boolean>(false);

  // Load Real EMVCo Dynamic QR
  useEffect(() => {
    async function loadDynamicQr() {
      if (!isOpen) return;
      setIsGeneratingQr(true);
      setQrError(null);

      try {
        const res = await fetch('/api/donations/qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dynamic',
            amount,
            referenceNo,
            bankAccountId: bankAccount?.id || 'bank-1',
            moneyType,
            terminalLabel: 'ZMS ZAKAT',
          }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          setQrData({
            payload: json.data.payload,
            crc: json.data.crc,
            dataUrl: json.data.dataUrl,
            formattedTarget: json.data.formattedTarget,
            promptpayType: json.data.promptpayType,
          });
        } else {
          setQrError(json.error || 'ไม่สามารถสร้าง Dynamic QR Code ได้');
        }
      } catch (err: any) {
        setQrError(err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์สร้าง QR Code ได้');
      } finally {
        setIsGeneratingQr(false);
      }
    }

    loadDynamicQr();
  }, [isOpen, amount, referenceNo, bankAccount?.id, moneyType]);

  // Countdown effect
  useEffect(() => {
    if (!isOpen || paymentStatus === 'paid') return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPaymentStatus('expired');
          setStatusMessage('หมดเวลาการทำรายการ (15 นาที) กรุณาสร้างรายการใหม่');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentStatus]);

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Check payment status API call
  const handleCheckStatus = async () => {
    setPaymentStatus('checking');
    setStatusMessage('กำลังตรวจสอบสถานะกับระบบการเงินและ Gateway...');

    try {
      const res = await fetch(`/api/donations?ref=${referenceNo}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const found = json.data.find((t: any) => t.referenceNo === referenceNo || t.reference_no === referenceNo);
        if (found && (found.status === 'completed' || found.status === 'PAID')) {
          setPaymentStatus('paid');
          setStatusMessage('ชำระเงินสำเร็จเรียบร้อยแล้ว ยอดเงินเข้าสู่กองทุนตามหลักการชะรีอะฮ์');
          onPaymentVerified(found);
          return;
        }
      }

      // If still pending
      setTimeout(() => {
        setPaymentStatus('pending');
        setStatusMessage('ยังไม่พบยอดเงินเข้า กรุณาสแกนจ่ายแล้วรอสักครู่ หรือแนบสลิปเพื่อยืนยัน');
      }, 1000);
    } catch {
      setPaymentStatus('pending');
      setStatusMessage('ไม่สามารถเชื่อมต่อระบบตรวจสอบได้ในขณะนี้');
    }
  };

  const isGatewayConnected = gatewayStatus?.isConnected === true;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">หน้าชำระเงินบริจาค (Thai QR Payment)</h3>
                <p className="text-[11px] text-emerald-200/80 font-mono">
                  Ref: {referenceNo}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {/* Amount & Timer Header Banner */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">ยอดเงินที่ต้องชำระ:</span>
                <p className="font-mono font-extrabold text-2xl text-emerald-900">
                  ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Countdown Timer */}
              {paymentStatus !== 'paid' && (
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 justify-end">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>เวลาหมดอายุ</span>
                  </div>
                  <p className={`font-mono font-bold text-base ${secondsRemaining < 180 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                    {formatTimer(secondsRemaining)}
                  </p>
                </div>
              )}

              {paymentStatus === 'paid' && (
                <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ชำระสำเร็จแล้ว</span>
                </div>
              )}
            </div>

            {/* QR Code Presentation Box */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center space-y-3">
              {paymentStatus !== 'paid' ? (
                <>
                  <div className="w-64 mx-auto bg-slate-50 rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center justify-center relative shadow-inner">
                    {/* PromptPay Official Header */}
                    <div className="w-full text-center pb-2.5 border-b border-slate-200 flex items-center justify-center gap-2">
                      <span className="font-black text-sm text-sky-950 tracking-wider">THAI QR</span>
                      <span className="px-2 py-0.5 rounded bg-sky-900 text-white font-bold text-[10px]">PROMPTPAY</span>
                    </div>

                    {/* QR Rendering */}
                    <div className="my-auto py-3">
                      {isGeneratingQr ? (
                        <div className="w-40 h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
                          <span className="text-[11px]">กำลังสร้าง Thai QR...</span>
                        </div>
                      ) : qrError ? (
                        <div className="w-40 h-40 flex flex-col items-center justify-center p-2 text-rose-600 gap-1.5">
                          <AlertTriangle className="w-6 h-6" />
                          <p className="text-[10px] text-center leading-tight">{qrError}</p>
                        </div>
                      ) : qrData?.dataUrl ? (
                        <img
                          src={qrData.dataUrl}
                          alt="Real EMVCo Thai QR Code"
                          className="w-44 h-44 mx-auto rounded-lg shadow-xs"
                        />
                      ) : null}
                    </div>

                    {/* Bottom Verification Indicator */}
                    <div className="w-full text-center pt-2 border-t border-slate-200 space-y-1">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono font-bold text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>EMVCo MPM Verified (CRC: {qrData?.crc || '----'})</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Ref: {referenceNo}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    เปิดแอป Mobile Banking ทุกธนาคาร เพื่อสแกน QR ชำระเงินได้ทันที
                  </p>

                  {/* Copy Payload & EMVCo Inspector Controls */}
                  {qrData && (
                    <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(qrData.payload, 'payload')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] flex items-center gap-1 transition-colors"
                          title="คัดลอก Payload สตริงตามมาตรฐาน EMVCo"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedText === 'payload' ? 'คัดลอก Payload แล้ว ✓' : 'คัดลอก EMVCo Payload'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowTlvBreakdown(!showTlvBreakdown)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium flex items-center gap-1 transition-colors"
                        >
                          <Code2 className="w-3 h-3" />
                          <span>{showTlvBreakdown ? 'ซ่อนโครงสร้าง TLV' : 'ดูโครงสร้าง EMVCo'}</span>
                          {showTlvBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* TLV Inspector Box */}
                      {showTlvBreakdown && (
                        <div className="w-full text-left p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] space-y-1.5 animate-fadeIn">
                          <div className="text-emerald-400 font-bold border-b border-slate-800 pb-1 flex items-center justify-between">
                            <span>โครงสร้างข้อมูล EMVCo Tag-Length-Value:</span>
                            <span>CRC16: {qrData.crc}</span>
                          </div>
                          <p><span className="text-sky-300">00 (Format):</span> 01</p>
                          <p><span className="text-sky-300">01 (Method):</span> 12 (Dynamic QR)</p>
                          <p><span className="text-sky-300">29 (Merchant):</span> AID A000000677010111 | Target: {qrData.formattedTarget}</p>
                          <p><span className="text-sky-300">53 (Currency):</span> 764 (THB)</p>
                          <p><span className="text-sky-300">54 (Amount):</span> ฿{amount.toFixed(2)}</p>
                          <p><span className="text-sky-300">58 (Country):</span> TH</p>
                          <p><span className="text-sky-300">62 (Reference):</span> {referenceNo}</p>
                          <p><span className="text-sky-300">63 (CRC):</span> {qrData.crc}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-6 space-y-2 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">การชำระเงินเสร็จสมบูรณ์</h4>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto">
                    มูลนิธิได้รับเงินบริจาคจำนวน ฿{amount.toLocaleString()} เรียบร้อยแล้ว ขออัลลอฮ์ทรงตอบแทนความดีของท่าน
                  </p>
                </div>
              )}
            </div>

            {/* Crucial Banking Notice */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <span className="font-bold">เงื่อนไขการเงิน:</span> การสร้าง QR Code เป็นเพียงช่องทางการรับชำระเงิน ระบบจะยังไม่เปลี่ยนสถานะเป็น <span className="font-bold underline">&quot;ชำระแล้ว (PAID)&quot;</span> จนกว่าจะได้รับสัญญาณยืนยันการโอนเงินจริงจากธนาคาร
              </p>
            </div>

            {/* Receiving Bank Details */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">ชื่อบัญชีปลายทาง:</span>
                <span className="font-bold text-slate-900">{bankAccount?.accountName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">ธนาคาร:</span>
                <span className="font-semibold text-slate-800">{bankAccount?.bankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">เลขที่บัญชี:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 text-xs">{bankAccount?.accountNumber}</span>
                  <button
                    onClick={() => handleCopy(bankAccount?.accountNumber || '', 'acc')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                    title="คัดลอกเลขบัญชี"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {copiedText === 'acc' && <span className="text-[10px] text-emerald-600 font-bold">คัดลอกแล้ว</span>}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">PromptPay ปลายทาง:</span>
                <span className="font-mono font-bold text-emerald-900">{qrData?.formattedTarget || bankAccount?.promptpayId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">กองทุนเป้าหมาย:</span>
                <span className="font-medium text-emerald-900">{fundName} ({moneyType === 'zakat' ? 'ซะกาต' : 'ศอดะเกาะฮ์'})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">ผู้บริจาค:</span>
                <span className="font-medium text-slate-800">{donorName}</span>
              </div>
            </div>

            {/* Status Message */}
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              paymentStatus === 'paid'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : paymentStatus === 'expired'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-sky-50 border-sky-200 text-sky-800'
            }`}>
              {paymentStatus === 'checking' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
              ) : paymentStatus === 'paid' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : paymentStatus === 'expired' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-sky-600 shrink-0" />
              )}
              <span className="text-[11px]">{statusMessage}</span>
            </div>
          </div>

          {/* Modal Footer (Action Buttons) */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>ยกเลิกรายการ</span>
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              {paymentStatus !== 'paid' ? (
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={paymentStatus === 'checking' || paymentStatus === 'expired'}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${paymentStatus === 'checking' ? 'animate-spin' : ''}`} />
                  <span>ตรวจสอบสถานะชำระเงิน</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onViewReceipt}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>ดูใบเสร็จรับเงิน</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

