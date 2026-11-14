import type { PermissionCode, RegistryStatusCode } from '@zms/shared';
import { REGISTRY_STATUSES } from '@zms/shared';

export interface TransitionPlan {
  to: RegistryStatusCode;
  recordHistory: boolean;
}

export interface TransitionError {
  error: string;
}

export type WorkflowAction =
  | 'submit'
  | 'correction'
  | 'assess'
  | 'approve'
  | 'reject'
  | 'reReview';

interface WorkflowRule {
  permission: PermissionCode;
  error: string;
  edges: Partial<Record<RegistryStatusCode, TransitionPlan>>;
}

/**
 * Registry status workflow (strictly 4 canonical statuses: DRAFT, UNDER_REVIEW, QUALIFIED, NOT_QUALIFIED).
 * QUALIFIED and NOT_QUALIFIED are staff decisions, not an automatic formula.
 */
export const REGISTRY_WORKFLOW: Record<WorkflowAction, WorkflowRule> = {
  submit: {
    permission: 'beneficiaries.submit',
    error: 'ส่งตรวจสอบข้อมูลได้เฉพาะทะเบียนสถานะร่าง',
    edges: {
      DRAFT: { to: 'UNDER_REVIEW', recordHistory: true },
      UNDER_REVIEW: { to: 'UNDER_REVIEW', recordHistory: false },
    },
  },
  correction: {
    permission: 'beneficiaries.review',
    error: 'ส่งกลับเป็นร่างเพื่อแก้ไขได้เฉพาะทะเบียนที่อยู่ระหว่างตรวจสอบข้อมูล',
    edges: {
      UNDER_REVIEW: { to: 'DRAFT', recordHistory: true },
    },
  },
  assess: {
    permission: 'beneficiaries.assess',
    error: 'บันทึกการประเมินได้เฉพาะทะเบียนที่อยู่ระหว่างตรวจสอบข้อมูล',
    edges: {
      UNDER_REVIEW: { to: 'UNDER_REVIEW', recordHistory: false },
    },
  },
  approve: {
    permission: 'beneficiaries.decide',
    error: 'ยืนยันมีคุณสมบัติตามเกณฑ์ได้เฉพาะทะเบียนที่อยู่ระหว่างตรวจสอบข้อมูล',
    edges: {
      UNDER_REVIEW: { to: 'QUALIFIED', recordHistory: true },
    },
  },
  reject: {
    permission: 'beneficiaries.decide',
    error: 'ยืนยันไม่มีคุณสมบัติตามเกณฑ์ได้เฉพาะทะเบียนที่อยู่ระหว่างตรวจสอบข้อมูล',
    edges: {
      UNDER_REVIEW: { to: 'NOT_QUALIFIED', recordHistory: true },
    },
  },
  reReview: {
    permission: 'beneficiaries.review',
    error: 'ส่งตรวจสอบข้อมูลใหม่ได้เฉพาะทะเบียนที่ตัดสินคุณสมบัติแล้ว',
    edges: {
      QUALIFIED: { to: 'UNDER_REVIEW', recordHistory: true },
      NOT_QUALIFIED: { to: 'UNDER_REVIEW', recordHistory: true },
    },
  },
};

export const WORKFLOW_ACTIONS = Object.keys(REGISTRY_WORKFLOW) as WorkflowAction[];

export function planTransition(
  action: WorkflowAction,
  status: RegistryStatusCode,
): TransitionPlan | TransitionError {
  const rule = REGISTRY_WORKFLOW[action];
  return rule.edges[status] ?? { error: rule.error };
}

export function workflowPermission(action: WorkflowAction): PermissionCode {
  return REGISTRY_WORKFLOW[action].permission;
}

export function planSubmit(status: RegistryStatusCode): TransitionPlan | TransitionError {
  return planTransition('submit', status);
}

export function planCorrection(status: RegistryStatusCode): TransitionPlan | TransitionError {
  return planTransition('correction', status);
}

export function planAssess(status: RegistryStatusCode): TransitionPlan | TransitionError {
  return planTransition('assess', status);
}

export function planApprove(status: RegistryStatusCode): TransitionPlan | TransitionError {
  return planTransition('approve', status);
}

export function planReject(status: RegistryStatusCode): TransitionPlan | TransitionError {
  return planTransition('reject', status);
}

export function planReReview(status: RegistryStatusCode): TransitionPlan | TransitionError {
  return planTransition('reReview', status);
}

/** Allowed direct transition targets for UI & service guards */
export const ALLOWED_NEXT_REGISTRY_STATUSES: Record<RegistryStatusCode, readonly RegistryStatusCode[]> = {
  DRAFT: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['DRAFT', 'QUALIFIED', 'NOT_QUALIFIED'],
  QUALIFIED: ['UNDER_REVIEW'],
  NOT_QUALIFIED: ['UNDER_REVIEW'],
};

export function canEditRegistry(status: RegistryStatusCode): boolean {
  return status === 'DRAFT';
}

/** Authorized staff may revise active non-deleted registries; deleted records are excluded via deletedAt. */
export function canReviseRegistry(status: RegistryStatusCode): boolean {
  return isRegistryStatus(status);
}

/** Post-submission and decided registries require reason and re-verification on eligibility-affecting edits. */
export function revisionRequiresReview(status: RegistryStatusCode): boolean {
  return (
    status === 'UNDER_REVIEW' ||
    status === 'QUALIFIED' ||
    status === 'NOT_QUALIFIED'
  );
}

export function isRegistryStatus(status: string): status is RegistryStatusCode {
  return (REGISTRY_STATUSES as readonly string[]).includes(status);
}
