'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye,
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
  const { showToast, currentUser, authToken, getAuthHeaders } = useApp();
  const [types, setTypes] = useState<AssistanceTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>(initialFilterCategory || 'all');
  const [filterPrimary, setFilterPrimary] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [detailType, setDetailType] = useState<AssistanceTypeItem | null>(null);
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
  const [formAllowedAsnafs, setFormAllowedAsnafs] = useState<string[]>(['faqir', 'miskin']);
  const [formAllowedFormats, setFormAllowedFormats] = useState<string[]>(['fmt-bank-transfer']);
  const [availableFormats, setAvailableFormats] = useState<any[]>([]);

  const fetchTypes = async () => {
    try {
      setIsLoading(true);
      const [resTypes, resFormats] = await Promise.all([
        fetch('/api/beneficiaries/assistance-types?includeInactive=true', {
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
        fetch('/api/admin/assistance-formats', {
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
      ]);
      const jsonTypes = await resTypes.json();
      if (resTypes.ok && jsonTypes.success) {
        setTypes(jsonTypes.data || []);
      }
      try {
        const jsonFormats = await resFormats.json();
        if (resFormats.ok && jsonFormats.success) {
          setAvailableFormats(jsonFormats.data || []);
        }
      } catch {}
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
    setFormAllowedAsnafs(['faqir', 'miskin']);
    setFormAllowedFormats(['fmt-bank-transfer']);
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
    setFormAllowedAsnafs(
      item.allowedAsnafCodes && item.allowedAsnafCodes.length > 0
        ? [...item.allowedAsnafCodes]
        : [item.primaryGroupCode || 'faqir']
    );
    setFormAllowedFormats(
      item.formats && item.formats.length > 0
        ? item.formats.map((f: any) => f.id)
        : ['fmt-cash-one-time']
    );
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
        allowedAsnafCodes: formAllowedAsnafs,
        allowedFormatIds: formAllowedFormats,
        formatIds: formAllowedFormats,
        actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
      };

      const endpoint = '/api/beneficiaries/assistance-types';
      const method = editingType ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
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
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          id: deactivateModalTarget.id,
          mode,
          reason: deactivateReason.trim() || undefined,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
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

                        {/* Supported Asnafs & Formats Tags */}
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {t.allowedAsnafCodes && t.allowedAsnafCodes.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] text-teal-800 font-bold bg-teal-100/60 px-1 rounded">อัสนัฟ:</span>
                              {t.allowedAsnafCodes.map((ac: string) => {
                                const labelMap: Record<string, string> = {
                                  faqir: 'ฟากีร',
                                  miskin: 'มิสกีน',
                                  amil: 'อามิลีน',
                                  muallaf: 'มุอัลลัฟ',
                                  riqab: 'ริกอบ',
                                  gharimin: 'หนี้สิน',
                                  fisabilillah: 'ฟีสะบีลฯ',
                                  ibnsabil: 'ผู้เดินทาง',
                                };
                                return (
                                  <span key={ac} className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                                    {labelMap[ac] || ac}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {t.formats && t.formats.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 ml-1 pl-1 border-l border-slate-200">
                              <span className="text-[10px] text-sky-800 font-bold bg-sky-100/60 px-1 rounded">รูปแบบ:</span>
                              {t.formats.map((f: any) => (
                                <span key={f.code || f.id} className="px-1.5 py-0.2 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-200">
                                  {f.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
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
                            type="button"
                            onClick={() => setDetailType(t)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                            title="ดูรายละเอียดประเภทการช่วยเหลือ"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

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

              {/* Supported Asnafs (Multi-select) */}
              <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-teal-900">
                    หมวดหมู่อัสนัฟที่รองรับ (Supported Asnafs) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-teal-700 font-medium">
                    เลือกอย่างน้อย 1 หมวดหมู่ (Level 1 ↔ Level 2)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { code: 'faqir', label: 'ฟากีร (ผู้ยากไร้)' },
                    { code: 'miskin', label: 'มิสกีน (คนขัดสน)' },
                    { code: 'amil', label: 'อามิลีน' },
                    { code: 'muallaf', label: 'มุอัลลัฟ' },
                    { code: 'riqab', label: 'ริกอบ / มนุษยธรรม' },
                    { code: 'gharimin', label: 'ผู้มีหนี้สินล้นตัว' },
                    { code: 'fisabilillah', label: 'ฟีสะบีลิลลาฮ์' },
                    { code: 'ibnsabil', label: 'อิบนุสสะบีล (ผู้เดินทาง)' },
                  ].map((asnaf) => {
                    const isChecked = formAllowedAsnafs.includes(asnaf.code);
                    return (
                      <label
                        key={asnaf.code}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-teal-700 text-white border-teal-700 font-bold shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAllowedAsnafs([...formAllowedAsnafs, asnaf.code]);
                            } else {
                              if (formAllowedAsnafs.length <= 1) {
                                showToast('ต้องมีหมวดหมู่อัสนัฟรองรับอย่างน้อย 1 หมวด', 'error');
                                return;
                              }
                              setFormAllowedAsnafs(formAllowedAsnafs.filter((c) => c !== asnaf.code));
                            }
                          }}
                          className="sr-only"
                        />
                        <span className="text-[11px] truncate">{asnaf.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Supported Delivery Formats (Multi-select) */}
              <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-sky-950">
                    รูปแบบการส่งมอบที่รองรับ (Supported Delivery Formats)
                  </label>
                  <span className="text-[10px] text-sky-800 font-medium">
                    Level 2 ↔ Level 3 Assistance Formats
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(availableFormats.length > 0
                    ? availableFormats
                    : [
                        { id: 'fmt-bank-transfer', name: 'โอนเงินผ่านระบบธนาคาร' },
                        { id: 'fmt-cash', name: 'เงินสดพร้อมใบสำคัญ' },
                        { id: 'fmt-in-kind', name: 'มอบสิ่งของ/ถุงยังชีพ' },
                        { id: 'fmt-materials', name: 'จัดซื้อวัสดุอุปกรณ์' },
                        { id: 'fmt-vendor-direct', name: 'จ่ายตรงผู้ขาย/เจ้าหนี้' },
                        { id: 'fmt-contractor', name: 'จ้างเหมาผู้รับเหมา' },
                        { id: 'fmt-scholarship', name: 'มอบทุนการศึกษา' },
                        { id: 'fmt-training', name: 'จัดอบรมพัฒนาทักษะ' },
                        { id: 'fmt-career-equipment', name: 'อุปกรณ์ประกอบอาชีพ' },
                      ]
                  ).map((fmt: any) => {
                    const isChecked = formAllowedFormats.includes(fmt.id);
                    return (
                      <label
                        key={fmt.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-sky-800 text-white border-sky-800 font-bold shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAllowedFormats([...formAllowedFormats, fmt.id]);
                            } else {
                              setFormAllowedFormats(formAllowedFormats.filter((id) => id !== fmt.id));
                            }
                          }}
                          className="sr-only"
                        />
                        <span className="text-[11px] truncate">{fmt.name}</span>
                      </label>
                    );
                  })}
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

      {/* View Detail Modal */}
      {detailType && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                      {detailType.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        detailType.isActive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {detailType.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {detailType.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{detailType.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailType(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">วงเงินช่วยเหลือ</div>
                  <div className="text-sm font-black text-emerald-700 mt-1">
                    {detailType.defaultMinAmount != null || detailType.defaultMaxAmount != null ? (
                      <>
                        {detailType.defaultMinAmount ? `${detailType.defaultMinAmount.toLocaleString()} - ` : 'สูงสุด '}
                        {detailType.defaultMaxAmount ? `${detailType.defaultMaxAmount.toLocaleString()} บาท` : 'ไม่จำกัด'}
                      </>
                    ) : (
                      'ตามการพิจารณา'
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">งบประมาณต่อคำร้อง</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">กลุ่มอัสนัฟหลัก</div>
                  <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                    <span>{detailType.primaryGroupName || detailType.primaryGroupCode || (detailType as any).primaryAsnafGroup || 'faqir_miskin'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">กองทุน: {detailType.specificFundName || detailType.specificFundId || 'subf-1'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">คำร้องที่เกี่ยวข้อง</div>
                  <div className="text-sm font-black text-sky-800 mt-1">
                    {detailType.linkedApplicationCount || 0} รายการ
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">ลำดับแสดงผล: {detailType.orderIndex || 0}</div>
                </div>
              </div>

              {/* Allowed Asnafs */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">หมวดหมู่อัสนัฟที่ได้รับสิทธิ์ (Level 1)</div>
                <div className="flex flex-wrap gap-1.5">
                  {(detailType.allowedAsnafs || (detailType as any).allowedAsnafCodes || []).map((asnaf: string) => (
                    <span
                      key={asnaf}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                    >
                      {asnaf}
                    </span>
                  ))}
                  {(!detailType.allowedAsnafs || detailType.allowedAsnafs.length === 0) && (
                    <span className="text-xs text-slate-400">ยังไม่ได้กำหนดอัสนัฟ</span>
                  )}
                </div>
              </div>

              {/* Allowed Formats */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">รูปแบบการส่งมอบที่อนุญาต (Level 3 Formats)</div>
                <div className="flex flex-wrap gap-1.5">
                  {((detailType as any).allowedFormats || detailType.supportedFormats?.map(f => f.name || f.code) || detailType.formats?.map(f => f.name || f.code) || []).map((fmt: string) => (
                    <span
                      key={fmt}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-sky-50 text-sky-800 border border-sky-200"
                    >
                      {fmt}
                    </span>
                  ))}
                  {!((detailType as any).allowedFormats?.length || detailType.supportedFormats?.length || detailType.formats?.length) && (
                    <span className="text-xs text-slate-400">ยังไม่ได้ผูกรูปแบบการส่งมอบ</span>
                  )}
                </div>
              </div>

              {/* Description & Conditions */}
              {detailType.description && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">คำอธิบายและวัตถุประสงค์</div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    {detailType.description}
                  </div>
                </div>
              )}

              {(detailType.conditionsText || (detailType as any).conditions) && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">เงื่อนไขและเกณฑ์การพิจารณา</div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    {detailType.conditionsText || (detailType as any).conditions}
                  </div>
                </div>
              )}

              {/* Required Documents */}
              {detailType.requiredDocuments && detailType.requiredDocuments.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">เอกสารประกอบที่ต้องแนบ</div>
                  <div className="space-y-1.5">
                    {detailType.requiredDocuments.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium"
                      >
                        <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailType;
                    setDetailType(null);
                    openEditModal(target);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูลนี้</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailType(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

