import type { PermissionCode, RegistryStatusCode } from '@zms/shared';
export interface TransitionPlan {
    to: RegistryStatusCode;
    recordHistory: boolean;
}
export interface TransitionError {
    error: string;
}
export type WorkflowAction = 'submit' | 'correction' | 'assess' | 'approve' | 'reject' | 'suspend' | 'archive';
interface WorkflowRule {
    permission: PermissionCode;
    error: string;
    edges: Partial<Record<RegistryStatusCode, TransitionPlan>>;
}
export declare const REGISTRY_WORKFLOW: Record<WorkflowAction, WorkflowRule>;
export declare const WORKFLOW_ACTIONS: WorkflowAction[];
export declare function planTransition(action: WorkflowAction, status: RegistryStatusCode): TransitionPlan | TransitionError;
export declare function workflowPermission(action: WorkflowAction): PermissionCode;
export declare function planSubmit(status: RegistryStatusCode): TransitionPlan | TransitionError;
export declare function planCorrection(status: RegistryStatusCode): TransitionPlan | TransitionError;
export declare function planAssess(status: RegistryStatusCode): TransitionPlan | TransitionError;
export declare function planApprove(status: RegistryStatusCode): TransitionPlan | TransitionError;
export declare function planReject(status: RegistryStatusCode): TransitionPlan | TransitionError;
export declare function planSuspend(status: RegistryStatusCode): TransitionPlan | TransitionError;
export declare function planArchive(status: RegistryStatusCode): TransitionPlan | TransitionError;
export declare function canEditRegistry(status: RegistryStatusCode): boolean;
export declare function canReviseRegistry(status: RegistryStatusCode): boolean;
export declare function revisionRequiresReview(status: RegistryStatusCode): boolean;
export declare function isRegistryStatus(status: string): status is RegistryStatusCode;
export {};
