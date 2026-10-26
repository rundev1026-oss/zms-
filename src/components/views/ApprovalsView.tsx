'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AssistanceApplication } from '@/types';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Wallet, 
  AlertCircle, 
  Check, 
  User, 
  FileText, 
  ShieldCheck,
  Building,
  Clock
} from 'lucide-react';
import { DocumentListTable } from '@/components/common/DocumentListTable';
import { ModalPortal } from '@/components/common/Modal';

interface ApprovalsViewProps {
  onNavigate: (view: string) => void;
}

export function ApprovalsView({ onNavigate }: ApprovalsViewProps) {
  const { applications, funds, currentUser, approveApplication, rejectApplication, returnApplication, showToast } = useApp();

  const pendingApprovals = applications.filter((a) => a.status === 'pending_approval');
  const [selectedApp, setSelectedApp] = useState<AssistanceApplication | null>(
    pendingApprovals.length > 0 ? pendingApprovals[0] : null
  );

  // Approval decision state
  const [approvalAmount, setApprovalAmount] = useState<number>(
    selectedApp ? selectedApp.assessment?.recommendedAmount || selectedApp.requestedAmount : 15000
  );
  const [selectedFundId, setSelectedFundId] = useState<string>(
    selectedApp?.assessment?.recommendedFundId || 'fund-1'
  );
  const [decisionNotes, setDecisionNotes] = useState('เห็นชอบตามผลการประเมินสภาพความเป็นอยู่ของเจ้าหน้าที่ ให้ความช่วยเหลือตามวงเงิน');

  // Modal for confirmation
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedFund = funds.find((f) => f.id === selectedFundId) || funds[0];
  const isFundSufficient = selectedFund ? selectedFund.availableAmount >= approvalAmount : false;

  const handleExecuteApproval = async () => {
    if (!selectedApp || isSubmitting) return;

    if (!isFundSufficient) {
      showToast(`ยอดเงินจัดสรรได้ในกองทุน ${selectedFund.name} ไม่เพียงพอ! (คงเหลือ: ฿${selectedFund.availableAmount.toLocaleString()})`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await approveApplication(selectedApp.id, approvalAmount, selectedFundId, decisionNotes);
      if (success) {
        setConfirmAction(null);
        setSelectedApp(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteReject = async () => {
    if (!selectedApp || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await rejectApplication(selectedApp.id, decisionNotes);
      if (success) {
        setConfirmAction(null);
        setSelectedApp(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteReturn = async () => {
    if (!selectedApp || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await returnApplication(selectedApp.id, decisionNotes);
      if (success) {
        setConfirmAction(null);
        setSelectedApp(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              พิจารณาอนุมัติคำร้องขอรับซะกาต (Approver Workbench)
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
              {pendingApprovals.length} คำร้องรอการพิจารณา
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            คณะกรรมการพิจารณาตามหลักการชะรีอะฮ์ ตรวจสอบงบประมาณกองทุน และอนุมัติวงเงินช่วยเหลือ
          </p>
        </div>

        <button
          onClick={() => onNavigate('disbursements')}
          className="text-xs text-teal-700 hover:text-teal-900 font-semibold px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50"
        >
          ดูรายการรอจ่ายเงิน ({applications.filter((a) => a.status === 'wait_disbursement').length}) →
        </button>
      </div>

      {pendingApprovals.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">ไม่มีคำร้องที่รอการอนุมัติในขณะนี้</h2>
          <p className="text-xs text-slate-500">
            คำร้องทั้งหมดได้รับการพิจารณาครบถ้วนแล้ว คุณสามารถดูรายการที่ส่งไปฝ่ายการเงินเพื่อรอเบิกจ่าย
          </p>
          <button
            onClick={() => onNavigate('beneficiaries')}
            className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800"
          >
            ดูทะเบียนคำร้องทั้งหมด →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Applications Queue */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              คิวรออนุมัติ ({pendingApprovals.length})
            </h2>

            <div className="space-y-2">
              {pendingApprovals.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setSelectedApp(app);
                    setApprovalAmount(app.assessment?.recommendedAmount || app.requestedAmount);
                    if (app.assessment?.recommendedFundId) setSelectedFundId(app.assessment.recommendedFundId);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs ${
                    selectedApp?.id === app.id
                      ? 'bg-purple-50/80 border-purple-300 ring-1 ring-purple-200'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-slate-800">{app.applicationNo}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {app.urgencyLevel === 'urgent' ? 'เร่งด่วนฉุกเฉิน' : 'รอบปกติ'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900">{app.fullName}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    คะแนนประเมิน: <span className="font-bold text-emerald-700">{app.assessment?.livingScore || '-'} / 100</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                    <span className="text-slate-500">เสนอ: ฿{(app.assessment?.recommendedAmount || app.requestedAmount).toLocaleString()}</span>
                    <span className="font-semibold text-purple-700">พิจารณา →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right 2 Columns: Application Review & Decision Workspace */}
          {selectedApp && (
            <div className="lg:col-span-2 space-y-6">
              {/* Applicant Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedApp.fullName}
                    </h2>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {selectedApp.applicationNo} • พื้นที่: {selectedApp.community}, {selectedApp.province}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">หมวดหมู่อัสนาฟ</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {selectedApp.asnafCategory === 'miskin' ? 'มิสเกน (ผู้ขัดสน)' :
                       selectedApp.asnafCategory === 'faqir' ? 'ฟะกีร (ผู้ยากไร้)' :
                       selectedApp.asnafCategory === 'gharimin' ? 'ฆอริมูน (มีหนี้สิน)' : 'ฟีสะบีลิลลาฮ์'}
                    </span>
                  </div>
                </div>

                {/* Score & Field Assessment Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">คะแนนความจำเป็น</span>
                    <span className="text-xl font-extrabold text-emerald-700">
                      {selectedApp.assessment?.livingScore || '-'} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">วงเงินเสนอขอ</span>
                    <span className="text-xl font-extrabold text-slate-800">
                      ฿{selectedApp.requestedAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">จนท. ผู้ลงพื้นที่</span>
                    <span className="font-semibold text-slate-800 block mt-1">
                      {selectedApp.assignedOfficerName}
                    </span>
                  </div>
                </div>

                {/* Living Hardship Notes */}
                {selectedApp.assessment && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> บันทึกสภาพความเดือดร้อนจริงจากการลงพื้นที่:
                    </div>
                    <div className="text-amber-800">{selectedApp.assessment.generalNotes}</div>
                    <div className="text-[11px] text-amber-700 mt-1">
                      สภาพบ้าน: {selectedApp.assessment.housingNotes} | ภาระหนี้สิน: {selectedApp.assessment.debtBurdenSummary}
                    </div>
                  </div>
                )}
              </div>

              {/* Applicant Documents Inspection for Approvers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    เอกสารหลักฐานประกอบคำขอ ({selectedApp.documents?.length || 0} รายการ)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    คณะกรรมการสามารถเปิดดูเอกสารต้นฉบับและดาวน์โหลดตรวจสอบก่อนลงมติ
                  </span>
                </div>

                <DocumentListTable
                  documents={selectedApp.documents || []}
                  readOnly={true}
                />
              </div>

              {/* Fund Budget Verification Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-700" />
                    ตรวจสอบความพร้อมของบัญชีกองทุน (Fund Solvency Verification)
                  </h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isFundSufficient ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isFundSufficient ? '✓ งบประมาณเพียงพอ' : '✕ ยอดเงินในกองทุนไม่เพียงพอ'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      เลือกบัญชีกองทุนสำหรับตัดยอด <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedFundId}
                      onChange={(e) => setSelectedFundId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      {funds.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} (คงเหลือ: ฿{f.availableAmount.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      วงเงินอนุมัติจ่ายจริง (บาท) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={approvalAmount}
                      onChange={(e) => setApprovalAmount(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-800 text-sm"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>ยอดคงเหลือจัดสรรได้ในกองทุน: <strong className="text-slate-800">฿{selectedFund.availableAmount.toLocaleString()}</strong></span>
                  <span>หลังอนุมัติจะคงเหลือ: <strong className="text-emerald-700">฿{(selectedFund.availableAmount - approvalAmount).toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Decision Action Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  มติการพิจารณาของคณะกรรมการ (Decision & Notes)
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เหตุผลประกอบการพิจารณา / ข้อกำหนดเพิ่มเติม
                  </label>
                  <textarea
                    rows={3}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setConfirmAction('return')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                  >
                    <RotateCcw className="w-4 h-4" /> ส่งกลับแก้ไข
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmAction('reject')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                  >
                    <XCircle className="w-4 h-4" /> ไม่อนุมัติ
                  </button>

                  <button
                    type="button"
                    disabled={!isFundSufficient}
                    onClick={() => setConfirmAction('approve')}
                    className={`flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold text-white shadow-xs ${
                      isFundSufficient
                        ? 'bg-emerald-700 hover:bg-emerald-800'
                        : 'bg-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" /> อนุมัติคำร้อง (Approve)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmAction && selectedApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirmAction(null);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                confirmAction === 'approve' ? 'bg-emerald-100 text-emerald-800' :
                confirmAction === 'reject' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {confirmAction === 'approve' ? '✓' : confirmAction === 'reject' ? '✕' : '↺'}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmAction === 'approve' ? 'ยืนยันการอนุมัติคำร้อง' :
                   confirmAction === 'reject' ? 'ยืนยันการปฏิเสธคำร้อง' : 'ส่งกลับให้เจ้าหน้าที่แก้ไข'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedApp.fullName} ({selectedApp.applicationNo})
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 space-y-1">
              {confirmAction === 'approve' ? (
                <>
                  <div>วงเงินอนุมัติ: <strong className="text-emerald-700">฿{approvalAmount.toLocaleString()}</strong></div>
                  <div>ตัดจากกองทุน: <strong>{selectedFund.name}</strong></div>
                  <div className="text-[11px] text-slate-500">
                    * สถานะจะเปลี่ยนเป็น "รอจ่ายเงิน" (wait_disbursement) และกันยอดผูกพันทันที
                  </div>
                </>
              ) : (
                <div>เหตุผล: {decisionNotes}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={
                  confirmAction === 'approve' ? handleExecuteApproval :
                  confirmAction === 'reject' ? handleExecuteReject : handleExecuteReturn
                }
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-400 ${
                  confirmAction === 'approve' ? 'bg-emerald-700 hover:bg-emerald-800' :
                  confirmAction === 'reject' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการทำรายการ'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}
    </div>
  );
}
