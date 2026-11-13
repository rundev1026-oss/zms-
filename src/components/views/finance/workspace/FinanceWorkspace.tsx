'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Search,
  RefreshCw,
  Building2,
  FileSpreadsheet,
  ShieldCheck,
  ArrowLeftRight,
  PieChart,
  Scale,
  Plus,
  Download,
  Printer,
  Pencil,
  Eye,
  Check,
  X,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import type { AssistanceApplication, BankAccount, FinancialTransaction, FundAccount } from '@/types';
import { AllocationScreen, AuditScreen, ExpenseScreen, MovementScreen, ReconcileScreen, ReportScreen } from './FinanceScreens';
import { TreasurerWorkbenchPage } from './TreasurerWorkbenchPage';
import { CashPositionCards, StaffCasePaymentPanel } from './StaffCashPanel';
import { financePageFromSlug, financeSlugFromPage, type FinancePageKey } from '@/lib/financeMenu';

type PageKey = FinancePageKey;

const PAGES: { id: PageKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'ภาพรวมการเงิน', icon: Wallet },
  { id: 'income', label: 'จัดการรายรับ', icon: ArrowDownLeft },
  { id: 'banks', label: 'บัญชีธนาคาร', icon: Building2 },
  { id: 'allocation', label: 'จัดสรรงบตามอัสนัฟ', icon: PieChart },
  { id: 'movements', label: 'ฝาก ถอน โอน', icon: ArrowLeftRight },
  { id: 'approval', label: 'อนุมัติรอบเบิก', icon: ShieldCheck },
  { id: 'expenses', label: 'รายจ่ายและการช่วยเหลือ', icon: ArrowUpRight },
  { id: 'reconcile', label: 'กระทบยอดธนาคาร', icon: Scale },
  { id: 'reports', label: 'รายงานการเงินและประวัติธุรกรรม', icon: FileSpreadsheet },
  { id: 'audit', label: 'รายงานการเงินและประวัติธุรกรรม', icon: Landmark },
];

