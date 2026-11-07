'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Grid,
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  Info,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Sliders,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowRightLeft,
  Tag,
  Star,
} from 'lucide-react';
import { RelationshipAuditLogEntry } from '@/types';

interface MatrixAsnaf {
  id: string;
  code: string;
  nameTh: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

interface MatrixAssistanceType {
  id: string;
  code: string;
  name: string;
  category: string;
  primaryGroupCode?: string;
  specificFundId?: string;
  specificFundName?: string;
  assistanceFormat?: string;
  defaultMinAmount?: number;
  defaultMaxAmount?: number;
  isActive: boolean;
  allowedAsnafCodes?: string[];
  formats?: Array<{ id: string; code: string; name: string; isDefault?: boolean }>;
}

interface MatrixFormat {
  id: string;
  code: string;
  name: string;
  deliveryMethodLabelTh: string;
  isActive: boolean;
  sortOrder: number;
}

interface MatrixLink {
  id: string;
  asnafCode: string;
  assistanceTypeId: string;
  assistanceTypeCode: string;
  assistanceTypeName: string;
  isActive: boolean;
  sortOrder: number;
}

interface TypeFormatLink {
  id: string;
  assistanceTypeId: string;
  assistanceTypeCode: string;
  formatId: string;
  formatCode: string;
  formatName: string;
  isDefault: boolean;
  isActive: boolean;
}

export function RelationshipMatrixTab() {
  const { showToast, currentUser, authToken, getAuthHeaders } = useApp();

  const [asnafs, setAsnafs] = useState<MatrixAsnaf[]>([]);
  const [types, setTypes] = useState<MatrixAssistanceType[]>([]);
  const [formats, setFormats] = useState<MatrixFormat[]>([]);
  const [links, setLinks] = useState<MatrixLink[]>([]);
  const [typeFormatLinks, setTypeFormatLinks] = useState<TypeFormatLink[]>([]);
  const [auditLogs, setAuditLogs] = useState<RelationshipAuditLogEntry[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isTogglingCell, setIsTogglingCell] = useState<Record<string, boolean>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterFundGroup, setFilterFundGroup] = useState<string>('all');
  const [filterAsnaf, setFilterAsnaf] = useState<string>('all');
  const [filterActiveTypesOnly, setFilterActiveTypesOnly] = useState<boolean>(true);

  // Format Modal State
  const [formatModalType, setFormatModalType] = useState<MatrixAssistanceType | null>(null);
  const [isUpdatingFormatLink, setIsUpdatingFormatLink] = useState<boolean>(false);

