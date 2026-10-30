"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGISTRY_STATUSES = exports.PERMISSION_CODES = exports.API_SERVICE_NAME = exports.APP_VERSION = exports.APP_NAME = void 0;
exports.APP_NAME = 'ระบบจัดการซะกาต (ZMS)';
exports.APP_VERSION = '0.1.0';
exports.API_SERVICE_NAME = 'zms-api';
exports.PERMISSION_CODES = [
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
];
exports.REGISTRY_STATUSES = [
    'DRAFT',
    'PENDING_REVIEW',
    'NEEDS_CORRECTION',
    'UNDER_ASSESSMENT',
    'ELIGIBLE',
    'INELIGIBLE',
    'SUSPENDED',
    'ARCHIVED',
];
