'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  Users, 
  ShieldCheck, 
  Building, 
  Layers, 
  CheckCircle2, 
  Save, 
  AlertTriangle, 
  Lock, 
  Sliders, 
  UserCheck, 
  ArrowRight
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface FinanceSettingsTabProps {
  onNavigateTab: (tabKey: string) => void;
}

export function FinanceSettingsTab({ onNavigateTab }: FinanceSettingsTabProps) {
  const { currentUser, showToast } = useApp();

  // Settings states with defaults from prompt
  const [treasurerName, setTreasurerName] = useState('นายรุสลัน หะสาเมาะ');
  const [withdrawerName, setWithdrawerName] = useState('นายมุกลิส มีระยะ');
  const [chiefApproverName, setChiefApproverName] = useState('อิหม่ามฟารุก อาลี');

  const [officerLimit, setOfficerLimit] = useState(5000);
  const [financeLimit, setFinanceLimit] = useState(50000);
  const [boardLimit, setBoardLimit] = useState(500000);

  const [isSaved, setIsSaved] = useState(false);

  const isSuperAdminOrFinance = ['super_admin', 'finance'].includes(currentUser.role);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdminOrFinance) {
      showToast('คุณไม่มีสิทธิ์แก้ไขการตั้งค่าระดับนโยบาย (เฉพาะ Super Admin / Finance)', 'error');
      return;
    }

    setIsSaved(true);
    showToast('บันทึกการตั้งค่าระบบการเงินและผู้รับผิดชอบเรียบร้อยแล้ว', 'success');
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
            <Settings className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              การตั้งค่านโยบายการเงิน ผู้รับผิดชอบ และวงเงินอนุมัติ
            </h2>
            <p className="text-xs text-slate-500">
              กำหนดผู้รับผิดชอบกระบวนการเบิกเงินสด วงเงินอำนาจอนุมัติ และนโยบายชะรีอะฮ์
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Settings (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* 1. Cash Workflow Custodians */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Users className="w-4 h-4 text-emerald-700" />
                1. ผู้รับผิดชอบกระบวนการฝาก–เบิกเงินสด (ตามข้อกำหนดมูลนิธิ)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ผู้รับฝากเหรัญญิก (ขั้นตอนที่ 2) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isSuperAdminOrFinance}
                    value={treasurerName}
                    onChange={(e) => setTreasurerName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ผู้ตรวจรับเงินสดจากธนาคารเข้าบัญชีเหรัญญิกมูลนิธิ
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ผู้เบิกเงินสดเพื่อจัดสรรช่วยเหลือ (ขั้นตอนที่ 3) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isSuperAdminOrFinance}
                    value={withdrawerName}
                    onChange={(e) => setWithdrawerName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ผู้รับมอบเงินสดเพื่อนำไปส่งมอบให้แก่ผู้ยากไร้/ผู้มีสิทธิ์
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    ผู้อนุมัติการจัดสรรและปิดรายการ (ขั้นตอนที่ 4 & 5) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isSuperAdminOrFinance}
                    value={chiefApproverName}
                    onChange={(e) => setChiefApproverName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* 2. Approval Limits */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sliders className="w-4 h-4 text-emerald-700" />
                2. เพดานวงเงินอำนาจอนุมัติ (Financial Approval Limits)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เจ้าหน้าที่สำรวจ (Officer)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                    <input
                      type="number"
                      disabled={!isSuperAdminOrFinance}
                      value={officerLimit}
                      onChange={(e) => setOfficerLimit(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">สูงสุดต่อหนึ่งคำร้อง</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ฝ่ายการเงิน / เหรัญญิก (Finance)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                    <input
                      type="number"
                      disabled={!isSuperAdminOrFinance}
                      value={financeLimit}
                      onChange={(e) => setFinanceLimit(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">สูงสุดต่อหนึ่งคำร้อง</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ประธาน / คณะกรรมการ (Board)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                    <input
                      type="number"
                      disabled={!isSuperAdminOrFinance}
                      value={boardLimit}
                      onChange={(e) => setBoardLimit(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">วงเงินเกินนี้ต้องผ่านมติกรรมการ</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            {isSuperAdminOrFinance && (
              <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  บันทึกการตั้งค่านโยบาย
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Quick Links to Master Configuration Tabs */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Layers className="w-4 h-4 text-emerald-700" />
              การจัดการหมวดหมู่และสัดส่วนนโยบาย
            </h3>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => onNavigateTab('asnaf')}
                className="w-full p-3 text-left rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 flex items-center justify-between group transition-colors"
              >
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-emerald-800">
                    กำหนดสัดส่วน 8 อัสนัฟ
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ฟากีร 70%, อามีลีน 12%, ฟีสาบิลฯ 7% ฯลฯ
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab('faqir_miskin')}
                className="w-full p-3 text-left rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 flex items-center justify-between group transition-colors"
              >
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-emerald-800">
                    กำหนด 5 กองทุนย่อยฟากีร-มิสกิน
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ปัจจัยยังชีพ, ที่อยู่อาศัย, ทุนการศึกษา ฯลฯ
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab('admin_expenses')}
                className="w-full p-3 text-left rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 flex items-center justify-between group transition-colors"
              >
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-emerald-800">
                    จัดการ 10 หมวดค่าใช้จ่ายบริหาร
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ค่าตอบแทน, ค่าน้ำมัน, สำนักงาน, ตรวจสอบบัญชี
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab('bank_accounts')}
                className="w-full p-3 text-left rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 flex items-center justify-between group transition-colors"
              >
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-emerald-800">
                    จัดการ 3 บัญชีธนาคารหลัก
                  </div>
                  <div className="text-[11px] text-slate-500">
                    อิสลามแห่งประเทศไทย, กรุงไทย ยะลา
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          {/* Shariah Assurance Notice */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl text-xs space-y-1.5 text-emerald-900">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              หลักเกณฑ์ความปลอดภัยชะรีอะฮ์
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              การปรับเปลี่ยนสัดส่วนเปอร์เซ็นต์จะมีผลต่อการคำนวณงบเป้าหมายของรอบบัญชีใหม่เท่านั้น และจะไม่ย้อนกลับไปแก้ไขยอดธุรกรรมที่ได้รับการอนุมัติและจ่ายไปแล้วโดยอัตโนมัติ ทุกการแก้ไขจะถูกบันทึกลงใน Audit Log
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
