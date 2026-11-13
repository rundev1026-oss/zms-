'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BankAccount } from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import {
  validatePromptPay,
  maskBankAccountNumber,
  maskPromptPayId,
  PromptPayValidationResult
} from '@/lib/promptpayValidator';
import {
  Building2,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Star,
  Eye,
  EyeOff,
  ShieldCheck,
  QrCode,
  Copy,
  ExternalLink,
  RefreshCw,
  X,
  CreditCard,
  Sliders,
  AlertCircle,
  History,
  Trash2,
  Lock
} from 'lucide-react';

interface ReceivingBankAccountsTabProps {
  currentUser: any;
  bankAccounts: BankAccount[];
  onAccountsUpdated: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function ReceivingBankAccountsTab({
  currentUser,
  bankAccounts,
  onAccountsUpdated,
  showToast,
}: ReceivingBankAccountsTabProps) {
  // Strict Role Control: Only Super Admin can manage official bank accounts
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Mask reveal toggles per account ID
  const [revealedMap, setRevealedMap] = useState<Record<string, boolean>>({});

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formAccountName, setFormAccountName] = useState('');
  const [formBankName, setFormBankName] = useState('ธนาคารอิสลามแห่งประเทศไทย');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formAccountType, setFormAccountType] = useState<'savings' | 'current'>('savings');
  const [formBranchName, setFormBranchName] = useState('สำนักงานใหญ่ กรุงเทพมหานคร');
  const [formPromptpayId, setFormPromptpayId] = useState('0-1255-69000-12-6');
  const [formMoneyTypes, setFormMoneyTypes] = useState<string[]>(['zakat', 'sadaqah']);
  const [formOpeningBalance, setFormOpeningBalance] = useState<number>(0);
  const [formEffectiveDate, setFormEffectiveDate] = useState('2569-01-01');
  const [formReason, setFormReason] = useState('ปรับปรุงข้อมูลบัญชีธนาคารตามมติการเงิน');

  // Real-time PromptPay validation state
  const ppValidation = useMemo<PromptPayValidationResult | null>(() => {
    if (!formPromptpayId || !formPromptpayId.trim()) return null;
    return validatePromptPay(formPromptpayId);
  }, [formPromptpayId]);

  // Change Logs Modal State
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [accountLogs, setAccountLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedAccountForLogs, setSelectedAccountForLogs] = useState<BankAccount | null>(null);

  // Gateway Connection Status
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    async function loadGateway() {
      try {
        const res = await fetch('/api/donations/gateway');
        const json = await res.json();
        if (json.success) setGatewayStatus(json.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadGateway();
  }, []);

  const toggleMask = (id: string) => {
    setRevealedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAddModal = () => {
    setFormAccountName('มูลนิธิซะกาตและสาธารณกุศลแห่งประเทศไทย');
    setFormBankName('ธนาคารอิสลามแห่งประเทศไทย');
    setFormAccountNumber('');
    setFormAccountType('savings');
    setFormBranchName('สำนักงานใหญ่ กรุงเทพมหานคร');
    setFormPromptpayId('0-1255-69000-12-6');
    setFormMoneyTypes(['zakat', 'sadaqah']);
    setFormOpeningBalance(0);
    setFormEffectiveDate('2569-01-01');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (acc: BankAccount) => {
    setEditingAccount(acc);
    setFormAccountName(acc.accountName);
    setFormBankName(acc.bankName);
    setFormAccountNumber(acc.accountNumber);
    setFormAccountType(acc.accountType || 'savings');
    setFormBranchName(acc.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร');
    setFormPromptpayId(acc.promptpayId || '0-1255-69000-12-0');
    setFormMoneyTypes(acc.moneyTypes || ['zakat', 'sadaqah']);
    setFormEffectiveDate(acc.effectiveDate || '2569-01-01');
    setFormReason('ปรับปรุงข้อมูลบัญชีธนาคาร');
  };

  const fetchLogsForAccount = async (acc: BankAccount) => {
    setSelectedAccountForLogs(acc);
    setShowLogsModal(true);
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/finance/bank-accounts/logs?bankAccountId=${acc.id}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAccountLogs(json.data);
      } else {
        setAccountLogs([]);
      }
    } catch (err) {
      console.error(err);
      setAccountLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDeleteAccount = async (acc: BankAccount) => {
    const confirmDelete = window.confirm(
      `คุณต้องการลบบัญชีธนาคาร "${acc.bankName} - ${acc.accountNumber}" หรือไม่?\n\nคำเตือน: หากมีประวัติธุรกรรมผูกอยู่ ระบบจะไม่อนุญาตให้ลบเด็ดขาด`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/finance/bank-accounts?id=${acc.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role || 'super_admin',
          'x-user-id': currentUser.id || 'super-admin-1',
          'x-user-name': currentUser.name || 'Super Admin',
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถลบบัญชีธนาคารได้', 'error');
        return;
      }
      showToast('ลบบัญชีธนาคารเรียบร้อยแล้ว', 'success');
      onAccountsUpdated();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการลบบัญชี', 'error');
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccountName.trim() || !formBankName.trim() || !formAccountNumber.trim()) {
      showToast('กรุณากรอกข้อมูลบัญชีให้ครบถ้วน', 'error');
      return;
    }

    if (formPromptpayId.trim() && ppValidation && !ppValidation.valid) {
      showToast(`รูปแบบ PromptPay ไม่ถูกต้อง: ${ppValidation.error}`, 'error');
      return;
    }

    if (formMoneyTypes.length === 0) {
      showToast('กรุณาเลือกประเภทเงินที่บัญชีนี้รองรับอย่างน้อย 1 ประเภท', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAccount) {
        // Edit existing
        const res = await fetch('/api/finance/bank-accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAccount.id,
            input: {
              accountName: formAccountName.trim(),
              bankName: formBankName.trim(),
              accountNumber: formAccountNumber.trim(),
              accountType: formAccountType,
              branchName: formBranchName.trim(),
              promptpayId: ppValidation?.normalized || formPromptpayId.trim(),
              moneyTypes: formMoneyTypes,
              effectiveDate: formEffectiveDate,
              reason: formReason.trim(),
            },
            actor: {
              id: currentUser.id || 'u-1',
              name: currentUser.name || 'ผู้ดูแลระบบสูงสุด',
              role: currentUser.role || 'super_admin',
            },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          showToast(json.error || 'เกิดข้อผิดพลาดในการแก้ไขบัญชี', 'error');
          return;
        }
        showToast('แก้ไขข้อมูลบัญชีธนาคารเรียบร้อยแล้ว', 'success');
        setEditingAccount(null);
      } else {
        // Create new
        const res = await fetch('/api/finance/bank-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: {
              accountName: formAccountName.trim(),
              bankName: formBankName.trim(),
              accountNumber: formAccountNumber.trim(),
              accountType: formAccountType,
              branchName: formBranchName.trim(),
              promptpayId: ppValidation?.normalized || formPromptpayId.trim(),
              moneyTypes: formMoneyTypes,
              openingBalance: formOpeningBalance,
              effectiveDate: formEffectiveDate,
            },
            actor: {
              id: currentUser.id || 'u-1',
              name: currentUser.name || 'ผู้ดูแลระบบสูงสุด',
              role: currentUser.role || 'super_admin',
            },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          showToast(json.error || 'เกิดข้อผิดพลาดในการเพิ่มบัญชี', 'error');
          return;
        }
        showToast('เพิ่มบัญชีธนาคารรับเงินเรียบร้อยแล้ว', 'success');
        setShowAddModal(false);
      }
      onAccountsUpdated();
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (acc: BankAccount) => {
    const nextStatus = acc.status === 'active' ? 'inactive' : 'active';
    const confirmToggle = window.confirm(
      `คุณต้องการ${acc.status === 'active' ? 'ปิดการใช้งานชั่วคราว' : 'เปิดใช้งาน'} บัญชีธนาคาร "${acc.bankName} - ${acc.accountNumber}" หรือไม่?`
    );
    if (!confirmToggle) return;

    try {
      const res = await fetch('/api/finance/bank-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: acc.id,
          status: nextStatus,
          actor: {
            id: currentUser.id || 'u-1',
            name: currentUser.name || 'ผู้ดูแลระบบสูงสุด',
            role: currentUser.role || 'super_admin',
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'เกิดข้อผิดพลาด', 'error');
        return;
      }
      showToast(
        nextStatus === 'active'
          ? `เปิดใช้งานบัญชี ${acc.bankName} (${acc.accountNumber}) แล้ว`
          : `ปิดการใช้งานบัญชี ${acc.bankName} (${acc.accountNumber}) ชั่วคราวแล้ว`,
        'info'
      );
      onAccountsUpdated();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSetDefault = async (acc: BankAccount) => {
    const confirmDefault = window.confirm(
      `คุณต้องการกำหนดบัญชี "${acc.bankName} - ${acc.accountNumber}" (${acc.accountName}) เป็นบัญชีหลักของมูลนิธิหรือไม่?\n\nหมายเหตุ: ระบบจะแนะนำบัญชีนี้เป็นลำดับแรกในการรับเงินบริจาค`
    );
    if (!confirmDefault) return;

    try {
      const res = await fetch('/api/finance/bank-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: acc.id,
          action: 'set_default',
          actor: {
            id: currentUser.id || 'u-1',
            name: currentUser.name || 'ผู้ดูแลระบบสูงสุด',
            role: currentUser.role || 'super_admin',
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'เกิดข้อผิดพลาด', 'error');
        return;
      }
      showToast(`กำหนด ${acc.bankName} (${acc.accountNumber}) เป็นบัญชีหลักเรียบร้อยแล้ว`, 'success');
      onAccountsUpdated();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    showToast('คัดลอก Webhook URL เรียบร้อยแล้ว', 'success');
  };

  const thaiBankOptions = [
    'ธนาคารอิสลามแห่งประเทศไทย',
    'ธนาคารกรุงไทย',
    'ธนาคารกสิกรไทย',
    'ธนาคารไทยพาณิชย์',
    'ธนาคารกรุงเทพ',
    'ธนาคารทหารไทยธนชาต (ttb)',
    'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)',
    'ธนาคารออมสิน',
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls & Header */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-800" />
            <h2 className="text-base font-bold text-slate-900">
              จัดการบัญชีธนาคารรับเงิน (Receiving Bank Accounts)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            บัญชีธนาคารทางการของมูลนิธิสำหรับรับเงินบริจาคและจ่ายซะกาต พร้อมตั้งค่า PromptPay และความสอดคล้องทางบัญชี
          </p>
        </div>

        {isSuperAdmin ? (
          <button
            onClick={handleOpenAddModal}
            className="zms-action px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
           aria-label="เพิ่มบัญชีรับเงินใหม่" title="เพิ่มบัญชีรับเงินใหม่">
            <Plus className="w-4 h-4" />
            <span>เพิ่มบัญชีรับเงินใหม่</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>โหมดดูข้อมูล (เฉพาะ Super Admin จึงแก้ไขได้)</span>
          </div>
        )}
      </div>

      {/* Gateway Integration Card */}
      {gatewayStatus && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950 text-white shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Payment Gateway Adapter & Webhook</h3>
                <p className="text-xs text-emerald-200/80">
                  ผู้ให้บริการ: {gatewayStatus.providerNameTh}
                </p>
              </div>
            </div>

            <div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  gatewayStatus.isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {gatewayStatus.isConnected ? '● เชื่อมต่อ API เรียบร้อย' : '○ ยังไม่ได้เชื่อมต่อ API (Disconnected)'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-slate-300 text-[11px]">Webhook Endpoint (สำหรับรับยืนยันยอดเงินอัตโนมัติ):</span>
              <div className="flex items-center gap-2">
                <code className="bg-black/40 px-2 py-1 rounded font-mono text-[11px] text-emerald-300 border border-white/10">
                  {gatewayStatus.webhookUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(gatewayStatus.webhookUrl)}
                  className="zms-action p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="คัดลอก URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {copiedWebhook && <p className="text-[10px] text-emerald-400 font-medium">✓ คัดลอกสำเร็จ</p>}
          </div>
        </div>
      )}

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {bankAccounts.map((acc) => {
          const isRevealed = Boolean(revealedMap[acc.id]);
          const isActive = acc.status === 'active';

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-2xl bg-white border transition-all relative flex flex-col justify-between shadow-2xs ${
                isActive ? 'border-slate-200/80' : 'border-slate-200 bg-slate-50/70 opacity-75'
              }`}
            >
              <div>
                {/* Header: Bank Name & Badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        acc.bankName.includes('อิสลาม')
                          ? 'bg-emerald-800 text-white'
                          : acc.bankName.includes('กรุงไทย')
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {acc.bankName.includes('อิสลาม')
                        ? 'IBANK'
                        : acc.bankName.includes('กรุงไทย')
                        ? 'KTB'
                        : 'BANK'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs leading-snug">{acc.bankName}</h4>
                      <p className="text-[10px] text-slate-400">ID: {acc.id}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {acc.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> บัญชีหลัก
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-2 text-xs py-2 border-y border-slate-100 my-2">
                  <div>
                    <span className="text-[11px] text-slate-500">ชื่อบัญชี:</span>
                    <p className="font-semibold text-slate-800 leading-snug">{acc.accountName}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500">เลขที่บัญชี:</span>
                      <p className="font-mono font-bold text-slate-900 text-sm">
                        {maskBankAccountNumber(acc.accountNumber, isRevealed)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMask(acc.id)}
                      className="zms-action p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      title={isRevealed ? 'ซ่อนเลขบัญชี' : 'แสดงเลขบัญชีเต็ม'}
                    >
                      {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400">ประเภท:</span>
                      <p className="font-medium text-slate-700">
                        {acc.accountType === 'current' ? 'กระแสรายวัน' : 'ออมทรัพย์'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">สาขา:</span>
                      <p className="font-medium text-slate-700 truncate">{acc.branchName || 'สำนักงานใหญ่'}</p>
                    </div>
                  </div>

                  {acc.promptpayId && (
                    <div className="text-[11px] pt-1">
                      <span className="text-slate-400">PromptPay ID:</span>
                      <p className="font-mono text-emerald-900 font-bold">
                        {maskPromptPayId(acc.promptpayId, isRevealed)}
                      </p>
                    </div>
                  )}

                  <div className="text-[11px] pt-1">
                    <span className="text-slate-400">ประเภทเงินที่รองรับ:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(acc.moneyTypes || ['zakat', 'sadaqah']).map((mt) => (
                        <span key={mt} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {mt === 'zakat' ? 'ซะกาต' : mt === 'sadaqah' ? 'ศอดะเกาะฮ์' : mt === 'operational' ? 'เงินบริหาร' : 'เฉพาะวัตถุประสงค์'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Financial Balance Overview */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400">ยอดคงเหลือในบัญชี:</span>
                      <p className="font-mono font-bold text-slate-900 text-xs">
                        ฿{Number(acc.currentBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">ยอดกระทบยอด (GL):</span>
                      <p className="font-mono font-bold text-emerald-800 text-xs">
                        ฿{Number(acc.reconciledBalance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isSuperAdmin && !acc.isDefault && (
                    <button
                      onClick={() => handleSetDefault(acc)}
                      className="px-2 py-1 rounded-lg text-slate-600 hover:text-amber-800 hover:bg-amber-50 text-[11px] font-bold transition-colors"
                    >
                      ตั้งเป็นบัญชีหลัก
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleToggleStatus(acc)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                        isActive
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  )}
                  <button
                    onClick={() => fetchLogsForAccount(acc)}
                    className="zms-action px-2 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    title="ดูประวัติการเปลี่ยนแปลงบัญชีนี้"
                   aria-label="ประวัติ">
                    <History className="w-3 h-3" />
                    <span>ประวัติ</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {isSuperAdmin ? (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(acc)}
                        className="zms-action p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                        title="แก้ไขข้อมูลบัญชี"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!acc.isDefault && (
                        <button
                          onClick={() => handleDeleteAccount(acc)}
                          className="zms-action p-1.5 text-rose-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                          title="ลบบัญชีธนาคาร (เฉพาะบัญชีที่ไม่มีประวัติธุรกรรม)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">ดูข้อมูล</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Bank Account Modal */}
      {(showAddModal || editingAccount) && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
              <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-200" />
                  <h3 className="font-bold text-sm">
                    {editingAccount ? 'แก้ไขบัญชีธนาคารรับเงิน' : 'เพิ่มบัญชีธนาคารรับเงินของมูลนิธิ'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAccount(null);
                  }}
                  className="zms-action p-1 text-emerald-200 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="p-6 space-y-4 text-xs">
                {/* Bank Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อธนาคาร <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                    required
                  >
                    {thaiBankOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Account Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อบัญชี <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formAccountName}
                    onChange={(e) => setFormAccountName(e.target.value)}
                    placeholder="เช่น มูลนิธิซะกาตและสาธารณกุศลแห่งประเทศไทย"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    required
                  />
                </div>

                {/* Account Number & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เลขที่บัญชี <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formAccountNumber}
                      onChange={(e) => setFormAccountNumber(e.target.value)}
                      placeholder="เช่น 095-1-23456-7"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ประเภทบัญชี
                    </label>
                    <select
                      value={formAccountType}
                      onChange={(e) => setFormAccountType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                    >
                      <option value="savings">บัญชีเงินฝากออมทรัพย์</option>
                      <option value="current">บัญชีเงินฝากกระแสรายวัน</option>
                    </select>
                  </div>
                </div>

                {/* Branch & PromptPay */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      สาขาธนาคาร
                    </label>
                    <input
                      type="text"
                      value={formBranchName}
                      onChange={(e) => setFormBranchName(e.target.value)}
                      placeholder="เช่น สำนักงานใหญ่ หรือ สาขายะลา"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">
                        PromptPay ID (10/13/15 หลัก)
                      </label>
                      {ppValidation && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ppValidation.valid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-700 border border-rose-300'
                          }`}
                        >
                          {ppValidation.valid
                            ? `✓ ${
                                ppValidation.type === 'phone'
                                  ? 'เบอร์มือถือ'
                                  : ppValidation.type === 'tax_id'
                                  ? 'เลขผู้เสียภาษี'
                                  : ppValidation.type === 'national_id'
                                  ? 'เลขบัตร ปชช.'
                                  : 'Biller ID'
                              } ถูกต้อง`
                            : '✕ รูปแบบไม่ถูกต้อง'}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formPromptpayId}
                      onChange={(e) => setFormPromptpayId(e.target.value)}
                      placeholder="เช่น 0-1255-69000-12-0 หรือ 081-234-5678"
                      className={`w-full px-3 py-2 rounded-xl border font-mono text-xs text-slate-800 focus:ring-2 focus:outline-hidden ${
                        ppValidation && !ppValidation.valid
                          ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                          : 'border-slate-300 focus:ring-emerald-700'
                      }`}
                    />
                    {ppValidation && !ppValidation.valid && (
                      <p className="text-[10px] text-rose-600 mt-1 font-medium">{ppValidation.error}</p>
                    )}
                    {ppValidation && ppValidation.valid && ppValidation.formatted && (
                      <p className="text-[10px] text-emerald-700 mt-1">
                        รูปแบบทางการ: <span className="font-mono font-bold">{ppValidation.formatted}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Supported Money Types (Payment Channel Mapping) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    ประเภทเงินที่บัญชีนี้ได้รับอนุญาตให้รับ (Payment Channel Mapping) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formMoneyTypes.includes('zakat')}
                        onChange={(e) => {
                          if (e.target.checked) setFormMoneyTypes((prev) => [...prev, 'zakat']);
                          else setFormMoneyTypes((prev) => prev.filter((t) => t !== 'zakat'));
                        }}
                        className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <span className="font-semibold text-slate-800">ซะกาตภาคบังคับ (Zakat)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formMoneyTypes.includes('sadaqah')}
                        onChange={(e) => {
                          if (e.target.checked) setFormMoneyTypes((prev) => [...prev, 'sadaqah']);
                          else setFormMoneyTypes((prev) => prev.filter((t) => t !== 'sadaqah'));
                        }}
                        className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <span className="font-semibold text-slate-800">ศอดะเกาะฮ์ทั่วไป (Sadaqah)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formMoneyTypes.includes('operational')}
                        onChange={(e) => {
                          if (e.target.checked) setFormMoneyTypes((prev) => [...prev, 'operational']);
                          else setFormMoneyTypes((prev) => prev.filter((t) => t !== 'operational'));
                        }}
                        className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <span className="font-semibold text-slate-800">เงินบริหารมูลนิธิ (Operational)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formMoneyTypes.includes('specific_purpose')}
                        onChange={(e) => {
                          if (e.target.checked) setFormMoneyTypes((prev) => [...prev, 'specific_purpose']);
                          else setFormMoneyTypes((prev) => prev.filter((t) => t !== 'specific_purpose'));
                        }}
                        className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                      />
                      <span className="font-semibold text-slate-800">เฉพาะวัตถุประสงค์ (Specific)</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ระบบจะอนุญาตให้รับเงินบริจาคเข้าบัญชีนี้เฉพาะประเภทที่เลือกไว้เท่านั้น เพื่อแยกกองทุนตามหลักชะรีอะฮ์
                  </p>
                </div>

                {/* Effective Date & Audit Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      วันที่มีผลบังคับใช้ (Effective Date)
                    </label>
                    <input
                      type="date"
                      value={formEffectiveDate}
                      onChange={(e) => setFormEffectiveDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    />
                  </div>

                  {editingAccount && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        เหตุผลในการแก้ไขข้อมูล (Audit Reason) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formReason}
                        onChange={(e) => setFormReason(e.target.value)}
                        placeholder="เช่น เปลี่ยนเลขบัญชีตามมติคณะกรรมการ"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Opening Balance (Only for new accounts) */}
                {!editingAccount && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ยอดยกมาเริ่มต้น (Opening Balance บาท)
                    </label>
                    <input
                      type="number"
                      value={formOpeningBalance}
                      onChange={(e) => setFormOpeningBalance(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    />
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingAccount(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{editingAccount ? 'บันทึกการแก้ไข' : 'บันทึกบัญชีใหม่'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Bank Account Change Logs Modal */}
      {showLogsModal && selectedAccountForLogs && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm">ประวัติการแก้ไขข้อมูลบัญชีธนาคาร (Field-Level Audit Trail)</h3>
                    <p className="text-[11px] text-slate-300">
                      {selectedAccountForLogs.bankName} - {selectedAccountForLogs.accountNumber} ({selectedAccountForLogs.accountName})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowLogsModal(false);
                    setSelectedAccountForLogs(null);
                  }}
                  className="zms-action p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {isLoadingLogs ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-800" />
                    <span className="text-xs">กำลังโหลดประวัติการแก้ไข...</span>
                  </div>
                ) : accountLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-1">
                    <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">ยังไม่มีประวัติการแก้ไขข้อมูล</p>
                    <p className="text-[11px]">ข้อมูลบัญชีนี้ยังคงเป็นข้อมูลเริ่มต้นนับตั้งแต่วันเปิดบัญชี</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2.5">วันเวลาที่แก้ไข</th>
                          <th className="p-2.5">ผู้ดำเนินการ</th>
                          <th className="p-2.5">ฟิลด์ที่เปลี่ยน</th>
                          <th className="p-2.5">ค่าเดิม</th>
                          <th className="p-2.5">ค่าใหม่</th>
                          <th className="p-2.5">เหตุผล</th>
                          <th className="p-2.5">วันที่มีผล</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {accountLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50/60">
                            <td className="p-2.5 font-sans text-slate-600">
                              {new Date(log.created_at).toLocaleString('th-TH')}
                            </td>
                            <td className="p-2.5 font-sans text-slate-800">
                              <span className="font-bold">{log.changed_by_name}</span>
                              <span className="text-[10px] text-slate-400 block">{log.changed_by_role}</span>
                            </td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                                {log.field_name}
                              </span>
                            </td>
                            <td className="p-2.5 text-rose-600 truncate max-w-[120px]">{log.old_value || '-'}</td>
                            <td className="p-2.5 text-emerald-700 font-bold truncate max-w-[120px]">{log.new_value || '-'}</td>
                            <td className="p-2.5 font-sans text-slate-700 max-w-[150px]">{log.reason || '-'}</td>
                            <td className="p-2.5 text-slate-600">{log.effective_date || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <p className="text-[11px]">
                    * บันทึกตามข้อกำหนดความโปร่งใสทางการเงินและประวัติบัญชีธนาคาร (Immutable Bank History)
                  </p>
                  <button
                    onClick={() => {
                      setShowLogsModal(false);
                      setSelectedAccountForLogs(null);
                    }}
                    className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

