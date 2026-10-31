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
  'submit' | 'correction' | 'assess' | 'approve' | 'reject' | 'suspend' | 'archive';

interface WorkflowRule {
  permission: PermissionCode;
  error: string;
  edges: Partial<Record<RegistryStatusCode, TransitionPlan>>;
}

/**
 * Registry status only. Assistance requests use a different status when that
 * module exists. ELIGIBLE and INELIGIBLE are staff decisions, not a formula
 * based on income, household, or asnaf category.
 */
export const REGISTRY_WORKFLOW: Record<WorkflowAction, WorkflowRule> = {
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

export function planSuspend(status: RegistryStatusCode): TransitionPlan | TransitionError {
  return planTransition('suspend', status);
}

export function planArchive(status: RegistryStatusCode): TransitionPlan | TransitionError {
  return planTransition('archive', status);
}

export function canEditRegistry(status: RegistryStatusCode): boolean {
  return status === 'DRAFT' || status === 'NEEDS_CORRECTION';
}

/** Staff with write permission may revise a registry that is not archived. */
export function canReviseRegistry(status: RegistryStatusCode): boolean {
  return status !== 'ARCHIVED';
}

/** Reviewed or decided registries go back to re-check when qualifying data changes. */
export function revisionRequiresReview(status: RegistryStatusCode): boolean {
  return (
    status === 'PENDING_REVIEW' ||
    status === 'UNDER_ASSESSMENT' ||
    status === 'ELIGIBLE' ||
    status === 'INELIGIBLE' ||
    status === 'SUSPENDED'
  );
}

export function isRegistryStatus(status: string): status is RegistryStatusCode {
  return (REGISTRY_STATUSES as readonly string[]).includes(status);
}
