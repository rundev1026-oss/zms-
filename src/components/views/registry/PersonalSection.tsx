'use client';

import React, { useState } from 'react';
import { 
  User, 
  Home, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  Building, 
  Edit, 
  Plus, 
  Trash2, 
  FileText, 
  Check, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Heart,
  AlertCircle,
  Lock,
  Calendar
} from 'lucide-react';
import { calculateAge, getTodayISODate } from '@/utils/ageCalculator';
import { ThaiAddressFields } from '@/components/common/ThaiAddressFields';
import { 
  BeneficiaryRegistryItem, 
  HouseholdMember, 
  PastAssistanceRecord, 
  AsnafCategory,
  HousingType,
  LandTitleType,
  MaritalStatus 
} from '@/types';

export type PersonalSubTab = 'all' | 'info' | 'household' | 'economy' | 'limitations' | 'other_aid';

interface PersonalSectionProps {
  registry: BeneficiaryRegistryItem;
  isEditing: boolean;
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  canEdit: boolean;
  onStartEdit: (subSection?: PersonalSubTab) => void;
  activeSubTab: PersonalSubTab;
  setActiveSubTab: (subTab: PersonalSubTab) => void;
  asnafLabels: Record<string, string>;
  canViewUnmaskedId?: boolean;
}

const HOUSING_TYPE_LABELS: Record<string, string> = {
  own: 'บ้านตนเอง',
  rent: 'บ้านเช่า',
  relative: 'อาศัยญาติ/ผู้อื่น',
  public_land: 'ที่ดินสาธารณะ/บุกเบิก',
  other: 'อื่น ๆ'
};

const LAND_TITLE_LABELS: Record<string, string> = {
  title_deed: 'โฉนดที่ดิน (น.ส. 4)',
  nor_sor_3: 'น.ส. 3 / น.ส. 3 ก.',
  sor_por_kor: 'ส.ป.ก. 4-01',
  rental_agreement: 'สัญญาเช่าที่ดิน',
  public_land: 'ที่ดินสาธารณะ',
  none: 'ไม่มีเอกสารสิทธิ์'
};

const MARITAL_STATUS_LABELS: Record<string, string> = {
  single: 'โสด',
  married: 'สมรส',
  divorced: 'หย่าร้าง',
  widowed: 'หม้าย',
  separated: 'แยกกันอยู่'
};

// Helper to format currency or show "ยังไม่มีข้อมูล" when not filled
export function formatCurrencyOrNotProvided(val: number | null | undefined): React.ReactNode {
  if (val === null || val === undefined || isNaN(val) || val === ('' as any)) {
    return <span className="text-slate-400 italic text-xs font-normal">ยังไม่มีข้อมูล</span>;
  }
  return <span className="font-mono font-medium text-slate-900">฿{Number(val).toLocaleString()}</span>;
}

