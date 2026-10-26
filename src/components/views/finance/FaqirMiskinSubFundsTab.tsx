'use client';

import React, { useState, useEffect } from 'react';
import { FaqirMiskinSubFund } from '@/types';
import { calculatePennyAllocation } from '@/lib/financeUtils';
import { ModalPortal } from '@/components/common/Modal';
import { 
  HeartHandshake, 
  Plus, 
  Sliders, 
  Save, 
  RefreshCw, 
  Calculator, 
  AlertTriangle, 
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';

interface FaqirMiskinSubFundsTabProps {
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function FaqirMiskinSubFundsTab({ currentUser, showToast }: FaqirMiskinSubFundsTabProps) {
  const [subFunds, setSubFunds] = useState<FaqirMiskinSubFund[]>([]);
  const [editedPercentages, setEditedPercentages] = useState<{ [code: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Penny Allocation Interactive Simulation
  const [simulatedPool, setSimulatedPool] = useState<number>(1438311.34); // Master prompt default example
  const [simulatedResults, setSimulatedResults] = useState<{ [code: string]: number }>({});

  const fetchSubFunds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/finance/allocations/faqir-miskin?year=2569');
      const json = await res.json();
      if (json.success) {
        setSubFunds(json.data);
        const map: { [code: string]: number } = {};
        json.data.forEach((sf: FaqirMiskinSubFund) => {
          map[sf.code] = sf.percentage;
        });
        setEditedPercentages(map);
      }
    } catch (err: any) {
      showToast('ไม่สามารถโหลดข้อมูลกองทุนฟากีร–มิสกินได้: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubFunds();
  }, []);

  // Update simulated penny allocation whenever simulatedPool or editedPercentages changes
  useEffect(() => {
    if (subFunds.length === 0) return;
    const items = subFunds.map((sf) => ({
      code: sf.code,
      pct: editedPercentages[sf.code] ?? sf.percentage,
    }));
    const breakdown = calculatePennyAllocation(simulatedPool, items);
    const resMap: { [code: string]: number } = {};
    breakdown.forEach((val, key) => {
      resMap[key] = val;
    });
    setSimulatedResults(resMap);
  }, [simulatedPool, editedPercentages, subFunds]);

  const totalPercentage = Object.values(editedPercentages).reduce((acc, p) => acc + (Number(p) || 0), 0);
  const isSumValid = Math.abs(totalPercentage - 100.0) < 0.001;

  const handlePercentageChange = (code: string, value: number) => {
    setEditedPercentages((prev) => ({
      ...prev,
      [code]: Number(value),
    }));
  };

  const handleSaveSubFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSumValid) {
      showToast('ผลรวมเปอร์เซ็นต์ต้องเท่ากับ 100% พอดี', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('กรุณาระบุเหตุผลในการปรับปรุงสัดส่วนกองทุนย่อย', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = Object.entries(editedPercentages).map(([code, percentage]) => ({
        code,
        percentage,
      }));

      const res = await fetch('/api/finance/allocations/faqir-miskin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subFunds: payload,
          fiscalYear: '2569',
          policyRef: 'มติการจัดสรรเงินกองทุนฟากีร–มิสกิน ประจำปี 2569',
          reason: reason.trim(),
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึก');

      showToast('บันทึกสัดส่วนกองทุนย่อยฟากีร–มิสกินเรียบร้อยแล้ว', 'success');
      setShowSaveModal(false);
      setIsEditing(false);
      fetchSubFunds();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const simulatedSum = Object.values(simulatedResults).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-emerald-600" />
            การจัดสรรเงินในกองทุนฟากีร–มิสกิน (5 รูปแบบความช่วยเหลือ)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            คำนวณงบประมาณเป้าหมายจากยอดจัดสรรเฉพาะกองทุนฟากีร–มิสกิน พร้อมระบบจัดการเศษสตางค์ให้ยอดรวมตรงกัน 100%
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSubFunds}
            className="p-2 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {['super_admin', 'executive', 'approver'].includes(currentUser.role) && (
            <>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all"
                >
                  <Sliders className="w-4 h-4" />
                  ปรับสัดส่วนเปอร์เซ็นต์
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      fetchSubFunds();
                    }}
                    className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => setShowSaveModal(true)}
                    disabled={!isSumValid}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    บันทึกสัดส่วนใหม่
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Interactive Penny Allocation Calculator Box */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/40 pb-4">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base">เครื่องมือคำนวณการกระจายเศษสตางค์ (Penny Allocation Engine)</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                ทดลองใส่วงเงินกองทุนฟากีร–มิสกิน เพื่อดูการกระจายยอดเงินตามสัดส่วนที่จัดการเศษสตางค์ไม่ให้มีเงินตกหล่น
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSimulatedPool(1438311.34)}
              className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl font-medium transition-colors"
            >
              โหลดตัวอย่าง Master Prompt (1,438,311.34 บาท)
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-72">
            <label className="block text-xs font-medium text-emerald-100 mb-1">ยอดเงินกองทุนฟากีร–มิสกิน (บาท):</label>
            <input
              type="number"
              step="0.01"
              value={simulatedPool}
              onChange={(e) => setSimulatedPool(Number(e.target.value))}
              className="w-full px-3 py-2 text-base font-mono font-bold bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-300 focus:outline-hidden"
            />
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
            {subFunds.map((sf) => {
              const val = simulatedResults[sf.code] || 0;
              const pct = editedPercentages[sf.code] ?? sf.percentage;
              return (
                <div key={sf.id} className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 text-xs">
                  <p className="text-emerald-100 font-medium truncate">{sf.name}</p>
                  <p className="text-[11px] text-emerald-200 font-bold">{pct}%</p>
                  <p className="font-mono font-bold text-sm mt-1">
                    ฿{val.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-emerald-500/40 flex justify-between items-center text-xs">
          <span className="text-emerald-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ยอดรวมทั้ง 5 กองทุนย่อยหลังกระจายเศษสตางค์:
          </span>
          <span className="font-mono font-bold text-base text-white">
            ฿{simulatedSum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (ตรงกับยอดต้นทาง 100%)
          </span>
        </div>
      </div>

      {/* Main Sub-funds Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">สัดส่วน 5 รูปแบบความช่วยเหลือ (กองทุนฟากีร–มิสกิน)</h3>
            <p className="text-xs text-slate-500 mt-0.5">ยอดเงินคำนวณจากฐานเงินจริงในบัญชีกองทุน FND-ZKT-01</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
            รวม: {totalPercentage.toFixed(1)}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="p-3.5">รูปแบบความช่วยเหลือ</th>
                <th className="p-3.5 text-center">สัดส่วนนโยบาย (%)</th>
                <th className="p-3.5 text-right">งบประมาณเป้าหมาย</th>
                <th className="p-3.5 text-right">ยอดจัดสรรจริง</th>
                <th className="p-3.5 text-right">ยอดใช้จ่ายจริง</th>
                <th className="p-3.5 text-right">ยอดคงเหลือ</th>
                <th className="p-3.5 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {subFunds.map((sf) => {
                const currentPct = isEditing ? (editedPercentages[sf.code] ?? sf.percentage) : sf.percentage;
                return (
                  <tr key={sf.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{sf.name}</td>
                    <td className="p-3.5 text-center">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={currentPct}
                            onChange={(e) => handlePercentageChange(sf.code, Number(e.target.value))}
                            className="w-16 px-2 py-1 text-center font-bold font-mono border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                          <span className="text-slate-500 font-bold">%</span>
                        </div>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-100">
                          {sf.percentage.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium">
                      ฿{sf.targetAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-slate-800">
                      ฿{sf.allocatedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-emerald-700">
                      ฿{sf.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      ฿{sf.remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                        เปิดใช้งาน
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-200">
                <td className="p-3.5">รวมทั้งหมด (Total)</td>
                <td className="p-3.5 text-center font-mono text-sm text-emerald-800">
                  {totalPercentage.toFixed(1)}%
                </td>
                <td className="p-3.5 text-right font-mono text-sm">
                  ฿{subFunds.reduce((sum, sf) => sum + sf.targetAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5 text-right font-mono text-sm">
                  ฿{subFunds.reduce((sum, sf) => sum + sf.allocatedAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5 text-right font-mono text-sm text-emerald-700">
                  ฿{subFunds.reduce((sum, sf) => sum + sf.disbursedAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5 text-right font-mono text-sm">
                  ฿{subFunds.reduce((sum, sf) => sum + sf.remainingAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal: Save Sub-funds */}
      {showSaveModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">บันทึกสัดส่วนกองทุนย่อยฟากีร–มิสกิน</h3>
                <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <form onSubmit={handleSaveSubFunds} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เหตุผลและความจำเป็นในการปรับปรุง *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="เช่น ปรับเพิ่มสัดส่วนทุนการศึกษาและต่อยอดอาชีพเพื่อสร้างความยั่งยืน..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันสัดส่วนใหม่'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
