'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  RefreshCw, 
  X,
  ExternalLink,
  ChevronDown,
  Info,
  Check
} from 'lucide-react';
import { AssistanceTypeItem } from '@/types';

interface AssistanceTypesTabProps {
  initialFilterCategory?: string;
}

export function AssistanceTypesTab({ initialFilterCategory }: AssistanceTypesTabProps) {
  const { showToast, currentUser, authToken } = useApp();
  const [types, setTypes] = useState<AssistanceTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>(initialFilterCategory || 'all');
  const [filterPrimary, setFilterPrimary] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingType, setEditingType] = useState<AssistanceTypeItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Status Action Modal (Safe deactivate vs delete)
  const [deactivateModalTarget, setDeactivateModalTarget] = useState<AssistanceTypeItem | null>(null);
  const [deactivateReason, setDeactivateReason] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // Form Fields
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('cash');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formConditions, setFormConditions] = useState<string>('');
  const [formPrimaryGroup, setFormPrimaryGroup] = useState<string>('faqir_miskin');
  const [formSpecificFundId, setFormSpecificFundId] = useState<string>('subf-1');
  const [formFormat, setFormFormat] = useState<string>('one_time');
  const [formMinAmount, setFormMinAmount] = useState<string>('');
  const [formMaxAmount, setFormMaxAmount] = useState<string>('');
  const [formRequiredDocs, setFormRequiredDocs] = useState<string[]>([
    'สำเนาบัตรประจำตัวประชาชน',
    'สำเนาทะเบียนบ้าน',
  ]);
  const [newDocText, setNewDocText] = useState<string>('');
  const [formOrderIndex, setFormOrderIndex] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const fetchTypes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/beneficiaries/assistance-types?includeInactive=true');
      const json = await res.json();
      if (res.ok && json.success) {
        setTypes(json.data || []);
      } else {
        throw new Error(json.error || 'ไม่สามารถโหลดประเภทความช่วยเหลือได้');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    if (initialFilterCategory) {
      setFilterCategory(initialFilterCategory);
    }
  }, [initialFilterCategory]);

  const openAddModal = () => {
    setEditingType(null);
    setFormCode('');
    setFormName('');
    setFormCategory('cash');
    setFormDescription('');
    setFormConditions('');
    setFormPrimaryGroup('faqir_miskin');
    setFormSpecificFundId('subf-1');
    setFormFormat('one_time');
    setFormMinAmount('');
    setFormMaxAmount('');
    setFormRequiredDocs(['สำเนาบัตรประจำตัวประชาชน', 'สำเนาทะเบียนบ้าน']);
    setNewDocText('');
    setFormOrderIndex(types.length + 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: AssistanceTypeItem) => {
    setEditingType(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormCategory(item.category || 'cash');
    setFormDescription(item.description || '');
    setFormConditions(item.conditionsText || '');
    setFormPrimaryGroup(item.primaryGroupCode || 'faqir_miskin');
    setFormSpecificFundId(item.specificFundId || 'subf-1');
    setFormFormat(item.assistanceFormat || 'one_time');
    setFormMinAmount(item.defaultMinAmount ? String(item.defaultMinAmount) : '');
    setFormMaxAmount(item.defaultMaxAmount ? String(item.defaultMaxAmount) : '');
    setFormRequiredDocs(Array.isArray(item.requiredDocuments) ? item.requiredDocuments : []);
    setNewDocText('');
    setFormOrderIndex(item.orderIndex || 0);
    setFormIsActive(item.isActive);
    setIsModalOpen(true);
  };

  const handleAddDoc = () => {
    if (!newDocText.trim()) return;
    if (!formRequiredDocs.includes(newDocText.trim())) {
      setFormRequiredDocs([...formRequiredDocs, newDocText.trim()]);
    }
    setNewDocText('');
  };

  const handleRemoveDoc = (index: number) => {
    setFormRequiredDocs(formRequiredDocs.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('กรุณากรอกชื่อประเภทความช่วยเหลือ', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: editingType?.id,
        code: editingType ? editingType.code : formCode.trim().toUpperCase() || `AID_${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim(),
        conditionsText: formConditions.trim(),
        primaryGroupCode: formPrimaryGroup,
        specificFundId: formSpecificFundId,
        assistanceFormat: formFormat,
        defaultMinAmount: formMinAmount ? Number(formMinAmount) : null,
        defaultMaxAmount: formMaxAmount ? Number(formMaxAmount) : null,
        requiredDocuments: formRequiredDocs,
        orderIndex: Number(formOrderIndex) || 0,
        isActive: formIsActive,
        actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      };

      const endpoint = '/api/beneficiaries/assistance-types';
      const method = editingType ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(editingType ? 'แก้ไขประเภทความช่วยเหลือสำเร็จ' : 'เพิ่มประเภทความช่วยเหลือสำเร็จ', 'success');
        setIsModalOpen(false);
        fetchTypes();
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeStatusChange = async (mode: 'activate' | 'deactivate' | 'delete') => {
    if (!deactivateModalTarget) return;

    try {
      setIsProcessingAction(true);
      const res = await fetch('/api/beneficiaries/assistance-types', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          id: deactivateModalTarget.id,
          mode,
          reason: deactivateReason.trim() || undefined,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          mode === 'activate'
            ? 'เปิดใช้งานประเภทความช่วยเหลือสำเร็จ'
            : mode === 'deactivate'
            ? 'ระงับการใช้งานประเภทความช่วยเหลือสำเร็จ (บันทึกประวัติเรียบร้อย)'
            : 'ลบประเภทความช่วยเหลือสำเร็จ',
          'success'
        );
        setDeactivateModalTarget(null);
        setDeactivateReason('');
        fetchTypes();
      } else {
        throw new Error(json.error || 'ไม่สามารถดำเนินการได้');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const filteredTypes = useMemo(() => {
    return types.filter((t) => {
      if (filterActive === 'active' && !t.isActive) return false;
      if (filterActive === 'inactive' && t.isActive) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterPrimary !== 'all' && t.primaryGroupCode !== filterPrimary) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.conditionsText && t.conditionsText.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [types, filterActive, filterCategory, filterPrimary, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4 text-teal-700" />
            <span>Master Data: Assistance Types ({types.length} รายการจริงในระบบ)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">ประเภทความช่วยเหลือ (Assistance Types)</h2>
          <p className="text-xs text-slate-500 mt-1">
            ศูนย์กลางกำหนดประเภทความช่วยเหลือที่เจ้าหน้าที่เลือกเมื่อยื่นคำร้อง บันทึกการช่วยเหลือ และติดตามผล เชื่อมโยงกับรูปแบบการช่วยเหลือและกองทุน
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchTypes}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-800 text-white font-semibold text-xs shadow-xs hover:bg-teal-900 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มประเภทความช่วยเหลือใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, เงื่อนไข..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Category / Model Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
          >
            <option value="all">รูปแบบทั้งหมด (All Models)</option>
            <option value="cash">เงินสงเคราะห์ (cash)</option>
            <option value="in_kind">สิ่งของ/ยังชีพ (in_kind)</option>
            <option value="housing">ที่อยู่อาศัย (housing)</option>
            <option value="career">ส่งเสริมอาชีพ (career)</option>
            <option value="education">ทุนการศึกษา (education)</option>
            <option value="medical">รักษาพยาบาล (medical)</option>
            <option value="emergency">ฉุกเฉิน (emergency)</option>
            <option value="other">อื่น ๆ (other)</option>
          </select>

          {/* Asnaf / Primary Group Filter */}
          <select
            value={filterPrimary}
            onChange={(e) => setFilterPrimary(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
          >
            <option value="all">หมวดอัสนัฟทั้งหมด</option>
            <option value="faqir_miskin">ฟากีร–มิสกิน (ผู้ยากไร้)</option>
            <option value="muallaf">มุอัลลัฟ</option>
            <option value="gharimin">ฆอริมีน (ผู้มีหนี้สิน)</option>
            <option value="fisabilillah">ฟีสะบีลิลลาฮ์</option>
            <option value="ibnsabil">อิบนุสสะบีล (ผู้เดินทาง)</option>
          </select>

          {/* Active Filter */}
          <select
            value={filterActive}
            onChange={(e: any) => setFilterActive(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="active">เปิดใช้งาน (Active)</option>
            <option value="inactive">ปิดใช้งาน (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Types List Table / Cards */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-800 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">กำลังโหลดรายการประเภทความช่วยเหลือจากฐานข้อมูล...</p>
        </div>
      ) : filteredTypes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">ไม่พบประเภทความช่วยเหลือตามเงื่อนไขที่เลือก</p>
          <p className="text-xs text-slate-500 mt-1">ลองล้างตัวกรอง หรือค้นหาด้วยคำอื่น</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">รหัส / ชื่อประเภทความช่วยเหลือ</th>
                  <th className="py-3 px-4">รูปแบบ (Model)</th>
                  <th className="py-3 px-4">กลุ่มอัสนัฟ / กองทุน</th>
                  <th className="py-3 px-4 text-right">วงเงิน (ขั้นต่ำ - สูงสุด)</th>
                  <th className="py-3 px-4 text-center">คำร้องที่อ้างอิง</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTypes.map((t) => {
                  const hasApps = (t.linkedApplicationCount || 0) > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {t.code}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 mt-1 text-sm">{t.name}</div>
                        {t.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-md">
                            {t.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-medium text-[11px]">
                          {t.category || 'cash'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {t.assistanceFormat === 'monthly' ? 'รายเดือนต่อเนื่อง' : 'เบิกจ่ายครั้งเดียว'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{t.primaryGroupName || t.primaryGroupCode || 'ฟากีร–มิสกิน'}</div>
                        <div className="text-[11px] text-teal-700">{t.specificFundName || t.specificFundCode || '-'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {t.defaultMinAmount || t.defaultMaxAmount ? (
                          <div className="font-semibold text-slate-900">
                            {t.defaultMinAmount ? `${Number(t.defaultMinAmount).toLocaleString()} ` : '0 '}
                            - {t.defaultMaxAmount ? `${Number(t.defaultMaxAmount).toLocaleString()} บาท` : 'ไม่จำกัด'}
                          </div>
                        ) : (
                          <span className="text-slate-400">ตามการประเมิน</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            hasApps ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.linkedApplicationCount || 0} รายการ
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            t.isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {t.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setDeactivateModalTarget(t);
                              setDeactivateReason('');
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              t.isActive
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={t.isActive ? 'ปิดการใช้งานหรือลบ' : 'เปิดการใช้งาน'}
                          >
                            {t.isActive ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingType ? 'แก้ไขประเภทความช่วยเหลือ' : 'เพิ่มประเภทความช่วยเหลือใหม่'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Master Data Configuration (Single Source of Truth)</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสประเภท (Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingType)}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="เช่น LIVING_SUPPORT, HOUSING_REPAIR"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:opacity-60"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อประเภทความช่วยเหลือ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="เช่น ปัจจัยยังชีพ, ทุนการศึกษา"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รูปแบบการช่วยเหลือ (Model)</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  >
                    <option value="cash">เงินสงเคราะห์ (cash)</option>
                    <option value="in_kind">สิ่งของ/ถุงยังชีพ (in_kind)</option>
                    <option value="housing">ที่อยู่อาศัย (housing)</option>
                    <option value="career">ส่งเสริมอาชีพ (career)</option>
                    <option value="education">ทุนการศึกษา (education)</option>
                    <option value="medical">รักษาพยาบาล (medical)</option>
                    <option value="emergency">ฉุกเฉิน (emergency)</option>
                    <option value="other">อื่น ๆ (other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมวดอัสนัฟหลัก</label>
                  <select
                    value={formPrimaryGroup}
                    onChange={(e) => setFormPrimaryGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  >
                    <option value="faqir_miskin">ฟากีร–มิสกิน (ผู้ยากไร้)</option>
                    <option value="muallaf">มุอัลลัฟ</option>
                    <option value="gharimin">ฆอริมีน (ผู้มีหนี้สิน)</option>
                    <option value="fisabilillah">ฟีสะบีลิลลาฮ์</option>
                    <option value="ibnsabil">อิบนุสสะบีล (ผู้เดินทาง)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ลักษณะการให้</label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  >
                    <option value="one_time">ครั้งเดียว (One-time)</option>
                    <option value="monthly">รายเดือนต่อเนื่อง (Monthly)</option>
                    <option value="milestone">ตามงวดงาน/ความคืบหน้า (Milestone)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายรายละเอียด</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="รายละเอียดวัตถุประสงค์และขอบเขตความช่วยเหลือ..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เกณฑ์หรือเงื่อนไขสำคัญ</label>
                <input
                  type="text"
                  value={formConditions}
                  onChange={(e) => setFormConditions(e.target.value)}
                  placeholder="เช่น ต้องเป็นครอบครัวที่มีรายได้น้อยกว่า 3,000 บาท/เดือน"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              {/* Amounts Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วงเงินขั้นต่ำ (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    value={formMinAmount}
                    onChange={(e) => setFormMinAmount(e.target.value)}
                    placeholder="เช่น 1000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วงเงินสูงสุด (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    value={formMaxAmount}
                    onChange={(e) => setFormMaxAmount(e.target.value)}
                    placeholder="เช่น 15000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 bg-white"
                  />
                </div>
              </div>

              {/* Required Documents */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เอกสารที่ต้องแนบ</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newDocText}
                    onChange={(e) => setNewDocText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDoc();
                      }
                    }}
                    placeholder="พิมพ์ชื่อเอกสาร แล้วกดเพิ่ม..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddDoc}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    เพิ่มเอกสาร
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {formRequiredDocs.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 text-teal-900 border border-teal-200 text-xs"
                    >
                      <span>{doc}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(idx)}
                        className="text-teal-700 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 active:scale-98 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>{editingType ? 'บันทึกการแก้ไข' : 'สร้างประเภทใหม่'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / Delete Action Confirmation Modal */}
      {deactivateModalTarget && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {deactivateModalTarget.isActive ? 'ปิดใช้งานหรือลบประเภทความช่วยเหลือ' : 'เปิดใช้งานประเภทความช่วยเหลือ'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{deactivateModalTarget.name} ({deactivateModalTarget.code})</p>
              </div>
            </div>

            {deactivateModalTarget.isActive ? (
              <div className="space-y-3">
                {(deactivateModalTarget.linkedApplicationCount || 0) > 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    <p className="font-bold">⚠️ มีคำร้องอ้างอิงอยู่ {deactivateModalTarget.linkedApplicationCount} รายการ</p>
                    <p className="mt-1">
                      ระบบป้องกันการลบถาวร (Hard Delete) เพื่อรักษาประวัติธุรกรรมเดิม ให้เลือก <strong>&ldquo;ปิดการใช้งาน (Deactivate)&rdquo;</strong> แทน ข้อมูลเก่าจะยังสมบูรณ์ 100% แต่เจ้าหน้าที่จะไม่สามารถเลือกรายการนี้ในคำร้องใหม่ได้
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    ท่านต้องการปิดใช้งาน (Deactivate) หรือลบประเภทความช่วยเหลือนี้ออกจากระบบ?
                  </p>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เหตุผลในการดำเนินการ</label>
                  <input
                    type="text"
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                    placeholder="เช่น ยุบรวมเข้ากับหมวดใหม่ หรือหมดความจำเป็น..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                ท่านต้องการเปิดใช้งานประเภทความช่วยเหลือนี้อีกครั้ง เพื่อให้เจ้าหน้าที่สามารถเลือกใช้งานในระบบได้ใช่หรือไม่?
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeactivateModalTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>

              {deactivateModalTarget.isActive ? (
                <>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => executeStatusChange('deactivate')}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors"
                  >
                    ปิดการใช้งาน (Deactivate)
                  </button>

                  {(deactivateModalTarget.linkedApplicationCount || 0) === 0 && (
                    <button
                      type="button"
                      disabled={isProcessingAction}
                      onClick={() => executeStatusChange('delete')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                    >
                      ลบถาวร
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => executeStatusChange('activate')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                >
                  เปิดใช้งาน (Activate)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

