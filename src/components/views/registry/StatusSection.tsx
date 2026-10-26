'use client';

import React, { useState } from 'react';
import { 
  CheckSquare, 
  Clock, 
  History, 
  ShieldCheck, 
  FileCheck2, 
  Save, 
  User, 
  Calendar, 
  Check, 
  Square,
  AlertCircle,
  FileText
} from 'lucide-react';
import { 
  BeneficiaryRegistryItem, 
  RegistrationStatus, 
  EvaluatorChecklist,
  RegistryEditHistoryItem 
} from '@/types';

interface StatusSectionProps {
  registry: BeneficiaryRegistryItem;
  statusLabels: Record<RegistrationStatus, { label: string; color: string; bg: string; border: string }>;
  canEdit: boolean;
  onOpenStatusDialog: () => void;
  onOpenHistoryModal: () => void;
  onSaveChecklist: (checklist: EvaluatorChecklist) => Promise<void>;
  isSavingChecklist?: boolean;
}

export function StatusSection({
  registry,
  statusLabels,
  canEdit,
  onOpenStatusDialog,
  onOpenHistoryModal,
  onSaveChecklist,
  isSavingChecklist = false,
}: StatusSectionProps) {
  const currentStatusMeta = statusLabels[registry.registrationStatus] || statusLabels.pending_verification;

  // Checklist local state
  const [checklist, setChecklist] = useState<EvaluatorChecklist>(
    registry.evaluatorChecklist || {
      amalIbadah: true,
      landRights: true,
      housingCondition: true,
      economicStatus: true,
      communityParticipation: true,
      leaderEndorsement: true,
      asnafVulnerability: true,
      dependentBurdens: false,
      committeeNotes: '',
      checkedBy: '',
      checkedAt: '',
    }
  );
  const [hasChecklistChanges, setHasChecklistChanges] = useState<boolean>(false);

  const handleToggleCriteria = (key: keyof EvaluatorChecklist) => {
    if (!canEdit) return;
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChecklistChanges(true);
  };

  const handleSaveChecklistForm = async () => {
    await onSaveChecklist(checklist);
    setHasChecklistChanges(false);
  };

  const historyList = registry.registrationHistory || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header & Current Registration Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0b2545] text-amber-300 flex items-center justify-center shadow-xs shrink-0">
              <CheckSquare className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  6. ส่วนสถานะทะเบียนและการตรวจสอบคุณสมบัติ
                </h3>
                <span className={`px-3 py-1 rounded-full font-bold text-xs border ${currentStatusMeta.bg} ${currentStatusMeta.color} ${currentStatusMeta.border}`}>
                  {currentStatusMeta.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                สถานะทะเบียนรายบุคคลแยกอิสระจากสถานะคำร้องขอรับความช่วยเหลือตามมาตรฐานความโปร่งใส
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenHistoryModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              title="ดูประวัติการแก้ไขข้อมูลรายฟิลด์"
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span>ดูประวัติการแก้ไข</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={onOpenStatusDialog}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold rounded-xl text-xs transition-colors shadow-xs"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>ปรับสถานะทะเบียน</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[11px] mb-0.5">สถานะทะเบียนปัจจุบัน:</span>
            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-xs border ${currentStatusMeta.bg} ${currentStatusMeta.color} ${currentStatusMeta.border}`}>
              {currentStatusMeta.label}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[11px] mb-0.5">วันที่ขึ้นทะเบียน:</span>
            <strong className="text-slate-900 block font-medium">
              {registry.registeredDate ? new Date(registry.registeredDate).toLocaleDateString('th-TH') : '-'}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[11px] mb-0.5">วันที่แก้ไขล่าสุด:</span>
            <strong className="text-slate-900 block font-medium">
              {registry.updatedAt ? new Date(registry.updatedAt).toLocaleDateString('th-TH') : '-'}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[11px] mb-0.5">ผู้รับผิดชอบ / ผู้สำรวจ:</span>
            <strong className="text-slate-900 block font-medium">
              {registry.surveyorName || 'เจ้าหน้าที่สำรวจส่วนกลาง'}
            </strong>
          </div>
        </div>

        {/* Officer qualification notes if any */}
        {registry.qualificationNotes && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-400 block text-[11px] mb-0.5">หมายเหตุจากเจ้าหน้าที่ / ผลการตรวจสอบ:</span>
            <p className="text-slate-800 italic">{registry.qualificationNotes}</p>
          </div>
        )}
      </div>

      {/* 2. Evaluator Checklist (8 Criteria) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              ผลการประเมินและเกณฑ์คุณสมบัติ (Evaluator Checklist 8 ข้อ)
            </h4>
            <p className="text-[11px] text-slate-500">
              เกณฑ์การพิจารณาผู้มีสิทธิ์รับซะกาตตามหลักศาสนาและระเบียบมูลนิธิ
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={handleSaveChecklistForm}
              disabled={isSavingChecklist || !hasChecklistChanges}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-40 self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingChecklist ? 'กำลังบันทึก...' : 'บันทึกเกณฑ์ Checklist'}</span>
            </button>
          )}
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} ${checklist.amalIbadah ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <input
                type="checkbox"
                checked={checklist.amalIbadah}
                onChange={() => handleToggleCriteria('amalIbadah')}
                disabled={!canEdit}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">1. การประกอบอามั้ลและอิบาดะฮ์</span>
                <span className="text-[11px] text-slate-500">ปฏิบัติตามหลักศาสนาอิสลาม</span>
              </div>
            </label>

            <label className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} ${checklist.landRights ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <input
                type="checkbox"
                checked={checklist.landRights}
                onChange={() => handleToggleCriteria('landRights')}
                disabled={!canEdit}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">2. เอกสารสิทธิ์หรือการใช้ที่ดิน</span>
                <span className="text-[11px] text-slate-500">มีสิทธิในที่อยู่อาศัยถูกต้องตามกฎหมาย</span>
              </div>
            </label>

            <label className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} ${checklist.housingCondition ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <input
                type="checkbox"
                checked={checklist.housingCondition}
                onChange={() => handleToggleCriteria('housingCondition')}
                disabled={!canEdit}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">3. สภาพที่อยู่อาศัยทรุดโทรม</span>
                <span className="text-[11px] text-slate-500">ผ่านการลงพื้นที่สำรวจสภาพจริง</span>
              </div>
            </label>

            <label className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} ${checklist.economicStatus ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <input
                type="checkbox"
                checked={checklist.economicStatus}
                onChange={() => handleToggleCriteria('economicStatus')}
                disabled={!canEdit}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">4. ฐานะทางเศรษฐกิจและหนี้สิน</span>
                <span className="text-[11px] text-slate-500">รายได้ต่ำกว่าเกณฑ์นิศอบ มีความจำเป็นจริง</span>
              </div>
            </label>

            <label className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} ${checklist.communityParticipation ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <input
                type="checkbox"
                checked={checklist.communityParticipation}
                onChange={() => handleToggleCriteria('communityParticipation')}
                disabled={!canEdit}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">5. การมีส่วนร่วมในชุมชน</span>
                <span className="text-[11px] text-slate-500">ให้ความร่วมมือกับกิจกรรมมัสยิดและชุมชน</span>
              </div>
            </label>

            <label className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} ${checklist.leaderEndorsement ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <input
                type="checkbox"
                checked={checklist.leaderEndorsement}
                onChange={() => handleToggleCriteria('leaderEndorsement')}
                disabled={!canEdit}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">6. การรับรองจากผู้นำท้องถิ่น</span>
                <span className="text-[11px] text-slate-500">มีหนังสือรับรองจากอิหม่ามหรือผู้นำชุมชน</span>
              </div>
            </label>

            <label className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} ${checklist.asnafVulnerability ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <input
                type="checkbox"
                checked={checklist.asnafVulnerability}
                onChange={() => handleToggleCriteria('asnafVulnerability')}
                disabled={!canEdit}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">7. ความเปราะบางตาม 8 อัสนาฟ</span>
                <span className="text-[11px] text-slate-500">ตรงตามหลักการจัดสรรซะกาต</span>
              </div>
            </label>

            <label className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} ${checklist.dependentBurdens ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <input
                type="checkbox"
                checked={checklist.dependentBurdens}
                onChange={() => handleToggleCriteria('dependentBurdens')}
                disabled={!canEdit}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 block">8. ภาระพึ่งพิงเด็ก/ผู้สูงอายุ/เจ็บป่วย</span>
                <span className="text-[11px] text-slate-500">มีผู้ที่ต้องดูแลในความอุปการะ</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Chronological Status Transition History (Audit Trail) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0b2545]" />
            <span>ประวัติการเปลี่ยนสถานะทะเบียน (Audit Trail)</span>
          </span>
          <span className="text-[11px] text-slate-500">
            บันทึกผู้ดำเนินการ วันเวลา และเหตุผลทุกครั้ง
          </span>
        </div>

        <div className="p-5">
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 font-bold text-slate-700">
                  <th className="py-2.5 px-3">วันเวลา</th>
                  <th className="py-2.5 px-3">สถานะ</th>
                  <th className="py-2.5 px-3">ผู้ดำเนินการ</th>
                  <th className="py-2.5 px-3">เหตุผล / บันทึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                      ยังไม่มีบันทึกประวัติการเปลี่ยนสถานะ
                    </td>
                  </tr>
                ) : (
                  historyList.map((h, idx) => {
                    const meta = statusLabels[h.status] || statusLabels.draft;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {new Date(h.timestamp).toLocaleString('th-TH')}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${meta.bg} ${meta.color} ${meta.border}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{h.changedBy}</td>
                        <td className="py-2.5 px-3 text-slate-600 italic">{h.notes}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