  // Audit Logs Drawer / Expansion
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);

  const fetchMatrixData = async () => {
    try {
      setIsRefreshing(true);
      const [resMatrix, resLogs] = await Promise.all([
        fetch('/api/admin/relationship-matrix', {
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
        fetch('/api/admin/relationship-matrix/audit-logs?limit=30', {
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
      ]);

      const jsonMatrix = await resMatrix.json();
      if (resMatrix.ok && jsonMatrix.success) {
        setAsnafs(jsonMatrix.data.asnafs || []);
        setTypes(jsonMatrix.data.types || []);
        setFormats(jsonMatrix.data.formats || []);
        setLinks(jsonMatrix.data.asnafTypeLinks || []);
        setTypeFormatLinks(jsonMatrix.data.typeFormatLinks || []);
      } else {
        throw new Error(jsonMatrix.error || 'ไม่สามารถโหลดข้อมูลเมทริกซ์ความสัมพันธ์ได้');
      }

      try {
        const jsonLogs = await resLogs.json();
        if (resLogs.ok && jsonLogs.success) {
          setAuditLogs(jsonLogs.data || []);
        }
      } catch {}
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลเมทริกซ์', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, []);

  // Quick lookup map: `${asnafCode}__${assistanceTypeId}` -> isActive (boolean)
  const linkActiveMap = useMemo(() => {
    const map = new Map<string, boolean>();
    links.forEach((l) => {
      map.set(`${l.asnafCode}__${l.assistanceTypeId}`, l.isActive);
    });
    return map;
  }, [links]);

  // Lookup map for format links: `${assistanceTypeId}__${formatId}` -> { isActive, isDefault }
  const formatLinkMap = useMemo(() => {
    const map = new Map<string, { isActive: boolean; isDefault: boolean }>();
    typeFormatLinks.forEach((fl) => {
      map.set(`${fl.assistanceTypeId}__${fl.formatId}`, {
        isActive: fl.isActive,
        isDefault: fl.isDefault,
      });
    });
    return map;
  }, [typeFormatLinks]);

  // Toggle cell (asnafCode, assistanceTypeId)
  const handleToggleCell = async (asnafCode: string, assistanceTypeId: string) => {
    const cellKey = `${asnafCode}__${assistanceTypeId}`;
    if (isTogglingCell[cellKey]) return;

    const currentStatus = Boolean(linkActiveMap.get(cellKey));
    const nextStatus = !currentStatus;

    // Optimistic UI Update
    setLinks((prev) => {
      const idx = prev.findIndex(
        (l) => l.asnafCode === asnafCode && l.assistanceTypeId === assistanceTypeId
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], isActive: nextStatus };
        return copy;
      } else {
        const targetType = types.find((t) => t.id === assistanceTypeId);
        return [
          ...prev,
          {
            id: `aat-${asnafCode}-${assistanceTypeId}`,
            asnafCode,
            assistanceTypeId,
            assistanceTypeCode: targetType?.code || '',
            assistanceTypeName: targetType?.name || '',
            isActive: nextStatus,
            sortOrder: 99,
          },
        ];
      }
    });

    setIsTogglingCell((prev) => ({ ...prev, [cellKey]: true }));

    try {
      const res = await fetch('/api/admin/relationship-matrix', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          asnafCode,
          assistanceTypeId,
          isActive: nextStatus,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          nextStatus ? `เปิดสิทธิ์ความสัมพันธ์สำเร็จ` : `ปิดสิทธิ์ความสัมพันธ์เรียบร้อย`,
          'success'
        );
        // Refresh audit logs in background
        fetch('/api/admin/relationship-matrix/audit-logs?limit=30')
          .then((r) => r.json())
          .then((j) => {
            if (j.success) setAuditLogs(j.data || []);
          })
          .catch(() => {});
      } else {
        throw new Error(json.error || 'ไม่สามารถบันทึกความสัมพันธ์ได้');
      }
    } catch (err: any) {
      // Revert optimistic update on failure
      setLinks((prev) => {
        const idx = prev.findIndex(
          (l) => l.asnafCode === asnafCode && l.assistanceTypeId === assistanceTypeId
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], isActive: currentStatus };
          return copy;
        }
        return prev;
      });
      showToast(err.message, 'error');
    } finally {
      setIsTogglingCell((prev) => ({ ...prev, [cellKey]: false }));
    }
  };

  // Toggle format link in modal
  const handleToggleFormatLink = async (
    assistanceTypeId: string,
    formatId: string,
    makeDefault: boolean = false
  ) => {
    try {
      setIsUpdatingFormatLink(true);
      const linkKey = `${assistanceTypeId}__${formatId}`;
      const existing = formatLinkMap.get(linkKey);
      const nextActive = makeDefault ? true : !existing?.isActive;

      const res = await fetch('/api/admin/relationship-matrix/toggle-format', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          assistanceTypeId,
          formatId,
          isActive: nextActive,
          isDefault: makeDefault,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role, email: currentUser.email },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          makeDefault ? 'กำหนดรูปแบบเริ่มต้นสำเร็จ' : nextActive ? 'เปิดรูปแบบสำเร็จ' : 'ปิดรูปแบบสำเร็จ',
          'success'
        );
        // Refresh matrix data
        fetchMatrixData();
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกรูปแบบ');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUpdatingFormatLink(false);
    }
  };

  // Filtered types to display in rows
  const filteredTypes = useMemo(() => {
    return types.filter((t) => {
      if (filterActiveTypesOnly && !t.isActive) return false;
      if (filterFundGroup !== 'all' && t.primaryGroupCode !== filterFundGroup) return false;
      if (filterAsnaf !== 'all') {
        const linkKey = `${filterAsnaf}__${t.id}`;
        if (!linkActiveMap.get(linkKey)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.specificFundName && t.specificFundName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [types, filterActiveTypesOnly, filterFundGroup, filterAsnaf, searchQuery, linkActiveMap]);

  // Overall Statistics
  const activeLinksCount = useMemo(() => {
    return links.filter((l) => l.isActive).length;
  }, [links]);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
            <Grid className="w-4 h-4 text-teal-700" />
            <span>Interactive 3-Tier Master Data Governance</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            เมทริกซ์ความสัมพันธ์ 3 ระดับ (Relationship Matrix)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดความสัมพันธ์ระหว่าง <span className="font-bold text-teal-900">1. หมวดหมู่อัสนัฟ (Asnaf)</span> ↔{' '}
            <span className="font-bold text-teal-900">2. ประเภทความช่วยเหลือ (Assistance Type)</span> ↔{' '}
            <span className="font-bold text-teal-900">3. รูปแบบการส่งมอบ (Delivery Format)</span> คลิกสลับสถานะได้ทันที
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAuditDrawer(!showAuditDrawer)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showAuditDrawer
                ? 'bg-teal-50 border-teal-200 text-teal-800 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-teal-700" />
            <span>ประวัติการเปลี่ยนแปลง ({auditLogs.length})</span>
          </button>

          <button
            onClick={fetchMatrixData}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-teal-700 uppercase">หมวดหมู่อัสนัฟ (Level 1)</div>
          <div className="text-2xl font-extrabold text-[#0B2545] mt-1">
            {asnafs.filter((a) => a.isActive).length} / {asnafs.length} หมวด
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">8 หมวดหมู่ตามคัมภีร์อัลกุรอาน</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-sky-700 uppercase">ประเภทความช่วยเหลือ (Level 2)</div>
          <div className="text-2xl font-extrabold text-[#0B2545] mt-1">
            {types.filter((t) => t.isActive).length} ประเภท
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">ผูกกับกองทุนเฉพาะ 8 ด้าน</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase">ความสัมพันธ์ที่เปิดใช้งาน</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {activeLinksCount} คู่สิทธิ์
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Active Matrix Connections</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-700 uppercase">รูปแบบการส่งมอบ (Level 3)</div>
          <div className="text-2xl font-extrabold text-[#0B2545] mt-1">
            {formats.filter((f) => f.isActive).length} ช่องทาง
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">โอนเงิน, จ่ายตรง, สิ่งของ, ผู้รับเหมา</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อประเภทความช่วยเหลือ หรือรหัส..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filter by Fund Group */}
          <select
            value={filterFundGroup}
            onChange={(e) => setFilterFundGroup(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 font-medium"
          >
            <option value="all">ทุกกลุ่มกองทุนหลัก</option>
            <option value="faqir_miskin">ฟากีร–มิสกิน (ยากไร้/ขัดสน)</option>
            <option value="amil">อามิลีน (บริหารซะกาต)</option>
            <option value="muallaf">มุอัลลัฟ (ผู้มีจิตโน้มสู่ศรัทธา)</option>
            <option value="humanitarian">มนุษยธรรม / ริกอบ</option>
            <option value="gharimin">ผู้มีหนี้สินล้นพ้นตัว</option>
            <option value="fisabilillah">ฟีสะบีลิลลาฮ์</option>
            <option value="ibnsabil">ผู้เดินทาง / อิบนุสสะบีล</option>
          </select>

          {/* Filter by Asnaf Column */}
          <select
            value={filterAsnaf}
            onChange={(e) => setFilterAsnaf(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 font-medium"
          >
            <option value="all">แสดงทุกอัสนัฟ</option>
            {asnafs.map((a) => (
              <option key={a.code} value={a.code}>
                {a.nameTh}
              </option>
            ))}
          </select>

          {/* Toggle Active Only */}
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filterActiveTypesOnly}
              onChange={(e) => setFilterActiveTypesOnly(e.target.checked)}
              className="rounded text-teal-800 focus:ring-teal-700"
            />
            <span>เฉพาะประเภทที่เปิดใช้งาน</span>
          </label>
        </div>
      </div>

      {/* Interactive 2D Matrix Table */}
      {isLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-800 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">กำลังประมวลผลเมทริกซ์ความสัมพันธ์ 3 ระดับ...</p>
        </div>
      ) : filteredTypes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">ไม่พบประเภทความช่วยเหลือที่ตรงกับเงื่อนไขการค้นหา</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="md:hidden text-[11px] text-slate-500 flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
            <span className="flex items-center gap-1.5 font-medium">
              <ArrowRightLeft className="w-3.5 h-3.5 text-teal-700" />
              เลื่อนในแนวนอนเพื่อดูตารางสิทธิ์ทั้ง 8 อัสนัฟ
            </span>
            <span className="text-[10px] text-teal-800 font-bold bg-teal-100/70 px-2 py-0.5 rounded">
              Swipe ↔
            </span>
          </div>
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 min-w-[280px] bg-slate-100 font-extrabold text-slate-800 sticky left-0 z-30 shadow-xs">
                    ประเภทความช่วยเหลือ (Assistance Type)
                  </th>
                  {asnafs.map((asnaf) => (
                    <th
                      key={asnaf.code}
                      className="py-3 px-3 min-w-[120px] text-center font-bold text-slate-800 border-l border-slate-200/70"
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-arabic text-teal-900 text-xs">{asnaf.nameAr || '-'}</span>
                        <span className="text-[11px] font-bold mt-0.5 truncate max-w-[110px]" title={asnaf.nameTh}>
                          {asnaf.nameTh.split(' ')[0]}
                        </span>
                        <span className="text-[9px] font-mono text-slate-600 uppercase bg-slate-200/70 px-1 rounded mt-0.5">
                          {asnaf.code}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 min-w-[140px] text-center font-bold text-slate-800 border-l border-slate-200">
                    รูปแบบการส่งมอบ (Formats)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTypes.map((t) => {
                  const typeActiveFormats = (t.formats || []).length;
                  return (
                    <tr key={t.id} className="hover:bg-teal-50/20 transition-colors">
                      {/* Row Header (Sticky Left) */}
                      <td className="py-3 px-4 bg-white sticky left-0 z-10 shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            {t.code}
                          </span>
                          {!t.isActive && (
                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1 rounded">
                              (ปิดใช้งาน)
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 mt-1 text-xs">{t.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span className="text-teal-700 font-medium">{t.specificFundName || t.primaryGroupCode}</span>
                          <span>•</span>
                          <span>
                            {t.defaultMinAmount || t.defaultMaxAmount
                              ? `${(t.defaultMinAmount || 0).toLocaleString()} - ${
                                  t.defaultMaxAmount ? t.defaultMaxAmount.toLocaleString() : 'ไม่จำกัด'
                                } บ.`
                              : 'ตามประเมิน'}
                          </span>
                        </div>
                      </td>

                      {/* Asnaf Columns (Interactive Toggle Cells) */}
                      {asnafs.map((asnaf) => {
                        const cellKey = `${asnaf.code}__${t.id}`;
                        const isLinked = Boolean(linkActiveMap.get(cellKey));
                        const isPending = Boolean(isTogglingCell[cellKey]);

                        return (
                          <td
                            key={asnaf.code}
                            className="py-2.5 px-2 text-center border-l border-slate-100 hover:bg-slate-50/80 transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleCell(asnaf.code, t.id)}
                              disabled={isPending}
                              className={`w-full py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 ${
                                isLinked
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-2xs hover:scale-102'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                              } ${isPending ? 'opacity-50 animate-pulse' : ''}`}
                              title={`คลิกเพื่อ${isLinked ? 'ปิด' : 'เปิด'}สิทธิ์สำหรับ [${asnaf.nameTh}] ↔ [${t.name}]`}
                            >
                              {isLinked ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span className="hidden xl:inline">เปิดสิทธิ์</span>
                                </>
                              ) : (
                                <span>—</span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Format Mapping Button Column */}
                      <td className="py-2.5 px-4 text-center border-l border-slate-200 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setFormatModalType(t)}
                          className="px-2.5 py-1.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Layers className="w-3.5 h-3.5 text-sky-700" />
                          <span>{typeActiveFormats} รูปแบบ</span>
                          <ChevronRight className="w-3 h-3 text-sky-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Format Mapping Modal (Level 2 ↔ Level 3) */}
      {formatModalType && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-800 text-white flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ผูกรูปแบบการส่งมอบ: {formatModalType.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">รหัส: {formatModalType.code}</p>
                </div>
              </div>
              <button
                onClick={() => setFormatModalType(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-slate-600 leading-relaxed bg-sky-50/70 p-3 rounded-xl border border-sky-100">
                กำหนดวิธีการส่งมอบที่อนุญาตสำหรับประเภทความช่วยเหลือนี้ เจ้าหน้าที่สามารถเลือกได้เฉพาะรูปแบบที่เปิดใช้งานเมื่อบันทึกใบคำร้อง
              </p>

              <div className="space-y-2">
                {formats.map((fmt) => {
                  const linkKey = `${formatModalType.id}__${fmt.id}`;
                  const linkData = formatLinkMap.get(linkKey);
                  const isLinked = Boolean(linkData?.isActive);
                  const isDefault = Boolean(linkData?.isDefault);

                  return (
                    <div
                      key={fmt.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isLinked
                          ? 'bg-white border-teal-300 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{fmt.name}</span>
                          {isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>ค่าเริ่มต้น</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {fmt.deliveryMethodLabelTh} ({fmt.code})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isLinked && !isDefault && (
                          <button
                            type="button"
                            onClick={() => handleToggleFormatLink(formatModalType.id, fmt.id, true)}
                            disabled={isUpdatingFormatLink}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                            title="ตั้งเป็นรูปแบบเริ่มต้น"
                          >
                            ตั้งเป็นค่าเริ่มต้น
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleFormatLink(formatModalType.id, fmt.id, false)}
                          disabled={isUpdatingFormatLink}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            isLinked
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {isLinked ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>เปิดใช้งาน</span>
                            </>
                          ) : (
                            <span>ปิดใช้งาน</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setFormatModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Relationship Audit History Panel / Drawer */}
      {showAuditDrawer && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 animate-scaleUp">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-teal-800" />
              <h3 className="font-bold text-sm text-slate-900">
                ประวัติการเปลี่ยนแปลงความสัมพันธ์ (Audit Log History)
              </h3>
            </div>
            <button
              onClick={() => setShowAuditDrawer(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">ยังไม่มีประวัติการเปลี่ยนแปลงความสัมพันธ์</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{log.actorName || 'ผู้ดูแลระบบ'}</span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                        {log.actorRole || 'admin'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs">{log.changesSummary}</p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      log.action.includes('ACTIVATE')
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : log.action.includes('DEACTIVATE')
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-sky-50 text-sky-800 border border-sky-200'
                    }`}
                  >
                    {log.action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

