'use client';

import React from 'react';
import { formatPersonName } from '@zms/shared';
import { X, Printer, Download, CheckCircle, FileText, Image as ImageIcon, ExternalLink, ShieldCheck } from 'lucide-react';
import { AssistanceApplication } from '@/types';
import { ModalPortal } from '@/components/common/Modal';

interface ReceiptPreviewModalProps {
  application: AssistanceApplication | null;
  isOpen: boolean;
  onClose: () => void;
  beneficiaryName?: string;
  registrationNo?: string;
}

export function ReceiptPreviewModal({
  application: app,
  isOpen,
  onClose,
  beneficiaryName,
  registrationNo,
}: ReceiptPreviewModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !app) return null;

  const handlePrint = () => {
    window.print();
  };

  const amount = app.disbursedAmount || app.approvedAmount || app.requestedAmount || 0;
  const formattedAmount = `฿${amount.toLocaleString()}`;
  const disbursedDateText = app.disbursementDate
    ? new Date(app.disbursementDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : app.appliedDate || '-';

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-[1020] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          role="dialog"
          aria-modal="true"
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
        >
        {/* Modal Header */}
        <div className="p-4 bg-[#0b2545] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-sm">ใบสำคัญจ่ายและหลักฐานการช่วยเหลือ</h3>
              <p className="text-[11px] text-slate-300 font-mono">เลขที่รายการ: {app.applicationNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>พิมพ์</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Printable Receipt & Evidence Document */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs text-slate-800">
          {/* Printable Document Box */}
          <div className="p-6 border-2 border-slate-300 rounded-2xl bg-white shadow-xs space-y-4 print:border-none print:p-0">
            {/* Header / Foundation Info */}
            <div className="text-center border-b border-slate-200 pb-3">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">มูลนิธิซะกาตและสาธารณกุศล</span>
              <h2 className="text-base font-extrabold text-slate-900 mt-0.5">ใบสำคัญจ่ายเงินช่วยเหลือ / ใบรับมอบความช่วยเหลือ</h2>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                เลขที่เอกสาร: <strong className="text-slate-900 font-bold">{app.applicationNo}</strong> • วันที่ดำเนินการ: {disbursedDateText}
              </p>
            </div>

            {/* Recipient Details */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">ผู้รับความช่วยเหลือ:</span>
                <strong className="text-slate-900 block font-bold">{beneficiaryName || formatPersonName(app)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">รหัสทะเบียนผู้มีสิทธิ์:</span>
                <span className="font-mono text-slate-900 font-bold block">{registrationNo || app.registrationNo || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">เลขประจำตัวประชาชน:</span>
                <span className="font-mono text-slate-900 block">{app.nationalIdMasked || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">เบอร์โทรศัพท์:</span>
                <span className="text-slate-900 block">{app.phone || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px]">ที่อยู่:</span>
                <span className="text-slate-900 block">{app.address} {app.district} {app.province}</span>
              </div>
            </div>

            {/* Assistance Item Details */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                    <th className="py-2.5 px-3">รายการความช่วยเหลือ</th>
                    <th className="py-2.5 px-3">รายละเอียดความจำเป็น</th>
                    <th className="py-2.5 px-3 text-right">จำนวนเงิน / มูลค่า</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="divide-y divide-slate-100">
                    <td className="py-3 px-3">
                      <strong className="text-slate-900 block font-bold">
                        {app.assistanceType === 'cash' ? 'เงินสงเคราะห์เพื่อการยังชีพ' :
                         app.assistanceType === 'medical' ? 'ค่ารักษาพยาบาลและเวชภัณฑ์' :
                         app.assistanceType === 'education' ? 'ทุนการศึกษาบุตร' :
                         app.assistanceType === 'housing' ? 'ซ่อมแซมที่อยู่อาศัย' :
                         app.assistanceType === 'emergency_relief' ? 'บรรเทาทุกข์ฉุกเฉิน' :
                         app.assistanceType === 'debt_relief' ? 'ปลดเปลื้องหนี้สินจำเป็น' :
                         app.assistanceType === 'in_kind' ? 'เครื่องอุปโภคบริโภค / สิ่งของ' :
                         app.assistanceType || 'ความช่วยเหลือทั่วไป'}
                      </strong>
                      {app.assistanceTypeDetails && (
                        <span className="text-[11px] text-slate-600 block mt-0.5">{app.assistanceTypeDetails}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {app.necessityDetails || app.assistanceTypeDetails || 'ตามการประเมินคุณสมบัติผู้มีสิทธิ์รับซะกาต'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-sm text-emerald-800">
                      {formattedAmount}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50/70 border-t border-emerald-200 font-bold text-emerald-900">
                    <td colSpan={2} className="py-2.5 px-3 text-right">ยอดเงินช่วยเหลือสุทธิ:</td>
                    <td className="py-2.5 px-3 text-right font-mono text-base">{formattedAmount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Officer & Approval Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">ผู้อนุมัติ:</span>
                <strong className="text-slate-900 block">{app.approvedBy || 'คณะกรรมการพิจารณาซะกาต'}</strong>
                <span className="text-[10px] text-slate-500">
                  {app.approvedDate ? `อนุมัติเมื่อ: ${new Date(app.approvedDate).toLocaleDateString('th-TH')}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ผู้ดำเนินการจ่าย / ส่งมอบ:</span>
                <strong className="text-slate-900 block">{app.disbursedBy || app.assignedOfficerName || 'เจ้าหน้าที่การเงินมูลนิธิ'}</strong>
                <span className="text-[10px] text-slate-500">
                  {app.disbursementRef ? `เลขอ้างอิง: ${app.disbursementRef}` : ''}
                </span>
              </div>
            </div>

            {/* Evidence & Photo preview if available */}
            {app.disbursementProofUrl && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>หลักฐานการโอนเงิน / ภาพถ่ายส่งมอบความช่วยเหลือ:</span>
                </span>
                <div className="flex items-center gap-3">
                  <img
                    src={app.disbursementProofUrl}
                    alt="หลักฐานการจ่ายเงิน"
                    className="max-h-48 max-w-full rounded-lg border border-slate-300 object-contain bg-white"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <a
                    href={app.disbursementProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>เปิดภาพขนาดเต็ม</span>
                  </a>
                </div>
              </div>
            )}

            {/* Signature blocks */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-[10px] text-slate-600">
              <div className="space-y-4">
                <div className="h-10 border-b border-dashed border-slate-300" />
                <p>ลงชื่อ ผู้รับมอบความช่วยเหลือ<br />( {beneficiaryName || formatPersonName(app)} )</p>
              </div>
              <div className="space-y-4">
                <div className="h-10 border-b border-dashed border-slate-300" />
                <p>ลงชื่อ เจ้าหน้าที่ผู้จ่ายเงิน/ส่งมอบ<br />( {app.disbursedBy || app.assignedOfficerName || 'เจ้าหน้าที่มูลนิธิ'} )</p>
              </div>
              <div className="space-y-4">
                <div className="h-10 border-b border-dashed border-slate-300" />
                <p>ลงชื่อ ผู้อนุมัติจ่าย<br />( {app.approvedBy || 'ประธานคณะกรรมการ'} )</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>เอกสารนี้ถูกบันทึกและตรวจสอบตามระบบการเงินของมูลนิธิซะกาตฯ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
  );
}
