'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CardViewGrid } from '@/components/common/CardViewGrid';
import { publishCardViewSettings } from '@/hooks/useCardViewSettings';
import {
  ALL_ROWS_ITEM_LIMIT,
  CARD_VIEW_MODULES,
  CardRowsPerPage,
  CardSize,
  CardViewConfigDocument,
  CardViewLayout,
  CardViewModuleId,
  DEFAULT_CARD_VIEW_CONFIG,
  SIZE_PRESETS,
  applySizePreset,
  cardInnerGap,
  normalizeCardViewConfig,
  resolveCardPageSize,
  resolveModuleLayout,
} from '@/lib/cardViewSettings';
import { LayoutGrid, Lock, RotateCcw, Save, Eye } from 'lucide-react';

type Scope = 'global' | CardViewModuleId;

const ROW_OPTIONS: { value: CardRowsPerPage; label: string }[] = [
  { value: 1, label: '1 แถว' },
  { value: 2, label: '2 แถว' },
  { value: 3, label: '3 แถว' },
  { value: 4, label: '4 แถว' },
  { value: 5, label: '5 แถว' },
  { value: 10, label: '10 แถว' },
  { value: 'all', label: `แสดงทั้งหมด (ไม่เกิน ${ALL_ROWS_ITEM_LIMIT} รายการ)` },
];

function cloneConfig(config: CardViewConfigDocument): CardViewConfigDocument {
  return normalizeCardViewConfig(JSON.parse(JSON.stringify(config)));
}