export function PersonalSection({
  registry,
  isEditing,
  editForm,
  setEditForm,
  canEdit,
  onStartEdit,
  activeSubTab,
  setActiveSubTab,
  asnafLabels,
  canViewUnmaskedId = false,
}: PersonalSectionProps) {
  const [showUnmaskedId, setShowUnmaskedId] = useState<boolean>(false);

  // Helper for household members in editForm
  const handleAddMember = () => {
    setEditForm((prev: any) => ({
      ...prev,
      householdMembers: [
        ...(prev.householdMembers || []),
        {
          id: `mem-${Date.now()}`,
          fullName: '',
          relation: 'บุตร',
          age: 18,
          educationStatus: '',
          occupation: '',
          monthlyIncome: undefined,
          healthStatus: 'healthy',
          notes: '',
        }
      ]
    }));
  };

  const handleRemoveMember = (index: number) => {
    setEditForm((prev: any) => ({
      ...prev,
      householdMembers: (prev.householdMembers || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const handleMemberChange = (index: number, field: string, value: any) => {
    setEditForm((prev: any) => {
      const list = [...(prev.householdMembers || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, householdMembers: list };
    });
  };

  // Helper for past external assistance in editForm
  const handleAddPastAid = () => {
    setEditForm((prev: any) => ({
      ...prev,
      pastAssistance: [
        ...(prev.pastAssistance || []),
        {
          id: `aid-${Date.now()}`,
          hasReceived: true,
          agency: '',
          assistanceType: 'เงินสงเคราะห์',
          format: 'เงิน',
          amountOrItems: '',
          yearReceived: new Date().getFullYear().toString(),
          notes: '',
        }
      ]
    }));
  };

  const handleRemovePastAid = (index: number) => {
    setEditForm((prev: any) => ({
      ...prev,
      pastAssistance: (prev.pastAssistance || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const handlePastAidChange = (index: number, field: string, value: any) => {
    setEditForm((prev: any) => {
      const list = [...(prev.pastAssistance || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, pastAssistance: list };
    });
  };

  const householdList: HouseholdMember[] = isEditing
    ? (editForm.householdMembers || [])
    : (registry.householdMembers || []);

  const pastAidList: PastAssistanceRecord[] = isEditing
    ? (editForm.pastAssistance || [])
    : (registry.pastAssistance || []);

  // Compute calculated balance
  const totalIncome = isEditing ? (Number(editForm.monthlyIncome) || 0) : (registry.monthlyIncome || 0);
  const totalExpense = isEditing ? (Number(editForm.monthlyExpense) || 0) : (registry.monthlyExpense || 0);
  const netEstimated = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Sub-Section Navigation Pills */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto text-xs touch-scroll">
        <button
          type="button"
          onClick={() => setActiveSubTab('all')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            activeSubTab === 'all'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          แสดงทั้ง 5 หมวด
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('info')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            activeSubTab === 'info'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          1.1 ข้อมูลส่วนบุคคล & ที่อยู่
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('household')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            activeSubTab === 'household'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          1.2 ครัวเรือน ({householdList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('economy')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            activeSubTab === 'economy'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          1.3 รายได้-รายจ่าย & หนี้สิน
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('limitations')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            activeSubTab === 'limitations'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          1.4 สภาพปัจจุบัน & ข้อจำกัด
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('other_aid')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
            activeSubTab === 'other_aid'
              ? 'bg-[#0b2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          1.5 ความช่วยเหลืออื่น ({pastAidList.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1.1 ข้อมูลส่วนบุคคลและที่อยู่ */}
      {/* ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'info') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">1.1 ข้อมูลส่วนบุคคลและที่อยู่</h3>
                <p className="text-[11px] text-slate-500">ข้อมูลผู้ขึ้นทะเบียน สิทธิการครอบครองที่อยู่อาศัย และหลักฐานที่ดิน</p>
              </div>
            </div>
            {!isEditing && canEdit && (
              <button
                type="button"
                onClick={() => onStartEdit('info')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>แก้ไขข้อมูลส่วนบุคคล</span>
              </button>
            )}
          </div>

          <div className="p-5">
            {!isEditing ? (
              /* Read-only view */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Personal Information Group */}
                <div className="space-y-3">
                  <span className="font-bold text-slate-900 block pb-1 border-b border-slate-200 text-xs text-emerald-800">
                    ข้อมูลประจำตัวและช่องทางติดต่อ
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[11px]">รหัสทะเบียนผู้มีสิทธิ์:</span>
                      <strong className="text-slate-900 font-mono font-bold block text-sm">{registry.registrationNo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">คำนำหน้า ชื่อ-นามสกุล:</span>
                      <strong className="text-slate-900 block font-bold text-sm">{registry.titlePrefix} {registry.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">เลขประจำตัวประชาชน:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                        <span>{showUnmaskedId ? (registry.nationalId || registry.nationalIdMasked) : registry.nationalIdMasked}</span>
                        {canViewUnmaskedId && (
                          <button
                            type="button"
                            onClick={() => setShowUnmaskedId(!showUnmaskedId)}
                            className="text-slate-400 hover:text-slate-700"
                            title={showUnmaskedId ? 'ซ่อนเลขบัตร' : 'แสดงเลขบัตรเต็ม'}
                          >
                            {showUnmaskedId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">วันเดือนปีเกิดและอายุ:</span>
                      <span className="text-slate-900 block font-medium">
                        {registry.birthDate ? new Date(registry.birthDate).toLocaleDateString('th-TH') : '-'}
                        {registry.age ? ` (${registry.age} ปี)` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">เบอร์โทรศัพท์:</span>
                      <span className="text-slate-900 block font-medium">{registry.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">สถานภาพสมรส:</span>
                      <span className="text-slate-900 block">{MARITAL_STATUS_LABELS[registry.maritalStatus || ''] || registry.maritalStatus || 'สมรส'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">อาชีพ:</span>
                      <span className="text-slate-900 block">{registry.occupation || 'ไม่มีอาชีพประจำ'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">หมวดอัสนาฟ:</span>
                      <span className="text-emerald-800 font-bold block">{asnafLabels[registry.asnafCategory] || registry.asnafCategory}</span>
                    </div>
                  </div>
                </div>

                {/* Residence & Tenure Group */}
                <div className="space-y-3">
                  <span className="font-bold text-slate-900 block pb-1 border-b border-slate-200 text-xs text-emerald-800">
                    ที่อยู่และการครอบครองที่อยู่อาศัย
                  </span>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">ที่อยู่ปัจจุบัน:</span>
                      <span className="text-slate-900 block font-medium leading-relaxed">
                        {registry.address || '-'} ชุมชน{registry.community || '-'} ต.{registry.subdistrict || '-'} อ.{registry.district || '-'} จ.{registry.province || '-'} {registry.postcode || ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[11px]">ลักษณะการครอบครองที่อยู่อาศัย:</span>
                        <span className="text-slate-900 block font-bold">
                          {HOUSING_TYPE_LABELS[registry.housingType || ''] || registry.housingType || 'บ้านตนเอง'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">สภาพบ้านพัก:</span>
                        <span className="text-slate-900 block">{registry.housingCondition || 'ทรุดโทรม'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[11px]">ข้อมูลโฉนดหรือสิทธิในที่ดิน:</span>
                        <span className="text-slate-900 block font-medium">
                          {LAND_TITLE_LABELS[registry.landTitleType || ''] || registry.landTitleType || 'ไม่มีข้อมูลสิทธิที่ดิน'}
                          {registry.landTitleNotes ? ` (${registry.landTitleNotes})` : ''}
                        </span>
                      </div>
                      {registry.housingNotes && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[11px]">หมายเหตุที่อยู่อาศัย:</span>
                          <span className="text-slate-600 italic block">{registry.housingNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Editable Info Form */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">คำนำหน้า *</label>
                    <select
                      value={editForm.titlePrefix || 'นาย'}
                      onChange={(e) => setEditForm({ ...editForm, titlePrefix: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="ฮัจญี">ฮัจญี</option>
                      <option value="ฮัจญะห์">ฮัจญะห์</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">ชื่อ-นามสกุล *</label>
                    <input
                      type="text"
                      value={editForm.fullName || ''}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      placeholder="ระบุชื่อและนามสกุล"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  {/* แถวที่ 2: เลขบัตรประชาชน, วันเดือนปีเกิด, อายุ */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">เลขประจำตัวประชาชน (13 หลัก) *</label>
                    <input
                      type="text"
                      maxLength={13}
                      value={editForm.nationalId || ''}
                      onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value.replace(/[^0-9]/g, '') })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      วันเดือนปีเกิด <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      max={getTodayISODate()}
                      value={editForm.birthDate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const calc = calculateAge(val);
                        setEditForm({
                          ...editForm,
                          birthDate: val,
                          age: calc.isValid ? calc.years : editForm.age,
                        });
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                    {(() => {
                      const calc = calculateAge(editForm.birthDate);
                      return calc.isValid ? (
                        <p className="text-[10px] text-emerald-800 mt-1 font-medium">
                          ปฏิทินไทย: {calc.buddhistDateFormatted}
                        </p>
                      ) : calc.isFuture ? (
                        <p className="text-[10px] text-rose-600 mt-1 font-bold">
                          ⚠️ {calc.error}
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 block">อายุ (ปี)</label>
                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-slate-400" /> คำนวณอัตโนมัติ
                      </span>
                    </div>
                    {(() => {
                      const calc = calculateAge(editForm.birthDate);
                      const displayAge = calc.isValid
                        ? calc.displayText
                        : (editForm.age !== undefined && editForm.age !== null ? `${editForm.age} ปี` : '-');
                      return (
                        <div className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs flex items-center justify-between min-h-[40px]">
                          <span>{displayAge}</span>
                          {calc.isValid && calc.isUnderOneYear && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              อายุต่ำกว่า 1 ปี
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <p className="text-[10px] text-slate-500 mt-1">คำนวณอัตโนมัติจากวันเดือนปีเกิด</p>
                  </div>

                  {/* แถวที่ 3: หมายเลขโทรศัพท์ติดต่อ, อาชีพหลัก, สถานภาพสมรส */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">หมายเลขโทรศัพท์ติดต่อ *</label>
                    <input
                      type="text"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="08X-XXX-XXXX"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">อาชีพหลัก/ปัจจุบัน</label>
                    <input
                      type="text"
                      value={editForm.occupation || ''}
                      onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                      placeholder="เช่น รับจ้างทั่วไป, ค้าขาย"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">สถานภาพสมรส</label>
                    <select
                      value={editForm.maritalStatus || 'married'}
                      onChange={(e) => setEditForm({ ...editForm, maritalStatus: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="single">โสด</option>
                      <option value="married">สมรส</option>
                      <option value="divorced">หย่าร้าง</option>
                      <option value="widowed">หม้าย</option>
                      <option value="separated">แยกกันอยู่</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs">ที่อยู่และการครอบครองที่อยู่อาศัย</h4>
                  <ThaiAddressFields
                    postcode={editForm.postcode || ''}
                    province={editForm.province || ''}
                    district={editForm.district || ''}
                    subdistrict={editForm.subdistrict || ''}
                    address={editForm.address || ''}
                    community={editForm.community || ''}
                    onChangePostcode={(val) => setEditForm({ ...editForm, postcode: val })}
                    onChangeProvince={(val) => setEditForm({ ...editForm, province: val })}
                    onChangeDistrict={(val) => setEditForm({ ...editForm, district: val })}
                    onChangeSubdistrict={(val) => setEditForm({ ...editForm, subdistrict: val })}
                    onChangeAddress={(val) => setEditForm({ ...editForm, address: val })}
                    onChangeCommunity={(val) => setEditForm({ ...editForm, community: val })}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">ลักษณะการครอบครองที่อยู่อาศัย</label>
                      <select
                        value={editForm.housingType || 'own'}
                        onChange={(e) => setEditForm({ ...editForm, housingType: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="own">บ้านตนเอง</option>
                        <option value="rent">บ้านเช่า</option>
                        <option value="relative">อาศัยญาติ/ผู้อื่น</option>
                        <option value="public_land">ที่ดินสาธารณะ/บุกเบิก</option>
                        <option value="other">อื่น ๆ</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">สิทธิในที่ดิน/เอกสารสิทธิ์</label>
                      <select
                        value={editForm.landTitleType || 'title_deed'}
                        onChange={(e) => setEditForm({ ...editForm, landTitleType: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="title_deed">โฉนดที่ดิน (น.ส. 4)</option>
                        <option value="nor_sor_3">น.ส. 3 / น.ส. 3 ก.</option>
                        <option value="sor_por_kor">ส.ป.ก. 4-01</option>
                        <option value="rental_agreement">สัญญาเช่าที่ดิน</option>
                        <option value="public_land">ที่ดินสาธารณะ</option>
                        <option value="none">ไม่มีเอกสารสิทธิ์</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="font-bold text-slate-700 block mb-1">ข้อมูลโฉนด/รายละเอียดเพิ่มเติม</label>
                      <input
                        type="text"
                        value={editForm.landTitleNotes || ''}
                        onChange={(e) => setEditForm({ ...editForm, landTitleNotes: e.target.value })}
                        placeholder="เช่น เลขที่โฉนด, ข้อตกลงการเช่าที่ดิน..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.2 ครัวเรือน */}
      {/* ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'household') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  1.2 ครัวเรือนและสมาชิกในครอบครัว ({householdList.length} คน)
                </h3>
                <p className="text-[11px] text-slate-500">ข้อมูลสมาชิกทุกคนในครัวเรือน ความสัมพันธ์ การศึกษา รายได้ และหมายเหตุ</p>
              </div>
            </div>
            {!isEditing && canEdit && (
              <button
                type="button"
                onClick={() => onStartEdit('household')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>แก้ไขข้อมูลครัวเรือน</span>
              </button>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Detailed family situation */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-900 block text-xs">ข้อมูลสถานภาพครอบครัวโดยละเอียด:</span>
              <p className="text-slate-700 leading-relaxed">
                {registry.familySituationSummary || 'ไม่มีบันทึกสรุปสถานการณ์ครอบครัวพิเศษ'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400">ภาระพึ่งพิง/ผู้ป่วย/ผู้สูงอายุ:</span>{' '}
                  <span className="text-slate-800 font-medium">{registry.dependentBurdens || 'ไม่มีบันทึก'}</span>
                </div>
                <div>
                  <span className="text-slate-400">ความจำเป็นเร่งด่วน:</span>{' '}
                  <span className="text-slate-800 font-medium">{registry.urgentNeeds || 'ไม่มีบันทึก'}</span>
                </div>
              </div>
            </div>

            {/* Household members table */}
            {!isEditing ? (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                      <th className="py-2.5 px-3">ชื่อ–นามสกุล</th>
                      <th className="py-2.5 px-3">อายุ</th>
                      <th className="py-2.5 px-3">สถานภาพด้านการศึกษา</th>
                      <th className="py-2.5 px-3">อาชีพ</th>
                      <th className="py-2.5 px-3 text-right">รายได้ (บ./ด.)</th>
                      <th className="py-2.5 px-3">ความสัมพันธ์</th>
                      <th className="py-2.5 px-3">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {householdList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                          ยังไม่มีข้อมูลสมาชิกในครัวเรือน
                        </td>
                      </tr>
                    ) : (
                      householdList.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{m.fullName}</td>
                          <td className="py-2.5 px-3 text-slate-700">{m.age ? `${m.age} ปี` : '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{m.educationStatus || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{m.occupation || '-'}</td>
                          <td className="py-2.5 px-3 text-right">
                            {formatCurrencyOrNotProvided(m.monthlyIncome)}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-emerald-800">{m.relation || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-500 italic">{m.notes || m.healthNotes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Editable household members table */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">รายการสมาชิกครัวเรือน</span>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มสมาชิก</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {householdList.map((m, idx) => (
                    <div key={m.id || idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">สมาชิกคนที่ {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบ</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ชื่อ-นามสกุล *</label>
                          <input
                            type="text"
                            value={m.fullName || ''}
                            onChange={(e) => handleMemberChange(idx, 'fullName', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="ชื่อสมาชิก"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ความสัมพันธ์ *</label>
                          <input
                            type="text"
                            value={m.relation || ''}
                            onChange={(e) => handleMemberChange(idx, 'relation', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="เช่น บุตร, บิดา, คู่สมรส"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">อายุ (ปี)</label>
                          <input
                            type="number"
                            value={m.age ?? ''}
                            onChange={(e) => handleMemberChange(idx, 'age', Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">การศึกษา</label>
                          <input
                            type="text"
                            value={m.educationStatus || ''}
                            onChange={(e) => handleMemberChange(idx, 'educationStatus', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="เช่น ประถม, มัธยม, ป.ตรี"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">อาชีพ</label>
                          <input
                            type="text"
                            value={m.occupation || ''}
                            onChange={(e) => handleMemberChange(idx, 'occupation', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="อาชีพ"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">รายได้ (บาท/เดือน)</label>
                          <input
                            type="number"
                            value={m.monthlyIncome ?? ''}
                            onChange={(e) => handleMemberChange(idx, 'monthlyIncome', e.target.value === '' ? undefined : Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                            placeholder="ยังไม่มีข้อมูล"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">หมายเหตุ/สุขภาพ</label>
                          <input
                            type="text"
                            value={m.notes || m.healthNotes || ''}
                            onChange={(e) => handleMemberChange(idx, 'notes', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="หมายเหตุ"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.3 รายได้–รายจ่ายและหนี้สิน */}
      {/* ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'economy') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">1.3 รายได้–รายจ่ายและหนี้สิน</h3>
                <p className="text-[11px] text-slate-500">
                  แจกแจงรายได้ 8 กลุ่ม รายจ่าย 7 กลุ่ม ภาระหนี้สิน และดุลเงินคงเหลือ (ไม่ใส่เลขศูนย์แทนข้อมูลที่ไม่ได้กรอก)
                </p>
              </div>
            </div>
            {!isEditing && canEdit && (
              <button
                type="button"
                onClick={() => onStartEdit('economy')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>แก้ไขข้อมูลรายได้-รายจ่าย</span>
              </button>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* 4 Summary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] text-emerald-800 font-semibold block">รายได้รวมต่อเดือน</span>
                <span className="text-base sm:text-lg font-bold text-emerald-900 font-mono">
                  {formatCurrencyOrNotProvided(totalIncome)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[11px] text-rose-800 font-semibold block">รายจ่ายรวมต่อเดือน</span>
                <span className="text-base sm:text-lg font-bold text-rose-900 font-mono">
                  {formatCurrencyOrNotProvided(totalExpense)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                <span className="text-[11px] text-slate-700 font-semibold block">รายได้คงเหลือโดยประมาณ</span>
                <span className={`text-base sm:text-lg font-bold font-mono ${netEstimated < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  ฿{netEstimated.toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[11px] text-amber-800 font-semibold block">ยอดหนี้สินคงค้าง</span>
                <span className="text-base sm:text-lg font-bold text-amber-900 font-mono">
                  {formatCurrencyOrNotProvided(isEditing ? editForm.debtAmount : registry.debtAmount)}
                </span>
              </div>
            </div>

            {/* 3 Detail Groups: Income (8 items), Expenses (7 items), Debts */}
            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Group 1: Monthly Family Income (8 items) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <span className="font-bold text-slate-900 block pb-1 border-b border-slate-200 text-emerald-800">
                    รายได้ต่อเดือนของครอบครัว (8 รายการ)
                  </span>
                  <div className="space-y-1.5 divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">1. รายได้จากค่าจ้าง:</span>
                      {formatCurrencyOrNotProvided(registry.incomeBreakdown?.salary)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">2. จากสมาชิกในครอบครัว:</span>
                      {formatCurrencyOrNotProvided(registry.incomeBreakdown?.familySupport)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">3. รายได้จากการเกษตร:</span>
                      {formatCurrencyOrNotProvided(registry.incomeBreakdown?.agriculture)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">4. รายได้จากการค้าขาย:</span>
                      {formatCurrencyOrNotProvided(registry.incomeBreakdown?.trading)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">5. รายได้จากทรัพย์สิน:</span>
                      {formatCurrencyOrNotProvided(registry.incomeBreakdown?.assetIncome)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">6. รายได้จากอาชีพส่วนตัว:</span>
                      {formatCurrencyOrNotProvided(registry.incomeBreakdown?.freelance)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">7. สวัสดิการ/ความช่วยเหลือ:</span>
                      {formatCurrencyOrNotProvided(registry.incomeBreakdown?.welfare)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">8. รายได้อื่น ๆ:</span>
                      {formatCurrencyOrNotProvided(registry.incomeBreakdown?.otherIncome)}
                    </div>
                  </div>
                  {registry.incomeBreakdown?.otherIncomeNotes && (
                    <p className="text-[11px] text-slate-500 italic mt-1">
                      หมายเหตุรายได้อื่น: {registry.incomeBreakdown.otherIncomeNotes}
                    </p>
                  )}
                </div>

                {/* Group 2: Monthly Family Expenses (7 items) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <span className="font-bold text-slate-900 block pb-1 border-b border-slate-200 text-rose-800">
                    รายจ่ายต่อเดือนของครอบครัว (7 รายการ)
                  </span>
                  <div className="space-y-1.5 divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">1. ค่าอุปโภคบริโภค/อาหาร:</span>
                      {formatCurrencyOrNotProvided(registry.expenseBreakdown?.living)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">2. ค่าใช้จ่ายเพื่อการศึกษา:</span>
                      {formatCurrencyOrNotProvided(registry.expenseBreakdown?.education)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">3. ค่าใช้จ่ายด้านสุขภาพ:</span>
                      {formatCurrencyOrNotProvided(registry.expenseBreakdown?.healthcare)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">4. ค่าน้ำและค่าไฟ:</span>
                      {formatCurrencyOrNotProvided(registry.expenseBreakdown?.utilities)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">5. ค่าเช่าที่อยู่อาศัย:</span>
                      {formatCurrencyOrNotProvided(registry.expenseBreakdown?.rent)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">6. ค่าใช้จ่ายชำระหนี้:</span>
                      {formatCurrencyOrNotProvided(registry.expenseBreakdown?.debtPayment)}
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">7. รายจ่ายอื่น ๆ:</span>
                      {formatCurrencyOrNotProvided(registry.expenseBreakdown?.otherExpense)}
                    </div>
                  </div>
                  {registry.expenseBreakdown?.otherExpenseNotes && (
                    <p className="text-[11px] text-slate-500 italic mt-1">
                      หมายเหตุรายจ่ายอื่น: {registry.expenseBreakdown.otherExpenseNotes}
                    </p>
                  )}
                </div>

                {/* Group 3: Debts Breakdown */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <span className="font-bold text-slate-900 block pb-1 border-b border-slate-200 text-amber-800">
                    ข้อมูลหนี้สิน
                  </span>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">ประเภทหนี้สิน:</span>
                      <span className="text-slate-900 block font-medium">
                        {registry.debtType || (registry.debtAmount && registry.debtAmount > 0 ? 'หนี้สินเพื่อการยังชีพ' : 'ไม่มีหนี้สิน')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">ยอดหนี้คงเหลือ:</span>
                      {formatCurrencyOrNotProvided(registry.debtAmount)}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">ภาระชำระหนี้ต่อเดือน:</span>
                      {formatCurrencyOrNotProvided(registry.expenseBreakdown?.debtPayment)}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">เจ้าหนี้หรือแหล่งหนี้:</span>
                      <span className="text-slate-900 block">{registry.debtPurpose || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">หมายเหตุ:</span>
                      <span className="text-slate-600 italic block">{registry.debtPurpose || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Editable Economy Form */
              <div className="space-y-4 text-xs">
                {/* Total controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">รายได้รวมต่อเดือน (บาท) *</label>
                    <input
                      type="number"
                      value={editForm.monthlyIncome ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, monthlyIncome: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-800"
                      placeholder="เช่น 12000"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">รายจ่ายรวมต่อเดือน (บาท) *</label>
                    <input
                      type="number"
                      value={editForm.monthlyExpense ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, monthlyExpense: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-rose-800"
                      placeholder="เช่น 14000"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ภาระหนี้สินคงค้าง (บาท)</label>
                    <input
                      type="number"
                      value={editForm.debtAmount ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, debtAmount: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-amber-800"
                      placeholder="ระบุยอดหนี้คงค้าง"
                    />
                  </div>
                </div>

                {/* Income 8 Items Inputs */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">แจกแจงรายได้ 8 กลุ่ม (เว้นว่างได้หากไม่มีข้อมูล)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">1. ค่าจ้าง/เงินเดือน</label>
                      <input
                        type="number"
                        value={editForm.incomeBreakdown?.salary ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          incomeBreakdown: { ...editForm.incomeBreakdown, salary: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">2. สมาชิกครอบครัว</label>
                      <input
                        type="number"
                        value={editForm.incomeBreakdown?.familySupport ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          incomeBreakdown: { ...editForm.incomeBreakdown, familySupport: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">3. ขายผลผลิตเกษตร</label>
                      <input
                        type="number"
                        value={editForm.incomeBreakdown?.agriculture ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          incomeBreakdown: { ...editForm.incomeBreakdown, agriculture: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">4. การค้าขาย</label>
                      <input
                        type="number"
                        value={editForm.incomeBreakdown?.trading ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          incomeBreakdown: { ...editForm.incomeBreakdown, trading: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">5. รายได้ทรัพย์สิน</label>
                      <input
                        type="number"
                        value={editForm.incomeBreakdown?.assetIncome ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          incomeBreakdown: { ...editForm.incomeBreakdown, assetIncome: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">6. อาชีพส่วนตัว</label>
                      <input
                        type="number"
                        value={editForm.incomeBreakdown?.freelance ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          incomeBreakdown: { ...editForm.incomeBreakdown, freelance: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">7. สวัสดิการ/เบี้ยยังชีพ</label>
                      <input
                        type="number"
                        value={editForm.incomeBreakdown?.welfare ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          incomeBreakdown: { ...editForm.incomeBreakdown, welfare: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">8. รายได้อื่น ๆ</label>
                      <input
                        type="number"
                        value={editForm.incomeBreakdown?.otherIncome ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          incomeBreakdown: { ...editForm.incomeBreakdown, otherIncome: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                  </div>
                </div>

                {/* Expenses 7 Items Inputs */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">แจกแจงรายจ่าย 7 กลุ่ม (เว้นว่างได้หากไม่มีข้อมูล)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">1. อุปโภคบริโภค/อาหาร</label>
                      <input
                        type="number"
                        value={editForm.expenseBreakdown?.living ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          expenseBreakdown: { ...editForm.expenseBreakdown, living: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">2. การศึกษาบุตร</label>
                      <input
                        type="number"
                        value={editForm.expenseBreakdown?.education ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          expenseBreakdown: { ...editForm.expenseBreakdown, education: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">3. ค่าใช้จ่ายสุขภาพ/ยา</label>
                      <input
                        type="number"
                        value={editForm.expenseBreakdown?.healthcare ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          expenseBreakdown: { ...editForm.expenseBreakdown, healthcare: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">4. ค่าน้ำ-ไฟ-โทรศัพท์</label>
                      <input
                        type="number"
                        value={editForm.expenseBreakdown?.utilities ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          expenseBreakdown: { ...editForm.expenseBreakdown, utilities: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">5. ค่าเช่าบ้าน/ที่อยู่</label>
                      <input
                        type="number"
                        value={editForm.expenseBreakdown?.rent ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          expenseBreakdown: { ...editForm.expenseBreakdown, rent: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">6. ภาระชำระหนี้/เดือน</label>
                      <input
                        type="number"
                        value={editForm.expenseBreakdown?.debtPayment ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          expenseBreakdown: { ...editForm.expenseBreakdown, debtPayment: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-0.5">7. รายจ่ายอื่น ๆ</label>
                      <input
                        type="number"
                        value={editForm.expenseBreakdown?.otherExpense ?? ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          expenseBreakdown: { ...editForm.expenseBreakdown, otherExpense: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        placeholder="ยังไม่มีข้อมูล"
                      />
                    </div>
                  </div>
                </div>

                {/* Debts edit inputs */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ประเภทหนี้สิน</label>
                    <input
                      type="text"
                      value={editForm.debtType || ''}
                      onChange={(e) => setEditForm({ ...editForm, debtType: e.target.value })}
                      placeholder="เช่น ในระบบ, นอกระบบ, กองทุนหมู่บ้าน"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">เจ้าหนี้หรือแหล่งหนี้</label>
                    <input
                      type="text"
                      value={editForm.debtPurpose || ''}
                      onChange={(e) => setEditForm({ ...editForm, debtPurpose: e.target.value })}
                      placeholder="เช่น ธนาคาร, เพื่อนบ้าน, ค่ารักษาพยาบาล"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.4 สภาพปัจจุบันและข้อจำกัด */}
      {/* ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'limitations') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">1.4 สภาพปัจจุบันและข้อจำกัด</h3>
                <p className="text-[11px] text-slate-500">ความพิการ โรคเรื้อรัง ข้อจำกัดดำรงชีวิต ปัญหาครอบครัว และความเปราะบาง</p>
              </div>
            </div>
            {!isEditing && canEdit && (
              <button
                type="button"
                onClick={() => onStartEdit('limitations')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>แก้ไขสภาพปัจจุบันและข้อจำกัด</span>
              </button>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* PDPA Protected Health Alert */}
            <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
              <span>ข้อมูลสุขภาพและการเจ็บป่วยได้รับการคุ้มครองสิทธิ์ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) แสดงเฉพาะรายการที่มีการบันทึก</span>
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block text-xs">ความพิการ:</span>
                  <p className="text-slate-700">{registry.disabilityNotes || 'ไม่มีบันทึกภาวะความพิการ'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block text-xs">การเจ็บป่วยหรือโรคเรื้อรัง:</span>
                  <p className="text-slate-700">{registry.illnessNotes || 'ไม่มีบันทึกโรคเรื้อรังรุนแรง'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
                  <span className="font-bold text-slate-800 block text-xs">ข้อจำกัดในการดำรงชีวิต:</span>
                  <p className="text-slate-700">{registry.livingLimitations || 'ไม่มีข้อจำกัดพิเศษในการดำรงชีวิต'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block text-xs">ปัญหาครอบครัว:</span>
                  <p className="text-slate-700">{registry.familySituationSummary || 'ไม่มีบันทึกปัญหาครอบครัว'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block text-xs">สภาพที่อยู่อาศัย:</span>
                  <p className="text-slate-700">
                    {registry.housingCondition || 'ปกติ'} {registry.housingNotes ? `(${registry.housingNotes})` : ''}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
                  <span className="font-bold text-slate-800 block text-xs">ความเปราะบางของสมาชิกในครัวเรือน & รายละเอียดเพิ่มเติม:</span>
                  <p className="text-slate-700">{registry.dependentBurdens || registry.urgentNeeds || 'ไม่มีบันทึกเพิ่มเติม'}</p>
                </div>
              </div>
            ) : (
              /* Editable Limitations Form */
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ข้อมูลความพิการ (ถ้ามี)</label>
                  <textarea
                    rows={2}
                    value={editForm.disabilityNotes || ''}
                    onChange={(e) => setEditForm({ ...editForm, disabilityNotes: e.target.value })}
                    placeholder="ระบุความพิการ หรือระบุเลขบัตรคนพิการ..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ข้อมูลโรคเรื้อรัง / การเจ็บป่วย</label>
                  <textarea
                    rows={2}
                    value={editForm.illnessNotes || ''}
                    onChange={(e) => setEditForm({ ...editForm, illnessNotes: e.target.value })}
                    placeholder="ระบุโรคประจำตัว ยาที่ต้องรับประทานต่อเนื่อง หรือข้อจำกัดด้านสุขภาพ..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ข้อจำกัดในการดำรงชีวิต</label>
                  <textarea
                    rows={2}
                    value={editForm.livingLimitations || ''}
                    onChange={(e) => setEditForm({ ...editForm, livingLimitations: e.target.value })}
                    placeholder="ระบุข้อจำกัดในการประกอบอาชีพ หรือการเดินทาง..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">สรุปปัญหาครอบครัวและความเปราะบาง</label>
                  <textarea
                    rows={2}
                    value={editForm.familySituationSummary || ''}
                    onChange={(e) => setEditForm({ ...editForm, familySituationSummary: e.target.value })}
                    placeholder="ระบุสรุปสถานการณ์ความเปราะบางของครัวเรือน..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.5 ความช่วยเหลือจากหน่วยงานอื่น */}
      {/* ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'other_aid') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  1.5 ความช่วยเหลือจากหน่วยงานอื่น ({pastAidList.length} รายการ)
                </h3>
                <p className="text-[11px] text-slate-500">ประวัติการได้รับความช่วยเหลือจากหน่วยงานภายนอก หน่วยงานรัฐ หรือมูลนิธิอื่น</p>
              </div>
            </div>
            {!isEditing && canEdit && (
              <button
                type="button"
                onClick={() => onStartEdit('other_aid')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>แก้ไขความช่วยเหลืออื่น</span>
              </button>
            )}
          </div>

          <div className="p-5">
            {!isEditing ? (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-2.5 px-3">ชื่อหน่วยงาน</th>
                      <th className="py-2.5 px-3">ประเภทความช่วยเหลือ</th>
                      <th className="py-2.5 px-3">รูปแบบ</th>
                      <th className="py-2.5 px-3 text-right">จำนวนเงิน / สิ่งของ</th>
                      <th className="py-2.5 px-3">ปี/วันที่ได้รับ</th>
                      <th className="py-2.5 px-3">เอกสารหลักฐาน</th>
                      <th className="py-2.5 px-3">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastAidList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                          ยังไม่มีประวัติการได้รับความช่วยเหลือจากหน่วยงานอื่น
                        </td>
                      </tr>
                    ) : (
                      pastAidList.map((aid, idx) => (
                        <tr key={aid.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{aid.agency || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{aid.assistanceType || '-'}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {aid.format || (aid.amountOrItems?.includes('บาท') ? 'เงิน' : 'สิ่งของ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">{aid.amountOrItems || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{aid.yearReceived || aid.dateReceived || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{aid.evidenceDoc || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-500 italic">{aid.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Editable external assistance items */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">รายการความช่วยเหลือจากหน่วยงานอื่น</span>
                  <button
                    type="button"
                    onClick={handleAddPastAid}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรายการ</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {pastAidList.map((aid, idx) => (
                    <div key={aid.id || idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">รายการที่ {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePastAid(idx)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบ</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ชื่อหน่วยงาน *</label>
                          <input
                            type="text"
                            value={aid.agency || ''}
                            onChange={(e) => handlePastAidChange(idx, 'agency', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="เช่น พมจ., อบต., มูลนิธิ..."
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ประเภทความช่วยเหลือ</label>
                          <input
                            type="text"
                            value={aid.assistanceType || ''}
                            onChange={(e) => handlePastAidChange(idx, 'assistanceType', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="เช่น เงินสงเคราะห์, ถุงยังชีพ"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">รูปแบบ</label>
                          <select
                            value={aid.format || 'เงิน'}
                            onChange={(e) => handlePastAidChange(idx, 'format', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="เงิน">เงิน</option>
                            <option value="สิ่งของ">สิ่งของ</option>
                            <option value="อื่น ๆ">อื่น ๆ</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">จำนวนเงิน/รายละเอียด</label>
                          <input
                            type="text"
                            value={aid.amountOrItems || ''}
                            onChange={(e) => handlePastAidChange(idx, 'amountOrItems', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="เช่น 3,000 บาท หรือ ถุงยังชีพ 1 ชุด"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ปี/วันที่ได้รับ</label>
                          <input
                            type="text"
                            value={aid.yearReceived || ''}
                            onChange={(e) => handlePastAidChange(idx, 'yearReceived', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="เช่น 2568 หรือ 15/08/2568"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">หมายเหตุ/เอกสารอ้างอิง</label>
                          <input
                            type="text"
                            value={aid.notes || ''}
                            onChange={(e) => handlePastAidChange(idx, 'notes', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                            placeholder="หมายเหตุเพิ่มเติม"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
