'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Bookmark, 
  Search, 
  Edit, 
  Eye,
  Check, 
  X, 
  Layers, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  RefreshCw, 
  Info,
  BookOpen,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export interface AsnafMasterItem {
  id: string;
  code: string;
  nameTh: string;
  nameAr?: string;
  nameEn?: string;
  description: string;
  criteria: string[];
  requiredDocuments: string[];
  allowedFormats: string[];
  sortOrder: number;
  isActive: boolean;
  linkedTypeCount?: number;
}

interface AsnafManagementTabProps {
  onNavigateToTypes?: (asnafCode?: string) => void;
  onNavigateToMatrix?: (asnafCode?: string) => void;
}

export function AsnafManagementTab({ onNavigateToTypes, onNavigateToMatrix }: AsnafManagementTabProps) {
  const { showToast, currentUser, authToken, getAuthHeaders } = useApp();
  const [asnafs, setAsnafs] = useState<AsnafMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Detail Modal State
  const [detailAsnaf, setDetailAsnaf] = useState<AsnafMasterItem | null>(null);

  // Edit Modal State
  const [editingAsnaf, setEditingAsnaf] = useState<AsnafMasterItem | null>(null);
  const [formNameTh, setFormNameTh] = useState<string>('');
  const [formNameAr, setFormNameAr] = useState<string>('');
  const [formNameEn, setFormNameEn] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formCriteria, setFormCriteria] = useState<string[]>([]);
  const [newCriteriaText, setNewCriteriaText] = useState<string>('');
  const [formDocs, setFormDocs] = useState<string[]>([]);
  const [newDocText, setNewDocText] = useState<string>('');
  const [formFormats, setFormFormats] = useState<string[]>([]);
  const [newFormatText, setNewFormatText] = useState<string>('');
  const [formSortOrder, setFormSortOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchAsnafs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/asnaf', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAsnafs(json.data || []);
      } else {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลหมวดหมู่อัสนัฟได้');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAsnafs();
  }, []);

  const openEditModal = (item: AsnafMasterItem) => {
    setEditingAsnaf(item);
    setFormNameTh(item.nameTh);
    setFormNameAr(item.nameAr || '');
    setFormNameEn(item.nameEn || '');
    setFormDesc(item.description);
    setFormCriteria(Array.isArray(item.criteria) ? [...item.criteria] : []);
    setFormDocs(Array.isArray(item.requiredDocuments) ? [...item.requiredDocuments] : []);
    setFormFormats(Array.isArray(item.allowedFormats) ? [...item.allowedFormats] : []);
    setFormSortOrder(item.sortOrder || 1);
    setFormIsActive(item.isActive !== false);
    setNewCriteriaText('');
    setNewDocText('');
    setNewFormatText('');
  };

  const handleQuickToggle = async (item: AsnafMasterItem) => {
    const nextStatus = !item.isActive;
    try {
      const res = await fetch('/api/admin/asnaf', {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          code: item.code,
          isActive: nextStatus,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          nextStatus ? `เปิดใช้งานหมวด ${item.nameTh} สำเร็จ` : `ปิดการใช้งานหมวด ${item.nameTh} สำเร็จ`,
          'success'
        );
        fetchAsnafs();
      } else {
        throw new Error(json.error || 'ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddCriteria = () => {
    if (!newCriteriaText.trim()) return;
    setFormCriteria([...formCriteria, newCriteriaText.trim()]);
    setNewCriteriaText('');
  };

  const handleAddDoc = () => {
    if (!newDocText.trim()) return;
    setFormDocs([...formDocs, newDocText.trim()]);
    setNewDocText('');
  };

  const handleAddFormat = () => {
    if (!newFormatText.trim()) return;
    setFormFormats([...formFormats, newFormatText.trim()]);
    setNewFormatText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsnaf) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/asnaf', {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          code: editingAsnaf.code,
          nameTh: formNameTh.trim(),
          nameAr: formNameAr.trim(),
          nameEn: formNameEn.trim(),
          description: formDesc.trim(),
          criteria: formCriteria,
          requiredDocuments: formDocs,
          allowedFormats: formFormats,
          sortOrder: Number(formSortOrder) || 1,
          isActive: formIsActive,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('บันทึกข้อมูลหมวดหมู่อัสนัฟสำเร็จ', 'success');
        setEditingAsnaf(null);
        fetchAsnafs();
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAsnafs = asnafs.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.nameTh.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      (a.nameAr && a.nameAr.toLowerCase().includes(q)) ||
      (a.nameEn && a.nameEn.toLowerCase().includes(q)) ||
      a.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
            <Bookmark className="w-4 h-4 text-teal-700" />
            <span>Master Data: The 8 Asnaf Categories (Quran 9:60)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">หมวดหมู่ผู้มีสิทธิ์รับซะกาต (อัสนัฟ - Asnaf Master Data)</h2>
          <p className="text-xs text-slate-500 mt-1">
            ศูนย์กลางการบริหารข้อมูล 8 หมวดหมู่อัสนัฟตามบทบัญญัติศาสนา กำหนดหลักเกณฑ์การพิจารณา เอกสารประกอบ และรูปแบบการช่วยเหลือที่อนุญาต
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchAsnafs}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่ออัสนัฟ, ภาษาอาหรับ, รายละเอียด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          ทั้งหมด 8 หมวดหมู่อัสนัฟตามบทบัญญัติ
        </div>
      </div>

      {/* Asnafs List Cards */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-800 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">กำลังโหลดหมวดหมู่อัสนัฟจากฐานข้อมูล...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredAsnafs.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-teal-400 hover:shadow-md transition-all space-y-4"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-800 text-white font-bold text-xs flex items-center justify-center">
                        {item.sortOrder || idx + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                      <span className="text-xs font-bold text-teal-900 font-arabic text-sm px-2 py-0.5 bg-teal-50 rounded border border-teal-200">
                        {item.nameAr || '-'}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 mt-2">{item.nameTh}</h3>
                    {item.nameEn && <p className="text-xs text-slate-500 font-medium">{item.nameEn}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickToggle(item)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                        item.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                      title="คลิกเพื่อสลับสถานะเปิด/ปิดการใช้งาน"
                    >
                      <span className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{item.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailAsnaf(item)}
                      className="p-2 rounded-xl text-teal-800 bg-teal-50 hover:bg-teal-100 transition-colors"
                      title="ดูรายละเอียดหมวดหมู่อัสนัฟ"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                      title="แก้ไขเกณฑ์และรายละเอียด"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {item.description}
                </p>

                {/* Criteria Pills */}
                {item.criteria && item.criteria.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                      <span>หลักเกณฑ์การพิจารณาเบื้องต้น:</span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-1">
                      {item.criteria.map((c, cIdx) => (
                        <li key={cIdx} className="line-clamp-1">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Documents List */}
                {item.requiredDocuments && item.requiredDocuments.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>เอกสารประกอบการพิจารณา:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.requiredDocuments.map((d, dIdx) => (
                        <span key={dIdx} className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span>ความสัมพันธ์:</span>
                  <button
                    type="button"
                    onClick={() => onNavigateToTypes && onNavigateToTypes(item.code)}
                    className="font-bold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1 hover:underline"
                  >
                    <span>{item.linkedTypeCount || 0} ประเภท</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                {onNavigateToMatrix && (
                  <button
                    type="button"
                    onClick={() => onNavigateToMatrix(item.code)}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                  >
                    <span>เปิดดูใน Matrix</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Asnaf Modal */}
      {editingAsnaf && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    แก้ไขข้อมูลหมวดหมู่อัสนัฟ: {editingAsnaf.nameTh}
                  </h3>
                  <p className="text-[11px] text-slate-500">รหัสหมวด: {editingAsnaf.code}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAsnaf(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อภาษาไทย</label>
                  <input
                    type="text"
                    value={formNameTh}
                    onChange={(e) => setFormNameTh(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อภาษาอาหรับ</label>
                  <input
                    type="text"
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 font-arabic"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายและนิยามตามหลักศาสนา</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ลำดับการแสดงผล (Sort Order)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">กำหนดลำดับการจัดเรียงในระบบและรายงาน</p>
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
                      {formIsActive ? 'เปิดใช้งาน (Active)' : 'ระงับการใช้งาน (Inactive)'}
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-1">เมื่อปิดใช้งาน จะไม่ปรากฏในแบบฟอร์มขอรับความช่วยเหลือใหม่</p>
                </div>
              </div>

              {/* Criteria List Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หลักเกณฑ์การพิจารณา</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newCriteriaText}
                    onChange={(e) => setNewCriteriaText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCriteria();
                      }
                    }}
                    placeholder="พิมพ์เกณฑ์ แล้วกดเพิ่ม..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddCriteria}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    เพิ่มเกณฑ์
                  </button>
                </div>
                <div className="space-y-1">
                  {formCriteria.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <span>• {c}</span>
                      <button
                        type="button"
                        onClick={() => setFormCriteria(formCriteria.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents List Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เอกสารประกอบ</label>
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
                  {formDocs.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 text-teal-900 border border-teal-200 text-xs"
                    >
                      <span>{doc}</span>
                      <button
                        type="button"
                        onClick={() => setFormDocs(formDocs.filter((_, i) => i !== idx))}
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
                  onClick={() => setEditingAsnaf(null)}
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
                    <span>บันทึกการแก้ไข</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Asnaf Detail Modal */}
      {detailAsnaf && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shadow-xs">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                      {detailAsnaf.code}
                    </span>
                    <span className="text-xs font-bold text-teal-900 font-arabic px-2 py-0.5 bg-teal-50 rounded border border-teal-200">
                      {detailAsnaf.nameAr || '-'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        detailAsnaf.isActive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {detailAsnaf.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{detailAsnaf.nameTh}</h3>
                  {detailAsnaf.nameEn && <p className="text-xs text-slate-500 font-medium">{detailAsnaf.nameEn}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailAsnaf(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">ลำดับการจัดสรรตามหลักชะรีอะฮ์</div>
                  <div className="text-sm font-black text-teal-900 mt-1">
                    ลำดับที่ {detailAsnaf.sortOrder || 1}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">8 กลุ่มผู้มีสิทธิ์รับซะกาต</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">ประเภทการช่วยเหลือที่เชื่อมโยง</div>
                  <div className="text-sm font-black text-sky-800 mt-1">
                    {detailAsnaf.linkedTypeCount || 0} ประเภท
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">ในระบบ Master Data Level 2</div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1">นิยามและความหมายตามหลักศาสนา</div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {detailAsnaf.description}
                </div>
              </div>

              {detailAsnaf.criteria && detailAsnaf.criteria.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                    <span>หลักเกณฑ์การพิจารณาคุณสมบัติ</span>
                  </div>
                  <div className="space-y-1.5">
                    {detailAsnaf.criteria.map((c, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-slate-800"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailAsnaf.requiredDocuments && detailAsnaf.requiredDocuments.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>เอกสารหลักฐานที่ต้องใช้ประกอบคำร้อง</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailAsnaf.requiredDocuments.map((doc, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailAsnaf.allowedFormats && detailAsnaf.allowedFormats.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-600" />
                    <span>รูปแบบการส่งมอบที่สอดคล้อง (Level 3 Formats)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailAsnaf.allowedFormats.map((fmt, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-sky-50 text-sky-800 border border-sky-200"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Navigation actions */}
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-teal-900">ดูความเชื่อมโยงในระบบ:</span>
                <div className="flex items-center gap-2">
                  {onNavigateToTypes && (
                    <button
                      type="button"
                      onClick={() => {
                        const code = detailAsnaf.code;
                        setDetailAsnaf(null);
                        onNavigateToTypes(code);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-teal-800 border border-teal-200 hover:bg-teal-50 transition-colors flex items-center gap-1"
                    >
                      <span>ประเภทที่ผูกใช้</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {onNavigateToMatrix && (
                    <button
                      type="button"
                      onClick={() => {
                        const code = detailAsnaf.code;
                        setDetailAsnaf(null);
                        onNavigateToMatrix(code);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-800 text-white hover:bg-teal-900 transition-colors flex items-center gap-1"
                    >
                      <Layers className="w-3 h-3" />
                      <span>ตารางเมทริกซ์ 3 ระดับ</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailAsnaf;
                    setDetailAsnaf(null);
                    openEditModal(target);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูลนี้</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailAsnaf(null)}
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