export function CardViewSettingsPanel() {
  const { currentUser, showToast, getAuthHeaders } = useApp();
  const canEdit = currentUser.role === 'super_admin';
  const [saved, setSaved] = useState<CardViewConfigDocument>(DEFAULT_CARD_VIEW_CONFIG);
  const [draft, setDraft] = useState<CardViewConfigDocument>(DEFAULT_CARD_VIEW_CONFIG);
  const [scope, setScope] = useState<Scope>('global');
  const [useGlobal, setUseGlobal] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings/card-view', { cache: 'no-store' });
      const json = await res.json();
      const config = res.ok && json.success ? normalizeCardViewConfig(json.data) : DEFAULT_CARD_VIEW_CONFIG;
      setSaved(config);
      setDraft(cloneConfig(config));
    } catch {
      showToast('ไม่สามารถโหลดการตั้งค่าการ์ดได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (scope === 'global') {
      setUseGlobal(true);
      return;
    }
    setUseGlobal(!draft.modules[scope]);
  }, [scope, draft.modules]);

  const activeLayout = scope === 'global' || !useGlobal
    ? resolveModuleLayout(draft, scope === 'global' ? undefined : scope)
    : draft.global;

  const previewPageSize = resolveCardPageSize(activeLayout, 12);
  const previewRows = activeLayout.rowsPerPage === 'all' ? 2 : Math.min(activeLayout.rowsPerPage, 3);
  const previewCount = Math.max(1, previewRows * activeLayout.cardsPerRow);

  const updateLayout = (next: CardViewLayout) => {
    setDraft((current) => {
      if (scope === 'global') return { ...current, global: next };
      return { ...current, modules: { ...current.modules, [scope]: next } };
    });
  };

  const fieldClass = 'w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500';

  const samples = useMemo(
    () => Array.from({ length: previewCount }, (_, index) => index + 1),
    [previewCount],
  );

  const handleSave = async () => {
    if (!canEdit) {
      showToast('เฉพาะผู้ดูแลระบบสูงสุดที่บันทึกการตั้งค่านี้ได้', 'error');
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch('/api/settings/card-view', {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          config: draft,
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'บันทึกไม่สำเร็จ');
      }
      const config = normalizeCardViewConfig(json.data);
      setSaved(config);
      setDraft(cloneConfig(config));
      publishCardViewSettings(config);
      showToast('บันทึกการตั้งค่ารูปแบบการ์ดแล้ว', 'success');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(cloneConfig(saved));
    showToast('ยกเลิกการแก้ไขที่ยังไม่บันทึก', 'info');
  };

  const handleReset = () => {
    if (scope === 'global') {
      setDraft((current) => ({ ...current, global: DEFAULT_CARD_VIEW_CONFIG.global }));
    } else {
      setDraft((current) => {
        const modules = { ...current.modules };
        delete modules[scope];
        return { ...current, modules };
      });
      setUseGlobal(true);
    }
    showToast('คืนค่าเริ่มต้นในแบบฟอร์มแล้ว กดบันทึกเพื่อใช้งานจริง', 'info');
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-100 pb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-teal-700" />
            การตั้งค่ารูปแบบการแสดงผลการ์ด (Card View Configuration)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            ค่านี้ใช้กับหน้าที่มีมุมมองการ์ด ค่าส่วนกลางเป็นค่าเริ่มต้น และแต่ละโมดูลสามารถกำหนดแยกได้
          </p>
        </div>
        {!canEdit && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
            <Lock className="w-3.5 h-3.5" />
            ดูได้อย่างเดียว
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-xs font-bold text-slate-700">
          ขอบเขตการตั้งค่า
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as Scope)}
            className={`${fieldClass} mt-1`}
          >
            <option value="global">ค่าส่วนกลาง (ทุกหน้าที่ใช้การ์ด)</option>
            {CARD_VIEW_MODULES.map((module) => (
              <option key={module.id} value={module.id}>{module.label}</option>
            ))}
          </select>
        </label>
        {scope !== 'global' && (
          <label className="flex items-end gap-2 pb-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={useGlobal}
              disabled={!canEdit}
              onChange={(event) => {
                const checked = event.target.checked;
                setUseGlobal(checked);
                setDraft((current) => {
                  const modules = { ...current.modules };
                  if (checked) delete modules[scope];
                  else modules[scope] = resolveModuleLayout(current, scope);
                  return { ...current, modules };
                });
              }}
              className="h-4 w-4 accent-teal-700"
            />
            ใช้ค่าส่วนกลางของระบบ
          </label>
        )}
      </div>

      <fieldset disabled={!canEdit || isLoading || (scope !== 'global' && useGlobal)} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-xs font-bold text-slate-700">
          ขนาดการ์ด
          <select
            value={activeLayout.size}
            onChange={(event) => updateLayout(applySizePreset(activeLayout, event.target.value as CardSize))}
            className={`${fieldClass} mt-1`}
          >
            {(Object.keys(SIZE_PRESETS) as CardSize[]).map((size) => (
              <option key={size} value={size}>{SIZE_PRESETS[size].label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          จำนวนการ์ดต่อแถว
          <select
            value={activeLayout.cardsPerRow}
            onChange={(event) => updateLayout({ ...activeLayout, cardsPerRow: Number(event.target.value) as CardViewLayout['cardsPerRow'] })}
            className={`${fieldClass} mt-1`}
          >
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>{count} การ์ด{count === 5 ? ' (เมื่อจอกว้างพอ)' : ''}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          จำนวนแถวต่อหน้า
          <select
            value={String(activeLayout.rowsPerPage)}
            onChange={(event) => {
              const value = event.target.value === 'all' ? 'all' : Number(event.target.value) as CardRowsPerPage;
              updateLayout({ ...activeLayout, rowsPerPage: value });
            }}
            className={`${fieldClass} mt-1`}
          >
            {ROW_OPTIONS.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          ระยะห่างระหว่างการ์ด ({activeLayout.gapPx}px)
          <input
            type="range"
            min={8}
            max={32}
            value={activeLayout.gapPx}
            onChange={(event) => updateLayout({ ...activeLayout, gapPx: Number(event.target.value) })}
            className="mt-2 w-full accent-teal-700"
          />
        </label>
        <label className="text-xs font-bold text-slate-700">
          ระยะห่างภายใน ({activeLayout.paddingPx}px)
          <input
            type="range"
            min={12}
            max={28}
            value={activeLayout.paddingPx}
            onChange={(event) => updateLayout({ ...activeLayout, paddingPx: Number(event.target.value) })}
            className="mt-2 w-full accent-teal-700"
          />
        </label>
        <label className="text-xs font-bold text-slate-700">
          ความสูงขั้นต่ำ ({activeLayout.minHeightPx}px)
          <input
            type="range"
            min={160}
            max={420}
            step={4}
            value={activeLayout.minHeightPx}
            onChange={(event) => updateLayout({ ...activeLayout, minHeightPx: Number(event.target.value) })}
            className="mt-2 w-full accent-teal-700"
          />
        </label>
        <label className="text-xs font-bold text-slate-700 md:col-span-2 xl:col-span-3">
          ความหนาแน่นของข้อมูล
          <select
            value={activeLayout.density}
            onChange={(event) => updateLayout({ ...activeLayout, density: event.target.value as CardViewLayout['density'] })}
            className={`${fieldClass} mt-1 max-w-sm`}
          >
            <option value="comfortable">Comfortable — ระยะอ่านสบาย</option>
            <option value="compact">Compact — แสดงข้อมูลแน่นขึ้น โดยตัวอักษรยังอ่านได้</option>
          </select>
        </label>
      </fieldset>

      <div id="card-view-preview-anchor" className="rounded-2xl border border-dashed border-teal-200 bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black text-slate-800">ตัวอย่างก่อนบันทึก</p>
          <p className="text-[11px] font-bold text-teal-800">
            {activeLayout.cardsPerRow} การ์ด × {activeLayout.rowsPerPage === 'all' ? 'ทั้งหมด' : `${activeLayout.rowsPerPage} แถว`} = {previewPageSize} รายการต่อหน้า
          </p>
        </div>
        <CardViewGrid layout={activeLayout}>
          {samples.map((item) => (
            <article
              key={item}
              className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white text-slate-700"
              style={{
                padding: activeLayout.paddingPx,
                minHeight: activeLayout.minHeightPx,
                gap: cardInnerGap(activeLayout),
                fontSize: SIZE_PRESETS[activeLayout.size].bodyPx,
              }}
            >
              <strong style={{ fontSize: SIZE_PRESETS[activeLayout.size].titlePx }} className="text-slate-900">
                ตัวอย่างการ์ด {item}
              </strong>
              <span className="text-slate-500">ขนาด {activeLayout.size} · ระยะห่าง {activeLayout.gapPx}px</span>
              <span className="mt-auto h-1.5 rounded-full bg-teal-600" style={{ width: `${40 + (item % 4) * 15}%` }} />
            </article>
          ))}
        </CardViewGrid>
        <p className="mt-2 text-[11px] text-slate-500">
          ตัวอย่างนี้ยังไม่ถูกบันทึก จอมือถือจะเหลือ 1 การ์ดต่อแถว และจอที่แคบกว่าความกว้างขั้นต่ำจะลดจำนวนคอลัมน์เอง
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => document.getElementById('card-view-preview-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
          className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <Eye className="w-3.5 h-3.5" />
          ดูตัวอย่าง
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canEdit || isSaving || isLoading}
          className="zms-action inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={!canEdit || isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!canEdit || isLoading}
          className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          คืนค่าเริ่มต้น
        </button>
      </div>
    </div>
  );
}
