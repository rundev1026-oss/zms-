'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  UserRole, 
  AssistanceApplication, 
  ApplicationStatus, 
  FundAccount, 
  FinancialTransaction, 
  AuditLogItem,
  BeneficiaryAssessment,
  BeneficiaryRegistryItem,
  RegistrationStatus,
  DashboardSeparatedStats,
  Toast,
  RegistryEditHistoryItem,
  FollowUpSummaryStats,
} from '@/types';
import { 
  MOCK_USERS, 
  MOCK_FUNDS, 
  MOCK_TRANSACTIONS, 
  MOCK_AUDIT_LOGS 
} from '@/data/mockData';

export type { Toast };

let toastCounter = 0;

export const createToastId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  toastCounter = (toastCounter + 1) % 1000000;
  return `${Date.now()}-${toastCounter}-${Math.random().toString(36).slice(2, 9)}`;
};

export const GUEST_USER: User = {
  id: 'guest',
  name: 'ผู้เยี่ยมชมทั่วไป',
  email: '',
  role: 'public',
  roleTitleTh: 'บุคคลทั่วไป / ผู้เยี่ยมชม',
  phone: '',
  branch: 'ส่วนกลาง',
  status: 'active',
};

interface AppContextType {
  currentUser: User;
  isAuthenticated: boolean;
  authToken: string | null;
  isAuthLoading: boolean;
  loginUser: (token: string, user: User) => void;
  logoutUser: () => Promise<boolean>;
  checkSession: () => Promise<void>;
  switchUserRole: (role: UserRole) => void;
  applications: AssistanceApplication[];
  registries: BeneficiaryRegistryItem[];
  dashboardStats: DashboardSeparatedStats | null;
  funds: FundAccount[];
  transactions: FinancialTransaction[];
  auditLogs: AuditLogItem[];
  toasts: Toast[];
  isLoading: boolean;
  followUpStats: FollowUpSummaryStats | null;
  followUpBadgeCount: number;
  refreshFollowUpData: () => Promise<void>;
  refreshData: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  // ทะเบียนผู้มีสิทธิ์รับซะกาต
  registerBeneficiaryProfile: (profileData: any) => Promise<string | null>;
  updateBeneficiaryRegistry: (beneficiaryId: string, profileData: any, editNotes?: string) => Promise<boolean>;
  getRegistryEditHistory: (beneficiaryId: string) => Promise<RegistryEditHistoryItem[]>;
  updateRegistryStatus: (beneficiaryId: string, status: RegistrationStatus, notes: string) => Promise<boolean>;
  updateRegistryChecklist: (beneficiaryId: string, checklist: any) => Promise<boolean>;
  // คำร้องขอความช่วยเหลือ
  createAssistanceRequest: (input: {
    beneficiaryId?: string;
    nationalId?: string;
    memberId?: string;
    assistanceType: any;
    assistanceTypeId?: string;
    assistanceGroup?: 'core' | 'specific';
    assistanceTypeDetails?: string;
    urgencyLevel?: any;
    requestedAmount: number;
    necessityDetails: string;
    notes?: string;
    coordinator?: any;
    certifier?: any;
    documents?: any[];
  }) => Promise<{ applicationId: string; applicationNo: string } | null>;
  createApplication: (appData: any) => Promise<string | null>;
  updateApplication: (appId: string, appData: any) => Promise<boolean>;
  updateChecklist: (appId: string, checklist: any) => Promise<boolean>;
  updateApplicationStatus: (appId: string, newStatus: ApplicationStatus, notes: string) => Promise<void>;
  submitAssessment: (appId: string, assessment: BeneficiaryAssessment) => Promise<boolean>;
  approveApplication: (appId: string, approvedAmount: number, fundId: string, notes: string) => Promise<boolean>;
  rejectApplication: (appId: string, notes: string) => Promise<boolean>;
  returnApplication: (appId: string, notes: string) => Promise<boolean>;
  executeDisbursement: (appId: string, amount: number, paymentRef: string, proofUrl: string, notes: string) => Promise<boolean>;
  recordIncome: (
    fundId: string,
    category: string,
    amount: number,
    payer: string,
    method: 'promptpay_qr' | 'bank_transfer' | 'cash',
    refNo: string,
    notes?: string,
    extra?: {
      bankAccountId?: string;
      moneyType?: 'zakat' | 'sadaqah' | 'operational_admin';
      zakatYear?: string;
      isAnonymous?: boolean;
      donorName?: string;
      usageRestriction?: string;
      receiptNo?: string;
    }
  ) => Promise<boolean>;
  recordExpense: (
    fundId: string,
    category: string,
    amount: number,
    payee: string,
    notes: string,
    refNo?: string,
    extra?: {
      bankAccountId?: string;
      asnafCategory?: string;
      subFundCategory?: string;
      adminCategoryCode?: string;
      beneficiaryId?: string;
      applicationId?: string;
    }
  ) => Promise<boolean>;
  reverseTransaction: (transactionId: string, reason: string) => Promise<boolean>;
  attemptDeleteTransaction: (transactionId: string) => Promise<{ success: boolean; message: string }>;
  reconcileFunds: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [applications, setApplications] = useState<AssistanceApplication[]>([]);
  const [registries, setRegistries] = useState<BeneficiaryRegistryItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardSeparatedStats | null>(null);
  const [funds, setFunds] = useState<FundAccount[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [followUpStats, setFollowUpStats] = useState<FollowUpSummaryStats | null>(null);
  const [followUpBadgeCount, setFollowUpBadgeCount] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = createToastId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Check existing session from cookie or localStorage
  const checkSession = useCallback(async () => {
    try {
      setIsAuthLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/me', { headers, credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCurrentUser(json.data);
          setIsAuthenticated(true);
          setAuthToken(token || 'cookie-session');
          return;
        }
      }

      // No active valid session
      setIsAuthenticated(false);
      setAuthToken(null);
      setCurrentUser(GUEST_USER);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zms_auth_token');
      }
    } catch (err) {
      setIsAuthenticated(false);
      setAuthToken(null);
      setCurrentUser(GUEST_USER);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const loginUser = (token: string, user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zms_auth_token', token);
    }
    setAuthToken(token);
    setCurrentUser(user);
    setIsAuthenticated(true);
    refreshData();
  };

