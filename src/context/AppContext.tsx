'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  UserRole, 
  AssistanceApplication, 
  ApplicationStatus,
  AsnafCategory, 
  FundAccount, 
  FinancialTransaction, 
  AuditLogItem,
  BeneficiaryAssessment,
  BeneficiaryRegistryItem,
  RegistrationStatus,
  DashboardSeparatedStats,
  Toast,
  ToastType,
  SystemNotification,
  CreateNotificationInput,
  RegistryEditHistoryItem,
  FollowUpSummaryStats,
} from '@/types';
import { GlobalToastContainer } from '@/components/common/GlobalToastContainer';
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
  getAuthHeaders: (additionalHeaders?: Record<string, string>) => Record<string, string>;
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
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  // การแจ้งเตือนระบบ (Global Notifications)
  notifications: SystemNotification[];
  unreadNotificationsCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<boolean>;
  markAllNotificationsAsRead: () => Promise<boolean>;
  createNotification: (input: CreateNotificationInput) => Promise<SystemNotification | null>;
  // ทะเบียนผู้มีสิทธิ์รับซะกาต
  registerBeneficiaryProfile: (profileData: any) => Promise<string | null>;
  updateBeneficiaryRegistry: (beneficiaryId: string, profileData: any, editNotes?: string) => Promise<boolean>;
  getRegistryEditHistory: (beneficiaryId: string) => Promise<RegistryEditHistoryItem[]>;
  updateRegistryStatus: (beneficiaryId: string, status: RegistrationStatus, notes: string) => Promise<boolean>;
  updateRegistryChecklist: (beneficiaryId: string, checklist: any) => Promise<boolean>;
  // คำร้องขอความช่วยเหลือ
  createAssistanceRequest: (input: {
    beneficiaryId?: string;
    assessmentId?: string;
    nationalId?: string;
    memberId?: string;
    asnafCategory?: AsnafCategory;
    primaryGroupCode?: string;
    specificFundId?: string;
    specificFundCode?: string;
    specificFundName?: string;
    fiscalYear?: string;
    branchId?: string;
    branchName?: string;
    assistanceType: any;
    assistanceTypeId?: string;
    assistanceGroup?: 'core' | 'specific';
    assistanceTypeDetails?: string;
    urgencyLevel?: any;
    requestedAmount: number;
    hardshipReasons?: string;
    necessityDetails: string;
    notes?: string;
    coordinator?: any;
    certifier?: any;
    idempotencyKey?: string;
    documents?: any[];
  }) => Promise<{
    applicationId: string;
    applicationNo: string;
    appliedDate?: string;
    assistanceType?: string;
    status?: string;
    requestedAmount?: number;
    beneficiaryId?: string;
    raw?: any;
  } | null>;
  createApplication: (appData: any) => Promise<string | null>;
  updateApplication: (appId: string, appData: any) => Promise<boolean>;
  updateChecklist: (appId: string, checklist: any) => Promise<boolean>;
  updateApplicationStatus: (appId: string, newStatus: ApplicationStatus, notes: string) => Promise<void>;
  submitAssessment: (appId: string, assessment: BeneficiaryAssessment) => Promise<boolean>;
  approveApplication: (appId: string, approvedAmount: number, fundId?: string, notes?: string, specificFundId?: string) => Promise<boolean>;
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
  const [funds, setFunds] = useState<FundAccount[]>(MOCK_FUNDS);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [followUpStats, setFollowUpStats] = useState<FollowUpSummaryStats | null>(null);
  const [followUpBadgeCount, setFollowUpBadgeCount] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration?: number) => {
    const id = createToastId();
    // Newest toast on top (stack descending)
    setToasts((prev) => [{ id, type, message, duration }, ...prev.slice(0, 5)]);
    const autoDismissTime = duration ?? (type === 'error' ? 12000 : type === 'warning' ? 6000 : type === 'info' ? 5000 : 4000);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, autoDismissTime);
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

  const getAuthHeaders = useCallback((additionalHeaders: Record<string, string> = {}): Record<string, string> => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };
    if (token && token !== 'cookie-session') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (currentUser && currentUser.id && currentUser.id !== 'guest') {
      headers['x-actor-id'] = currentUser.id;
      headers['x-actor-role'] = currentUser.role;
    }
    return headers;
  }, [authToken, currentUser]);

  // Global Notification Operations
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=30', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setNotifications(json.data);
          setUnreadNotificationsCount(json.unreadCount ?? 0);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh notifications:', err);
    }
  }, [getAuthHeaders]);

  const markNotificationAsRead = useCallback(async (id: string): Promise<boolean> => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [getAuthHeaders]);

  const markAllNotificationsAsRead = useCallback(async (): Promise<boolean> => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadNotificationsCount(0);

    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [getAuthHeaders]);

  const createNotification = useCallback(async (input: CreateNotificationInput): Promise<SystemNotification | null> => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          await refreshNotifications();
          return json.data;
        }
      }
      return null;
    } catch (e) {
      console.warn('Failed to create notification:', e);
      return null;
    }
  }, [getAuthHeaders, refreshNotifications]);

  // Periodic Notification Polling (every 30 seconds)
  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  // Fetch real data from database via APIs
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      const authHeaders = getAuthHeaders();
      // 1. Assistance Applications from PostgreSQL (/api/assistance-requests) + fallback merge
      const [pgAppsRes, legacyAppRes] = await Promise.all([
        fetch('/api/assistance-requests?limit=100', { headers: authHeaders, credentials: 'include' }).catch(() => null),
        fetch('/api/beneficiaries', { headers: authHeaders, credentials: 'include' }).catch(() => null),
      ]);

      let pgApps: AssistanceApplication[] = [];
      if (pgAppsRes && pgAppsRes.ok) {
        const pgJson = await pgAppsRes.json().catch(() => ({}));
        const rawList = Array.isArray(pgJson.data)
          ? pgJson.data
          : Array.isArray(pgJson.items)
            ? pgJson.items
            : [];
        pgApps = rawList.map((item: any) => ({
          ...item,
          fullName: item.fullName || item.beneficiary?.fullName || '',
          nationalIdMasked: item.nationalIdMasked || item.beneficiary?.identityNumberMasked || '',
          phone: item.phone || item.beneficiary?.phone || '',
          address: item.address || '',
          province: item.province || '',
          district: item.district || '',
          community: item.community || '',
          householdMembers: Array.isArray(item.householdMembers) ? item.householdMembers : [],
          documents: Array.isArray(item.documents) ? item.documents : [],
          statusHistory: Array.isArray(item.statusHistory)
            ? item.statusHistory
            : Array.isArray(item.history)
              ? item.history.map((h: any) => ({
                  status: h.status,
                  timestamp: h.timestamp,
                  changedBy: h.changedByName || h.changedBy || 'เจ้าหน้าที่',
                  notes: h.notes || '',
                }))
              : [],
        }));
      }

      let legacyApps: AssistanceApplication[] = [];
      if (legacyAppRes && legacyAppRes.ok) {
        const appJson = await legacyAppRes.json().catch(() => ({}));
        if (appJson.success && Array.isArray(appJson.data)) {
          legacyApps = appJson.data;
        }
      }

      if (pgApps.length > 0 || legacyApps.length > 0) {
        const seenIds = new Set(pgApps.map((a) => a.id));
        const seenAppNos = new Set(pgApps.map((a) => a.applicationNo));
        const merged = [
          ...pgApps,
          ...legacyApps.filter((a) => !seenIds.has(a.id) && !seenAppNos.has(a.applicationNo)),
        ];
        setApplications(merged);
      }

      // 1.1 Beneficiary Registries from real database
      const regRes = await fetch('/api/registry', { headers: authHeaders, credentials: 'include' });
      if (regRes.ok) {
        const regJson = await regRes.json();
        if (regJson.success) {
          setRegistries(regJson.data);
        }
      }

      // 1.2 Separated Dashboard Stats from real database
      const statsRes = await fetch('/api/dashboard/stats', { headers: authHeaders, credentials: 'include' });
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
        if (fundsJson.success && Array.isArray(fundsJson.data) && fundsJson.data.length > 0) {
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

      // 6. Global Notifications & Unread Badge Count
      await refreshNotifications();
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
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          input: {
            titlePrefix: appData.titlePrefix ?? 'นาย',
            firstName: appData.firstName,
            lastName: appData.lastName,
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
      await createNotification({
        type: 'success',
        module: 'beneficiary',
        title: 'ขึ้นทะเบียนคำร้องขอความช่วยเหลือสำเร็จ',
        message: `ลงทะเบียนคำร้อง ${json.data.applicationNo} สำหรับ ${appData.fullName || appData.firstName || 'ผู้ขอรับความช่วยเหลือ'} เรียบร้อยแล้ว`,
        referenceType: 'application',
        referenceId: json.data.applicationNo,
        actionUrl: '/assistance-requests',
        recipientRole: 'officer',
      });
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
      await createNotification({
        type: 'info',
        module: 'approval',
        title: 'มีคำร้องใหม่รอการพิจารณาอนุมัติ',
        message: `คำร้องรหัส ${appId} ผ่านการประเมินสิทธิ์แล้ว รอการพิจารณาอนุมัติจากคณะกรรมการ`,
        referenceType: 'application',
        referenceId: appId,
        actionUrl: '/approvals',
        recipientRole: 'approver',
      });
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
    fundId?: string,
    notes?: string,
    specificFundId?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/beneficiaries/${appId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedAmount,
          fundId,
          notes,
          specificFundId,
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

      // Immediate local state update for zero-latency UI transition (Phase 4)
      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId || a.applicationNo === appId
            ? {
                ...a,
                status: 'wait_disbursement',
                approvalStatus: 'approved',
                paymentStatus: (a as any).deliveryMethod === 'in_kind' ? 'not_applicable' : 'wait_disbursement',
                approvedAmount,
                approvedFundId: fundId,
                approvedSpecificFundId: specificFundId,
                approvedById: currentUser.id,
                approvedByName: currentUser.name,
                approvedDate: new Date().toLocaleDateString('th-TH'),
                approvalNotes: notes || 'อนุมัติวงเงินช่วยเหลือ',
              }
            : a
        )
      );

      showToast(`อนุมัติคำร้องสำเร็จ วงเงิน ฿${approvedAmount.toLocaleString()} บาท (กันยอดผูกพัน)`, 'success');
      await createNotification({
        type: 'success',
        module: 'disbursement',
        title: 'คำร้องผ่านการอนุมัติ รอเบิกจ่ายเงิน',
        message: `คำร้องรหัส ${appId} ผ่านการพิจารณาอนุมัติวงเงิน ฿${approvedAmount.toLocaleString()} บาท พร้อมส่งต่อฝ่ายการเงินเพื่อเบิกจ่าย`,
        referenceType: 'application',
        referenceId: appId,
        actionUrl: '/assistance',
        recipientRole: 'finance',
      });
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

      // Immediate local state update for zero-latency UI transition
      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId || a.applicationNo === appId
            ? {
                ...a,
                status: 'rejected',
                approvalStatus: 'rejected',
                completionStatus: 'terminated',
                rejectionReason: notes,
                approvalNotes: notes,
              }
            : a
        )
      );

      showToast('บันทึกการไม่อนุมัติคำร้องเข้าสู่ฐานข้อมูลเรียบร้อย', 'info');
      await createNotification({
        type: 'error',
        module: 'approval',
        title: 'คำร้องไม่ผ่านการอนุมัติ',
        message: `คำร้องรหัส ${appId} ได้รับมติไม่อนุมัติ: ${notes || '-'}`,
        referenceType: 'application',
        referenceId: appId,
        actionUrl: '/assistance-requests',
        recipientRole: 'officer',
      });
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const returnApplication = async (appId: string, notes: string): Promise<boolean> => {
    try {
      let res = await fetch(`/api/approvals/${appId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          targetStatus: 'need_info',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      if (!res.ok) {
        // Fallback to beneficiaries status route
        res = await fetch(`/api/beneficiaries/${appId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'need_info',
            notes: notes || 'ส่งกลับขอข้อมูลเพิ่มเติม',
            actor: {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            },
          }),
        });
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        showToast(json.error || 'ไม่สามารถส่งกลับคำร้องได้', 'error');
        return false;
      }

      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId || a.applicationNo === appId
            ? {
                ...a,
                status: 'need_info',
                approvalNotes: notes,
              }
            : a
        )
      );

      showToast('ส่งกลับคำร้องเพื่อขอข้อมูลเพิ่มเติมเรียบร้อยแล้ว', 'info');
      await createNotification({
        type: 'warning',
        module: 'approval',
        title: 'คำร้องถูกส่งกลับเพื่อแก้ไขข้อมูล',
        message: `คำร้องรหัส ${appId} ถูกส่งกลับ: ${notes || 'ขอข้อมูลเพิ่มเติม'}`,
        referenceType: 'application',
        referenceId: appId,
        actionUrl: '/assistance-requests',
        recipientRole: 'officer',
      });
      await refreshData();
      return true;
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการส่งกลับคำร้อง', 'error');
      return false;
    }
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
      await createNotification({
        type: 'success',
        module: 'disbursement',
        title: 'ดำเนินการเบิกจ่ายเงินช่วยเหลือสำเร็จ',
        message: `เบิกจ่ายเงินช่วยเหลือคำร้อง ${appId} จำนวน ฿${amount.toLocaleString()} บาท เรียบร้อยแล้ว (เลขอ้างอิง: ${paymentRef || '-'})`,
        referenceType: 'application',
        referenceId: appId,
        actionUrl: '/assistance',
        recipientRole: 'finance',
      });
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
      receivedDate?: string;
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
      const cleanId = String(profileData.nationalId || '').replace(/[^0-9]/g, '');
      if (cleanId.length === 13) {
        const dupRes = await fetch(
          `/api/registry/check-duplicate?nationalId=${encodeURIComponent(cleanId)}`,
          { headers: getAuthHeaders(), credentials: 'include' },
        );
        const dupJson = await dupRes.json().catch(() => ({}));
        const existingHit = dupJson?.data?.existingMember;
        if (dupRes.ok && dupJson.success && dupJson.data?.duplicate && existingHit) {
          const existingCode = existingHit.memberCode || existingHit.id;
          showToast(
            `เลขประจำตัวประชาชนนี้ขึ้นทะเบียนเป็นสมาชิกอยู่แล้ว (รหัสสมาชิก ${existingCode} - ${existingHit.fullName || ''}) กรุณาเปิดข้อมูลสมาชิกเดิมแทนการสร้างซ้ำ`,
            'error',
          );
          return null;
        }
      }

      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          input: profileData,
          actor: {
            id: currentUser?.id || 'officer-1',
            name: currentUser?.name || 'เจ้าหน้าที่ผู้รับผิดชอบ',
            role: currentUser?.role || 'officer',
          },
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const conflictHint =
          res.status === 409
            ? json.error || 'เลขประจำตัวประชาชนนี้ขึ้นทะเบียนเป็นสมาชิกอยู่แล้ว กรุณาเปิดข้อมูลสมาชิกเดิมแทนการสร้างซ้ำ'
            : json.error || 'เกิดข้อผิดพลาดในการขึ้นทะเบียน';
        showToast(conflictHint, 'error');
        return null;
      }

      const assignedMemberCode = json.data?.memberCode || json.data?.registrationNo;
      showToast(`ขึ้นทะเบียนสมาชิกผู้มีสิทธิ์รับซะกาตสำเร็จ: รหัสสมาชิก ${assignedMemberCode}`, 'success');
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
        headers: getAuthHeaders(),
        credentials: 'include',
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

      showToast(json.message || 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว', 'success');
      await createNotification({
        type: 'success',
        module: 'beneficiary',
        title: 'แก้ไขข้อมูลทะเบียนผู้มีสิทธิ์สำเร็จ',
        message: `ปรับปรุงข้อมูลทะเบียนผู้มีสิทธิ์รหัส ${beneficiaryId} เรียบร้อยแล้ว`,
        referenceType: 'beneficiary',
        referenceId: beneficiaryId,
        actionUrl: '/beneficiaries',
        recipientRole: 'officer',
      });
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
      const res = await fetch(`/api/registry/${beneficiaryId}/history`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
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
        headers: getAuthHeaders(),
        credentials: 'include',
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
        headers: getAuthHeaders(),
        credentials: 'include',
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
    assessmentId?: string;
    nationalId?: string;
    memberId?: string;
    asnafCategory?: AsnafCategory;
    primaryGroupCode?: string;
    specificFundId?: string;
    specificFundCode?: string;
    specificFundName?: string;
    fiscalYear?: string;
    branchId?: string;
    branchName?: string;
    assistanceType: any;
    assistanceTypeId?: string;
    assistanceGroup?: 'core' | 'specific';
    assistanceTypeDetails?: string;
    urgencyLevel?: any;
    requestedAmount: number;
    hardshipReasons?: string;
    necessityDetails: string;
    notes?: string;
    coordinator?: any;
    certifier?: any;
    idempotencyKey?: string;
    documents?: any[];
  }): Promise<{
    applicationId: string;
    applicationNo: string;
    appliedDate?: string;
    assistanceType?: string;
    status?: string;
    requestedAmount?: number;
    beneficiaryId?: string;
    raw?: any;
  } | null> => {
    try {
      const res = await fetch('/api/assistance-requests', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
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
      await createNotification({
        type: 'success',
        module: 'request',
        title: 'ยื่นคำร้องขอความช่วยเหลือสำเร็จ',
        message: `ยื่นคำร้องเลขที่ ${json.data.applicationNo} วงเงินที่ขอ ฿${Number(json.data.requestedAmount || 0).toLocaleString()} บาท เรียบร้อยแล้ว`,
        referenceType: 'application',
        referenceId: json.data.applicationNo,
        actionUrl: '/assistance-requests',
        recipientRole: 'officer',
      });
      await createNotification({
        type: 'info',
        module: 'assessment',
        title: 'มีคำร้องใหม่รอตรวจสอบและลงพื้นที่',
        message: `คำร้องเลขที่ ${json.data.applicationNo} รอเจ้าหน้าที่ตรวจสอบเอกสารและประเมินสิทธิ์`,
        referenceType: 'application',
        referenceId: json.data.applicationNo,
        actionUrl: '/assessment',
        recipientRole: 'officer',
      });
      await refreshData();
      return {
        applicationId: json.data.applicationId || json.data.id,
        applicationNo: json.data.applicationNo,
        appliedDate: json.data.appliedDate,
        assistanceType: json.data.assistanceType,
        status: json.data.status,
        requestedAmount: json.data.requestedAmount,
        beneficiaryId: json.data.beneficiaryId,
        raw: json.data,
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
        getAuthHeaders,
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
        notifications,
        unreadNotificationsCount,
        refreshNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        createNotification,
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

      {/* Global Toast Notification Layer (Fixed Top-Right) */}
      <GlobalToastContainer />
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
