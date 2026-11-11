'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  FileText,
  DollarSign,
  Building2,
  Users,
  CheckCircle2,
  Layers,
  ChevronRight,
  Send,
  Save,
  Search,
  Check,
  ShieldCheck,
  Info,
} from 'lucide-react';
import type { BankAccount } from '@/types';

interface EligibleApp {
  id: string;
  applicationNo: string;
  beneficiaryId: string;
  beneficiaryName: string;
  nationalId: string;
  registrationNo?: string;
  asnafCategory: string;
  assistanceType?: string;
  specificFundId?: string;
  specificFundName?: string;
  fundAccountId?: string;
  fundAccountName?: string;
  approvedAmount: number;
  disbursedAmount: number;
  pendingBatchAmount?: number;
  remainingAmount: number;
  activeBatchNumbers?: string;
  status: string;
  notes?: string;
}

interface AdminCat {
  id: string;
  code: string;
  name: string;
  groupName: string;
  budgetLimit: number;
}

interface TreasurerAccount {
  id: string;
  accountCode: string;
  accountName: string;
  custodianId: string;
  custodianName: string;
  accountType: string;
  currentBalance: number;
  status: string;
  isDefault: boolean;
  allowedForStaffDisbursement: boolean;
  description?: string;
  fundTypes?: string[];
}

interface LineItem {
  type: 'aid' | 'admin';
  applicationId?: string;
  applicationNo?: string;
  beneficiaryId?: string;
  beneficiaryName?: string;
  nationalId?: string;
  asnafCategory?: string;
  assistanceType?: string;
  approvedAmount?: number;
  thisDisbursementAmount?: number;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  amount?: number;
  payeeName?: string;
  notes?: string;
}

