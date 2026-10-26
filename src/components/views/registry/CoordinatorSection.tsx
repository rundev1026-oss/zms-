'use client';

import React from 'react';
import { ShieldCheck, UserCheck, Phone, MapPin, Briefcase, Calendar, FileText, Edit, Building2 } from 'lucide-react';
import { BeneficiaryRegistryItem, CoordinatorInfo, CertifierInfo } from '@/types';

interface CoordinatorSectionProps {
  registry: BeneficiaryRegistryItem;
  isEditing: boolean;
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  canEdit: boolean;
  onStartEdit: () => void;
}

export function CoordinatorSection({
  registry,
  isEditing,
  editForm,
  setEditForm,
  canEdit,
  onStartEdit,
}: CoordinatorSectionProps) {
  const coordinator: CoordinatorInfo = isEditing
    ? (editForm.coordinator || {})
    : (registry.coordinator || {});

  const certifier: CertifierInfo = isEditing
    ? (editForm.certifier || {})
    : (registry.certifier || {});

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0b2545] text-amber-300 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">3. ส่วนผู้ประสานงานและผู้รับรอง</h3>
            <p className="text-[11px] text-slate-500">ข้อมูลผู้สำรวจ/ประสานงานในพื้นที่ และข้อมูลผู้นำท้องถิ่น/อิหม่ามผู้รับรองความเดือดร้อน</p>
          </div>
        </div>
        {!isEditing && canEdit && (
          <button
            type="button"
            onClick={onStartEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>แก้ไขข้อมูลผู้ประสานงาน/รับรอง</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ========================================================================= */}
        {/* 3.1 ผู้ประสานงาน */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs">3.1 ข้อมูลผู้ประสานงานในพื้นที่</h4>
            </div>
            <span className="text-[10px] text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full font-bold border border-sky-200">
              ผู้สำรวจ/ประสานงาน
            </span>
          </div>

          <div className="p-5 flex-1">
            {!isEditing ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">ชื่อ–นามสกุล:</span>
                  <strong className="text-slate-900 block font-bold text-sm">
                    {coordinator.fullName || coordinator.name || registry.surveyorName || 'เจ้าหน้าที่สำรวจในพื้นที่'}
                  </strong>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">เบอร์โทรศัพท์:</span>
                    <span className="text-slate-900 block font-medium">{coordinator.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">อาชีพ:</span>
                    <span className="text-slate-900 block">{coordinator.occupation || 'เจ้าหน้าที่สำรวจซะกาต'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">ตำแหน่งหรือบทบาท:</span>
                    <span className="text-slate-900 block font-medium">
                      {coordinator.roleTitle || coordinator.relationship || 'ผู้ประสานงานภาคสนาม'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">อายุ:</span>
                    <span className="text-slate-900 block">
                      {coordinator.age ? `${coordinator.age} ปี` : 'ยังไม่มีข้อมูล'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">ที่อยู่:</span>
                    <span className="text-slate-900 block">{coordinator.address || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">หน่วยงานหรือเครือข่ายที่เกี่ยวข้อง:</span>
                    <span className="text-slate-900 block font-medium">
                      {coordinator.organization || registry.branchName || 'มูลนิธิซะกาตและสาธารณกุศล'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Editable Coordinator Form */
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อ–นามสกุล ผู้ประสานงาน *</label>
                  <input
                    type="text"
                    value={editForm.coordinator?.fullName || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      coordinator: { ...(editForm.coordinator || {}), fullName: e.target.value }
                    })}
                    placeholder="ระบุชื่อและนามสกุล"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      value={editForm.coordinator?.phone || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        coordinator: { ...(editForm.coordinator || {}), phone: e.target.value }
                      })}
                      placeholder="08X-XXX-XXXX"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">อาชีพ</label>
                    <input
                      type="text"
                      value={editForm.coordinator?.occupation || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        coordinator: { ...(editForm.coordinator || {}), occupation: e.target.value }
                      })}
                      placeholder="อาชีพ"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ตำแหน่งหรือบทบาท</label>
                    <input
                      type="text"
                      value={editForm.coordinator?.roleTitle || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        coordinator: { ...(editForm.coordinator || {}), roleTitle: e.target.value }
                      })}
                      placeholder="เช่น ผู้ใหญ่บ้าน, อสม., เจ้าหน้าที่"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">อายุ (ปี)</label>
                    <input
                      type="number"
                      value={editForm.coordinator?.age ?? ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        coordinator: { ...(editForm.coordinator || {}), age: e.target.value === '' ? undefined : Number(e.target.value) }
                      })}
                      placeholder="อายุ"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ที่อยู่</label>
                  <input
                    type="text"
                    value={editForm.coordinator?.address || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      coordinator: { ...(editForm.coordinator || {}), address: e.target.value }
                    })}
                    placeholder="ที่อยู่ผู้ประสานงาน"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">หน่วยงานหรือเครือข่ายที่เกี่ยวข้อง</label>
                  <input
                    type="text"
                    value={editForm.coordinator?.organization || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      coordinator: { ...(editForm.coordinator || {}), organization: e.target.value }
                    })}
                    placeholder="เช่น มัสยิดกลาง, ชมรมจิตอาสา"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3.2 ผู้รับรอง */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs">3.2 ข้อมูลผู้รับรองคุณสมบัติ</h4>
            </div>
            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
              อิหม่าม / ผู้นำท้องถิ่น
            </span>
          </div>

          <div className="p-5 flex-1">
            {!isEditing ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">ชื่อ–นามสกุล ผู้รับรอง:</span>
                  <strong className="text-slate-900 block font-bold text-sm">
                    {certifier.fullName || certifier.name || 'อิหม่ามประจำมัสยิดท้องถิ่น'}
                  </strong>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">ตำแหน่ง:</span>
                    <span className="text-slate-900 block font-medium">
                      {certifier.roleTitle || certifier.position || certifier.organization || 'อิหม่าม / ผู้นำชุมชน'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">เบอร์โทรศัพท์:</span>
                    <span className="text-slate-900 block font-medium">{certifier.phone || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">วันที่รับรอง:</span>
                    <span className="text-slate-900 block font-medium">
                      {certifier.certifiedDate
                        ? new Date(certifier.certifiedDate).toLocaleDateString('th-TH')
                        : (registry.registeredDate ? new Date(registry.registeredDate).toLocaleDateString('th-TH') : '-')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-slate-400 block text-[11px]">เอกสารรับรองหรือหลักฐานประกอบ / ความเห็น:</span>
                  <p className="text-slate-800 italic bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    "{certifier.comments || certifier.certificationDocument || 'รับรองว่าเป็นผู้มีความเดือดร้อนจริงและมีคุณสมบัติตรงตามเกณฑ์ผู้มีสิทธิ์รับซะกาต'}"
                  </p>
                </div>
              </div>
            ) : (
              /* Editable Certifier Form */
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อ–นามสกุล ผู้รับรอง *</label>
                  <input
                    type="text"
                    value={editForm.certifier?.fullName || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      certifier: { ...(editForm.certifier || {}), fullName: e.target.value }
                    })}
                    placeholder="เช่น ฮัจญี... หรือ นาย..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ตำแหน่ง (อิหม่าม/ผู้ใหญ่บ้าน)</label>
                    <input
                      type="text"
                      value={editForm.certifier?.roleTitle || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        certifier: { ...(editForm.certifier || {}), roleTitle: e.target.value }
                      })}
                      placeholder="เช่น อิหม่ามประจำมัสยิด, ผู้ใหญ่บ้าน"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      value={editForm.certifier?.phone || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        certifier: { ...(editForm.certifier || {}), phone: e.target.value }
                      })}
                      placeholder="08X-XXX-XXXX"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">วันที่รับรอง</label>
                  <input
                    type="date"
                    value={editForm.certifier?.certifiedDate || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      certifier: { ...(editForm.certifier || {}), certifiedDate: e.target.value }
                    })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เอกสารรับรองหรือข้อความรับรอง</label>
                  <textarea
                    rows={3}
                    value={editForm.certifier?.comments || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      certifier: { ...(editForm.certifier || {}), comments: e.target.value }
                    })}
                    placeholder="บันทึกข้อความรับรองคุณสมบัติหรือหมายเลขอ้างอิงเอกสาร..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
