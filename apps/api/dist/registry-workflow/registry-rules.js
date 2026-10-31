"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_ACTIONS = exports.REGISTRY_WORKFLOW = void 0;
exports.planTransition = planTransition;
exports.workflowPermission = workflowPermission;
exports.planSubmit = planSubmit;
exports.planCorrection = planCorrection;
exports.planAssess = planAssess;
exports.planApprove = planApprove;
exports.planReject = planReject;
exports.planSuspend = planSuspend;
exports.planArchive = planArchive;
exports.canEditRegistry = canEditRegistry;
exports.canReviseRegistry = canReviseRegistry;
exports.revisionRequiresReview = revisionRequiresReview;
exports.isRegistryStatus = isRegistryStatus;
const shared_1 = require("@zms/shared");
exports.REGISTRY_WORKFLOW = {
    submit: {
        permission: 'beneficiaries.submit',
        error: 'ส่งตรวจได้เฉพาะร่างหรือรายการที่รอแก้ไข',
        edges: {
            DRAFT: { to: 'PENDING_REVIEW', recordHistory: true },
            NEEDS_CORRECTION: { to: 'PENDING_REVIEW', recordHistory: true },
            PENDING_REVIEW: { to: 'PENDING_REVIEW', recordHistory: false },
        },
    },
    correction: {
        permission: 'beneficiaries.review',
        error: 'ขอแก้ไขได้เมื่อทะเบียนอยู่ระหว่างตรวจสอบหรือประเมิน',
        edges: {
            PENDING_REVIEW: { to: 'NEEDS_CORRECTION', recordHistory: true },
            UNDER_ASSESSMENT: { to: 'NEEDS_CORRECTION', recordHistory: true },
        },
    },
    assess: {
        permission: 'beneficiaries.assess',
        error: 'บันทึกการประเมินได้เมื่อทะเบียนรอตรวจสอบหรืออยู่ระหว่างประเมิน',
        edges: {
            PENDING_REVIEW: { to: 'UNDER_ASSESSMENT', recordHistory: true },
            UNDER_ASSESSMENT: { to: 'UNDER_ASSESSMENT', recordHistory: false },
        },
    },
    approve: {
        permission: 'beneficiaries.decide',
        error: 'ยืนยันคุณสมบัติได้เมื่อทะเบียนอยู่ระหว่างประเมิน',
        edges: {
            UNDER_ASSESSMENT: { to: 'ELIGIBLE', recordHistory: true },
        },
    },
    reject: {
        permission: 'beneficiaries.decide',
        error: 'บันทึกว่าไม่มีคุณสมบัติได้เมื่อทะเบียนรอตรวจสอบหรืออยู่ระหว่างประเมิน',
        edges: {
            PENDING_REVIEW: { to: 'INELIGIBLE', recordHistory: true },
            UNDER_ASSESSMENT: { to: 'INELIGIBLE', recordHistory: true },
        },
    },
    suspend: {
        permission: 'beneficiaries.decide',
        error: 'ระงับได้เมื่อทะเบียนมีคุณสมบัติ',
        edges: {
            ELIGIBLE: { to: 'SUSPENDED', recordHistory: true },
        },
    },
    archive: {
        permission: 'beneficiaries.decide',
        error: 'เก็บถาวรได้เมื่อทะเบียนมีผลคุณสมบัติหรือถูกระงับ',
        edges: {
            ELIGIBLE: { to: 'ARCHIVED', recordHistory: true },
            INELIGIBLE: { to: 'ARCHIVED', recordHistory: true },
            SUSPENDED: { to: 'ARCHIVED', recordHistory: true },
        },
    },
};
exports.WORKFLOW_ACTIONS = Object.keys(exports.REGISTRY_WORKFLOW);
function planTransition(action, status) {
    const rule = exports.REGISTRY_WORKFLOW[action];
    return rule.edges[status] ?? { error: rule.error };
}
function workflowPermission(action) {
    return exports.REGISTRY_WORKFLOW[action].permission;
}
function planSubmit(status) {
    return planTransition('submit', status);
}
function planCorrection(status) {
    return planTransition('correction', status);
}
function planAssess(status) {
    return planTransition('assess', status);
}
function planApprove(status) {
    return planTransition('approve', status);
}
function planReject(status) {
    return planTransition('reject', status);
}
function planSuspend(status) {
    return planTransition('suspend', status);
}
function planArchive(status) {
    return planTransition('archive', status);
}
function canEditRegistry(status) {
    return status === 'DRAFT' || status === 'NEEDS_CORRECTION';
}
function canReviseRegistry(status) {
    return status !== 'ARCHIVED';
}
function revisionRequiresReview(status) {
    return (status === 'PENDING_REVIEW' ||
        status === 'UNDER_ASSESSMENT' ||
        status === 'ELIGIBLE' ||
        status === 'INELIGIBLE' ||
        status === 'SUSPENDED');
}
function isRegistryStatus(status) {
    return shared_1.REGISTRY_STATUSES.includes(status);
}
//# sourceMappingURL=registry-rules.js.map