export function FinanceBatchDisbursementModal({
  isOpen,
  onClose,
  actor,
  banks,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  actor: { id: string; name: string; role: string };
  banks?: BankAccount[];
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [fundType, setFundType] = useState('zakat');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<LineItem[]>([]);
  const [itemType, setItemType] = useState<'aid' | 'admin'>('aid');

  // Master data
  const [eligibleApps, setEligibleApps] = useState<EligibleApp[]>([]);
  const [adminCats, setAdminCats] = useState<AdminCat[]>([]);
  const [treasurerAccounts, setTreasurerAccounts] = useState<TreasurerAccount[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingTreasurer, setLoadingTreasurer] = useState(false);
  const [treasurerError, setTreasurerError] = useState('');

  // New item draft form
  const [selectedAppId, setSelectedAppId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aidDisbAmount, setAidDisbAmount] = useState('');
  const [aidNotes, setAidNotes] = useState('');

  const [selectedCatId, setSelectedCatId] = useState('');
  const [adminDescription, setAdminDescription] = useState('');
  const [adminAmount, setAdminAmount] = useState('');
  const [adminPayee, setAdminPayee] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setTreasurerError('');
      setStep(1);
      setTitle('');
      setFundType('zakat');
      setNotes('');
      setItems([]);
      setSelectedAppId('');
      setSearchQuery('');
      setSelectedCatId('');
      loadMasterData();
    }
  }, [isOpen]);

  const loadMasterData = async () => {
    try {
      setLoadingData(true);
      setLoadingTreasurer(true);
      const [appRes, catRes, trRes] = await Promise.all([
        fetch('/api/finance/workflow-actions?view=eligible_applications').then((r) => r.json()),
        fetch('/api/finance/workflow-actions?view=admin_categories').then((r) => r.json()),
        fetch('/api/finance/workflow-actions?view=treasurer_accounts').then((r) => r.json()),
      ]);
      if (appRes.success && Array.isArray(appRes.data)) setEligibleApps(appRes.data);
      if (catRes.success && Array.isArray(catRes.data)) {
        setAdminCats(catRes.data);
        if (catRes.data.length > 0) setSelectedCatId(catRes.data[0].id);
      }
      if (trRes.success && Array.isArray(trRes.data)) {
        const eligible = trRes.data.filter((t: TreasurerAccount) => t.allowedForStaffDisbursement && t.status === 'active');
        setTreasurerAccounts(eligible);
        if (eligible.length > 0) {
          const def = eligible.find((t: TreasurerAccount) => t.isDefault) || eligible[0];
          setSourceAccountId(def.id);
        } else {
          setTreasurerError('ไม่มีบัญชีเหรัญญิกที่พร้อมใช้งานสำหรับการเบิกจ่ายในระบบ กรุณาติดต่อฝ่ายเหรัญญิก');
        }
      } else {
        setTreasurerError('ไม่สามารถดึงข้อมูลบัญชีเหรัญญิกได้');
      }
    } catch (err: any) {
      console.error(err);
      setTreasurerError('เกิดข้อผิดพลาดในการโหลดข้อมูลบัญชีเหรัญญิก');
    } finally {
      setLoadingData(false);
      setLoadingTreasurer(false);
    }
  };

  const cleanSearch = searchQuery.toLowerCase().trim();
  const filteredApps = !cleanSearch
    ? eligibleApps
    : eligibleApps.filter((app) => {
        return (
          app.applicationNo.toLowerCase().includes(cleanSearch) ||
          app.beneficiaryName.toLowerCase().includes(cleanSearch) ||
          (app.nationalId && app.nationalId.toLowerCase().includes(cleanSearch)) ||
          (app.registrationNo && app.registrationNo.toLowerCase().includes(cleanSearch)) ||
          (app.asnafCategory && app.asnafCategory.toLowerCase().includes(cleanSearch)) ||
          (app.assistanceType && app.assistanceType.toLowerCase().includes(cleanSearch))
        );
      });

  const totalAidAmount = items
    .filter((it) => it.type === 'aid')
    .reduce((sum, it) => sum + (Number(it.thisDisbursementAmount) || 0), 0);

  const totalAdminAmount = items
    .filter((it) => it.type === 'admin')
    .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const totalBatchAmount = totalAidAmount + totalAdminAmount;

  const selectedTreasurer = treasurerAccounts.find((t) => t.id === sourceAccountId) || treasurerAccounts[0] || null;
  const isBalanceInsufficient = selectedTreasurer ? totalBatchAmount > selectedTreasurer.currentBalance : false;

  const selectedApp = eligibleApps.find((a) => a.id === selectedAppId) || null;

  const handleAddAidItem = () => {
    setError('');
    const app = selectedApp;
    if (!app) {
      setError('กรุณาเลือกคำร้องขอรับความช่วยเหลือที่ผ่านการอนุมัติ');
      return;
    }
    const amt = parseFloat(aidDisbAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setError('กรุณาระบุจำนวนเงินที่ต้องการขอเบิกจ่ายรอบนี้ (มากกว่า 0 บาท)');
      return;
    }
    if (amt > app.remainingAmount) {
      setError(
        `ยอดเงินที่ขอเบิก (฿${amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) เกินกว่าวงเงินคงเหลือที่สามารถขอเบิกได้ (คงเหลือ ฿${app.remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) สำหรับคำร้อง ${app.applicationNo}`
      );
      return;
    }
    // Prevent duplicate application in same batch
    if (items.some((it) => it.applicationId === app.id)) {
      setError(`คำร้องเลขที่ ${app.applicationNo} (${app.beneficiaryName}) ถูกเพิ่มในรอบการเบิกนี้แล้ว ไม่สามารถเพิ่มซ้ำได้`);
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        type: 'aid',
        applicationId: app.id,
        applicationNo: app.applicationNo,
        beneficiaryId: app.beneficiaryId,
        beneficiaryName: app.beneficiaryName,
        nationalId: app.nationalId,
        asnafCategory: app.asnafCategory,
        assistanceType: app.assistanceType || 'ปัจจัยยังชีพ',
        approvedAmount: app.approvedAmount,
        thisDisbursementAmount: amt,
        notes: aidNotes.trim() || undefined,
      },
    ]);

    setSelectedAppId('');
    setAidDisbAmount('');
    setAidNotes('');
  };

  const handleAddAdminItem = () => {
    setError('');
    const cat = adminCats.find((c) => c.id === selectedCatId);
    if (!cat) {
      setError('กรุณาเลือกหมวดค่าใช้จ่ายบริหาร');
      return;
    }
    const amt = parseFloat(adminAmount);
    if (!amt || amt <= 0) {
      setError('กรุณาระบุจำนวนเงินค่าบริหาร');
      return;
    }
    if (!adminDescription.trim()) {
      setError('กรุณาระบุรายละเอียดรายการค่าใช้จ่าย');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        type: 'admin',
        categoryId: cat.id,
        categoryName: cat.name,
        description: adminDescription.trim(),
        amount: amt,
        payeeName: adminPayee.trim() || undefined,
        notes: adminNotes,
      },
    ]);

    setAdminDescription('');
    setAdminAmount('');
    setAdminPayee('');
    setAdminNotes('');
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (submitImmediately: boolean) => {
    setError('');
    if (!title.trim()) {
      setError('กรุณาระบุวัตถุประสงค์หรือชื่อรอบการเบิก');
      return;
    }
    if (!sourceAccountId) {
      setError('ไม่มีบัญชีเหรัญญิกที่พร้อมใช้งานสำหรับการเบิกจ่าย ไม่สามารถส่งคำขอได้');
      return;
    }
    if (items.length === 0) {
      setError('กรุณาเพิ่มรายการย่อยอย่างน้อย 1 รายการก่อนบันทึก');
      return;
    }
    if (isBalanceInsufficient && selectedTreasurer) {
      setError(
        `ยอดเงินคงเหลือในบัญชีเหรัญญิกไม่เพียงพอ (คงเหลือ ฿${selectedTreasurer.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}, ยอดขอเบิก ฿${totalBatchAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`
      );
      return;
    }

    try {
      setBusy(true);
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_batch',
          input: {
            title: title.trim(),
            fundType,
            sourceAccountId,
            bankAccountId: sourceAccountId, // backwards compatibility
            notes,
            submitImmediately,
            items,
          },
          actor,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'บันทึกรอบเบิกไม่สำเร็จ');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 px-6 py-4.5 text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xs text-teal-300">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-200">
                ระบบเบิกเงินเป็นรอบ · สิทธิ์เจ้าหน้าที่สำนักงาน (Office Staff)
              </div>
              <h2 className="text-base font-bold text-white">
                สร้างรอบการเบิกเงินใหม่ (Create Batch Disbursement)
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full font-bold ${
                step === 1 ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'font-bold text-teal-900' : 'text-slate-500'}>
              ข้อมูลรอบเบิก
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full font-bold ${
                step === 2 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'font-bold text-teal-900' : 'text-slate-500'}>
              เพิ่มรายการย่อย ({items.length})
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full font-bold ${
                step === 3 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'font-bold text-teal-900' : 'text-slate-500'}>
              ตรวจสอบและส่งคำขอ
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: BATCH HEADER */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">
                  วัตถุประสงค์ / ชื่อโครงการของรอบเบิก <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น เบิกเงินสดช่วยเหลือครอบครัวยากจนและค่าน้ำมันลงพื้นที่ งวด 1/2569"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    ประเภทเงิน / กองทุนหลัก <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={fundType}
                    onChange={(e) => setFundType(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-teal-600"
                  >
                    <option value="zakat">กองทุนซะกาต (Zakat Fund)</option>
                    <option value="sadaqah">กองทุนซอดะเกาะฮ์ทั่วไป (General Sadaqah)</option>
                    <option value="operational">งบดำเนินงานบริหาร (Operational)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-amber-700" />
                      บัญชีต้นทาง (เหรัญญิก) <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      เฉพาะบัญชีเหรัญญิกเท่านั้น
                    </span>
                  </label>

                  {loadingTreasurer ? (
                    <div className="mt-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-400">
                      กำลังโหลดข้อมูลบัญชีเหรัญญิก...
                    </div>
                  ) : treasurerAccounts.length === 0 ? (
                    <div className="mt-1.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{treasurerError || 'ไม่มีบัญชีเหรัญญิกที่เปิดใช้งานสำหรับการเบิกจ่าย ไม่สามารถส่งคำขอได้'}</span>
                    </div>
                  ) : treasurerAccounts.length === 1 ? (
                    <div className="mt-1.5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30 p-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">
                              {treasurerAccounts[0].accountName}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                              {treasurerAccounts[0].accountCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            ผู้รับผิดชอบ: <span className="font-semibold text-slate-700">{treasurerAccounts[0].custodianName}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">คงเหลือในมือเหรัญญิก</div>
                          <div className="font-mono font-bold text-amber-900 text-xs tabular-nums">
                            ฿{Number(treasurerAccounts[0].currentBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      <select
                        value={sourceAccountId}
                        onChange={(e) => setSourceAccountId(e.target.value)}
                        className="w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-600 font-medium"
                      >
                        {treasurerAccounts.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.accountName} — {t.custodianName} (รหัส {t.accountCode}) · คงเหลือ ฿{Number(t.currentBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">
                        * แสดงเฉพาะบัญชีเหรัญญิกที่กำหนดให้ใช้สำหรับการเบิกของเจ้าหน้าที่
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">หมายเหตุเพิ่มเติม</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="รายละเอียดอ้างอิง มติที่ประชุม หรือเงื่อนไขเพิ่มเติม (ถ้ามี)..."
                  rows={2}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none focus:border-teal-600"
                />
              </div>
            </div>
          )}

          {/* STEP 2: MULTI-ITEM LINE BUILDER */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Tabs to choose Aid vs Admin */}
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setItemType('aid');
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                    itemType === 'aid' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  รายการช่วยเหลือซะกาตตามอัสนัฟ (Aid Items)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setItemType('admin');
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                    itemType === 'admin' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  รายการค่าใช้จ่ายบริหารสำนักงาน (Admin Expenses)
                </button>
              </div>

              {/* FORM: AID ITEM */}
              {itemType === 'aid' && (
                <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-teal-700" />
                        <span>เลือกคำร้องขอรับความช่วยเหลือที่ผ่านการอนุมัติ (Approved & Ready for Disbursement)</span>
                      </div>
                      <p className="text-[11px] text-teal-700 mt-0.5">
                        ระบบคัดกรองเฉพาะคำร้องที่อนุมัติแล้ว มีวงเงินคงเหลือ และไม่อยู่ในรอบเบิกอื่นที่ยังไม่ปิด
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                      พร้อมเบิกจ่าย: {eligibleApps.length} รายการ
                    </span>
                  </div>

                  {/* Search box for applications */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาด้วยเลขที่คำร้อง (APP-...), ชื่อผู้ขอรับความช่วยเหลือ, เลขบัตรประชาชน, เลขทะเบียน, หรืออัสนัฟ..."
                      className="w-full rounded-xl border border-teal-200 bg-white pl-9 pr-20 py-2 text-xs text-slate-800 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-0.5 rounded"
                      >
                        ล้างการค้นหา
                      </button>
                    )}
                  </div>

                  {/* Scrollable Application Selection List */}
                  {loadingData ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
                      กำลังโหลดข้อมูลคำร้องที่พร้อมเบิกจ่าย...
                    </div>
                  ) : filteredApps.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-teal-200 bg-white/80 p-6 text-center text-xs text-slate-500">
                      {searchQuery ? (
                        <>ไม่พบคำร้องที่ตรงกับคำค้นหา "{searchQuery}"</>
                      ) : (
                        <>ไม่มีรายการคำร้องที่ผ่านการอนุมัติและรอเบิกจ่ายในขณะนี้</>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                      {filteredApps.map((app) => {
                        const isAlreadyAdded = items.some((it) => it.applicationId === app.id);
                        const isSelected = selectedAppId === app.id;

                        return (
                          <div
                            key={app.id}
                            onClick={() => {
                              if (isAlreadyAdded) return;
                              setSelectedAppId(app.id);
                              setAidDisbAmount(String(app.remainingAmount));
                            }}
                            className={`group relative rounded-xl border p-3 transition text-xs ${
                              isAlreadyAdded
                                ? 'border-slate-200 bg-slate-100/70 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-600/30 shadow-xs cursor-pointer'
                                : 'border-teal-100 bg-white hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer shadow-xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-[11px]">
                                  {app.applicationNo}
                                </span>
                                <span className="font-bold text-slate-900 text-xs">{app.beneficiaryName}</span>
                                <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium">
                                  {app.asnafCategory}
                                </span>
                                {app.assistanceType && (
                                  <span className="rounded bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 text-[10px] font-medium">
                                    {app.assistanceType}
                                  </span>
                                )}
                              </div>

                              <div className="shrink-0 text-right">
                                {isAlreadyAdded ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                    <Check className="h-3 w-3" /> เพิ่มในรอบนี้แล้ว
                                  </span>
                                ) : isSelected ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                                    <Check className="h-3 w-3" /> เลือกอยู่
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-teal-600 group-hover:underline font-semibold">
                                    คลิกเพื่อเลือก
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                              <div>
                                <span className="text-slate-400">เลขบัตร / ทะเบียน: </span>
                                <span className="font-mono text-slate-700">{app.nationalId || app.registrationNo || '-'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">วงเงินอนุมัติ: </span>
                                <span className="font-bold text-slate-800">฿{app.approvedAmount.toLocaleString('th-TH')}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">เบิกแล้ว: </span>
                                <span className="font-semibold text-slate-700">฿{app.disbursedAmount.toLocaleString('th-TH')}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">คงเหลือเบิกได้: </span>
                                <span className="font-black text-teal-800">฿{app.remainingAmount.toLocaleString('th-TH')}</span>
                              </div>
                            </div>

                            {app.notes && (
                              <div className="mt-1.5 text-[10px] text-slate-500 line-clamp-1 italic">
                                หมายเหตุ: {app.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SELECTED APPLICATION DETAIL & DISBURSEMENT AMOUNT INPUT */}
                  {selectedApp && (
                    <div className="rounded-xl border border-teal-300 bg-white p-4 shadow-xs space-y-3.5 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-teal-600" />
                          <span className="text-xs font-bold text-teal-900">
                            ข้อมูลคำร้องที่เลือก (ข้อมูลระบบเดิม ล็อกอัตโนมัติ)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAppId('');
                            setAidDisbAmount('');
                            setAidNotes('');
                          }}
                          className="text-[11px] text-slate-400 hover:text-rose-600"
                        >
                          ยกเลิกการเลือก
                        </button>
                      </div>

                      {/* Locked Derived Master Fields */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-teal-50/40 p-3 rounded-xl border border-teal-100 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">รหัสคำร้อง</div>
                          <div className="font-bold font-mono text-teal-900">{selectedApp.applicationNo}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">ผู้ขอรับความช่วยเหลือ</div>
                          <div className="font-bold text-slate-900">{selectedApp.beneficiaryName}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">เลขประจำตัวประชาชน / ทะเบียน</div>
                          <div className="font-mono text-slate-700">{selectedApp.nationalId} {selectedApp.registrationNo ? `(${selectedApp.registrationNo})` : ''}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">หมวดอัสนัฟ</div>
                          <div className="font-semibold text-emerald-800">{selectedApp.asnafCategory}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">ประเภทความช่วยเหลือ / กองทุน</div>
                          <div className="font-semibold text-slate-800">{selectedApp.assistanceType || 'ปัจจัยยังชีพ'} {selectedApp.specificFundName ? `· ${selectedApp.specificFundName}` : ''}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">วงเงินอนุมัติ / เบิกแล้ว</div>
                          <div className="text-slate-800">
                            อนุมัติ ฿{selectedApp.approvedAmount.toLocaleString('th-TH')} · เบิกแล้ว ฿{selectedApp.disbursedAmount.toLocaleString('th-TH')}
                          </div>
                        </div>
                      </div>

                      {/* Disbursement Input & Validation */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-700">
                              ยอดเงินที่ขอเบิกจ่ายรอบนี้ (บาท) <span className="text-rose-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setAidDisbAmount(String(selectedApp.remainingAmount))}
                              className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md transition"
                            >
                              เบิกเต็มจำนวน: ฿{selectedApp.remainingAmount.toLocaleString('th-TH')}
                            </button>
                          </div>
                          <div className="mt-1 relative">
                            <input
                              type="number"
                              step="0.01"
                              min="1"
                              max={selectedApp.remainingAmount}
                              value={aidDisbAmount}
                              onChange={(e) => setAidDisbAmount(e.target.value)}
                              placeholder="0.00"
                              className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none tabular-nums ${
                                parseFloat(aidDisbAmount) > selectedApp.remainingAmount || parseFloat(aidDisbAmount) <= 0
                                  ? 'border-rose-400 bg-rose-50/40 text-rose-800 focus:border-rose-600'
                                  : 'border-teal-300 bg-white text-slate-900 focus:border-teal-600'
                              }`}
                            />
                          </div>
                          {parseFloat(aidDisbAmount) > selectedApp.remainingAmount ? (
                            <div className="mt-1 text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              ยอดเบิกเกินวงเงินคงเหลือที่ขอเบิกได้ (คงเหลือ ฿{selectedApp.remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })})
                            </div>
                          ) : (
                            <div className="mt-1 text-[10px] text-teal-700">
                              * วงเงินคงเหลือที่สามารถขอเบิกได้: ฿{selectedApp.remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700">หมายเหตุรายการย่อย</label>
                          <input
                            type="text"
                            value={aidNotes}
                            onChange={(e) => setAidNotes(e.target.value)}
                            placeholder="เช่น เบิกเงินสดเพื่อมอบแก่ผู้รับความช่วยเหลือ งวดที่ 1"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-600"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleAddAidItem}
                          disabled={
                            !aidDisbAmount ||
                            parseFloat(aidDisbAmount) <= 0 ||
                            parseFloat(aidDisbAmount) > selectedApp.remainingAmount ||
                            items.some((it) => it.applicationId === selectedApp.id)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4" /> เพิ่มรายการช่วยเหลือนี้เข้าสู่รอบเบิก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FORM: ADMIN ITEM */}
              {itemType === 'admin' && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                  <div className="text-xs font-bold text-blue-900">
                    เลือกหมวดหมู่ค่าใช้จ่ายบริหารสำนักงาน (Master Data)
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600">
                        หมวดค่าใช้จ่าย <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedCatId}
                        onChange={(e) => setSelectedCatId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none"
                      >
                        {adminCats.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.name} ({c.groupName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600">
                        จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={adminAmount}
                        onChange={(e) => setAdminAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600">
                        รายละเอียดค่าใช้จ่าย <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={adminDescription}
                        onChange={(e) => setAdminDescription(e.target.value)}
                        placeholder="เช่น ค่าน้ำมันเชื้อเพลิงรถยนต์ส่วนกลางลงพื้นที่"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600">ผู้รับเงิน / ร้านค้า</label>
                      <input
                        type="text"
                        value={adminPayee}
                        onChange={(e) => setAdminPayee(e.target.value)}
                        placeholder="เช่น สถานีบริการน้ำมัน ปตท."
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddAdminItem}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-800"
                  >
                    <Plus className="h-4 w-4" /> เพิ่มรายการค่าบริหารนี้เข้าสู่รอบเบิก
                  </button>
                </div>
              )}

              {/* TABLE OF ADDED ITEMS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>รายการย่อยที่เพิ่มแล้วในรอบนี้ ({items.length} รายการ)</span>
                  <span className="text-emerald-700 font-extrabold text-sm">
                    รวมทั้งรอบ: ฿{totalBatchAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                    ยังไม่มีรายการย่อยในรอบเบิกนี้ กรุณาเลือกรายการด้านบนและกดเพิ่มรายการ
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 font-bold text-slate-600">
                        <tr>
                          <th className="py-2.5 pl-3 pr-2">#</th>
                          <th className="px-2 py-2.5">ประเภท</th>
                          <th className="px-2 py-2.5">รายละเอียด / ผู้รับ</th>
                          <th className="px-2 py-2.5 text-right">จำนวนเงิน (บาท)</th>
                          <th className="py-2.5 pl-2 pr-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it, idx) => (
                          <tr key={`item-${idx}`} className="hover:bg-slate-50/60">
                            <td className="py-2.5 pl-3 pr-2 font-medium text-slate-400">{idx + 1}</td>
                            <td className="px-2 py-2.5">
                              <span
                                className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                  it.type === 'aid'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {it.type === 'aid' ? 'ช่วยเหลือ' : 'ค่าบริหาร'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5">
                              {it.type === 'aid' ? (
                                <div>
                                  <div className="font-semibold text-slate-800">{it.beneficiaryName}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {it.applicationNo} · อัสนัฟ {it.asnafCategory}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-semibold text-slate-800">{it.description}</div>
                                  <div className="text-[11px] text-slate-400">
                                    หมวด: {it.categoryName} {it.payeeName ? `· ผู้รับ: ${it.payeeName}` : ''}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-right font-bold text-slate-900 tabular-nums">
                              ฿
                              {Number(it.thisDisbursementAmount || it.amount || 0).toLocaleString('th-TH', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2.5 pl-2 pr-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & SUMMARY */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  สรุปรายละเอียดรอบการเบิกเงิน
                </div>
                <div className="text-base font-extrabold text-slate-800">{title}</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                  <div>
                    <span className="text-slate-400">ผู้จัดทำ:</span> <span className="font-semibold text-slate-900">{actor.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">บัญชีต้นทาง:</span>{' '}
                    <span className="font-semibold text-amber-900">{selectedTreasurer?.accountName || 'บัญชีเหรัญญิก'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">ผู้รับผิดชอบต้นทาง:</span>{' '}
                    <span className="font-semibold text-slate-900">{selectedTreasurer?.custodianName || 'เหรัญญิก'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">กองทุน:</span> <span className="font-semibold text-slate-900">{fundType}</span>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown Card */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3.5">
                  <div className="text-[11px] font-bold text-teal-800">ยอดช่วยเหลือซะกาต ({items.filter((i) => i.type === 'aid').length} ราย)</div>
                  <div className="mt-1 text-xl font-black text-teal-900">
                    ฿{totalAidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5">
                  <div className="text-[11px] font-bold text-blue-800">ยอดค่าใช้จ่ายบริหาร ({items.filter((i) => i.type === 'admin').length} รายการ)</div>
                  <div className="mt-1 text-xl font-black text-blue-900">
                    ฿{totalAdminAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-900 bg-slate-900 p-3.5 text-white">
                  <div className="text-[11px] font-bold text-emerald-400">ยอดขอเบิกรวมทั้งรอบ</div>
                  <div className="mt-1 text-2xl font-black text-white">
                    ฿{totalBatchAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Balance Warning Banner if Insufficient */}
              {isBalanceInsufficient && selectedTreasurer && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-900 text-sm">
                      ยอดเงินในบัญชีเหรัญญิกไม่เพียงพอสำหรับการเบิกจ่าย
                    </div>
                    <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                      เงินสดคงเหลือในบัญชีเหรัญญิกมี <strong>฿{selectedTreasurer.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong> แต่ยอดขอเบิกรอบนี้คือ <strong>฿{totalBatchAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong> (ขาดอีก ฿{(totalBatchAmount - selectedTreasurer.currentBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}) กรุณาปรับลดจำนวนเงิน หรือรอให้เหรัญญิกถอนเงินสดจากธนาคารเข้าคลังก่อน
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                <div className="font-bold">คำชี้แจงขั้นตอน Workflow:</div>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px]">
                  <li>หากเลือก <strong>&quot;บันทึกเป็นแบบร่าง&quot;</strong>: คำขอจะยังไม่ส่งถึงเหรัญญิก สามารถกลับมาแก้ไขเพิ่มรายการได้</li>
                  <li>หากเลือก <strong>&quot;ยื่นขออนุมัติเหรัญญิก&quot;</strong>: คำขอจะถูกส่งไปยังกล่องงานเหรัญญิกเพื่อพิจารณาอนุมัติและนัดหมายส่งมอบเงินสด</li>
                  <li><strong>ยอดเงินจะยังไม่ถูกตัดบัญชี</strong> จนกว่าเหรัญญิกจะส่งมอบเงินสดและเจ้าหน้าที่กดยืนยันรับเงิน</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4 rounded-b-3xl">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              ย้อนกลับ
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
          )}

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  if (step === 1) {
                    if (!title.trim()) {
                      setError('กรุณาระบุวัตถุประสงค์หรือชื่อรอบการเบิก');
                      return;
                    }
                    if (!sourceAccountId || treasurerAccounts.length === 0) {
                      setError('ไม่มีบัญชีเหรัญญิกที่พร้อมใช้งานสำหรับการเบิกจ่าย ไม่สามารถดำเนินการต่อได้');
                      return;
                    }
                  }
                  if (step === 2 && items.length === 0) {
                    setError('กรุณาเพิ่มรายการย่อยอย่างน้อย 1 รายการก่อนดำเนินการต่อ');
                    return;
                  }
                  setStep((s) => (s + 1) as any);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-teal-800"
              >
                ขั้นตอนถัดไป <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy || isBalanceInsufficient || !sourceAccountId || treasurerAccounts.length === 0}
                  onClick={() => handleSave(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> บันทึกเป็นแบบร่าง
                </button>
                <button
                  type="button"
                  disabled={busy || isBalanceInsufficient || !sourceAccountId || treasurerAccounts.length === 0}
                  onClick={() => handleSave(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-teal-700/20 hover:bg-teal-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> ยื่นขออนุมัติเหรัญญิก
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