  const logoutUser = async (): Promise<boolean> => {
    try {
      const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'การออกจากระบบล้มเหลวที่เซิร์ฟเวอร์');
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('zms_auth_token');
      }
      setAuthToken(null);
      setIsAuthenticated(false);
      setCurrentUser(GUEST_USER);
      showToast('ออกจากระบบเรียบร้อยแล้ว', 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
      return false;
    }
  };

  // Fetch real data from database via APIs
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      // 1. Applications from real database
      const appRes = await fetch('/api/beneficiaries');
      if (appRes.ok) {
        const appJson = await appRes.json();
        if (appJson.success) {
          setApplications(appJson.data);
        }
      }

      // 1.1 Beneficiary Registries from real database
      const regRes = await fetch('/api/registry');
      if (regRes.ok) {
        const regJson = await regRes.json();
        if (regJson.success) {
          setRegistries(regJson.data);
        }
      }

      // 1.2 Separated Dashboard Stats from real database
      const statsRes = await fetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson.success) {
          setDashboardStats(statsJson.data);
        }
      }

      // 2. Funds from real database
      const fundsRes = await fetch('/api/finance/funds');
      if (fundsRes.ok) {
        const fundsJson = await fundsRes.json();
        if (fundsJson.success && Array.isArray(fundsJson.data)) {
          setFunds(fundsJson.data);
        }
      }

      // 3. Transactions from real database
      const txnRes = await fetch('/api/finance/transactions');
      if (txnRes.ok) {
        const txnJson = await txnRes.json();
        if (txnJson.success) {
          setTransactions(txnJson.data);
        }
      }

      // 4. Audit logs from real database
      const logsRes = await fetch('/api/audit-logs');
      if (logsRes.ok) {
        const logsJson = await logsRes.json();
        if (logsJson.success && logsJson.data.length > 0) {
          setAuditLogs(logsJson.data);
        }
      }

      // 5. Follow-up summary stats & badge count from real database
      const fupRes = await fetch('/api/follow-ups');
      if (fupRes.ok) {
        const fupJson = await fupRes.json();
        if (fupJson.success && fupJson.stats) {
          setFollowUpStats(fupJson.stats);
          setFollowUpBadgeCount(fupJson.stats.navbarBadgeCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch from real database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
    refreshData();
  }, [checkSession, refreshData]);

  const switchUserRole = (role: UserRole) => {
    if (role === 'public') {
      setCurrentUser(GUEST_USER);
      setIsAuthenticated(false);
      showToast('สลับเป็นโหมดบุคคลทั่วไป (ยังไม่ได้เข้าสู่ระบบ)', 'info');
      return;
    }
    const found = MOCK_USERS.find((u) => u.role === role);
    if (found) {
      setCurrentUser(found);
      setIsAuthenticated(true);
      showToast(`สลับบทบาทเป็น: ${found.roleTitleTh} (${found.name})`, 'info');
    }
  };

  /**
   * 1. Register Beneficiary (Real Database with Duplicate Check)
   */
  /**
   * 1. Register Beneficiary (Real Database with Duplicate Check & Full Sections A-I)
   */
  const createApplication = async (appData: any): Promise<string | null> => {
    try {
      const res = await fetch('/api/beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            titlePrefix: appData.titlePrefix || 'นาย',
            fullName: appData.fullName,
            nationalId: appData.nationalId || '1100200334455',
            birthDate: appData.birthDate,
            age: appData.age,
            phone: appData.phone,
            email: appData.email,
            occupation: appData.occupation,
            maritalStatus: appData.maritalStatus,
            address: appData.address || '',
            province: appData.province || 'กรุงเทพมหานคร',
            district: appData.district || 'หนองจอก',
            subdistrict: appData.subdistrict || '',
            postcode: appData.postcode || '',
            community: appData.community || 'ชุมชนท้องถิ่น',
            branchId: appData.branchId || currentUser.branchId || 'br-hq',
            branchName: appData.branchName || currentUser.branch || 'สำนักงานใหญ่ กรุงเทพมหานคร',
            housingType: appData.housingType || 'own',
            housingCondition: appData.housingCondition || 'poor',
            housingNotes: appData.housingNotes || '',
            landTitleType: appData.landTitleType,
            landTitleNotes: appData.landTitleNotes,
            hardshipReasons: appData.hardshipReasons,
            asnafCategory: appData.asnafCategory || 'miskin',
            urgencyLevel: appData.urgencyLevel || 'normal',
            debtAmount: appData.debtAmount || 0,
            debtPurpose: appData.debtPurpose || '',
            assistanceType: appData.assistanceType || 'cash',
            assistanceTypeDetails: appData.assistanceTypeDetails || '',
            requestedAmount: Number(appData.requestedAmount || 10000),
            necessityDetails: appData.necessityDetails || '',
            pastAssistance: appData.pastAssistance || [],
            monthlyIncome: appData.monthlyIncome || 0,
            monthlyExpense: appData.monthlyExpense || 0,
            incomeBreakdown: appData.incomeBreakdown,
            expenseBreakdown: appData.expenseBreakdown,
            householdMembers: appData.householdMembers || [],
            familySituationSummary: appData.familySituationSummary || '',
            urgentNeeds: appData.urgentNeeds || '',
            dependentBurdens: appData.dependentBurdens || '',
            coordinator: appData.coordinator,
            certifier: appData.certifier,
            documents: appData.documents || [],
            checklist: appData.checklist,
            status: appData.status || 'submitted',
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'เกิดข้อผิดพลาดในการลงทะเบียน', 'error');
        return null;
      }

      showToast(`ลงทะเบียนคำร้องเข้าสู่ฐานข้อมูลสำเร็จ: ${json.data.applicationNo}`, 'success');
      await refreshData();
      return json.data.applicationId;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล', 'error');
      return null;
    }
  };

  /**
   * 1.1 Update Existing Beneficiary Application (Sections A - I)
   */
  const updateApplication = async (appId: string, appData: any): Promise<boolean> => {
    try {
      const res = await fetch(`/api/beneficiaries/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: appData,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถแก้ไขข้อมูลคำร้องได้', 'error');
        return false;
      }

      showToast('แก้ไขและบันทึกข้อมูลคำร้องลงฐานข้อมูลเรียบร้อย', 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      return false;
    }
  };

  /**
   * 1.2 Update Evaluator Checklist
   */
  const updateChecklist = async (appId: string, checklist: any): Promise<boolean> => {
    try {
      const res = await fetch(`/api/beneficiaries/${appId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึก Checklist ได้', 'error');
        return false;
      }

      showToast('บันทึกผลการตรวจสอบหลักเกณฑ์ (Checklist) ลงฐานข้อมูลเรียบร้อย', 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก Checklist', 'error');
      return false;
    }
  };

  /**
   * 2. Submit Assessment (Real Database)
   */
  const submitAssessment = async (appId: string, assessment: BeneficiaryAssessment): Promise<boolean> => {
    try {
      const res = await fetch(`/api/beneficiaries/${appId}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึกผลการประเมินได้', 'error');
        return false;
      }

      showToast('บันทึกผลการประเมินลงฐานข้อมูลและส่งต่อคณะกรรมการอนุมัติเรียบร้อย', 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  /**
   * 3. Approve Application (Real Database with Segregation of Duties & Solvency Check)
   */
  const approveApplication = async (
    appId: string,
    approvedAmount: number,
    fundId: string,
    notes: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/beneficiaries/${appId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedAmount,
          fundId,
          notes,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถอนุมัติคำร้องได้', 'error');
        return false;
      }

      showToast(`อนุมัติคำร้องสำเร็จ วงเงิน ฿${approvedAmount.toLocaleString()} บาท (กันยอดผูกพัน)`, 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  /**
   * 4. Reject Application (Real Database)
   */
  const rejectApplication = async (appId: string, notes: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/beneficiaries/${appId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: notes,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถปฏิเสธคำร้องได้', 'error');
        return false;
      }

      showToast('บันทึกการไม่อนุมัติคำร้องเข้าสู่ฐานข้อมูลเรียบร้อย', 'info');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const returnApplication = async (appId: string, notes: string): Promise<boolean> => {
    await updateApplicationStatus(appId, 'need_info', notes || 'ขอข้อมูลเพิ่มเติม');
    return true;
  };

  const updateApplicationStatus = async (appId: string, newStatus: ApplicationStatus, notes: string) => {
    try {
      const res = await fetch(`/api/beneficiaries/${appId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: notes || `เปลี่ยนสถานะเป็น ${newStatus}`,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || `ไม่สามารถเปลี่ยนสถานะเป็น ${newStatus} ได้`, 'error');
        return;
      }

      showToast(`อัปเดตสถานะเป็น: ${newStatus}`, 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
    }
  };

  /**
   * 5. Execute Disbursement (Real Database with Segregation of Duties)
   */
  const executeDisbursement = async (
    appId: string,
    amount: number,
    paymentRef: string,
    proofUrl: string,
    notes: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/beneficiaries/${appId}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentRef,
          proofUrl,
          notes,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึกการจ่ายเงินได้', 'error');
        return false;
      }

      showToast(`ฝ่ายการเงินโอนเงินสำเร็จ ฿${amount.toLocaleString()} บาท บันทึก Transaction เรียบร้อย`, 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  /**
   * 6. Record Income (Real Database with Duplicate Check & Solvency Update)
   */
  const recordIncome = async (
    fundId: string,
    category: string,
    amount: number,
    payer: string,
    method: 'promptpay_qr' | 'bank_transfer' | 'cash',
    refNo: string,
    notes?: string,
    extra?: {
      bankAccountId?: string;
      moneyType?: 'zakat' | 'sadaqah' | 'operational_admin';
      zakatYear?: string;
      isAnonymous?: boolean;
      donorName?: string;
      usageRestriction?: string;
      receiptNo?: string;
    }
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/finance/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            fundId,
            category,
            amount: Number(amount),
            payer,
            paymentMethod: method,
            referenceNo: refNo,
            notes,
            ...(extra || {}),
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึกรายรับได้', 'error');
        return false;
      }

      showToast(`บันทึกรับเงิน ฿${amount.toLocaleString()} บาท เข้าสู่ฐานข้อมูลสำเร็จ (${json.data.transactionNo})`, 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  /**
   * 7. Record Operating Expense (Real Database with Shariah Purpose & Solvency Checks)
   */
  const recordExpense = async (
    fundId: string,
    category: string,
    amount: number,
    payee: string,
    notes: string,
    refNo?: string,
    extra?: {
      bankAccountId?: string;
      asnafCategory?: string;
      subFundCategory?: string;
      adminCategoryCode?: string;
      beneficiaryId?: string;
      applicationId?: string;
    }
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            fundId,
            category,
            amount: Number(amount),
            payee,
            referenceNo: refNo,
            notes,
            ...(extra || {}),
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึกรายจ่ายได้', 'error');
        return false;
      }

      showToast(`บันทึกรายจ่าย ฿${amount.toLocaleString()} บาท สำเร็จ (${json.data.transactionNo})`, 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  /**
   * 8. Reversal Entry (Reverses a Transaction with Reason & Audit Trail)
   */
  const reverseTransaction = async (transactionId: string, reason: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/finance/transactions/${transactionId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถกลับรายการได้', 'error');
        return false;
      }

      showToast(`กลับรายการสำเร็จ! บันทึกรายการปรับปรุงเลขที่ ${json.data.reversalTransactionNo}`, 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  /**
   * 9. Attempt Direct Deletion (Enforcing Immutable Accounting Policy)
   */
  const attemptDeleteTransaction = async (transactionId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/finance/transactions/${transactionId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'ไม่อนุญาตให้ลบรายการบัญชีโดยตรง', 'error');
        return { success: false, message: json.error };
      }
      return { success: true, message: 'ลบสำเร็จ' };
    } catch (err: any) {
      showToast(err.message, 'error');
      return { success: false, message: err.message };
    }
  };

  /**
   * 10. Reconcile Fund Balances
   */
  const reconcileFunds = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/finance/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconcile' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast('ปรับเทียบยอดคงเหลือทุกกองทุนกับสมุดรายวันเรียบร้อย (Reconciled)', 'success');
        await refreshData();
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  /**
   * 11. Register Beneficiary Profile (Independent Registry, DOES NOT create assistance request)
   */
  const registerBeneficiaryProfile = async (profileData: any): Promise<string | null> => {
    try {
      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: profileData,
          actor: {
            id: currentUser?.id || 'officer-1',
            name: currentUser?.name || 'เจ้าหน้าที่ผู้รับผิดชอบ',
            role: currentUser?.role || 'officer',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'เกิดข้อผิดพลาดในการขึ้นทะเบียน', 'error');
        return null;
      }

      showToast(`ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตสำเร็จ: เลขทะเบียน ${json.data.registrationNo}`, 'success');
      await refreshData();
      return json.data.beneficiaryId;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล', 'error');
      return null;
    }
  };

  /**
   * 11.1 Update Beneficiary Registry Details (9 sections, Google Maps coordinates, audit diffs)
   */
  const updateBeneficiaryRegistry = async (
    beneficiaryId: string,
    profileData: any,
    editNotes?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/registry/${beneficiaryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: profileData,
          notes: editNotes,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            nationalId: (currentUser as any).nationalId,
            beneficiaryId: (currentUser as any).beneficiaryId,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึกการแก้ไขข้อมูลทะเบียนได้', 'error');
        return false;
      }

      showToast('บันทึกการเปลี่ยนแปลงข้อมูลทะเบียนลงฐานข้อมูลสำเร็จ', 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      return false;
    }
  };

  /**
   * 11.2 Get Registry Edit History
   */
  const getRegistryEditHistory = async (beneficiaryId: string): Promise<RegistryEditHistoryItem[]> => {
    try {
      const res = await fetch(`/api/registry/${beneficiaryId}/history`);
      const json = await res.json();
      if (res.ok && json.success) {
        return json.data || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching edit history:', err);
      return [];
    }
  };

  /**
   * 12. Update Registration Status (8 statuses with audit trail, DOES NOT affect assistance requests)
   */
  const updateRegistryStatus = async (
    beneficiaryId: string,
    status: RegistrationStatus,
    notes: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/registry/${beneficiaryId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: notes || `เปลี่ยนสถานะทะเบียนเป็น ${status}`,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถเปลี่ยนสถานะทะเบียนได้', 'error');
        return false;
      }

      showToast(`อัปเดตสถานะทะเบียนสำเร็จ: ${json.data.registrationStatus}`, 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะทะเบียน', 'error');
      return false;
    }
  };

  /**
   * 13. Update Registry Evaluator Checklist
   */
  const updateRegistryChecklist = async (
    beneficiaryId: string,
    checklist: any
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/registry/${beneficiaryId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึกเกณฑ์การพิจารณาได้', 'error');
        return false;
      }

      showToast('บันทึกผลการตรวจสอบหลักเกณฑ์ผู้มีสิทธิ์สำเร็จ', 'success');
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกเกณฑ์', 'error');
      return false;
    }
  };

  /**
   * 14. Create Assistance Request (Links to existing Beneficiary, DOES NOT alter registry qualification)
   */
  const createAssistanceRequest = async (input: {
    beneficiaryId?: string;
    nationalId?: string;
    memberId?: string;
    assistanceType: any;
    assistanceTypeId?: string;
    assistanceGroup?: 'core' | 'specific';
    assistanceTypeDetails?: string;
    urgencyLevel?: any;
    requestedAmount: number;
    necessityDetails: string;
    notes?: string;
    coordinator?: any;
    certifier?: any;
    documents?: any[];
  }): Promise<{ applicationId: string; applicationNo: string } | null> => {
    try {
      const res = await fetch('/api/assistance-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          memberId: input.memberId || (currentUser.role === 'member' ? currentUser.id : undefined),
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            nationalId: currentUser.nationalId,
            beneficiaryId: currentUser.beneficiaryId,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถยื่นคำร้องขอความช่วยเหลือได้', 'error');
        return null;
      }

      showToast(`ยื่นคำร้องขอความช่วยเหลือสำเร็จ: เลขคำร้อง ${json.data.applicationNo}`, 'success');
      await refreshData();
      return {
        applicationId: json.data.applicationId,
        applicationNo: json.data.applicationNo,
      };
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการยื่นคำร้อง', 'error');
      return null;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        authToken,
        isAuthLoading,
        loginUser,
        logoutUser,
        checkSession,
        switchUserRole,
        applications,
        registries,
        dashboardStats,
        funds,
        transactions,
        auditLogs,
        toasts,
        isLoading,
        followUpStats,
        followUpBadgeCount,
        refreshFollowUpData: refreshData,
        refreshData,
        showToast,
        removeToast,
        registerBeneficiaryProfile,
        updateBeneficiaryRegistry,
        getRegistryEditHistory,
        updateRegistryStatus,
        updateRegistryChecklist,
        createAssistanceRequest,
        createApplication,
        updateApplication,
        updateChecklist,
        updateApplicationStatus,
        submitAssessment,
        approveApplication,
        rejectApplication,
        returnApplication,
        executeDisbursement,
        recordIncome,
        recordExpense,
        reverseTransaction,
        attemptDeleteTransaction,
        reconcileFunds,
      }}
    >
      {children}

      {/* Global Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-sm font-medium transition-all duration-300 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/50 backdrop-blur-md'
                : toast.type === 'error'
                ? 'bg-rose-900/95 text-rose-100 border-rose-500/50 backdrop-blur-md'
                : 'bg-slate-900/95 text-slate-100 border-slate-700/50 backdrop-blur-md'
            }`}
          >
            <span className="text-lg">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <div className="flex-1">{toast.message}</div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-xs opacity-60 hover:opacity-100 transition-opacity p-1 ml-1 rounded hover:bg-white/10"
              aria-label="ปิดการแจ้งเตือน"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
