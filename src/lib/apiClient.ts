/**
 * Enterprise API Client for Next.js Frontend
 * Connects Next.js to NestJS Backend via REST API
 * Handles:
 * - JWT Access Token memory cache & local fallback
 * - HttpOnly Refresh Token automatic rotation on 401
 * - CSRF Header injection (x-zms-csrf: 1)
 * - Credential inclusion for secure cross-site cookies
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

let memoryAccessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

export interface ApiUserRole {
  code: string;
  name: string;
}

export interface ApiUserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: ApiUserRole[];
  permissions: string[];
  mfaEnabled: boolean;
}

export function mapApiUserToNextUser(apiUser: ApiUserProfile): any {
  const primaryRole = apiUser.roles[0]?.code || 'PUBLIC';
  const roleCode = primaryRole.toLowerCase();

  let role: string = 'public';
  if (primaryRole === 'SUPER_ADMIN') role = 'super_admin';
  else if (primaryRole === 'ADMIN') role = 'executive';
  else if (primaryRole === 'ASSISTANCE_OFFICER') role = 'officer';
  else if (primaryRole === 'FINANCE_OFFICER' || primaryRole === 'TREASURER') role = 'finance';
  else if (primaryRole === 'APPROVER') role = 'approver';
  else if (primaryRole === 'AUDITOR') role = 'approver';
  else if (roleCode.includes('officer')) role = 'officer';

  return {
    id: apiUser.id,
    name: apiUser.displayName,
    email: apiUser.email,
    role,
    roleTitleTh: apiUser.roles[0]?.name || 'ผู้ใช้งาน',
    phone: '',
    branch: 'สำนักงานใหญ่',
    status: 'active',
  };
}

export interface LoginResponse {
  mfaRequired: boolean;
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: ApiUserProfile;
  tempToken?: string;
  userId?: string;
  email?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setAccessToken(token: string | null) {
  memoryAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('zms_access_token', token);
    } else {
      sessionStorage.removeItem('zms_access_token');
    }
  }
}

export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;
  if (typeof window !== 'undefined') {
    memoryAccessToken = sessionStorage.getItem('zms_access_token');
  }
  return memoryAccessToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-zms-csrf', '1');

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // send cookies for refresh token
  });

  // Handle 401 Unauthorized by attempting to refresh token
  if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push((newToken) => {
          if (newToken) {
            resolve(request<T>(endpoint, options, true));
          } else {
            reject(new ApiError(401, 'UNAUTHORIZED', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'));
          }
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-zms-csrf': '1',
        },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAccessToken(refreshData.accessToken);
        refreshQueue.forEach((cb) => cb(refreshData.accessToken));
        refreshQueue = [];
        return request<T>(endpoint, options, true);
      } else {
        setAccessToken(null);
        refreshQueue.forEach((cb) => cb(null));
        refreshQueue = [];
        throw new ApiError(401, 'UNAUTHORIZED', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }
    } catch (err) {
      setAccessToken(null);
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  if (!response.ok) {
    let errBody: any = {};
    try {
      errBody = await response.json();
    } catch {
      // not JSON
    }
    throw new ApiError(
      response.status,
      errBody.code || 'REQUEST_FAILED',
      errBody.message || `HTTP ${response.status} Request Failed`,
      errBody.details
    );
  }

  // Check if no content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  // Auth Specific
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    if (!res.mfaRequired && res.accessToken) {
      setAccessToken(res.accessToken);
    }
    return res;
  },

  verify2fa: async (tempToken: string, code: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/2fa/verify', { tempToken, code });
    if (res.accessToken) {
      setAccessToken(res.accessToken);
    }
    return res;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  getProfile: async (): Promise<ApiUserProfile> => {
    return apiClient.get<ApiUserProfile>('/auth/me');
  },

  // Assistance Requests & Assessment API
  getAssistanceRequests: async (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/assistance-requests${qs ? `?${qs}` : ''}`);
  },

  getAssistanceRequest: async (id: string) => {
    return apiClient.get<any>(`/assistance-requests/${id}`);
  },

  checkBeneficiaryEligibility: async (query: { nationalId?: string; registrationNo?: string; beneficiaryId?: string }) => {
    return apiClient.post<any>('/assistance-requests/check-beneficiary', query);
  },

  createAssistanceRequest: async (body: any) => {
    return apiClient.post<any>('/assistance-requests', body);
  },

  updateAssistanceRequestStatus: async (id: string, status: string, notes?: string) => {
    return apiClient.patch<any>(`/assistance-requests/${id}/status`, { status, notes });
  },

  submitAssessment: async (applicationId: string, assessment: any) => {
    return apiClient.post<any>(`/assessments/${applicationId}`, assessment);
  },

  getAssessment: async (applicationId: string) => {
    return apiClient.get<any>(`/assessments/${applicationId}`);
  },

  addApplicationDocument: async (applicationId: string, document: any) => {
    return apiClient.post<any>(`/assistance-requests/${applicationId}/documents`, document);
  },

  // Approvals & Committee Decisions
  getPendingApprovals: async (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/approvals/pending${qs ? `?${qs}` : ''}`);
  },

  getApprovalSummary: async () => {
    return apiClient.get<any>('/approvals/summary');
  },

  approveApplication: async (
    applicationId: string,
    approvedAmount: number,
    fundId: string,
    notes?: string,
    specificFundId?: string,
  ) => {
    return apiClient.post<any>(`/approvals/${applicationId}/approve`, {
      approvedAmount,
      fundId,
      notes,
      specificFundId,
    });
  },

  rejectApplication: async (applicationId: string, reason: string, notes?: string) => {
    return apiClient.post<any>(`/approvals/${applicationId}/reject`, { reason, notes });
  },

  returnApplication: async (applicationId: string, notes: string, targetStatus?: string) => {
    return apiClient.post<any>(`/approvals/${applicationId}/return`, { notes, targetStatus });
  },

  // Finance & Disbursements
  disburseAssistance: async (payload: {
    applicationId: string;
    paymentRef: string;
    proofUrl?: string;
    notes?: string;
    amount?: number;
    bankAccountId?: string;
    paymentMethod?: string;
  }) => {
    return apiClient.post<any>('/finance/disburse', payload);
  },

  getFinancialTransactions: async (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/finance/transactions${qs ? `?${qs}` : ''}`);
  },

  getTransactionById: async (id: string) => {
    return apiClient.get<any>(`/finance/transactions/${id}`);
  },

  getFunds: async () => {
    return apiClient.get<any>('/finance/funds');
  },

  getBankAccounts: async () => {
    return apiClient.get<any>('/finance/bank-accounts');
  },

  getBudgetSummary: async () => {
    return apiClient.get<any>('/finance/summary');
  },

  // Assistance Execution & Handover
  recordAssistanceExecution: async (payload: {
    applicationId: string;
    executionType: string;
    amount?: number;
    itemDescription?: string;
    deliveredToName: string;
    deliveredToPhone?: string;
    deliveredToRelation?: string;
    deliveryLocation?: string;
    photoUrls?: string[];
    remarks?: string;
  }) => {
    return apiClient.post<any>('/assistance/executions', payload);
  },

  confirmAssistanceExecution: async (
    executionId: string,
    payload: {
      confirmationMethod: string;
      recipientSignatureUrl?: string;
      witnessName?: string;
      witnessPhone?: string;
      confirmationNotes?: string;
    }
  ) => {
    return apiClient.post<any>(`/assistance/executions/${executionId}/confirm`, payload);
  },

  getAssistanceExecutions: async (applicationId: string) => {
    return apiClient.get<any>(`/assistance/executions/${applicationId}`);
  },

  // Zakat Calculator Engine
  getZakatNisabConfig: async () => {
    return apiClient.get<any>('/zakat/nisab-config');
  },

  getZakatFormulas: async () => {
    return apiClient.get<any>('/zakat/formulas');
  },

  calculateZakat: async (category: string, payload: Record<string, any>) => {
    return apiClient.post<any>('/zakat/calculate', { category, payload });
  },

  calculateFinancialZakat: async (payload: any) => {
    return apiClient.post<any>('/zakat/calculate/financial', payload);
  },

  calculateIncomeZakat: async (payload: any) => {
    return apiClient.post<any>('/zakat/calculate/income', payload);
  },

  calculateBusinessZakat: async (payload: any) => {
    return apiClient.post<any>('/zakat/calculate/business', payload);
  },

  calculateAgriZakat: async (payload: any) => {
    return apiClient.post<any>('/zakat/calculate/agri', payload);
  },

  calculateLivestockZakat: async (payload: any) => {
    return apiClient.post<any>('/zakat/calculate/livestock', payload);
  },

  updateZakatGoldPrice: async (payload: { goldPricePerBaht: number; goldPricePerGram?: number; silverPricePerGram?: number; sourceNotes?: string }) => {
    return apiClient.patch<any>('/zakat/gold-price', payload);
  },

  // Bank Accounts & Reconciliations
  getBankAccountById: async (id: string) => {
    return apiClient.get<any>(`/bank-accounts/${id}`);
  },

  reconcileBankAccount: async (
    bankAccountId: string,
    payload: {
      statementBalance: number;
      reconciliationDate?: string;
      notes?: string;
      proofUrl?: string;
    }
  ) => {
    return apiClient.post<any>(`/bank-accounts/${bankAccountId}/reconcile`, payload);
  },

  getBankReconciliations: async (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/bank-accounts/reconciliations${qs ? `?${qs}` : ''}`);
  },

  // Reports & Business Intelligence
  getAsnafDistributionReport: async (params?: { startDate?: string; endDate?: string; branchId?: string }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/reports/asnaf-distribution${qs ? `?${qs}` : ''}`);
  },

  getFinancialSummaryReport: async (params?: { startDate?: string; endDate?: string }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/reports/financial-summary${qs ? `?${qs}` : ''}`);
  },

  getMonthlyTrendsReport: async (params?: { months?: number }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/reports/monthly-trends${qs ? `?${qs}` : ''}`);
  },

  getDemographicsReport: async () => {
    return apiClient.get<any>('/reports/demographics');
  },

  getExecutiveKpiDashboard: async () => {
    return apiClient.get<any>('/reports/executive-dashboard');
  },

  // Audit Trail & Compliance
  getAuditLogs: async (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },

  getAuditLogById: async (id: string) => {
    return apiClient.get<any>(`/audit-logs/${id}`);
  },

  getAuditSummary: async (params?: { days?: number }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/audit-logs/summary${qs ? `?${qs}` : ''}`);
  },

  // System Settings
  getSystemSettings: async (params?: { group?: string; isPublic?: boolean }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/settings${qs ? `?${qs}` : ''}`);
  },

  getSystemSettingByKey: async (key: string) => {
    return apiClient.get<any>(`/settings/${key}`);
  },

  updateSystemSettings: async (payload: { settings: Array<{ key: string; value: any; group?: string; description?: string; isPublic?: boolean }> }) => {
    return apiClient.patch<any>('/settings', payload);
  },

  // Database Backup & Integrity
  createDatabaseBackup: async (payload?: { notes?: string }) => {
    return apiClient.post<any>('/backup/create', payload || {});
  },

  getBackupHistory: async (params?: { limit?: number }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get<any>(`/backup/history${qs ? `?${qs}` : ''}`);
  },

  verifyDatabaseIntegrity: async () => {
    return apiClient.get<any>('/backup/verify');
  },
};
