'use client';

import React, { useEffect, useState } from 'react';
import type { CashFlowWorkflow } from '@/types';

type Actor = { id: string; name: string; role: string };
type Dialog = '' | 'treasurer' | 'resolution' | 'voucher' | 'confirm' | 'clear' | 'close';

function baht(value: number) {
  return `฿${(Number.isFinite(value) ? value : 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cycleLabel(flow: CashFlowWorkflow) {
  if (flow.overallStatus === 'cancelled' || flow.step1Status === 'cancelled') return { text: 'ยกเลิก', className: 'bg-red-50 text-[#DC2626]' };
  if (flow.overallStatus === 'completed') return { text: 'ปิดรายการแล้ว', className: 'bg-teal-50 text-[#0D9488]' };
  if (flow.step1Status === 'draft') return { text: 'แบบร่าง', className: 'bg-slate-100 text-[#64748B]' };
  if (flow.step1Status === 'pending_approval') return { text: 'รออนุมัติ', className: 'bg-amber-50 text-amber-700' };
  if (flow.step1Status === 'approved') return { text: 'อนุมัติแล้ว', className: 'bg-blue-50 text-[#2563EB]' };
  if (flow.step2Status === 'pending' || flow.step2Status === 'draft') return { text: 'ถอนจากธนาคารแล้ว', className: 'bg-blue-50 text-[#2563EB]' };
  if ((flow.pendingVoucherCount || 0) > 0) return { text: 'รอตรวจสอบหลักฐาน', className: 'bg-amber-50 text-amber-700' };
  if ((flow.totalCashWithdrawn || 0) > 0) return { text: 'เบิกเงินสดแล้ว', className: 'bg-blue-50 text-[#2563EB]' };
  return { text: 'เหรัญญิกยืนยันรับเงินแล้ว', className: 'bg-teal-50 text-[#0D9488]' };
}

function Popup({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-lg font-bold text-[#0B2545]">{title}</div>
          <button type="button" onClick={onClose} className="text-sm text-slate-400">ปิด</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function CashCycle({ workflow, actor, onChanged }: { workflow: CashFlowWorkflow; actor: Actor; onChanged: () => void }) {
  const [dialog, setDialog] = useState<Dialog>('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const label = cycleLabel(workflow);
  const received = workflow.step2Status === 'received' || workflow.step2Status === 'completed' ? Number(workflow.step2DepositAmount || 0) : 0;
  const drawn = Number(workflow.totalCashWithdrawn || 0);
  const cashLeft = Number(workflow.availableTreasurerCash || 0);
  const field = 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';
  const zakat = (workflow.step1FundType || 'zakat') === 'zakat';

  useEffect(() => {
    if (!dialog) return;
    fetch('/api/finance/documents?view=resolutions').then((response) => response.json()).then((body) => { if (body.success) setResolutions(body.data); });
    fetch('/api/finance/admin-expenses/categories').then((response) => response.json()).then((body) => {
      if (body.success) setCategories((body.data || []).filter((item: { code?: string }) => !String(item.code || '').startsWith('TASK6')));
    });
  }, [dialog]);

  async function post(url: string, payload: Record<string, unknown>) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.error || 'บันทึกไม่สำเร็จ');
    return body.data;
  }
  async function put(payload: Record<string, unknown>) {
    const response = await fetch('/api/finance/cash-flow', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, actor }) });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.error || 'บันทึกไม่สำเร็จ');
    return body.data;
  }

  async function confirmTreasurer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await put({ step: 2, workflowId: workflow.id, input: { depositAmount: Number(form.get('amount')), proofUrl: String(form.get('proof') || ''), status: 'received', treasurerName: String(form.get('treasurer') || ''), handoverPersonName: actor.name, mismatchReason: String(form.get('reason') || '') } });
      setDialog('');
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'ยืนยันไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function saveResolution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await post('/api/finance/documents', { action: 'create_resolution', actor, input: { meetingNo: form.get('meetingNo'), meetingDate: form.get('meetingDate'), detail: form.get('detail'), moneyType: zakat ? 'zakat' : 'operational_admin', approvedAmount: Number(form.get('amount')) } });
      setDialog('');
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'บันทึกมติไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function saveVoucher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const resolutionId = String(form.get('resolutionId') || '');
    const aid = apps.filter((app) => Number(app.pay) > 0).map((app) => ({ applicationId: app.applicationId, amount: Number(app.pay) }));
    const adminAmount = Number(form.get('adminAmount') || 0);
    setBusy(true);
    setError('');
    try {
      if (!resolutionId) throw new Error('ต้องเลือกมติที่ประชุม');
      if (aid.length === 0 && adminAmount <= 0) throw new Error('ต้องมีรายการช่วยเหลือหรือค่าบริหาร');
      if (aid.length > 0) {
        await post('/api/finance/documents', { action: 'issue_voucher', actor, input: { workflowId: workflow.id, resolutionId, voucherType: 'aid_disbursement', receiverName: form.get('receiver'), purpose: form.get('purpose'), proofUrl: form.get('proof'), aidLines: aid } });
      }
      if (adminAmount > 0) {
        await post('/api/finance/documents', { action: 'issue_voucher', actor, input: { workflowId: workflow.id, resolutionId, voucherType: 'office_expense', receiverName: form.get('receiver'), purpose: form.get('purpose'), proofUrl: form.get('proof'), adminLines: [{ categoryName: form.get('category'), description: form.get('adminDetail'), amount: adminAmount, payeeName: form.get('payee') }] } });
      }
      setDialog('');
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'บันทึกใบเบิกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function confirmVoucher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await post('/api/finance/cash-flow', { action: 'confirm_disbursement', actor, input: { withdrawalId: form.get('withdrawalId'), proofUrl: form.get('proof'), notes: form.get('notes') } });
      setDialog('');
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'ยืนยันการจ่ายไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function clearCash(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await post('/api/finance/cash-flow', { action: 'clear_petty_cash', actor, input: { withdrawalId: form.get('withdrawalId'), spentAmount: Number(form.get('spent') || 0), returnedAmount: Number(form.get('returned') || 0), proofUrl: form.get('proof'), notes: form.get('notes'), items: [{ description: String(form.get('detail') || 'ค่าใช้จ่ายบริหาร'), amount: Number(form.get('spent') || 0), categoryName: String(form.get('category') || 'อื่น ๆ'), receiptUrl: String(form.get('proof') || '') }] } });
      setDialog('');
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'บันทึกคืนเงินไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function openClose() {
    setError('');
    const response = await fetch(`/api/finance/cash-flow?audit_summary=true&workflowId=${workflow.id}`);
    const body = await response.json();
    if (!body.success) { setError(body.error || 'ตรวจยอดไม่สำเร็จ'); return; }
    setAudit(body.data);
    setDialog('close');
  }

  async function closeRound() {
    setBusy(true);
    setError('');
    try {
      await put({ step: 5, workflowId: workflow.id, input: { notes: 'ปิดรอบหลังตรวจยอดจากรายการจริง' } });
      setDialog('');
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'ปิดรอบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const aidTotal = apps.reduce((sum, app) => sum + (Number(app.pay) || 0), 0);

  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-[#0B2545]">วงจรเงินสดของรายการนี้</div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${label.className}`}>{label.text}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-2">รับเข้าเหรัญญิก<div className="font-bold text-[#0B2545]">{baht(received)}</div></div>
        <div className="rounded-xl bg-slate-50 p-2">จ่ายให้เจ้าหน้าที่<div className="font-bold text-[#0B2545]">{baht(drawn)}</div></div>
        <div className="rounded-xl bg-slate-50 p-2">คงเหลือเหรัญญิก<div className="font-bold text-[#0D9488]">{baht(cashLeft)}</div></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {workflow.step1Status === 'completed' && workflow.step2Status === 'pending' ? <button type="button" onClick={() => { setError(''); setDialog('treasurer'); }} className="rounded-xl bg-[#0D9488] px-3 py-2 text-xs font-bold text-white">เหรัญญิกยืนยันรับเงิน</button> : null}
        <button type="button" onClick={() => { setError(''); setDialog('resolution'); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">บันทึกมติประชุม</button>
        {received > 0 && workflow.overallStatus !== 'completed' ? <button type="button" onClick={() => { setError(''); setDialog('voucher'); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">ใบเบิกตามมติ</button> : null}
        {(workflow.withdrawals || []).some((item) => item.voucherType !== 'office_expense' && item.status === 'draft') ? <button type="button" onClick={() => { setError(''); setDialog('confirm'); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">ยืนยันจ่ายช่วยเหลือ</button> : null}
        {(workflow.withdrawals || []).some((item) => item.voucherType === 'office_expense' && item.status !== 'cancelled') ? <button type="button" onClick={() => { setError(''); setDialog('clear'); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">ตรวจค่าบริหารและคืนเงิน</button> : null}
        {workflow.overallStatus !== 'completed' ? <button type="button" onClick={openClose} className="rounded-xl bg-[#0B2545] px-3 py-2 text-xs font-bold text-white">ตรวจยอดและปิดรอบ</button> : null}
      </div>
      {(workflow.withdrawals || []).slice(0, 6).map((item) => (
        <div key={item.id} className="flex justify-between gap-2 text-xs text-slate-500">
          <span>{item.withdrawalNo} · {item.voucherType === 'office_expense' ? 'ค่าบริหาร' : 'ช่วยเหลือ'} · {item.withdrawerName}</span>
          <span className="font-semibold text-slate-700">{baht(item.amount)} · {item.status === 'draft' ? 'แบบร่าง' : item.status === 'completed' || item.status === 'disbursed' ? 'จ่ายแล้ว' : item.status}</span>
        </div>
      ))}
      {error && !dialog ? <p className="text-xs text-[#DC2626]">{error}</p> : null}

      {dialog === 'treasurer' ? (
        <Popup title="เหรัญญิกยืนยันรับเงิน" onClose={() => setDialog('')}>
          <form onSubmit={confirmTreasurer} className="grid gap-3">
            <p className="text-xs text-slate-500">ยอดเหรัญญิกจะเพิ่มเมื่อยืนยันรับเงินจริงเท่านั้น และยังไม่นับเป็นค่าใช้จ่าย</p>
            <label className="text-xs text-slate-500">จำนวนที่รับจริง<input name="amount" defaultValue={workflow.step1WithdrawAmount} inputMode="decimal" className={field} /></label>
            <label className="text-xs text-slate-500">เหรัญญิกผู้รับ<input name="treasurer" defaultValue={workflow.step2TreasurerName} className={field} /></label>
            <label className="text-xs text-slate-500">หลักฐานการรับมอบ<input name="proof" required className={field} /></label>
            <label className="text-xs text-slate-500">เหตุผลถ้ายอดไม่ตรงกับที่ถอน<textarea name="reason" className={field} rows={2} /></label>
            {error ? <p className="text-xs text-[#DC2626]">{error}</p> : null}
            <button disabled={busy} className="rounded-xl bg-[#0D9488] py-2 text-sm font-bold text-white">ยืนยันรับเงิน</button>
          </form>
        </Popup>
      ) : null}

      {dialog === 'resolution' ? (
        <Popup title="บันทึกมติที่ประชุม" onClose={() => setDialog('')}>
          <form onSubmit={saveResolution} className="grid gap-3">
            <p className="text-xs text-slate-500">บันทึกมติที่มีอยู่จริง ระบบไม่มีมติตัวอย่างให้เลือก</p>
            <label className="text-xs text-slate-500">ครั้งที่ประชุม<input name="meetingNo" required className={field} /></label>
            <label className="text-xs text-slate-500">วันที่ประชุม<input name="meetingDate" type="date" required className={field} /></label>
            <label className="text-xs text-slate-500">รายละเอียดมติ<textarea name="detail" required className={field} rows={3} /></label>
            <label className="text-xs text-slate-500">วงเงินที่อนุมัติ<input name="amount" inputMode="decimal" required className={field} /></label>
            {error ? <p className="text-xs text-[#DC2626]">{error}</p> : null}
            <button disabled={busy} className="rounded-xl bg-[#0D9488] py-2 text-sm font-bold text-white">บันทึกมติ</button>
          </form>
        </Popup>
      ) : null}

      {dialog === 'voucher' ? (
        <Popup title="ใบเบิกตามมติ" onClose={() => setDialog('')}>
          <form onSubmit={saveVoucher} className="grid gap-3">
            <label className="text-xs text-slate-500">มติที่ประชุม
              <select name="resolutionId" className={field}><option value="">เลือกมติ</option>{resolutions.filter((item) => item.remainingAmount > 0).map((item) => <option key={item.id} value={item.id}>{item.resolutionNo} · {item.meetingNo} · เหลือ {baht(item.remainingAmount)}</option>)}</select>
            </label>
            <label className="text-xs text-slate-500">เจ้าหน้าที่ผู้รับเงิน<input name="receiver" required defaultValue={actor.name} className={field} /></label>
            <label className="text-xs text-slate-500">วัตถุประสงค์<input name="purpose" required className={field} /></label>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-bold text-[#0B2545]">รายการช่วยเหลือ</div>
              <div className="mt-2 flex gap-2">
                <input id="app-search" placeholder="เลขคำร้องหรือชื่อ" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <button type="button" className="rounded-xl bg-[#0B2545] px-3 text-xs font-bold text-white" onClick={async () => {
                  const query = (document.getElementById('app-search') as HTMLInputElement | null)?.value || '';
                  const response = await fetch(`/api/finance/documents?view=applications&q=${encodeURIComponent(query)}`);
                  const body = await response.json();
                  if (body.success) setApps(body.data.map((app: any) => ({ ...app, pay: '' })));
                }}>ค้นหา</button>
              </div>
              {apps.map((app, index) => (
                <div key={app.applicationId} className="mt-2 grid gap-1 border-t border-slate-200 pt-2 text-xs">
                  <div>{app.applicationNo} · {app.beneficiaryName}</div>
                  <div className="text-slate-500">อัสนัฟ {app.asnaf} · {app.assistanceType || '—'} · {app.assistanceFormat || '—'} · เหลือ {baht(app.remainingAmount)}</div>
                  <input value={app.pay} onChange={(event) => setApps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, pay: event.target.value } : item))} inputMode="decimal" placeholder="จำนวนที่จ่าย" className="rounded-lg border border-slate-200 px-2 py-1" />
                </div>
              ))}
              <div className="mt-2 text-right text-sm font-bold">รวมช่วยเหลือ {baht(aidTotal)}</div>
            </div>
            {zakat ? <p className="text-xs text-amber-700">เงินรอบนี้เป็นซะกาต จึงบันทึกค่าบริหารจากรอบนี้ไม่ได้</p> : (
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-bold text-[#0B2545]">ค่าใช้จ่ายบริหาร</div>
                <label className="text-xs text-slate-500">หมวด<select name="category" className={field}>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
                <label className="text-xs text-slate-500">รายละเอียด<input name="adminDetail" className={field} /></label>
                <label className="text-xs text-slate-500">ผู้รับเงิน<input name="payee" className={field} /></label>
                <label className="text-xs text-slate-500">จำนวน<input name="adminAmount" inputMode="decimal" className={field} /></label>
              </div>
            )}
            <label className="text-xs text-slate-500">หลักฐาน<input name="proof" className={field} /></label>
            {error ? <p className="text-xs text-[#DC2626]">{error}</p> : null}
            <button disabled={busy} className="rounded-xl bg-[#0D9488] py-2 text-sm font-bold text-white">บันทึกแบบร่าง</button>
          </form>
        </Popup>
      ) : null}

      {dialog === 'confirm' ? (
        <Popup title="ยืนยันจ่ายช่วยเหลือ" onClose={() => setDialog('')}>
          <form onSubmit={confirmVoucher} className="grid gap-3">
            <label className="text-xs text-slate-500">ใบเบิก
              <select name="withdrawalId" className={field}>{(workflow.withdrawals || []).filter((item) => item.voucherType !== 'office_expense' && item.status === 'draft').map((item) => <option key={item.id} value={item.id}>{item.withdrawalNo} · {baht(item.amount)}</option>)}</select>
            </label>
            <label className="text-xs text-slate-500">หลักฐานการจ่าย<input name="proof" required className={field} /></label>
            <label className="text-xs text-slate-500">หมายเหตุ<input name="notes" className={field} /></label>
            {error ? <p className="text-xs text-[#DC2626]">{error}</p> : null}
            <button disabled={busy} className="rounded-xl bg-[#0D9488] py-2 text-sm font-bold text-white">ยืนยันการจ่าย</button>
          </form>
        </Popup>
      ) : null}

      {dialog === 'clear' ? (
        <Popup title="ตรวจค่าบริหารและคืนเงิน" onClose={() => setDialog('')}>
          <form onSubmit={clearCash} className="grid gap-3">
            <label className="text-xs text-slate-500">ใบค่าบริหาร
              <select name="withdrawalId" className={field}>{(workflow.withdrawals || []).filter((item) => item.voucherType === 'office_expense').map((item) => <option key={item.id} value={item.id}>{item.withdrawalNo} · {baht(item.amount)}</option>)}</select>
            </label>
            <label className="text-xs text-slate-500">หมวด<input name="category" className={field} /></label>
            <label className="text-xs text-slate-500">รายละเอียด<input name="detail" className={field} /></label>
            <label className="text-xs text-slate-500">ใช้ไปจริง<input name="spent" inputMode="decimal" className={field} /></label>
            <label className="text-xs text-slate-500">เงินคืนที่ยืนยัน<input name="returned" inputMode="decimal" className={field} /></label>
            <label className="text-xs text-slate-500">หลักฐาน<input name="proof" required className={field} /></label>
            <label className="text-xs text-slate-500">หมายเหตุ<input name="notes" className={field} /></label>
            {error ? <p className="text-xs text-[#DC2626]">{error}</p> : null}
            <button disabled={busy} className="rounded-xl bg-[#0D9488] py-2 text-sm font-bold text-white">บันทึกการตรวจ</button>
          </form>
        </Popup>
      ) : null}

      {dialog === 'close' && audit ? (
        <Popup title="ตรวจยอดและปิดรอบ" onClose={() => setDialog('')}>
          <div className="grid gap-2 text-sm">
            <div>เบิกจากเหรัญญิก {baht(audit.actualWithdrawnAmount)}</div>
            <div>จ่ายช่วยเหลือจริง {baht(audit.confirmedAidAmount)}</div>
            <div>ค่าบริหารจริง {baht(audit.confirmedOtherExpenseAmount)}</div>
            <div>เงินคืน {baht(audit.totalPettyReturnedAmount)}</div>
            <div className="font-bold text-[#0B2545]">คงเหลือที่ต้องตรวจ {baht(audit.unallocatedAmount)}</div>
            {audit.validationErrors?.length ? <div className="rounded-xl bg-red-50 p-3 text-xs text-[#DC2626]">{audit.validationErrors.join(' · ')}</div> : <div className="rounded-xl bg-teal-50 p-3 text-xs text-[#0D9488]">ยอดพร้อมปิดรอบ</div>}
            {error ? <p className="text-xs text-[#DC2626]">{error}</p> : null}
            <button type="button" disabled={busy || !audit.canClose} onClick={closeRound} className="rounded-xl bg-[#0B2545] py-2 text-sm font-bold text-white disabled:opacity-40">ปิดรอบ</button>
          </div>
        </Popup>
      ) : null}
    </div>
  );
}
