export const APP_NAME = 'ระบบจัดการซะกาต (ZMS)';
export const APP_VERSION = '0.1.0';
export const API_SERVICE_NAME = 'zms-api' as const;

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

export const PERMISSION_CODES = [
  'beneficiaries.read',
  'beneficiaries.read.sensitive',
  'beneficiaries.write',
  'beneficiaries.submit',
  'beneficiaries.review',
  'beneficiaries.assess',
  'beneficiaries.decide',
  'beneficiaries.aid.view',
  'documents.read',
  'documents.write',
  'documents.review',
  'documents.delete',
  'reports.export',
  'audit.read',
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const REGISTRY_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'NEEDS_CORRECTION',
  'UNDER_ASSESSMENT',
  'ELIGIBLE',
  'INELIGIBLE',
  'SUSPENDED',
  'ARCHIVED',
] as const;

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
