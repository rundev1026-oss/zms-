export const FINANCE_SECTION_SLUGS = [
  'dashboard',
  'income',
  'bank-accounts',
  'asnaf-allocation',
  'transfers',
  'disbursement-approval',
  'expenses',
  'reconciliation',
  'reports',
  'transactions',
] as const;

export type FinanceSectionSlug = (typeof FINANCE_SECTION_SLUGS)[number];

export type FinancePageKey =
  | 'overview'
  | 'income'
  | 'banks'
  | 'allocation'
  | 'movements'
  | 'approval'
  | 'expenses'
  | 'reconcile'
  | 'reports'
  | 'audit';

export interface FinanceMenuItem {
  slug: FinanceSectionSlug;
  page: FinancePageKey;
  label: string;
  english: string;
  roles: string[];
  group?: 'treasurer';
}

const FINANCE_VIEW_ROLES = ['super_admin', 'executive', 'finance', 'officer'];
const FINANCE_APPROVAL_ROLES = ['super_admin', 'executive', 'finance'];

export const FINANCE_MENU: FinanceMenuItem[] = [
  { slug: 'dashboard', page: 'overview', label: 'ภาพรวมการเงิน', english: 'Financial Dashboard', roles: FINANCE_VIEW_ROLES },
  { slug: 'income', page: 'income', label: 'จัดการรายรับ', english: 'Income Management', roles: FINANCE_VIEW_ROLES },
  { slug: 'bank-accounts', page: 'banks', label: 'บัญชีธนาคาร', english: 'Bank Accounts', roles: FINANCE_VIEW_ROLES },
  { slug: 'asnaf-allocation', page: 'allocation', label: 'จัดสรรงบตามอัสนัฟ', english: 'Asnaf Budget Allocation', roles: FINANCE_VIEW_ROLES },
  { slug: 'transfers', page: 'movements', label: 'ฝาก ถอน โอน', english: 'Deposit, Withdrawal & Transfer', roles: FINANCE_VIEW_ROLES, group: 'treasurer' },
  { slug: 'disbursement-approval', page: 'approval', label: 'อนุมัติรอบเบิก', english: 'Disbursement Approval', roles: FINANCE_APPROVAL_ROLES, group: 'treasurer' },
  { slug: 'expenses', page: 'expenses', label: 'รายจ่ายและการช่วยเหลือ', english: 'Expenses & Assistance', roles: FINANCE_VIEW_ROLES },
  { slug: 'reports', page: 'reports', label: 'รายงานการเงินและประวัติธุรกรรม', english: 'Financial Reports & Transaction History', roles: FINANCE_VIEW_ROLES },
];

const LEGACY_PAGE: Record<string, FinancePageKey> = {
  reconciliation: 'banks',
  transactions: 'reports',
};

export function isFinanceSlug(value: string | undefined | null): value is FinanceSectionSlug {
  return FINANCE_SECTION_SLUGS.includes(value as FinanceSectionSlug);
}

export function financeSlugFromPath(path: string | null | undefined) {
  const parts = String(path || '').split('/').filter(Boolean);
  if (parts[0] !== 'finance') return null;
  const slug = parts[1] || 'dashboard';
  return isFinanceSlug(slug) ? slug : null;
}

export function financeMenuSlug(slug: string | null | undefined) {
  if (slug === 'reconciliation') return 'bank-accounts';
  if (slug === 'transactions') return 'reports';
  return slug || 'dashboard';
}

export function financePageFromSlug(slug: string | null | undefined): FinancePageKey {
  if (slug && LEGACY_PAGE[slug]) return LEGACY_PAGE[slug];
  return FINANCE_MENU.find((item) => item.slug === slug)?.page || 'overview';
}

export function financeSlugFromPage(page: FinancePageKey) {
  return FINANCE_MENU.find((item) => item.page === page)?.slug || 'dashboard';
}

export function financeBreadcrumb(path: string | null | undefined) {
  const slug = financeMenuSlug(financeSlugFromPath(path) || 'dashboard');
  const item = FINANCE_MENU.find((entry) => entry.slug === slug) || FINANCE_MENU[0];
  return `การเงินและบัญชี · ${item.label} (${item.english})`;
}
