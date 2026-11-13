'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Layers,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  Truck,
  ExternalLink,
  Info,
  DollarSign,
  Package,
  Wrench,
  GraduationCap,
  AlertTriangle,
  X,
  Calendar,
} from 'lucide-react';
import { AssistanceFormatDefinition } from '@/types';

interface ExtendedFormatDefinition extends AssistanceFormatDefinition {
  linkedTypeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function AssistanceFormatsTab() {
  const { showToast, currentUser, authToken, getAuthHeaders } = useApp();
  const [formats, setFormats] = useState<ExtendedFormatDefinition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');

  // Detail Modal State
  const [detailFormat, setDetailFormat] = useState<ExtendedFormatDefinition | null>(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addCode, setAddCode] = useState<string>('');
  const [addName, setAddName] = useState<string>('');
  const [addNameEn, setAddNameEn] = useState<string>('');
  const [addDescription, setAddDescription] = useState<string>('');
  const [addDeliveryMethod, setAddDeliveryMethod] = useState<string>('direct_transfer');
  const [addDeliveryMethodLabel, setAddDeliveryMethodLabel] = useState<string>('โอนเงินผ่านระบบธนาคาร');
  const [addRequiresReceipt, setAddRequiresReceipt] = useState<boolean>(true);
  const [addRequiresInspection, setAddRequiresInspection] = useState<boolean>(false);
  const [addSortOrder, setAddSortOrder] = useState<number>(10);
  const [addIsActive, setAddIsActive] = useState<boolean>(true);

  // Delete Confirmation Modal State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ExtendedFormatDefinition | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Edit Modal State
  const [editingFormat, setEditingFormat] = useState<ExtendedFormatDefinition | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formNameEn, setFormNameEn] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDeliveryMethod, setFormDeliveryMethod] = useState<string>('direct_transfer');
  const [formDeliveryMethodLabel, setFormDeliveryMethodLabel] = useState<string>('');
  const [formRequiresReceipt, setFormRequiresReceipt] = useState<boolean>(false);
  const [formRequiresInspection, setFormRequiresInspection] = useState<boolean>(false);
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetAddForm = () => {
    setAddCode('');
    setAddName('');
    setAddNameEn('');
    setAddDescription('');
    setAddDeliveryMethod('direct_transfer');
    setAddDeliveryMethodLabel('โอนเงินผ่านระบบธนาคาร');
    setAddRequiresReceipt(true);
    setAddRequiresInspection(false);
    setAddSortOrder((formats.length || 0) + 1);
    setAddIsActive(true);
  };

  const openAddModal = () => {
    resetAddForm();
    setIsAddModalOpen(true);
  };

  const fetchFormats = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/assistance-formats', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFormats(json.data || []);
      } else {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลรูปแบบการส่งมอบได้');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFormats();
  }, []);

  const openEditModal = (item: ExtendedFormatDefinition) => {
    setEditingFormat(item);
    setFormName(item.name);
    setFormNameEn(item.nameEn || '');
    setFormDescription(item.description || '');
    setFormDeliveryMethod(item.deliveryMethod || 'cash_transfer');
    setFormDeliveryMethodLabel(item.deliveryMethodLabelTh || '');
    setFormRequiresReceipt(Boolean(item.requiresReceipt));
    setFormRequiresInspection(Boolean(item.requiresInspection));
    setFormSortOrder(item.sortOrder || 0);
    setFormIsActive(item.isActive);
  };

  const handleToggleStatus = async (item: ExtendedFormatDefinition) => {
    const nextStatus = !item.isActive;
    try {
      const res = await fetch('/api/admin/assistance-formats', {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          id: item.id,
          code: item.code,
          isActive: nextStatus,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          nextStatus ? `เปิดใช้งานรูปแบบ "${item.name}" สำเร็จ` : `ปิดใช้งานรูปแบบ "${item.name}" สำเร็จ`,
          'success'
        );
        fetchFormats();
      } else {
        throw new Error(json.error || 'ไม่สามารถปรับสถานะได้');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFormat) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/assistance-formats', {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          id: editingFormat.id,
          code: editingFormat.code,
          name: formName.trim(),
          nameEn: formNameEn.trim(),
          description: formDescription.trim(),
          deliveryMethod: formDeliveryMethod,
          deliveryMethodLabelTh: formDeliveryMethodLabel.trim() || undefined,
          requiresReceipt: formRequiresReceipt,
          requiresInspection: formRequiresInspection,
          sortOrder: Number(formSortOrder) || 0,
          isActive: formIsActive,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('ปรับปรุงข้อมูลรูปแบบการช่วยเหลือสำเร็จ', 'success');
        setEditingFormat(null);
        fetchFormats();
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFormat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCode.trim() || !addName.trim()) {
      showToast('กรุณาระบุรหัสและชื่อรูปแบบการช่วยเหลือ', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/assistance-formats', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          code: addCode.trim().toLowerCase(),
          name: addName.trim(),
          nameEn: addNameEn.trim(),
          description: addDescription.trim(),
          deliveryMethod: addDeliveryMethod,
          deliveryMethodLabelTh: addDeliveryMethodLabel.trim() || undefined,
          requiresReceipt: addRequiresReceipt,
          requiresInspection: addRequiresInspection,
          sortOrder: Number(addSortOrder) || 0,
          isActive: addIsActive,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`เพิ่มรูปแบบการช่วยเหลือ "${addName.trim()}" สำเร็จ`, 'success');
        setIsAddModalOpen(false);
        resetAddForm();
        fetchFormats();
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการสร้างรูปแบบการช่วยเหลือ');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFormat = async () => {
    if (!deleteConfirmTarget) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/assistance-formats?id=${deleteConfirmTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`ลบรูปแบบการช่วยเหลือ "${deleteConfirmTarget.name}" สำเร็จ`, 'success');
        setDeleteConfirmTarget(null);
        fetchFormats();
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการลบรูปแบบการช่วยเหลือ');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFormats = formats.filter((f) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText =
        f.name.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        (f.nameEn && f.nameEn.toLowerCase().includes(q)) ||
        (f.description && f.description.toLowerCase().includes(q));
      if (!matchText) return false;
    }
    if (filterMethod !== 'all' && f.deliveryMethod !== filterMethod) {
      return false;
    }
    if (filterActive === 'active' && !f.isActive) return false;
    if (filterActive === 'inactive' && f.isActive) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4 text-teal-700" />
            <span>Master Data: Level 3 Assistance Formats & Delivery Channels</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">รูปแบบและวิธีการส่งมอบความช่วยเหลือ (Assistance Formats)</h2>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดช่องทางและระเบียบปฏิบัติในการส่งมอบความช่วยเหลือ เช่น โอนเงินตรง, มอบสิ่งของ, จัดซื้อวัสดุ, จ่ายตรงผู้ขาย, หรือจ้างผู้รับเหมา
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={openAddModal}
            className="zms-action px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
           aria-label="เพิ่มรูปแบบใหม่" title="เพิ่มรูปแบบใหม่">
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>เพิ่มรูปแบบใหม่</span>
          </button>
          <button
            type="button"
            onClick={fetchFormats}
            className="zms-action p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">รูปแบบทั้งหมด</div>
          <div className="text-2xl font-extrabold text-[#0B2545] mt-1">{formats.length} รูปแบบ</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase">เปิดใช้งานอยู่</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formats.filter((f) => f.isActive).length} รูปแบบ
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase">ต้องมีใบเสร็จ / บิล</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">
            {formats.filter((f) => f.requiresReceipt).length} รูปแบบ
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-sky-600 uppercase">ต้องตรวจรับหน้างาน</div>
          <div className="text-2xl font-extrabold text-sky-700 mt-1">
            {formats.filter((f) => f.requiresInspection).length} รูปแบบ
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อรูปแบบ, รหัส, วิธีการส่งมอบ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
          >
            <option value="all">ทุกวิธีการส่งมอบ</option>
            <option value="direct_transfer">โอนเงินผ่านธนาคาร (direct_transfer)</option>
            <option value="physical_delivery">ส่งมอบถึงมือผู้รับ (physical_delivery)</option>
            <option value="vendor_payment">จ่ายตรงผู้ขาย/ผู้รับเหมา (vendor_payment)</option>
            <option value="training_program">จัดอบรม/หลักสูตร (training_program)</option>
          </select>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">เฉพาะเปิดใช้งาน</option>
            <option value="inactive">เฉพาะปิดใช้งาน</option>
          </select>
        </div>
      </div>

      {/* Formats Table */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-800 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">กำลังโหลดรูปแบบการส่งมอบจากฐานข้อมูล...</p>
        </div>
      ) : filteredFormats.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">ไม่พบรูปแบบการส่งมอบตามเงื่อนไขที่เลือก</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4 w-16 text-center">ลำดับ</th>
                  <th className="py-3 px-4">รหัส / ชื่อรูปแบบการส่งมอบ</th>
                  <th className="py-3 px-4">วิธีการส่งมอบ (Delivery Method)</th>
                  <th className="py-3 px-4 text-center">ข้อกำหนดหลักฐาน</th>
                  <th className="py-3 px-4 text-center">ประเภทที่ผูกใช้</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFormats.map((fmt) => (
                  <tr key={fmt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-500">
                      {fmt.sortOrder || '-'}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {fmt.code}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 mt-1 text-sm">{fmt.name}</div>
                      {fmt.nameEn && <div className="text-[11px] text-slate-400 font-medium">{fmt.nameEn}</div>}
                      {fmt.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-md">
                          {fmt.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-medium text-[11px] inline-flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        <span>{fmt.deliveryMethodLabelTh || fmt.deliveryMethod}</span>
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {fmt.deliveryMethod}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        {fmt.requiresReceipt && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <FileCheck className="w-3 h-3 text-amber-600" />
                            <span>ต้องมีใบเสร็จ</span>
                          </span>
                        )}
                        {fmt.requiresInspection && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-sky-600" />
                            <span>ต้องตรวจรับ</span>
                          </span>
                        )}
                        {!fmt.requiresReceipt && !fmt.requiresInspection && (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {fmt.linkedTypeCount || 0} ประเภท
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(fmt)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                          fmt.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="คลิกเพื่อสลับสถานะเปิด/ปิด"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${fmt.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{fmt.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailFormat(fmt)}
                          className="zms-action p-1.5 rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                          title="ดูรายละเอียดรูปแบบ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(fmt)}
                          className="zms-action p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="แก้ไขรายละเอียดรูปแบบ"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmTarget(fmt)}
                          className="zms-action p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title="ลบรูปแบบการส่งมอบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Format Modal */}
      {editingFormat && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    แก้ไขรูปแบบการส่งมอบ: {editingFormat.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">รหัส: {editingFormat.code}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingFormat(null)}
                className="zms-action w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อรูปแบบการส่งมอบ (ภาษาไทย) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อภาษาอังกฤษ</label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายระเบียบการส่งมอบ</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="รายละเอียดขั้นตอนและเอกสารที่ต้องใช้ในการส่งมอบ..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วิธีการส่งมอบ (System Key)</label>
                  <select
                    value={formDeliveryMethod}
                    onChange={(e) => setFormDeliveryMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  >
                    <option value="direct_transfer">โอนเงินผ่านธนาคาร (direct_transfer)</option>
                    <option value="physical_delivery">ส่งมอบถึงมือผู้รับ (physical_delivery)</option>
                    <option value="vendor_payment">จ่ายตรงผู้ขาย/ผู้รับเหมา (vendor_payment)</option>
                    <option value="training_program">จัดอบรม/หลักสูตร (training_program)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ป้ายกำกับวิธีการส่งมอบ (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={formDeliveryMethodLabel}
                    onChange={(e) => setFormDeliveryMethodLabel(e.target.value)}
                    placeholder="เช่น โอนเงินผ่านระบบธนาคาร"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              </div>

              {/* Requirement Checkboxes */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRequiresReceipt}
                    onChange={(e) => setFormRequiresReceipt(e.target.checked)}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    ต้องมีใบเสร็จรับเงิน / ใบกำกับภาษี หรือหลักฐานการจ่ายเงินเพื่อปิดงาน
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRequiresInspection}
                    onChange={(e) => setFormRequiresInspection(e.target.checked)}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    ต้องมีการตรวจรับหน้างาน หรือบันทึกภาพถ่ายการส่งมอบจริง
                  </span>
                </label>
              </div>

              {/* Sort Order & Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ลำดับการแสดงผล</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานะการใช้งาน</label>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-800"></div>
                    <span className="ml-3 text-xs font-bold text-slate-700">
                      {formIsActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingFormat(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="zms-action px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 active:scale-98 transition-all flex items-center gap-2"
                 aria-label="กำลังบันทึก..." title="กำลังบันทึก...">
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกการแก้ไข</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Format Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center">
                  <Plus className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">เพิ่มรูปแบบการช่วยเหลือใหม่</h3>
                  <p className="text-[11px] text-slate-500">สร้างช่องทางและระเบียบปฏิบัติในการส่งมอบความช่วยเหลือ (Level 3)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="zms-action w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFormat} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสรูปแบบ (Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="เช่น direct_transfer_card"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-400">ใช้ตัวพิมพ์เล็กและขีดล่าง ไม่เว้นวรรค</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อรูปแบบ (ภาษาไทย) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="เช่น โอนผ่านบัตรสวัสดิการ"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อภาษาอังกฤษ</label>
                <input
                  type="text"
                  value={addNameEn}
                  onChange={(e) => setAddNameEn(e.target.value)}
                  placeholder="e.g. Welfare Card Direct Transfer"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายระเบียบการส่งมอบ</label>
                <textarea
                  rows={2}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="รายละเอียดขั้นตอน ระเบียบหลักฐาน และวิธีการส่งมอบความช่วยเหลือ..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วิธีการส่งมอบ (System Key)</label>
                  <select
                    value={addDeliveryMethod}
                    onChange={(e) => {
                      setAddDeliveryMethod(e.target.value);
                      if (e.target.value === 'direct_transfer') setAddDeliveryMethodLabel('โอนเงินผ่านระบบธนาคาร');
                      else if (e.target.value === 'physical_delivery') setAddDeliveryMethodLabel('ส่งมอบสิ่งของถึงมือผู้รับ');
                      else if (e.target.value === 'vendor_payment') setAddDeliveryMethodLabel('ชำระเงินตรงแก่ผู้ขาย/ผู้รับเหมา');
                      else if (e.target.value === 'training_program') setAddDeliveryMethodLabel('จัดหลักสูตรฝึกอบรม/พัฒนาทักษะ');
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  >
                    <option value="direct_transfer">โอนเงินผ่านธนาคาร (direct_transfer)</option>
                    <option value="physical_delivery">ส่งมอบถึงมือผู้รับ (physical_delivery)</option>
                    <option value="vendor_payment">จ่ายตรงผู้ขาย/ผู้รับเหมา (vendor_payment)</option>
                    <option value="training_program">จัดอบรม/หลักสูตร (training_program)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ป้ายกำกับวิธีการส่งมอบ (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={addDeliveryMethodLabel}
                    onChange={(e) => setAddDeliveryMethodLabel(e.target.value)}
                    placeholder="เช่น โอนเงินผ่านระบบธนาคาร"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              </div>

              {/* Requirement Checkboxes */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addRequiresReceipt}
                    onChange={(e) => setAddRequiresReceipt(e.target.checked)}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    ต้องมีใบเสร็จรับเงิน / ใบกำกับภาษี หรือหลักฐานการจ่ายเงินเพื่อปิดงาน
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addRequiresInspection}
                    onChange={(e) => setAddRequiresInspection(e.target.checked)}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    ต้องมีการตรวจรับหน้างาน หรือบันทึกภาพถ่ายการส่งมอบจริง
                  </span>
                </label>
              </div>

              {/* Sort Order & Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ลำดับการแสดงผล</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={addSortOrder}
                    onChange={(e) => setAddSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานะเริ่มต้น</label>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={addIsActive}
                      onChange={(e) => setAddIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-800"></div>
                    <span className="ml-3 text-xs font-bold text-slate-700">
                      {addIsActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="zms-action px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 active:scale-98 transition-all flex items-center gap-2"
                 aria-label="กำลังบันทึก..." title="กำลังบันทึก...">
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>สร้างรูปแบบใหม่</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {detailFormat && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                      {detailFormat.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        detailFormat.isActive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {detailFormat.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{detailFormat.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailFormat(null)}
                className="zms-action w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {detailFormat.nameEn && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">ชื่อภาษาอังกฤษ</div>
                  <div className="text-sm font-medium text-slate-700">{detailFormat.nameEn}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">วิธีการส่งมอบ</div>
                  <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-teal-700" />
                    <span>{detailFormat.deliveryMethodLabelTh || detailFormat.deliveryMethod}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{detailFormat.deliveryMethod}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">ประเภทการช่วยเหลือที่เชื่อมโยง</div>
                  <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{detailFormat.linkedTypeCount || 0} ประเภท</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">ลำดับแสดงผล: {detailFormat.sortOrder || 0}</div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1">คำอธิบายและแนวปฏิบัติ</div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {detailFormat.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">ข้อกำหนดการตรวจรับและหลักฐาน</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white text-xs">
                    <FileCheck className={`w-4 h-4 ${detailFormat.requiresReceipt ? 'text-amber-600' : 'text-slate-300'}`} />
                    <span className={detailFormat.requiresReceipt ? 'font-bold text-slate-800' : 'text-slate-400'}>
                      {detailFormat.requiresReceipt ? 'ต้องแนบใบเสร็จรับเงิน / ใบสำคัญรับเงิน' : 'ไม่ต้องใช้ใบเสร็จ'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white text-xs">
                    <ShieldCheck className={`w-4 h-4 ${detailFormat.requiresInspection ? 'text-sky-600' : 'text-slate-300'}`} />
                    <span className={detailFormat.requiresInspection ? 'font-bold text-slate-800' : 'text-slate-400'}>
                      {detailFormat.requiresInspection ? 'ต้องตรวจรับหน้างาน หรือบันทึกภาพถ่าย' : 'ไม่ต้องตรวจรับหน้างาน'}
                    </span>
                  </div>
                </div>
              </div>

              {(detailFormat.createdAt || detailFormat.updatedAt) && (
                <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>สร้างเมื่อ: {detailFormat.createdAt || '-'}</span>
                  <span>อัปเดตล่าสุด: {detailFormat.updatedAt || '-'}</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailFormat;
                    setDetailFormat(null);
                    openEditModal(target);
                  }}
                  className="zms-action px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center gap-1.5"
                 aria-label="แก้ไขข้อมูลนี้" title="แก้ไขข้อมูลนี้">
                  <Edit className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูลนี้</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailFormat(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="p-6 text-center space-y-4">
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                  (deleteConfirmTarget.linkedTypeCount || 0) > 0
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {(deleteConfirmTarget.linkedTypeCount || 0) > 0 ? (
                  <AlertTriangle className="w-7 h-7" />
                ) : (
                  <Trash2 className="w-7 h-7" />
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {(deleteConfirmTarget.linkedTypeCount || 0) > 0
                    ? 'ไม่สามารถลบรูปแบบนี้ได้ทันที'
                    : `ยืนยันการลบรูปแบบ "${deleteConfirmTarget.name}"?`}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {(deleteConfirmTarget.linkedTypeCount || 0) > 0 ? (
                    <span>
                      รูปแบบนี้มีการเชื่อมโยงกับประเภทการช่วยเหลืออยู่{' '}
                      <strong className="text-amber-800">{deleteConfirmTarget.linkedTypeCount}</strong> รายการ
                      เพื่อความปลอดภัยของข้อมูลระบบ แนะนำให้เปลี่ยนสถานะเป็น{' '}
                      <strong className="text-slate-800">"ปิดใช้งาน"</strong> แทน
                    </span>
                  ) : (
                    <span>
                      คุณแน่ใจหรือไม่ว่าต้องการลบรูปแบบการช่วยเหลือ{' '}
                      <strong className="text-slate-900">{deleteConfirmTarget.name}</strong> ({deleteConfirmTarget.code})?
                      การดำเนินการนี้จะไม่สามารถย้อนกลับได้
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>

                {(deleteConfirmTarget.linkedTypeCount || 0) > 0 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const target = deleteConfirmTarget;
                      setDeleteConfirmTarget(null);
                      await handleToggleStatus(target);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors"
                  >
                    ปิดใช้งานรูปแบบนี้แทน
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteFormat}
                    className="zms-action px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-2"
                   aria-label="กำลังลบ..." title="กำลังลบ...">
                    {isDeleting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังลบ...</span>
                      </>
                    ) : (
                      <span>ยืนยันการลบ</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
