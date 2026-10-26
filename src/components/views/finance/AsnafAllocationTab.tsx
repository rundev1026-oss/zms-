'use client';

import React, { useState, useEffect } from 'react';
import { AsnafAllocation } from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import { 
  PieChart, 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Save, 
  History, 
  Sliders, 
  Info,
  DollarSign
} from 'lucide-react';

interface AsnafAllocationTabProps {
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function AsnafAllocationTab({ currentUser, showToast }: AsnafAllocationTabProps) {
  const [allocations, setAllocations] = useState<AsnafAllocation[]>([]);
  const [editedPercentages, setEditedPercentages] = useState<{ [code: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [policyRef, setPolicyRef] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zakatBasePool, setZakatBasePool] = useState<number>(10000000); // 10M THB base simulation

  const fetchAllocations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/finance/allocations/asnaf?year=2569');
      const json = await res.json();
      if (json.success) {
        setAllocations(json.data);
        const map: { [code: string]: number } = {};
        json.data.forEach((a: AsnafAllocation) => {
          map[a.asnafCode] = a.percentage;
        });
        setEditedPercentages(map);
      }
    } catch (err: any) {
      showToast('ไม่สามารถโหลดข้อมูลสัดส่วนอัสนัฟได้: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const totalPercentage = Object.values(editedPercentages).reduce((acc, p) => acc + (Number(p) || 0), 0);
  const isSumValid = Math.abs(totalPercentage - 100.0) < 0.001;

  const handlePercentageChange = (code: string, value: number) => {
    setEditedPercentages((prev) => ({
      ...prev,
      [code]: Number(value),
    }));
  };

  const handleOpenSave = () => {
    if (!isSumValid) {
      showToast(`ผลรวมเปอร์เซ็นต์ต้องเท่ากับ 100% พอดี (ปัจจุบันได้ ${totalPercentage.toFixed(2)}%)`, 'error');
      return;
    }
    setPolicyRef('มติคณะกรรมการมูลนิธิ ครั้งที่ ' + new Date().getMonth() + '/2569');
    setReason('');
    setShowSaveModal(true);
  };

  const handleSaveAllocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyRef.trim() || !reason.trim()) {
      showToast('กรุณาระบุมตินโยบายและเหตุผลการปรับเปลี่ยนสัดส่วน', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = Object.entries(editedPercentages).map(([asnafCode, percentage]) => ({
        asnafCode,
        percentage,
      }));

      const res = await fetch('/api/finance/allocations/asnaf', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: payload,
          fiscalYear: '2569',
          policyRef: policyRef.trim(),
          reason: reason.trim(),
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกสัดส่วน');

      showToast('บันทึกการปรับปรุงสัดส่วน 8 อัสนัฟเรียบร้อยแล้ว', 'success');
      setShowSaveModal(false);
      setIsEditing(false);
      fetchAllocations();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-600" />
            ระบบจัดสรรเงินซะกาตตาม 8 อัสนัฟ (Asnaf Allocation Engine)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            กำหนดและคำนวณวงเงินงบประมาณเป้าหมายของแต่ละอัสนัฟจากฐานเงินซะกาต รวมกันต้องเท่ากับ 100% เสมอ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllocations}
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
                      fetchAllocations();
                    }}
                    className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleOpenSave}
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

      {/* Validation Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm transition-all ${
          isSumValid
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900 animate-pulse'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isSumValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div>
            <p className="font-bold">
              ผลรวมสัดส่วนปัจจุบัน: <span className="font-mono text-base">{totalPercentage.toFixed(1)}%</span> / 100%
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {isSumValid
                ? 'สัดส่วนครบ 100% ถูกต้องตามหลักเกณฑ์การจัดสรร'
                : `ผลรวมสัดส่วนไม่เท่ากับ 100% (ขาด/เกิน ${Math.abs(totalPercentage - 100).toFixed(1)}%) กรุณาปรับให้ลงตัวก่อนบันทึก`}
            </p>
          </div>
        </div>

        {/* Shariah Policy Disclaimer */}
        <div className="text-[11px] bg-white/70 px-3 py-1.5 rounded-xl border border-slate-200/60 max-w-md text-slate-600">
          <Info className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
          เปอร์เซ็นต์ตั้งต้นเป็นค่าเริ่มต้นจากนโยบายมูลนิธิ การนำไปใช้จริงต้องผ่านการอนุมัติตามมติคณะกรรมการชะรีอะฮ์
        </div>
      </div>

      {/* Allocations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base">ตารางจัดสรร 8 อัสนัฟ ประจำปีซะกาต 2569</h3>
            <p className="text-xs text-slate-500 mt-0.5">คำนวณวงเงินเป้าหมาย ยอดจัดสรรจริง ยอดเบิกจ่าย และยอดคงเหลือ</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="p-3.5">หมวดอัสนัฟ</th>
                <th className="p-3.5 text-center">สัดส่วน (%)</th>
                <th className="p-3.5 text-right">งบประมาณเป้าหมาย</th>
                <th className="p-3.5 text-right">ยอดจัดสรรจริง</th>
                <th className="p-3.5 text-right">ยอดใช้จริง (Disbursed)</th>
                <th className="p-3.5 text-right">ยอดคงเหลือ</th>
                <th className="p-3.5">นโยบายอ้างอิง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {allocations.map((a) => {
                const currentPct = isEditing ? (editedPercentages[a.asnafCode] ?? a.percentage) : a.percentage;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{a.asnafName}</td>
                    <td className="p-3.5 text-center">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={currentPct}
                            onChange={(e) => handlePercentageChange(a.asnafCode, Number(e.target.value))}
                            className="w-16 px-2 py-1 text-center font-bold font-mono border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                          <span className="text-slate-500 font-bold">%</span>
                        </div>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-100">
                          {a.percentage.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium">
                      ฿{a.targetAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-slate-800">
                      ฿{a.allocatedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-emerald-700">
                      ฿{a.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      ฿{a.remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px] truncate max-w-xs">{a.policyRef || '-'}</td>
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
                  ฿{allocations.reduce((sum, a) => sum + a.targetAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5 text-right font-mono text-sm">
                  ฿{allocations.reduce((sum, a) => sum + a.allocatedAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5 text-right font-mono text-sm text-emerald-700">
                  ฿{allocations.reduce((sum, a) => sum + a.disbursedAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5 text-right font-mono text-sm">
                  ฿{allocations.reduce((sum, a) => sum + a.remainingAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal: Save Proportions with Reason */}
      {showSaveModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Save className="w-5 h-5 text-emerald-600" />
                  ยืนยันการปรับปรุงสัดส่วน 8 อัสนัฟ
                </h3>
                <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <form onSubmit={handleSaveAllocations} className="p-6 space-y-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ข้อกำหนดความถูกต้องทางการเงิน
                  </p>
                  การปรับสัดส่วนจะบันทึกเป็นประวัติ Audit Trail และจะไม่มีผลย้อนกลับไปเปลี่ยนธุรกรรมที่อนุมัติไปแล้วโดยอัตโนมัติ
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">มตินโยบายอ้างอิง *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น มติคณะกรรมการชะรีอะฮ์ ครั้งที่ 2/2569"
                    value={policyRef}
                    onChange={(e) => setPolicyRef(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เหตุผลและความจำเป็นในการปรับปรุง *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="ระบุเหตุผล เช่น เพื่อรองรับวิกฤตอุทกภัยฉุกเฉินในพื้นที่ภาคใต้..."
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
                    {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันและบันทึกประวัติ'}
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
