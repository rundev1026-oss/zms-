'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  HeartHandshake, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Check, 
  X, 
  Layers, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  Package, 
  Home, 
  Briefcase, 
  GraduationCap, 
  Stethoscope, 
  Flame, 
  LifeBuoy,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export interface AssistanceModelItem {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description: string;
  method: 'transfer' | 'delivery' | 'direct_service' | 'voucher' | 'vendor_payment';
  methodLabelTh: string;
  requiresAmount: boolean;
  requiresEvidence: boolean;
  requiresFollowUp: boolean;
  minFollowUpCount: number;
  followUpIntervalDays: number;
  isActive: boolean;
  orderIndex: number;
  linkedTypeCount?: number;
}

interface AssistanceModelsTabProps {
  onNavigateToTypes?: (modelCode?: string) => void;
}

export function AssistanceModelsTab({ onNavigateToTypes }: AssistanceModelsTabProps) {
  const { showToast, currentUser, authToken } = useApp();
  const [models, setModels] = useState<AssistanceModelItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingModel, setEditingModel] = useState<AssistanceModelItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formNameEn, setFormNameEn] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formMethod, setFormMethod] = useState<'transfer' | 'delivery' | 'direct_service' | 'voucher' | 'vendor_payment'>('transfer');
  const [formMethodLabel, setFormMethodLabel] = useState<string>('โอนเงินเข้าบัญชีธนาคาร');
  const [formRequiresAmount, setFormRequiresAmount] = useState<boolean>(true);
  const [formRequiresEvidence, setFormRequiresEvidence] = useState<boolean>(true);
  const [formRequiresFollowUp, setFormRequiresFollowUp] = useState<boolean>(true);
  const [formMinFollowUp, setFormMinFollowUp] = useState<number>(1);
  const [formIntervalDays, setFormIntervalDays] = useState<number>(90);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/assistance-models?includeInactive=true');
      const json = await res.json();
      if (res.ok && json.success) {
        setModels(json.data || []);
      } else {
        throw new Error(json.error || 'ไม่สามารถดึงข้อมูลรูปแบบการช่วยเหลือได้');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const openAddModal = () => {
    setEditingModel(null);
    setFormCode('');
    setFormName('');
    setFormNameEn('');
    setFormDesc('');
    setFormMethod('transfer');
    setFormMethodLabel('โอนเงินเข้าบัญชีธนาคาร');
    setFormRequiresAmount(true);
    setFormRequiresEvidence(true);
    setFormRequiresFollowUp(true);
    setFormMinFollowUp(1);
    setFormIntervalDays(90);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: AssistanceModelItem) => {
    setEditingModel(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormNameEn(item.nameEn || '');
    setFormDesc(item.description);
    setFormMethod(item.method);
    setFormMethodLabel(item.methodLabelTh);
    setFormRequiresAmount(item.requiresAmount);
    setFormRequiresEvidence(item.requiresEvidence);
    setFormRequiresFollowUp(item.requiresFollowUp);
    setFormMinFollowUp(item.minFollowUpCount);
    setFormIntervalDays(item.followUpIntervalDays);
    setFormIsActive(item.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('กรุณากรอกชื่อรูปแบบการช่วยเหลือ', 'error');
      return;
    }
    if (!editingModel && !formCode.trim()) {
      showToast('กรุณากรอกรหัสรูปแบบการช่วยเหลือ (ภาษาอังกฤษ)', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: editingModel?.id,
        code: editingModel ? editingModel.code : formCode.trim().toLowerCase(),
        name: formName.trim(),
        nameEn: formNameEn.trim(),
        description: formDesc.trim(),
        method: formMethod,
        methodLabelTh: formMethodLabel.trim() || 'ตามระเบียบมูลนิธิ',
        requiresAmount: formRequiresAmount,
        requiresEvidence: formRequiresEvidence,
        requiresFollowUp: formRequiresFollowUp,
        minFollowUpCount: formRequiresFollowUp ? Number(formMinFollowUp) : 0,
        followUpIntervalDays: formRequiresFollowUp ? Number(formIntervalDays) : 0,
        isActive: formIsActive,
        actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      };

      const endpoint = '/api/admin/assistance-models';
      const method = editingModel ? 'PUT' : 'POST';

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
        showToast(editingModel ? 'แก้ไขรูปแบบการช่วยเหลือสำเร็จ' : 'เพิ่มรูปแบบการช่วยเหลือใหม่สำเร็จ', 'success');
        setIsModalOpen(false);
        fetchModels();
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (item: AssistanceModelItem) => {
    try {
      const res = await fetch('/api/admin/assistance-models', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          id: item.id,
          code: item.code,
          isActive: !item.isActive,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`${!item.isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}รูปแบบ '${item.name}' สำเร็จ`, 'success');
        fetchModels();
      } else {
        throw new Error(json.error || 'ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getModelIcon = (code: string) => {
    switch (code) {
      case 'cash': return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case 'in_kind': return <Package className="w-5 h-5 text-amber-600" />;
      case 'housing': return <Home className="w-5 h-5 text-blue-600" />;
      case 'career': return <Briefcase className="w-5 h-5 text-purple-600" />;
      case 'education': return <GraduationCap className="w-5 h-5 text-indigo-600" />;
      case 'medical': return <Stethoscope className="w-5 h-5 text-rose-600" />;
      case 'emergency': return <Flame className="w-5 h-5 text-red-600" />;
      default: return <LifeBuoy className="w-5 h-5 text-teal-600" />;
    }
  };

  const filteredModels = useMemo(() => {
    return models.filter(m => {
      if (filterActive === 'active' && !m.isActive) return false;
      if (filterActive === 'inactive' && m.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          (m.nameEn && m.nameEn.toLowerCase().includes(q)) ||
          m.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [models, filterActive, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Action */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
            <HeartHandshake className="w-4 h-4 text-teal-700" />
            <span>Master Data: Assistance Models</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">รูปแบบการช่วยเหลือ (Assistance Models)</h2>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดกรอบแนวทางและเงื่อนไขหลักในการให้ความช่วยเหลือของมูลนิธิ เช่น การช่วยเหลือเป็นตัวเงิน สิ่งของ ซ่อมสร้างที่อยู่อาศัย และการศึกษา
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchModels}
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
            <span>เพิ่มรูปแบบการช่วยเหลือใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, คำอธิบาย..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
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

      {/* Models Grid Cards */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-800 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">กำลังโหลดรูปแบบการช่วยเหลือจาก Master Data...</p>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">ไม่พบรูปแบบการช่วยเหลือที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือกดเพิ่มรูปแบบการช่วยเหลือใหม่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModels.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                item.isActive ? 'border-slate-200/90 hover:border-teal-400' : 'border-slate-200 bg-slate-50/70 opacity-80'
              }`}
            >
              <div className="space-y-4">
                {/* Header Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                      {getModelIcon(item.code)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {item.code}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            item.isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {item.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">{item.name}</h3>
                      {item.nameEn && <p className="text-[11px] text-slate-500">{item.nameEn}</p>}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  {item.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                </p>

                {/* Attributes Pills */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 py-1 border-b border-slate-100">
                    <span className="text-slate-500">วิธีดำเนินการ:</span>
                    <span className="font-semibold text-slate-800">{item.methodLabelTh}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 py-1 border-b border-slate-100">
                    <span className="text-slate-500">ต้องระบุจำนวนเงิน:</span>
                    <span className={`font-semibold ${item.requiresAmount ? 'text-teal-800' : 'text-slate-500'}`}>
                      {item.requiresAmount ? 'ต้องระบุวงเงิน' : 'ไม่ระบุวงเงิน (สิ่งของ)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 py-1 border-b border-slate-100">
                    <span className="text-slate-500">การติดตามผล:</span>
                    <span className="font-semibold text-slate-800">
                      {item.requiresFollowUp
                        ? `อย่างน้อย ${item.minFollowUpCount} ครั้ง (ทุก ${item.followUpIntervalDays} วัน)`
                        : 'ไม่ต้องติดตามผล'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 py-1">
                    <span className="text-slate-500">ประเภทที่เชื่อมโยง:</span>
                    <button
                      type="button"
                      onClick={() => onNavigateToTypes && onNavigateToTypes(item.code)}
                      className="font-bold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1 hover:underline"
                    >
                      <span>{item.linkedTypeCount || 0} ประเภท</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleStatus(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    item.isActive
                      ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {item.isActive ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                </button>

                <button
                  onClick={() => openEditModal(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูล</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingModel ? 'แก้ไขรูปแบบการช่วยเหลือ' : 'เพิ่มรูปแบบการช่วยเหลือใหม่'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Single Source of Truth Configuration</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสรูปแบบ (Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingModel)}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="เช่น cash, housing, career"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:opacity-60"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อภาษาไทย <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="เช่น เงินสงเคราะห์และการเงิน"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อภาษาอังกฤษ (Optional)</label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="เช่น Financial Assistance & Cash Grants"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายและแนวทางปฏิบัติ</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="รายละเอียดแนวทางการให้ความช่วยเหลือ กลุ่มเป้าหมาย หรือวัตถุประสงค์..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วิธีดำเนินการส่งมอบ</label>
                  <select
                    value={formMethod}
                    onChange={(e: any) => {
                      setFormMethod(e.target.value);
                      if (e.target.value === 'transfer') setFormMethodLabel('โอนเงินเข้าบัญชีธนาคาร');
                      else if (e.target.value === 'delivery') setFormMethodLabel('ส่งมอบสิ่งของ/ถุงยังชีพถึงมือ');
                      else if (e.target.value === 'vendor_payment') setFormMethodLabel('ชำระตรงร้านค้า/ผู้รับเหมา');
                      else if (e.target.value === 'direct_service') setFormMethodLabel('ดำเนินการช่วยเหลือโดยตรง');
                      else setFormMethodLabel('คูปอง/บัตรกำนัล');
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  >
                    <option value="transfer">โอนเงินเข้าบัญชีธนาคาร (transfer)</option>
                    <option value="delivery">ส่งมอบสิ่งของ/ถุงยังชีพ (delivery)</option>
                    <option value="vendor_payment">ชำระตรงร้านค้า/ผู้รับเหมา (vendor_payment)</option>
                    <option value="direct_service">ดำเนินการบริการโดยตรง (direct_service)</option>
                    <option value="voucher">คูปอง/สวัสดิการ (voucher)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ข้อความแสดงวิธีส่งมอบ</label>
                  <input
                    type="text"
                    value={formMethodLabel}
                    onChange={(e) => setFormMethodLabel(e.target.value)}
                    placeholder="เช่น โอนเงินเข้าบัญชีธนาคาร"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRequiresAmount}
                    onChange={(e) => setFormRequiresAmount(e.target.checked)}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span className="text-xs text-slate-700">ต้องระบุจำนวนเงิน</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRequiresEvidence}
                    onChange={(e) => setFormRequiresEvidence(e.target.checked)}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span className="text-xs text-slate-700">ต้องแนบหลักฐาน</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRequiresFollowUp}
                    onChange={(e) => setFormRequiresFollowUp(e.target.checked)}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span className="text-xs text-slate-700">ต้องมีการติดตามผล</span>
                </label>
              </div>

              {/* Follow-up condition inputs */}
              {formRequiresFollowUp && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนครั้งขั้นต่ำในการติดตาม</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={formMinFollowUp}
                      onChange={(e) => setFormMinFollowUp(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">รอบระยะเวลาติดตามผล (วัน)</label>
                    <input
                      type="number"
                      min={7}
                      max={365}
                      value={formIntervalDays}
                      onChange={(e) => setFormIntervalDays(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 bg-white"
                    />
                  </div>
                </div>
              )}

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
                    <span>{editingModel ? 'บันทึกการแก้ไข' : 'สร้างรูปแบบใหม่'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

