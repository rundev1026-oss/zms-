export declare const APP_NAME = "\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E0B\u0E30\u0E01\u0E32\u0E15 (ZMS)";
export declare const APP_VERSION = "0.1.0";
export declare const API_SERVICE_NAME: "zms-api";
export type HealthStatus = 'ok' | 'degraded' | 'error';
export interface HealthCheckResponse {
    status: HealthStatus;
    service: 'zms-api';
    version: string;
    timestamp: string;
    database: {
        connected: boolean;
        message: string;
    };
}
export declare const PERMISSION_CODES: readonly ["beneficiaries.read", "beneficiaries.read.sensitive", "beneficiaries.write", "beneficiaries.submit", "beneficiaries.review", "beneficiaries.assess", "beneficiaries.decide", "beneficiaries.aid.view", "documents.read", "documents.write", "documents.review", "documents.delete", "reports.export", "audit.read", "dashboard.access", "dashboard.view", "dashboard.view.kpi.financial", "dashboard.view.kpi.org", "beneficiaries.view", "beneficiaries.create", "beneficiaries.edit", "beneficiaries.delete", "beneficiaries.verify", "beneficiaries.export", "requests.view", "requests.create", "requests.edit", "requests.submit", "requests.cancel", "requests.assign", "assessment.view", "assessment.perform", "assessment.edit", "assessment.submit", "assessment.verify_docs", "approvals.view", "approvals.approve", "approvals.reject", "approvals.return", "approvals.delegate", "assistance.view", "assistance.create", "assistance.edit_draft", "assistance.confirm_handover", "assistance.confirm_actual", "assistance.upload_evidence", "followup.view", "followup.create", "followup.edit", "followup.upload_evidence", "followup.close", "finance.dashboard.view", "finance.income.view", "finance.income.create", "finance.bank.view", "finance.bank.manage", "finance.txn.view", "finance.txn.create", "finance.txn.approve", "finance.expense.record", "finance.handover.record", "finance.reconcile", "finance.reports.export", "reports.view", "reports.generate", "reports.export_excel", "reports.export_pdf", "reports.view_sensitive", "users.view", "users.create", "users.edit", "users.suspend", "roles.manage", "permissions.manage", "users.reset_password", "users.manage_2fa", "branches.view", "branches.create", "branches.edit", "departments.manage", "branches.assign_staff", "zakat_calc.view", "zakat_calc.use", "zakat_calc.manage_rules", "zakat_calc.history", "donations.view", "donations.create", "donations.confirm_payment", "donations.issue_receipt", "donations.refund", "audit.view", "audit.search", "audit.export", "settings.view", "settings.manage", "backup.create", "backup.restore", "settings.config"];
export type PermissionCode = (typeof PERMISSION_CODES)[number];
export type DataScope = 'OWN' | 'DEPARTMENT' | 'BRANCH' | 'ORGANIZATION';
export type OverrideEffect = 'ALLOW' | 'DENY';
export interface ModulePermissionAction {
    code: PermissionCode;
    action: 'access' | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'reject' | 'export' | 'print' | 'assign' | 'manage';
    labelTh: string;
    isHighRisk?: boolean;
}
export interface ModuleCatalogItem {
    id: string;
    nameTh: string;
    group: 'CORE' | 'SUPPORT';
    description: string;
    actions: ModulePermissionAction[];
}
export declare const MODULE_PERMISSION_CATALOG: ModuleCatalogItem[];
export declare const REGISTRY_STATUSES: readonly ["DRAFT", "PENDING_REVIEW", "NEEDS_CORRECTION", "UNDER_ASSESSMENT", "ELIGIBLE", "INELIGIBLE", "SUSPENDED", "ARCHIVED"];
export type RegistryStatusCode = (typeof REGISTRY_STATUSES)[number];
export interface ApiErrorDetail {
    field: string;
    message: string;
}
export interface ApiErrorResponse {
    statusCode: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[];
}
export interface PageResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
}
