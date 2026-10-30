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
export declare const PERMISSION_CODES: readonly ["beneficiaries.read", "beneficiaries.read.sensitive", "beneficiaries.write", "beneficiaries.submit", "beneficiaries.review", "beneficiaries.assess", "beneficiaries.decide", "beneficiaries.aid.view", "documents.read", "documents.write", "documents.review", "documents.delete", "reports.export", "audit.read"];
export type PermissionCode = (typeof PERMISSION_CODES)[number];
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