const ASNAF = [
  { id: 'faqir_miskin', label: 'ฟากีร–มิสกีน', keys: ['faqir', 'miskin', 'faqir_miskin', 'ฟากีร', 'มิสกีน'] },
  { id: 'amileen', label: 'อามิลีน', keys: ['amileen', 'amil', 'อามิล'] },
  { id: 'muallaf', label: 'มุอัลลัฟ', keys: ['muallaf', 'มุอัลลัฟ'] },
  { id: 'gharimin', label: 'อัลอะริมีน', keys: ['gharimin', 'gharim', 'อัลอะริมีน'] },
  { id: 'fisabilillah', label: 'ฟีสะบีลิลลาฮ์', keys: ['fisabilillah', 'fi_sabilillah', 'ฟีสะบีล'] },
  { id: 'ibnusabil', label: 'อิบนุสะบิล', keys: ['ibnusabil', 'ibn_sabil', 'อิบนุสะบิล'] },
  { id: 'other', label: 'มนุษยธรรม / อื่น ๆ', keys: ['other', 'humanity', 'มนุษยธรรม'] },
];

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function baht(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function financeInstant(value: string) {
  const match = String(value || '').match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (match) {
    let gregorian = Number(match[3]);
    if (gregorian > 2400) gregorian -= 543;
    const date = new Date(gregorian, Number(match[2]) - 1, Number(match[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return parseDate(value);
}

function withinIsoRange(value: string, from: string, to: string) {
  if (!from && !to) return true;
  const date = financeInstant(value);
  if (!date) return false;
  if (from && date < new Date(`${from}T00:00:00`)) return false;
  if (to && date > new Date(`${to}T23:59:59`)) return false;
  return true;
}

function isoDate(value: string) {
  const date = financeInstant(value);
  if (!date) return new Date().toISOString().slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function buddhistYear(date: Date) {
  return date.getFullYear() + 543;
}

function txYear(tx: FinancialTransaction) {
  if (tx.zakatYear) return String(tx.zakatYear);
  const date = parseDate(tx.date);
  return date ? String(buddhistYear(date)) : '';
}

function storedMonthIndex(value: string) {
  const match = String(value).match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (match) return Number(match[2]) - 1;
  const date = parseDate(value);
  return date ? date.getMonth() : null;
}

type DashboardSnapshot = {
  kpi: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    totalBankBalance: number;
    totalCashOnHand: number;
    totalAllocatedBudget: number;
    totalDisbursedAid: number;
    totalAvailableFunds: number;
    pendingApprovalsCount: number;
  };
  charts: {
    incomeVsExpense: { month: string; income: number; expense: number }[];
  };
};

function thaiDate(value: string) {
  const date = financeInstant(value);
  if (!date) return value || '—';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

function maskAccount(value: string) {
  const raw = value.replace(/\s/g, '');
  if (raw.length <= 4) return raw;
  return `${raw.slice(0, 3)}••••${raw.slice(-4)}`;
}

function cardAccountNo(value: string) {
  const digits = value.replace(/\D/g, '');
  const tail = (digits || value.replace(/\s/g, '')).slice(-4);
  return `••••-${tail}`;
}

function accountTypeLabel(value?: string) {
  if (value === 'current') return 'กระแสรายวัน';
  if (value === 'savings') return 'ออมทรัพย์';
  return 'รับ-จ่าย';
}

const MONEY_TYPE_OPTIONS = [
  { id: 'zakat', label: 'ซะกาต' },
  { id: 'sadaqah', label: 'ศอดะเกาะห์' },
  { id: 'operational', label: 'เงินบริหาร' },
];

const INCOME_MONEY_OPTIONS = [
  { id: 'zakat', label: 'ซะกาต' },
  { id: 'sadaqah', label: 'ศอดะเกาะห์ทั่วไป' },
  { id: 'operational_admin', label: 'เงินบริจาคเพื่อการบริหาร' },
] as const;

const PURPOSE_OPTIONS = [
  'ช่วยเหลือผู้ยากไร้ (ฟากีร)',
  'ช่วยเหลือผู้ขัดสน (มิสกีน)',
  'ค่าตอบแทนผู้จัดเก็บ (อามิล)',
  'ผู้เพิ่งเข้ารับอิสลาม (มุอัลลัฟ)',
  'ปลดเปลื้องหนี้สิน (ฆอริมีน)',
  'ในทางของอัลลอฮ์ (ฟีสะบีลิลลาฮ์)',
  'ผู้เดินทาง (อิบนุสะบิล)',
  'ศอดะเกาะห์ทั่วไป',
  'ค่าใช้จ่ายดำเนินงาน',
];

const PAYMENT_OPTIONS = [
  { id: 'bank_transfer', label: 'โอนผ่านธนาคาร' },
  { id: 'promptpay_qr', label: 'พร้อมเพย์' },
  { id: 'cash', label: 'เงินสด' },
] as const;

function moneyTypeLabel(value: string) {
  if (value === 'operational_admin' || value === 'operational') return 'เงินบริจาคเพื่อการบริหาร';
  return INCOME_MONEY_OPTIONS.find((item) => item.id === value)?.label || MONEY_TYPE_OPTIONS.find((item) => item.id === value)?.label || value;
}

function bankStatusLabel(status: string) {
  if (status === 'active') return 'ใช้งานอยู่';
  if (status === 'inactive') return 'ระงับชั่วคราว';
  return 'ปิดใช้งาน';
}

type BankActor = { id: string; name: string; role: string };
type BankLog = { id: string; action: string; fieldName: string; oldValue?: string | null; newValue?: string | null; changedByName: string; createdAt: string; reason?: string | null };
type BankForm = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  branchName: string;
  openingBalance: string;
  accountType: 'savings' | 'current';
  moneyTypes: string[];
};

function isIncome(tx: FinancialTransaction) {
  return tx.type === 'income' && tx.status !== 'cancelled' && tx.status !== 'reversed';
}

function isOutflow(tx: FinancialTransaction) {
  return (tx.type === 'expense' || tx.type === 'disbursement') && tx.status !== 'cancelled' && tx.status !== 'reversed';
}

function buildAsnaf(rows: FinancialTransaction[]) {
  return ASNAF.map((item) => {
    const matched = rows.filter((tx) => {
      const value = `${tx.asnafCategory || ''} ${tx.fundName || ''} ${tx.category || ''}`.toLowerCase();
      return item.keys.some((key) => value.includes(key.toLowerCase()));
    });
    const spent = matched.filter(isOutflow).reduce((sum, tx) => sum + tx.amount, 0);
    const received = matched.filter(isIncome).reduce((sum, tx) => sum + tx.amount, 0);
    return { ...item, received, spent };
  });
}

function statusLabel(tx: FinancialTransaction) {
  if (tx.status === 'pending') return 'รอนุมัติ';
  if (tx.status === 'cancelled') return 'ยกเลิก';
  if (tx.status === 'reversed') return 'กลับรายการ';
  if (tx.type === 'income') return 'รับเงินแล้ว';
  if (tx.type === 'disbursement') return 'จ่ายแล้ว';
  return 'ลงบัญชีแล้ว';
}

function incomeStatusText(tx: FinancialTransaction) {
  if (tx.status === 'pending') return 'รอยืนยัน';
  if (tx.status === 'cancelled') return 'ยกเลิก';
  if (tx.status === 'reversed') return 'กลับรายการ';
  return 'รับเงินแล้ว';
}

function incomeStatusClass(tx: FinancialTransaction) {
  if (tx.status === 'pending') return 'bg-amber-50 text-amber-700';
  if (tx.status === 'cancelled' || tx.status === 'reversed') return 'bg-slate-100 text-slate-500';
  return 'bg-emerald-50 text-emerald-700';
}

function statusClass(tx: FinancialTransaction) {
  if (tx.status === 'pending') return 'bg-amber-50 text-amber-700';
  if (tx.status === 'cancelled' || tx.status === 'reversed') return 'bg-slate-100 text-slate-500';
  if (tx.type === 'income') return 'bg-emerald-50 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-xs ${className}`}>{children}</section>;
}

function Metric({
  label,
  value,
  hint,
  tone = 'light',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'light' | 'navy';
}) {
  const navy = tone === 'navy';
  return (
    <Card className={`p-4 ${navy ? '!border-transparent !bg-[#0e2744] !text-white' : ''}`}>
      <div className={`text-xs ${navy ? 'text-slate-300' : 'text-slate-500'}`}>{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {hint ? <div className={`mt-1 text-[11px] ${navy ? 'text-slate-400' : 'text-slate-400'}`}>{hint}</div> : null}
    </Card>
  );
}

function BankMetric({
  label,
  value,
  icon: Icon,
  tone = 'light',
  valueClass = '',
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'light' | 'navy';
  valueClass?: string;
}) {
  const navy = tone === 'navy';
  return (
    <Card className={`relative p-4 ${navy ? '!border-transparent !bg-[#0B2545] !text-white' : ''}`}>
      <Icon className={`absolute right-4 top-4 h-4 w-4 ${navy ? 'text-slate-400' : 'text-[#0D9488]'}`} />
      <div className={`pr-6 text-xs ${navy ? 'text-slate-300' : 'text-slate-500'}`}>{label}</div>
      <div className={`mt-3 text-xl font-bold tracking-tight ${navy ? '' : valueClass}`}>{value}</div>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-slate-400">{text}</div>;
}

export function FinanceWorkspace({
  userName,
  roleLabel,
  funds,
  transactions,
  applications,
  bankAccounts,
  actor,
  onBanksChanged,
  onRefresh,
  onOpenApprovals,
  onRecordIncome,
  section,
  reportTab,
  bankReconcile,
  onSectionChange,
}: {
  userName: string;
  roleLabel: string;
  funds: FundAccount[];
  transactions: FinancialTransaction[];
  applications: AssistanceApplication[];
  bankAccounts: BankAccount[];
  actor: BankActor;
  onBanksChanged: () => void;
  onRefresh: () => void;
  onOpenApprovals?: () => void;
  onRecordIncome: (
    fundId: string,
    category: string,
    amount: number,
    payer: string,
    method: 'promptpay_qr' | 'bank_transfer' | 'cash',
    refNo: string,
    notes?: string,
    extra?: { bankAccountId?: string; moneyType?: 'zakat' | 'sadaqah' | 'operational_admin'; donorName?: string; usageRestriction?: string; receivedDate?: string },
  ) => Promise<boolean>;
  section?: string | null;
  reportTab?: 'reports' | 'transactions';
  bankReconcile?: boolean;
  onSectionChange?: (target: string) => void;
}) {
  const routedPage = section ? financePageFromSlug(section) : null;
  const [page, setPage] = useState<PageKey>(routedPage || 'overview');
  const [ledgerTab, setLedgerTab] = useState<'reports' | 'transactions'>(reportTab === 'transactions' ? 'transactions' : 'reports');
  const [showReconcile, setShowReconcile] = useState(Boolean(bankReconcile));
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportMoney, setReportMoney] = useState('all');
  const [reportBank, setReportBank] = useState('all');
  const [reportStatus, setReportStatus] = useState('all');
  const openPage = (next: PageKey) => {
    if (next === 'audit') {
      setPage('reports');
      setLedgerTab('transactions');
      onSectionChange?.('/finance/reports?tab=transactions');
      return;
    }
    if (next === 'reconcile') {
      const nextOpen = !showReconcile;
      setPage('banks');
      setShowReconcile(nextOpen);
      onSectionChange?.(nextOpen ? '/finance/bank-accounts?view=reconcile' : '/finance/bank-accounts');
      return;
    }
    setPage(next);
    onSectionChange?.(`/finance/${financeSlugFromPage(next)}`);
  };
  useEffect(() => {
    if (routedPage) setPage(routedPage);
  }, [routedPage]);
  useEffect(() => {
    setLedgerTab(reportTab === 'transactions' ? 'transactions' : 'reports');
  }, [reportTab]);
  useEffect(() => {
    setShowReconcile(Boolean(bankReconcile));
  }, [bankReconcile]);
  useEffect(() => {
    if (page === 'banks' && showReconcile) {
      document.getElementById('bank-reconcile-panel')?.scrollIntoView({ block: 'nearest' });
    }
  }, [page, showReconcile]);
  const [year, setYear] = useState('2569');
  useEffect(() => {
    const today = new Date();
    setYear(String(today.getFullYear() + 543));
    const iso = today.toISOString().slice(0, 10);
    setIncomeForm((form) => (form.receivedDate ? form : { ...form, receivedDate: iso }));
  }, []);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [dashboardState, setDashboardState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [bankMode, setBankMode] = useState<'create' | 'edit' | 'detail' | 'history' | 'reconcile' | null>(null);
  const [bankTarget, setBankTarget] = useState<BankAccount | null>(null);
  const [bankBusy, setBankBusy] = useState(false);
  const [bankError, setBankError] = useState('');
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [bankLogs, setBankLogs] = useState<BankLog[]>([]);
  const [bankForm, setBankForm] = useState<BankForm>({
    accountName: '',
    bankName: 'ธนาคารอิสลามแห่งประเทศไทย',
    accountNumber: '',
    branchName: '',
    openingBalance: '0',
    accountType: 'savings',
    moneyTypes: ['zakat', 'sadaqah'],
  });
  const [statementBalance, setStatementBalance] = useState('');
  const [statementNote, setStatementNote] = useState('');
  const [bankQuery, setBankQuery] = useState('');
  const [bankMoney, setBankMoney] = useState('all');
  const [bankBranch, setBankBranch] = useState('all');
  const [bankStatus, setBankStatus] = useState('active');
  const [bankFrom, setBankFrom] = useState('');
  const [bankTo, setBankTo] = useState('');
  const canManageBanks = actor.role === 'super_admin';
  const canReconcile = ['super_admin', 'finance', 'executive'].includes(actor.role);
  const canRecordIncome = ['finance', 'super_admin'].includes(actor.role);
  const canCancelIncome = ['finance', 'super_admin', 'executive'].includes(actor.role);
  const [incomeEditingId, setIncomeEditingId] = useState<string | null>(null);
  const [incomeSelectedId, setIncomeSelectedId] = useState<string | null>(null);
  const [incomeDetailOpen, setIncomeDetailOpen] = useState(false);
  const [incomeError, setIncomeError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [incomeQuery, setIncomeQuery] = useState('');
  const [incomeMoney, setIncomeMoney] = useState('all');
  const [incomeStatus, setIncomeStatus] = useState('all');
  const [incomeFrom, setIncomeFrom] = useState('');
  const [incomeTo, setIncomeTo] = useState('');
  const [incomePage, setIncomePage] = useState(1);
  const [incomeFormOpen, setIncomeFormOpen] = useState(true);
  const incomeFormRef = useRef<HTMLDivElement>(null);
  const [incomeForm, setIncomeForm] = useState({
    donor: '',
    amount: '',
    fundId: funds.find((fund) => fund.category === 'zakat')?.id || funds[0]?.id || '',
    bankAccountId: '',
    moneyType: 'zakat' as 'zakat' | 'sadaqah' | 'operational_admin',
    paymentMethod: 'bank_transfer' as 'promptpay_qr' | 'bank_transfer' | 'cash',
    notes: '',
    referenceNo: '',
    purpose: '',
    receivedDate: '',
  });

  useEffect(() => {
    let cancelled = false;
    setDashboardState('loading');
    fetch(`/api/finance/dashboard?zakatYear=${encodeURIComponent(year)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success || !json.data?.kpi) {
          setDashboard(null);
          setDashboardState('error');
          return;
        }
        setDashboard(json.data);
        setDashboardState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setDashboard(null);
          setDashboardState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [year, reloadKey]);

  const years = useMemo(() => {
    const set = new Set<string>([year]);
    transactions.forEach((tx) => {
      const value = txYear(tx);
      if (value) set.add(value);
    });
    return Array.from(set).sort();
  }, [transactions, year]);

  const inYear = useMemo(
    () => transactions.filter((tx) => txYear(tx) === year),
    [transactions, year],
  );

  const incomeTotal = inYear.filter(isIncome).reduce((sum, tx) => sum + tx.amount, 0);
  const expenseTotal = inYear.filter(isOutflow).reduce((sum, tx) => sum + tx.amount, 0);
  const bankTotal = bankAccounts.filter((account) => account.status === 'active').reduce((sum, account) => sum + Number(account.currentBalance || 0), 0);
  const net = incomeTotal - expenseTotal;
  const budget = funds.reduce((sum, fund) => sum + Number(fund.totalReceived || 0), 0);
  const disbursed = funds.reduce((sum, fund) => sum + Number(fund.disbursedAmount || 0), 0);
  const available = funds.reduce((sum, fund) => sum + Number(fund.availableAmount || 0), 0);
  const activeBanks = bankAccounts.filter((account) => account.status === 'active');
  useEffect(() => {
    if (incomeEditingId || incomeForm.paymentMethod === 'cash' || incomeForm.bankAccountId || activeBanks.length === 0) return;
    setIncomeForm((form) => (form.bankAccountId ? form : { ...form, bankAccountId: activeBanks[0].id }));
  }, [activeBanks, incomeEditingId, incomeForm.bankAccountId, incomeForm.paymentMethod]);

  const monthly = dashboard?.charts.incomeVsExpense?.length
    ? dashboard.charts.incomeVsExpense.map((row) => ({ label: row.month, income: row.income, expense: row.expense }))
    : MONTHS.map((label, index) => {
        const rows = inYear.filter((tx) => storedMonthIndex(tx.date) === index);
        return {
          label,
          income: rows.filter(isIncome).reduce((sum, tx) => sum + tx.amount, 0),
          expense: rows.filter(isOutflow).reduce((sum, tx) => sum + tx.amount, 0),
        };
      });
  const maxMonth = Math.max(1, ...monthly.map((row) => Math.max(row.income, row.expense)));

  const pendingApps = applications.filter((app) => ['pending_approval', 'approved', 'wait_disbursement'].includes(app.status));
  const recent = [...inYear].sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
  const searched = recent.filter((tx) => {
    const haystack = `${tx.transactionNo} ${tx.payerOrPayee} ${tx.category} ${tx.notes || ''} ${tx.fundName}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const selected = transactions.find((tx) => tx.id === selectedId) || searched[0] || null;
  const incomeAll = useMemo(() => inYear.filter((tx) => tx.type === 'income'), [inYear]);
  const confirmedIncome = incomeAll.filter((tx) => tx.status === 'completed');
  const pendingIncome = incomeAll.filter((tx) => tx.status === 'pending');
  const incomeListed = useMemo(() => {
    const keyword = incomeQuery.trim().toLowerCase();
    return incomeAll
      .filter((tx) => {
        if (incomeMoney !== 'all' && (tx.moneyType || 'zakat') !== incomeMoney) return false;
        if (incomeStatus !== 'all' && tx.status !== incomeStatus) return false;
        const instant = financeInstant(tx.date);
        if (incomeFrom && instant && instant < new Date(`${incomeFrom}T00:00:00`)) return false;
        if (incomeTo && instant && instant > new Date(`${incomeTo}T23:59:59`)) return false;
        if (!keyword) return true;
        const haystack = `${tx.transactionNo} ${tx.payerOrPayee} ${tx.donorName || ''} ${tx.referenceNo || ''} ${tx.category} ${tx.fundName}`.toLowerCase();
        return haystack.includes(keyword);
      })
      .sort((a, b) => (financeInstant(b.date)?.getTime() || 0) - (financeInstant(a.date)?.getTime() || 0));
  }, [incomeAll, incomeQuery, incomeMoney, incomeStatus, incomeFrom, incomeTo]);
  const incomePageCount = Math.max(1, Math.ceil(incomeListed.length / 6));
  const incomePageSafe = Math.min(incomePage, incomePageCount);
  const incomeSlice = incomeListed.slice((incomePageSafe - 1) * 6, incomePageSafe * 6);
  const incomeSelected = incomeListed.find((tx) => tx.id === incomeSelectedId) || null;
  const editingIncome = incomeEditingId ? transactions.find((tx) => tx.id === incomeEditingId) || null : null;

  const asnafRows = buildAsnaf(inYear);
  const reportRows = useMemo(() => inYear.filter((tx) => {
    const instant = financeInstant(tx.date);
    if ((reportFrom || reportTo) && !instant) return false;
    if (reportFrom && instant && instant < new Date(`${reportFrom}T00:00:00`)) return false;
    if (reportTo && instant && instant > new Date(`${reportTo}T23:59:59`)) return false;
    if (reportMoney !== 'all' && (tx.moneyType || 'zakat') !== reportMoney) return false;
    if (reportBank !== 'all' && tx.bankAccountId !== reportBank) return false;
    if (reportStatus !== 'all' && tx.status !== reportStatus) return false;
    return true;
  }), [inYear, reportFrom, reportTo, reportMoney, reportBank, reportStatus]);
  const reportIncome = reportRows.filter(isIncome).reduce((sum, tx) => sum + tx.amount, 0);
  const reportExpense = reportRows.filter(isOutflow).reduce((sum, tx) => sum + tx.amount, 0);
  const reportAsnaf = useMemo(() => buildAsnaf(reportRows), [reportRows]);
  const reportAccounts = reportBank === 'all' ? bankAccounts : bankAccounts.filter((account) => account.id === reportBank);
  const reportBankTotal = reportAccounts.filter((account) => account.status === 'active').reduce((sum, account) => sum + Number(account.currentBalance || 0), 0);
  function fundsForMoney(type: 'zakat' | 'sadaqah' | 'operational_admin') {
    const category = type === 'operational_admin' ? 'operational' : type;
    const matched = funds.filter((fund) => fund.category === category);
    return matched.length > 0 ? matched : funds;
  }

  function blankIncomeForm() {
    const moneyType = 'zakat' as const;
    return {
      donor: '',
      amount: '',
      fundId: fundsForMoney(moneyType)[0]?.id || '',
      bankAccountId: activeBanks[0]?.id || '',
      moneyType,
      paymentMethod: 'bank_transfer' as const,
      notes: '',
      referenceNo: '',
      purpose: '',
      receivedDate: new Date().toISOString().slice(0, 10),
    };
  }

  function resetIncomeForm() {
    setIncomeEditingId(null);
    setIncomeError('');
    setIncomeForm(blankIncomeForm());
  }

  function focusIncomeForm() {
    setIncomeFormOpen(true);
    resetIncomeForm();
    window.setTimeout(() => incomeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  }

  function openIncomeEdit(tx: FinancialTransaction) {
    setIncomeFormOpen(true);
    setIncomeError('');
    setIncomeSelectedId(tx.id);
    setIncomeEditingId(tx.id);
    const moneyType = (tx.moneyType as 'zakat' | 'sadaqah' | 'operational_admin') || 'zakat';
    setIncomeForm({
      donor: tx.donorName || tx.payerOrPayee || '',
      amount: String(tx.amount),
      fundId: tx.fundId,
      bankAccountId: tx.bankAccountId || '',
      moneyType,
      paymentMethod: tx.paymentMethod || (tx.bankAccountId ? 'bank_transfer' : 'cash'),
      notes: tx.notes || '',
      referenceNo: tx.referenceNo || '',
      purpose: tx.usageRestriction || tx.category || '',
      receivedDate: isoDate(tx.date),
    });
    incomeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function printIncomeReceipt(tx: FinancialTransaction) {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
    if (!popup) {
      setIncomeError('เบราว์เซอร์ปิดหน้าต่างใบรับเงิน กรุณาอนุญาตหน้าต่างป๊อปอัปแล้วลองอีกครั้ง');
      return;
    }
    const bank = bankAccounts.find((account) => account.id === tx.bankAccountId);
    const money = tx.moneyType === 'sadaqah' ? 'ศอดะเกาะห์ทั่วไป' : tx.moneyType === 'operational_admin' ? 'เงินบริจาคเพื่อการบริหาร' : 'ซะกาต';
    popup.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ใบรับเงิน ${tx.transactionNo}</title>
      <style>body{font-family:Sarabun,Tahoma,sans-serif;margin:32px;color:#0e2744}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 0;border-bottom:1px solid #e2e8f0}.right{text-align:right;font-size:22px;font-weight:700}</style></head>
      <body><div>มูลนิธิซะกาตและสาธารณกุศล</div><h1>ใบรับเงิน</h1><p>เลขที่ ${tx.transactionNo}</p>
      <table>
        <tr><td>วันที่รับเงิน</td><td>${tx.date}</td></tr>
        <tr><td>ผู้บริจาค</td><td>${tx.donorName || tx.payerOrPayee}</td></tr>
        <tr><td>ประเภทเงิน</td><td>${money}</td></tr>
        <tr><td>กองทุน</td><td>${tx.fundName}</td></tr>
        <tr><td>ช่องทาง</td><td>${bank ? bank.bankName : 'เงินสด'}</td></tr>
        <tr><td>เลขอ้างอิง</td><td>${tx.referenceNo}</td></tr>
        <tr><td>วัตถุประสงค์</td><td>${tx.usageRestriction || tx.category || ''}</td></tr>
        <tr><td>จำนวนเงิน</td><td class="right">${baht(tx.amount)}</td></tr>
      </table>
      <p>ผู้บันทึก ${tx.recordedBy || ''}</p>
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`);
    popup.document.close();
  }

  async function saveIncome(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(incomeForm.amount);
    if (!incomeForm.fundId || !incomeForm.donor.trim() || !incomeForm.referenceNo.trim() || !Number.isFinite(amount) || amount <= 0) {
      setIncomeError('กรุณาระบุผู้บริจาค เลขอ้างอิง และจำนวนเงินที่มากกว่า 0');
      return;
    }
    if (!incomeEditingId && incomeForm.paymentMethod !== 'cash' && !incomeForm.bankAccountId) {
      setIncomeError('กรุณาเลือกบัญชีธนาคารสำหรับช่องทางนี้');
      return;
    }
    setSaving(true);
    setIncomeError('');
    const category = incomeForm.purpose.trim() || moneyTypeLabel(incomeForm.moneyType);
    const payload = {
      fundId: incomeForm.fundId,
      category,
      amount,
      payer: incomeForm.donor.trim(),
      donorName: incomeForm.donor.trim(),
      paymentMethod: incomeForm.paymentMethod,
      referenceNo: incomeForm.referenceNo.trim(),
      notes: incomeForm.notes,
      bankAccountId: incomeForm.paymentMethod === 'cash' ? undefined : incomeForm.bankAccountId,
      moneyType: incomeForm.moneyType,
      usageRestriction: incomeForm.purpose.trim() || undefined,
      receivedDate: incomeForm.receivedDate,
    };
    try {
      if (incomeEditingId) {
        const res = await fetch('/api/finance/incomes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: incomeEditingId, input: payload, actor }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'แก้ไขรายรับไม่สำเร็จ');
        resetIncomeForm();
        onRefresh();
        setReloadKey((key) => key + 1);
      } else {
        const ok = await onRecordIncome(payload.fundId, payload.category, amount, payload.payer, payload.paymentMethod, payload.referenceNo, payload.notes, payload);
        if (ok) {
          resetIncomeForm();
          setReloadKey((key) => key + 1);
        }
      }
    } catch (error: any) {
      setIncomeError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function exportIncomeCsv() {
    const header = ['วันที่', 'เลขที่', 'ผู้บริจาค', 'ประเภทเงิน', 'กองทุน', 'จำนวนเงิน', 'สถานะ', 'เลขอ้างอิง'];
    const lines = incomeListed.map((tx) => [
      tx.date,
      tx.transactionNo,
      tx.donorName || tx.payerOrPayee,
      moneyTypeLabel(tx.moneyType || ''),
      tx.fundName,
      String(tx.amount),
      incomeStatusText(tx),
      tx.referenceNo || '',
    ]);
    const csv = [header, ...lines].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `income-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function confirmIncome() {
    if (!incomeSelected || incomeSelected.status !== 'pending') return;
    setSaving(true);
    setIncomeError('');
    try {
      const res = await fetch(`/api/donations/${incomeSelected.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', actor }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ยืนยันรับเงินไม่สำเร็จ');
      onRefresh();
      setReloadKey((key) => key + 1);
    } catch (error: any) {
      setIncomeError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function cancelIncome() {
    const target = transactions.find((tx) => tx.id === incomeSelectedId && tx.type === 'income');
    if (!target) return;
    if (cancelReason.trim().length < 5) {
      setIncomeError('กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร');
      return;
    }
    setSaving(true);
    setIncomeError('');
    try {
      const res = await fetch(`/api/finance/transactions/${target.id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim(), actor }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ยกเลิกรายรับไม่สำเร็จ');
      setCancelReason('');
      setIncomeSelectedId(null);
      setIncomeDetailOpen(false);
      onRefresh();
      setReloadKey((key) => key + 1);
    } catch (error: any) {
      setIncomeError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function openBankCreate() {
    setBankError('');
    setBankTarget(null);
    setBankForm({
      accountName: '',
      bankName: 'ธนาคารอิสลามแห่งประเทศไทย',
      accountNumber: '',
      branchName: '',
      openingBalance: '0',
      accountType: 'savings',
      moneyTypes: ['zakat', 'sadaqah'],
    });
    setBankMode('create');
  }

  function openBankEdit(account: BankAccount) {
    setBankError('');
    setBankTarget(account);
    setBankForm({
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      branchName: account.branchName || '',
      openingBalance: String(account.openingBalance || 0),
      accountType: account.accountType || 'savings',
      moneyTypes: account.moneyTypes?.length ? account.moneyTypes : ['zakat'],
    });
    setBankMode('edit');
  }

  async function saveBank(event: React.FormEvent) {
    event.preventDefault();
    const opening = Number(bankForm.openingBalance);
    if (!bankForm.accountName.trim() || !bankForm.bankName.trim() || !bankForm.accountNumber.trim()) {
      setBankError('กรุณาระบุธนาคาร ชื่อบัญชี และเลขบัญชี');
      return;
    }
    if (bankMode === 'create' && (!Number.isFinite(opening) || opening < 0)) {
      setBankError('ยอดยกมาต้องไม่ติดลบ');
      return;
    }
    setBankBusy(true);
    setBankError('');
    try {
      const input = {
        accountName: bankForm.accountName.trim(),
        bankName: bankForm.bankName.trim(),
        accountNumber: bankForm.accountNumber.trim(),
        branchName: bankForm.branchName.trim(),
        accountType: bankForm.accountType,
        moneyTypes: bankForm.moneyTypes,
        ...(bankMode === 'create' ? { openingBalance: opening } : {}),
      };
      const res = await fetch('/api/finance/bank-accounts', {
        method: bankMode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankMode === 'create' ? { input, actor } : { id: bankTarget?.id, input, actor }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'บันทึกบัญชีไม่สำเร็จ');
      setBankMode(null);
      onBanksChanged();
    } catch (error: any) {
      setBankError(error.message);
    } finally {
      setBankBusy(false);
    }
  }

  async function changeBankStatus(account: BankAccount, status: 'active' | 'closed') {
    setBankBusy(true);
    setBankError('');
    try {
      const res = await fetch('/api/finance/bank-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, status, actor }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'เปลี่ยนสถานะไม่สำเร็จ');
      setBankMode(null);
      onBanksChanged();
    } catch (error: any) {
      setBankError(error.message);
    } finally {
      setBankBusy(false);
    }
  }

  async function openBankHistory(account: BankAccount) {
    setBankTarget(account);
    setBankLogs([]);
    setBankError('');
    setBankMode('history');
    try {
      const res = await fetch(`/api/finance/bank-accounts/logs?bankAccountId=${encodeURIComponent(account.id)}`);
      const json = await res.json();
      if (json.success) setBankLogs(json.data || []);
    } catch {
      setBankError('โหลดประวัติการแก้ไขไม่สำเร็จ');
    }
  }

  async function saveReconciliation(event: React.FormEvent) {
    event.preventDefault();
    if (!bankTarget) return;
    const balance = Number(statementBalance);
    if (!Number.isFinite(balance) || balance < 0) {
      setBankError('ยอดตามสเตตเมนต์ต้องไม่ติดลบ');
      return;
    }
    setBankBusy(true);
    setBankError('');
    try {
      const res = await fetch('/api/finance/bank-accounts/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            bankAccountId: bankTarget.id,
            statementBalance: balance,
            notes: statementNote,
            bankFees: 0,
          },
          actor,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'บันทึกกระทบยอดไม่สำเร็จ');
      setBankMode(null);
      onBanksChanged();
    } catch (error: any) {
      setBankError(error.message);
    } finally {
      setBankBusy(false);
    }
  }

  const pageTitle = PAGES.find((item) => item.id === page)?.label || 'การเงินและบัญชี';

  return (
    <div className="min-h-full min-w-0 max-w-full space-y-4 bg-[#f4f7fb] pb-16 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          <span className="font-bold text-[#0e2744]">ZMS</span>
          <span className="mx-2">/</span>
          การเงินและบัญชี
          <span className="mx-2">/</span>
          <span className="text-slate-700">{pageTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { onRefresh(); setReloadKey((key) => key + 1); }} className="zms-action rounded-full border border-slate-200 bg-white p-2 text-slate-500" title="โหลดข้อมูลล่าสุด">
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs">
            <span className="font-semibold text-slate-800">{userName}</span>
            <span className="ml-2 text-slate-400">{roleLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0e2744]">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {page === 'income' ? 'ทะเบียนรับเงิน • แยกประเภทและวัตถุประสงค์ก่อนรับรายได้'
              : page === 'banks' ? 'แยกบัญชีตามประเภทเงิน ตรวจสอบยอดในระบบกับรายการเคลื่อนไหว'
              : page === 'allocation' ? 'ควบคุมสัดส่วนงบซะกาตแยกกองทุนย่อย จากงบที่บันทึกในปีนี้'
              : page === 'movements' ? 'กลุ่มงานเหรัญญิก · บริหารฝาก ถอน โอน และตรวจยอดบัญชี A B C'
              : page === 'approval' ? 'กลุ่มงานเหรัญญิก · ตรวจรอบเบิก อนุมัติแล้วโอนภายในจากบัญชี B ไปบัญชี C'
              : page === 'expenses' ? 'แยกรายจ่ายช่วยเหลือออกจากค่าใช้จ่ายบริหาร ตรวจก่อนบันทึกจ่าย'
              : page === 'reconcile' ? 'เทียบรายการในระบบกับยอดสเตตเมนต์ที่บันทึกไว้'
              : page === 'reports' ? 'ดูรายงานจากสมุดบัญชี และตรวจประวัติธุรกรรมในหน้าเดียวกัน'
              : `ปีงบประมาณ ${year} · ${dashboardState === 'loading' ? 'กำลังคำนวณจากรายการจริง' : dashboardState === 'error' ? 'โหลดตัวเลขสรุปไม่สำเร็จ' : 'ตัวเลขคำนวณจากรายการที่บันทึกในระบบ'}`}
          </p>
        </div>
        {page === 'income' ? (
          <div className="flex gap-2">
            <button type="button" onClick={exportIncomeCsv} className="zms-action inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <Download className="h-4 w-4" />
              ส่งออก
            </button>
            {canRecordIncome ? (
              <button type="button" onClick={focusIncomeForm} className="zms-action inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-3 py-2 text-sm font-bold text-white">
                <Plus className="h-4 w-4" />
                เพิ่มรายรับ
              </button>
            ) : null}
          </div>
        ) : page === 'banks' ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => openPage('reconcile')} aria-pressed={showReconcile} className={`zms-action inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${showReconcile ? 'border-teal-200 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-700'}`}>
              <FileSpreadsheet className="h-4 w-4" />
              รายงานกระทบยอด
            </button>
            {canManageBanks ? (
              <button type="button" onClick={openBankCreate} className="zms-action inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-3 py-2 text-sm font-bold text-white">
                <Plus className="h-4 w-4" />
                เพิ่มบัญชี
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {page === 'overview' ? <div className="flex flex-wrap gap-2">
        <select value={year} onChange={(event) => setYear(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          {years.map((item) => (
            <option key={item} value={item}>ปี {item}</option>
          ))}
        </select>
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาเลขที่ ชื่อผู้เกี่ยวข้อง หรือหมวด"
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </div>
      </div> : null}

      {page === 'overview' ? (
        <div className="space-y-4">
          <CashPositionCards />
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="รายรับทั้งหมด" value={baht(dashboard?.kpi.totalIncome ?? incomeTotal)} hint="รายการรับเงินที่ยืนยันแล้ว" />
            <Metric label="รายจ่ายทั้งหมด" value={baht(dashboard?.kpi.totalExpense ?? expenseTotal)} hint="รายจ่ายช่วยเหลือและค่าบริหาร" />
            <Metric label="ยอดเงินคงเหลือ" value={baht(dashboard?.kpi.netBalance ?? net)} hint="รายรับ − รายจ่าย" tone="navy" />
            <Metric label="ยอดเงินในบัญชีธนาคาร" value={baht(dashboard?.kpi.totalBankBalance ?? bankTotal)} hint={`${activeBanks.length} บัญชีที่ใช้งาน`} />
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Metric label="ยอดเงินสดคงเหลือ" value={baht(dashboard?.kpi.totalCashOnHand ?? 0)} hint="เงินสดในวงจรที่ยังไม่ปิด" />
            <Metric label="งบประมาณที่จัดสรร" value={baht(dashboard?.kpi.totalAllocatedBudget ?? budget)} hint="ยอดรับเข้ากองทุน" />
            <Metric label="ยอดช่วยเหลือที่จ่ายจริง" value={baht(dashboard?.kpi.totalDisbursedAid ?? disbursed)} />
            <Metric label="งบประมาณคงเหลือ" value={baht(dashboard?.kpi.totalAvailableFunds ?? available)} />
            <Metric label="รายการรออนุมัติ" value={String(dashboard?.kpi.pendingApprovalsCount ?? pendingApps.length)} hint="วงจรเงินสดที่ยังดำเนินการ" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-4">
              <div className="mb-4 text-sm font-bold">รายรับเทียบรายจ่ายรายเดือน</div>
              <div className="flex h-40 items-end gap-2">
                {monthly.map((row) => (
                  <div key={row.label} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-32 w-full items-end justify-center gap-1">
                      <div className="w-2 rounded-t bg-emerald-500" style={{ height: `${(row.income / maxMonth) * 100}%` }} />
                      <div className="w-2 rounded-t bg-slate-700" style={{ height: `${(row.expense / maxMonth) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400">{row.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-[11px] text-slate-500">
                <span>รายรับ {baht(incomeTotal)}</span>
                <span>รายจ่าย {baht(expenseTotal)}</span>
              </div>
            </Card>
            <Card className="p-4">
              <div className="mb-3 text-sm font-bold">สัดส่วนรายรับตามประเภทเงิน</div>
              {funds.length === 0 ? <Empty text="ยังไม่มียอดกองทุน" /> : funds.slice(0, 6).map((fund) => {
                const width = budget > 0 ? Math.min(100, (fund.totalReceived / budget) * 100) : 0;
                return (
                  <div key={fund.id} className="mb-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{fund.name}</span>
                      <span>{width.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-emerald-600" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
            <Card>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm font-bold">รายการเคลื่อนไหวล่าสุด</div>
                <button type="button" onClick={() => openPage('audit')} className="text-xs font-semibold text-emerald-700">ดูทั้งหมด</button>
              </div>
              <TxTable rows={recent.slice(0, 6)} onSelect={setSelectedId} selectedId={selected?.id} />
            </Card>
            <Card>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm font-bold">รอนุมัติ {pendingApps.length} รายการ</div>
                {onOpenApprovals ? <button type="button" onClick={onOpenApprovals} className="text-xs font-semibold text-emerald-700">เปิดคิวอนุมัติ</button> : null}
              </div>
              {pendingApps.length === 0 ? <Empty text="ไม่มีคำร้องที่รอการเงิน" /> : pendingApps.slice(0, 5).map((app) => (
                <button key={app.id} type="button" className="block w-full border-t border-slate-100 px-4 py-3 text-left">
                  <div className="text-sm font-semibold">{app.fullName}</div>
                  <div className="text-[11px] text-slate-400">{app.applicationNo}</div>
                  <div className="mt-1 text-sm font-bold">{baht(app.approvedAmount || app.requestedAmount || 0)}</div>
                </button>
              ))}
            </Card>
          </div>
        </div>
      ) : null}

      {page === 'income' ? (
        <div className={`grid items-start gap-4 ${incomeFormOpen ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
        <IncomeBoard
          year={year}
          years={years}
          onYear={(value) => { setYear(value); setIncomePage(1); }}
          query={incomeQuery}
          onQuery={(value) => { setIncomeQuery(value); setIncomePage(1); }}
          money={incomeMoney}
          onMoney={(value) => { setIncomeMoney(value); setIncomePage(1); }}
          status={incomeStatus}
          onStatus={(value) => { setIncomeStatus(value); setIncomePage(1); }}
          dateFrom={incomeFrom}
          dateTo={incomeTo}
          onDateFrom={(value) => { setIncomeFrom(value); setIncomePage(1); }}
          onDateTo={(value) => { setIncomeTo(value); setIncomePage(1); }}
          confirmedTotal={confirmedIncome.reduce((sum, tx) => sum + tx.amount, 0)}
          pendingTotal={pendingIncome.reduce((sum, tx) => sum + tx.amount, 0)}
          pendingCount={pendingIncome.length}
          rows={incomeSlice}
          total={incomeListed.length}
          page={incomePageSafe}
          pageCount={incomePageCount}
          onPage={setIncomePage}
          selected={incomeSelected}
          onSelect={(id) => { setIncomeSelectedId(id); setIncomeDetailOpen(false); }}
          detailOpen={incomeDetailOpen}
          onDetail={() => setIncomeDetailOpen(true)}
          onEdit={openIncomeEdit}
          onPrint={printIncomeReceipt}
          onConfirm={confirmIncome}
          canRecord={canRecordIncome}
          canCancel={canCancelIncome}
          saving={saving}
          cancelReason={cancelReason}
          onCancelReason={setCancelReason}
          onCancel={cancelIncome}
          error={incomeError}
        />
        {incomeFormOpen ? <div ref={incomeFormRef} className="lg:sticky lg:top-4">
          <IncomeForm
            editing={Boolean(incomeEditingId)}
            editingNo={editingIncome?.transactionNo}
            recorder={editingIncome?.recordedBy || userName}
            form={incomeForm}
            funds={fundsForMoney(incomeForm.moneyType).some((fund) => fund.id === incomeForm.fundId) || !incomeForm.fundId
              ? fundsForMoney(incomeForm.moneyType)
              : [...fundsForMoney(incomeForm.moneyType), ...funds.filter((fund) => fund.id === incomeForm.fundId)]}
            banks={activeBanks}
            canRecord={canRecordIncome}
            saving={saving}
            error={incomeError}
            onChange={setIncomeForm}
            onMoneyType={(moneyType) => {
              const nextFunds = fundsForMoney(moneyType);
              const fundId = nextFunds.some((fund) => fund.id === incomeForm.fundId) ? incomeForm.fundId : (nextFunds[0]?.id || '');
              setIncomeForm({ ...incomeForm, moneyType, fundId });
            }}
            onReset={resetIncomeForm}
            onClose={() => { resetIncomeForm(); setIncomeFormOpen(false); }}
            onSubmit={saveIncome}
            step={editingIncome ? (editingIncome.status === 'pending' ? 2 : editingIncome.status === 'completed' ? 4 : 1) : 1}
          />
        </div> : null}
        </div>
      ) : null}

      {page === 'banks' ? (() => {
        const statementGap = bankAccounts.reduce((sum, account) => sum + Number(account.currentBalance || 0) - Number(account.reconciledBalance || 0), 0);
        const reconciledCount = bankAccounts.filter((account) => account.lastReconciledAt).length;
        const cashOnHand = dashboard?.kpi.totalCashOnHand ?? 0;
        const branches = Array.from(new Set(bankAccounts.map((account) => account.branchName).filter((name): name is string => Boolean(name))));
        const asOf = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date());
        const visibleBanks = bankAccounts.filter((account) => {
          if (bankStatus === 'active' && account.status !== 'active') return false;
          if (bankStatus === 'closed' && account.status === 'active') return false;
          if (bankMoney !== 'all' && !(account.moneyTypes || []).includes(bankMoney)) return false;
          if (bankBranch !== 'all' && (account.branchName || '') !== bankBranch) return false;
          const q = bankQuery.trim().toLowerCase();
          if (q && !`${account.bankName} ${account.accountName} ${account.accountNumber}`.toLowerCase().includes(q)) return false;
          return true;
        });
        const field = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none';
        return (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="text-[11px] text-slate-400">ช่วงวันที่
              <span className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 px-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input type="date" value={bankFrom} onChange={(event) => setBankFrom(event.target.value)} className="w-full bg-transparent py-2 text-xs outline-none" />
                <input type="date" value={bankTo} onChange={(event) => setBankTo(event.target.value)} className="w-full bg-transparent py-2 text-xs outline-none" />
              </span>
            </label>
            <label className="text-[11px] text-slate-400">ปีงบประมาณ
              <select value={year} onChange={(event) => setYear(event.target.value)} className={field}>
                {years.map((item) => <option key={item} value={item}>ปีงบประมาณ {item}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-slate-400">ประเภทเงิน
              <select value={bankMoney} onChange={(event) => setBankMoney(event.target.value)} className={field}>
                <option value="all">ทุกประเภทเงิน</option>
                {MONEY_TYPE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-slate-400">สาขา
              <select value={bankBranch} onChange={(event) => setBankBranch(event.target.value)} className={field}>
                <option value="all">ทุกสาขา</option>
                {branches.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-slate-400">สถานะบัญชี
              <select value={bankStatus} onChange={(event) => setBankStatus(event.target.value)} className={field}>
                <option value="active">บัญชีที่ใช้งาน</option>
                <option value="all">ทุกสถานะ</option>
                <option value="closed">ปิดหรือระงับ</option>
              </select>
            </label>
            <label className="text-[11px] text-slate-400">ค้นหา
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={bankQuery} onChange={(event) => setBankQuery(event.target.value)} placeholder="ค้นหาธนาคาร / ชื่อบัญชี" className="w-full bg-transparent py-2 text-sm outline-none" />
              </span>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <BankMetric label="ยอดคงเหลือรวมทุกบัญชี" value={baht(bankTotal)} icon={Landmark} tone="navy" />
            <BankMetric label="บัญชีที่ใช้งาน" value={`${activeBanks.length} บัญชี`} icon={Building2} />
            <BankMetric label="ยอดส่วนต่างกระทบยอด" value={baht(statementGap)} icon={ArrowLeftRight} valueClass={Math.abs(statementGap) < 0.005 ? '' : 'text-amber-600'} />
            <BankMetric label="กระทบยอดครบแล้ว" value={`${reconciledCount} / ${bankAccounts.length} บัญชี`} icon={Check} />
          </div>
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-bold text-[#0e2744]">ทะเบียนบัญชีและยอดเคลื่อนไหว</h2>
            <p className="text-[11px] text-slate-400">ข้อมูล ณ {asOf}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {bankAccounts.length === 0 ? <Card><Empty text="ยังไม่มีบัญชีธนาคาร" /></Card> : visibleBanks.length === 0 ? <Card><Empty text="ไม่พบบัญชีตามเงื่อนไข" /></Card> : visibleBanks.map((account) => {
              const rows = inYear.filter((tx) => tx.bankAccountId === account.id && tx.status !== 'cancelled' && tx.status !== 'reversed' && withinIsoRange(tx.date, bankFrom, bankTo));
              const received = rows.filter(isIncome).reduce((sum, tx) => sum + tx.amount, 0);
              const paid = rows.filter(isOutflow).reduce((sum, tx) => sum + tx.amount, 0);
              const transferred = rows.filter((tx) => (tx.type as string) === 'transfer').reduce((sum, tx) => sum + tx.amount, 0);
              const current = Number(account.currentBalance || 0);
              const statement = Number(account.reconciledBalance || 0);
              const gap = current - statement;
              const matched = Math.abs(gap) < 0.005;
              const primaryMoney = (account.moneyTypes || [])[0];
              const reconciler = account.lastReconciledBy && !/^[0-9a-f-]{16,}$/i.test(account.lastReconciledBy) ? account.lastReconciledBy : '';
              const actionClass = 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-700';
              return (
                <Card key={account.id} className="flex flex-col overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#0B2545]">
                        <Landmark className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#0e2744]">{account.bankName}</div>
                        <div className="text-[11px] text-slate-400">{primaryMoney ? moneyTypeLabel(primaryMoney) : 'บัญชีรับจ่าย'} • {accountTypeLabel(account.accountType)}{account.branchName ? ` • ${account.branchName}` : ''}</div>
                      </div>
                    </div>
                    <div className="mt-4 text-[11px] text-slate-400">ชื่อบัญชี</div>
                    <div className="text-sm font-semibold text-slate-800">{account.accountName}</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="font-mono text-sm tracking-widest text-slate-500">{cardAccountNo(account.accountNumber)}</div>
                      <div className={`text-[11px] font-semibold ${account.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}>{bankStatusLabel(account.status)}</div>
                    </div>
                    <div className="mt-4 text-[11px] text-slate-400">ประเภทเงินที่รับได้</div>
                    {(account.moneyTypes || []).length === 0 ? <div className="mt-1 text-xs text-slate-400">ยังไม่ระบุ</div> : (
                      <ul className="mt-1 space-y-1">
                        {(account.moneyTypes || []).map((type) => (
                          <li key={type} className="text-xs font-medium text-[#0D9488]">• {moneyTypeLabel(type)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="mt-auto space-y-2 border-t border-slate-100 px-4 py-3 text-xs">
                    <div className="flex justify-between gap-3 text-slate-500"><span>ยอดยกมา ปี {year}</span><span className="shrink-0 font-semibold text-slate-800">{baht(account.openingBalance || 0)}</span></div>
                    <div className="flex justify-between gap-3 text-slate-500"><span>เงินฝาก / รายรับ</span><span className="shrink-0 font-semibold text-slate-800">{baht(received)}</span></div>
                    <div className="flex justify-between gap-3 text-slate-500"><span>เงินถอน / รายจ่าย</span><span className="shrink-0 font-semibold text-slate-800">{baht(paid)}</span></div>
                    <div className="flex justify-between gap-3 text-slate-500"><span>โยกภายในสุทธิ</span><span className="shrink-0 font-semibold text-slate-800">{baht(transferred)}</span></div>
                  </div>
                  <div className="bg-[#0B2545] px-4 py-4 text-white">
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-[11px] text-slate-300">ยอดคงเหลือในระบบ</div>
                      <div className="text-xl font-bold">{baht(current)}</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-300">
                      <span>ยอดตาม Statement</span>
                      <span>{baht(statement)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="text-[11px] text-slate-500">
                      <div>กระทบยอดล่าสุด {account.lastReconciledAt ? thaiDate(account.lastReconciledAt) : 'ยังไม่เคยกระทบยอด'}</div>
                      <div className="text-slate-400">{reconciler ? `โดย ${reconciler} • ` : ''}ส่วนต่าง {baht(gap)}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${matched ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{matched ? 'ตรงกัน' : 'มีส่วนต่าง'}</span>
                  </div>
                  <div className="flex gap-2 border-t border-slate-100 px-3 py-3">
                    {canManageBanks ? <button type="button" onClick={() => openBankEdit(account)} className={"zms-action " + actionClass}><Pencil className="h-3.5 w-3.5" />แก้ไข</button> : null}
                    <button type="button" onClick={() => openBankHistory(account)} className={"zms-action " + actionClass}><Eye className="h-3.5 w-3.5" />ดูประวัติ</button>
                    {canReconcile ? <button type="button" onClick={() => { setBankTarget(account); setStatementBalance(String(account.reconciledBalance || account.currentBalance || 0)); setStatementNote(''); setBankError(''); setBankMode('reconcile'); }} className={"zms-action " + actionClass}><Scale className="h-3.5 w-3.5" />กระทบยอด</button> : null}
                    {canManageBanks ? <button type="button" onClick={() => { setBankTarget(account); setBankError(''); setBankMode('detail'); }} className={actionClass}>{account.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button> : null}
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">การโอนระหว่างบัญชีและเงินสด ไม่นับเป็นรายรับหรือรายจ่าย</div>
              <div className="mt-1">ยอดบัญชีในระบบ {baht(bankTotal)} • เงินสดคงเหลือ {baht(cashOnHand)} • รวมเงินคงเหลือ {baht(bankTotal + cashOnHand)}{canManageBanks ? '' : ' • การเพิ่มและปิดบัญชีทำได้โดยผู้ดูแลระบบ'}</div>
            </div>
          </div>
        </div>
        );
      })() : null}
      {bankMode ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-bold">
                    {bankMode === 'create' ? 'เพิ่มบัญชีธนาคาร' : bankMode === 'edit' ? 'แก้ไขบัญชี' : bankMode === 'history' ? 'ประวัติการแก้ไข' : bankMode === 'reconcile' ? 'กระทบยอดธนาคาร' : 'รายละเอียดบัญชี'}
                  </div>
                  <button type="button" onClick={() => setBankMode(null)} className="text-xs text-slate-500">ปิด</button>
                </div>
                {bankError ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{bankError}</p> : null}
                {bankMode === 'create' || bankMode === 'edit' ? (
                  <form onSubmit={saveBank} className="space-y-3">
                    <label className="block text-xs text-slate-500">ธนาคาร
                      <input value={bankForm.bankName} onChange={(event) => setBankForm({ ...bankForm, bankName: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs text-slate-500">ชื่อบัญชี
                      <input value={bankForm.accountName} onChange={(event) => setBankForm({ ...bankForm, accountName: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs text-slate-500">เลขบัญชี
                      <input value={bankForm.accountNumber} onChange={(event) => setBankForm({ ...bankForm, accountNumber: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs text-slate-500">สาขา
                      <input value={bankForm.branchName} onChange={(event) => setBankForm({ ...bankForm, branchName: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    {bankMode === 'create' ? (
                      <label className="block text-xs text-slate-500">ยอดยกมา
                        <input value={bankForm.openingBalance} onChange={(event) => setBankForm({ ...bankForm, openingBalance: event.target.value })} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      </label>
                    ) : null}
                    <label className="block text-xs text-slate-500">ประเภทบัญชี
                      <select value={bankForm.accountType} onChange={(event) => setBankForm({ ...bankForm, accountType: event.target.value as BankForm['accountType'] })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                        <option value="savings">ออมทรัพย์</option>
                        <option value="current">กระแสรายวัน</option>
                      </select>
                    </label>
                    <div className="text-xs text-slate-500">ประเภทเงินที่รองรับ
                      <div className="mt-2 flex flex-wrap gap-2">
                        {MONEY_TYPE_OPTIONS.map((item) => (
                          <label key={item.id} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1">
                            <input
                              type="checkbox"
                              checked={bankForm.moneyTypes.includes(item.id)}
                              onChange={(event) => setBankForm({
                                ...bankForm,
                                moneyTypes: event.target.checked
                                  ? [...bankForm.moneyTypes, item.id]
                                  : bankForm.moneyTypes.filter((value) => value !== item.id),
                              })}
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <button type="submit" disabled={bankBusy} className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white disabled:opacity-50">{bankBusy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                  </form>
                ) : null}
                {bankMode === 'detail' && bankTarget ? (
                  <div className="space-y-3 text-sm">
                    <div className="font-semibold">{bankTarget.accountName}</div>
                    <div>{bankTarget.bankName} · {bankTarget.branchName || 'ไม่ระบุสาขา'}</div>
                    <div className="tracking-widest">{showFullNumber && canManageBanks ? bankTarget.accountNumber : maskAccount(bankTarget.accountNumber)}</div>
                    {canManageBanks ? (
                      <button type="button" onClick={() => setShowFullNumber((value) => !value)} className="text-xs font-semibold text-emerald-700">{showFullNumber ? 'ซ่อนเลขบัญชี' : 'ดูเลขบัญชีเต็ม'}</button>
                    ) : <p className="text-xs text-slate-400">เลขบัญชีเต็มแสดงได้เฉพาะผู้ดูแลระบบ</p>}
                    <div>สถานะ {bankStatusLabel(bankTarget.status)}</div>
                    <div>ยอดในระบบ {baht(bankTarget.currentBalance)} · ยอดสเตตเมนต์ {baht(bankTarget.reconciledBalance || 0)}</div>
                    {canManageBanks ? (
                      <button
                        type="button"
                        disabled={bankBusy}
                        onClick={() => changeBankStatus(bankTarget, bankTarget.status === 'active' ? 'closed' : 'active')}
                        className="w-full rounded-xl border border-slate-300 py-2 text-sm font-bold"
                      >
                        {bankTarget.status === 'active' ? 'ยืนยันปิดใช้งาน โดยไม่ลบประวัติ' : 'เปิดใช้งานอีกครั้ง'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {bankMode === 'history' && bankTarget ? (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-500">{bankTarget.accountName}</div>
                    {bankLogs.length === 0 ? <Empty text="ยังไม่มีประวัติการแก้ไข" /> : bankLogs.map((log) => (
                      <div key={log.id} className="border-t border-slate-100 py-2 text-xs">
                        <div className="font-semibold">{log.changedByName} · {thaiDate(log.createdAt)}</div>
                        <div>{log.fieldName}: {log.oldValue || '—'} → {log.newValue || '—'}</div>
                      </div>
                    ))}
                    <div className="pt-2 text-sm font-bold">รายการเคลื่อนไหว</div>
                    <TxTable rows={transactions.filter((tx) => tx.bankAccountId === bankTarget.id)} onSelect={setSelectedId} selectedId={selected?.id} />
                  </div>
                ) : null}
                {bankMode === 'reconcile' && bankTarget ? (
                  <form onSubmit={saveReconciliation} className="space-y-3">
                    <p className="text-xs text-slate-500">บันทึกยอดตามสเตตเมนต์เทียบกับยอดในระบบ ระบบจะไม่แก้รายการในสมุดบัญชีเพื่อบังคับให้ยอดตรงกัน</p>
                    <div className="text-sm">ยอดในระบบ {baht(bankTarget.currentBalance)}</div>
                    <label className="block text-xs text-slate-500">ยอดตามสเตตเมนต์
                      <input value={statementBalance} onChange={(event) => setStatementBalance(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs text-slate-500">หมายเหตุ
                      <textarea value={statementNote} onChange={(event) => setStatementNote(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={3} />
                    </label>
                    <button type="submit" disabled={bankBusy} className="w-full rounded-xl bg-[#0e2744] py-2.5 text-sm font-bold text-white disabled:opacity-50">{bankBusy ? 'กำลังบันทึก...' : 'บันทึกการกระทบยอด'}</button>
                  </form>
                ) : null}
              </Card>
            </div>
      ) : null}

      {page === 'allocation' ? (
        <AllocationScreen
          year={year}
          years={years}
          onYear={setYear}
          fallback={asnafRows}
          bankTotal={bankTotal}
          cash={dashboard?.kpi.totalCashOnHand ?? 0}
          actor={actor}
        />
      ) : null}
      {page === 'movements' ? <MovementScreen rows={inYear} bankTotal={bankTotal} cash={dashboard?.kpi.totalCashOnHand ?? 0} banks={bankAccounts} actor={actor} onChanged={onRefresh} /> : null}
      {page === 'approval' ? (
        ['super_admin', 'executive', 'finance'].includes(actor.role) ? (
          <TreasurerWorkbenchPage actor={actor} rows={inYear} onRefreshParent={onRefresh} />
        ) : (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-sm text-slate-600">
            สิทธิ์อนุมัติรอบเบิกอยู่ที่ผู้ดูแลระบบ ผู้บริหาร และเจ้าหน้าที่การเงิน
          </div>
        )
      ) : null}
      {page === 'expenses' ? (
        <div className="space-y-4">
          <StaffCasePaymentPanel actor={actor} onChanged={onRefresh} />
          <ExpenseScreen rows={inYear.filter((tx) => tx.type === 'expense' || tx.type === 'disbursement')} bankTotal={bankTotal} cash={dashboard?.kpi.totalCashOnHand ?? 0} banks={bankAccounts} fundAccounts={funds} actor={actor} onChanged={onRefresh} />
        </div>
      ) : null}
      {page === 'banks' && showReconcile ? (
        <div id="bank-reconcile-panel" className="scroll-mt-4">
          <ReconcileScreen
            banks={bankAccounts}
            rows={inYear}
            onOpen={(account) => { setBankTarget(account); setStatementBalance(String(account.reconciledBalance || account.currentBalance || 0)); setStatementNote(''); setBankError(''); setBankMode('reconcile'); }}
          />
        </div>
      ) : null}
      {page === 'reports' ? (
        <div className="min-w-0 max-w-full space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs text-slate-500">ตั้งแต่
              <input type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />
            </label>
            <label className="text-xs text-slate-500">ถึง
              <input type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />
            </label>
            <label className="text-xs text-slate-500">ประเภทเงิน
              <select value={reportMoney} onChange={(event) => setReportMoney(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="all">ทุกประเภท</option>
                {INCOME_MONEY_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-500">บัญชีธนาคาร
              <select value={reportBank} onChange={(event) => setReportBank(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="all">ทุกบัญชี</option>
                {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.bankName} · {account.accountName}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-500">สถานะ
              <select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="all">ทุกสถานะ</option>
                <option value="completed">ลงบัญชีแล้ว</option>
                <option value="pending">รอยืนยัน</option>
                <option value="reversed">กลับรายการ</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[#E2E8F0] bg-white p-1 sm:flex sm:w-fit" role="tablist">
            <button type="button" role="tab" aria-selected={ledgerTab === 'reports'} onClick={() => { setLedgerTab('reports'); onSectionChange?.('/finance/reports'); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${ledgerTab === 'reports' ? 'bg-[#0B2545] text-white' : 'text-slate-600'}`}>รายงานการเงิน</button>
            <button type="button" role="tab" aria-selected={ledgerTab === 'transactions'} onClick={() => { setLedgerTab('transactions'); onSectionChange?.('/finance/reports?tab=transactions'); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${ledgerTab === 'transactions' ? 'bg-[#0B2545] text-white' : 'text-slate-600'}`}>ประวัติธุรกรรม</button>
          </div>
          {ledgerTab === 'transactions' ? (
            <AuditScreen rows={reportRows} compactFilters />
          ) : (
            <ReportScreen
              year={year}
              income={reportIncome}
              expense={reportExpense}
              net={reportIncome - reportExpense}
              bankTotal={reportBankTotal}
              accounts={reportAccounts}
              cash={dashboard?.kpi.totalCashOnHand ?? 0}
              funds={funds}
              asnaf={reportAsnaf}
              rows={reportRows}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

type IncomeDraft = {
  donor: string;
  amount: string;
  fundId: string;
  bankAccountId: string;
  moneyType: 'zakat' | 'sadaqah' | 'operational_admin';
  paymentMethod: 'promptpay_qr' | 'bank_transfer' | 'cash';
  notes: string;
  referenceNo: string;
  purpose: string;
  receivedDate: string;
};

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0D9488]';
}

function IncomeBoard({
  year,
  years,
  onYear,
  query,
  onQuery,
  money,
  onMoney,
  status,
  onStatus,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  confirmedTotal,
  pendingTotal,
  pendingCount,
  rows,
  total,
  page,
  pageCount,
  onPage,
  selected,
  onSelect,
  detailOpen,
  onDetail,
  onEdit,
  onPrint,
  onConfirm,
  canRecord,
  canCancel,
  saving,
  cancelReason,
  onCancelReason,
  onCancel,
  error,
}: {
  year: string;
  years: string[];
  onYear: (value: string) => void;
  query: string;
  onQuery: (value: string) => void;
  money: string;
  onMoney: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFrom: (value: string) => void;
  onDateTo: (value: string) => void;
  confirmedTotal: number;
  pendingTotal: number;
  pendingCount: number;
  rows: FinancialTransaction[];
  total: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  selected: FinancialTransaction | null;
  onSelect: (id: string) => void;
  detailOpen: boolean;
  onDetail: () => void;
  onEdit: (tx: FinancialTransaction) => void;
  onPrint: (tx: FinancialTransaction) => void;
  onConfirm: () => void;
  canRecord: boolean;
  canCancel: boolean;
  saving: boolean;
  cancelReason: string;
  onCancelReason: (value: string) => void;
  onCancel: () => void;
  error: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * 6 + 1;
  const to = Math.min(page * 6, total);
  const editable = Boolean(selected && selected.status !== 'reversed' && selected.status !== 'cancelled');
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter((item) => item === 1 || item === pageCount || Math.abs(item - page) <= 1);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-[#0B2545] px-5 py-4 text-white">
          <div className="text-xs text-slate-300">รายรับที่ยืนยันแล้ว</div>
          <div className="mt-3 text-xl font-bold tracking-tight">{baht(confirmedTotal)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs text-slate-500">รอยืนยัน • {pendingCount} รายการ</div>
          <div className="mt-3 text-xl font-bold tracking-tight text-[#0B2545]">{baht(pendingTotal)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs text-slate-500">แบบร่าง • 0 รายการ</div>
          <div className="mt-3 text-xl font-bold tracking-tight text-[#0B2545]">{baht(0)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="ค้นหาเลขที่รายการ ชื่อผู้บริจาค หรือเลขอ้างอิง" className="w-full bg-transparent py-2.5 text-sm outline-none" />
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          ตั้งแต่
          <input type="date" value={dateFrom} onChange={(event) => onDateFrom(event.target.value)} className="bg-transparent text-sm text-slate-700 outline-none" />
          ถึง
          <input type="date" value={dateTo} onChange={(event) => onDateTo(event.target.value)} className="bg-transparent text-sm text-slate-700 outline-none" />
        </label>
        <select value={money} onChange={(event) => onMoney(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="all">ทุกประเภทเงิน</option>
          {INCOME_MONEY_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select value={status} onChange={(event) => onStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="all">ทุกสถานะ</option>
          <option value="completed">รับเงินแล้ว</option>
          <option value="pending">รอยืนยัน</option>
          <option value="reversed">กลับรายการ</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>

      <Card>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm font-bold">รายการรับเงิน {total} รายการ</div>
          <select value={year} onChange={(event) => onYear(event.target.value)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {years.map((item) => <option key={item} value={item}>ปีงบ {item}</option>)}
          </select>
        </div>
        {rows.length === 0 ? <Empty text="ไม่มีรายการรับเงินตามเงื่อนไขนี้" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">วันที่ / เลขที่</th>
                  <th className="px-4 py-2 font-medium">ผู้บริจาค / ประเภทเงิน</th>
                  <th className="px-4 py-2 text-right font-medium">จำนวนเงิน (บาท)</th>
                  <th className="px-4 py-2 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr
                    key={tx.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${tx.transactionNo} ${tx.payerOrPayee}`}
                    onClick={() => onSelect(tx.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') onSelect(tx.id);
                    }}
                    className={`cursor-pointer border-t border-slate-100 ${selected?.id === tx.id ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3">
                      <div>{thaiDate(tx.date)}</div>
                      <div className="text-[11px] text-slate-400">{tx.transactionNo}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{tx.donorName || tx.payerOrPayee}</div>
                      <div className="text-[11px] text-slate-400">{moneyTypeLabel(tx.moneyType || 'zakat')} • {tx.usageRestriction || tx.category}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{baht(tx.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${incomeStatusClass(tx)}`}>{incomeStatusText(tx)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>{from}-{to} จาก {total} รายการ</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg px-2 py-1 disabled:opacity-30">‹</button>
            {pages.map((item, index) => (
              <span key={item} className="flex items-center">
                {index > 0 && item - pages[index - 1] > 1 ? <span className="px-1">…</span> : null}
                <button type="button" onClick={() => onPage(item)} className={`h-7 min-w-7 rounded-lg ${item === page ? 'bg-[#0B2545] text-white' : 'hover:bg-slate-100'}`}>{item}</button>
              </span>
            ))}
            <button type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)} className="rounded-lg px-2 py-1 disabled:opacity-30">›</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-[#0B2545]">รายการที่เลือก: {selected?.transactionNo || '—'}</div>
            <div className="text-[11px] text-slate-400">{editable ? 'แก้ไขได้ก่อนกลับรายการ' : 'เลือกรายการเพื่อดู แก้ไข หรือพิมพ์ใบเสร็จ'}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!selected} onClick={onDetail} className="zms-action inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"><Eye className="h-3.5 w-3.5" />รายละเอียด</button>
            <button type="button" disabled={!selected || !editable || !canRecord} onClick={() => selected && onEdit(selected)} className="zms-action inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"><Pencil className="h-3.5 w-3.5" />แก้ไข</button>
            <button type="button" disabled={!selected} onClick={() => selected && onPrint(selected)} className="zms-action inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"><Printer className="h-3.5 w-3.5" />พิมพ์ใบเสร็จ</button>
            <button type="button" disabled={!selected || selected.status !== 'pending' || !canRecord || saving} onClick={onConfirm} className="zms-action inline-flex items-center gap-1 rounded-full bg-[#0B2545] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" />ยืนยันรับเงิน</button>
          </div>
        </div>
        {detailOpen && selected ? (
          <div className="mx-4 mb-4 space-y-3 rounded-xl border border-slate-100 p-3 text-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <div>ผู้บริจาค <span className="font-semibold">{selected.donorName || selected.payerOrPayee}</span></div>
              <div>จำนวนเงิน <span className="font-semibold">{baht(selected.amount)}</span></div>
              <div>กองทุน <span className="font-semibold">{selected.fundName}</span></div>
              <div>เลขอ้างอิง <span className="font-semibold">{selected.referenceNo || '—'}</span></div>
              <div>ผู้บันทึก <span className="font-semibold">{selected.recordedBy || '—'}</span></div>
              <div>สถานะ <span className="font-semibold">{incomeStatusText(selected)}</span></div>
            </div>
            {selected.notes ? <p className="text-slate-600">{selected.notes}</p> : null}
            {canCancel && editable ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-xs text-slate-500">เหตุผลในการยกเลิก {selected.transactionNo}
                  <textarea value={cancelReason} onChange={(event) => onCancelReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={2} />
                </label>
                <button type="button" onClick={onCancel} disabled={saving} className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">ยืนยันยกเลิกด้วยการกลับรายการ</button>
              </div>
            ) : null}
            {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
          </div>
        ) : null}
        <div className="mx-4 mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          บันทึกรายรับจากฟอร์มนี้เข้ารายรับที่ยืนยันทันที • รายการรอยืนยันต้องกดยืนยันรับเงินก่อนนับเป็นรายรับ
        </div>
      </Card>
    </div>
  );
}

function IncomeForm({
  editing,
  editingNo,
  recorder,
  form,
  funds,
  banks,
  canRecord,
  saving,
  error,
  step,
  onChange,
  onMoneyType,
  onReset,
  onClose,
  onSubmit,
}: {
  editing: boolean;
  editingNo?: string;
  recorder: string;
  form: IncomeDraft;
  funds: FundAccount[];
  banks: BankAccount[];
  canRecord: boolean;
  saving: boolean;
  error: string;
  step: number;
  onChange: (form: IncomeDraft) => void;
  onMoneyType: (moneyType: IncomeDraft['moneyType']) => void;
  onReset: () => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const purposes = form.purpose && !PURPOSE_OPTIONS.includes(form.purpose) ? [form.purpose, ...PURPOSE_OPTIONS] : PURPOSE_OPTIONS;
  const steps = ['แบบร่าง', 'ส่งอนุมัติ', 'อนุมัติแล้ว', 'รับเงินแล้ว'];
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-[#0B2545]">{editing ? 'แก้ไขรายรับ' : 'บันทึกรายรับใหม่'}</div>
          <div className="mt-1 text-[11px] text-slate-400">{editingNo || 'เลขที่จะออกเมื่อบันทึก'} • ผู้บันทึก {recorder}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">{editing ? (step === 4 ? 'รับเงินแล้ว' : step === 2 ? 'รอยืนยัน' : 'แก้ไข') : 'รอบันทึก'}</span>
          <button type="button" onClick={onClose} className="zms-action rounded-lg p-1 text-slate-400" aria-label="ปิดฟอร์ม"><X className="h-4 w-4" /></button>
        </div>
      </div>
      {error ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {canRecord ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-500">วันที่รับเงิน *
              <input type="date" value={form.receivedDate} disabled={editing} onChange={(event) => onChange({ ...form, receivedDate: event.target.value })} className={fieldClass()} />
            </label>
            <label className="block text-xs text-slate-500">ประเภทเงิน *
              <select value={form.moneyType} onChange={(event) => onMoneyType(event.target.value as IncomeDraft['moneyType'])} className={fieldClass()}>
                {INCOME_MONEY_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs text-slate-500">บัญชีธนาคาร{form.paymentMethod === 'cash' ? '' : ' *'}
            <select
              value={form.paymentMethod === 'cash' ? '' : form.bankAccountId}
              disabled={form.paymentMethod === 'cash'}
              onChange={(event) => onChange({ ...form, bankAccountId: event.target.value })}
              className={fieldClass()}
            >
              <option value="">{form.paymentMethod === 'cash' ? 'เงินสด ไม่เข้าบัญชีธนาคาร' : 'เลือกบัญชี'}</option>
              {banks.map((account) => <option key={account.id} value={account.id}>{account.bankName} · {maskAccount(account.accountNumber)} — {account.accountName}</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-500">ชื่อผู้บริจาค *
            <input value={form.donor} onChange={(event) => onChange({ ...form, donor: event.target.value })} className={fieldClass()} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-500">จำนวนเงิน (บาท) *
              <input value={form.amount} onChange={(event) => onChange({ ...form, amount: event.target.value })} inputMode="decimal" className="mt-1 w-full rounded-xl border border-emerald-300 px-3 py-2 text-lg font-bold text-emerald-700 outline-none" />
            </label>
            <label className="block text-xs text-slate-500">ช่องทางรับเงิน *
              <select
                value={form.paymentMethod}
                onChange={(event) => {
                  const paymentMethod = event.target.value as IncomeDraft['paymentMethod'];
                  onChange({ ...form, paymentMethod, bankAccountId: paymentMethod === 'cash' ? '' : form.bankAccountId });
                }}
                className={fieldClass()}
              >
                {PAYMENT_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-500">วัตถุประสงค์
              <select value={form.purpose} onChange={(event) => onChange({ ...form, purpose: event.target.value })} className={fieldClass()}>
                <option value="">ไม่ระบุ</option>
                {purposes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-500">กองทุน *
              <select value={form.fundId} onChange={(event) => onChange({ ...form, fundId: event.target.value })} className={fieldClass()}>
                {funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs text-slate-500">เลขอ้างอิงสลิป *
            <input value={form.referenceNo} onChange={(event) => onChange({ ...form, referenceNo: event.target.value })} placeholder="เลขอ้างอิงจากสลิปหรือพร้อมเพย์" className={fieldClass()} />
          </label>
          <label className="block text-xs text-slate-500">หมายเหตุ
            <textarea value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} rows={3} className={fieldClass()} />
          </label>
          {form.moneyType === 'zakat' ? (
            <div className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>เงินซะกาตมีข้อจำกัดวัตถุประสงค์ ห้ามบันทึกเข้ากองทุนค่าใช้จ่ายบริหาร และต้องเข้ากองทุนซะกาตที่ตรงวัตถุประสงค์</span>
            </div>
          ) : null}
          <p className="text-[11px] text-slate-400">ตรวจสอบจำนวนเงิน วันที่ และเลขอ้างอิงก่อนบันทึกทุกครั้ง</p>
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-600">ลำดับการบันทึก</div>
            <div className="grid grid-cols-4 gap-1">
              {steps.map((label, index) => {
                const current = index + 1 <= step || (!editing && index === 0);
                return (
                  <div key={label} className="text-center">
                    <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${current ? 'bg-[#0D9488] text-white' : 'bg-slate-100 text-slate-400'}`}>{index + 1}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{label}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">ผู้บันทึก → บันทึกเข้ารายรับที่ยืนยัน • ระบบนี้ไม่มีขั้นแบบร่างแยก</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onReset} className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">{editing ? 'ยกเลิกการแก้ไข' : 'ล้างฟอร์ม'}</button>
            <button type="submit" disabled={saving || funds.length === 0} className="zms-action inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D9488] py-2.5 text-sm font-bold text-white disabled:opacity-50">
              <Check className="h-4 w-4" />
              {saving ? 'กำลังบันทึก...' : editing ? 'บันทึกการแก้ไข' : 'บันทึกรายรับ'}
            </button>
          </div>
        </form>
      ) : <p className="text-xs text-slate-500">การบันทึกและแก้ไขรายรับทำได้โดยเจ้าหน้าที่การเงินหรือผู้ดูแลระบบ</p>}
    </Card>
  );
}

function TxTable({
  rows,
  onSelect,
  selectedId,
}: {
  rows: FinancialTransaction[];
  onSelect: (id: string) => void;
  selectedId?: string;
}) {
  if (rows.length === 0) return <Empty text="ไม่มีรายการในช่วงที่เลือก" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs text-slate-400">
          <tr>
            <th className="px-4 py-2 font-medium">วันที่ / เลขที่</th>
            <th className="px-4 py-2 font-medium">รายละเอียด</th>
            <th className="px-4 py-2 text-right font-medium">จำนวนเงิน</th>
            <th className="px-4 py-2 font-medium">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 40).map((tx) => (
            <tr
              key={tx.id}
              role="button"
              tabIndex={0}
              aria-label={`${tx.transactionNo} ${tx.payerOrPayee}`}
              onClick={() => onSelect(tx.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(tx.id);
              }}
              className={`cursor-pointer border-t border-slate-100 ${selectedId === tx.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
            >
              <td className="px-4 py-3">
                <div>{thaiDate(tx.date)}</div>
                <div className="text-[11px] text-slate-400">{tx.transactionNo}</div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">{tx.payerOrPayee || tx.category}</div>
                <div className="text-[11px] text-slate-400">{tx.fundName} · {tx.category}</div>
              </td>
              <td className={`px-4 py-3 text-right font-bold ${tx.type === 'income' ? 'text-emerald-700' : 'text-slate-800'}`}>{baht(tx.amount)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(tx)}`}>{statusLabel(tx)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ tx }: { tx: FinancialTransaction }) {
  return (
    <Card className="p-4">
      <div className="text-sm font-bold">{tx.transactionNo}</div>
      <div className="mt-1 text-xs text-slate-400">{thaiDate(tx.date)} · {tx.payerOrPayee}</div>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
        <div>จำนวนเงิน <span className="font-bold">{baht(tx.amount)}</span></div>
        <div>กองทุน <span className="font-semibold">{tx.fundName || '—'}</span></div>
        <div>ผู้บันทึก <span className="font-semibold">{tx.recordedBy || '—'}</span></div>
        <div>ผู้ตรวจ <span className="font-semibold">{tx.verifiedBy || '—'}</span></div>
        <div>วิธีรับจ่าย <span className="font-semibold">{tx.paymentMethod}</span></div>
        <div>สถานะ <span className="font-semibold">{statusLabel(tx)}</span></div>
      </div>
      {tx.notes ? <p className="mt-3 text-sm text-slate-600">{tx.notes}</p> : null}
    </Card>
  );
}
