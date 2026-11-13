'use client';

import React from 'react';
import { FinancialTransaction } from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import { thaiBahtText } from '@/lib/thaiBahtText';
import {
  Receipt,
  Printer,
  Download,
  X,
  CheckCircle2,
  Building,
  ShieldCheck,
  Calendar,
  CreditCard,
  User,
  MapPin,
  QrCode
} from 'lucide-react';

interface DigitalReceiptModalProps {
  transaction: FinancialTransaction | null;
  onClose: () => void;
}

export function DigitalReceiptModal({ transaction, onClose }: DigitalReceiptModalProps) {
  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const receiptTitle = isIncome
    ? 'ใบสำคัญรับเงินบริจาค / ชำระซะกาต (Official Donation Receipt)'
    : 'ใบสำคัญจ่ายเงินสงเคราะห์ซะกาต (Zakat Disbursement Voucher)';

  const receiptNo = transaction.receiptUrl
    ? transaction.receiptUrl.replace('/receipts/', '').replace('.pdf', '')
    : `REC-2569-${transaction.id.slice(-6)}`;

  const handlePrint = () => {
    window.print();
  };

  const moneyTypeThMap: Record<string, string> = {
    zakat: 'เงินซะกาต (Zakat)',
    sadaqah: 'เงินศอดะเกาะฮ์ทั่วไป (General Sadaqah)',
    operational_admin: 'เงินบริจาคเพื่อการบริหาร (Administrative Fund)',
    specific_purpose: 'เงินบริจาคเฉพาะวัตถุประสงค์ (Specific Purpose)',
  };

  const paymentMethodThMap: Record<string, string> = {
    promptpay_qr: 'PromptPay Dynamic QR',
    bank_transfer: 'โอนเงินผ่านบัญชีธนาคาร',
    cash: 'เงินสด (Cash)',
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
        <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none animate-fadeIn">
          {/* Header Action Bar (Hidden when printing) */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-700" />
              <h2 className="font-bold text-slate-800 text-sm">
                เอกสารทางการเงินอิเล็กทรอนิกส์
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="zms-action px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                พิมพ์เอกสาร (Print)
              </button>
              <button
                onClick={onClose}
                className="zms-action p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Document Body */}
          <div className="p-8 print:p-4 text-slate-900 bg-white" id="printable-receipt">
            {/* Foundation Official Header */}
            <div className="border-b-2 border-emerald-800 pb-5 mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
                  ZMS
                </div>
                <div>
                  <h1 className="text-base font-extrabold text-emerald-950 tracking-tight leading-snug">
                    มูลนิธิบริหารจัดการซะกาตและสาธารณกุศลแห่งประเทศไทย
                  </h1>
                  <p className="text-xs text-slate-600">
                    Zakat Management System Foundation of Thailand
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    เลขประจำตัวผู้เสียภาษีอากร: 0-1255-69000-12-0 • สาขาสำนักงานใหญ่ กรุงเทพมหานคร
                  </p>
                </div>
              </div>

              <div className="text-right sm:border-l sm:pl-4 border-slate-200 text-xs">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 mb-1">
                  {transaction.status === 'completed' ? 'ชำระเงินเรียบร้อย (PAID)' : 'รอตรวจสอบ (PENDING)'}
                </span>
                <p className="font-semibold text-slate-900 text-xs">เลขที่: {receiptNo}</p>
                <p className="text-slate-500 text-[11px]">วันที่: {transaction.date}</p>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="text-center py-2 px-4 bg-emerald-50/80 rounded-xl border border-emerald-200/60 mb-6">
              <h2 className="font-bold text-sm text-emerald-900">{receiptTitle}</h2>
              <p className="text-[11px] text-slate-600">
                เลขที่อ้างอิงธุรกรรม: <span className="font-mono font-medium">{transaction.transactionNo}</span>
              </p>
            </div>

            {/* Donor / Recipient Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-6 text-xs">
              <div>
                <p className="text-slate-500 text-[11px] font-medium">
                  {isIncome ? 'ได้รับเงินจาก (Received From):' : 'จ่ายให้แก่ผู้มีสิทธิ์รับซะกาต (Paid To):'}
                </p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {transaction.isAnonymous ? 'ผู้บริจาคไม่ประสงค์ออกนาม' : transaction.payerOrPayee}
                </p>
                {transaction.donorTaxId && (
                  <p className="text-slate-600 mt-1">
                    เลขประจำตัวผู้เสียภาษี: <span className="font-mono font-medium">{transaction.donorTaxId}</span>
                  </p>
                )}
                {transaction.donorPhone && (
                  <p className="text-slate-600">เบอร์โทรศัพท์: {transaction.donorPhone}</p>
                )}
                {transaction.donorEmail && (
                  <p className="text-slate-600">อีเมล: {transaction.donorEmail}</p>
                )}
                {transaction.receiptAddress && (
                  <p className="text-slate-600 mt-1">ที่อยู่: {transaction.receiptAddress}</p>
                )}
              </div>

              <div className="sm:border-l sm:pl-4 border-slate-200">
                <p className="text-slate-500 text-[11px] font-medium">เข้าบัญชีกองทุน (Fund / Purpose):</p>
                <p className="font-semibold text-slate-900 mt-0.5">{transaction.fundName}</p>
                <p className="text-slate-600 mt-1">
                  หมวดหมู่: <span className="font-medium">{transaction.category}</span>
                </p>
                <p className="text-slate-600">
                  ประเภทเงิน: <span className="font-medium text-emerald-800">{moneyTypeThMap[transaction.moneyType || 'zakat']}</span>
                </p>
                <p className="text-slate-600">
                  ช่องทางชำระ: <span className="font-medium">{paymentMethodThMap[transaction.paymentMethod] || transaction.paymentMethod}</span>
                </p>
                {transaction.referenceNo && (
                  <p className="text-slate-600 font-mono text-[11px]">
                    เลขอ้างอิง: {transaction.referenceNo}
                  </p>
                )}
              </div>
            </div>

            {/* Amount Table */}
            <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden mb-6">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 text-left w-12 font-semibold">ลำดับ</th>
                  <th className="py-2 px-3 text-left font-semibold">รายการ (Description)</th>
                  <th className="py-2 px-3 text-right font-semibold">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-3 text-center text-slate-500">1</td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">{transaction.category}</p>
                    <p className="text-[11px] text-slate-500">
                      {transaction.notes || 'การรับเงินตามวัตถุประสงค์เพื่อการสงเคราะห์ตามหลักการชะรีอะฮ์'}
                    </p>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-sm text-slate-900">
                    ฿{Number(transaction.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-emerald-50/70 border-t-2 border-emerald-800">
                <tr>
                  <td colSpan={2} className="py-2.5 px-3 font-semibold text-slate-800">
                    จำนวนเงินตัวอักษร: <span className="font-bold text-emerald-900">{thaiBahtText(Number(transaction.amount))}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-base text-emerald-950">
                    ฿{Number(transaction.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Verification & Signatures */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-xs">
              {/* QR Verification Seal */}
              <div className="flex items-center gap-2.5">
                <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center p-1.5 shrink-0">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-700">Digital Seal</p>
                  <p className="text-[9px] text-slate-500 leading-tight">
                    สแกนเพื่อตรวจสอบความถูกต้องของเอกสารผ่านระบบ ZMS Central Verification
                  </p>
                </div>
              </div>

              {/* Staff Signature */}
              <div className="text-center">
                <div className="h-10 border-b border-dashed border-slate-400 flex items-center justify-center">
                  <span className="font-serif italic text-emerald-800 text-sm">
                    {transaction.recordedBy || 'เจ้าหน้าที่การเงิน'}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-800 mt-1">
                  ({transaction.recordedBy || 'เจ้าหน้าที่รับเงิน'})
                </p>
                <p className="text-[10px] text-slate-500">เจ้าหน้าที่ผู้รับรายการ / เจ้าหน้าที่การเงิน</p>
              </div>

              {/* Authorized Treasurer Signature */}
              <div className="text-center">
                <div className="h-10 border-b border-dashed border-slate-400 flex items-center justify-center">
                  <span className="font-serif italic text-slate-800 text-sm font-semibold">
                    นายรุสลัน หะสาเมาะ
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-800 mt-1">
                  (นายรุสลัน หะสาเมาะ)
                </p>
                <p className="text-[10px] text-slate-500">เหรัญญิกมูลนิธิ / ผู้มีอำนาจลงนาม</p>
              </div>
            </div>

            {/* Legal & Shariah Footnote */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center space-y-1.5">
              <p className="text-[10px] text-slate-500 font-medium">
                เอกสารนี้ออกโดยระบบอัตโนมัติของมูลนิธิ ZMS ได้รับการรับรองตามมาตรฐานการบัญชีและข้อกำหนดชะรีอะฮ์ • 
                เงินบริจาคประเภทซะกาตได้รับการจัดสรรเข้าสู่กองทุนผู้มีสิทธิ์ 8 อัสนัฟโดยเคร่งครัด
              </p>
              <div className="p-2.5 bg-amber-50/80 rounded-lg border border-amber-200 text-[10px] text-amber-900 leading-relaxed font-normal">
                <span className="font-bold">ข้อควรทราบและคำชี้แจงทางกฎหมาย:</span> เอกสารนี้เป็นใบเสร็จรับเงินบริจาคภายในของมูลนิธิเพื่อเป็นหลักฐานการรับเงินตามระเบียบการเงิน 
                <span className="font-semibold text-amber-950"> มิใช่เอกสาร e-Donation หรือใบเสร็จลดหย่อนภาษีที่เชื่อมต่อระบบบริจาคอิเล็กทรอนิกส์ของกรมสรรพากร</span> (เนื่องจากมูลนิธิอยู่ระหว่างกระบวนการจัดทำข้อตกลงและเชื่อมต่อระบบ e-Donation กับกรมสรรพากรอย่างเป็นทางการ)
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

