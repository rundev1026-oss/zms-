'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AssistanceApplication, BeneficiaryAssessment } from '@/types';
import { 
  FileCheck2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Home, 
  ClipboardCheck, 
  Check, 
  User, 
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { DocumentListTable } from '@/components/common/DocumentListTable';

interface AssessmentViewProps {
  onNavigate: (view: string) => void;
}

export function AssessmentView({ onNavigate }: AssessmentViewProps) {
  const { applications, funds, currentUser, submitAssessment, updateApplicationStatus, showToast } = useApp();

  // Find applications waiting for review or assessment
  const pendingApps = applications.filter(
    (a) => a.status === 'doc_review' || a.status === 'assessment' || a.status === 'submitted'
  );

  const [selectedApp, setSelectedApp] = useState<AssistanceApplication | null>(
    pendingApps.length > 0 ? pendingApps[0] : null
  );

  // Assessment form state
  const [livingScore, setLivingScore] = useState<number>(85);
  const [housingCondition, setHousingCondition] = useState<'poor' | 'dilapidated' | 'rented' | 'fair'>('poor');
  const [housingNotes, setHousingNotes] = useState('สภาพบ้านไม้ทรุดโทรม มีรอยรั่วซึม ไม่มีน้ำประปาใช้');
  const [debtSummary, setDebtSummary] = useState('หนี้ค่ายาและค่าใช้จ่ายจำเป็นร้านค้าชุมชน');
  const [primaryHardship, setPrimaryHardship] = useState('หัวหน้าครอบครัวป่วย ขาดรายได้ประจำ มีบุตรในวัยเรียน');
  const [officerRecommendation, setOfficerRecommendation] = useState<'recommend_full' | 'recommend_partial' | 'recommend_decline'>('recommend_full');
  const [recommendedAmount, setRecommendedAmount] = useState<number>(selectedApp ? selectedApp.requestedAmount : 15000);
  const [recommendedFundId, setRecommendedFundId] = useState<string>('fund-1');
  const [generalNotes, setGeneralNotes] = useState('ตรวจสอบคุณสมบัติตรงตามเกณฑ์อัสนาฟ 8 จำพวก สมควรได้รับการสงเคราะห์');

  const handleVerifyDoc = (docId: string, status: 'verified' | 'rejected') => {
    if (!selectedApp) return;
    const updatedDocs = (selectedApp.documents || []).map((d) =>
      d.id === docId ? { ...d, status } : d
    );
    setSelectedApp({ ...selectedApp, documents: updatedDocs });
    showToast(
      `ปรับสถานะเอกสารเป็น: ${status === 'verified' ? 'ผ่านการตรวจสอบแล้ว' : 'เอกสารไม่สมบูรณ์ / ไม่ผ่าน'}`,
      status === 'verified' ? 'success' : 'info'
    );
  };

  const handleRequestMoreInfo = () => {
    if (!selectedApp) return;
    updateApplicationStatus(selectedApp.id, 'need_info', 'เจ้าหน้าที่ขอเอกสารเพิ่มเติม: หนังสือรับรองรายได้และรูปถ่ายบ้านฉบับชัดเจน');
    setSelectedApp(null);
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    const assessmentData: BeneficiaryAssessment = {
      id: `ass-${Date.now()}`,
      assessedBy: currentUser.name,
      assessedDate: new Date().toLocaleDateString('th-TH'),
      housingCondition,
      housingNotes,
      livingScore,
      debtBurdenSummary: debtSummary,
      primaryHardship,
      officerRecommendation,
      recommendedAmount,
      recommendedFundId,
      generalNotes,
    };

    const success = await submitAssessment(selectedApp.id, assessmentData);
    if (success) {
      setSelectedApp(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              ตรวจเอกสารและประเมินคุณสมบัติ (Field Assessment)
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {pendingApps.length} รายการรอประเมิน
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            กระบวนการตรวจสอบเอกสารหลักฐาน บันทึกผลการลงพื้นที่จริง และจัดทำคะแนนความจำเป็น
          </p>
        </div>

        <button
          onClick={() => onNavigate('beneficiaries')}
          className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          กลับหน้ารายชื่อทั้งหมด
        </button>
      </div>

      {pendingApps.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">ไม่มีคำร้องค้างในขั้นตอนตรวจเอกสารและประเมิน</h2>
          <p className="text-xs text-slate-500">
            คำร้องทั้งหมดได้รับการตรวจสอบและส่งต่อเข้าสู่กระบวนการพิจารณาอนุมัติเรียบร้อยแล้ว
          </p>
          <button
            onClick={() => onNavigate('approvals')}
            className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800"
          >
            ไปยังหน้าพิจารณาอนุมัติคำร้อง →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Applications Queue */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              คิวคำร้องรอประเมิน ({pendingApps.length})
            </h2>

            <div className="space-y-2">
              {pendingApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setSelectedApp(app);
                    setRecommendedAmount(app.requestedAmount);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs ${
                    selectedApp?.id === app.id
                      ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-slate-800">{app.applicationNo}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      {app.status}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900">{app.fullName}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {app.community}, {app.province}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                    <span className="text-slate-500">ขอรับ: ฿{app.requestedAmount.toLocaleString()}</span>
                    <span className="font-semibold text-indigo-700">คลิกประเมิน →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right 2 Columns: Selected Application Assessment Workspace */}
          {selectedApp && (
            <div className="lg:col-span-2 space-y-6">
              {/* Applicant Overview Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedApp.fullName}
                    </h2>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {selectedApp.applicationNo} • ปชช: {selectedApp.nationalIdMasked}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    หมวดอัสนาฟ: {selectedApp.asnafCategory}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-[10px]">ที่อยู่/ชุมชน</span>
                    <span className="font-medium text-slate-800">{selectedApp.community}, {selectedApp.province}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-[10px]">เบอร์ติดต่อ</span>
                    <span className="font-medium text-slate-800">{selectedApp.phone}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-[10px]">วงเงินขอรับ</span>
                    <span className="font-bold text-slate-900 text-sm">฿{selectedApp.requestedAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Document Verification Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        รายการเอกสารหลักฐานประกอบ ({selectedApp.documents?.length || 0})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        เจ้าหน้าที่สามารถเปิดดูเอกสารจริง ขยายตรวจสอบรายละเอียด และดาวน์โหลดก่อนลงมติ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestMoreInfo}
                      className="text-xs text-orange-700 hover:text-orange-900 font-semibold self-start sm:self-auto cursor-pointer"
                    >
                      + ขอเอกสารเพิ่มเติมจากผู้ยื่น
                    </button>
                  </div>

                  <DocumentListTable
                    documents={selectedApp.documents || []}
                    readOnly={false}
                    showVerificationControls={true}
                    onVerify={handleVerifyDoc}
                  />
                </div>
              </div>

              {/* Assessment Form */}
              <form onSubmit={handleSaveAssessment} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                  แบบประเมินสภาพความเป็นอยู่และข้อเสนอแนะเจ้าหน้าที่
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Living Hardship Score Slider */}
                  <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800">
                        คะแนนความจำเป็นเร่งด่วน (Living Hardship Score: 0 - 100)
                      </label>
                      <span className="text-lg font-extrabold text-emerald-700 font-mono">
                        {livingScore} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={livingScore}
                      onChange={(e) => setLivingScore(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0: ไม่มีความจำเป็น</span>
                      <span>50: ปานกลาง</span>
                      <span>80+: ขัดสนวิกฤต/ฉุกเฉิน</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      สภาพที่อยู่อาศัยจากการลงพื้นที่จริง
                    </label>
                    <select
                      value={housingCondition}
                      onChange={(e) => setHousingCondition(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="dilapidated">บ้านทรุดโทรมมาก ผุพัง หลังคารั่ว</option>
                      <option value="poor">บ้านสภาพไม่ปลอดภัย แออัด</option>
                      <option value="rented">ห้องเช่าค้างชำระ</option>
                      <option value="fair">บ้านตนเองสภาพพออาศัยได้</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ข้อเสนอแนะของเจ้าหน้าที่ลงพื้นที่
                    </label>
                    <select
                      value={officerRecommendation}
                      onChange={(e) => setOfficerRecommendation(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-emerald-800"
                    >
                      <option value="recommend_full">เสนออนุมัติเต็มจำนวน (100%)</option>
                      <option value="recommend_partial">เสนออนุมัติบางส่วน</option>
                      <option value="recommend_decline">เสนอไม่อนุมัติ (ไม่เข้าเกณฑ์)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      วงเงินที่เจ้าหน้าที่เสนอพิจารณา (บาท)
                    </label>
                    <input
                      type="number"
                      required
                      value={recommendedAmount}
                      onChange={(e) => setRecommendedAmount(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      กองทุนที่เสนอเบิกจ่าย
                    </label>
                    <select
                      value={recommendedFundId}
                      onChange={(e) => setRecommendedFundId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {funds.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} (คงเหลือ: ฿{f.availableAmount.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      ความเห็นและสรุปสภาพปัญหาสำคัญ
                    </label>
                    <textarea
                      rows={3}
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm"
                  >
                    <Check className="w-4 h-4" /> บันทึกการประเมิน & เสนออนุมัติ (Forward to Approver)
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
